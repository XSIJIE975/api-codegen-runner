import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getCwd() {
  return process.cwd();
}

export function getPackageTemplatesDir() {
  // 构建流程（tsup onSuccess）通过该私有环境变量把模板生成到包根目录，
  // 避免使用通用名称（如 TSUP_BUILD）被用户环境意外命中
  if (process.env.API_CODEGEN_RUNNER_BUILD) {
    return path.resolve(process.cwd(), 'templates');
  }

  return path.resolve(__dirname, '../templates');
}
