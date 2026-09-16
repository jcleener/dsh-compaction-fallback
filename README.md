# dsh-compaction-fallback · 压缩总结兜底模型

> 上下文压缩（compaction）的总结一旦失败，整轮压缩就失败，会话可能因此走不下去。
> 本插件给压缩引擎的 `summarize` 套一层兜底：**主流程完全不变**，只有抛错时才换成一个
> 可在设置页选择的兜底模型重试，**最多 3 次**；3 次都失败才抛出错误（保留最后一次原因）。
>
> 为什么用原型补丁而不是服务注入：常驻的压缩引擎挂在 per-agent 的 `agent-presets:` 作用域
> （`ctx.compaction`），根上下文注入看不到它；而 Node 模块缓存按 realpath 共享，
> 补丁 `BasicCompactionEngine.prototype` 能覆盖所有实例。

## 特性

- **零侵入主路径**：`summarize` 正常时行为与基础引擎完全一致（不换模型、不改配置）。
- **任何失败都兜底**：上下文溢出、适配器错误、供应商故障、取消……代码注释明确按「all failure kinds」处理。
- **最多 3 次重试**：`MAX_FALLBACK_ATTEMPTS = 3`，每次都用兜底模型重跑原始 `summarize`。
- **配置可改**：兜底模型默认 `deepseek-official/deepseek-v4-flash`，在设置「插件配置」页的
  「压缩兜底」卡片里用「供应商 → 模型」两级选择器修改，落盘即生效（无需重启）。
- **原生观感**：设置卡片复刻内置 PluginCard 的折叠外壳，复用 `--dsw-alias-*` 主题变量，中英文案由 `locale` 提供。

## 环境要求

- DSH web profile（`$env:DSH_HOME\profiles\web`），需要 `@deepseek-ai/dsh-compaction-basic`、
  `@deepseek-ai/dsh-settings`、`@deepseek-ai/schemastery`（随 DSH 提供，无第三方依赖）。
- 宿主路由依赖 `webServer` 与 `llm` 服务；客户端半依赖 `slots` 与 `locale`。
- 未声明 Node 版本下限（`package.json` 无 `engines`）。

## 部署（重启 + 硬刷新）

1. 拷贝插件到 profile 的 node_modules：
   ```powershell
   Copy-Item -Recurse -Force D:\DSH\design\DSHPlugin-0831\dsh-compaction-fallback $env:DSH_HOME\profiles\web\node_modules\dsh-compaction-fallback
   ```
2. `package.json` 的 `dsh.bundle.patch` 指向本包 `cordis.patch.yml`，挂载行即：
   ```yaml
   - insert:
       - id: dsh-compaction-fallback
         name: dsh-compaction-fallback
   ```
3. **重启 DSH 实例**（宿主半在 `apply()` 时打原型补丁、注册设置 namespace）；
   `dsh.client`（`platform: web`）提供的设置卡片需**硬刷新页面 Ctrl+F5**。

## 配置

宿主通过 `installSettingsSection(ctx, settingsNamespace('compaction-fallback'), schema, readState(), …)`
把 namespace 暴露给浏览器「插件配置」tab —— **只有注册了这个 namespace，卡片才会被 dispatch**。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `provider` | `string` | `deepseek-official` | 兜底模型所属供应商 ID |
| `model` | `string` | `deepseek-v4-flash` | 兜底模型 ID |

- 该 namespace 的 `base` 只是**当前状态文件的镜像**，`setSource` / `onChange` 都是空实现（只读）；
  真正的读写走下面的 HTTP 路由。
- 持久化文件：`$DSH_HOME/compaction-fallback.json`（`DSH_HOME` 未设置时用 `~/.dsh`），
  内容为 `{ "provider": …, "model": … }`；字段缺失或为空字符串时回落到默认值。

## 主要能力

**宿主半（`lib/index.js`）**

- `ensurePatched()`：用 `patched` 模块级标志保证只补丁一次，
  `BasicCompactionEngine.prototype.summarize = createFallbackSummarize(original)`。
- `createFallbackSummarize(original)`：先原样调用；抛错后读取兜底配置，
  临时改写 `this.config.summarizationProvider` / `summarizationModel` 并最多重试 3 次，
  `finally` 中恢复原值；全部失败则抛 `dsh-compaction-fallback: fallback failed after 3 attempts with <provider>/<model>: <最后一次原因>`（`cause` 保留原错误）。
