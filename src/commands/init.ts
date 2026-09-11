import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { getCwd } from '../utils/paths';
import { logger } from '../utils/logger';
import { generateConfigFileContent } from '../core/configGenerator';
import { TemplateManager } from '../core/templateManager';

export async function initCommand(options: { eject?: boolean } = {}) {
  const cwd = getCwd();

  logger.info('Initializing configuration...');

  // 1. 检查并创建配置文件
  const configPath = path.join(cwd, 'codegen.config.ts');
  if (!(await fs.pathExists(configPath))) {
    const configContent = generateConfigFileContent();
    await fs.writeFile(configPath, configContent);
    logger.success('Created codegen.config.ts');
  } else {
    logger.warn('codegen.config.ts already exists. Skipped.');
  }

  // 2. 决定是否释放默认模板
  // 优先使用命令行参数（--eject / --no-eject），保证 CI 等非交互环境可用；
  // 未指定时在交互式终端中询问，非交互环境默认跳过
  let eject = options.eject;
  if (eject === undefined) {
    if (!process.stdout.isTTY) {
      logger.info(
        'Non-interactive environment detected, skipping template ejection (use --eject to enable).',
      );
      eject = false;
    } else {
      ({ eject } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'eject',
          message:
            'Do you want to eject default templates to ./templates folder for customization?',
          default: false,
        },
      ]));
    }
  }

  if (eject) {
    const dest = path.join(cwd, 'templates');

    try {
      // init 时不需要读取配置中的自定义路径，因为此时配置刚生成，肯定是默认的
      const results = await TemplateManager.ejectTemplates(
        dest,
        {},
        'safe-update',
      );

      if (results.length === 0) {
        logger.warn(
          'You are in the project root. Templates already exist. Skipping copy.',
        );
        return;
      }

      let hasCreated = false;
      results.forEach((res) => {
        if (res.status === 'created') {
          logger.success(`Created: ${res.file}`);
          hasCreated = true;
        } else if (res.status === 'backup') {
          logger.warn(
            `Template ${res.file} already exists. New version saved as ${res.backupPath}, please manually merge changes if needed.`,
          );
          hasCreated = true;
        } else if (res.status === 'skipped') {
          logger.info(`Template ${res.file} is up to date.`);
        }
      });

      if (hasCreated) {
        logger.info(
          'You can now edit ./templates/api.ejs or ./templates/type.ejs and update codegen.config.ts to use it.',
        );
      }
    } catch (error) {
      logger.error('Failed to copy templates', error);
    }
  } else {
    logger.info('Using internal default templates.');
  }
}
