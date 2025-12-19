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
    const run = async () => {
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
        if (!opts.watch) process.exit(1); // 非 Watch 模式才退出
        return null;
      }
    };

    const configFile = await run();

    if (opts.watch && configFile) {
      logger.info(`Watching for changes in ${configFile}...`);

      let debounceTimer: NodeJS.Timeout;

      fs.watch(configFile, (eventType) => {
        if (eventType === 'change') {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            logger.info('Config changed, reloading...');
            run();
          }, 200);
        }
      });
      await new Promise(() => {});
    }
  });

program.parse();
