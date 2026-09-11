import { describe, expect, it, vi, afterEach } from 'vitest';
import { Transformer } from '../src/core/transformer';
import { logger } from '../src/utils/logger';
import type {
  ApiDefinition,
  StandardOutput,
  SchemaDefinition,
} from 'api-codegen-universal';

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

function makeOutput(
  apis: ApiDefinition[],
  schemas: Record<string, SchemaDefinition> = {},
): StandardOutput {
  return { apis, schemas, interfaces: {}, metadata: null };
}

function refResponse(ref: string) {
  return {
    description: 'success',
    content: {
      'application/json': { schema: { type: 'ref' as const, ref } },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('sanitizes newlines and comment terminators in descriptions', () => {
    const transformer = new Transformer({});
    const api = makeApi('/users', 'getUsers');
    api.summary = 'first line\nsecond line';
    api.description = 'doc ends with */ sequence';
    const vm = transformer.transform(
      makeOutput([api]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions[0].description).toBe(
      'first line second line\n * doc ends with * / sequence',
    );
  });

  it('leaves description empty when neither summary nor description exists', () => {
    const transformer = new Transformer({});
    const vm = transformer.transform(
      makeOutput([makeApi('/users', 'getUsers')]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions[0].description).toBe('');
  });

  it('warns when URL placeholders have no matching path parameter', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const transformer = new Transformer({});
    const api = makeApi('/pets/{petId}', 'getPet');
    api.method = 'GET';

    transformer.transform(makeOutput([api]), FILE_PATH, TYPE_DIR, API_DIR);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('petId');
  });

  it('warns on non-identifier placeholders', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const transformer = new Transformer({});
    const api = makeApi('/files/{user.id}', 'getUserFile');
    api.method = 'GET';

    transformer.transform(makeOutput([api]), FILE_PATH, TYPE_DIR, API_DIR);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn when placeholders match expanded path params', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const transformer = new Transformer({});
    const api = makeApi('/pets/{petId}', 'getPet');
    api.method = 'GET';
    api.parameters = { path: { type: 'ref', ref: 'PetPathParams' } };
    const schemas: Record<string, SchemaDefinition> = {
      PetPathParams: {
        name: 'PetPathParams',
        type: 'object',
        properties: {
          petId: { name: 'petId', type: 'number', required: true },
          nickname: { name: 'nickname', type: 'string', required: false },
        },
      },
    };

    const vm = transformer.transform(
      makeOutput([api], schemas),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(warnSpy).not.toHaveBeenCalled();
    // universal 输出的 PropertyDefinition.type 已是 TS 类型字符串，应原样保留
    expect(vm.functions[0].allParams[0]).toMatchObject({
      name: 'petId',
      type: 'number',
      in: 'path',
    });
    // 可选属性不应被强转为必填参数
    expect(vm.functions[0].allParams[1]).toMatchObject({
      name: 'nickname',
      type: 'string',
      required: false,
    });
    // 引用其他 schema 的属性类型需要补进 import 列表
    const tagApi = makeApi('/tags/{tagId}', 'getTag');
    tagApi.method = 'GET';
    tagApi.parameters = { path: { type: 'ref', ref: 'PetPathParams' } };
    schemas.PetPathParams.properties!.tagId = {
      name: 'tagId',
      type: 'Tag',
      required: true,
    };
    schemas.Tag = { name: 'Tag', type: 'object' };
    const vm2 = transformer.transform(
      makeOutput([tagApi], schemas),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );
    expect(vm2.functions[0].allParams[2]).toMatchObject({
      name: 'tagId',
      type: 'Tag',
    });
    expect(vm2.imports.types).toContain('Tag');
  });

  it('collects all 2xx response refs into a union', () => {
    const transformer = new Transformer({});
    const api = makeApi('/jobs', 'createJob');
    api.responses = {
      '200': refResponse('Job'),
      '202': refResponse('AcceptedJob'),
      '404': refResponse('Error'),
    };

    const vm = transformer.transform(
      makeOutput([api]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions[0].responseType).toBe('Job | AcceptedJob');
    expect(vm.imports.types).toEqual(
      expect.arrayContaining(['Job', 'AcceptedJob']),
    );
    expect(vm.imports.types).not.toContain('Error');
  });

  it('supports 2XX wildcard responses and dedupes refs', () => {
    const transformer = new Transformer({});
    const api = makeApi('/things', 'getThings');
    api.method = 'GET';
    api.responses = {
      '2XX': refResponse('Thing'),
      '200': refResponse('Thing'),
    };

    const vm = transformer.transform(
      makeOutput([api]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions[0].responseType).toBe('Thing');
  });

  it('falls back to any when only non-2xx responses exist', () => {
    const transformer = new Transformer({});
    const api = makeApi('/void', 'doVoid');
    api.responses = {
      default: refResponse('Error'),
      '404': refResponse('NotFound'),
    };

    const vm = transformer.transform(
      makeOutput([api]),
      FILE_PATH,
      TYPE_DIR,
      API_DIR,
    );

    expect(vm.functions[0].responseType).toBe('any');
  });
});
