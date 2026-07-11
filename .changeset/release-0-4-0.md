---
'api-codegen-runner': minor
---

feat: 改进多 content-type 支持，新增 isPending 机制

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
