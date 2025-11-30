import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getCwd() {
  return process.cwd();
}

export function getPackageTemplatesDir() {
  // 假设打包后结构: dist/index.js -> templates/
  return path.resolve(__dirname, '../templates');
}