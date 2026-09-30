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
- **`launch_app` 与 `kill_app` 的档位倒挂**：`kill_app` 默认 `deny`，而破坏力同级甚至更大的
  `launch_app`（启动任意本地程序，等价于执行本地代码）却被归进默认 `auto` 的 `window` 类别。
  现在独立成 `launch` 类别，默认 `ask`。
- **四个跨出页面边界的浏览器工具被当成普通自动化放行**：`page`（可执行任意页面 JS）、
  `browser_prepare`（附加到用户已登录的浏览器实例）、`browser_set_input_files`（把本地任意
  文件塞进页面上传控件）、`browser_download`（把远端文件落到本地磁盘）此前都在默认 `auto`
  的 `browser` 类别里。现在独立成 `browserPrivileged`，默认 `ask`；`browser` 只保留
  `browser_navigate` / `browser_click` / `browser_type` / `browser_dialog` / `browser_pointer`。
- **`escalate_session` 被默认放行**：它把驱动提升到更高的完整性级别，却因 `session` 类别在
  `FIELD_OF_CATEGORY` 里被映射到 `recording` 字段（默认 `auto`）而自动授权。现在独立成
  `escalate` 类别，默认 `ask`。
- **`recording` 把录屏与「电脑操作会话」混在一个档位**：`start_session` / `end_session` 本身
  不触碰桌面，却和录屏共用同一个开关。现在拆出 `session` 类别（默认 `auto`，与它们实际风险
  相称），`recording` 只负责录屏并收紧为 `ask`。
- **放行名单会让拒绝名单失效**：`allowedTools` 非空时先短路返回，`deniedTools` 再也读不到，
  于是同时写进两张名单的工具会被放行而不是拒绝 —— 用户无法表达「无论如何都拒绝」。现在固定
  为 `deniedTools` → `allowedTools` → 类别档位：拒绝名单是硬否决，先于放行名单求值，与
  README 原先的描述（拒绝在放行之后）相反，README 已同步改正。
- **名单解析大小写敏感**：写 `Click` 与 `click` 会得到不同结果，而工具名本身一律小写，等于
  名单静默失效。现在裸工具名统一折叠大小写，重复项自动去重。
- **名单输入框在提交后会被旧值打回**：`flush` 把 `dirty` 置回 `false`，于是「采纳外部值」的
  副作用立刻以当时的 `props.value`（Host 的回声尚未到达，仍是提交前的旧文本）重跑一遍，
  输入框当场被清回旧值，等回声到了才重新填上 —— 表现为一次可见的闪回，写失败时则永久停在
  错误文本。现在用 `syncedRef` 记住本输入框最后一次真正采纳过的值、`pendingRef` 记住已提交
  但回声未落地的值：回声到达即认领并推进基线；仍是提交前的基线则视为回声未到，不覆盖；出现
  第三个值才当作外部编辑。`flush` 内部另用 `dirtyRef` 判断，不再依赖闭包里可能过期的
  `dirty`。
- **名单输入框在中文输入法下回车会误提交**：候选词确认的回车被当成提交，会在组词中途写入。
  现在先判 `isComposing`。
- **`SegmentedControl` 的 `aria-controls` 指向不存在的面板**：官方契约要求调用方渲染
  `id="${id}-${value}-panel"` 的面板，本插件此前一个都没渲染。现在为当前档位渲染一个视觉
  隐藏的 `role="tabpanel"`。
- **类别文案写死在客户端**：宿主半边改了类别、客户端没改就会显示旧文案（英文界面此前渲染
  的正是中文标题）。现在文案统一走 `t("cat.<字段>.title" / ".desc")`，中英词典各自补齐
  17 组，并补上 `tier.<档位>.note`。
- **写回失败被当成成功**：`faceOf` 的兜底路径对非 `set`、或路径深度不为 1 的操作返回上一个
  Promise 的结果（`true`），调用方以为写入成功便不再重试。现在记录警告并返回 `false`，
  且失败后不再执行后续操作。
- **`tierOf` 的档位回退可能为 `undefined`**：类别新增但漏进 `FIELD_OF_CATEGORY` 时，
  `DEFAULT_TIER[undefined]` 是 `undefined`，`normalizeTier` 会把回退值本身当结果返回。
  现在显式回退到 `unknown` 档位（`deny`），漏分类只会偏严。
- 摘要行在被放行名单覆盖时只报名单，不再显示档位统计；拒绝名单与档位统计并列显示。

### 新增

- 设置行底部增加 **放行名单** 与 **拒绝名单** 两个输入框，可直接编辑 `allowedTools` /
  `deniedTools`，按回车或失焦写入。此前这两项只能在插件页按逗号分隔的原始文本编辑。
- 新增 `launch`、`browserPrivileged`、`session`、`escalate` 四个类别档位，默认档位分别是
  `ask` / `ask` / `auto` / `ask`。

### 变更

- 类别总数 13 → 16，档位字段 13 → 17（含兜底 `unknown`）；默认姿态由「7 自动 / 3 询问 /
  3 禁止」收紧为「7 自动 / 7 询问 / 3 禁止」—— 自动档位数量不变，但换掉了一批不该自动的
  类别（`launch_app`、`page` 等四个浏览器高权限工具、`escalate_session`、录屏）。
- 客户端「精细控制」的分组沿用「默认姿态」这一既有依据（行内七项对应 `auto`），展开区由
  6 项增至 10 项：`launch`、`browserPrivileged`、`recording`、`escalate` 随默认档位收紧一并
  移入。
- README 的档位表补齐到 17 行、修正默认值，重写名单优先级一节，新增「已知取舍」一节说明
  绕开 `serviceAsk` 的代价。
- `@deepseek-ai/schemastery` 从 `dependencies` 移入 `peerDependencies` —— 官方包按插件市场
  规范一律走 peer。
- `dsh.client.inject` 补上 `@deepseek-ai/dsh-client-ui-slots`。
- README 增加两张界面截图（通用设置主行、「精细控制」高级区），并新增 `screenshots.json`
  供插件市场读取。

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
