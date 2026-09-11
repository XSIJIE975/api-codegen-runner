import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { loadConfig } from 'unconfig';
import pkg from '../package.json';
import { initCommand } from './commands/init';
import { updateCommand } from './commands/update';
import { DataLoader } from './core/loader';
import { Generator } from './core/generator';
import { validateConfig, ConfigValidationError } from './core/validator';
import { logger } from './utils/logger';
import { getCwd } from './utils/paths';
import { UserConfig } from './types';

/** 单次生成的结果，watch 模式据此决定要监听的文件集合 */
interface RunResult {
  configFile: string;
  /** 配置文件 import 的其他模块（来自 unconfig） */
  dependencies: string[];
  /** 用户自定义模板的绝对路径 */
  templateFiles: string[];
}

const WATCH_DEBOUNCE_MS = 200;
/** 编辑器原子保存（rename+replace）后重建 watcher 的等待时间 */
const RENAME_REARM_DELAY_MS = 100;

const program = new Command();
program
  .name('api-codegen-runner')
  .version(pkg.version)
  .description(
    'API code generator supporting OpenAPI/Swagger and Apifox sources',
  );

program
  .command('init')
  .option('--eject', 'Eject default templates without prompting')
  .option('--no-eject', 'Skip template ejection without prompting')
  .action(initCommand);

program
  .command('update')
  .option('-c, --config <path>', 'Config path', 'codegen.config')
  .action(updateCommand);

program
  .command('generate', { isDefault: true })
  .option('-c, --config <path>', 'Config path', 'codegen.config')
  .option('-w, --watch', 'Watch for config changes')
  .action(async (opts) => {
    let isRunning = false;
    let isPending = false;

    const run = async (): Promise<RunResult | null> => {
      if (isRunning) {
        if (opts.watch) {
          isPending = true;
        }
        return null;
      }
      isRunning = true;

      logger.info('Starting generation...');
      try {
        const result = await loadConfig<UserConfig>({
          sources: [{ files: opts.config, extensions: ['ts', 'js'] }],
          merge: false,
        });

        const { config, sources, dependencies } = result;

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

        const templateFiles = Object.values(validConfig.templates ?? {})
          .filter((p): p is string => Boolean(p))
          .map((p) => path.resolve(getCwd(), p));

        return {
          configFile: sources[0],
          dependencies: dependencies ?? [],
          templateFiles,
        };
      } catch (error) {
        // ConfigValidationError 已由 validateConfig 记录详细错误，避免重复输出
        if (!(error instanceof ConfigValidationError)) {
          logger.error('Error during generation:', error);
        }
        if (!opts.watch) process.exit(1);
        return null;
      } finally {
        isRunning = false;
        if (isPending) {
          isPending = false;
          logger.info('Pending changes detected, reloading...');
          void run();
        }
      }
    };

    const result = await run();

    if (opts.watch) {
      if (!result) {
        logger.error('Watch mode requires a loadable config to start.');
        process.exit(1);
      }
      await watchLoop(result, run);
    }
  });

program.parse();

/**
 * Watch 模式：监听配置文件、其依赖模块和自定义模板。
 * - 使用 change + rename 双事件：编辑器原子保存会触发 rename，
 *   此时需关闭并重建 watcher，否则后续变更静默丢失；
 * - 每次成功生成后按最新结果重建监听集合（配置/模板路径可能已变化）。
 */
async function watchLoop(
  initial: RunResult,
  run: () => Promise<RunResult | null>,
): Promise<void> {
  const watched = new Map<string, fs.FSWatcher>();
  let debounceTimer: NodeJS.Timeout | undefined;
  let current = initial;

  const uniquePaths = (result: RunResult) =>
    Array.from(
      new Set([
        result.configFile,
        ...result.dependencies,
        ...result.templateFiles,
      ]),
    );

  const closeAll = () => {
    for (const watcher of watched.values()) watcher.close();
    watched.clear();
  };

  const schedule = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      logger.info('Changes detected, regenerating...');
      const next = await run();
      if (next) {
        current = next;
        setup(uniquePaths(current));
      }
    }, WATCH_DEBOUNCE_MS);
  };

  const watchOne = (file: string) => {
    let watcher: fs.FSWatcher;
    try {
      watcher = fs.watch(file);
    } catch (error) {
      logger.debug(`Cannot watch ${file} (skipping):`, error);
      return;
    }

    const isConfig = file === current.configFile;

    watcher.on('change', (event) => {
      if (event === 'change') schedule();
    });
    watcher.on('rename', () => {
      watcher.close();
      watched.delete(file);
      setTimeout(() => watchOne(file), RENAME_REARM_DELAY_MS);
    });
    watcher.on('error', (error) => {
      if (isConfig) {
        // 错误不可恢复（如配置文件被删除），记录日志后退出进程
        logger.error('Config file watcher error (watching stopped):', error);
        closeAll();
        process.exit(1);
      }
      logger.warn(`Watcher for ${file} failed (stopped watching it):`, error);
      watcher.close();
      watched.delete(file);
    });

    watched.set(file, watcher);
  };

  const setup = (paths: string[]) => {
    closeAll();
    logger.info(`Watching for changes in: ${paths.join(', ')}`);
    for (const p of paths) watchOne(p);
  };

  const cleanup = () => {
    closeAll();
    clearTimeout(debounceTimer);
    process.exit(0);
  };

  // 优雅退出：关闭 watcher 后退出
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  setup(uniquePaths(current));

  // 永不 resolve 的 Promise 仅用于保持进程存活
  // 信号处理完全由 cleanup 负责
  await new Promise<void>(() => {});
}
