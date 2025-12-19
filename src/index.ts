import { loadConfig } from 'unconfig';
import type { ViteDevServer, Plugin } from 'vite';
import { DataLoader } from './core/loader';
import { Generator } from './core/generator';
import { validateConfig } from './core/validator';
import { logger } from './utils/logger';
import { UserConfig } from './types';

export * from './types';

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export function ApiCodegenPlugin(inlineConfig?: Partial<UserConfig>) {
  const runCodegen = async () => {
    try {
      const { config } = await loadConfig<UserConfig>({
        sources: [{ files: 'codegen.config', extensions: ['ts', 'js'] }],
        merge: false,
      });

      const finalConfig = { ...config, ...inlineConfig } as UserConfig;

      if (!finalConfig) return;

      const validConfig = await validateConfig(finalConfig);

      logger.info('Configuration loaded/updated. Checking API...');

      const loader = new DataLoader();
      const data = await loader.load(validConfig);

      const generator = new Generator(validConfig);
      await generator.generate(data);
    } catch (error: unknown) {
      logger.error('Generation failed:', error);
    }
  };

  const plugin: Plugin = {
    name: 'vite-plugin-api-codegen',
    apply: 'serve' as const,

    async buildStart() {
      await runCodegen();
    },

    configureServer(server: ViteDevServer) {
      server.watcher.on('change', async (file) => {
        if (file.includes('codegen.config')) {
          logger.info('Configuration file changed. Reloading...');
          await runCodegen();
        }

        if (file.endsWith('.ejs')) {
          logger.info('Template file changed. Regenerating...');
          await runCodegen();
        }
      });
    },
  };

  return plugin;
}
