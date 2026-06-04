import type { IslandSnapshot } from "../types";

const baseUsage = {
  sessionTokensEstimated: true,
  todayTokens: 84200,
  todayCostUsd: 2.47,
  quota5hPercent: 42,
  quotaResetMinutes: 134,
  abnormal: false
};

const started = (offsetMs: number) => Date.now() - offsetMs;

export const islandScenarios: IslandSnapshot[] = [
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "未启动",
    taskPrompt: "等待用户通过 agentcard run codex 启动当前 agent session",
    state: "idle",
    recentAction: "等待启动命令",
    lastSummary: "当前没有活跃 agent；状态岛保持安静待命。",
    currentTool: { kind: "none", label: "—" },
    eventTail: [{ time: "—", text: "Idle: waiting for agentcard run codex" }],
    model: "gpt-5-codex",
    sessionStartedAt: 0,
    usage: { ...baseUsage, sessionTokens: 0, quota5hPercent: 18 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "启动 AgentCard demo",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "starting",
    recentAction: "Spawn: codex CLI",
    lastSummary: "Codex 已启动，正在加载当前项目上下文。",
    currentTool: { kind: "bash", label: "agentcard run codex" },
    eventTail: [
      { time: "23:40:01", text: "Spawn: codex CLI" },
      { time: "23:40:02", text: "Load workspace agentcard-demo" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(4000),
    usage: { ...baseUsage, sessionTokens: 120, quota5hPercent: 19 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "收敛 v0.1 信息层",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "thinking",
    recentAction: "Think: 规划状态、摘要和介入节奏",
    lastSummary: "正在判断哪些字段应该留在主岛，哪些信息只作为辅助 tail。",
    currentTool: { kind: "think", label: "规划 UI 字段与事件 tail" },
    eventTail: [
      { time: "23:40:18", text: "Read: docs/product-requirements.md" },
      { time: "23:40:24", text: "Read: src/App.tsx" },
      { time: "23:40:31", text: "Think: remove dashboard drift" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(28000),
    usage: { ...baseUsage, sessionTokens: 2400, quota5hPercent: 24 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "读取当前实现",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "reading",
    recentAction: "Read: src/types.ts",
    lastSummary: "发现 v0.1 数据里还有辅助列表噪音，需要收敛为单个主状态。",
    currentTool: { kind: "read", label: "src/types.ts" },
    eventTail: [
      { time: "23:40:35", text: "Read: src/types.ts" },
      { time: "23:40:41", text: "Read: src/data/islandScenarios.ts" },
      { time: "23:40:48", text: "Read: src/App.tsx" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(52000),
    usage: { ...baseUsage, sessionTokens: 4100, quota5hPercent: 28 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "更新状态岛 demo",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "editing",
    recentAction: "Edit: src/App.tsx",
    lastSummary: "正在把顶部提醒和辅助列表改成当前 session 的最近动作与摘要。",
    currentTool: { kind: "edit", label: "src/App.tsx" },
    eventTail: [
      { time: "23:41:02", text: "Edit: src/types.ts" },
      { time: "23:41:15", text: "Edit: src/data/islandScenarios.ts" },
      { time: "23:41:28", text: "Edit: src/App.tsx" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(95000),
    usage: { ...baseUsage, sessionTokens: 6800, quota5hPercent: 35 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "运行测试",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "running_command",
    recentAction: "Bash: npm test",
    lastSummary: "Codex 正在验证状态岛数据和交互 helpers。",
    currentTool: { kind: "bash", label: "npm test" },
    eventTail: [
      { time: "23:41:40", text: "Edit complete" },
      { time: "23:41:52", text: "Bash: npm test" },
      { time: "23:41:53", text: "vitest: running islandDemo.test.ts" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(142000),
    usage: { ...baseUsage, sessionTokens: 9200, quota5hPercent: 41 }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "等待权限确认",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "waiting_approval",
    recentAction: "Permission: execute npm test",
    lastSummary: "Codex 请求执行测试，需要用户回到 terminal 确认权限。",
    currentTool: { kind: "bash", label: "npm test" },
    eventTail: [
      { time: "23:42:01", text: "Bash: npm test (awaiting approval)" },
      { time: "23:42:00", text: "Permission: execute shell command" },
      { time: "23:41:52", text: "Bash: npm test requested" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(178000),
    usage: { ...baseUsage, sessionTokens: 10800, quota5hPercent: 44 },
    intervention: {
      kind: "waiting_approval",
      title: "等待权限确认",
      detail: "Codex 请求在 agentcard-demo 目录执行测试。",
      payload: "Allow command: npm test\nCwd: ~/code/AgentCard\nRisk: executes project test suite"
    }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "命令执行失败",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "failed",
    recentAction: "Bash: npm run lint (exit 127)",
    lastSummary: "命令没有找到对应脚本，agent 需要回到 terminal 调整下一步。",
    currentTool: { kind: "bash", label: "npm run lint" },
    eventTail: [
      { time: "23:42:12", text: "Bash: npm run lint" },
      { time: "23:42:13", text: "npm ERR! Missing script: lint" },
      { time: "23:42:13", text: "Exit code: 127" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(198000),
    usage: { ...baseUsage, sessionTokens: 12100, quota5hPercent: 58 },
    intervention: {
      kind: "command_failed",
      title: "命令执行失败",
      detail: "npm run lint 没有对应脚本，Codex 需要用户回到 terminal 查看。",
      payload: "Command: npm run lint\nExit: 127\nReason: Missing script: lint"
    }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "测试失败",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "failed",
    recentAction: "Bash: npm test (exit 1)",
    lastSummary: "测试发现一个 scenario 断言失败，需要用户注意结果。",
    currentTool: { kind: "bash", label: "npm test" },
    eventTail: [
      { time: "23:42:40", text: "Bash: npm test (exit 1)" },
      { time: "23:42:41", text: "FAIL islandDemo.test.ts > scenario shape" },
      { time: "23:42:41", text: "Expected command_failed scenario" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(248000),
    usage: {
      ...baseUsage,
      sessionTokens: 15600,
      quota5hPercent: 78,
      quotaResetMinutes: 91,
      abnormal: true
    },
    intervention: {
      kind: "test_failed",
      title: "测试失败",
      detail: "1 failed · 12 passed · 221ms",
      payload:
        "FAIL  src/lib/islandDemo.test.ts > islandDemo > covers all MVP intervention card scenarios\nAssertionError: expected scenario coverage"
    }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "等待用户回答",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "waiting_input",
    recentAction: "AskUserQuestion: 选择下一步方向",
    lastSummary: "Codex 需要用户在三个方向中选择，状态岛展示选项但不代替 terminal 回复。",
    currentTool: { kind: "none", label: "awaiting user" },
    eventTail: [
      { time: "23:42:55", text: "Test failure acknowledged" },
      { time: "23:42:58", text: "AskUserQuestion: 选择下一步方向" },
      { time: "23:42:58", text: "Blocked until reply" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(265000),
    usage: { ...baseUsage, sessionTokens: 16200, quota5hPercent: 80 },
    intervention: {
      kind: "waiting_input",
      title: "等待你的回答",
      detail: "Codex 正在 terminal 里等待用户选择下一步。",
      payload:
        "Question: 请选择下一步方向。\n1. 先澄清需求边界，写一份产品规格，再进入实现计划\n2. 直接实现最小可用版本，但保留后续协议回传扩展点\n3. 暂停实现，先做 Case 1 / Case 2 的视觉方案对比",
      options: [
        "1. 先澄清需求边界，写一份产品规格，再进入实现计划",
        "2. 直接实现最小可用版本，但保留后续协议回传扩展点",
        "3. 暂停实现，先做 Case 1 / Case 2 的视觉方案对比"
      ]
    }
  },
  {
    agent: "codex",
    agentLabel: "Codex",
    project: "agentcard-demo",
    sessionTitle: "AgentCard v0.1 已对齐",
    taskPrompt: "按照 PRD 做 v0.1 假数据 demo，聚焦单个 agent 状态岛",
    state: "completed",
    recentAction: "Stop: task complete",
    lastSummary: "状态岛 demo 已聚焦单 session，并保留介入卡片和 estimated 用量。",
    currentTool: { kind: "none", label: "—" },
    eventTail: [
      { time: "23:43:20", text: "Bash: npm test (13 passed)" },
      { time: "23:43:22", text: "Bash: npm run build" },
      { time: "23:43:28", text: "Stop: task complete" }
    ],
    model: "gpt-5-codex",
    sessionStartedAt: started(312000),
    usage: { ...baseUsage, sessionTokens: 18400, quota5hPercent: 83 },
    intervention: {
      kind: "completed",
      title: "任务完成",
      detail: "v0.1 demo 已回到单个主状态岛。",
      payload:
        "Done: 单 session 状态岛\nSession: ~18.4k tokens (estimated)\nNext: v0.2 AgentCard server + wrapper"
    }
  }
];

export const DEMO_STEP_MS = 4500;
