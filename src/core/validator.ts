import { z } from 'zod';
import chalk from 'chalk';
import { UserConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * 配置验证错误。
 * 由 validateConfig() 抛出，调用方应捕获并决定如何处理（日志、退出、或继续）。
 * Vite 插件等集成场景中不应直接 process.exit()。
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const configSchema: z.ZodType<UserConfig> = z.object({
  input: z.union([
    z.string().min(1),
    z.object({
      projectId: z.string(),
      token: z.string(),
    }),
  ]),

  mode: z.enum(['openapi', 'apifox']).optional(),

  methodNameCase: z.enum(['camelCase', 'PascalCase', 'snake_case']).optional(),

  output: z.object({
    apiDir: z.string().min(1, { error: 'output.apiDir cannot be empty' }),
    typeDir: z.string().min(1, { error: 'output.typeDir cannot be empty' }),
    separateTypes: z.boolean().optional(),
  }),

  templates: z
    .object({
      api: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),

  requestConfig: z.any().optional(),

  globalContext: z.record(z.string(), z.unknown()).optional(),

  debug: z.boolean().optional(),
  clean: z.boolean().optional(),

  hooks: z
    .object({
      onComplete: z
        .custom<
          (config: UserConfig) => void | Promise<void>
        >((val) => typeof val === 'function', { error: 'Must be a function' })
        .optional(),
    })
    .optional(),
});

export async function validateConfig(config: unknown): Promise<UserConfig> {
  const result = await configSchema.safeParseAsync(config);
  if (result.success) {
    return result.data as UserConfig;
  } else {
    logger.error(chalk.red.bold('Invalid Configuration in codegen.config.ts:'));

    const issues = result.error.issues;

    issues.forEach((issue) => {
      const pathStr =
        issue.path.length > 0
          ? chalk.yellow(issue.path.join('.'))
          : chalk.yellow('config');

      let displayMessage = issue.message;

      if (issue.code === 'invalid_union') {
        if (issue.path[0] === 'input') {
          displayMessage =
            'Must be a URL string OR an Apifox config object { projectId, token }';
        }
      } else if (issue.code === 'invalid_type') {
        if (issue.message.includes('received undefined')) {
          displayMessage = 'Field is required';
        }
      }

      logger.error(`${pathStr}: ${displayMessage}`);
    });

    // 不再直接 process.exit(1)，改为抛出异常
    // 调用方（CLI / Vite 插件）应捕获并决定如何处理
    throw new ConfigValidationError('Configuration validation failed', issues);
  }
}
