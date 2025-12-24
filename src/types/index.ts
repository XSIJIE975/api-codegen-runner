import type {
  OpenAPIOptions,
  ApifoxConfig,
  InputSource,
} from 'api-codegen-universal';

export interface UserConfig {
  /** 是否开启调试模式，会输出 debug 文件 */
  debug?: boolean;
  /** 生成前是否清理输出目录 */
  clean?: boolean;
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
    /** 是否将类型生成为独立文件 (默认为 false: 生成单个文件) */
    separateTypes?: boolean;
  };
  templates?: {
    api?: string;
    type?: string;
  };
  globalContext?: Record<string, unknown>;
  /** 生命周期钩子 */
  hooks?: {
    /**
     * 生成结束后的回调
     * @param config 当前的完整配置
     */
    onComplete?: (config: UserConfig) => void | Promise<void>;
  };
}

export interface ApiFileViewModel {
  meta: {
    generatedAt: string;
  };
  imports: {
    types: string[];
    relativePath: string;
  };
  interfaceExportMode: 'export' | 'declare';
  config: Record<string, unknown>;
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

  /** requestBody 支持的所有 content-type (仅当有 body 参数时存在) */
  bodyContentTypes?: string[];
}

export interface FunctionParam {
  name: string;
  type: string;
  in: 'path' | 'query' | 'body';
  required: boolean;
  /** content-type (仅 body 参数有效，如 'application/json', 'multipart/form-data') */
  contentType?: string;
}
