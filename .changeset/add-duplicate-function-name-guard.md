---
'api-codegen-runner': minor
---

新增函数名冲突兜底检测（默认报错）

当两个 API 路径仅分隔符不同（如 `/a/resource-detail` 与 `/a/resource/detail`）时，方法名归一化后会坍缩为同一个函数名，此前会静默生成重复的 `export const`，导致 TS 编译错误（Duplicate identifier）。

- **最终函数名唯一性校验**：Transformer 在应用 `methodNameCase` 格式化后，对同一输出文件内的最终函数名做唯一性校验，发现冲突时直接抛出明确错误。错误信息包含：冲突的函数名、各端点的 method + 原始 URL、所在输出文件路径，并附解决方式提示，避免坏代码落盘。
- **依赖升级**：`api-codegen-universal` 升级至 `^0.7.0`，其在 operationId 阶段对归一化冲突自动消歧（冲突端点追加数字后缀），建议同步升级。本检测是 runner 层的最后防线，拦截 `methodNameCase`、自定义模板等本层变换可能引入的残余冲突。

兼容性说明：对未发生冲突的接口，生成结果完全不变；仅原本因冲突而生成坏代码的场景，现在会在生成阶段明确报错。
