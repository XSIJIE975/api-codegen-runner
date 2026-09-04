import { describe, expect, it } from 'vitest';
import { Transformer } from '../src/core/transformer';
import type { ApiDefinition, StandardOutput } from 'api-codegen-universal';

const FILE_PATH = 'service/service/index.ts';
const TYPE_DIR = 'src/auto-codegen/types';
const API_DIR = 'src/auto-codegen';

function makeApi(path: string, operationId: string): ApiDefinition {
  return {
    path,
    method: 'POST',
    operationId,
    responses: {},
    category: {
      segments: ['service'],
      depth: 1,
      isUnclassified: false,
      filePath: FILE_PATH,
    },
  };
}

function makeOutput(apis: ApiDefinition[]): StandardOutput {
  return { apis, schemas: {}, interfaces: {}, metadata: null };
}

describe('Transformer', () => {
  it('normalizes operationId to PascalCase function name', () => {
    const transformer = new Transformer({ methodNameCase: 'PascalCase' });
    const vm = transformer.transform(
      makeOutput([
        makeApi(
          '/service/hiagent-convert-file-to-jsonl',
          'postServiceHiagent-convert-file-to-jsonl',
        ),
      ]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions).toHaveLength(1);
    expect(vm.functions[0].name).toBe('PostServiceHiagentConvertFileToJsonl');
    expect(vm.functions[0].method).toBe('post');
    expect(vm.functions[0].url).toBe('/service/hiagent-convert-file-to-jsonl');
  });

  it('throws with both URLs when final names collide in the same output file', () => {
    const transformer = new Transformer({ methodNameCase: 'PascalCase' });
    // 模拟 universal <0.7.0 的真实冲突：两个不同的 operationId
    // 在 PascalCase 归一化后坍缩为同一个函数名
    const colliding = () =>
      transformer.transform(
        makeOutput([
          makeApi(
            '/service/hiagent-convert-file-to-jsonl',
            'postServiceHiagent-convert-file-to-jsonl',
          ),
          makeApi(
            '/service/hiagent/convert-file-to-jsonl',
            'postServiceHiagentConvert-file-to-jsonl',
          ),
        ]),
        FILE_PATH,
        TYPE_DIR,
        API_DIR,
      );

    expect(colliding).toThrowError(/Duplicate function name/);
    try {
      colliding();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('/service/hiagent-convert-file-to-jsonl');
      expect(message).toContain('/service/hiagent/convert-file-to-jsonl');
      expect(message).toContain(FILE_PATH);
      expect(message).toContain('upgrade api-codegen-universal to >= 0.7.0');
    }
  });

  it('detects collisions under camelCase as well', () => {
    const transformer = new Transformer({ methodNameCase: 'camelCase' });
    const colliding = () =>
      transformer.transform(
        makeOutput([makeApi('/a/b', 'getA-b'), makeApi('/a-b', 'getA-b_')]),
        FILE_PATH,
        TYPE_DIR,
        API_DIR,
      );

    expect(colliding).toThrowError(/Duplicate function name/);
  });

  it('does not throw when final names are distinct', () => {
    const transformer = new Transformer({ methodNameCase: 'PascalCase' });
    const vm = transformer.transform(
      makeOutput([
        makeApi('/users', 'getUsers'),
        makeApi('/orders', 'getOrders'),
      ]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions.map((fn) => fn.name)).toEqual([
      'GetUsers',
      'GetOrders',
    ]);
  });
});
