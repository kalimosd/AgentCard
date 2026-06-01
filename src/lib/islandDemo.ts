import type {
  CurrentTool,
  InterventionCard,
  IslandSnapshot,
  IslandState,
  ToolKind
} from "../types";

export const stateLabels: Record<IslandState, string> = {
  idle: "空闲",
  starting: "启动中",
  thinking: "思考中",
  reading: "读取文件",
  editing: "修改文件",
  running_command: "执行命令",
  waiting_approval: "等待确认",
  waiting_input: "等待回答",
  completed: "已完成",
  failed: "失败"
};

export const toolKindLabels: Record<ToolKind, string> = {
  bash: "Bash",
  read: "Read",
  edit: "Edit",
  think: "Think",
  none: "—"
};

export function formatCurrentTool(tool: CurrentTool): string {
  if (tool.kind === "none") return "—";
  return `${toolKindLabels[tool.kind]}: ${tool.label}`;
}

export function formatElapsed(ms: number): string {
  if (ms <= 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatQuotaReset(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function getElapsedMs(snapshot: IslandSnapshot, now: number): number {
  if (snapshot.sessionStartedAt <= 0) return 0;
  return Math.max(0, now - snapshot.sessionStartedAt);
}

export function hasIntervention(card?: InterventionCard): boolean {
  return Boolean(card);
}

export function nextScenarioIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function isWorkingState(state: IslandState): boolean {
  return [
    "starting",
    "thinking",
    "reading",
    "editing",
    "running_command"
  ].includes(state);
}

export function formatTokens(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(value);
}

export function quotaTone(percent: number): "ok" | "warn" | "critical" {
  if (percent >= 85) return "critical";
  if (percent >= 65) return "warn";
  return "ok";
}
