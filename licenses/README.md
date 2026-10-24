# licenses/ 目录说明

本目录存放**第三方开源组件的协议全文**。组件清单（哪个包、什么版本、什么协议、谁持有版权）在
[`../THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)，两者配套阅读：

- 想知道「本项目用了哪些第三方软件」→ 看 `THIRD-PARTY-NOTICES.md`；
- 想看某个协议的完整条款 → 来本目录找对应文件。

## 存放口径

`pnpm install` 后本仓共解析出 **1589 个唯一包**（实测），逐包放一份协议全文既不现实也无价值。
因此本目录按「**协议种类存一份 + 派生上游各存一份**」组织：

| 文件 | 覆盖范围 |
| --- | --- |
| `MIT-LICENSE` | MIT 协议模板全文。所有 MIT 组件共用这一份，各自的实际版权行见 notices 表格 |
| `Apache-2.0-LICENSE` | Apache License 2.0 全文（uni-app、echarts、livekit-client、图标数据等） |
| `unibest-LICENSE` | 工程骨架上游 [unibest](https://github.com/feige996/unibest) 的 MIT 全文，`Copyright (c) 2025 菲鸽` |
| `yudao-ui-admin-uniapp-LICENSE` | 业务页上游 [yudao-ui-admin-uniapp](https://gitee.com/yudaocode/yudao-ui-admin-uniapp) 的 MIT 全文 |
| `form-create-LICENSE` | [form-create](https://github.com/xaboy/form-create) 的 MIT 全文，`Copyright (c) 2022 xaboy` |
| `wot-design-uni-LICENSE` | UI 库 [@wot-ui/ui](https://github.com/wot-ui/wot-ui) 的 MIT 全文，`Copyright (c) 2023 weisheng` |
| `z-paging-LICENSE` | 分页组件 [z-paging](https://github.com/SmileZXLee/uni-z-paging) 的 MIT 全文，`Copyright (c) 2021 李兆祥` |

三点说明：

1. **`unibest-LICENSE` 与 `yudao-ui-admin-uniapp-LICENSE` 内容逐字节相同**（实测 `diff` 为空）。
   原因是上游芋道移动端本身即派生自 unibest，其 LICENSE 版权行同为 `Copyright (c) 2025 菲鸽`。
   两份都保留是为了让「每个直接上游都能按名字找到协议文件」，不是疏漏。
2. **z-paging 的 npm 包内不含协议文件**（实测包内只有 `changelog.md` / `components` /
   `package.json` / `readme.md` / `types`，`package.json` 也没有 `license` 字段）。
   此处全文取自其上游仓库 `SmileZXLee/uni-z-paging` 的 `LICENSE`。
3. **本目录没有 `yudao-ui-admin-vue3-LICENSE`**，而 Web 仓 `ainb-ui-admin-vue3/licenses/` 有。
   这是对的：Web 端上游是 `yudao-ui-admin-vue3`，**本移动端仓不是**——本仓派生自
   `yudao-ui-admin-uniapp`，不内嵌 Web 端的 `src/lib/form-create` 源码副本。
   两仓的 `licenses/` 与 `THIRD-PARTY-NOTICES.md` **内容不同是应当的**，不要互相对齐成一样。

## 不属于第三方软件的部分

本项目自身构件（`ainb-ui-admin-uniapp` 及其 `src/` 下自研代码）由 `../LICENSE` 以 MIT 授权，
**不是**第三方软件，不出现在 notices 清单里。改名后的包名也不应被补进任何第三方清单。
