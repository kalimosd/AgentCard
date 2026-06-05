# AgentCard 路线图

更新日期：2026-06-02

这份路线图用于保持 AgentCard 聚焦：它是 CLI coding agent 的副屏控制面，不是通用 dashboard。核心闭环是：观察当前 agent、识别正确介入类型、让用户安全回应、必要时跳回 terminal。

## v0.1：产品方向对齐 Demo

状态：已作为浏览器 demo 基线实现。

目标：证明单一主 agent 状态岛比多 session dashboard 更清晰。

范围：

- 横屏平板优先 UI
- 单一主 agent snapshot
- 模拟生命周期状态
- 模拟介入卡片
- estimated token / cost 面板
- 不暴露 `otherSessions`
- 不需要真实 wrapper
- 不要求 WebSocket

验收：

- 首屏能立即传达当前 agent 状态
- 等待、失败、完成状态有明显视觉差异
- event tail 是辅助信息，不是主产品
- UI 不像通用运维 dashboard

## v0.2：本地 Server 与 Terminal Wrapper

状态：当前 feature branch 已部分实现。

目标：把小岛连接到真实 CLI 进程，同时不改变用户原本 terminal 的使用方式。

范围：

- `agentcard server`
- `agentcard run <command>`
- 本地托管构建后的 UI
- `/health` 和 `/snapshot`
- WebSocket snapshot 更新
- 进程 start / output / exit 事件
- wrapped command 退出时正确显示 completed / failed

不做：

- 精确 terminal 文本解析
- native app
- 远程控制
- 自动 approve
- 多 session dashboard

验收：

- 使用 wrapper 启动 agent 后，小岛状态会变化
- 进程退出能生成 completed 或 failed
- 需要 TTY 的交互式 agent 仍保留真实 terminal
- 小岛 server 不运行时，不影响用户直接使用原 CLI

## v0.3：Claude Code Hook Bridge

状态：已有实验实现；下一步要产品化并收敛边界。

目标：读取真实 Claude Code 生命周期事件，并展示准确的注意力状态。

范围：

- 安全安装 `.claude/settings.json` hooks
- hook process 从 stdin 读取 JSON
- 支持 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`PostToolUseFailure`、`PermissionRequest`、`Notification`、`Stop`、`SessionEnd`
- 标准化 event model
- 通用 notification 不覆盖详细可操作卡片
- 小岛不可用时 fail open

重要修正：

hook bridge 不应长期把每个 `PreToolUse` 都当成权限请求。这样会导致过度打扰，并扭曲 Claude Code 原生 permission policy。它可以作为 live test 临时 fallback，但正式产品应区分：

- 工具活动
- 原生权限请求
- hook 驱动的权限请求
- 结构化用户问题
- 计划审阅
- notification-only 注意力提示

验收：

- Claude Code 活动无需 terminal scraping 即可改变小岛状态
- 权限 notification 不会覆盖详细权限卡片
- 失败和会话结束可见
- AgentCard 离线时，Claude Code 原生 terminal prompt 仍可工作

## v0.4：Typed Interaction Queues

状态：下一步推荐里程碑。

目标：用 typed queues 替代单一 generic intervention。

范围：

- `PermissionQueue`
- `QuestionQueue`
- `PlanQueue`
- `AttentionQueue`
- 最近诊断 event log
- 权限、问题、计划、失败、完成的独立 UI 卡片
- 显式用户决策 API
- queue 顺序和卡片保留测试

权限卡片：

- 显示工具名和目标预览
- `Yes`
- `Always` 仅在存在安全 session-scoped 权限更新时显示
- `No`
- `Jump Back`

问题卡片：

- 显示原始问题
- 渲染选项
- 支持 `AskUserQuestion` 单选选项从小岛回传
- 支持 idle prompt 文本中的 `1 / 2 / 3`、`A / B / C` 选择从小岛回传
- 支持 `ExitPlanMode` 批准类选择从小岛回传
- 支持多选（后续）
- 支持自由输入（后续）
- 不把选择题叫做权限

计划卡片：

- 将 `ExitPlanMode` 和类似流程从普通工具权限中拆出
- 协议支持时提供 approve / jump back；文字反馈仍回 terminal

验收：

