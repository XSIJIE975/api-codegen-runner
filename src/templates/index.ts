import fs from 'fs-extra';
import path from 'path';
import { getPackageTemplatesDir } from '../utils/paths';
import { generateApiTemplate } from './api';
import { generateTypeTemplate } from './type';
import { logger } from '../utils/logger';

export async function buildTemplates() {
  const templatesDir = getPackageTemplatesDir();

  // 确保目录存在
  await fs.ensureDir(templatesDir);

  // 生成 api.ejs
  const apiContent = generateApiTemplate();
  await fs.writeFile(path.join(templatesDir, 'api.ejs'), apiContent);

  // 生成 type.ejs
  const typeContent = generateTypeTemplate();
  await fs.writeFile(path.join(templatesDir, 'type.ejs'), typeContent);

  logger.success('Templates built successfully.');
}
