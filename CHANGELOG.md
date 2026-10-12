# api-codegen-runner

## 0.6.0

### Minor Changes

- [#15](https://github.com/XSIJIE975/api-codegen-runner/pull/15) [`9961809`](https://github.com/XSIJIE975/api-codegen-runner/commit/996180924ea98c5ae799a6bf16da6d7cb3484d58) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - ## 全库审计修复、CLI 改进与上游依赖升级

  ### 依赖升级
  - 上游解析器 `api-codegen-universal` 升级至 `^0.8.0`,继承其 0.8.0 的修复与改进:同名 Schema 在命名风格转换后不再互相覆盖(新增 `renamedCollidingSchemas` 告警计数)、URL 编码的 schema key 解码保持一致、`requestBody.required` 按 AST 还原而非固定为 `true`、`commonPrefix` 仅按路径段边界裁剪、`HttpMethod` 支持 `TRACE`、多行 `@description` 完整保留、响应头提取至 `responses[status].headers`、operation `tags` 从原始文档恢复、`validate()` 对 URL 输入应用 `fetchTimeoutMs` 超时等;另新增 `emitStandardOutput` 文件发射器,`printNode` 输出按节点缓存以提升性能。详见 `api-codegen-universal` 的 CHANGELOG。

  ### 生成正确性
  - `separateTypes` 模式下 `clean: false` 不再误清类型输出目录;`clean: true` 时两种类型模式都会清空类型目录,切换 `separateTypes` 不再残留旧文件
  - 清洗 JSDoc 描述(折叠换行、转义 `*/`),内容为空时跳过注释块;描述正文不再转义,`<`/`&` 保持原样;空的 JSDoc 块和无用的类型导入不再输出
  - 展开的路径参数沿用上游 TS 属性类型(refs/arrays 不再退化为 `string`),并遵循其 `required` 标记
  - 收集全部 2xx 响应(含 `2XX`)并入响应类型联合
  - URL 路径占位符没有对应路径参数时输出告警
  - API 文件生成并行化;未配置 `globalContext` 时类型模板以空对象兜底渲染
  - 内容未变化的文件跳过写入,避免 watcher 抖动;Prettier 改为惰性加载,格式化失败仅输出 debug 日志

  ### CLI
  - `--version` 输出真实的包版本号
  - Watch 模式:同时监听配置依赖与自定义模板,原子保存的 rename 事件也触发重新生成(含 Linux/inotify),已停止的 watcher 以有界重试重新挂载而非静默停止,pending 重跑后重建监听集合
  - `init --eject` / `init --no-eject` 跳过模板弹出交互确认,`init` 可安全用于 CI 与脚本(不带标志时,非 TTY 环境直接跳过交互不再挂起)
  - `update` 新增 `-c, --config <path>` 支持自定义配置路径,与 `generate` 保持一致

  ### Vite 插件
  - 仅已配置的模板文件变更才触发重新生成;首次配置加载结果会被复用

  ### 其他
  - 配置校验后保留 `watch` / `watchDebounce`
  - 文档中 `methodNameCase` 默认值更正为 PascalCase;新增领域术语表(`CONTEXT.md`)
  - 新增覆盖 transformer 修复、生成器集成与校验器的测试;CI 中运行测试

## 0.5.0

### Minor Changes

- [`409f2bf`](https://github.com/XSIJIE975/api-codegen-runner/commit/409f2bfe4502e26dcf8fa32d7ecbdb30161040c6) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - 新增函数名冲突兜底检测（默认报错）

  当两个 API 路径仅分隔符不同（如 `/a/resource-detail` 与 `/a/resource/detail`）时，方法名归一化后会坍缩为同一个函数名，此前会静默生成重复的 `export const`，导致 TS 编译错误（Duplicate identifier）。
  - **最终函数名唯一性校验**：Transformer 在应用 `methodNameCase` 格式化后，对同一输出文件内的最终函数名做唯一性校验，发现冲突时直接抛出明确错误。错误信息包含：冲突的函数名、各端点的 method + 原始 URL、所在输出文件路径，并附解决方式提示，避免坏代码落盘。
  - **依赖升级**：`api-codegen-universal` 升级至 `^0.7.0`，其在 operationId 阶段对归一化冲突自动消歧（冲突端点追加数字后缀），建议同步升级。本检测是 runner 层的最后防线，拦截 `methodNameCase`、自定义模板等本层变换可能引入的残余冲突。

  兼容性说明：对未发生冲突的接口，生成结果完全不变；仅原本因冲突而生成坏代码的场景，现在会在生成阶段明确报错。

## 0.4.1

### Patch Changes

- [`ca716eb`](https://github.com/XSIJIE975/api-codegen-runner/commit/ca716eb5faf93014551afe492171fd47f12c0e88) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - fix: remove unnecessary quotes from keys in generated config template

## 0.4.0

### Minor Changes

- [`aa634b7`](https://github.com/XSIJIE975/api-codegen-runner/commit/aa634b7fdf61c17ccea5c725b6eb28d3c4227e25) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - feat: 改进多 content-type 支持，新增 isPending 机制

  ### Minor Changes
  - 改进多 content-type 支持：使用实际参数名代替硬编码的 `data`，生成 content-type 对应的函数签名
  - Watch 模式新增 `isPending` 机制，生成期间的文件变更会被排队重跑，防止变更丢失

  ### Patch Changes
  - 修复配置校验错误导致进程意外退出的问题（改为抛出 `ConfigValidationError`）
  - 修复路径穿越安全漏洞：通过符号链接可绕过项目根目录检查
  - 修复 watch 模式下并发执行冲突问题（添加 `isRunning` 保护）
  - EJS 模板预编译优化：缓存 `ejs.compile()` 后的函数，避免重复解析
  - 优化 signal handler 注册和进程优雅退出（SIGINT/SIGTERM + watcher.cleanup）
  - 消除 Vite 插件中 buildStart 和 configureServer 的重复配置加载

## 0.3.3

### Patch Changes

- [#8](https://github.com/XSIJIE975/api-codegen-runner/pull/8) [`10e9e02`](https://github.com/XSIJIE975/api-codegen-runner/commit/10e9e02cfff95e75f9ea09f952309a9aa53ef2a9) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - feat: add `watch` and `watchDebounce` options to control file watching behavior
  perf: optimize generation process with debounce and concurrency control

## 0.3.2

### Patch Changes

- [`96f4a73`](https://github.com/XSIJIE975/api-codegen-runner/commit/96f4a7339ef23d71776b9ab89c4037bd2a77b473) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - feat: support multiple content-types in request body and response
  - Update default API template to handle multiple content-types (prioritizing application/json)

## 0.3.1

### Patch Changes

- [#5](https://github.com/XSIJIE975/api-codegen-runner/pull/5) [`b094f4e`](https://github.com/XSIJIE975/api-codegen-runner/commit/b094f4e30e5f1e00ea83a34ddd76c6660ea5c140) Thanks [@XSIJIE975](https://github.com/XSIJIE975)! - fix: normalize types and update config generator

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
