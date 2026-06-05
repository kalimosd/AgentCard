# AgentCard

AgentCard 是一个本地优先的 CLI AI coding agent 状态岛。它适合放在桌面副屏或平板浏览器上，让开发者不用反复切回 terminal，也能知道 agent 正在做什么、是否需要介入、这次任务大概消耗了多少 token 和 cost。

这个产品不是通用工程 dashboard。它的职责是让 AI coding agent 成为一个可被观察、可被管理、会在需要时叫你的桌面工作对象。

## 产品承诺

AgentCard 要回答六个问题：

1. Agent 现在是不是还在工作？
2. 它正在做什么？
3. 它是不是在等我确认或回答？
4. 它成功了还是失败了？
5. 这次任务大概烧了多少 token？
6. 今天总共花了多少钱？

## 目标用户

第一版只服务使用 CLI AI coding agent 的开发者和 AI-heavy builder，例如 Codex CLI、Claude Code、Gemini CLI 用户。

这类用户经常把任务交给 agent 后切到别的窗口工作，但仍然需要在 agent 卡住、等待权限、测试失败、任务完成或异常消耗时及时知道。

## MVP 形态

```text
Mac 本地服务
+ Terminal Agent Wrapper
+ 平板浏览器或 HDMI 小副屏
+ WebSocket 实时状态同步
```

预期使用方式：

```bash
npm run build
npm run agentcard -- server
npm run agentcard -- run codex
```

本地开发阶段默认端口是 `4317`，绑定 `127.0.0.1`（仅本机可访问）：

```text
http://127.0.0.1:4317
```

如需在平板或副屏访问，启动时加上 `--host 0.0.0.0`：

```bash
npm run agentcard -- server --host 0.0.0.0
```

然后在平板浏览器打开：

```text
http://<mac-lan-ip>:4317
```

> **安全提示：** `--host 0.0.0.0` 会暴露服务到整个局域网。仅在信任的网络环境中使用（如家庭 WiFi），公共网络或办公网络下建议保持默认 `127.0.0.1`。详细安全模型见下方「本地优先」说明。

`agentcard run <command>` 只监控由它启动的进程。它不会改写 shell alias，也不会影响你直接输入 `claude`、`codex` 或 `gemini` 的原始用法。

### 用 Claude 开真实项目（v0.3 hooks）

```bash
# 进入你的真实项目目录
cd ~/code/你的项目

# 一条命令启动 AgentCard + Claude
npm run agentcard -- claude
```

`agentcard claude` 会：

- 复用已经运行的 `http://127.0.0.1:4317` AgentCard server；如果没有运行，就临时启动一个
- 在当前项目的 `.claude/settings.json` 幂等安装 / 刷新 Claude hooks
- 以真实交互式 TTY 启动 `claude`
- Claude 退出后，只关闭这条命令自己临时启动的 server

浏览器 / 平板打开 `http://127.0.0.1:4317`。之后副屏会同步：

- 你提交的任务（`UserPromptSubmit`）
- 读文件 / 改文件 / 跑命令（`PreToolUse`）
- 等待权限、等待输入（`PermissionRequest` / `Notification`）
- 工具失败（`PostToolUseFailure`）
- **用量**：从 Claude 会话 `*.jsonl` 解析 token / 估算 cost（标记 `estimated`）
- **权限**：协议支持时副屏显示 **Yes / Always / No**，由用户显式选择后回传给 Claude
- **问题**：`AskUserQuestion` / skill 方向选择会渲染为问题卡片；协议支持时可在副屏点选 `1 / 2 / 3` 或 `A / B / C` 并回传给 Claude
- **计划**：`ExitPlanMode` 会渲染为计划卡片；批准类选项可在副屏点选并回传，文字反馈类选项仍回 Claude terminal

`agentcard claude` 安装的 hook 会启用 `AGENTCARD_PRETOOL_PERMISSION_MODE=gate`，让可控的权限和结构化选择在进入 Claude terminal 原生确认前先到 AgentCard。只收到通用 `Claude needs your permission` 的 `Notification` 时，AgentCard 会把它当作不可执行的 terminal 注意事项，不会伪造按钮。

如果你已经在旧版本里跑过 `setup claude`，也可以直接用 `agentcard claude`；它会清理旧的 AgentCard hook 条目并写入当前版本路径。

手动调试路径仍然可用：

```bash
cd /path/to/AgentCard
npm run build
npm run agentcard:server

cd ~/code/你的项目
npm run agentcard -- setup claude
npm run agentcard -- run claude
```

若要用非交互一次性任务：`npm run agentcard -- run claude -p "review this repo"`。

旧的 `island` 产品名已在代码中统一为 AgentCard，不再保留兼容别名。

## MVP 模块

### 常驻状态岛

显示当前 agent 状态、项目、已运行时间、最近动作、最后摘要，以及一个小角色或动画状态。

核心状态：

- `idle`
- `starting`
- `thinking`
- `reading`
- `editing`
- `running_command`
- `waiting_approval`
- `waiting_input`
- `completed`
- `failed`

### 介入卡片

当 agent 需要用户注意时，状态岛展开为介入卡片。

MVP 触发场景：

- 等待权限确认
- 等待用户输入
- 命令执行失败
- 测试失败
- 任务完成

v0.1 demo 操作：

- `Jump Back`：跳回对应 terminal
- `Dismiss`：忽略提醒
- `Mark Done`：标记已处理

真实 hook 阶段只允许用户显式决策，不静默 approve。权限请求应渲染为 `Yes / Always / No`；非权限问题应渲染为问题卡片，避免把 skill 方向选择误判成授权。

### Token / Cost 面板

用量是辅助信息，不是主界面中心。

MVP 字段：

- 当前 session 估算 token
- 今日估算 token
- 今日 cost
- 当前模型，如果能识别
- 是否异常消耗

如果 CLI 不提供精确 token，用量必须标记为 `estimated`。

## 不是什么

AgentCard 不是：

- 宽泛的多 agent dashboard
- 任务队列管理器
- 项目管理视图
- 完整 agent 编排产品
- 成本分析平台
- terminal 替代品

状态岛应该始终聚焦实时 agent 状态、需要用户注意的时刻，以及轻量用量可视化。

## 版本计划

- `v0.1`：假数据平板 UI demo
- `v0.2`：Terminal wrapper，支持 `agentcard run <command>`
- `v0.3`：Claude Code hook bridge，识别真实生命周期与注意力状态
- `v0.4`：typed interaction queues，拆分权限、问题、计划、失败和完成卡片
- `v0.5`：Token 估算、今日 cost 和 session memory
- `v0.6`：Jump Back 到 terminal / editor 上下文
- `v0.7`：Multi-session lite，仍保持一个主状态岛

完整 PRD 见 `docs/product-requirements.md`，版本边界见 `docs/roadmap.md`。

## 当前仓库说明

这个仓库现在统一命名为 AgentCard：一个面向 CLI AI coding agent 的副屏状态岛。
