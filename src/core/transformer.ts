import path from 'path';
import { camelCase as toCamelCase, snakeCase as toSnakeCase } from 'lodash-es';
import type {
  StandardOutput,
  ApiDefinition,
  ResponseDefinition,
  PropertyDefinition,
} from 'api-codegen-universal';
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
import { logger } from '../utils/logger';

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
      const urlPlaceholders = Array.from(
        api.path.matchAll(/\{([^}]+)\}/g),
        (m) => m[1],
      );
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

      // 3.5 校验 URL 占位符与 path 参数一一对应，避免生成引用
      // 未定义变量的代码（错误会延迟到用户项目编译时才暴露）
      const pathParamNames = new Set(
        params.filter((p) => p.in === 'path').map((p) => p.name),
      );
      const unmatchedPlaceholders = urlPlaceholders.filter((ph) => {
        // 占位符必须是合法 JS 标识符才能作为模板字面量变量
        if (!/^[A-Za-z_$][\w$]*$/.test(ph)) return true;
        return !pathParamNames.has(ph);
      });
      if (unmatchedPlaceholders.length > 0) {
        logger.warn(
          `${api.method.toUpperCase()} ${api.path}: path placeholder(s) ` +
            `[${unmatchedPlaceholders.join(', ')}] have no matching path ` +
            `parameter; generated code may reference undefined variables.`,
        );
      }

      // 4. 方法名格式化
      let name = api.operationId;
      const caseStyle = this.config.methodNameCase || 'PascalCase';
      if (caseStyle === 'camelCase') name = toCamelCase(name);
      else if (caseStyle === 'PascalCase') name = toPascalCase(name);
      else if (caseStyle === 'snake_case') name = toSnakeCase(name);

      // 5. 描述信息（清洗换行与注释终结符，避免破坏生成的 JSDoc）
      const sanitize = (text: string) =>
        text.replace(/\r?\n/g, ' ').replace(/\*\//g, '* /').trim();
      const descParts = [];
      if (api.summary) descParts.push(sanitize(api.summary));
      if (api.description) descParts.push(sanitize(api.description));
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

    // 兜底检测：同一输出文件内最终函数名冲突时直接报错，
    // 避免静默生成重复的 export const（TS Duplicate identifier）。
    // 归一化层面的消歧由 api-codegen-universal >= 0.7.0 在 operationId 阶段完成，
    // 这里拦截的是自定义模板、methodNameCase 等本层变换可能引入的残余冲突。
    const nameIndex = new Map<string, { method: string; url: string }>();
    for (const fn of functions) {
      const existing = nameIndex.get(fn.name);
      if (existing) {
        throw new Error(
          `Duplicate function name "${fn.name}" detected in generated file "${targetFilePath}".\n` +
            `Conflicting endpoints:\n` +
            `  - ${existing.method.toUpperCase()} ${existing.url}\n` +
            `  - ${fn.method.toUpperCase()} ${fn.url}\n` +
            `These endpoints collide after method-name normalization. Rename one of them in the API source ` +
            `(Apifox/OpenAPI), or upgrade api-codegen-universal to >= 0.7.0 which disambiguates ` +
            `operationIds automatically.`,
        );
      }
      nameIndex.set(fn.name, { method: fn.method, url: fn.url });
    }

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
    // 收集所有 2xx 响应（含 OpenAPI 3.1 的 '2XX' 通配），合并为 union。
    // default / 4xx / 5xx 不参与成功类型推导。
    const refs: string[] = [];
    for (const [code, res] of Object.entries(api.responses || {})) {
      if (!/^(2\d\d|2XX)$/i.test(code)) continue;
      const ref = this.pickResponseRef(res);
      if (ref) refs.push(ref);
    }

    const uniqueRefs = Array.from(new Set(refs));
    return uniqueRefs.length > 0 ? uniqueRefs.join(' | ') : 'any';
  }

  private pickResponseRef(res: ResponseDefinition): string | null {
    if (!res?.content) return null;

    // 优先查找 application/json，否则按文档声明顺序取第一个有效 ref
    const contentTypes = Object.keys(res.content);
    const jsonType = contentTypes.find((ct) => ct.includes('application/json'));
    const ordered = jsonType
      ? [jsonType, ...contentTypes.filter((ct) => ct !== jsonType)]
      : contentTypes;

    for (const contentType of ordered) {
      const ref = res.content[contentType]?.schema?.ref;
      if (ref) return ref;
    }
    return null;
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
          ([key, prop]: [string, PropertyDefinition]) => {
            const propType = this.mapSchemaTypeToTs(prop, schemaNames);
            // 属性类型可能引用其他 schema（含数组元素类型），需要补齐 import
            extractRefTypes(propType).forEach((t) => importTypes.add(t));
            params.push({
              name: key,
              type: propType,
              in: 'path',
              required: prop.required !== false,
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

  private mapSchemaTypeToTs(
    prop: PropertyDefinition,
    schemaNames: Set<string>,
  ): string {
    // api-codegen-universal 输出的 PropertyDefinition.type 已经是 TS 类型
    // 字符串（如 'string'、'number'、'UserDto'、'UserDto[]'；枚举由上游
    // 折叠为基础类型并单独存放在 enum 字段），直接使用并做规范化，
    // 不能再按 JSON Schema 重新推导
    const raw = prop?.type?.trim();
    return raw ? normalizeType(raw, schemaNames) : 'string';
  }
}
