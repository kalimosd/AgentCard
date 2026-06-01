# Agent Island PRD v0.1

## 产品一句话

Agent Island 是一个放在桌面副屏或平板上的 AI agent 状态岛，让用户不用盯 terminal，也能知道 AI 正在做什么、是否需要介入、花了多少 token 和 cost。

## 背景

开发者使用 Codex CLI、Claude Code、Gemini CLI 等 AI coding agent 时，经常把任务交出去后切到别的窗口工作。但 agent 可能会等待确认、跑错命令、测试失败、卡住或消耗大量 token。

现有信息都藏在 terminal 里，用户需要频繁切回查看。这会打断注意力，也让后台运行的 agent 不够可靠。

Agent Island 的目标是把这些状态从主屏幕中“拿出来”，变成一个常驻桌面状态设备。

参考产品：

- [CodeIsland](https://github.com/wxtsky/CodeIsland)
- [AgentGlance](https://github.com/hezi/AgentGlance)
- [CodexIsland](https://github.com/ericjypark/codex-island)

## 目标用户

第一阶段只服务一类人：

使用 CLI AI coding agent 的开发者和 AI-heavy builder。

典型用户特征：

- 经常使用 Codex CLI、Claude Code、Gemini CLI 或类似工具
- 一天内会跑多个开发任务
- 不想一直盯 terminal
- 关心 token、cost、额度和任务状态
- 愿意用平板或小屏幕做桌面辅助屏

## 核心用户问题

Agent Island 要回答：

1. Agent 现在是不是还在工作？
2. 它正在做什么？
3. 它是不是在等我确认或回答？
4. 它成功了还是失败了？
5. 这次任务大概烧了多少 token？
6. 今天总共花了多少钱？

## 产品形态

MVP 阶段不做定制硬件。

```text
Mac 本地服务
+ Terminal Agent Wrapper
+ 小米平板浏览器或 HDMI 小副屏
+ WebSocket 实时状态同步
```

用户使用方式：

```text
Mac 上运行 island server
小米平板打开 Agent Island 页面
用 island run codex 启动 agent
平板显示 Agent Island
需要介入时再跳回 terminal
```

## MVP 功能范围

第一版只做三个模块。

### 模块 A：常驻状态岛

状态岛是主界面。它应该能在副屏上一眼看懂。

状态包括：

- `idle`：空闲，没有活跃 agent session
- `starting`：agent 启动中
- `thinking`：agent 正在思考或规划
- `reading`：agent 正在读取文件或上下文
- `editing`：agent 正在修改文件
- `running_command`：agent 正在执行命令
- `waiting_approval`：agent 正在等待权限确认
- `waiting_input`：agent 正在等待用户回答
- `completed`：任务完成
- `failed`：任务失败或异常退出

显示字段：

- Agent 名称，例如 Codex、Claude、Gemini
- 当前项目名
- 当前状态
- 已运行时间
- 最近动作
- 最后一条摘要
- 小角色或动画状态

设计约束：

- 状态岛应该有生命感，但不能吵。
- 当前状态优先级高于长日志。
- 优先适配横屏平板。
- 避免变成密集 dashboard。

### 模块 B：介入卡片

当 agent 需要用户注意时，状态岛展开为介入卡片。

MVP 提醒场景：

- agent 等待权限确认
- agent 等待用户输入
- 命令执行失败
- 测试失败
- 任务完成

MVP 操作：

- `Jump Back`：跳回对应 terminal
- `Dismiss`：忽略提醒
- `Mark Done`：标记已处理

MVP 不做：

- 从平板 approve 或 deny 命令
- 从平板 quick reply 给 agent
- 替代 terminal 交互

### 模块 C：Token / Cost 面板

用量需要可见，但它是辅助信息，不是主界面中心。

MVP 字段：

- 当前 session 估算 token
- 今日估算 token
- 今日 cost
- 当前模型，如果能识别
- 是否异常消耗

规则：

- 如果用量来自输出推断，而不是 provider API，必须标记为 `estimated`。
- 如果 CLI 不暴露精确数据，不承诺精确 cost。
- Provider Usage / Costs API 可以在状态岛可用后再接入。

## 核心用户流程

```text
用户启动 island server
-> 小米平板打开 Agent Island 页面
-> 用户运行 island run codex
-> 小岛显示 Codex 正在工作
-> Codex 执行命令 / 修改文件 / 等待确认
-> 小岛更新状态
-> 需要用户时弹出介入卡片
-> 用户点击 Jump Back 回到 terminal
-> 任务完成
-> 小岛显示完成摘要和本次用量
```

## 不做范围

MVP 暂时不做：

- 定制硬件
- Apple Watch App
- 多设备同步
- 插件市场
- 复杂主题系统
- 真正替用户 approve / deny
- 从平板 quick reply
- 多 agent 编排
- 完整历史分析
- 精确计费承诺

## 技术方案

### 前端

- React 或 Next.js
- 横屏平板优先
- v0.1 可以使用固定 demo 尺寸
- 通过 WebSocket 接收实时状态
- 增加 session 列表前，先围绕一个主 agent session 设计

### 后端

- Node.js 本地服务
- WebSocket 推送状态
- MVP 使用本地内存存储
- v0.1-v0.2 不需要数据库

### Agent 接入

Agent Island 通过 wrapper 包装现有 CLI：

```bash
island run <command>
```

wrapper 监听：

- `stdout`
- `stderr`
- 进程生命周期
- exit code
- 可识别的输出模式

wrapper 把观察到的信息转换为标准事件。

事件格式示例：

```json
{
  "agent": "codex",
  "project": "agent-island-demo",
  "state": "running_command",
  "message": "Running npm test",
  "timestamp": 1760000000000
}
```

初始事件状态应该少而可靠。只有当 wrapper 能稳定识别时，才增加更细颗粒度的状态。

## 成功指标

Demo 成功标准：

- 用户能在平板或副屏上实时看到 agent 状态变化
- 用户不需要频繁切回 terminal 确认 agent 是否还在工作
- 等待确认、失败、完成时能被明显提醒
- 至少 3 个真实使用者愿意连续使用 3 天
- 用户能说清楚“这个东西帮我少看 terminal”

## 产品判断

这个产品第一阶段卖点不是“副屏”。

真正的核心是让 AI agent 变成一个可被观察、可被管理、会在需要时叫你的桌面工作对象。硬件只是承载，状态采集、介入提醒和用量可视化才是产品核心。
