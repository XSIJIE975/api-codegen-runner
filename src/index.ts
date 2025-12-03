import { loadConfig } from 'unconfig';
import chalk from 'chalk';
import type { ViteDevServer } from 'vite'
import { DataLoader } from './core/loader';
import { Generator } from './core/generator';
import { UserConfig } from './types';


export * from './types';

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export function ApiCodegenPlugin(inlineConfig?: Partial<UserConfig>): any {
  const runCodegen = async () => {
    const loggerPrefix = chalk.cyan('[api-codegen]');
    try {
      // 这里的 cache: false 很重要，确保每次都读取最新的配置
      const { config } = await loadConfig<UserConfig>({
        sources: [{ files: 'codegen.config', extensions: ['ts', 'js'] }],
        merge: false,
      });

      const finalConfig = { ...config, ...inlineConfig } as UserConfig;

      if (!finalConfig) return;

      console.log(`${loggerPrefix} ${chalk.blue('Configuration loaded/updated. Checking API...')}`);

      const loader = new DataLoader();
      const data = await loader.load(finalConfig);

      const generator = new Generator(finalConfig);
      await generator.generate(data);

      console.log(`${loggerPrefix} ${chalk.green('Generation success!')}`);
    } catch (error: any) {
      console.error(`${loggerPrefix} ${chalk.red('Generation failed:')}`);
      console.error(error);
    }
  };

  return {
    name: 'vite-plugin-api-codegen',
    apply: 'serve' as const,

    async buildStart() {
      await runCodegen();
    },

    configureServer(server: ViteDevServer) {
      server.watcher.on('change', async (file) => {
        if (file.includes('codegen.config')) {
          console.log(chalk.yellow('\n[api-codegen] Config change detected. Reloading...'));
          await runCodegen();
        }
        
        if (file.endsWith('.ejs')) {
          console.log(chalk.yellow('\n[api-codegen] Template change detected. Reloading...'));
          await runCodegen();
        }
      });
    }
  };
}