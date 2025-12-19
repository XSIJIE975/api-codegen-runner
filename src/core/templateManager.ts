import fs from 'fs-extra';
import path from 'path';
import { getPackageTemplatesDir } from '../utils/paths';
import pkg from '../../package.json';

export type EjectResult = {
  file: string;
  status: 'created' | 'skipped' | 'updated' | 'backup';
  backupPath?: string;
};

export class TemplateManager {
  /**
   * 获取内置模板目录
   */
  static getInternalDir(): string {
    return getPackageTemplatesDir();
  }

  /**
   * 释放模板到指定目录
   * @param targetDir 目标目录
   * @param customTemplates 自定义模板路径映射 { api: 'path/to/api.ejs', type: 'path/to/type.ejs' }
   * @param mode 模式：'overwrite' (覆盖) | 'safe-update' (安全更新，备份旧文件)
   */
  static async ejectTemplates(
    targetDir: string,
    customTemplates: Record<string, string> = {},
    mode: 'overwrite' | 'safe-update' = 'safe-update',
  ): Promise<EjectResult[]> {
    const srcDir = this.getInternalDir();

    // 确保源目录存在
    if (!(await fs.pathExists(srcDir))) {
      throw new Error(`Internal templates not found at ${srcDir}`);
    }

    const files = await fs.readdir(srcDir);
    const results: EjectResult[] = [];

    for (const file of files) {
      // 忽略非 .ejs 文件（如果有的话）
      if (!file.endsWith('.ejs')) continue;

      const templateKey = path.basename(file, '.ejs'); // 'api' or 'type'
      const srcFile = path.join(srcDir, file);

      // 确定目标路径：优先使用用户配置的路径，否则使用默认的 targetDir/file
      let destFile: string;
      if (customTemplates[templateKey]) {
        destFile = path.resolve(process.cwd(), customTemplates[templateKey]);
      } else {
        destFile = path.join(targetDir, file);
      }

      // 避免源文件和目标文件相同
      if (path.resolve(srcFile) === path.resolve(destFile)) {
        continue;
      }

      const result = await this.processFile(srcFile, destFile, file, mode);
      results.push(result);
    }

    return results;
  }

  private static async processFile(
    srcPath: string,
    destPath: string,
    fileName: string,
    mode: 'overwrite' | 'safe-update',
  ): Promise<EjectResult> {
    // 1. 如果目标文件不存在，直接复制
    if (!(await fs.pathExists(destPath))) {
      await fs.ensureDir(path.dirname(destPath)); // 确保目标目录存在
      await fs.copy(srcPath, destPath);
      return { file: fileName, status: 'created' };
    }

    // 2. 如果目标文件存在，比较版本号
    const srcContent = await fs.readFile(srcPath, 'utf-8');
    const destContent = await fs.readFile(destPath, 'utf-8');

    const srcVersion = this.extractVersion(srcContent);
    const destVersion = this.extractVersion(destContent);

    // 如果版本号相同，视为已更新（即使内容有微小差异，也认为是用户基于该版本的修改）
    // 或者如果内容完全一致，也跳过
    if (
      (srcVersion && destVersion && srcVersion === destVersion) ||
      srcContent === destContent
    ) {
      return { file: fileName, status: 'skipped' };
    }

    // 3. 版本不同或无版本号，根据模式处理
    if (mode === 'overwrite') {
      await fs.copy(srcPath, destPath);
      return { file: fileName, status: 'updated' };
    } else {
      // safe-update:
      // 目标文件已存在且版本不同（或者是旧版本，或者是用户修改版）。
      // 策略：保留用户的原文件 (api.ejs) 不动，将新版本的模板写入带版本号的新文件 (api.vX.X.X.timestamp.ejs)。

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.]/g, '')
        .slice(0, 14); // YYYYMMDDHHmmss
      const version = pkg.version; // 使用 CLI 的版本作为新文件的标识

      // 生成新文件名: api.v1.0.0.20231219101010.ejs
      // 注意：这里新文件生成在 destPath 同级目录下
      const newFileName = `${path.basename(fileName, '.ejs')}.v${version}.${timestamp}.ejs`;
      const newFilePath = path.join(path.dirname(destPath), newFileName);

      await fs.copy(srcPath, newFilePath);

      return {
        file: fileName,
        status: 'backup',
        backupPath: newFileName,
      };
    }
  }

  /**
   * 从模板内容中提取版本号
   * 格式: @version 1.0.0
   */
  private static extractVersion(content: string): string | null {
    const match = content.match(/@version\s+([\d.]+)/);
    return match ? match[1] : null;
  }
}
