# Agent Island 产品需求文档

更新日期：2026-06-02

## 一句话定义

Agent Island 是一个本地优先的 CLI coding agent 副屏控制面。它让开发者在不盯 terminal 的情况下，知道当前 agent 在做什么、为什么需要介入、该用哪种方式介入，并在需要完整上下文时跳回对应 terminal。

## 产品定位

Agent Island 不是通用 dashboard，也不是 terminal 替代品。它是一个常驻的「agent 注意力岛」：当开发者把 Claude Code、Codex CLI、Gemini CLI 或类似工具交给后台工作后，小岛负责让 agent 的状态、阻塞点和关键选择浮出水面。

产品应该让 AI coding agent 像一个可被观察的桌面协作者：

- 工作中可见
- 健康时安静
- 卡住时明确叫你
- 要权限时足够安全
- 需要深上下文时回到 terminal

第一阶段真实接入以 Claude Code 为主，因为 Claude Code hooks 能暴露生命周期、工具调用、权限、问题、通知等事件。Codex CLI 和 Gemini CLI 作为长期兼容方向，但 v0.2-v0.4 的产品验证以 Claude Code 为准。

## 用户问题

开发者使用 CLI agent 时，经常启动任务后切回其他窗口工作。agent 可能在后台：

- 等待权限确认
- 问一个选择题，例如某个 skill 给出 `1 / 2 / 3` 三个方向
- 等待自由文本输入
- 要求审阅计划
- 执行命令或测试失败
- 完成后安静停住
- 消耗 token 超出预期

这些信息通常都藏在 terminal 中。用户只能不断切回去看 agent 是在工作、卡住、失败，还是已经完成。Agent Island 要减少这种注意力浪费。

## 目标用户

第一批用户是高频使用 AI coding agent 的 macOS 开发者。

典型特征：

- 每天使用 Claude Code、Codex CLI、Gemini CLI、OpenCode 或类似工具
- 经常让 agent 跑较长的开发任务
- 不想频繁检查 terminal
- 希望明确看到权限、问题、失败和完成状态
- 愿意把平板、小屏幕、HDMI 副屏或浏览器窗口作为辅助显示
- 更信任本地优先工具，不希望 transcript 默认上传云端

## 核心 Jobs

1. 当我把 agent 放到后台运行时，我想知道它是不是还在工作，这样不用反复切回 terminal。
2. 当 agent 需要我介入时，我想知道它到底需要权限、回答、计划审阅、还是失败处理。
3. 当出现权限请求时，我想看到和 Claude Code terminal 中语义一致的 `Yes / Always / No`。
4. 当 agent 问选择题时，我想看到真实选项，而不是被误判成权限请求。
5. 当 agent 失败或完成时，我想看到简洁摘要，并能快速回到对应 terminal。
6. 当 token 或 cost 明显升高时，我想看到轻量提示，但不希望主界面变成账单页。

## 真实测试后的关键学习

早期 demo 把所有阻塞状态都压成「等待确认」。真实 Claude Code 环境更复杂：

- 工具权限可能显示 `Yes`、`Always`、`No`。
- 有些 terminal 中可见的授权提示只会经过 `PreToolUse` 和 `Notification`，不一定总有完整 `PermissionRequest`。
- `AskUserQuestion` 不是权限请求。它可能包含多个问题、选项、多选、自由输入和 Other。
- Plan review、skill 方向选择、权限确认、idle 输入、命令失败，都应该是不同卡片。
- 通用通知，例如 `Claude needs your permission`，可能晚于更详细的工具事件到达，不能覆盖已经可操作的卡片。

产品结论：Agent Island 需要一个「交互模型」，而不只是一个 `waiting_approval` 状态。

## 产品原则

- 当前状态优先于日志。用户几秒内要知道 agent 在干什么。
- 介入必须分类型。权限、问题、计划、失败、完成不是同一种交互。
- fail open。Agent Island 离线时，Claude Code 应回退到原生 terminal 行为。
- 不静默批准。小岛只能传递用户明确选择，不能替用户自动 approve。
- terminal 仍是权威上下文。小岛帮助介入，但不抢 terminal 的职责。
- 本地优先。server、hooks、WebSocket、短期状态默认留在用户本机。
- 用量估算必须标记 `estimated`。不对无法保证的数据承诺精确。
- 先做好单一主 agent。多 session 有价值，但不能让早期产品变回密集 dashboard。

