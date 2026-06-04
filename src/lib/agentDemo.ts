import type {
  AgentSnapshot,
  AgentState,
  CurrentTool,
  InterventionCard
} from "../types";

export const stateLabels: Record<AgentState, string> = {
  idle: "待命",
  starting: "启动中",
  thinking: "思考中",
  reading: "读取中",
  editing: "编辑中",
  running_command: "执行命令",
  waiting_approval: "等待权限",
  waiting_input: "等待输入",
  completed: "已完成",
  failed: "失败"
};

export function formatTokens(count: number): string {
  if (count === 0) return "—";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

export function formatElapsed(ms: number): string {
  if (ms <= 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatQuotaReset(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function getElapsedMs(snapshot: AgentSnapshot, now: number): number {
  if (!snapshot.sessionStartedAt) return 0;
  return Math.max(0, now - snapshot.sessionStartedAt);
}

export function isWorkingState(state: AgentState): boolean {
  return !["idle", "waiting_approval", "waiting_input", "completed", "failed"].includes(state);
}

export function hasIntervention(intervention?: InterventionCard): boolean {
  return Boolean(intervention);
}

export function formatCurrentTool(tool: CurrentTool): string {
  if (tool.kind === "none") return "—";
  const kindLabels: Record<string, string> = {
    bash: "Bash",
    read: "Read",
    edit: "Edit",
    think: "Think"
  };
  const prefix = kindLabels[tool.kind] ?? tool.kind;
  return `${prefix}: ${tool.label}`;
}

export function quotaTone(percent: number): "ok" | "warn" | "critical" {
  if (percent >= 90) return "critical";
  if (percent >= 70) return "warn";
  return "ok";
}

export function nextScenarioIndex(current: number, total: number): number {
  return (current + 1) % total;
}
