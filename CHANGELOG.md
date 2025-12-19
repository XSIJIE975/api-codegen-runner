# api-codegen-runner

## 0.3.0

### Minor Changes

- [#3](https://github.com/XSIJIE975/api-codegen-runner/pull/3) [`f3389c0`](https://github.com/XSIJIE975/api-codegen-runner/commit/f3389c0cf69dd727dc6ea8385be42510e4d84e55) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - ### Features
  - **CLI**: 新增 `update` 命令，支持检查和安全更新项目模板。
  - **CLI**: 重构 `init` 命令，生成的配置文件包含版本元数据，支持更智能的初始化流程。
  - **Templates**: 引入模板版本控制系统，支持检测模板冲突并自动备份 (`safe-update` 模式)。
  - **Templates**: 示例模板更新，增强 API 模板灵活性，`importRequestStr` 配置项现在支持字符串数组，方便生成多行导入语句。可自行拓展模板以满足特定需求。
  - **Core**: 优化类型提取逻辑，支持多种命名风格转换，并自动过滤 TypeScript 内置类型。
  - **Core**: 完善配置校验逻辑

  ### Bug Fixes
  - **Core**: 修复类型导入生成逻辑，正确处理联合类型中的引用关系。

  ### Build
  - **Build**: 优化构建产物，提升打包效率，减少冗余代码。

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
