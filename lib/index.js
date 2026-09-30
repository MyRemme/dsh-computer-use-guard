/**
 * dsh-computer-use-guard — 官方 computer-use 之上的三档授权闸门。
 *
 * 背景：`@deepseek-ai/dsh-experimental-computer-use-cua-driver-native` 注册 56 个
 * 桌面操作工具，它的 `tools/execute` 包装只换 `exec.signal`，不做任何权限判断；
 * 其 `Config` 是 `Schema.object({})`，`dsh-settings` 会跳过它，UI 里没有任何可编辑
 * 表单。本插件在官方机制之上补齐两件事：
 *
 *   1. 一个非空的 volatile Config —— 这正是 harness 为该条目生成可编辑设置表单的
 *      条件；每个类别一个三档叶子：`deny`（禁止）/ `ask`（询问）/ `auto`（自动授权）。
 *   2. 一个真正的 `tools/pre-execute` 闸门 —— 官方文档化的拦截点
 *      (`@deepseek-ai/dsh-tools` 在派发工具体之前跑这条 waterfall，
 *      `{ kind: "deny", reason }` 会阻止工具体执行)。
 *
 * 关于 `ask` 档：**不能**返回 `{ kind: "ask" }`。`dsh-tools` 的 `serviceAsk` 会调用
 * `ctx.approval.request()`，而该服务的 `decide()` 在本机被 `dsh-purge` 的
 * APPROVAL_AUTO_GRANT 补丁改写为无条件 `return "allowed-once"` —— 走那条路永远
 * 不会弹面板。因此 `ask` 档由本插件**自己派发官方 `approval/request` waterfall**：
 * 这是 `dsh-tool-cordis` 公开目录里记载的 API（`mode: waterfall`,
 * `this: Scoped<Agent>`），由 `dsh-api-remotes` 转发到浏览器，
 * `@deepseek-ai/dsh-client-ui-approval` 渲染审批面板，用户点击后把
 * `allowed-once` / `rejected` 回传给本插件。整条链路绕开被改写的 approval 服务。
 *
 * 下方分类表来自真实的 cua-driver 0.28.0 清单 —— `CuaDriver.listToolsJson()`
 * 返回 56 个工具，各带 `capabilities` —— 不是猜测。裸工具名为键，
 * 运行时名字是 `cua_driver_native__<裸名>`。
 *
 * @module dsh-computer-use-guard
 */
import Schema from "@deepseek-ai/schemastery";

/** 注册的工具名形如 `cua_driver_native__${tool.name}`。 */
const TOOL_PREFIX = "cua_driver_native__";
/** 调用被拒时暴露给模型的错误标识。 */
const DENY_NAME = "ComputerUseGuardDenied";
const DENY_CODE = "COMPUTER_USE_GUARD_DENIED";

/** 三个档位。顺序即 UI 从左到右的顺序。 */
const TIERS = ["deny", "ask", "auto"];

/**
 * cua-driver 0.28.0 暴露的全部工具，按本闸门关心的风险类别分组。
 * 类别名经 FIELD_OF_CATEGORY 映射到 Config 字段。
 */
const CATEGORY = {
	// --- observe: 20 个只读工具 (readOnlyHint: true) ------------------------
	list_apps: "observe",
	list_windows: "observe",
	get_window_state: "observe",
	verify_state: "observe",
	debug_window_info: "observe",
	clipboard_read: "observe",
	get_screen_size: "observe",
	get_desktop_state: "observe",
	get_cursor_position: "observe",
	get_agent_cursor_state: "observe",
	check_permissions: "observe",
	health_report: "observe",
	get_config: "observe",
	get_accessibility_tree: "observe",
	zoom: "observe",
	get_browser_state: "observe",
	get_recording_state: "observe",
	get_session: "observe",
	list_sessions: "observe",
	get_session_state: "observe",
	// --- input: 注入桌面的合成鼠标 / 键盘事件 -------------------------------
	click: "input",
	double_click: "input",
	right_click: "input",
	drag: "input",
	type_text: "input",
	press_key: "input",
	hotkey: "input",
	set_value: "input",
	scroll: "input",
	move_cursor: "input",
	// --- cursor: 屏幕上的代理指针 -------------------------------------------
	set_agent_cursor_enabled: "cursor",
	set_agent_cursor_motion: "cursor",
	set_agent_cursor_theme: "cursor",
	// --- window: 提升、缩放、启动窗口 ---------------------------------------
	bring_to_front: "window",
	set_window_frame: "window",
	launch_app: "window",
	// --- process: 结束进程 --------------------------------------------------
	kill_app: "process",
	// --- menu: 调用原生应用菜单项 -------------------------------------------
	invoke_menu: "menu",
	// --- clipboard: 覆写系统剪贴板 ------------------------------------------
	clipboard_write: "clipboard",
	// --- browser: 驱动浏览器标签页 ------------------------------------------
	page: "browser",
	browser_prepare: "browser",
	browser_navigate: "browser",
	browser_click: "browser",
	browser_type: "browser",
	browser_dialog: "browser",
	browser_set_input_files: "browser",
	browser_download: "browser",
	browser_pointer: "browser",
	// --- recording: 录制与会话生命周期 --------------------------------------
	start_recording: "recording",
	stop_recording: "recording",
	replay_trajectory: "replay",
	install_ffmpeg: "install",
	start_session: "session",
	escalate_session: "session",
	end_session: "session",
	// --- driver: 改写 cua-driver 自身的配置 ---------------------------------
	set_config: "driver",
};

