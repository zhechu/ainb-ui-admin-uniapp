# Third Party Notices · 第三方开源软件声明

本文件列出 **`ainb-ui-admin-uniapp`（启凌智搭 · 移动端）** 使用的第三方开源软件。
版权归各自权利人所有，各自遵循其原始许可协议。

协议全文统一存放在 [`licenses/`](./licenses/) 目录，其存放口径见
[`licenses/README.md`](./licenses/README.md)。本文件中的每一行都能在该目录里找到对应全文。

> **实测口径**：以下版本号、协议字段、版权行全部取自本仓 `node_modules/<pkg>/package.json`
> 与其随包 `LICENSE` 文件，不是凭记忆填写。传递依赖的协议分布由对 pnpm 虚拟仓库的全量遍历得出。

---

## 1. 本仓库的派生关系

本仓库不是从零写起，而是由两个 MIT 上游叠加而成：

| 来源 | 提供了什么 | 协议 | 版权行 | 协议全文 |
| --- | --- | --- | --- | --- |
| [unibest](https://github.com/feige996/unibest) v4.1.0 | 工程骨架：Vite 配置、约定式路由、UnoCSS、多端构建脚本、`env/` 分环境、eslint/husky/commitlint 工程化 | MIT | `Copyright (c) 2025 菲鸽` | [`licenses/unibest-LICENSE`](./licenses/unibest-LICENSE) |
| [yudao-ui-admin-uniapp](https://gitee.com/yudaocode/yudao-ui-admin-uniapp) | 业务页面底座：`src/pages-*` 各分包、`src/components/yudao-ui/` 组件、`src/http/`、`src/store/` | MIT | `Copyright (c) 2025 菲鸽` | [`licenses/yudao-ui-admin-uniapp-LICENSE`](./licenses/yudao-ui-admin-uniapp-LICENSE) |

两点需要说明：

- **两份协议全文逐字节相同**（实测 `diff` 为空）。上游芋道移动端本身即派生自 unibest，其 LICENSE
  版权行同为 `Copyright (c) 2025 菲鸽`。两份都保留是为了让每个直接上游都能按名字找到协议文件。
- **`src/components/yudao-ui/` 目录名沿用上游未改**。这是刻意保留：该目录被 easycom 规则
  `^yd-(.*)` → `@/components/yudao-ui/yd-$1/yd-$1.vue` 与自动生成的组件类型声明双重引用，
  改名牵连面大且无收益。目录名不代表归属变更——其中源自上游的代码仍按上游 MIT 授权，
  本项目在其上的修改由本仓 `LICENSE` 覆盖。

### 与同产品另外两仓的关系

本仓与后端 [`ainb`](https://gitee.com/enlev/ainb)、Web 管理端
[`ainb-ui-admin-vue3`](https://gitee.com/enlev/ainb-ui-admin-vue3) 同属「启凌智搭」产品，
三仓共用同一套后端接口、权限体系与租户数据。它们是**并列的仓库**，不存在代码派生关系——
本仓**不派生自** `yudao-ui-admin-vue3`，因此本仓 `licenses/` 里也没有它的协议文本
（Web 仓有自己的那份）。两仓的第三方清单**内容不同是应当的**，不要互相对齐成一样。

---

## 2. 随产物分发的运行时依赖

`package.json` 的 `dependencies` 共 31 项，全部会进入构建产物。

### 2.1 Apache License 2.0（18 项）

协议全文：[`licenses/Apache-2.0-LICENSE`](./licenses/Apache-2.0-LICENSE)

| 组件 | 版本 | 版权 / 权利人 | 上游 |
| --- | --- | --- | --- |
| `@dcloudio/uni-app` | 3.0.0-4070620250821001 | DCloud（uni-app 项目） | https://github.com/dcloudio/uni-app |
| `@dcloudio/uni-h5` | 同上 | DCloud | H5 端运行时 |
| `@dcloudio/uni-app-plus` | 同上 | DCloud | App 端运行时 |
| `@dcloudio/uni-app-harmony` | 同上 | DCloud | 鸿蒙端运行时 |
| `@dcloudio/uni-components` | 同上 | DCloud | 内置基础组件 |
| `@dcloudio/uni-quickapp-webview` | 同上 | DCloud | 快应用端 |
| `@dcloudio/uni-mp-weixin` | 同上 | DCloud | 微信小程序端 |
| `@dcloudio/uni-mp-alipay` | 同上 | DCloud | 支付宝小程序端 |
| `@dcloudio/uni-mp-baidu` | 同上 | DCloud | 百度小程序端 |
| `@dcloudio/uni-mp-qq` | 同上 | DCloud | QQ 小程序端 |
| `@dcloudio/uni-mp-toutiao` | 同上 | DCloud | 抖音小程序端 |
| `@dcloudio/uni-mp-kuaishou` | 同上 | DCloud | 快手小程序端 |
| `@dcloudio/uni-mp-jd` | 同上 | DCloud | 京东小程序端 |
| `@dcloudio/uni-mp-lark` | 同上 | DCloud | 飞书小程序端 |
| `@dcloudio/uni-mp-xhs` | 同上 | DCloud | 小红书小程序端 |
| `@dcloudio/uni-mp-harmony` | 同上 | DCloud | 鸿蒙元服务 |
| `echarts` | 5.6.0 | `Copyright 2017-2024 The Apache Software Foundation`（见包内 NOTICE） | https://github.com/apache/echarts |
| `livekit-client` | 2.19.1 | LiveKit \<hello@livekit.io\> | https://github.com/livekit/client-sdk-js |

> - **只有当前构建目标那一端的 `@dcloudio/uni-mp-*` 会真正进入产物**，其余端包虽在
>   `dependencies` 中但不参与该端打包。此处按声明列出以求完整。
> - `@dcloudio/*` 包内的 `LICENSE` 是 Apache-2.0 标准全文，**未附版权行**（实测）；
>   权利人按其仓库归属记为 DCloud。
> - `echarts` 的包内 `LICENSE` 另附一段「Apache ECharts Subcomponents」，声明其源码内嵌了
>   d3.js 的若干片段（BSD-3-Clause）。该附录属 echarts 自身义务，随包保留；本仓引用的
>   `Apache-2.0-LICENSE` 只取协议正文，不含该附录。
> - `livekit-client` 用于音视频实时通话（IM 分包）。

### 2.2 MIT License（13 项）

协议全文：[`licenses/MIT-LICENSE`](./licenses/MIT-LICENSE)（各组件的实际版权行见下表）

| 组件 | 版本 | 版权行（取自包内 LICENSE） | 协议全文单列 |
| --- | --- | --- | --- |
| `@wot-ui/ui` | 2.2.0 | `Copyright (c) 2023 weisheng` | [`wot-design-uni-LICENSE`](./licenses/wot-design-uni-LICENSE) |
| `z-paging` | 2.8.8 | `Copyright (c) 2021 李兆祥` | [`z-paging-LICENSE`](./licenses/z-paging-LICENSE) |
| `vue` | 3.4.21 | `Copyright (c) 2018-present, Yuxi (Evan) You` | — |
| `vue-router` | 4.5.1 | `Copyright (c) 2019-present Eduardo San Martin Morote` | — |
| `vue-i18n` | 9.1.9 | `Copyright (c) 2020 kazuya kawaguchi` | — |
| `pinia` | 2.0.36 | `Copyright (c) 2019-present Eduardo San Martin Morote` | — |
| `pinia-plugin-persistedstate` | 3.2.1 | 作者 prazdevs（包内**无** LICENSE 文件，`package.json` 声明 MIT） | — |
| `dayjs` | 1.11.10 | `Copyright (c) 2018-present, iamkun` | — |
| `crypto-js` | 4.2.0 | `Copyright (c) 2009-2013 Jeff Mott`、`Copyright (c) 2013-2016 Evan Vosberg` | — |
| `jsencrypt` | 3.5.4 | `Copyright (c) 2015 Form.io` | — |
| `markdown-it` | 14.3.0 | `Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.` | — |
| `sval` | 0.6.12 | `Copyright (c) 2018 Siubaak` | — |
| `abortcontroller-polyfill` | 1.7.8 | `Copyright (c) 2017 molsson` | — |

> `z-paging` 的 npm 包内不含协议文件、`package.json` 也无 `license` 字段（实测）。
> 上表版权行取自其上游仓库 `SmileZXLee/uni-z-paging` 的 `LICENSE`，其 readme 的 license
> 徽章同样指向 MIT。

---

## 3. 随产物分发的资源

| 资源 | 来源 | 协议 | 说明 |
| --- | --- | --- | --- |
| Carbon 图标数据 | `@iconify-json/carbon` 1.2.13 | Apache-2.0（IBM 设计，Iconify 打包） | 声明在 `devDependencies`，但 `src/` 中大量使用 `i-carbon-*` 原子类，图标数据经 UnoCSS **编译进 CSS 产物**，因此按「随产物分发」处理。全文见 [`licenses/Apache-2.0-LICENSE`](./licenses/Apache-2.0-LICENSE) |
| `wd-icons` 图标字体 | `@wot-ui/ui` 随包 `components/wd-icon/iconfont.ttf`（实测 52 KB） | MIT（随 wot-ui） | 见 [`licenses/wot-design-uni-LICENSE`](./licenses/wot-design-uni-LICENSE)。**注意分端行为不同**：`iconfont.scss` 里 H5 与 App 端引用随包的本地 `iconfont.ttf`，其余端（各小程序）改为运行时从 `https://at.alicdn.com`（阿里巴巴 iconfont，Project id 5024693）加载。后者是第三方 CDN 服务而非本仓分发的软件，小程序端需将其加入域名白名单 |

### 3.1 form-create 的归属（与 Web 仓口径不同，请勿照搬）

Web 管理端 `ainb-ui-admin-vue3` **内嵌** form-create 与 form-create-designer 的源码副本
（`src/lib/form-create`、`src/lib/form-designer`，要求与上游零 diff）。

**本移动端仓库不内嵌任何 form-create 源码，也不集成设计器**（本仓没有 `src/lib/` 目录）。
`src/pages-bpm/components/form-create/` 是 form-create **规则模型（rule model）的独立
uni-app / TypeScript 实现**——沿用其 JSON Schema 与 API 概念（`packages/{core,utils,wot-ui}`，
渲染目标是 wot-design-uni 而非 Element Plus），实测其中无上游源码拷贝、无上游版权头。

即便如此，由于概念与规则格式源自 form-create（MIT，`Copyright (c) 2022 xaboy`，
https://github.com/xaboy/form-create ），本仓仍保留其协议全文
[`licenses/form-create-LICENSE`](./licenses/form-create-LICENSE) 并在此署名。

### 3.2 第三方服务（不是软件，不随产物分发）

| 服务 | 用途 | 说明 |
| --- | --- | --- |
| 百度地图 JS API | `src/pages-statistics/iot/home/index.vue` 的 IoT 设备地图 | **运行时通过 script 动态加载**外部 SDK，密钥来自 `VITE_BAIDU_MAP_KEY`。其条款由百度地图开放平台约定，不属本清单的开源软件范畴；使用前需自行申请密钥并遵守其服务协议 |
| 各小程序平台运行时 | 微信 / 支付宝 / 抖音等平台 | 由平台自身提供，不由本仓分发 |

---

## 4. 仅构建期、不随产物分发的依赖

`devDependencies` 共 **52 项**，只在开发机与 CI 上运行，**不进入任何端的构建产物**，
因此不构成对外分发。绝大多数为 MIT，另有 Apache-2.0（`typescript`、`@dcloudio/types`、
`@dcloudio/uni-cli-shared`、`@dcloudio/vite-plugin-uni`、`@dcloudio/uni-automator`、
`@dcloudio/uni-stacktracey`）与 ISC（`picocolors`）。

**完整清单以 `package.json` 的 `devDependencies` 字段为权威口径**，本节只列出主要几项：

| 组件 | 协议 | 用途 |
| --- | --- | --- |
| `vite` 5.2.8 | MIT | 构建工具 |
| `@dcloudio/vite-plugin-uni`、`@dcloudio/uni-cli-shared` 等 | Apache-2.0 | uni-app 编译链 |
| `typescript` 5.8.3 | Apache-2.0 | 类型检查 |
| `unocss` 66.0.0 | MIT | 原子化 CSS（`Copyright (c) 2021-PRESENT Anthony Fu`） |
| `sass` 1.100.0 | MIT | 样式编译 |
| `eslint` 9.34.0、`@uni-helper/eslint-config`、`husky`、`lint-staged`、`@commitlint/*` | MIT | 代码规范 |
| `vue-tsc` 3.0.6 | MIT | 类型检查入口 |
| `miniprogram-ci` 2.1.26 | MIT | 微信小程序上传（`scripts/upload-weixin.js` 调用） |
| `@uni-helper/*`（uni-pages / uni-layouts / uni-components / uni-manifest 等 10 项） | MIT | 约定式路由与自动化 |
| `rollup-plugin-visualizer`、`@uni-ku/bundle-optimizer`、`autoprefixer`、`postcss` | MIT | 构建辅助 |

---

## 5. 传递依赖口径

`pnpm install` 后本仓共解析出 **1589 个唯一包**（对 pnpm 虚拟仓库全量遍历实测）。
协议分布：

| 协议 | 包数 |
| --- | --- |
| MIT | 1348 |
| Apache-2.0 | 79 |
| ISC | 69 |
| BSD-3-Clause | 38 |
| BSD-2-Clause | 25 |
| Unlicense | 3 |
| CC0-1.0 | 3 |
| 其他宽松协议或其组合（`0BSD` / `Python-2.0` / `MIT AND Zlib` / `(MIT OR Apache-2.0)` 等） | 11 |
| CC-BY 系**数据**协议（`caniuse-lite` = CC-BY-4.0、`spdx-exceptions` = CC-BY-3.0） | 2 |
| `license` 字段是对象而非字符串（`ansi-wrap`、`config-chain`，两者实为 MIT） | 2 |
| `package.json` 未声明 `license` 字段 | 9 |
| **合计** | **1589** |

**结论：不存在 GPL / AGPL / LGPL / SSPL 等强 copyleft 组件**，与本项目以 MIT 发布不冲突。

需要逐条点名的四处（都不是阻断项，但合规审查会问）：

1. **`jszip` 3.10.1** 声明为 `(MIT OR GPL-3.0-or-later)` 双许可 ——
   **本项目选择 MIT 分支**。且它只经 `miniprogram-ci`（`devDependencies`，构建期上传工具）
   引入，**不进入产物**，双重不阻断。
2. **`json-schema` 0.4.0** 声明为 `(AFL-2.1 OR BSD-3-Clause)` 双许可 ——
   **本项目选择 BSD-3-Clause 分支**。它经 `jsprim` → `miniprogram-ci` 引入，同样只在构建期。
3. **`caniuse-lite`** 的数据部分为 **CC-BY-4.0**，经 `autoprefixer` / `browserslist` 引入，
   仅构建期使用；其数据不随产物分发。
4. **`spdx-exceptions`** 为 **CC-BY-3.0** 的构建期数据（协议名清单），同样不进产物。

`package.json` 未声明 `license` 字段的 9 个包为：`dom-walk`、`exif-parser`、`exit`、`format`、
`min-document`、`node-bitmap`、`qrcode-terminal`、`replace-ext`、`z-paging`。
其中前 8 个均为构建期或工具链的传递依赖，不进产物；`z-paging` 见第 2.2 节注。

---

## 6. MIT 兼容性声明

本项目以 **MIT** 协议发布（见 [`LICENSE`](./LICENSE)），但 **MIT 授权只覆盖本项目自己的代码，
不覆盖上述第三方组件**。第三方组件一律按其原始协议授权：

- MIT 组件：保留其版权行与许可声明即可，本清单已履行该义务；
- Apache-2.0 组件（uni-app 全家桶、echarts、livekit-client、Carbon 图标数据）：
  按其第 4 条履行归属义务，并在改动文件时作出修改说明；Apache-2.0 与 MIT 单向兼容，
  组合分发合法，但 Apache-2.0 组件**不会**因此变成 MIT；
- 任何再分发（含二次开发后对外发布）都应连同本文件与 `licenses/` 目录一起分发。

---

## 7. 本项目自身构件不是第三方软件

`ainb-ui-admin-uniapp` 自身代码（`src/` 下的自研页面与组件、`src/pages-bpm/components/form-create/`
的独立实现、`vite-plugins/`、`scripts/`）由本仓 `LICENSE` 以 MIT 授权，**不属于第三方软件**，
不出现在上述任何清单中。

同理：上游 `yudao` / `unibest` 的包名与署名在本仓中部分保留（如 `package.json` 的
`unibest-version`、`yudao-version`、`unibest-update-time` 三个键，用于记录上游合并基线），
**不要**按改名后的名字把本项目构件反向补进第三方清单。
