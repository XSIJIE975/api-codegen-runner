import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/core/loader';
import { Generator } from '../src/core/generator';
import { validateConfig } from '../src/core/validator';
import type { UserConfig } from '../src/types';

// 测试直接运行源码时，内置模板位于仓库根的 templates/，
// 与 tests/generator.test.ts 保持一致
process.env.API_CODEGEN_RUNNER_BUILD = 'true';

type CodeGeneration = NonNullable<
  NonNullable<UserConfig['requestConfig']>['codeGeneration']
>;

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/prefix-openapi.json',
);

interface GenerateOptions {
  codeGeneration?: CodeGeneration;
  onComplete?: (config: UserConfig) => void;
  prepareTypeDir?: (typeDir: string) => Promise<void>;
}

async function readDirectoryFiles(
  dir: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  const walk = async (currentDir: string, prefix: string) => {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else {
        files[relativePath] = await fs.readFile(absolutePath, 'utf-8');
      }
    }
  };

  await walk(dir, '');
  return files;
}

async function generateTypes(options: GenerateOptions = {}): Promise<{
  config: UserConfig;
  typeFiles: Record<string, string>;
  apiFiles: Record<string, string>;
}> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-prefix-'));
  try {
    const typeDir = path.join(tmpDir, 'types');
    await fs.ensureDir(typeDir);
    // 屏蔽用户级 Prettier 配置，避免 snapshot 结果随运行环境变化
    await fs.writeFile(path.join(tmpDir, '.prettierrc'), '{}');
    await options.prepareTypeDir?.(typeDir);

    const config = await validateConfig({
      input: fixturePath,
      output: {
        apiDir: path.join(tmpDir, 'api'),
        typeDir,
        separateTypes: true,
      },
      clean: true,
      ...(options.codeGeneration
        ? { requestConfig: { codeGeneration: options.codeGeneration } }
        : {}),
      ...(options.onComplete
        ? { hooks: { onComplete: options.onComplete } }
        : {}),
    });

    const data = await new DataLoader().load(config);
    await new Generator(config).generate(data);

    return {
      config,
      typeFiles: await readDirectoryFiles(config.output.typeDir),
      apiFiles: await readDirectoryFiles(config.output.apiDir),
    };
  } finally {
    await fs.remove(tmpDir);
  }
}

describe('typeNamePrefix (integration)', () => {
  it('emits prefixed declarations and resolves $refs to prefixed names', async () => {
    let captured: UserConfig | undefined;

    const { typeFiles, apiFiles } = await generateTypes({
      codeGeneration: {
        interfaceExportMode: 'declare',
        typeNamePrefix: 'Demo',
      },
      onComplete: (config) => {
        captured = config;
      },
      // 模拟从无前缀配置切换到前缀配置：旧文件应被 clean 清除
      prepareTypeDir: async (typeDir) => {
        await fs.writeFile(
          path.join(typeDir, 'User.d.ts'),
          'declare interface User {}',
        );
        await fs.writeFile(
          path.join(typeDir, 'GetUserPathParams.d.ts'),
          'declare interface GetUserPathParams {}',
        );
      },
    });

    expect(Object.keys(typeFiles)).toEqual([
      'DemoGetUserPathParams.d.ts',
      'DemoPet.d.ts',
      'DemoUser.d.ts',
    ]);
    expect(Object.keys(typeFiles).filter((f) => !f.startsWith('Demo'))).toEqual(
      [],
    );

    expect(typeFiles['DemoUser.d.ts']).toContain('declare interface DemoUser');
    expect(typeFiles['DemoUser.d.ts']).toContain('pet?: DemoPet');
    expect(typeFiles['DemoPet.d.ts']).toContain('declare interface DemoPet');
    expect(typeFiles['DemoPet.d.ts']).toContain('owner?: DemoUser');

    const apiSource = apiFiles['api/users/index.ts'];
    expect(apiSource).toBeDefined();
    expect(apiSource).toContain('DemoUser');
    expect(apiSource).not.toMatch(/\bUser\b/);

    expect(captured?.requestConfig?.codeGeneration?.typeNamePrefix).toBe(
      'Demo',
    );
  });

  it('keeps output unchanged when typeNamePrefix is not configured', async () => {
    const { typeFiles } = await generateTypes({
      codeGeneration: {
        interfaceExportMode: 'declare',
      },
    });

    expect(Object.keys(typeFiles)).toEqual([
      'GetUserPathParams.d.ts',
      'Pet.d.ts',
      'User.d.ts',
    ]);
    expect(typeFiles['User.d.ts']).toContain('declare interface User');
    expect(typeFiles['User.d.ts']).toContain('pet?: Pet');

    // 升级 api-codegen-universal 前后，无前缀输出必须逐字节一致
    expect(typeFiles).toMatchSnapshot();
  });
});
