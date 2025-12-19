import { defineConfig } from 'tsup';
import { buildTemplates } from './src/templates';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  skipNodeModulesBundle: true,
  splitting: true,
  target: 'node20',
  async onSuccess() {
    process.env.TSUP_BUILD = 'true';
    await buildTemplates();
  },
});
