# API Code Generator 术语表

> 本术语表定义了 `api-codegen-universal` 和 `api-codegen-runner` 项目中的核心领域概念。

---

## 核心概念

### StandardOutput（标准输出）

所有适配器产生的统一数据结构，是整个管道的核心交换格式。

```typescript
interface StandardOutput {
  schemas: Record<string, SchemaDefinition>; // 数据模型定义
  interfaces: Record<string, string>; // 已生成的 TS 代码
  apis: ApiDefinition[]; // API 接口列表
  metadata: Metadata | null; // 文档元信息
}
```

### SchemaDefinition（数据模型定义）

描述一个数据结构的元信息，类似于 JSON Schema。

| 字段                                      | 说明                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| `type`                                    | `object` / `array` / `enum` / `primitive` / `generic` |
| `properties`                              | 对象属性（type=object 时）                            |
| `items`                                   | 数组元素类型（type=array 时）                         |
| `enum`                                    | 枚举值列表（type=enum 时）                            |
| `isGeneric` / `baseType` / `genericParam` | 泛型支持                                              |

### ApiDefinition（API 接口定义）

描述一个 HTTP API 端点的完整信息。

| 字段          | 说明                                         |
| ------------- | -------------------------------------------- |
| `path`        | URL 路径（如 `/api/users/{id}`）             |
| `method`      | HTTP 方法（GET/POST/PUT/DELETE 等）          |
| `operationId` | 唯一操作标识                                 |
| `parameters`  | 参数定义（按 query/path/header/cookie 分组） |
| `requestBody` | 请求体（支持多 content-type）                |
| `responses`   | 响应定义（按状态码）                         |
| `category`    | 路径分类信息（决定生成文件的目录结构）       |

### IAdapter（适配器接口）

所有数据源适配器必须实现的接口。

```typescript
interface IAdapter<TOptions, TSource> {
  parse(source: TSource, options?: TOptions): Promise<StandardOutput>;
  validate(source: TSource): Promise<boolean>;
}
```

---

## 架构组件

### Universal（底层引擎）

**包名：** `api-codegen-universal`

**职责：** 解析各种 API 规范文档，产出标准化的 `StandardOutput`。

**子包：**

- `@api-codegen-universal/core` — 核心类型定义和工具
- `@api-codegen-universal/openapi` — OpenAPI/Swagger 适配器
- `@api-codegen-universal/apifox` — Apifox 适配器

### Runner（上层封装）

**包名：** `api-codegen-runner`

**职责：** 接收 `StandardOutput`，通过模板生成代码文件，集成 Vite 和 CLI。

**核心模块：**

- `Generator` — 代码生成器（使用 EJS 模板）
- `Validator` — 配置校验器
- `Vite Plugin` — Vite 开发服务器集成
- `CLI` — 命令行工具（支持 watch 模式）

---

## 设计模式

### 适配器模式（Adapter Pattern）

将不同的 API 规范格式（OpenAPI、Apifox）适配为统一的 `StandardOutput` 接口。

```
OpenAPI 文档 → [OpenAPIAdapter] → StandardOutput
Apifox 文档  → [ApifoxAdapter]  → StandardOutput
```

### 管道模式（Pipeline Pattern）

数据在管道中单向流动，每层职责清晰：

```
源文档 → 适配器解析 → 标准化输出 → 模板渲染 → 代码文件
```

---

## 配置相关

### NamingStyle（命名风格）

控制生成代码中的命名格式：

- `PascalCase` — 大驼峰（如 `UserProfile`），用于类名、接口名
- `camelCase` — 小驼峰（如 `userProfile`），用于变量名、属性名
- `snake_case` — 下划线（如 `user_profile`）

### CategoryInfo（分类信息）

决定 API 按路径分类到哪个文件：

```typescript
interface CategoryInfo {
  segments: string[]; // 路径段数组
  depth: number; // 分类深度
  isUnclassified: boolean; // 是否未分类
  filePath: string; // 建议的文件路径
}
```

---

## 技术栈

| 组件       | 技术                       |
| ---------- | -------------------------- |
| 模板引擎   | EJS                        |
| 构建工具   | tsup                       |
| 测试框架   | rstest                     |
| 代码检查   | ESLint + TypeScript-ESLint |
| 代码格式化 | Prettier                   |
| 版本管理   | Changesets                 |
| 提交规范   | Commitlint + Husky         |