- `Read` 权限提示能在协议支持时显示正确 `Yes / Always / No`
- skill 的 `1 / 2 / 3` 方向选择能显示为问题卡片，并可在协议支持时点选回传
- 通用 `Notification` 不能覆盖可操作权限或问题
- 测试覆盖 allow、always、deny、question options、plan review、failure、completion、server unavailable fallback

## v0.5：用量与 Session Memory

目标：让 cost 可见，但不让产品变成账单 dashboard。

范围：

- 解析 Claude Code JSONL transcript 做 session token 估算
- 识别当前模型（如果可行）
- 显示 session tokens、today tokens、estimated cost
- 推断值标记 `estimated`
- 高消耗 attention state
- 可选本地 daily cache

不做：

- 精确账单承诺
- hosted analytics
- 复杂历史报表

验收：

- 用户能看到当前 session 的方向性用量
- UI 明确区分估算值和精确值
- 用量信号不压过主状态岛

## v0.6：Jump Back

目标：让小岛可行动，但不变成 terminal。

范围：

- 从 hook 或 wrapper 元数据保存 terminal / editor 上下文
- 尽可能跳回项目 terminal
- 有稳定标识时跳回精确 pane / window / tab
- 无法精确定位时 fallback 到打开项目或编辑器

潜在集成：

- iTerm2
- Terminal.app
- Ghostty
- tmux
- Zellij
- VS Code / Cursor project open

验收：

- `Jump Back` 能可靠把用户带回接近阻塞 agent 的上下文
- 无法精确定位时可见且无害
- 不在用户没有点击时抢焦点

## v0.7：Multi-Session Lite

目标：支持多 agent 用户，但仍保持一个主状态岛。

范围：

- 紧凑 session 列表
- active session 选择
- 每个 session 的状态和 attention badge
- 聚合 needs-attention 数量
- 不做项目管理 dashboard

验收：

- 用户能识别哪个 session 需要注意
- 选择 session 后主状态岛切换
- 主状态岛仍然视觉占主导

## 产品护栏

- 优先使用真实 hook event，不优先做 terminal 文本 scraping。
- 优先 typed interactions，不用 generic waiting label 糊住所有场景。
- 优先 fail open，不让小岛离线阻塞 agent。
- 先做好一个 active session，再做多 session。
- 优先本地优先，不急于云同步。
- 用量宁可估算并标注，也不要假精确。
- 任何 approve 都必须来自用户显式选择。

## 立即下一步实现建议

下一轮工程应聚焦 v0.4：

1. 在 server 引入 typed interaction records。
2. 增加 diagnostic event log endpoint。
3. 前端拆分 permission card 与 question card。
4. 将 `AskUserQuestion` 和 question-like payload 映射进 `QuestionQueue`。
5. 把 blanket `PreToolUse` permission gating 收敛到显式模式或 matcher。
6. 先补测试，再继续改 hook 行为。
7. 跑 `npm test` 和 `npm run build`。

## Push 前 TODO

- [ ] 修正权限超时决策：`permissionStore` 超时状态必须与 hook 决策枚举一致，不能让 timeout/unknown status 被误判为 allow。
- [x] 修正交互 API 结果处理：前端必须检查响应 body 的 `ok`，或者 server 对 `ok: false` 返回 4xx，避免 stale / duplicate id 被显示成成功。（`skipQuestion` 已加 `response.ok` 检查）
- [ ] 为 question / permission 提交增加 pending 防重入状态，避免重复点击产生虚假反馈。
- [x] 清理未使用的 `postObservedEvent`，确认是否仍需要普通观察事件上报路径。（已删除）
- [ ] 决定 `playwright-core` 的定位：要么补一个可重复的浏览器 QA 脚本，要么移除临时 QA 依赖。
- [ ] 处理 `npm audit` 发现的 dev dependency 漏洞；当前自动修复需要强制升级 Vitest，需单独评估兼容性。
- [x] 收紧本地 server 暴露面：确认 diagnostics 是否需要默认开放，必要时补充敏感字段脱敏和 origin 限制。（默认 bind 127.0.0.1，错误脱敏，HTTP 超时，body 限制）
- [x] Push 前整理资源文件：确认根目录 `happy.png` / `confused.png` / `angry.png` 是否需要保留；当前应用使用的是 `src/assets/beaver-*.png`。（根目录无遗留 PNG）
