import fs from 'fs';
import { Command } from 'commander';
import { loadConfig } from 'unconfig';
import { initCommand } from './commands/init';
import { updateCommand } from './commands/update';
import { DataLoader } from './core/loader';
import { Generator } from './core/generator';
import { validateConfig } from './core/validator';
import { logger } from './utils/logger';
import { UserConfig } from './types';

const program = new Command();
program.name('api-codegen-runner').version('1.0.0');

program.command('init').action(initCommand);
program.command('update').action(updateCommand);

program
  .command('generate', { isDefault: true })
  .option('-c, --config <path>', 'Config path', 'codegen.config')
  .option('-w, --watch', 'Watch for config changes')
  .action(async (opts) => {
    let isRunning = false;

    const run = async () => {
      if (isRunning) return null;
      isRunning = true;

      logger.info('Starting generation...');
      try {
        const result = await loadConfig<UserConfig>({
          sources: [{ files: opts.config, extensions: ['ts', 'js'] }],
          merge: false,
        });

        const { config, sources } = result;

        if (!config) {
          logger.error('Config not found');
          if (!opts.watch) process.exit(1);
          return null;
        }
        const validConfig = await validateConfig(config);

        const loader = new DataLoader();
        const data = await loader.load(validConfig);

        const generator = new Generator(validConfig);
        await generator.generate(data);
        return sources[0];
      } catch (error) {
        logger.error('Error during generation:', error);
        if (!opts.watch) process.exit(1);
        return null;
      } finally {
        isRunning = false;
      }
    };

    const configFile = await run();

    if (opts.watch && configFile) {
      logger.info(`Watching for changes in ${configFile}...`);

      let debounceTimer: NodeJS.Timeout;
      const watcher = fs.watch(configFile);

      // 监听 watcher 错误，避免未捕获异常
      watcher.on('error', (err) => {
        logger.error('File watcher error:', err);
      });

      watcher.on('change', (eventType) => {
        if (eventType === 'change') {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (isRunning) {
              logger.info('Generation still in progress, skipping reload...');
              return;
            }
            logger.info('Config changed, reloading...');
            run();
          }, 200);
        }
      });

      // 优雅退出：监听 SIGINT/SIGTERM，关闭 watcher 后退出
      // 使用方案 A：cleanup 负责清理并退出，Promise 仅保持进程存活
      const cleanup = () => {
        watcher.close();
        clearTimeout(debounceTimer);
        process.exit(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // 永不 resolve 的 Promise 仅用于保持进程存活
      // 信号处理完全由 cleanup 负责
      await new Promise<void>(() => {});
    }
  });

program.parse();
