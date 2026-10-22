---
'api-codegen-runner': minor
---

升级 `api-codegen-universal` 至 `^0.9.0`，支持通过 `requestConfig.codeGeneration.typeNamePrefix` 为生成的类型统一添加项目前缀。

同一仓库中多个项目分别输出全局 `declare` 类型时，可通过该选项隔离同名类型：例如 `User` 会生成为 `DemoUser`，`$ref` 引用和 `.d.ts` 文件名也会同步带上前缀。该选项为 opt-in，不配置时生成结果保持不变；使用前需确保 `api-codegen-universal >= 0.9.0`。
