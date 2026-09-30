# Changelog

## Unreleased

### 修复

- **设置行在非本机页面下完全不存在**：设置行的注册包在 `configForms.whileServed()` 里，而
  `dsh-client-ui-settings` 的 provider 只在 `ctx.remote.$host.isLoopback` 为真时使用 `host`
  持久化，否则退回 `memory`。`memory` 模式下 `ensure()` / `load()` 立即返回，镜像 store 永远停在
  `status: "unavailable"`、`view: undefined`，`whileServed` 的 `served` 集合为空，注册回调因此
  **一次都不会被调用** —— 行不是渲染成空，而是根本不存在。现在改为直接
  `ctx.slots.inject("settings.general.item", …)`，与官方 `dsh-client-ui-permission-presets`
  的做法一致；设置文档取不到时行内显示原因。
- **`clipboard` 类别名与实际工具名不符**：工具名是 `clipboard_read` / `clipboard_write`，
  类别表却写 `clipboard`，导致这两个工具落进 `unknown` 类别。已改正。
- **`session` 类别是死条目**：`escalate_session` / `end_session` 已归入 `recording`，
  类别表里残留的 `session` 没有任何工具会命中。已删除。
- 摘要行在被显式名单覆盖时仍只报档位统计，会误导用户以为档位生效。现在名单非空时改报实际
  生效的名单。

### 新增

- 设置行底部增加 **放行名单** 与 **拒绝名单** 两个输入框，可直接编辑 `allowedTools` /
  `deniedTools`，按回车或失焦写入。此前这两项只能在插件页按逗号分隔的原始文本编辑。

### 变更

- README 增加两张界面截图（通用设置主行、「精细控制」高级区），并新增
  `screenshots.json` 供插件市场读取。
- README 说明设置文档取不到时该行的表现。

## 0.1.0

首个版本。

- 在官方 `tools/pre-execute` waterfall 上安装三档闸门（`deny` / `ask` / `auto`），
  只拦截 `cua_driver_native__` 前缀的工具调用，其余工具原样透传。
- 13 个类别档位 + 2 个显式名单（`allowedTools` / `deniedTools`），全部为 volatile 字段，
  改动在进程内即时生效，无需重启。
- `ask` 档自行派发官方 `approval/request` waterfall，绕开被改写的 approval 服务，
  由 `@deepseek-ai/dsh-client-ui-approval` 渲染审批面板。
- 客户端半边在 **设置 → 通用设置** 注册「电脑操作权限」行，每类一个
  `SegmentedControl`（禁止 / 询问 / 自动授权），另有「精细控制」折叠区承载更严格的类别。
- 中英双语词典。

