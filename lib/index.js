/**
 * dsh-compaction-fallback — host half.
 *
 * Wraps `BasicCompactionEngine.prototype.summarize` so that ANY summarization
 * failure falls back to a configurable extra model. Per the product decision:
 *   - primary summarize keeps behaving exactly as the base engine does
 *     (current/routed model, no interference when it works);
 *   - on ANY failure (all failure kinds — context overflow, adapter error,
 *     provider outage, cancellation…), retry with the fallback model up to
 *   3 times;
 *   - if all 3 fallback attempts fail, the compaction fails (the last
 *     fallback cause is preserved).
 *
 * Why a prototype patch: the resident compaction engine is provided in the
 * per-agent `agent-presets:` scope (`ctx.compaction`), not on the root context
 * — so a root-context service inject cannot see it. Patching the prototype
 * covers every instance regardless of scope, and Node's module cache (keyed by
 * realpath, shared through the `@deepseek-ai/dsh-compaction-basic` symlink in
 * this profile) guarantees we patch the very class the loader instantiated.
 *
 * The fallback model lives in `~/.dsh/compaction-fallback.json` (default
 * `deepseek-official/deepseek-v4-flash`) and is edited from the settings page
 * "压缩兜底" section through the routes below.
 *
 * Routes:
 *   GET  /dsh-compaction-fallback/config  → { provider, model, default }
 *   POST /dsh-compaction-fallback/config  → { provider, model } (persist)
 *   GET  /dsh-compaction-fallback/models  → provider/model catalog for the picker
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import z from '@deepseek-ai/schemastery';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic';

export const name = 'dsh-compaction-fallback';

const DEFAULT_FALLBACK = Object.freeze({ provider: 'deepseek-official', model: 'deepseek-v4-flash' });
const MAX_FALLBACK_ATTEMPTS = 3;
const MAX_BODY_BYTES = 4096;

/**
 * Settings namespace served to the browser's "插件配置" tab. Registering it
 * makes `settingsScope.describe()` enumerate `compaction-fallback`, which is
 * what the configurable-plugins tab intersects with registered `plugin.item`
 * cards — without this namespace the browser half's card would never dispatch.
 * The schema only advertises provider/model; the actual persisted value stays
 * in `~/.dsh/compaction-fallback.json` (read/written by the HTTP routes), so
 * the namespace mirrors the file as its `base` and is otherwise inert.
 */
const SETTINGS_NAMESPACE = settingsNamespace('compaction-fallback');
const FallbackConfigSchema = z.object({
	provider: z.string(),
	model: z.string()
});

// ── state file ────────────────────────────────────────────────────────────
function statePath() {
	const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
	return join(home, 'compaction-fallback.json');
}
function readState() {
	try {
		const raw = JSON.parse(readFileSync(statePath(), 'utf8'));
		return {
			provider: typeof raw.provider === 'string' && raw.provider.length > 0 ? raw.provider : DEFAULT_FALLBACK.provider,
			model: typeof raw.model === 'string' && raw.model.length > 0 ? raw.model : DEFAULT_FALLBACK.model
		};
	} catch {
		return { ...DEFAULT_FALLBACK };
	}
}
function writeState(state) {
	const file = statePath();
	try {
		mkdirSync(dirname(file), { recursive: true });
	} catch { /* best effort */ }
	writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
	return state;
}

// ── http helpers (same shape as dsh-local-plugin-switch) ───────────────────
function sendJson(res, status, payload) {
	res.writeHead(status, {
		'cache-control': 'no-store',
		'content-type': 'application/json; charset=utf-8'
	});
	res.end(JSON.stringify(payload));
}
function sameOrigin(req) {
	const origin = req.headers.origin;
	const host = req.headers.host;
	if (origin === undefined || host === undefined) return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}
async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.length;
		if (size > maxBytes) throw new Error('request body too large');
		chunks.push(buffer);
	}
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// ── model catalog (mirrors dsh-host-apiproxy buildModelCatalog) ────────────
async function buildModelCatalog(llm) {
	const catalog = await Promise.all(llm.listProviders().map(async (provider) => {
		try {
			const models = await llm.listModels(provider.id);
			const entries = await Promise.all(models.map(async (model) => {
				const resolved = await llm.resolveModelInfo(provider.id, model.id);
				const reasoning = resolved.reasoning === void 0 ? void 0 : {
					efforts: resolved.reasoning.efforts.map((effort) => ({
						id: effort.id,
						name: effort.name,
						...effort.description === void 0 ? {} : { description: effort.description }
					})),
					...resolved.reasoning.defaultEffort === void 0 ? {} : { defaultEffort: resolved.reasoning.defaultEffort }
				};
				return {
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...reasoning === void 0 ? {} : { reasoning }
				};
			}));
			return {
				kind: 'group',
				group: {
					id: provider.id,
					name: provider.name,
					models: entries
				}
			};
		} catch (error) {
			return {
				kind: 'failure',
				failure: {
					id: provider.id,
					name: provider.name,
					message: error instanceof Error ? error.message : String(error)
				}
			};
		}
	}));
	return {
		groups: catalog.flatMap((item) => item.kind === 'group' ? [item.group] : []).filter((group) => group.models.length > 0),
		failures: catalog.flatMap((item) => item.kind === 'failure' ? [item.failure] : [])
	};
}

