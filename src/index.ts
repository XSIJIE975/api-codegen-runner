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
  let isRunning = false;
  let isPending = false;
  let timer: NodeJS.Timeout | null = null;

  const loadFinalConfig = async (): Promise<UserConfig> => {
    const { config } = await loadConfig<UserConfig>({
      sources: [{ files: 'codegen.config', extensions: ['ts', 'js'] }],
      merge: false,
    });
    return { ...config, ...inlineConfig } as UserConfig;
  };

  const runCodegen = async () => {
    if (isRunning) {
      isPending = true;
      return;
    }
    isRunning = true;

    try {
      const finalConfig = await loadFinalConfig();

      if (!finalConfig) return;

      const validConfig = await validateConfig(finalConfig);

      logger.info('Configuration loaded/updated. Checking API...');

      const loader = new DataLoader();
      const data = await loader.load(validConfig);

      const generator = new Generator(validConfig);
      await generator.generate(data);
    } catch (error: unknown) {
      logger.error('Generation failed:', error);
    } finally {
      isRunning = false;
      if (isPending) {
        isPending = false;
        void runCodegen();
      }
    }
  };

  const debouncedRunCodegen = (delay = 1000) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      runCodegen();
    }, delay);
  };

  const plugin: Plugin = {
    name: 'vite-plugin-api-codegen',
    apply: 'serve' as const,

    async buildStart() {
      await runCodegen();
    },

    async configureServer(server: ViteDevServer) {
      const finalConfig = await loadFinalConfig();

      if (finalConfig.watch === false) return;

      const debounceTime = finalConfig.watchDebounce ?? 1000;

      server.watcher.on('change', async (file) => {
        if (file.includes('codegen.config')) {
          logger.info('Configuration file changed. Reloading...');
          debouncedRunCodegen(debounceTime);
        }

        if (file.endsWith('.ejs')) {
          logger.info('Template file changed. Regenerating...');
          debouncedRunCodegen(debounceTime);
        }
      });
    },
  };

  return plugin;
}
