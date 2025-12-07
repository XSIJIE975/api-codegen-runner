# API Codegen Runner

[![npm version](https://img.shields.io/npm/v/api-codegen-runner.svg)](https://www.npmjs.com/package/api-codegen-runner)
[![License](https://img.shields.io/npm/l/api-codegen-runner.svg)](https://github.com/your-repo/api-codegen-runner/blob/main/LICENSE)

**API Codegen Runner** 是一个强大且灵活的 API 代码生成工具。它基于 `api-codegen-universal` 解析器，支持从 OpenAPI (Swagger) 或 Apifox 自动生成 TypeScript 接口定义和 API 请求函数。

通过 EJS 模板引擎，你可以完全自定义生成的代码结构，完美适配你的项目需求。

## ✨ 特性

- 🔌 **多源支持**: 支持 OpenAPI (Swagger) URL/文件 和 Apifox 项目同步。
- 🎨 **高度定制**: 内置 EJS 模板引擎，支持自定义 API 和类型定义模板。
- 📦 **TypeScript 友好**: 自动生成完整的 TypeScript 类型定义（支持 `.d.ts` 或 `.ts`）。
- 🛠 **CLI 工具**: 提供 `init` 和 `generate` 命令，快速上手。
- ⚡ **Vite 集成**: 提供 Vite 插件，开发模式下自动同步 API 变更。
- 📝 **灵活配置**: 支持方法名格式化 (`PascalCase`, `camelCase`, `snake_case`)、路径分类等。

## 📦 安装

```bash
# 使用 npm
npm install api-codegen-runner -D

# 使用 pnpm
pnpm add api-codegen-runner -D

# 使用 yarn
yarn add api-codegen-runner -D
```

## 🚀 快速开始

### 1. 初始化配置

在项目根目录运行初始化命令，生成配置文件 `codegen.config.ts`：

```bash
npx api-codegen-runner init
```

该命令会询问是否释放默认模板到本地 `./templates` 目录，建议选择 `Yes` 以便后续自定义。

### 2. 修改配置

编辑 `codegen.config.ts` 文件，配置你的 API 源和输出路径：

```typescript
import { defineConfig } from 'api-codegen-runner';

export default defineConfig({
  // 方式 1: OpenAPI 源 (URL 或本地文件路径)
  input: 'https://petstore.swagger.io/v2/swagger.json',

  // 方式 2: Apifox 源 (取消注释以使用)
  /*
  input: {
    projectId: 'YOUR_PROJECT_ID',
    token: 'YOUR_ACCESS_TOKEN',
  },
  */

  // 生成的 API 方法名称格式: 'PascalCase' | 'camelCase' | 'snake_case'
  methodNameCase: 'PascalCase',

  // 输出目录配置
  output: {
    apiDir: 'src/api', // API 请求函数存放目录
    typeDir: 'src/types', // 类型定义存放目录
    separateTypes: true, // 是否将类型生成为独立文件
  },

  // 透传给解析器的配置
  requestConfig: {
    // 路径分类配置
    pathClassification: {
      outputPrefix: 'services', // 生成的文件前缀
      // commonPrefix: '/api/v1', // 去除公共前缀
    },
    codeGeneration: {
      // 类型导出模式: 'export' (生成 .ts) | 'declare' (生成 .d.ts)
      interfaceExportMode: 'export',
    },
  },

  // 自定义模板路径 (可选)
  templates: {
    api: './templates/api.ejs',
    type: './templates/type.ejs',
  },

  // 全局变量注入 (可以在模板中通过 config.xxx 访问)
  globalContext: {
    importRequestStr: "import request from 'your-request-lib';",
  },
});
```

### 3. 生成代码

运行以下命令生成代码：

```bash
npx api-codegen-runner generate
```

## ⚡ Vite 集成

你可以配置插件，在 Vite 开发服务器启动时自动检查并生成最新的 API 代码。

在 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite';
import { ApiCodegenPlugin } from 'api-codegen-runner';

export default defineConfig({
  plugins: [
    // 默认只在 'serve' (npm run dev) 模式下运行
    ApiCodegenPlugin(),
  ],
});
```

## 📝 模板自定义

本项目使用 EJS 模板引擎。你可以在 `templates/` 目录下修改 `api.ejs` 和 `type.ejs`。

### API 模板 (`api.ejs`) 可用变量

- `imports`: 包含类型导入信息。
  - `types`: string[] (使用的类型列表)
  - `relativePath`: string (类型文件的相对路径)
- `functions`: API 函数列表。
  - `name`: string (方法名)
  - `method`: string (HTTP 方法)
  - `url`: string (请求 URL)
  - `description`: string (注释/描述)
  - `responseType`: string (返回类型)
  - `paramsSignature`: string (函数参数签名)
  - `allParams`: Array (详细参数列表)
- `config`: 全局配置上下文 (`globalContext`)。

### 类型模板 (`type.ejs`) 可用变量

- `code`: string (生成的类型定义代码)
- `name`: string (接口名称，仅在独立模式下有效)
- `isGlobal`: boolean (是否为全局模式)
- `config`: 全局配置上下文。

## 📄 License

MIT License © 2025
