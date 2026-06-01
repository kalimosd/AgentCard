# Agent Island

Agent Island 是一个本地优先的 CLI AI coding agent 状态岛。它适合放在桌面副屏或平板浏览器上，让开发者不用反复切回 terminal，也能知道 agent 正在做什么、是否需要介入、这次任务大概消耗了多少 token 和 cost。

这个产品不是通用工程 dashboard。它的职责是让 AI coding agent 成为一个可被观察、可被管理、会在需要时叫你的桌面工作对象。

## 产品承诺

Agent Island 要回答六个问题：

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
island server
island run codex
```

然后在平板或副屏打开：

```text
http://<mac-lan-ip>:<port>
```

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

MVP 操作：

- `Jump Back`：跳回对应 terminal
- `Dismiss`：忽略提醒
- `Mark Done`：标记已处理

MVP 不替用户 approve 命令，也不在平板上直接回复 agent。

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

Agent Island 不是：

- 宽泛的多 agent dashboard
- 任务队列管理器
- 项目管理视图
- 完整 agent 编排产品
- 成本分析平台
- terminal 替代品

状态岛应该始终聚焦实时 agent 状态、需要用户注意的时刻，以及轻量用量可视化。

## 版本计划

- `v0.1`：假数据平板 UI demo
- `v0.2`：Terminal wrapper，支持 `island run <command>`
- `v0.3`：真实提醒，识别等待确认、输入、失败和完成
- `v0.4`：Token 估算和今日 cost 面板
- `v0.5`：多 agent session 和 session 切换

完整 PRD 见 `docs/product-requirements.md`，版本边界见 `docs/roadmap.md`。

## 当前仓库说明

这个仓库一开始被做成了 AgentDock dashboard 原型。从现在开始，项目方向调整为 Agent Island：一个面向 CLI AI coding agent 的副屏状态岛。
