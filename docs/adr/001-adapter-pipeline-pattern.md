# ADR-001: 适配器 + 管道架构

## 状态

已接受（Accepted）

## 背景

项目需要支持多种 API 规范格式（OpenAPI/Swagger、Apifox），每种格式有不同的数据结构。同时需要支持多种输出形式（CLI、Vite 插件）和可定制的代码模板。

核心挑战：

1. 如何统一不同规范格式的差异？
2. 如何让代码生成逻辑与数据源格式解耦？
3. 如何支持用户自定义模板而不影响核心逻辑？

## 决策

采用**适配器模式 + 管道模式**的两层架构：

### 第一层：Universal（标准化引擎）

将不同 API 规范适配为统一的 `StandardOutput` 结构：

```
OpenAPI 文档 ──→ [OpenAPIAdapter] ──→ StandardOutput
Apifox 文档  ──→ [ApifoxAdapter]  ──→ StandardOutput
未来格式 X   ──→ [XAdapter]       ──→ StandardOutput
```

所有适配器实现 `IAdapter` 接口：

```typescript
interface IAdapter<TOptions, TSource> {
  parse(source: TSource, options?: TOptions): Promise<StandardOutput>;
  validate(source: TSource): Promise<boolean>;
}
```

### 第二层：Runner（代码生成）

接收 `StandardOutput`，通过 EJS 模板生成代码文件：

```
StandardOutput ──→ [Generator + EJS Templates] ──→ .ts 代码文件
```

Runner 提供：

- CLI 工具（支持 watch 模式）
- Vite 插件（开发服务器集成）
- 配置校验
- 自定义模板支持

### 完整管道

```
┌─────────────────────────────────────────────────────────────────────┐
│                          数据流向（单向）                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   源文档                                                            │
│   (OpenAPI/Apifox)                                                  │
│       │                                                             │
│       ▼                                                             │
│   ┌─────────────────┐                                               │
│   │    Adapter      │  universal 包                                 │
│   │  (解析 + 标准化) │                                               │
│   └────────┬────────┘                                               │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                               │
│   │ StandardOutput  │  统一交换格式                                  │
│   │  schemas        │                                               │
│   │  apis           │                                               │
│   │  metadata       │                                               │
│   └────────┬────────┘                                               │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                               │
│   │    Generator    │  runner 包                                    │
│   │ (模板渲染+输出) │                                               │
│   └────────┬────────┘                                               │
│            │                                                        │
│            ▼                                                        │
│   代码文件                                                          │
│   (.ts)                                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 理由

### 为什么分成两个包？

1. **职责分离**
   - Universal 专注于"理解"各种 API 规范
   - Runner 专注于"生成"代码文件

2. **独立演进**
   - Universal 可以添加新的适配器（如 GraphQL）而不影响 Runner
   - Runner 可以改变模板引擎（如从 EJS 换到 Handlebars）而不影响 Universal

3. **复用性**
   - Universal 可以被其他工具复用（如 IDE 插件、文档生成器）
   - Runner 可以对接其他数据源（只要产出 `StandardOutput`）

### 为什么用 StandardOutput 作为中间格式？

1. **解耦**：适配器和生成器互不感知
2. **可测试**：每层可以独立测试
3. **可扩展**：新增数据源或输出格式只需添加新的适配器或生成器

### 为什么选择 EJS 模板？

1. **灵活性**：用户可以完全自定义输出格式
2. **简单性**：EJS 语法接近原生 JavaScript，学习成本低
3. **生态**：EJS 是成熟的模板引擎，社区支持好

## 后果

### 正面

- ✅ 新增 API 规范支持只需添加新适配器
- ✅ 用户可以自定义模板而不修改核心代码
- ✅ 每层可以独立测试和演进
- ✅ Universal 可被其他项目复用

### 负面

- ⚠️ 两层架构增加了理解成本
- ⚠️ `StandardOutput` 的设计需要平衡各种规范的特性
- ⚠️ 模板更新可能需要同时更新 runner 和模板文件

### 风险

- `StandardOutput` 如果设计不当，可能无法表达某些规范的特殊特性
- 模板与 `StandardOutput` 的结构强耦合，改动数据结构可能破坏现有模板

## 参考

- [术语表](../glossary.md)
- [api-codegen-universal](https://github.com/XSIJIE975/api-codegen-universal)
