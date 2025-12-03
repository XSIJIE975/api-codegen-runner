# api-codegen-runner

🚀 一个功能强大、基于模板的 OpenAPI/Swagger 和 Apifox 代码生成器。
底层基于 `api-codegen-universal`，支持自定义 EJS 模板、TypeScript 类型自动生成，可作为 CLI 或 Vite 插件使用。

## ✨ 特性

- **高度定制**: 基于 EJS 模板，生成的代码长什么样完全由你决定。
- **双模式支持**: 完美支持 **OpenAPI/Swagger** (URL 或文件) 和 **Apifox** 项目同步。
- **灵活集成**: 既是命令行工具 (CLI)，也是 **Vite** 插件。
- **TypeScript**: 自动生成完整的 TS 接口定义。

## 📦 安装

```bash
# 使用 npm
npm install api-codegen-runner -D

# 使用 pnpm (推荐)
pnpm add api-codegen-runner -D
```

## 🚀 快速开始 (CLI 模式)
1. 初始化配置
在项目根目录运行初始化命令：

```bash
npx api-codegen-runner init
```

这将会：
创建 `codegen.config.ts` 配置文件。
(可选) 将默认的 EJS 模板释放到你的 `./templates` 目录中以便修改。

2. 修改配置 (codegen.config.ts)
```typescript
import { defineConfig } from 'api-codegen-runner';

export default defineConfig({
  // 输入源：可以是 Swagger URL 或本地 json 文件路径
  input: 'https://petstore.swagger.io/v2/swagger.json',
  
  // 输出目录配置
  output: {
    apiDir: 'src/api',   // API 请求函数存放目录
    typeDir: 'src/types',// TypeScript 类型定义存放目录
  },
  
  // 指定使用的模板 (如果你 eject 了模板，这里指向你的本地文件)
  templates: {
    api: './templates/api.ejs',
  },
  
  // 全局变量注入 (可以在模板中通过 config.xxx 访问)
  globalContext: {
    // 例如：注入你的 axios 封装路径
    importRequestStr: "import request from '@/utils/request';",
  }
});
```

3. 生成代码
在项目根目录运行生成命令：

```bash
npx api-codegen-runner generate
```

## ⚡ 集成到 Vite
你可以配置插件，在 Vite 开发服务器启动时自动检查并生成最新的 API 代码。
vite.config.ts:
```typescript
import { defineConfig } from 'vite';
import { ApiCodegenPlugin } from 'api-codegen-runner';

export default defineConfig({
  plugins: [
    // 默认只在 'serve' (npm run dev) 模式下运行
    ApiCodegenPlugin()
  ]
});
```

## 📖 配置详解
1. Apifox 模式
如果你使用 Apifox 管理接口，可以直接同步，无需导出 JSON。
```typescript
export default defineConfig({
  // 将 input 改为对象格式
  input: {
    projectId: 'YOUR_PROJECT_ID', // Apifox 项目 ID
    token: 'YOUR_ACCESS_TOKEN'    // 在 Apifox 账号设置中获取
  },
  
  // 透传给底层解析器的配置
  requestConfig: {
    codeGeneration: {
      parameterNamingStyle: 'camelCase', // 参数命名风格: PascalCase | camelCase | snake_case
    }
  },
  // ... 其他配置
});
```
2. 类型文件分离
默认情况下，所有类型定义会合并到一个 index.ts 文件中。如果你希望每个接口生成单独的 TS 文件：
```typescript
export default defineConfig({
  output: {
    apiDir: 'src/api',
    typeDir: 'src/types',
    separateTypes: true, // <--- 开启此选项
  },
  // ...
});
```

## 📝 模板编写指南
本项目使用 EJS 模板引擎。你可以在 `api.ejs` 中使用以下核心变量。

⚠️ 注意：输出 TypeScript 类型或泛型时，请务必使用 `<%- %>` (Raw output) 而不是 `<%= %>` (Escaped output)，以防止 `< >` 符号被转义为 `&lt; &gt;`。

`imports` 对象
用于生成 import 语句。

- `imports.types`: `string[]` - 当前文件依赖的类型名称列表。
- `imports.relativePath`: `string` - 类型目录相对于当前文件的路径。

`functions` 数组
当前文件包含的所有 API 函数信息。

- `fn.name`: `string` - 函数名 (例如 `getUser`)
- `fn.method`: `string` - HTTP 方法 (小写，例如 `get`)
- `fn.url`: `string` - 请求路径 (已处理为模板字符串，例如 `/users/${id}`)
- `fn.description`: `string` - 接口描述/注释
- `fn.responseType`: `string` - TS 响应类型 (例如 `ApiResult<UserDto>`)
- `fn.paramsSignature`: `string` - 准备好的参数签名字符串 (例如 `id: string, data: UserDto`)
- `fn.hasBody`: `boolean` - 是否有请求体
- `fn.hasQueryParams`: `boolean` - 是否有 `Query` 参数
- `fn.hasPathParams`: `boolean` - 是否有 `Path` 参数
- `fn.allParams`: `Array` - 详细参数列表 (包含 `name, type, in, required`)

`config` 对象
对应你在 `codegen.config.ts` 中配置的 `globalContext` 对象。

**模板示例**

```ejs
<%- config.importRequestStr %>
import type { 
<% imports.types.forEach(t => { %>  <%= t %>,
<% }) %> 
} from '<%= imports.relativePath %>';

<% functions.forEach(fn => { %>
/**
 * <%= fn.description %>
 */
export function <%= fn.name %>(<%- fn.paramsSignature %>) {
  return request.<%= fn.method %><<%- fn.responseType %>>(`<%= fn.url %>`, {
    <% if (fn.hasBody) { %>data,<% } %>
    <% if (fn.hasQueryParams) { %>params,<% } %>
  });
}
<% }) %>
```
