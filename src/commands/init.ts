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
  input: 'https://petstore3.swagger.io/api/v3/openapi.json',

  // Option 2: Apifox Source (Uncomment to use)
  /*
  input: {
    projectId: 'YOUR_PROJECT_ID',
    token: 'YOUR_ACCESS_TOKEN',
  },
  */

  // Generated API method name format
  methodNameCase: 'PascalCase', // 'camelCase' | 'PascalCase' | 'snake_case'

  // Options passed to the underlying parser (api-codegen-universal)
  requestConfig: {
    pathClassification: {
      outputPrefix: 'api',
      // commonPrefix: '/api/v1',
    },
    codeGeneration: {
      parameterNamingStyle: 'PascalCase', // 'PascalCase' | 'camelCase' | 'snake_case'
      interfaceExportMode: 'export', // 接口导出方式，export | declare
      output: {
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
  if (!(await fs.pathExists(configPath))) {
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
      message:
        'Do you want to eject default templates to ./templates folder for customization?',
      default: false,
    },
  ]);

  if (eject) {
    const src = getPackageTemplatesDir();
    const dest = path.join(cwd, 'templates');

    if (path.resolve(src) === path.resolve(dest)) {
      console.log(
        chalk.yellow(
          '⚠️  You are in the project root. Templates already exist. Skipping copy.',
        ),
      );
      return;
    }

    try {
      // 确保内置模板存在
      if (!(await fs.pathExists(src))) {
        throw new Error(
          `Internal templates not found at ${src}. (Did you build the project?)`,
        );
      }

      await fs.copy(src, dest, { overwrite: false });
      console.log(chalk.green(`✅ Templates copied to ${dest}`));
      console.log(
        chalk.gray(
          '👉 You can now edit ./templates/api.ejs or ./templates/type.ejs and update codegen.config.ts to use it.',
        ),
      );
    } catch (e: unknown) {
      console.error(
        chalk.red(`❌ Failed to copy templates: ${(e as Error).message}`),
      );
    }
  } else {
    console.log(chalk.gray('ℹ️  Using internal default templates.'));
  }
}
