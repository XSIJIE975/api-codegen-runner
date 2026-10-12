---
'api-codegen-runner': minor
---

## 全库审计修复、CLI 改进与上游依赖升级

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
