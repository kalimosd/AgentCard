# Agent Island Roadmap

这份路线图用于确保 Agent Island 始终聚焦在 CLI AI coding agent 的副屏状态岛，而不是继续扩张成通用 dashboard。

## v0.1：假数据 Demo

目标：验证平板 UI 和产品形态。

要做：

- 横屏平板优先的状态岛 UI
- 模拟 agent 状态变化
- 模拟介入卡片
- 模拟 token / cost 面板
- 明确区分工作中、等待、失败、完成状态

不做：

- 真实 terminal wrapper
- 真实 CLI 输出解析
- 真实 provider usage API 接入
- 多 session 管理
- 数据库存储

验收标准：

- 产品可以在平板浏览器上演示。
- 旁观者能在几秒内看懂 agent 正在做什么。
- 等待、失败、完成状态有明显视觉提醒。
- UI 不像通用 dashboard。

## v0.2：Terminal Wrapper

目标：把状态岛连接到真实 CLI 进程。

要做：

- `island server` 本地服务
- `island run <command>` wrapper
- 监听子进程 `stdout`、`stderr` 和 exit code
- 通过 WebSocket 推送事件到 UI
- 基于进程生命周期和输出做基础状态推断

预期命令：

```bash
island run codex
```

标准事件格式：

```json
{
  "agent": "codex",
  "project": "agent-island-demo",
  "state": "running_command",
  "message": "Running npm test",
  "timestamp": 1760000000000
}
```

验收标准：

- 启动被 wrapper 包装的 agent 后，状态岛会更新。
- 命令执行和进程退出会更新状态岛。
- 即使只有粗颗粒度状态，UI 仍然有用。

## v0.3：真实提醒

目标：在 agent 需要用户注意时提醒用户。

要做：

- 识别权限确认提示
- 识别用户输入提示
- 识别命令失败
- 识别测试失败
- 识别任务完成
- 介入卡片状态
- `Jump Back`、`Dismiss`、`Mark Done` 操作

不做：

- 从平板 approve 或 deny
- 从平板 quick reply
- 命令失败后的自动修复

验收标准：

- agent 等待、失败或完成时，状态岛能明显叫回用户。
- `Jump Back` 能帮助用户回到对应 terminal 上下文。
- 忽略提醒不会终止 agent 进程。

## v0.4：用量面板

目标：让 token 和 cost 可见，但不承诺无法保证的精确性。

要做：

- 当前 session token 估算
- 今日 token 估算
- 今日 cost 字段
- 当前模型识别，如果可行
- 异常消耗提醒
- 推断值明确标记为 `estimated`

可能接入：

- CLI 输出解析
- OpenAI Usage API
- OpenAI Costs API
- 其他提供可靠用量数据的 provider API

验收标准：

- 用户能看到当前 session 的大致用量。
- UI 能明确区分估算值和精确值。
- 高消耗能触发明显提醒。

## v0.5：多 Agent Session

目标：支持同时运行多个 agent 任务的用户。

要做：

- 多 session 列表
- 当前活跃 session 选择
- 每个 session 的状态、已运行时间、最近动作和用量
- 聚合今日用量
- 跨 session 的待介入数量

约束：

- 状态岛仍然聚焦当前选中的活跃 session。
- session 列表不能变成密集 dashboard。
- 多 agent 编排仍然不在范围内。

验收标准：

- 用户可以在活跃 session 之间切换。
- 需要介入的 session 能一眼看到。
- 被选中的 session 仍然是主状态岛。

## 产品护栏

做实现决策时遵守这些原则：

- 实时状态优先于历史分析。
- 一个一眼能懂的主状态优先于多个平权面板。
- 介入提醒优先于完整远程控制。
- 可靠的粗颗粒度识别优先于脆弱的细颗粒度识别。
- 推断出来的 token 和 cost 必须标记为估算。
- 单 agent 状态岛真正有用之前，不加编排能力。

## 当前重定位任务

现有原型一开始被做成了 AgentDock dashboard。在继续做功能前，先把项目方向统一为 Agent Island：

- 根目录 README 应该描述 Agent Island，而不是 dashboard。
- PRD 应该定义产品承诺、MVP 模块、不做范围和成功指标。
- 后续 UI 应移除不服务于实时 agent 可观察性的通用 dashboard 概念。
