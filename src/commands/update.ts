import path from 'path';
import { loadConfig } from 'unconfig';
import { getCwd } from '../utils/paths';
import { logger } from '../utils/logger';
import { TemplateManager } from '../core/templateManager';
import { UserConfig } from '../types';

export async function updateCommand() {
  const cwd = getCwd();
  const defaultTemplatesDir = path.join(cwd, 'templates');

  logger.info('Checking for template updates...');

  try {
    // 1. 尝试加载用户配置，获取自定义模板路径
    const { config } = await loadConfig<UserConfig>({
      sources: [{ files: 'codegen.config', extensions: ['ts', 'js'] }],
      merge: false,
    });

    const customTemplates = config?.templates || {};

    // 2. 执行更新检查
    const results = await TemplateManager.ejectTemplates(
      defaultTemplatesDir,
      customTemplates,
      'safe-update',
    );

    if (results.length === 0) {
      logger.info('No templates to update.');
      return;
    }

    let hasUpdates = false;

    results.forEach((result) => {
      if (result.status === 'created') {
        logger.success(`Created: ${result.file}`);
        hasUpdates = true;
      } else if (result.status === 'updated') {
        logger.success(`Updated: ${result.file}`);
        hasUpdates = true;
      } else if (result.status === 'backup') {
        logger.warn(`Conflict detected for ${result.file}.`);
        logger.info(`  -> New version saved as: ${result.backupPath}`);
        logger.info(`  -> Please manually merge changes if needed.`);
        hasUpdates = true;
      } else if (result.status === 'skipped') {
        // logger.debug(`Skipped: ${result.file} (up to date)`);
      }
    });

    if (!hasUpdates) {
      logger.success('All templates are up to date.');
    }
  } catch (e: unknown) {
    logger.error(`Failed to update templates: ${(e as Error).message}`);
  }
}
