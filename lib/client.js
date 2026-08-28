window.__ModuleLoader__.load({
	id: "dsh-compaction-fallback",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region styles
		/**
		 * Section-scoped styles, injected once. Reuses the same theme tokens the
		 * shipped settings sections use, so the fallback-model row looks native.
		 */
		const css = [
			".dcf-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}",
			".dcf-head{align-items:baseline;gap:7px;padding:0 2px;display:flex}",
			".dcf-head h3{font-size:13px;font-weight:600;line-height:20px;margin:0}",
			".dcf-head span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}",
			".dcf-row{position:relative;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;min-width:0;align-items:center;gap:12px;padding:11px 14px;display:flex}",
			".dcf-info{flex:1;min-width:0}",
			".dcf-name{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}",
			".dcf-id{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:18px;overflow:hidden}",
			".dcf-btn{flex:none;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:6px 14px;transition:background .12s}",
			".dcf-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
			".dcf-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
			".dcf-btn:disabled{opacity:.6;cursor:wait}",
			".dcf-status{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;padding:0 2px}",
			".dcf-notice{color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px;padding:0 2px}",
			".dcf-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;padding:0 2px}",
			".dcf-pop{position:absolute;top:calc(100% + 6px);left:14px;z-index:50;min-width:320px;max-height:360px;overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;box-shadow:0 8px 24px rgb(0 0 0 / .18);padding:6px;display:flex;flex-direction:column;gap:2px}",
			".dcf-pop h4{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;line-height:16px;text-transform:uppercase;letter-spacing:.04em;padding:4px 10px 2px}",
			".dcf-item{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:none;background:0 0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;border-radius:7px;padding:7px 10px}",
			".dcf-item:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dcf-item[data-active=true]{color:var(--dsw-alias-brand-primary)}",
			".dcf-item .dcf-check{margin-left:auto;color:var(--dsw-alias-brand-primary);font-size:13px;line-height:1}",
			".dcf-item .dcf-model-id{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:16px;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			// ── collapsible card shell (visual twin of the shipped PluginCard) ──
			".dcf-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}",
			".dcf-card:hover{border-color:var(--dsw-alias-label-dimmed)}",
			".dcf-card[data-open=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}",
			".dcf-card-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}",
			".dcf-card-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
			".dcf-card-head{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}",
			".dcf-card-name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}",
			".dcf-card-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}",
			".dcf-card-chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}",
			".dcf-card[data-open=true] .dcf-card-chevron{transform:rotate(180deg)}",
			".dcf-card-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:14px 0 16px}",
			".dcf-card-body .dcf-section{max-width:none;gap:10px}"
		].join("");
		const tagId = "dsh-compaction-fallback/Section.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-compaction-fallback";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region locale
		const NS = "settings.compactionFallback";
		const zh = {
			nav: "压缩兜底",
			cardTitle: "上下文压缩兜底",
			cardDesc: "压缩总结失败时，用下面的模型自动重试（最多 3 次）",
			heading: "压缩兜底模型",
			desc: "压缩总结失败时，用下面的模型自动重试（最多 3 次）",
			label: "兜底模型",
			current: "当前",
			choose: "选择模型",
			loading: "加载中…",
			loadFailed: "加载失败",
			saved: "已保存，压缩失败时生效",
			saveFailed: "保存失败",
			providers: "供应商",
			models: "模型",
			empty: "没有可用模型",
			back: "← 返回",
			noModel: "未设置（使用默认）"
		};
		const en = {
			nav: "Compaction Fallback",
			cardTitle: "Compaction fallback",
			cardDesc: "When summarization fails, retry up to 3 times with this model",
			heading: "Compaction fallback model",
			desc: "When summarization fails, retry up to 3 times with this model",
			label: "Fallback model",
			current: "Current",
			choose: "Choose model",
			loading: "Loading…",
			loadFailed: "Failed to load",
			saved: "Saved — applies on compaction failure",
			saveFailed: "Failed to save",
			providers: "Providers",
			models: "Models",
			empty: "No models available",
			back: "← Back",
			noModel: "Unset (using default)"
		};
		//#endregion

		//#region section
		/** Bound after apply() registers the locale namespace. */
		let boundT = (key, args) => key;

		/**
		 * Settings "压缩兜底" section. Reads the current fallback model and the
		 * provider/model catalog from the host routes, and edits the fallback
		 * model through a two-level (Provider → Model) picker popover.
		 * When `embedded` is true the own heading is omitted so the section can
		 * live inside the collapsible card shell (which shows the title itself).
		 */
		function CompactionFallbackSection({ embedded }) {
			const [config, setConfig] = react.useState(null);
			const [loadError, setLoadError] = react.useState(null);
			const [groups, setGroups] = react.useState(null);
			const [open, setOpen] = react.useState(false);
			const [path, setPath] = react.useState([]);
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState(null);
			const rootRef = react.useRef(null);
			const triggerRef = react.useRef(null);

			const loadConfig = react.useCallback(async () => {
				try {
					const res = await fetch("/dsh-compaction-fallback/config", { cache: "no-store" });
					if (!res.ok) throw new Error("http " + res.status);
					const body = await res.json();
					setConfig({ provider: body.provider, model: body.model });
					setLoadError(null);
				} catch (error) {
					setLoadError(String(error));
				}
			}, []);
			react.useEffect(() => {
				loadConfig();
			}, [loadConfig]);

			const openPicker = react.useCallback(async () => {
				setBusy(true);
				setNotice(null);
				try {
					const res = await fetch("/dsh-compaction-fallback/models", { cache: "no-store" });
					if (!res.ok) throw new Error("http " + res.status);
					const body = await res.json();
					setGroups(body.groups ?? []);
					setPath([]);
					setOpen(true);
				} catch (error) {
					setNotice(boundT("loadFailed") + ": " + String(error));
				} finally {
					setBusy(false);
				}
			}, []);

			const close = react.useCallback(() => {
				setOpen(false);
				setPath([]);
			}, []);

			react.useEffect(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (!rootRef.current?.contains(event.target)) close();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						close();
						triggerRef.current?.focus();
					}
				};
				document.addEventListener("mousedown", closeOutside);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("mousedown", closeOutside);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open, close]);

			const pick = react.useCallback(async (provider, model) => {
				setBusy(true);
				setNotice(null);
				try {
					const res = await fetch("/dsh-compaction-fallback/config", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ provider, model })
					});
					const body = await res.json().catch(() => null);
					if (!res.ok || body === null || body.ok !== true) {
						setNotice(boundT("saveFailed") + ": " + (body?.error ?? String(res.status)));
						return;
					}
					setConfig({ provider: body.provider, model: body.model });
					setNotice(boundT("saved"));
					close();
				} catch (error) {
					setNotice(boundT("saveFailed") + ": " + String(error));
				} finally {
					setBusy(false);
				}
			}, [close]);

			const currentModel = config === null ? null : `${config.provider} / ${config.model}`;
			const activeProvider = path.length > 0 ? (groups ?? []).find((g) => g.id === path[0]) : void 0;

			return react_jsx_runtime.jsx("div", {
				className: "dcf-section",
				children: [
					embedded ? null : react_jsx_runtime.jsx("div", {
						className: "dcf-head",
						children: [
							react_jsx_runtime.jsx("h3", { children: boundT("heading") }),
							react_jsx_runtime.jsx("span", { children: boundT("desc") })
						]
					}),
					react_jsx_runtime.jsx("div", {
						className: "dcf-row",
						children: [
							react_jsx_runtime.jsx("div", {
								className: "dcf-info",
								children: [
									react_jsx_runtime.jsx("div", { className: "dcf-name", children: boundT("label") }),
									react_jsx_runtime.jsx("div", {
										className: "dcf-id",
										children: currentModel === null ? "…" : currentModel
									})
								]
							}),
							react_jsx_runtime.jsx("button", {
								className: "dcf-btn",
								ref: triggerRef,
								disabled: busy,
								onClick: openPicker,
								children: busy ? boundT("loading") : boundT("choose")
							}),
							open ? react_jsx_runtime.jsx("div", {
								className: "dcf-pop",
								ref: rootRef,
								children: activeProvider === void 0
									? [
										react_jsx_runtime.jsx("h4", { children: boundT("providers") }),
										(groups ?? []).length === 0
											? react_jsx_runtime.jsx("div", { className: "dcf-status", children: boundT("empty") })
											: (groups ?? []).map((group) => react_jsx_runtime.jsx("button", {
												className: "dcf-item",
												onClick: () => setPath([group.id]),
												children: group.name ?? group.id
											}, group.id))
									]
									: [
										react_jsx_runtime.jsx("button", {
											className: "dcf-item",
											onClick: () => setPath([]),
											children: boundT("back")
										}),
										react_jsx_runtime.jsx("h4", { children: boundT("models") }),
										activeProvider.models.length === 0
											? react_jsx_runtime.jsx("div", { className: "dcf-status", children: boundT("empty") })
											: activeProvider.models.map((model) => react_jsx_runtime.jsx("button", {
												className: "dcf-item",
												"data-active": config !== null && config.provider === activeProvider.id && config.model === model.id ? true : void 0,
												onClick: () => pick(activeProvider.id, model.id),
												children: [
													react_jsx_runtime.jsx("span", { children: model.name ?? model.id }),
													react_jsx_runtime.jsx("span", {
														className: "dcf-model-id",
														children: model.id
													})
												]
											}, model.id))
									]
							}) : null
						]
					}),
					loadError !== null ? react_jsx_runtime.jsx("div", {
						className: "dcf-error",
						children: boundT("loadFailed") + ": " + loadError
					}) : null,
					notice !== null ? react_jsx_runtime.jsx("div", {
						className: "dcf-notice",
						children: notice
					}) : null
				]
			});
		}
		//#endregion

		//#region card
		/**
		 * Collapsible card shell for the "插件配置" tab — a visual twin of the
		 * shipped PluginCard. The header toggles the body, which renders the
		 * fallback section in embedded (heading-less) mode.
		 */
		function CompactionFallbackCard() {
			const [open, setOpen] = react.useState(false);
			return react_jsx_runtime.jsxs("li", {
				className: "dcf-card",
				"data-open": open ? true : void 0,
				children: [
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dcf-card-header",
						"aria-expanded": open,
						onClick: () => setOpen(!open),
						children: [
							react_jsx_runtime.jsxs("span", {
								className: "dcf-card-head",
								children: [
									react_jsx_runtime.jsx("span", {
										className: "dcf-card-name",
										children: boundT("cardTitle")
									}),
									react_jsx_runtime.jsx("span", {
										className: "dcf-card-desc",
										children: boundT("cardDesc")
									})
								]
							}),
							react_jsx_runtime.jsx("span", {
								className: "dcf-card-chevron",
								"aria-hidden": true,
								children: "▾"
							})
						]
					}),
					open ? react_jsx_runtime.jsx("div", {
						className: "dcf-card-body",
						children: react_jsx_runtime.jsx(CompactionFallbackSection, { embedded: true })
					}) : null
				]
			});
		}
		//#endregion

		//#region plugin
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-compaction-fallback: dictionaries");
			boundT = ctx.locale.bind(NS);
			ctx.inject(["slots"], (scope) => {
				// Register as a card INSIDE the settings "插件配置" tab
				// (settings.plugin.item), keyed by the host-served settings
				// namespace `compaction-fallback` — not as a standalone tab. The
				// configurable-plugins tab dispatches it only because the host
				// half serves that namespace in settingsScope.describe().
				scope.slots.inject("settings.plugin.item", () => scope.slots.register({
					name: "settings.plugin.item",
					key: "compaction-fallback",
					locale: NS
				}, CompactionFallbackCard));
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
