export type AgentKind = "codex" | "claude" | "gemini";

export type IslandState =
  | "idle"
  | "starting"
  | "thinking"
  | "reading"
  | "editing"
  | "running_command"
  | "waiting_approval"
  | "waiting_input"
  | "completed"
  | "failed";

export type ToolKind = "bash" | "read" | "edit" | "think" | "none";

export type InterventionKind =
  | "waiting_approval"
  | "waiting_input"
  | "command_failed"
  | "test_failed"
  | "completed";

export interface CurrentTool {
  kind: ToolKind;
  label: string;
}

export interface EventTailItem {
  time: string;
  text: string;
}

export interface IslandSnapshot {
  agent: AgentKind;
  agentLabel: string;
  project: string;
  sessionTitle: string;
  taskPrompt: string;
  state: IslandState;
  recentAction: string;
  lastSummary: string;
  currentTool: CurrentTool;
  eventTail: EventTailItem[];
  model: string;
  sessionStartedAt: number;
  usage: UsageSnapshot;
  intervention?: InterventionCard;
}

export interface InterventionCard {
  kind: InterventionKind;
  title: string;
  detail: string;
  payload: string;
  options?: string[];
}

export interface UsageSnapshot {
  sessionTokens: number;
  sessionTokensEstimated: boolean;
  todayTokens: number;
  todayCostUsd: number;
  quota5hPercent: number;
  quotaResetMinutes: number;
  abnormal: boolean;
}
