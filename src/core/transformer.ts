import path from 'path';
import { camelCase as toCamelCase, snakeCase as toSnakeCase } from 'lodash-es';
import type { StandardOutput, ApiDefinition } from 'api-codegen-universal';
import type {
  ApiFileViewModel,
  ApiFunctionViewModel,
  FunctionParam,
  UserConfig,
} from '../types';
import {
  extractRefTypes,
  toPascalCase,
  normalizeType,
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
    const schemaNames = new Set(Object.keys(schemas || {}));

    const functions = apis.map((api) => {
      // 1. URL 处理，如将: /users/{id} -> /users/${id}
      const url = api.path.replace(/\{([^}]+)\}/g, '${$1}');

      // 2. 响应类型解析
      let responseType = this.resolveResponseType(api);
      responseType = normalizeType(responseType, schemaNames);
      extractRefTypes(responseType).forEach((t: string) => {
        importTypes.add(t);
      });

      // 3. 参数解析 (传入 schemas 以便展开)
      const {
        params,
        signature,
        hasPath,
        hasQuery,
        hasBody,
        bodyContentTypes,
      } = this.resolveParameters(api, schemas, importTypes, schemaNames);

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
        bodyContentTypes, // 添加支持的所有 content-type
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

    const interfaceExportMode =
      this.config.requestConfig?.codeGeneration?.interfaceExportMode ||
      'export';

    return {
      meta: {
        generatedAt: new Date().toISOString(),
      },
      imports: {
        types: Array.from(importTypes).sort(),
        relativePath: relativePathToTypes,
      },
      interfaceExportMode,
      config: this.config.globalContext || {},
      functions,
    };
  }

  private resolveResponseType(api: ApiDefinition): string {
    const successRes = api.responses['200'] || api.responses['201'];
    if (!successRes?.content) return 'any';

    // 优先查找 application/json，然后遍历所有 content-type
    const contentTypes = Object.keys(successRes.content);
    const jsonType = contentTypes.find((ct) => ct.includes('application/json'));

    if (jsonType) {
      return successRes.content[jsonType]?.schema?.ref || 'any';
    }

    // 如果没有 json，返回第一个 content-type 的 ref
    const firstContentType = contentTypes[0];
    return firstContentType
      ? successRes.content[firstContentType]?.schema?.ref || 'any'
      : 'any';
  }

  private resolveParameters(
    api: ApiDefinition,
    schemas: StandardOutput['schemas'],
    importTypes: Set<string>,
    schemaNames: Set<string>,
  ): {
    params: FunctionParam[];
    signature: string;
    hasPath: boolean;
    hasQuery: boolean;
    hasBody: boolean;
    bodyContentTypes?: string[]; // 添加返回值
  } {
    const params: FunctionParam[] = [];
    let bodyContentTypes: string[] | undefined = undefined; // 初始化变量

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
        const normalizedRef = normalizeType(ref, schemaNames);
        extractRefTypes(normalizedRef).forEach((t) => importTypes.add(t));
        params.push({
          name: 'pathParams',
          type: normalizedRef,
          in: 'path',
          required: true,
        });
      }
    }

    // --- Body Params ---
    if (api.requestBody?.content) {
      const contentTypes = Object.keys(api.requestBody.content);
      bodyContentTypes = contentTypes; // 保存所有 content-type

      // 为每个 content-type 生成对应的参数
      contentTypes.forEach((contentType) => {
        const content = api.requestBody!.content![contentType];
        if (content?.schema?.ref) {
          const ref = content.schema.ref;
          const normalizedRef = normalizeType(ref, schemaNames);
          extractRefTypes(normalizedRef).forEach((t) => importTypes.add(t));

          // 根据 content-type 判断参数名称
          let paramName: string;
          if (contentType.includes('application/json')) {
            paramName = 'data';
          } else if (contentType.includes('multipart/form-data')) {
            paramName = 'formData';
          } else if (
            contentType.includes('application/x-www-form-urlencoded')
          ) {
            paramName = 'formData';
          } else if (contentType.includes('application/xml')) {
            paramName = 'xmlData';
          } else if (contentType.includes('application/octet-stream')) {
            paramName = 'binaryData';
          } else {
            // 其他类型默认使用 data
            paramName = 'data';
          }

          params.push({
            name: paramName,
            type: normalizedRef,
            in: 'body',
            required: api.requestBody!.required ?? true,
            contentType: contentType, // 添加 content-type 标识
          });
        }
      });
    }

    // --- Query Params ---
    if (api.parameters?.query?.ref) {
      const ref = api.parameters.query.ref;
      const normalizedRef = normalizeType(ref, schemaNames);
      extractRefTypes(normalizedRef).forEach((t) => importTypes.add(t));
      params.push({
        name: 'params',
        type: normalizedRef,
        in: 'query',
        required: false,
      });
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
      bodyContentTypes, // 返回所有 content-type
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
