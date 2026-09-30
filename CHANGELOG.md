# Changelog

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
