import type { OpenAPIOptions, ApifoxConfig, InputSource } from 'api-codegen-universal'

export interface UserConfig {
  /** 
   * 数据源
   * - 字符串: 视为 OpenAPI URL 或 本地文件路径
   * - 对象: 视为 Apifox 配置
   */
  input: InputSource | ApifoxConfig;
  /** 
   * 显式指定模式 (可选)
   * 如果 input 是字符串默认为 'openapi'
   * 如果 input 是对象默认为 'apifox'
   */
  mode?: 'openapi' | 'apifox';

  /**
   * 生成的 API 方法名称格式
   * @default 'camelCase'
   */
  methodNameCase?: 'camelCase' | 'PascalCase' | 'snake_case';

  /** 透传给 api-codegen-universal 的解析配置 */
  requestConfig?: OpenAPIOptions;
  output: {
    apiDir: string;
    typeDir: string;
    /** 是否将类型生成为独立文件 (默认为 false: 生成单个 index.ts) */
    separateTypes?: boolean;
  };
  templates?: {
    api?: string;
    type?: string;
  };
  globalContext?: Record<string, any>;
}

export interface ApiFileViewModel {
  meta: {
    generatedAt: string;
  };
  imports: {
    types: string[];
    relativePath: string;
  };
  config: Record<string, any>;
  functions: ApiFunctionViewModel[];
}

export interface ApiFunctionViewModel {
  name: string;
  method: string;
  url: string;
  description: string;
  responseType: string;

  hasPathParams: boolean;
  hasQueryParams: boolean;
  hasBody: boolean;

  /** 函数签名: "id: string, dto: UserDto" */
  paramsSignature: string;

  /** 参数列表，用于模板高级处理 */
  allParams: FunctionParam[];
}

export interface FunctionParam {
  name: string;
  type: string;
  in: 'path' | 'query' | 'body';
  required: boolean;
}