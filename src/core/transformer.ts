import path from 'path';
import type { StandardOutput, ApiDefinition } from 'api-codegen-universal';
import type {
  ApiFileViewModel,
  ApiFunctionViewModel,
  FunctionParam,
  UserConfig,
} from '../types';
import {
  extractRefTypes,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
} from '../utils/formatting';

export class Transformer {
  constructor(private config: UserConfig) {}

  transform(
    data: StandardOutput,
    targetFilePath: string,
    typeDir: string,
    apiDir: string,
  ): ApiFileViewModel {
    const { apis, schemas } = data;
    const importTypes = new Set<string>();

    const functions = apis.map((api) => {
      // 1. URL 处理，如将: /users/{id} -> /users/${id}
      const url = api.path.replace(/\{([^}]+)\}/g, '${$1}');

      // 2. 响应类型解析
      const responseType = this.resolveResponseType(api);
      extractRefTypes(responseType).forEach((t: string) => importTypes.add(t));

      // 3. 参数解析 (传入 schemas 以便展开)
      const { params, signature, hasPath, hasQuery, hasBody } =
        this.resolveParameters(api, schemas, importTypes);

      // 4. 方法名格式化
      let name = api.operationId;
      const caseStyle = this.config.methodNameCase || 'PascalCase';
      if (caseStyle === 'camelCase') name = toCamelCase(name);
      else if (caseStyle === 'PascalCase') name = toPascalCase(name);
      else if (caseStyle === 'snake_case') name = toSnakeCase(name);

      // 5. 描述信息
      const descParts = [];
      if (api.summary) descParts.push(api.summary);
      if (api.description) descParts.push(api.description);
      const description = descParts.join('\n * ');

      return {
        name,
        method: api.method.toLowerCase(),
        url,
        description,
        responseType,
        hasPathParams: hasPath,
        hasQueryParams: hasQuery,
        hasBody: hasBody,
        paramsSignature: signature,
        allParams: params,
      } as ApiFunctionViewModel;
    });

    // 4. 计算 import 路径
    const absApiFilePath = path.join(apiDir, targetFilePath);
    const absApiDir = path.dirname(absApiFilePath);
    let relativePathToTypes = path
      .relative(absApiDir, typeDir)
      .split(path.sep)
      .join('/');
    if (!relativePathToTypes.startsWith('.'))
      relativePathToTypes = './' + relativePathToTypes;

    return {
      meta: {
        generatedAt: new Date().toISOString(),
      },
      imports: {
        types: Array.from(importTypes).sort(),
        relativePath: relativePathToTypes,
      },
      config: this.config.globalContext || {},
      functions,
    };
  }

  private resolveResponseType(api: ApiDefinition): string {
    const successRes = api.responses['200'] || api.responses['201'];
    return successRes?.content?.['application/json']?.schema?.ref || 'any';
  }

  private resolveParameters(
    api: ApiDefinition,
    schemas: StandardOutput['schemas'],
    importTypes: Set<string>,
  ): {
    params: FunctionParam[];
    signature: string;
    hasPath: boolean;
    hasQuery: boolean;
    hasBody: boolean;
  } {
    const params: FunctionParam[] = [];

    // --- Path Params ---
    // 你的库生成的结构: parameters.path = { type: 'ref', ref: 'GetUser_Path_Params' }
    if (api.parameters?.path?.ref) {
      const ref = api.parameters.path.ref;
      const schema = schemas[ref];

      if (schema && schema.properties) {
        // 展开模式: 把对象里的属性拿出来作为参数
        Object.entries(schema.properties).forEach(
          ([key, prop]: [string, unknown]) => {
            params.push({
              name: key,
              type: this.mapSchemaTypeToTs(prop),
              in: 'path',
              required: true,
            });
          },
        );
      } else {
        // 兜底: 找不到 schema 就把整个对象当参数
        importTypes.add(ref);
        params.push({
          name: 'pathParams',
          type: ref,
          in: 'path',
          required: true,
        });
      }
    }

    // --- Body Params ---
    if (api.requestBody?.content?.['application/json']?.schema?.ref) {
      const ref = api.requestBody.content['application/json'].schema.ref;
      importTypes.add(ref);
      params.push({
        name: 'data',
        type: ref,
        in: 'body',
        required: api.requestBody.required ?? true,
      });
    }

    // --- Query Params ---
    if (api.parameters?.query?.ref) {
      const ref = api.parameters.query.ref;
      importTypes.add(ref);
      params.push({ name: 'params', type: ref, in: 'query', required: false });
    }

    // 生成签名
    const signature = params
      .map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
      .join(', ');

    return {
      params,
      signature,
      hasPath: params.some((p) => p.in === 'path'),
      hasBody: params.some((p) => p.in === 'body'),
      hasQuery: params.some((p) => p.in === 'query'),
    };
  }

  private mapSchemaTypeToTs(prop: unknown): string {
    const typedProp = prop as { type?: string };
    if (typedProp.type === 'integer' || typedProp.type === 'number')
      return 'number';
    if (typedProp.type === 'boolean') return 'boolean';
    return 'string';
  }
}
