window.__ModuleLoader__.load({
	id: "dsh-computer-use-guard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");
		var primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region styles
		// Mirrors PermissionRow.module.css so this row sits flush under 权限.
		var css = "" +
			".cug_row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}" +
			".cug_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}" +
			".cug_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}" +
			".cug_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}" +
			".cug_descError{color:var(--dsw-alias-state-error-primary)}" +
			".cug_panel{border-bottom:.5px solid var(--dsw-alias-border-l2);padding:4px 0 16px}" +
			".cug_toggle{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;font:inherit;align-items:center;gap:6px;padding:4px 0;font-size:12px;line-height:18px;display:inline-flex}" +
			".cug_toggle:hover{color:var(--dsw-alias-label-primary)}" +
			".cug_toggle svg{width:12px;height:12px;transition:transform .15s}" +
			".cug_toggleOpen svg{transform:rotate(180deg)}" +
			".cug_item{align-items:center;gap:24px;padding:10px 0;display:flex}" +
			".cug_itemText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}" +
			".cug_itemTitle{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}" +
			".cug_itemDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}" +
			".cug_seg{flex:none;width:252px}" +
			".cug_advanced{border-top:.5px solid var(--dsw-alias-border-l2);margin-top:6px;padding-top:10px}" +
			".cug_advancedTitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px;margin-bottom:2px}" +
			".cug_lists{border-top:.5px solid var(--dsw-alias-border-l2);margin-top:10px;padding-top:10px;flex-direction:column;gap:10px;display:flex}" +
			".cug_listField{flex-direction:column;gap:4px;display:flex}" +
			".cug_listLabel{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}" +
			".cug_input{width:100%}" +
			".cug_listHint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}" +
			".cug_srOnly{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}";
		var tagId = "dsh-computer-use-guard/ComputerUseRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-computer-use-guard";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region model
		/** Dictionary namespace owned by this plugin. */
		var NS = "dsh-computer-use-guard";

		/** The three tiers, in the order the segmented control renders them. */
		var TIERS = ["deny", "ask", "auto"];

		/**
		 * The graded fields, in the order they render. Each entry is a Config
		 * field name plus the dictionary key prefix that supplies its title and
		 * description — the same partition the host half's `tierOf()` enforces.
		 *
		 * Titles and descriptions are NOT inlined here: they live in the `zh`/`en`
		 * dictionaries below and are read through `t()`, so an English page does
		 * not render Chinese copy. `field` is the dictionary suffix too, so the
		 * keys are `cat.<field>.title` / `cat.<field>.desc`.
		 *
		 * The split is by *default posture*, not by importance: everything in
		 * `CATEGORIES` defaults to auto-grant and everything in `ADVANCED`
		 * defaults to ask or deny, which is what the disclosure's label claims.
		 */
		var CATEGORIES = [
			{ field: "observe" },
			{ field: "input" },
			{ field: "agentCursor" },
			{ field: "window" },
			{ field: "clipboard" },
			{ field: "browser" },
			{ field: "session" }
		];

		/** Fields that stay behind the 高级 disclosure — stricter by default. */
		var ADVANCED = [
			{ field: "launch" },
			{ field: "browserPrivileged" },
			{ field: "recording" },
			{ field: "escalate" },
			{ field: "process" },
			{ field: "menu" },
			{ field: "replay" },
			{ field: "install" },
			{ field: "driver" },
			{ field: "unknown" }
		];

		/** Every graded field, main categories first. */
		var ALL_ITEMS = CATEGORIES.concat(ADVANCED);

		/**
		 * Field → the tier the host half falls back to. Kept in lockstep with
		 * `DEFAULT_TIER` in lib/index.js so the row shows the same posture the
		 * gate actually enforces before the first write lands.
		 */
		var DEFAULT_TIER = {
			observe: "auto",
			input: "auto",
			agentCursor: "auto",
			window: "auto",
			clipboard: "auto",
			browser: "auto",
			session: "auto",
			launch: "ask",
			browserPrivileged: "ask",
			recording: "ask",
			escalate: "ask",
			process: "deny",
			menu: "ask",
			replay: "ask",
			install: "ask",
			driver: "deny",
			unknown: "deny"
		};

		/**
		 * Read one tier defensively — the snapshot may still be loading, and a
		 * hand-written patch row may carry a value outside the three tiers.
		 * @param value - the decoded Config value, or undefined while loading.
		 * @param field - field name.
		 * @returns one of TIERS.
		 */
		function tierOf(value, field) {
			var fallback = DEFAULT_TIER[field];
			if (value === void 0 || value === null) return fallback;
			var raw = value[field];
			return TIERS.indexOf(raw) >= 0 ? raw : fallback;
		}

		/**
		 * Parse one comma-separated tool list the same way the host half does:
		 * trimmed, lower-cased and de-duplicated, so the count this row reports
		 * matches the number of names the gate actually honours.
		 * @param text - the raw Config string.
		 * @returns the distinct bare tool names, blank entries dropped.
		 */
		function splitList(text) {
			if (typeof text !== "string") return [];
			var seen = {};
			var out = [];
			var parts = text.split(",");
			for (var i = 0; i < parts.length; i += 1) {
				var name = parts[i].trim().toLowerCase();
				if (name.length === 0 || seen[name] === true) continue;
				seen[name] = true;
				out.push(name);
			}
			return out;
		}

		/**
		 * Read both explicit lists. They sit in the same Config document, so the
		 * row can state the posture that is actually enforced instead of the
		 * tier tally the lists override.
		 * @param value - the decoded Config value, or undefined while loading.
		 * @returns the parsed lists plus the raw text each input should show.
		 */
		function listsOf(value) {
			var raw = value === void 0 || value === null ? {} : value;
			var allowText = typeof raw.allowedTools === "string" ? raw.allowedTools : "";
			var denyText = typeof raw.deniedTools === "string" ? raw.deniedTools : "";
			return { allow: splitList(allowText), deny: splitList(denyText), allowText: allowText, denyText: denyText };
		}

		/**
		 * Count how many graded fields sit in each tier.
		 * @param value - the decoded Config value.
		 * @returns a tally keyed by tier.
		 */
		function tallyOf(value) {
			var tally = { deny: 0, ask: 0, auto: 0 };
			for (var i = 0; i < ALL_ITEMS.length; i += 1) {
				tally[tierOf(value, ALL_ITEMS[i].field)] += 1;
			}
			return tally;
		}
		//#endregion

		//#region components
		/**
		 * Render one category as a three-tier segmented row.
		 *
		 * `SegmentedControl` advertises `aria-controls="${id}-${value}-panel"` on
		 * every tab, so each tier needs a matching panel element or the reference
		 * dangles. Only the selected tier's panel is mounted, which is the same
		 * pattern the built-in `settings-models` section uses.
		 * @param props - spec, current tier, writer and localized copy.
		 * @returns the item row.
		 */
		function Item(props) {
			var spec = props.spec;
			var t = props.t;
			var disabled = props.disabled;
			var options = TIERS.map(function (value) {
				return { value: value, label: t("tier." + value), title: t("tier." + value) };
			});
			var title = t("cat." + spec.field + ".title");
			var panelId = "cug-" + spec.field + "-" + props.value + "-panel";
			return React.createElement(
				"div",
				{ className: "cug_item" },
				React.createElement(
					"div",
					{ className: "cug_itemText" },
					React.createElement("div", { className: "cug_itemTitle" }, title),
					React.createElement("div", { className: "cug_itemDesc" }, t("cat." + spec.field + ".desc"))
				),
				React.createElement(primitives.SegmentedControl, {
					id: "cug-" + spec.field,
					value: props.value,
					options: options,
					label: title,
					disabled: disabled,
					className: "cug_seg",
					onChange: function (next) { props.onChange(spec.field, next); }
				}),
				React.createElement(
					"div",
					{ className: "cug_srOnly", id: panelId, role: "tabpanel", "aria-label": title },
					t("tier." + props.value + ".note")
				)
			);
		}

		/**
		 * One comma-separated tool list.
		 *
		 * The section's generic Config fields are text/number only, and the Plugins
		 * page renders them as raw JSON, so the guard owns these two inputs here.
		 * They are load-bearing: a non-empty `allowedTools` turns into a whitelist
		 * that overrides every tier above, so an invisible list is how a user ends
		 * up staring at 「自动授权」 while the calls keep getting denied.
		 * @param props - field name, current value, commit sink and copy.
		 * @returns the labelled input.
		 */
		function ListField(props) {
			var t = props.t;
			var draftState = React.useState(props.value);
			var draft = draftState[0];
			var setDraft = draftState[1];
			var dirtyState = React.useState(false);
			var dirty = dirtyState[0];
			var setDirty = dirtyState[1];
			// Read inside `flush` without making it depend on `dirty`: `flush`
			// runs from a blur/Enter handler that may predate the last external
			// update, so a `dirty === true` captured in that closure is not a
			// reliable "the user edited something" signal.
			var dirtyRef = React.useRef(false);
			// The last `props.value` this input actually adopted from the Host.
			var syncedRef = React.useRef(props.value);
			// The value handed to `onCommit` whose echo has not arrived yet, or
			// `undefined` when nothing is in flight. `undefined` rather than
			// `null` so an uninitialised ref reads as "nothing in flight".
			var pendingRef = React.useRef(void 0);

			// Adopt an external change (another surface, or the Host echoing our own
			// write back) unless the user is mid-edit in this very field.
			//
			// The echo of our own commit lands a render later, so naively adopting
			// every incoming prop reverts the field to the pre-commit text for one
			// frame. While a commit is in flight, only a value that is neither the
			// echo nor the pre-commit baseline is treated as an external edit.
			React.useEffect(function () {
				if (dirty) return;
				var incoming = props.value;
				if (pendingRef.current !== void 0) {
					if (incoming === pendingRef.current) {
						pendingRef.current = void 0;
						syncedRef.current = incoming;
						return;
					}
					// Still the pre-commit value: the echo has not landed yet.
					if (incoming === syncedRef.current) return;
					// A third value — the write failed and something else moved it.
					pendingRef.current = void 0;
				}
				if (incoming === syncedRef.current) return;
				syncedRef.current = incoming;
				setDraft(incoming);
			}, [props.value, dirty]);

			var flush = function () {
				// Re-check against the live ref: `flush` runs from a blur/Enter
				// handler that may predate the last external update, so a
				// captured `dirty` is not a reliable "the user edited" signal.
				if (!dirtyRef.current) return;
				dirtyRef.current = false;
				setDirty(false);
				// Nothing to send when the text is already what the Host has —
				// the user typed and then undid it.
				if (draft === syncedRef.current) return;
				// Mark the outgoing value as in flight so the echo of this very
				// write is not mistaken for an external edit. A write that fails
				// leaves `props.value` at the pre-commit text, which the effect
				// above also recognises, so the input keeps showing what the user
				// typed instead of silently reverting.
				pendingRef.current = draft;
				props.onCommit(props.field, draft);
			};

			return React.createElement(
				"div",
				{ className: "cug_listField" },
				React.createElement("div", { className: "cug_listLabel" }, t(props.labelKey)),
				React.createElement(primitives.Input, {
					className: "cug_input",
					value: draft,
					placeholder: t(props.placeholderKey),
					disabled: props.disabled,
					spellCheck: false,
					autoComplete: "off",
					onChange: function (event) {
						dirtyRef.current = true;
						setDirty(true);
						setDraft(event.target.value);
					},
					onBlur: flush,
					onKeyDown: function (event) {
						if (event.key !== "Enter") return;
						// An IME candidate window commits with Enter; treating that
						// as "save" would fire a write mid-composition.
						if (event.nativeEvent !== void 0 && event.nativeEvent.isComposing === true) return;
						event.preventDefault();
						flush();
					}
				}),
				React.createElement("div", { className: "cug_listHint" }, t(props.hintKey))
			);
		}

		/**
		 * The 通用设置 preference row for computer-use.
		 *
		 * The section supplies no props beyond the injected face, so this row owns
		 * its label, its current values and its write path.
		 * @param props - injected controller face plus localized copy.
		 * @returns the row, or a read-only notice when this page holds no Host
		 *   settings document (a non-loopback page keeps settings process-local).
		 */
		function ComputerUseRow(props) {
			var state = props.useComputerUseGuard(function (snapshot) { return snapshot; });
			var advancedState = React.useState(false);
			var advanced = advancedState[0];
			var setAdvanced = advancedState[1];
			var busyState = React.useState(false);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var failedState = React.useState(false);
			var failed = failedState[0];
			var setFailed = failedState[1];
			var t = props.t;

			React.useEffect(function () { props.load(); }, [props.load]);

			// No settings document is reachable here. Two distinct causes share the
			// `unavailable` status, and the store's `mode` tells them apart: a
			// non-loopback page keeps the section process-local (`memory`), while a
			// loopback page whose Host does not serve this namespace stays in
			// `host`. Hiding the row in either case made the switch look deleted,
			// so state the posture instead.
			if (state.status === "unavailable") {
				return React.createElement(
					"div",
					{ className: "cug_row" },
					React.createElement(
						"div",
						{ className: "cug_rowText" },
						React.createElement("div", { className: "cug_title" }, t("title")),
						React.createElement("div", { className: "cug_desc" }, t(state.mode === "memory" ? "remote" : "absent"))
					)
				);
			}

			var value = state.value;
			var loading = state.status === "loading";
			var disabled = busy || loading || !state.writable;
			var tally = tallyOf(value);
			var lists = listsOf(value);

			/**
			 * Commit one Config operation.
			 * @param field - Config field name.
			 * @param next - the new field value.
			 */
			var commit = function (field, next) {
				setFailed(false);
				setBusy(true);
				Promise.resolve(props.write([{ op: "set", path: [field], value: next }])).then(function (ok) {
					if (ok === false) setFailed(true);
				}).catch(function () { setFailed(true); }).then(function () { setBusy(false); });
			};

			// Two different units live here and must stay labelled: the tally
			// counts *fields*, the list counts count *tools*. A non-empty
			// allowlist makes every tier inert, so it replaces the tally; a
			// denylist only vetoes individual tools and the tiers still govern
			// everything else, so it is shown alongside.
			var summary = t("summary", { deny: tally.deny, ask: tally.ask, auto: tally.auto });
			if (lists.allow.length > 0) summary = t("allowActive", { n: lists.allow.length });
			else if (lists.deny.length > 0) summary = t("denyActive", { n: lists.deny.length }) + " · " + summary;

			var header = React.createElement(
				"div",
				{ className: "cug_row" },
				React.createElement(
					"div",
					{ className: "cug_rowText" },
					React.createElement("div", { className: "cug_title" }, t("title")),
					React.createElement(
						"div",
						{ className: failed ? "cug_desc cug_descError" : "cug_desc", role: failed ? "alert" : void 0 },
						failed
							? t("error")
							: loading
								? t("loading")
								: summary
					)
				)
			);

			var renderItem = function (spec) {
				return React.createElement(Item, {
					key: spec.field,
					spec: spec,
					t: t,
					value: tierOf(value, spec.field),
					disabled: disabled,
					onChange: commit
				});
			};

			var toggle = React.createElement(
				"button",
				{
					type: "button",
					className: advanced ? "cug_toggle cug_toggleOpen" : "cug_toggle",
					"aria-expanded": advanced,
					onClick: function () { setAdvanced(function (v) { return !v; }); }
				},
				t("fine"),
				React.createElement(primitives.IconChevronDownOutlineRegular, {})
			);

			var advancedItems = advanced ? React.createElement(
				"div",
				{ className: "cug_advanced" },
				React.createElement("div", { className: "cug_advancedTitle" }, t("advancedTitle")),
				ADVANCED.map(renderItem)
			) : null;

			var listFields = React.createElement(
				"div",
				{ className: "cug_lists" },
				React.createElement(ListField, {
					key: "allowedTools",
					field: "allowedTools",
					labelKey: "allowLabel",
					placeholderKey: "allowPlaceholder",
					hintKey: "allowHint",
					value: lists.allowText,
					disabled: disabled,
					t: t,
					onCommit: commit
				}),
				React.createElement(ListField, {
					key: "deniedTools",
					field: "deniedTools",
					labelKey: "denyLabel",
					placeholderKey: "denyPlaceholder",
					hintKey: "denyHint",
					value: lists.denyText,
					disabled: disabled,
					t: t,
					onCommit: commit
				})
			);

			var panel = React.createElement(
				"div",
				{ className: "cug_panel" },
				React.createElement("div", { className: "cug_advancedTitle" }, t("fineTitle")),
				CATEGORIES.map(renderItem),
				toggle,
				advancedItems,
				listFields
			);

			return React.createElement(React.Fragment, null, header, panel);
		}
		//#endregion

		//#region locales
		var zh = {
			"title": "电脑操作权限",
			"fine": "精细控制",
			"fineTitle": "按类型设置档位",
			"advancedTitle": "高级（默认更严格）",
			"loading": "读取中…",
			"error": "保存失败，请重试",
			"summary": "禁止 {deny} 类 · 询问 {ask} 类 · 自动授权 {auto} 类",
			"remote": "当前页面不是本机页面，读取不到设置文档；请在桌面端窗口里调整。",
			"absent": "Host 没有提供 dsh-computer-use-guard 的设置命名空间，请先确认插件已启用。",
			"allowActive": "放行名单已启用：只有名单内的 {n} 个工具会放行，其余全部禁止。",
			"denyActive": "拒绝名单已生效（{n} 个工具）",
			"allowLabel": "放行名单",
			"allowHint": "非空时只放行名单内的工具，其余一律禁止，上方的档位不再生效。",
			"allowPlaceholder": "例如 click, type_text, get_window_state",
			"denyLabel": "拒绝名单",
			"denyHint": "先于放行名单判定，命中即禁止，不受上方档位影响。",
			"denyPlaceholder": "例如 kill_app, install_ffmpeg",
			"tier.deny": "禁止",
			"tier.ask": "询问",
			"tier.auto": "自动授权",
			"tier.deny.note": "直接拒绝，调用不会到达桌面。",
			"tier.ask.note": "每次调用都在对话里等待你确认。",
			"tier.auto.note": "直接放行，不再询问。",
			"cat.observe.title": "读取屏幕与窗口",
			"cat.observe.desc": "截图、窗口树、剪贴板读取、驱动诊断",
			"cat.input.title": "鼠标与键盘输入",
			"cat.input.desc": "点击、拖拽、打字、快捷键、滚动",
			"cat.agentCursor.title": "代理光标",
			"cat.agentCursor.desc": "屏幕上的代理指针外观与动画",
			"cat.window.title": "窗口激活与缩放",
			"cat.window.desc": "把窗口提到前台、改写窗口位置与尺寸",
			"cat.clipboard.title": "写入剪贴板",
			"cat.clipboard.desc": "覆盖系统剪贴板内容",
			"cat.browser.title": "浏览器自动化",
			"cat.browser.desc": "在标签页内导航、点击、输入、滚动",
			"cat.session.title": "电脑操作会话",
			"cat.session.desc": "创建与结束会话，本身不触碰桌面",
			"cat.launch.title": "启动应用",
			"cat.launch.desc": "启动任意本地程序",
			"cat.browserPrivileged.title": "浏览器高权限操作",
			"cat.browserPrivileged.desc": "附加用户浏览器、上传下载本地文件、执行页面脚本",
			"cat.recording.title": "屏幕录制",
			"cat.recording.desc": "把屏幕录成视频",
			"cat.escalate.title": "提升驱动权限",
			"cat.escalate.desc": "把驱动提升到更高的完整性级别",
			"cat.process.title": "结束进程",
			"cat.process.desc": "终止任意进程",
			"cat.menu.title": "调用应用菜单",
			"cat.menu.desc": "触发原生应用菜单项",
			"cat.replay.title": "轨迹重放",
			"cat.replay.desc": "重放已录制的操作轨迹",
			"cat.install.title": "安装外部依赖",
			"cat.install.desc": "例如安装 ffmpeg",
			"cat.driver.title": "修改驱动配置",
			"cat.driver.desc": "改写 cua-driver 自身配置",
			"cat.unknown.title": "未分类工具",
			"cat.unknown.desc": "本闸门不认识的电脑操作工具"
		};
		var en = {
			"title": "Computer-use permission",
			"fine": "Fine-grained control",
			"fineTitle": "Set a tier per category",
			"advancedTitle": "Advanced (stricter by default)",
			"loading": "Loading…",
			"error": "Could not save. Please try again.",
			"summary": "{deny} denied · {ask} ask · {auto} auto-granted",
			"remote": "This page is not the desktop page, so no settings document is reachable here. Adjust it in the desktop window.",
			"absent": "The Host does not serve the dsh-computer-use-guard settings namespace. Check that the plugin is enabled.",
			"allowActive": "Allowlist active: only the {n} listed tools pass; everything else is denied.",
			"denyActive": "Denylist active ({n} tools)",
			"allowLabel": "Allowlist",
			"allowHint": "While non-empty, only the listed tools pass and every tier above is ignored.",
			"allowPlaceholder": "e.g. click, type_text, get_window_state",
			"denyLabel": "Denylist",
			"denyHint": "Evaluated before the allowlist; a hit is denied regardless of the tiers above.",
			"denyPlaceholder": "e.g. kill_app, install_ffmpeg",
			"tier.deny": "Deny",
			"tier.ask": "Ask",
			"tier.auto": "Auto-grant",
			"tier.deny.note": "Denied outright; the call never reaches the desktop.",
			"tier.ask.note": "Every call waits for your confirmation in the conversation.",
			"tier.auto.note": "Runs without asking.",
			"cat.observe.title": "Read screen and windows",
			"cat.observe.desc": "Screenshots, window trees, clipboard reads, driver diagnostics",
			"cat.input.title": "Mouse and keyboard input",
			"cat.input.desc": "Clicking, dragging, typing, hotkeys, scrolling",
			"cat.agentCursor.title": "Agent cursor",
			"cat.agentCursor.desc": "Appearance and motion of the on-screen agent pointer",
			"cat.window.title": "Window activation and sizing",
			"cat.window.desc": "Raise a window, rewrite its position and size",
			"cat.clipboard.title": "Write to clipboard",
			"cat.clipboard.desc": "Overwrite the system clipboard",
			"cat.browser.title": "Browser automation",
			"cat.browser.desc": "Navigate, click, type and scroll inside a tab",
			"cat.session.title": "Computer-use sessions",
			"cat.session.desc": "Create and end a session; touches no desktop itself",
			"cat.launch.title": "Launch applications",
			"cat.launch.desc": "Start any local program",
			"cat.browserPrivileged.title": "Privileged browser actions",
			"cat.browserPrivileged.desc": "Attach to your browser, upload and download local files, run page scripts",
			"cat.recording.title": "Screen recording",
			"cat.recording.desc": "Record the screen to a video file",
			"cat.escalate.title": "Escalate driver privileges",
			"cat.escalate.desc": "Raise the driver to a higher integrity level",
			"cat.process.title": "Terminate processes",
			"cat.process.desc": "Kill any process",
			"cat.menu.title": "Invoke application menus",
			"cat.menu.desc": "Trigger a native application menu item",
			"cat.replay.title": "Trajectory replay",
			"cat.replay.desc": "Replay a recorded action trajectory",
			"cat.install.title": "Install external dependencies",
			"cat.install.desc": "For example, installing ffmpeg",
			"cat.driver.title": "Rewrite driver configuration",
			"cat.driver.desc": "Rewrite cua-driver's own configuration",
			"cat.unknown.title": "Unclassified tools",
			"cat.unknown.desc": "Computer-use tools this gate does not recognise"
		};
		//#endregion

		//#region plugin
		/** Required services: the slot ledger, dictionaries and the shared config forms. */
		var inject = ["slots", "locale", "configForms"];

		/**
		 * Register the dictionary and the General-settings preference row.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "computer-use-guard: dictionaries");

			var forms = ctx.get("configForms");
			if (forms === void 0 || typeof forms.get !== "function") return;

			/**
			 * Build the row's props face over one controller.
			 *
			 * The controller is memoized and owned by the provider
			 * (`ConfigForms.get`, disposed by the provider's own teardown
			 * effect), so this half must never dispose it: doing so would leave
			 * a dead controller in that map, and a later `apply` — a
			 * client-plugin reload — would be handed the corpse, after which
			 * every write resolves `false` forever.
			 * @param form - the namespace's controller.
			 * @returns the injected props face.
			 */
			var faceOf = function (form) {
				var load = function () {
					var mirror = forms.describe();
					if (mirror !== void 0 && typeof mirror.ensure === "function") return mirror.ensure();
					return Promise.resolve();
				};

				var write = function (ops) {
					if (typeof form.mutate === "function") return form.mutate(ops);
					// Fallback: commit the operations one by one. `form.set` only
					// understands a single field, so anything else must report
					// failure rather than resolve `true` — a caller that believes
					// a write landed stops retrying and the row silently diverges
					// from the Host.
					var chain = Promise.resolve(true);
					for (var i = 0; i < ops.length; i += 1) {
						(function (op) {
							chain = chain.then(function (ok) {
								if (ok === false) return false;
								if (op.op !== "set" || op.path.length !== 1) {
									console.warn("dsh-computer-use-guard: cannot apply operation", op);
									return false;
								}
								return form.set(op.path[0], op.value);
							});
						})(ops[i]);
					}
					return chain;
				};

				return function () {
					return {
						hooks: { computerUseGuard: form.store },
						load: load,
						write: write
					};
				};
			};

			// Register unconditionally, the way the built-in preference rows do.
			//
			// Gating this on `whileServed` looked correct and was not: the section
			// provider picks its persistence from the page origin
			// (`dsh-client-ui-settings`, `persistence = remote.$host.isLoopback ?
			// "host" : "memory"`), and under `memory` its describe mirror never
			// loads, so the namespace is never served, `whileServed` never runs
			// its callback, and the row does not exist at all — the switch looked
			// like it had been deleted rather than merely disabled. Registering
			// here and letting the row state an unreachable settings document is
			// strictly more honest than an empty slot.
			ctx.effect(function () {
				return ctx.slots.inject("settings.general.item", function () {
					return ctx.slots.register({
						name: "settings.general.item",
						id: "computer-use",
						order: 5,
						locale: NS,
						inject: faceOf(forms.get(NS))
					}, ComputerUseRow);
				});
			}, "computer-use-guard: settings row");
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = NS;
		//#endregion

		return module.exports;
	}
});