- 日志：走 `this.ctx?.logger`（首次失败 warn、每次兜底失败 warn、成功 info）。
- 导出 `createFallbackSummarize` / `MAX_FALLBACK_ATTEMPTS` / `DEFAULT_FALLBACK`（注释注明供测试用）。

**HTTP 路由（`ctx.inject(['webServer','llm'])`，随 fiber dispose）**

| 路由 | 方法 | 说明 |
|---|---|---|
| `/dsh-compaction-fallback/config` | GET / HEAD | 返回 `{ provider, model, default: { provider, model } }` |
| `/dsh-compaction-fallback/config` | POST | 保存兜底模型；校验同源（`sameOrigin`）、请求体 ≤ 4096 字节、`provider`/`model` 非空；成功返回 `{ ok: true, provider, model }` |
| `/dsh-compaction-fallback/models` | GET / HEAD | 模型目录，供选择器使用：`{ groups: [{ id, name, models: [{ id, name, description?, reasoning? }] }], failures: [{ id, name, message }] }`；数据来自 `llm.listProviders()` / `listModels()` / `resolveModelInfo()` |

**客户端半（`lib/client.js`）**

- `ctx.effect(() => ctx.locale.register('settings.compactionFallback', { zh, en }))` 注册中英文案。
- 注册 slot `settings.plugin.item`，`key: 'compaction-fallback'`，`locale: 'settings.compactionFallback'`：
  可折叠卡片「上下文压缩兜底」，内含兜底模型行与两级选择 popover（供应商 → 模型，
  Escape / 点击外部关闭，保存成功后显示「已保存，压缩失败时生效」）。
- **不注册** model 工具、命令、事件监听（代码中不存在）。

## 文件结构

```
dsh-compaction-fallback/
├─ package.json        # name/version 0.1.0、exports、dsh.bundle.patch、dsh.client(platform: web)
├─ cordis.patch.yml    # 挂载行：insert id/name = dsh-compaction-fallback
└─ lib/
   ├─ index.js         # 宿主半：原型补丁 + 兜底重试、状态文件、设置 namespace、三个 HTTP 路由
   └─ client.js        # 浏览器半：设置「插件配置」页的折叠卡片与模型选择器
```

## 备注 / 已知限制

- **不区分失败原因**：取消（cancellation）、上下文超限等都会触发兜底，最多额外 3 次模型调用 —— 可能延长等待并重复消耗额度（这是代码注释里写明的产品决定）。
- **原型补丁全局且不可撤销**：模块级 `patched` 标志只打一次，`apply()` 没有返回补丁的 disposer，插件停止/卸载后补丁依然生效。
- **依赖基础引擎的内部约定**：兜底通过改写 `this.config.summarizationProvider` / `summarizationModel` 生效，前提是基础 `summarize` 在调用时读取 `this.config` 且没有 modelPolicies 覆盖（代码注释写明）；基础引擎若改为缓存配置或走 modelPolicies，兜底会失效。
- **配置读写用同步 `fs`**（`readFileSync` / `writeFileSync`），无并发写保护，也没有文件锁。
- **不校验模型存在性**：状态文件只存 `provider`/`model` 字符串，写接口只做非空校验；`/models` 目录仅服务于 UI 选择。
- **不同步设置页的「已保存」状态**：设置 namespace 的 `setSource`/`onChange` 为空实现，卡片通过 HTTP 路由自行读写。
- **文档与实现不一致的三处**（以代码为准）：
  `cordis.patch.yml` 注释说宿主半 "wraps the compaction engine's summarize() hook"，实际是替换原型方法（prototype patch），不是 hook；
  `package.json` 的 `dsh.client.inject` 声明了 `@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-ui-primitives`，而 `lib/client.js` 实际 `require` 的是 `react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives`（前两者未列入 inject）；
  `package.json` 的 `description` 写「settings page model picker」，实现是设置「插件配置」tab 内的一张卡片（`settings.plugin.item`），不是独立设置页。
- 未在代码中明确：兜底重试与宿主 `llm` 路由重试/退避策略的交互、以及 `reasoning` 字段在选择器中的展示（`/models` 返回该字段，客户端目前只用 `name` / `id`）。
