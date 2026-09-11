import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { Generator } from '../src/core/generator';
import type {
  ApiDefinition,
  StandardOutput,
  SchemaDefinition,
} from 'api-codegen-universal';

// 测试从源码运行时 __dirname 指向 src/utils，内置模板实际位于仓库根的
// templates/；设置该环境变量让 getPackageTemplatesDir() 解析到正确位置
process.env.API_CODEGEN_RUNNER_BUILD = 'true';

function makeApi(path: string, operationId: string, method: 'GET' | 'POST') {
  return {
    path,
    method,
    operationId,
    responses: {
      '200': {
        description: 'success',
        content: {
          'application/json': { schema: { type: 'ref' as const, ref: 'Pet' } },
        },
      },
    },
    category: {
      segments: ['pet'],
      depth: 1,
      isUnclassified: false,
      filePath: 'pet.ts',
    },
  } satisfies ApiDefinition;
}

function makeStdout(): StandardOutput {
  const schemas: Record<string, SchemaDefinition> = {
    PetPathParams: {
      name: 'PetPathParams',
      type: 'object',
      properties: {
        petId: { name: 'petId', type: 'number', required: true },
      },
    },
    Pet: { name: 'Pet', type: 'object' },
  };

  return {
    apis: [makeApi('/pets/{petId}', 'getPet', 'GET')],
    schemas,
    interfaces: { Pet: 'export interface Pet {\n  id: number;\n}' },
    metadata: null,
  };
}

function makeGenerator(
  tmpDir: string,
  options: { clean?: boolean; separateTypes?: boolean } = {},
) {
  return new Generator({
    input: 'http://example.invalid/openapi.json',
    output: {
      apiDir: path.join(tmpDir, 'api'),
      typeDir: path.join(tmpDir, 'types'),
      separateTypes: options.separateTypes ?? true,
    },
    clean: options.clean ?? false,
    globalContext: {},
  });
}

describe('Generator (integration)', () => {
  it('keeps existing files in typeDir when clean is false (separateTypes)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-gen-'));
    try {
      const typeDir = path.join(tmp, 'types');
      await fs.ensureDir(typeDir);
      await fs.writeFile(path.join(typeDir, 'handwritten.ts'), '// keep me');

      await makeGenerator(tmp).generate(makeStdout());

      expect(
        await fs.readFile(path.join(typeDir, 'handwritten.ts'), 'utf-8'),
      ).toBe('// keep me');
      expect(await fs.pathExists(path.join(typeDir, 'Pet.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(tmp, 'api', 'pet.ts'))).toBe(true);
    } finally {
      await fs.remove(tmp);
    }
  });

  it('empties output dirs when clean is true', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-gen-'));
    try {
      const typeDir = path.join(tmp, 'types');
      await fs.ensureDir(typeDir);
      await fs.writeFile(path.join(typeDir, 'handwritten.ts'), '// remove me');

      await makeGenerator(tmp, { clean: true }).generate(makeStdout());

      expect(await fs.pathExists(path.join(typeDir, 'handwritten.ts'))).toBe(
        false,
      );
      expect(await fs.pathExists(path.join(typeDir, 'Pet.ts'))).toBe(true);
    } finally {
      await fs.remove(tmp);
    }
  });

  it('does not rewrite files whose content is unchanged', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-gen-'));
    try {
      const generator = makeGenerator(tmp);
      const data = makeStdout();

      await generator.generate(data);
      const apiFile = path.join(tmp, 'api', 'pet.ts');
      const firstMtime = (await fs.stat(apiFile)).mtimeMs;

      // 等待文件系统时间戳精度窗口，确保如果发生写入 mtime 一定变化
      await new Promise((resolve) => setTimeout(resolve, 20));

      await generator.generate(data);
      const secondMtime = (await fs.stat(apiFile)).mtimeMs;

      expect(secondMtime).toBe(firstMtime);
    } finally {
      await fs.remove(tmp);
    }
  });

  it('rewrites files when content changes', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-gen-'));
    try {
      const generator = makeGenerator(tmp);
      const data = makeStdout();

      await generator.generate(data);
      const apiFile = path.join(tmp, 'api', 'pet.ts');

      // 修改数据源后重新生成，内容应更新
      data.apis[0].operationId = 'getPetById';
      await generator.generate(data);
      const content = await fs.readFile(apiFile, 'utf-8');

      expect(content).toContain('GetPetById');
    } finally {
      await fs.remove(tmp);
    }
  });

  it('renders without globalContext configured', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'codegen-gen-'));
    try {
      const generator = new Generator({
        input: 'http://example.invalid/openapi.json',
        output: {
          apiDir: path.join(tmp, 'api'),
          typeDir: path.join(tmp, 'types'),
          separateTypes: false,
        },
        clean: false,
      });

      await generator.generate(makeStdout());

      expect(await fs.pathExists(path.join(tmp, 'types', 'index.ts'))).toBe(
        true,
      );
    } finally {
      await fs.remove(tmp);
    }
  });
});