## 产品体验形态

```text
Claude Code / CLI agent
  -> hook 或 wrapper 事件
  -> 本地 Agent Island server
  -> 标准化 session + interaction queues
  -> WebSocket snapshot
  -> 平板 / 浏览器小岛 UI
  -> 用户显式选择（可选）
  -> hook response 回传给 agent
```

主界面仍然是一个强主次关系的单一状态岛：

- agent 与项目
- 当前状态
- 已运行时间
- 当前工具或阶段
- 最近动作
- 最后摘要
- token / cost 估算
- 需要注意时显示一个主介入卡片
- event tail 只作为辅助诊断信息

## 核心状态模型

`IslandSnapshot` 可以继续作为前端渲染快照，但 server 内部应该逐步改为更精确的队列模型。

建议模型：

- `SessionState`：当前 agent 生命周期、展示摘要、项目、模型、用量。
- `PermissionQueue`：可以 `allow`、`always`、`deny` 的权限请求。
- `QuestionQueue`：来自 `AskUserQuestion`、`Elicitation` 或类似协议的结构化问题。
- `PlanQueue`：计划审阅、方向选择、`ExitPlanMode` 等。
- `AttentionQueue`：terminal-only 的失败、完成、idle prompt、异常用量。
- `EventLog`：最近原始/标准化事件，用于解释为什么卡片出现或没有出现。

前端可以一次只渲染一个主介入卡片，但数据层不要把所有事情都折叠成 `waiting_approval`。

## 介入卡片类型

### 权限卡片

用于 agent 请求运行命令、读取文件、写入文件、联网、编辑或调用需要授权的工具。

操作：

- `Yes`：只允许本次请求。
- `Always`：仅当 Claude Code 提供安全的 session-scoped permission update 时，允许当前 session 内匹配规则。
- `No`：拒绝本次请求。
- `Jump Back`：回到 terminal 查看完整上下文。

要求：

- 展示工具名和目标预览。
- Bash 展示命令，Read 展示文件路径，Edit/Write 展示文件或 diff 摘要。
- 没有可靠 session 权限规则时，不显示 `Always`。
- 如果小岛无法安全回传决策，显示 `Jump Back`，不要编造按钮。

### 问题卡片

用于 agent 提出选择题或输入题，例如 skill 给出 `1 / 2 / 3` 三个方向。

操作：

- 渲染 payload 中的选项
- 单选选项可在小岛上点击并回传（当前覆盖 `AskUserQuestion`、`ExitPlanMode` 批准类选择，以及 idle prompt 文本里的 `1 / 2 / 3`、`A / B / C` 选择）
- 支持自由输入（后续协议闭环）
- 支持多选（后续协议闭环）
- `Jump Back`
- 非阻塞通知可 `Dismiss`

要求：

- 不能叫「权限确认」。
- 保留原始问题文案和选项。
- 只有当 integration 能满足协议时，才从小岛回传结构化答案。
- 不能把计划审阅或文字反馈伪装成普通 `1 / 2 / 3` 回答。

### 计划审阅卡片

用于 agent 请求离开计划模式、批准计划、选择执行方向或要求用户确认下一步。

操作：

- approve plan
- request changes / provide feedback（如果协议支持）
- `Jump Back`

早期可以实现为特殊的问题卡片，但产品语义上应独立。

### 失败卡片

用于工具、命令或测试失败。

操作：

- `Jump Back`
- `Dismiss`
- `Mark Done`

要求：

- 展示失败工具/命令和简短错误预览。
- 早期不做自动修复。

### 完成卡片

用于 agent 完成 turn 或 session。

操作：

- `Jump Back`
- `Dismiss`
- `Mark Done`

要求：

- 展示完成摘要和本次用量估算。
- 对很小、无动作价值的完成 turn 避免频繁打扰。

## MVP 模块

### 模块 A：状态岛

状态：

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

展示字段：

- agent 名称
- 项目
- session title 或首条 prompt 摘要
- 当前状态
- 已运行时间
- 当前工具
- 最近动作
- 最后摘要
- compact event tail
- token / cost 估算

设计约束：

- 横屏平板优先，桌面浏览器可用。
- 首屏必须一眼看出当前 agent 状态。
- 日志只能是辅助信息。
- 单 session 价值验证前，不做多面板 dashboard。

### 模块 B：本地实时 server

职责：

