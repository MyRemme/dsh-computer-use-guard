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
			".cug_list{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:4px}";
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
		 * The graded categories, in the order they render. Each entry is a Config
		 * field plus the tool family it governs — the same partition the host
		 * half's `tierOf()` enforces.
		 */
		var CATEGORIES = [
			{ field: "observe", title: "读取屏幕与窗口", desc: "截图、窗口树、剪贴板读取、驱动诊断" },
			{ field: "input", title: "鼠标与键盘输入", desc: "点击、拖拽、打字、快捷键、滚动" },
			{ field: "window", title: "窗口与启动应用", desc: "激活窗口、调整窗口位置、启动程序" },
			{ field: "browser", title: "浏览器自动化", desc: "导航、点击、输入、下载、上传文件" },
			{ field: "clipboard", title: "写入剪贴板", desc: "覆盖系统剪贴板内容" },
			{ field: "recording", title: "录制与电脑操作会话", desc: "录屏、轨迹录制、会话生命周期" },
			{ field: "agentCursor", title: "代理光标", desc: "屏幕上的代理指针外观与动画" }
		];

		/** Categories that stay behind the 高级 disclosure. */
		var ADVANCED = [
			{ field: "process", title: "结束进程", desc: "终止任意进程" },
			{ field: "menu", title: "调用应用菜单", desc: "触发原生应用菜单项" },
			{ field: "replay", title: "轨迹重放", desc: "重放已录制的操作轨迹" },
			{ field: "install", title: "安装外部依赖", desc: "例如安装 ffmpeg" },
			{ field: "driver", title: "修改驱动配置", desc: "改写 cua-driver 自身配置" },
			{ field: "unknown", title: "未分类工具", desc: "本闸门不认识的电脑操作工具" }
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
			process: "deny",
			menu: "ask",
			clipboard: "auto",
			browser: "auto",
			recording: "auto",
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
			return React.createElement(
				"div",
				{ className: "cug_item" },
				React.createElement(
					"div",
					{ className: "cug_itemText" },
					React.createElement("div", { className: "cug_itemTitle" }, spec.title),
					React.createElement("div", { className: "cug_itemDesc" }, spec.desc)
				),
				React.createElement(primitives.SegmentedControl, {
					id: "cug-" + spec.field,
					value: props.value,
					options: options,
					label: spec.title,
					disabled: disabled,
					className: "cug_seg",
					onChange: function (next) { props.onChange(spec.field, next); }
				})
			);
		}

		/**
		 * The 通用设置 preference row for computer-use.
		 *
		 * The section supplies no props beyond the injected face, so this row owns
		 * its label, its current values and its write path.
		 * @param props - injected controller face plus localized copy.
		 * @returns the row, or null when the host exposes no such namespace.
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

			if (state.status === "unavailable") return null;

			var value = state.value;
			var loading = state.status === "loading";
			var disabled = busy || loading || !state.writable;
			var tally = tallyOf(value);

			/**
			 * Commit one Config operation.
			 * @param field - Config field name.
			 * @param tier - the selected tier.
			 */
			var commit = function (field, tier) {
				setFailed(false);
				setBusy(true);
				Promise.resolve(props.write([{ op: "set", path: [field], value: tier }])).then(function (ok) {
					if (ok === false) setFailed(true);
				}).catch(function () { setFailed(true); }).then(function () { setBusy(false); });
			};

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
								: t("summary", { deny: tally.deny, ask: tally.ask, auto: tally.auto })
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

			var panel = React.createElement(
				"div",
				{ className: "cug_panel" },
				React.createElement("div", { className: "cug_advancedTitle" }, t("fineTitle")),
				CATEGORIES.map(renderItem),
				toggle,
				advancedItems,
				React.createElement("div", { className: "cug_list" }, t("allowlistHint"))
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
			"allowlistHint": "放行/拒绝名单（allowlist / denylist）可在「插件」页的同一命名空间下按工具名精确配置。",
			"tier.deny": "禁止",
			"tier.ask": "询问",
			"tier.auto": "自动授权"
		};
		var en = {
			"title": "Computer-use permission",
			"fine": "Fine-grained control",
			"fineTitle": "Set a tier per category",
			"advancedTitle": "Advanced (stricter by default)",
			"loading": "Loading…",
			"error": "Could not save. Please try again.",
			"summary": "{deny} denied · {ask} ask · {auto} auto-granted",
			"allowlistHint": "Per-tool allow/deny lists live on the Plugins page under the same namespace.",
			"tier.deny": "Deny",
			"tier.ask": "Ask",
			"tier.auto": "Auto-grant"
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
					// Fallback: commit the operations one by one.
					var chain = Promise.resolve(true);
					for (var i = 0; i < ops.length; i += 1) {
						(function (op) {
							chain = chain.then(function (ok) {
								if (ok === false || op.op !== "set") return ok;
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

			// Register the row only while the Host actually serves this
			// namespace: `whileServed` runs the registration once the namespace
			// appears in the describe mirror and tears it down when it does not.
			// A deployment that never composed the guard therefore shows no row,
			// instead of a permanently empty one.
			ctx.effect(function () {
				return forms.whileServed([NS], function () {
					return ctx.slots.inject("settings.general.item", function () {
						return ctx.slots.register({
							name: "settings.general.item",
							id: "computer-use",
							order: 5,
							locale: NS,
							inject: faceOf(forms.get(NS))
						}, ComputerUseRow);
					});
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
