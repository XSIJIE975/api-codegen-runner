import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getCwd, getPackageTemplatesDir } from '../utils/paths';

// 默认生成的配置文件内容
// 包含 input (OpenAPI/Apifox), requestConfig, output 等详细注释
const CONFIG_TEMPLATE = `
import { defineConfig } from 'api-codegen-runner';

export default defineConfig({
  // Option 1: OpenAPI Source (URL or File Path)
  input: 'https://petstore.swagger.io/v2/swagger.json',

  // Option 2: Apifox Source (Uncomment to use)
  /*
  input: {
    projectId: 'YOUR_PROJECT_ID',
    token: 'YOUR_ACCESS_TOKEN',
  },
  */

  // Options passed to the underlying parser (api-codegen-universal)
  requestConfig: {
    // 路径分类配置
    pathClassification: {
      outputPrefix: 'api',
      // commonPrefix: '/api/v1',
    },
    // 代码生成选项
    codeGeneration: {
      parameterNamingStyle: 'camelCase', // 'PascalCase' | 'camelCase' | 'snake_case'
      // Control how types are exported:
      // 'export' -> All in one file (default behavior usually handled by global mode)
      // If you want separate files, you might need to combine this with internal logic,
      // BUT for this runner:
      // The runner decides file splitting based on metadata.interfaceExportMode.
      // However, usually we set 'interfaceExportMode' to 'export' for valid TS code.
      // To trigger Separate Mode in Runner, verify how metadata is passed.
      // (Actually, users should just rely on the default 'global' unless they have complex needs)
      interfaceExportMode: 'export',
      output: {
        // Control what to parse
        schemas: true,
        interfaces: true,
        apis: true
      }
    }
  },

  output: {
    apiDir: 'src/api',
    typeDir: 'src/types',
  },

  // Custom Templates (Uncomment to use your own templates)
  templates: {
    // api: './templates/api.ejs',
    // type: './templates/type.ejs',
  },

  // Global variables injected into templates
  globalContext: {
    importRequestStr: "import request from '@/utils/request';",
  }
});
`;

export async function initCommand() {
  const cwd = getCwd();
  
  console.log(chalk.blue('🚀 Initializing API Codegen configuration...'));

  // 1. 检查并创建配置文件
  const configPath = path.join(cwd, 'codegen.config.ts');
  if (!await fs.pathExists(configPath)) {
    await fs.writeFile(configPath, CONFIG_TEMPLATE.trim());
    console.log(chalk.green('✅ Created codegen.config.ts'));
  } else {
    console.log(chalk.yellow('⚠️  codegen.config.ts already exists. Skipped.'));
  }

  // 2. 询问是否释放默认模板
  const { eject } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'eject',
      message: 'Do you want to eject default templates to ./templates folder for customization?',
      default: false,
    },
  ]);

  if (eject) {
    const src = getPackageTemplatesDir();
    const dest = path.join(cwd, 'templates');

    // [安全检查] 防止在开发项目根目录下运行时报错
    // 如果源路径和目标路径解析后相同，说明正在本项目内测试，跳过复制
    if (path.resolve(src) === path.resolve(dest)) {
      console.log(chalk.yellow('⚠️  You are in the project root. Templates already exist. Skipping copy.'));
      return;
    }

    try {
      // 确保内置模板存在
      if (!await fs.pathExists(src)) {
        throw new Error(`Internal templates not found at ${src}. (Did you build the project?)`);
      }

      await fs.copy(src, dest, { overwrite: false });
      console.log(chalk.green(`✅ Templates copied to ${dest}`));
      console.log(chalk.gray('👉 You can now edit ./templates/api.ejs and update codegen.config.ts to use it.'));
    } catch (e: any) {
      console.error(chalk.red(`❌ Failed to copy templates: ${e.message}`));
    }
  } else {
    console.log(chalk.gray('ℹ️  Using internal default templates.'));
  }
}