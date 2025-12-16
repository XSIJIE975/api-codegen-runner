# api-codegen-runner

## 0.2.0

### Minor Changes

- [`762449c`](https://github.com/XSIJIE975/api-codegen-runner/commit/762449c043554c2d5123635ad34f6683da57bc7c) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - update(dependencies): 更新 `api-codegen-universal` 版本

## 0.1.0

### Minor Changes

- [`95879a6`](https://github.com/XSIJIE975/api-codegen-runner/commit/95879a605f923aad1c825d1cb31f62844df38875) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - ## 0.1.0

  ### ✨ 功能特性
  - **多源支持**: 支持 OpenAPI (Swagger) URL/文件 和 Apifox 项目同步。
  - **高度定制**: 内置 EJS 模板引擎，支持完全自定义 API 和类型定义模板。
  - **方法命名**: 支持 `methodNameCase` 配置 (`camelCase`, `PascalCase`, `snake_case`)。
  - **类型导出**: 支持 `interfaceExportMode` (`export` 生成标准 TS, `declare` 生成全局类型)。
  - **Vite 集成**: 提供 `ApiCodegenPlugin` 插件，开发模式下自动同步代码。
  - **CLI 工具**: 提供 `init` 命令快速初始化，`generate` 命令生成代码。
  - **文档生成**: 自动从 API 摘要和描述生成详细的 JSDoc 注释。