- 托管浏览器 UI
- 接收 agent 事件
- 标准化事件为 snapshot
- 通过 WebSocket 推送状态
- 提供当前 snapshot 供 polling / debug
- 在内存中维护短生命周期交互队列
- server 不可用时让 agent 回退原生行为

现有 `/events` 和 `/permissions` 可以继续演进，但产品层应抽象成 interaction API。

### 模块 C：Claude Code hook bridge

职责：

- 安全安装项目级或用户级 hooks
- 从 stdin 读取 hook JSON
- 映射 hook event 到 Agent Island event
- 只在合适场景等待用户显式决策
- 输出合法 Claude Code hook response
- 小岛不可用时保持 Claude Code 原生 terminal 行为

关键 hook 区分：

- `PreToolUse`：每次匹配工具调用前触发，可以返回 `permissionDecision`。
- `PermissionRequest`：Claude Code 即将展示权限对话框时触发。
- `Notification`：可能表示等待输入或权限，但细节可能不足。
- `AskUserQuestion` / `Elicitation`：需要结构化回答，不是 approve/deny。
- `ExitPlanMode`：计划审阅语义，应避免混进普通工具权限。

当前 `island claude` 安装的 Claude hook 默认启用 `ISLAND_PRETOOL_PERMISSION_MODE=gate`，用于把真实权限和结构化选择提前接入 AgentDock。通用 `Notification` 仍不可直接决策；只有服务端生成 `permissionId` 或 `questionId` 后，UI 才显示可执行按钮。

### 模块 D：Token / Cost

MVP 字段：

- 当前 session token 估算
- 今日 token 估算
- 估算 cost
- 当前模型（如果能识别）
- 高消耗提示

规则：

- 早期可以解析 Claude Code JSONL transcript。
- provider API 后续再接。
- 任何推断值都必须标记 `estimated`。

## 竞品与启发

这个方向的竞品正在从「终端文本观察」转向「hook-based agent control」。

- CodeIsland：macOS notch-native，支持 agent 状态、权限、问题、session jump、多 agent。
- AgentGlance：macOS overlay，明确强调 approve tools、answer questions、review plans。
- cctop：macOS menu bar/control-center 模式，重点是多 session 追踪和跳回精确 terminal/editor。
- tmux-agent-sidebar / tmux-agent-status：terminal-native sidebar，证明 hook 状态比纯进程轮询更可靠。
- Open Island：开源 macOS island，包含 hook bridge、session discovery、本地存储、用量、权限/问题流和多 terminal jump。

Agent Island 的差异化：

- 浏览器 / 平板 / 小副屏优先，而不是 notch-only 或 tmux-only。
- v0.1-v0.4 聚焦单一主 session 的高可读性。
- 用 Node + React 快速验证，再考虑 native app。
- 产品核心是「识别正确介入类型」，不是平铺所有 session。

## 不做范围

早期不做：

- 云同步
- hosted accounts
- 通用项目管理
- 完整 agent 编排
- 自动 approve 命令
- remote terminal 替代品
- 复杂历史分析
- 多 agent 调度
- 插件市场
- 依赖特定硬件

## 成功标准

Demo 成功：

- 旁观者 5 秒内能说出 agent 正在做什么。
- 等待、失败、完成有明显差异。
- UI 不像通用 dashboard。

真实 Claude Code 成功：

- 原生权限提示能在小岛上显示正确 `Yes / Always / No`（协议支持时）。
- 非权限选择题能显示为问题卡片，且保留真实选项。
- Agent Island 离线时，Claude Code 回退 terminal 原生提示。
- 通用通知不会覆盖详细可操作卡片。
- 至少 3 个真实用户连续使用 3 天，并认为它减少了 terminal 检查。

用量成功：

- token / cost 作为方向性信号有帮助。
- 估算值明确标记。
- 高消耗能被注意到，但不把主界面变成账单 dashboard。

## 资料链接

- Claude Code hooks reference: https://code.claude.com/docs/en/hooks
- Claude Code hooks guide: https://code.claude.com/docs/en/hooks-guide
- CodeIsland: https://github.com/wxtsky/CodeIsland
- AgentGlance: https://agentglance.app/
- cctop: https://cctop.app/
- tmux-agent-sidebar: https://github.com/hiroppy/tmux-agent-sidebar
- tmux-agent-status: https://github.com/samleeney/tmux-agent-status
- Open Island: https://github.com/Octane0411/open-vibe-island
