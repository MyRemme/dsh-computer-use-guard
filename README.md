# dsh-computer-use-guard

给官方 computer-use（cua-driver）工具族加一道**三档授权闸门**，并把它暴露成一个可见的设置界面。

## 为什么需要它

`@deepseek-ai/dsh-experimental-computer-use-cua-driver-native` 注册 56 个桌面操作工具，
但它的 `tools/execute` 包装只替换 `exec.signal`，**不做任何权限判断**；它的
`Config` 是 `Schema.object({})`，`dsh-settings` 会跳过空 schema，所以 UI 里
完全没有可编辑的表单。结果是：装上即无门，模型可以任意点击、打字、结束进程。

本插件在官方机制之上补齐两件事：

1. 一个**非空的 volatile Config** —— 这正是 harness 为该条目生成可编辑设置表单的条件。
2. 一个真正的 **`tools/pre-execute` 闸门** —— 官方文档化的拦截点
   （`@deepseek-ai/dsh-tools` 在派发工具体之前跑这条 waterfall，
   `{ kind: "deny", reason }` 会阻止工具体执行）。

## 三个档位

每个工具类别一个三档开关：

| 档位 | 行为 |
| --- | --- |
| `deny` 禁止 | 直接拒绝，返回 `ComputerUseGuardDenied` / `COMPUTER_USE_GUARD_DENIED`，工具体永不执行 |
| `ask` 询问 | 弹出审批面板，等你点「允许」才执行 |
| `auto` 自动授权 | 直接放行 |

出厂默认（可在 `cordis.patch.yml` 覆盖，用户层优先级更高）：

| 类别 | 默认 | 覆盖的工具 |
| --- | --- | --- |
| `observe` | `auto` | 20 个只读工具：截图、窗口树、剪贴板读取、驱动诊断 |
| `input` | `auto` | 点击、拖拽、打字、快捷键、滚动 |
| `agentCursor` | `auto` | 屏幕上的代理指针 |
| `window` | `auto` | 激活窗口、调整窗口、启动程序 |
| `browser` | `auto` | 浏览器自动化 |
| `clipboard` | `auto` | 写入系统剪贴板 |
| `recording` | `auto` | 录屏、轨迹录制、会话生命周期 |
| `process` | `deny` | 结束进程 |
| `menu` | `ask` | 调用原生应用菜单项 |
| `replay` | `ask` | 重放已录制的轨迹 |
| `install` | `ask` | 安装外部依赖（例如 ffmpeg） |
| `driver` | `deny` | 改写 cua-driver 自身配置 |
| `unknown` | `deny` | 本闸门不认识的 computer-use 工具 |

两个显式名单优先于类别档位：

- `allowedTools`：非空时**只有**名单内的裸工具名走 `auto`，其余一律 `deny`。
- `deniedTools`：在放行名单之后生效，名单内的裸工具名一律 `deny`。

两者都是逗号分隔的**裸工具名**（不带 `cua_driver_native__` 前缀），例如
`click, type_text, get_window_state`。

## 界面

**设置 → 通用设置 → 电脑操作权限**，位于「权限」行下方。每一类一行，
用原生 `SegmentedControl` 呈现 禁止 / 询问 / 自动授权 三档，改动即时写回。
「精细控制」可展开其余类别。

同一个命名空间也出现在**插件**页（`dsh-settings` 的通用表单），但那里只有
文本框/数字框，三档控件只在上面这一行里。

## 为什么 `ask` 不走 `{ kind: "ask" }`

`dsh-tools` 的 `serviceAsk` 会调用 `ctx.approval.request()`，而该服务的 `decide()`
在本机被 `dsh-purge` 的 `APPROVAL_AUTO_GRANT` 补丁改写为**无条件**
`return "allowed-once"` —— 走那条路永远不会弹面板，审批被静默跳过。

因此 `ask` 档由本插件**自己派发官方 `approval/request` waterfall**：

- 这是 `dsh-tool-cordis` 公开目录里记载的 API（`mode: waterfall`，`this: Scoped<Agent>`）。
- `dsh-api-remotes` 把它转发到浏览器，`@deepseek-ai/dsh-client-ui-approval`
  渲染审批面板，用户点击后把 `allowed-once` / `rejected` 回传。
- 整条链路绕开被改写的 approval 服务。

调用契约（每一条都对应一个真实的运行时校验）：

- 监听器必须是 `function` 表达式，不能是箭头函数 —— 只有非箭头函数才能拿到
  派发时的作用域 carrier 作为 `this`（cordis 会把每个 listener 绑定到 `thisArg`）。
- 用 `ctx.waterfall(this, …)` 而不是 `this.waterfall(…)`：`this` 是裸 carrier，不是 ctx。
- `req.agent` 必须是 `exec.agent` **本身**（同一对象）：`dsh-api-gateway` 校验
  `value.agent === subject`，`dsh-scope` 的 invariant 校验
  `carrierKeyOf(thisArg) === args[0].agent`。
- `signal` 由 gateway 单独取出、不参与 JSON 序列化；其余字段必须是无损 JSON，
  所以可选字段用条件展开，而不是写 `undefined`。
- 兜底 `() => Promise.resolve("unavailable")`，失败关闭：没有浏览器应答时拒绝，
  不会挂起。

## 安装

本包自带 `dsh.bundle.patch`，属于 bundle，在 profile 的 `package.json` 里声明即可挂载：

```json
{
  "dependencies": { "dsh-computer-use-guard": "file:./node_modules/dsh-computer-use-guard" },
  "dsh": { "profile": { "bundles": ["…", "dsh-computer-use-guard"] } }
}
```

加载器行的 `id` 必须等于包名 `dsh-computer-use-guard` —— settings namespace 就是
加载器行的 id。

## 卸载

从 `dsh.profile.bundles` 与 `dependencies` 里移除本包，再删掉
`node_modules/dsh-computer-use-guard` 目录。

## 许可

Apache-2.0
