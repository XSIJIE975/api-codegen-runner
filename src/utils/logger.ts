import chalk from 'chalk';

const TAG = chalk.cyan('[api-codegen-runner]');

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    console.log(`${TAG} ${chalk.blue(`${msg}`)}`, ...args);
  },

  success: (msg: string, ...args: unknown[]) => {
    console.log(`${TAG} ${chalk.green(`${msg}`)}`, ...args);
  },

  warn: (msg: string, ...args: unknown[]) => {
    console.log(`${TAG} ${chalk.yellow(`${msg}`)}`, ...args);
  },

  error: (msg: string | Error, ...args: unknown[]) => {
    if (msg instanceof Error) {
      console.error(`${TAG} ${chalk.red(`${msg.message}`)}`, ...args);
      if (msg.stack) console.error(chalk.gray(msg.stack));
    } else {
      console.error(`${TAG} ${chalk.red(`${msg}`)}`, ...args);
    }
  },

  // 用于 debug 模式输出灰色日志
  debug: (msg: string, ...args: unknown[]) => {
    console.log(`${TAG} ${chalk.gray(`${msg}`)}`, ...args);
  },

  // 普通日志
  log: (msg: string, ...args: unknown[]) => {
    console.log(`${TAG} ${msg}`, ...args);
  },
};
