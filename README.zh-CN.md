# API Codegen Runner

[![npm version](https://img.shields.io/npm/v/api-codegen-runner.svg)](https://www.npmjs.com/package/api-codegen-runner)
[![License](https://img.shields.io/npm/l/api-codegen-runner.svg)](https://github.com/XSIJIE975/api-codegen-runner/blob/main/LICENSE)

基于 `api-codegen-universal` 构建的高效 API 代码生成工具。支持 OpenAPI (Swagger) 3.0/3.1 及 Apifox 数据源，通过 EJS 模板引擎生成规范的 TypeScript 接口定义与请求函数。

## 核心特性

- **多源兼容**: 完美支持 OpenAPI (Swagger) 规范及 Apifox 项目同步。
- **类型安全**: 自动生成完整的 TypeScript 类型定义，支持泛型与复杂嵌套结构。
- **高度可配**: 内置 EJS 模板引擎，支持完全自定义代码生成逻辑。
- **开发友好**: 提供 CLI 工具与 Watch 模式，支持配置热更新与自动同步。
- **灵活扩展**: 支持生命周期钩子、路径重写、方法名格式化及类型规范化。

## 安装

推荐作为开发依赖安装：

```bash
# npm
npm install api-codegen-runner -D

# pnpm
pnpm add api-codegen-runner -D

# yarn
yarn add api-codegen-runner -D
```

## 快速上手

### 1. 初始化配置

在项目根目录执行初始化命令：

```bash
npx api-codegen-runner init
```

该命令将生成 `codegen.config.ts` 配置文件。如需自定义生成模板，可在交互过程中选择释放默认模板到本地。

### 2. 修改配置

编辑 `codegen.config.ts`，配置数据源及输出选项：

```typescript
import { defineConfig } from 'api-codegen-runner';

export default defineConfig({
  // 数据源：支持 URL 或本地 JSON 文件路径
  input: 'https://petstore3.swagger.io/api/v3/openapi.json',

  // 输出设置
  output: {
    apiDir: 'src/api', // API 函数输出目录
    typeDir: 'src/types', // 类型定义输出目录
    separateTypes: true, // 是否拆分类型文件
  },

  // 生成选项
  methodNameCase: 'PascalCase', // 方法名格式：PascalCase | camelCase | snake_case
  clean: true, // 生成前清理目录

  // 全局上下文：注入到模板中的变量
  globalContext: {
    importRequestStr: "import request from '@/utils/request';",
  },
});
```

### 3. 生成代码

执行生成命令：

```bash
npx api-codegen-runner generate
```

建议在 `package.json` 中添加快捷脚本：

```json
{
  "scripts": {
    "api:gen": "api-codegen-runner generate",
    "api:watch": "api-codegen-runner generate --watch"
  }
}
```

## CLI 命令详解

| 命令       | 说明                    | 选项                                                                   |
| ---------- | ----------------------- | ---------------------------------------------------------------------- |
| `init`     | 初始化配置文件          | -                                                                      |
| `generate` | 执行代码生成 (默认命令) | `-c, --config <path>`: 指定配置文件路径<br>`-w, --watch`: 开启监听模式 |
| `update`   | 更新工具或模板          | -                                                                      |

## Vite 集成

本工具提供了一个 Vite 插件，可在开发服务器启动时自动生成代码，并在配置或模板文件变化时重新生成。

### 使用方法

在 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite';
import { ApiCodegenPlugin } from 'api-codegen-runner';

export default defineConfig({
  plugins: [ApiCodegenPlugin()],
});
```

该插件将：

- 在服务器启动时运行代码生成（仅限开发模式）。
- 监听 `codegen.config.ts` 和 `.ejs` 模板文件。
- 检测到更改时自动重新生成代码。

## 配置参考

`UserConfig` 接口定义如下：

```typescript
import type {
  OpenAPIOptions,
  ApifoxConfig,
  InputSource,
} from 'api-codegen-universal';

interface UserConfig {
  /**
   * 数据源配置
   * - string: OpenAPI URL 或本地文件路径
   * - object: Apifox 项目配置
   * 详见 [InputSource | ApifoxConfig](https://www.npmjs.com/package/api-codegen-universal)
   */
  input: InputSource | ApifoxConfig;

  /**
   * 显式指定模式 (可选)
   * 如果 input 是字符串默认为 'openapi'
   * 如果 input 是对象默认为 'apifox'
   */
  mode?: 'openapi' | 'apifox';

  /** 输出配置 */
  output: {
    apiDir: string; // API 文件输出路径
    typeDir: string; // 类型文件输出路径
    /** 是否将类型生成为独立文件 (默认: false, 即生成单个 index.ts) */
    separateTypes?: boolean;
  };

  /**
   * API 方法名格式化方式
   * @default 'camelCase'
   */
  methodNameCase?: 'camelCase' | 'PascalCase' | 'snake_case';

  /**
   * 底层解析器配置 (api-codegen-universal)
   * 用于控制路径分类、参数命名风格、接口导出模式等
   * 详见 [OpenAPIOptions](https://www.npmjs.com/package/api-codegen-universal)
   */
  requestConfig?: OpenAPIOptions;

  /** 生成前是否清理输出目录 */
  clean?: boolean;

  /** 是否开启调试模式 (输出中间数据到 .debug 目录) */
  debug?: boolean;

  /** 自定义模板路径 */
  templates?: {
    api?: string; // API 生成模板路径 (.ejs)
    type?: string; // 类型生成模板路径 (.ejs)
  };

  /** 全局上下文，注入到 EJS 模板中，可在模板通过 `config` 访问 */
  globalContext?: Record<string, any>;

  /** 生命周期钩子 */
  hooks?: {
    /** 生成完成后的回调 */
    onComplete?: (config: UserConfig) => void | Promise<void>;
  };
}
```

### Apifox 配置示例

```typescript
export default defineConfig({
  input: {
    projectId: '123456',
    token: 'YOUR_APIFOX_ACCESS_TOKEN',
  },
  // ...其他配置
});
```

## 模板自定义

本工具使用 EJS 作为模板引擎。你可以通过 `init` 命令释放默认模板，或手动创建 `.ejs` 文件。

### 模板上下文 (ViewModel)

在模板中可以使用以下变量，完整类型定义如下：

```typescript
/** 传递给模板的根对象 */
interface ApiFileViewModel {
  meta: {
    generatedAt: string; // 生成时间 ISO 字符串
  };
  imports: {
    types: string[]; // 当前文件引用的类型列表
    relativePath: string; // 类型目录的相对路径
  };
  /** 接口导出模式，来自 requestConfig */
  interfaceExportMode: 'export' | 'declare';
  /** 全局配置中的 globalContext */
  config: Record<string, unknown>;
  /** API 函数列表 */
  functions: ApiFunctionViewModel[];
}

/** 单个 API 函数的数据模型 */
interface ApiFunctionViewModel {
  name: string; // 函数名
  method: string; // HTTP 方法 (get, post, put...)
  url: string; // 请求路径 (可能包含模板变量 ${id})
  description: string; // 接口描述
  responseType: string; // 返回类型字符串

  hasPathParams: boolean; // 是否有路径参数
  hasQueryParams: boolean; // 是否有查询参数
  hasBody: boolean; // 是否有请求体

  /**
   * 预生成的函数参数签名字符串
   * 例如: "id: string, dto: UserDto"
   */
  paramsSignature: string;

  /** 详细参数列表，用于自定义生成逻辑 */
  allParams: FunctionParam[];
}

/** 参数详情 */
interface FunctionParam {
  name: string; // 参数名
  type: string; // 参数类型
  in: 'path' | 'query' | 'body'; // 参数位置
  required: boolean; // 是否必填
}
```

### 工具函数 (utils)

模板中还注入了 `utils` 对象，包含以下格式化工具：

- `camelCase(str)`: 小驼峰命名 (user-name -> userName)
- `pascalCase(str)`: 大驼峰命名 (user_name -> UserName)
- `kebabCase(str)`: 短横线命名 (userName -> user-name)
- `upperFirst(str)`: 首字母大写 (userName -> UserName)
- `commentBlock(str)`: 生成 JSDoc 格式的注释块

## License

MIT
