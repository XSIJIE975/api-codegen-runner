---
'api-codegen-runner': minor
---

### Features

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