// ── compaction summarize fallback wrapper (prototype-level) ────────────────
let patched = false;
/**
 * Build the fallback wrapper over a base `summarize` function (exported for
 * tests). Operates on `this` as the engine instance. The primary call is the
 * untouched base implementation; on any thrown error the wrapper retries with
 * the fallback model by temporarily swapping the engine's resolved config
 * `summarizationProvider`/`summarizationModel` (the base `summarize` reads
 * `this.config` at call time and, with no modelPolicies override, forwards
 * those straight into the LLM options). After MAX_FALLBACK_ATTEMPTS all
 * failing, the wrapper rethrows a clear "fallback failed" error keeping the
 * last cause.
 */
function createFallbackSummarize(original) {
	return async function summarizeWithFallback(input, agent, signal) {
		try {
			return await original.call(this, input, agent, signal);
		} catch (error) {
			const fallback = readState();
			this.ctx?.logger?.warn?.(
				`dsh-compaction-fallback: summarize failed (${error instanceof Error ? error.message : String(error)}); ` +
				`falling back to ${fallback.provider}/${fallback.model} (up to ${MAX_FALLBACK_ATTEMPTS} attempts)`
			);
			const savedProvider = this.config.summarizationProvider;
			const savedModel = this.config.summarizationModel;
			let lastError = error;
			try {
				for (let attempt = 1; attempt <= MAX_FALLBACK_ATTEMPTS; attempt += 1) {
					this.config.summarizationProvider = fallback.provider;
					this.config.summarizationModel = fallback.model;
					try {
						const result = await original.call(this, input, agent, signal);
						this.ctx?.logger?.info?.(`dsh-compaction-fallback: fallback attempt ${attempt} succeeded with ${fallback.provider}/${fallback.model}`);
						return result;
					} catch (attemptError) {
						lastError = attemptError;
						this.ctx?.logger?.warn?.(
							`dsh-compaction-fallback: fallback attempt ${attempt}/${MAX_FALLBACK_ATTEMPTS} failed with ${fallback.provider}/${fallback.model}: ` +
							(attemptError instanceof Error ? attemptError.message : String(attemptError))
						);
					}
				}
			} finally {
				this.config.summarizationProvider = savedProvider;
				this.config.summarizationModel = savedModel;
			}
			throw new Error(
				`dsh-compaction-fallback: fallback failed after ${MAX_FALLBACK_ATTEMPTS} attempts with ${fallback.provider}/${fallback.model}: ` +
				(lastError instanceof Error ? lastError.message : String(lastError)),
				{ cause: lastError }
			);
		}
	};
}

function ensurePatched() {
	if (patched) return;
	patched = true;
	const original = BasicCompactionEngine.prototype.summarize;
	BasicCompactionEngine.prototype.summarize = createFallbackSummarize(original);
}

export function apply(ctx, config) {
	ensurePatched();
	console.log('[dsh-compaction-fallback] active');
	// Serve the settings namespace so the browser's "插件配置" tab dispatches
	// our `plugin.item` card. base mirrors the current state file; the browser
	// card edits through the HTTP routes, so the namespace is read-only.
	installSettingsSection(ctx, SETTINGS_NAMESPACE, FallbackConfigSchema, readState(), {
		setSource: () => {},
		onChange: () => {}
	});
	ctx.inject(['webServer', 'llm'], (host) => {
		host.effect(() => {
			// config route (GET reads, POST persists).
			const disposeConfig = host.webServer.register({
				kind: 'exact',
				path: '/dsh-compaction-fallback/config',
				handler: async (req, res) => {
					if (req.method === 'GET' || req.method === 'HEAD') {
						const state = readState();
						sendJson(res, 200, { ...state, default: { ...DEFAULT_FALLBACK } });
						return;
					}
					if (req.method !== 'POST') {
						res.writeHead(405, { allow: 'GET, POST' });
						res.end();
						return;
					}
					if (!sameOrigin(req)) {
						sendJson(res, 403, { error: 'untrusted origin' });
						return;
					}
					try {
						const body = await readJsonBody(req);
						const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
						const model = typeof body.model === 'string' ? body.model.trim() : '';
						if (provider.length === 0 || model.length === 0) {
							sendJson(res, 400, { error: 'provider and model are required' });
							return;
						}
						const state = writeState({ provider, model });
						ctx.logger.info(`dsh-compaction-fallback: fallback model set to ${provider}/${model}`);
						sendJson(res, 200, { ok: true, ...state });
					} catch (error) {
						sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			});

			// model catalog route for the settings picker (uses root ctx.llm at request time).
			const disposeModels = host.webServer.register({
				kind: 'exact',
				path: '/dsh-compaction-fallback/models',
				handler: async (req, res) => {
					if (req.method !== 'GET' && req.method !== 'HEAD') {
						res.writeHead(405, { allow: 'GET' });
						res.end();
						return;
					}
					try {
						const catalog = await buildModelCatalog(host.llm);
						sendJson(res, 200, catalog);
					} catch (error) {
						sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
					}
				}
			});

			return () => {
				disposeConfig();
				disposeModels();
			};
		});
	});
}

export { createFallbackSummarize, MAX_FALLBACK_ATTEMPTS, DEFAULT_FALLBACK };
