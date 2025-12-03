import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import prettier from 'prettier';
import type { StandardOutput } from 'api-codegen-universal';
import { UserConfig } from '../types';
import { Transformer } from './transformer';
import { getCwd, getPackageTemplatesDir } from '../utils/paths';

export class Generator {
  private transformer: Transformer;

  constructor(private config: UserConfig) {
    this.transformer = new Transformer(config.globalContext);
  }

  async generate(data: StandardOutput) {
    console.log('🚀 Generating code...');
    await this.generateInterfaces(data);
    await this.generateApis(data);
    console.log('✨ Done!');
  }

  private async generateInterfaces(data: StandardOutput) {
    const { output } = this.config;
    await fs.ensureDir(output.typeDir);

    const isSeparateMode = output.separateTypes === true;

    console.log(`📦 Generating Types (Separate Mode: ${isSeparateMode})...`);

    if (!isSeparateMode) {
      // Global Logic ...
      const allCode = Object.values(data.interfaces).join('\n\n');

      const rendered = await this.renderTemplate('type', {
        code: allCode,
        isGlobal: true,
        name: 'index',
        config: this.config.globalContext
      });
      await this.writeFile(path.join(output.typeDir, 'index.ts'), rendered);

    } else {
      // Separate Logic ...
      await fs.emptyDir(output.typeDir);
      const entries = Object.entries(data.interfaces);

      await Promise.all(entries.map(async ([name, code]) => {
        const rendered = await this.renderTemplate('type', {
          code: code,
          isGlobal: false,
          name: name,
          config: this.config.globalContext
        });
        await this.writeFile(path.join(output.typeDir, `${name}.ts`), rendered);
      }));

      // 生成一个 index.ts 汇总导出
      const exportAll = entries.map(([name]) => `export * from './${name}';`).join('\n');
      await this.writeFile(path.join(output.typeDir, 'index.ts'), exportAll);
    }
  }

  private async generateApis(data: StandardOutput) {
    const { output } = this.config;
    await fs.ensureDir(output.apiDir);
    const groups: Record<string, any[]> = {};
    data.apis.forEach(api => {
      const fp = api.category.filePath;
      if (!groups[fp]) groups[fp] = [];
      groups[fp].push(api);
    });

    for (const [filePath, fileApis] of Object.entries(groups)) {
      const fileData = { ...data, apis: fileApis };
      const viewModel = this.transformer.transform(
        fileData,
        filePath,
        output.typeDir,
        output.apiDir
      );
      const code = await this.renderTemplate('api', viewModel);
      const absPath = path.join(output.apiDir, filePath);
      await this.writeFile(absPath, code);
    }
  }

  private async getTemplateContent(type: 'api' | 'type') {
    // 优先读用户配置
    if (this.config.templates?.[type]) {
      const userPath = path.resolve(getCwd(), this.config.templates[type]!);
      if (await fs.pathExists(userPath)) return fs.readFile(userPath, 'utf-8');
    }
    // 回退到默认 (type.ejs 现在也存在了)
    return fs.readFile(path.join(getPackageTemplatesDir(), `${type}.ejs`), 'utf-8');
  }

  private async renderTemplate(type: 'api' | 'type', data: any) {
    const tmpl = await this.getTemplateContent(type);
    return ejs.render(tmpl, data);
  }

  private async writeFile(filePath: string, content: string) {
    await fs.ensureDir(path.dirname(filePath));
    try {
      const formatted = await prettier.format(content, { parser: 'typescript', singleQuote: true });
      await fs.writeFile(filePath, formatted);
    } catch {
      await fs.writeFile(filePath, content);
    }
  }
}