/** 类别 → Config 字段名。`session` 与 `recording` 共用同一档位。 */
const FIELD_OF_CATEGORY = {
	observe: "observe",
	input: "input",
	cursor: "agentCursor",
	window: "window",
	process: "process",
	menu: "menu",
	clipboard: "clipboard",
	browser: "browser",
	recording: "recording",
	session: "recording",
	replay: "replay",
	install: "install",
	driver: "driver",
};

/** 类别的人类可读名称，用于拒绝文案与审批面板。 */
const CATEGORY_LABEL = {
	observe: "读取屏幕与窗口状态",
	input: "鼠标与键盘输入",
	cursor: "代理光标",
	window: "窗口激活与缩放",
	process: "结束进程",
	menu: "调用应用菜单",
	clipboard: "写入剪贴板",
	browser: "浏览器自动化",
	recording: "录制与会话",
	session: "录制与会话",
	replay: "轨迹重放",
	install: "安装外部依赖",
	driver: "修改驱动配置",
};

/**
 * 字段 → 默认档位。只读类默认自动授权（否则开局即残废），
 * 破坏性类别默认禁止或询问。这张表同时是「部分 JSON 配置」的降级依据：
 * 探针或手写的补丁行缺字段时，回落到这里记录的姿态而不是静默全拒。
 */
const DEFAULT_TIER = {
	observe: "auto",
	input: "auto",
	agentCursor: "auto",
	window: "auto",
	process: "deny",
	menu: "ask",
	clipboard: "auto",
	browser: "auto",
	recording: "auto",
	replay: "ask",
	install: "ask",
	driver: "deny",
	unknown: "deny",
};

/** 未被分类表覆盖的工具，其档位字段名。 */
const UNKNOWN_FIELD = "unknown";

/**
 * 一个三档叶子。`.volatile()` 必须落在 union 叶子**自身**上：`schemastery` 的
 * `validateVolatileSchema` 禁止 volatile 字段嵌套在另一个 volatile 字段之下，
 * 但允许它出现在固定的对象路径上；而 `dsh-settings` 的 `volatileForm` 只服务
 * 带 `meta.volatile` 的叶子。两者共同要求「叶子自己 volatile，父对象不 volatile」。
 * @param fallback - 该字段的默认档位。
 * @returns 三档 union schema。
 */
const tier = (fallback) => Schema.union(TIERS).default(fallback).volatile();

/**
 * 全部字段都是三档，没有布尔开关 —— 单一模型，单一控件。
 * `allowedTools` / `deniedTools` 是显式名单，优先于类别档位。
 */
const Config = Schema.object({
	/** 读取屏幕、窗口树、剪贴板内容、驱动诊断。 */
	observe: tier(DEFAULT_TIER.observe),
	/** 合成点击、拖拽、输入、快捷键、滚动。 */
	input: tier(DEFAULT_TIER.input),
	/** 屏幕上的代理光标覆盖层。 */
	agentCursor: tier(DEFAULT_TIER.agentCursor),
	/** 提升、移动与启动窗口。 */
	window: tier(DEFAULT_TIER.window),
	/** 结束进程。 */
	process: tier(DEFAULT_TIER.process),
	/** 调用原生应用菜单项。 */
	menu: tier(DEFAULT_TIER.menu),
	/** 覆写系统剪贴板。 */
	clipboard: tier(DEFAULT_TIER.clipboard),
	/** 浏览器自动化工具。 */
	browser: tier(DEFAULT_TIER.browser),
	/** 屏幕录制以及 computer-use 会话生命周期。 */
	recording: tier(DEFAULT_TIER.recording),
	/** 重放已录制的轨迹。 */
	replay: tier(DEFAULT_TIER.replay),
	/** 安装外部依赖，例如 ffmpeg。 */
	install: tier(DEFAULT_TIER.install),
	/** 改写 cua-driver 自身的配置。 */
	driver: tier(DEFAULT_TIER.driver),
	/** 本闸门不认识的 computer-use 工具。 */
	unknown: tier(DEFAULT_TIER.unknown),
	/** 逗号分隔的显式放行名单：非空时只有这些裸名走「自动授权」。 */
	allowedTools: Schema.string().default("").volatile(),
	/** 逗号分隔的显式拒绝名单，在放行名单之后生效。 */
	deniedTools: Schema.string().default("").volatile(),
});

