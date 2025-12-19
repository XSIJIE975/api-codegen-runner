import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getCwd() {
  return process.cwd();
}

export function getPackageTemplatesDir() {
  if (process.env.TSUP_BUILD) {
    return path.resolve(process.cwd(), 'templates');
  }

  return path.resolve(__dirname, '../templates');
}
