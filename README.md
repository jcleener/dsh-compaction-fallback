# dsh-compaction-fallback

> DSH（DeepSeek Harness）本地插件：包裹 `BasicCompactionEngine.prototype.summarize`，**任何**压缩总结失败时改用可配置的兜底模型自动重试（最多 3 次），主总结成功时完全不干扰。
> 设置入口在 **设置 → 插件配置** 里的可折叠卡片「上下文压缩兜底」，Provider → Model 两级选择，选完即保存。

## 功能

- **兜底重试**：主 `summarize`（当前/路由模型）失败时（上下文溢出、adapter 错误、供应商中断、取消等**所有失败类型**），用兜底模型重试最多 3 次；全部失败则压缩失败并保留最后一次失败原因
- **零干扰**：主总结正常时行为与基础引擎完全一致，不替换模型、不加延迟
- **可动态配置**：设置 → 插件配置 → 「上下文压缩兜底」卡片，Provider → Model 两级选择器选兜底模型，保存即写入 `~/.dsh/compaction-fallback.json`（默认 `deepseek-official/deepseek-v4-flash`）
- **卡片式设置 UI**：注册在 `settings.plugin.item`（「插件配置」分页内的卡片，视觉与官方 PluginCard 一致），不再占用「设置 → 插件」里的独立分页
- **为什么用 prototype 补丁**：常驻压缩引擎在每 agent 的 `agent-presets:` 作用域（`ctx.compaction`）提供，根上下文 service inject 看不见；打补丁到 prototype 覆盖所有实例，且 Node 模块缓存按 realpath 键控（本 profile 的 `@deepseek-ai/dsh-compaction-basic` 符号链接）保证补丁的就是加载器实例化的那个类

## 安装

```bash
dsh plugin --profile web add "github:jcleener/dsh-compaction-fallback"
# 或固定版本
dsh plugin --profile web add "github:jcleener/dsh-compaction-fallback#v0.1.0"
```

安装后重启 `dsh web` 生效。

## 使用

打开 **设置 → 插件配置**，找到「上下文压缩兜底」卡片，点开后在 Provider → Model 两级选择器里选定兜底模型，保存即写入 `~/.dsh/compaction-fallback.json`。之后任意压缩总结失败时自动用该模型重试（最多 3 次）。

## 关闭

在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中把该插件的 insert 段改为 `disabled: true`（或删除 insert 段），重启 `dsh web` 即回到原生压缩行为。

## 开发 / 结构

```
lib/index.js      Host 半段（prototype 补丁 + HTTP 路由 + 设置命名空间注册）
lib/client.js     Client 半段（「插件配置」分页内的可折叠卡片 + Provider→Model 选择器）
cordis.patch.yml  加载器补丁层（insert 声明）
```

Host 端通过 `installSettingsSection(ctx, settingsNamespace('compaction-fallback'), ...)` 注册只读命名空间，使浏览器「插件配置」分页能枚举并派发卡片；实际配置值仍由 HTTP 路由读写 `~/.dsh/compaction-fallback.json`。

## 许可证

MIT © 2025 [jcleener](https://github.com/jcleener)