/**
 * 读取一个配置项。cordis 交给插件的 volatile 字段是带 `.get()` 的包装值，
 * 手写的补丁行则可能是普通 JSON —— 两种都要接受。
 * @param node - volatile 包装或普通值。
 * @param fallback - 两者都取不到时的回落值。
 * @returns 当前值或回落值。
 */
function read(node, fallback) {
	if (node !== null && typeof node === "object" && typeof node.get === "function") {
		const value = node.get();
		return value === void 0 ? fallback : value;
	}
	return node === void 0 || node === null ? fallback : node;
}

/**
 * 把任意读到的值收敛到一个合法档位。
 * @param value - 原始值。
 * @param fallback - 非法值时的回落档位。
 * @returns `deny` / `ask` / `auto` 之一。
 */
function normalizeTier(value, fallback) {
	return TIERS.includes(value) ? value : fallback;
}

/**
 * 解析逗号分隔名单。
 * @param text - 用户填写的文本。
 * @returns 去掉空白项后的裸名数组。
 */
function splitList(text) {
	if (typeof text !== "string") return [];
	return text
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/**
 * 判定一次调用落在哪个档位。
 * @param bare - 去掉前缀的裸工具名。
 * @param config - 已解析的插件配置。
 * @returns 该调用的档位。
 */
function tierOf(bare, config) {
	const allow = splitList(read(config.allowedTools, ""));
	if (allow.length > 0) return allow.includes(bare) ? "auto" : "deny";
	const deny = splitList(read(config.deniedTools, ""));
	if (deny.includes(bare)) return "deny";
	const category = CATEGORY[bare];
	const field = category === void 0 ? UNKNOWN_FIELD : FIELD_OF_CATEGORY[category];
	return normalizeTier(read(config[field], DEFAULT_TIER[field]), DEFAULT_TIER[field]);
}

/**
 * 类别的人类可读名称。
 * @param bare - 裸工具名。
 * @returns 类别标签，未分类工具回落为通用文案。
 */
function labelOf(bare) {
	const category = CATEGORY[bare];
	return category === void 0 ? "未分类工具" : CATEGORY_LABEL[category];
}

/**
 * 组装一条拒绝裁决。
 * @param reason - 面向模型的英文/中文原因。
 * @returns `tools/pre-execute` 的 deny 裁决。
 */
function refuse(reason) {
	return {
		kind: "deny",
		reason,
		info: { name: DENY_NAME, code: DENY_CODE, reason },
	};
}

/** 档位为「禁止」时的拒绝文案。 */
function deniedReason(bare, label) {
	return (
		`Computer-use tool "${bare}" (${label}) is denied by dsh-computer-use-guard. ` +
		`Change 设置 → 通用设置 → 电脑操作权限 to 「询问」 or 「自动授权」 to allow it.`
	);
}

/** 档位为「询问」但没有任何授权通道时的拒绝文案。 */
function noChannelReason(bare) {
	return (
		`Computer-use tool "${bare}" requires approval, but the call has no agent to route it through. ` +
		`Set the tier to 「自动授权」 if this call must proceed unattended.`
	);
}

/** 档位为「询问」而用户/通道没有放行时的拒绝文案。 */
function unansweredReason(bare, outcome) {
	const detail =
		outcome === "rejected"
			? "the user rejected this call"
			: outcome === "cancelled"
				? "the approval request was cancelled"
				: "no approval channel answered (the Web page may be closed)";
	return `Computer-use tool "${bare}" was not approved: ${detail}.`;
}

/**
 * 「询问」档：自己派发官方 `approval/request` waterfall。
 *
 * 为什么不是返回 `{ kind: "ask" }`：那条路由经 `dsh-tools` 的 `serviceAsk` →
 * `ctx.approval.request()` → `decide()`，而 `decide()` 在本机被 dsh-purge 的
 * APPROVAL_AUTO_GRANT 补丁改成无条件放行，永远不会弹面板。直接派发这条
 * waterfall 则绕开该服务：`dsh-api-remotes` 把它转发到浏览器，
 * `@deepseek-ai/dsh-client-ui-approval` 渲染审批面板并回传结果。
 *
 * 调用契约（逐条都有出处）：
 *   - `this` 必须是作用域 carrier，且其 key 等于 `req.agent`：cordis 会把每个
 *     listener 绑定到派发时的 `thisArg`（`events.ts` L172–174），而
 *     `dsh-tools` 传的是 `scopeTarget(this, exec.agent)`，所以本监听器内部
 *     `this` 就是那个 carrier。`dsh-scope/lib/invariant.js` L58–65 会校验
 *     `carrierKeyOf(thisArg) === args[0].agent`，`approval/request` 在该表里有解析器。
 *   - 用 `ctx.waterfall(this, …)` 而不是 `this.waterfall(…)`：`this` 是裸 carrier，
 *     不是 ctx。cordis 自身就是这么调的（`lib/index.js` L1346）。
 *   - `req.agent` 必须是 `exec.agent` 本身（同一对象）：`dsh-api-gateway`
 *     L59 要求 `value.agent === subject`。
 *   - `signal` 由 gateway 单独取出，不参与 JSON 序列化（L60–61、L63–67），
 *     其余字段必须是无损 JSON，所以可选字段用条件展开而不是写 `undefined`。
 *   - 兜底 `() => Promise.resolve("unavailable")`：失败关闭。
 *
 * @param carrier - 当前 waterfall 的作用域 carrier（即监听器里的 `this`）。
 * @param ctx - 插件上下文，仅用于取 `waterfall` 混入方法。
 * @param exec - `tools/pre-execute` 的执行描述。
 * @param bare - 裸工具名。
 * @returns 放行时返回 `undefined`，否则返回一条 deny 裁决。
 */
async function askUser(carrier, ctx, exec, bare) {
	const agent = exec.agent;
	if (agent === void 0) return refuse(noChannelReason(bare));
	const label = labelOf(bare);
	let outcome;
	try {
		outcome = await ctx.waterfall(
			carrier,
			"approval/request",
			{
				agent,
				toolName: exec.name,
				...(exec.callId === void 0 ? {} : { callId: exec.callId }),
				reason: `Computer-use tool "${bare}" (${label}) is set to Ask.`,
				displayReason: {
					en: `Computer-use "${label}" is set to Ask. Allow this call to "${bare}"?`,
					zh: `电脑操作「${label}」当前为「询问」。是否允许本次调用「${bare}」？`,
				},
				...(exec.signal === void 0 ? {} : { signal: exec.signal }),
			},
			() => Promise.resolve("unavailable"),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return refuse(`Computer-use tool "${bare}" could not be approved: ${message}`);
	}
	if (outcome === "allowed-once") return void 0;
	return refuse(unansweredReason(bare, outcome));
}

/**
 * 安装闸门与系统提示片段。
 * @param ctx - 插件上下文。
 * @param config - 已解析的插件配置。
 */
function apply(ctx, config) {
	const settings = config ?? {};

	// 必须是 function 表达式：只有非箭头函数才能拿到派发时的 carrier 作为 `this`。
	ctx.on(
		"tools/pre-execute",
		async function (exec, next) {
			const name = exec?.name;
			if (typeof name !== "string" || !name.startsWith(TOOL_PREFIX)) return next();
			const bare = name.slice(TOOL_PREFIX.length);
			const tier = tierOf(bare, settings);
			if (tier === "auto") return next();
			if (tier === "deny") return refuse(deniedReason(bare, labelOf(bare)));
			const verdict = await askUser(this, ctx, exec, bare);
			return verdict === void 0 ? next() : verdict;
		},
		{ prepend: true },
	);

	ctx.systemPrompt.section({
		name: "computer-use:guard",
		order: 110,
		text:
			"Computer-use (cua-driver) calls pass through dsh-computer-use-guard, which grades each tool " +
			"category into one of three tiers: deny, ask, or auto. A denied call returns " +
			`${DENY_NAME} / ${DENY_CODE} and never reaches the desktop; an ask-tier call waits for the ` +
			"user's approval in the conversation composer. Read-only observation is auto-granted by default; " +
			"process termination, driver-config rewrites and unclassified tools are denied by default.",
	});
}

const name = "computer-use-guard";
const inject = ["tools", "systemPrompt"];

export { Config, apply, inject, name };
