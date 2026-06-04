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

export type InteractionQueueName =
  | "permissions"
  | "questions"
  | "plans"
  | "attention";

export type InteractionKind = "permission" | "question" | "plan" | "attention";

export type PermissionDecision = "allow" | "always" | "deny";

export interface CurrentTool {
  kind: ToolKind;
  label: string;
}

export interface JumpBackContext {
  cwd?: string;
  command?: string[];
  terminalHint?: string;
  editorHint?: string;
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
  interactions?: InteractionQueues;
  jumpBack?: JumpBackContext;
}

export interface InterventionCard {
  kind: InterventionKind;
  interactionKind?: InteractionKind;
  title: string;
  detail: string;
  payload: string;
  permissionId?: string;
  questionId?: string;
  answerMode?: "label" | "choice";
  actions?: PermissionDecision[];
  options?: string[];
  questions?: QuestionGroup[];
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  optionIndex: number;
}

export interface InteractionRecord {
  id: string;
  kind: InteractionKind;
  title: string;
  detail: string;
  payload: string;
  actions?: PermissionDecision[];
  options?: string[];
  permissionId?: string;
  questionId?: string;
  answerMode?: "label" | "choice";
  questions?: QuestionGroup[];
}

export interface QuestionGroup {
  question: string;
  options: string[];
}

export interface InteractionQueues {
  permissions: InteractionRecord[];
  questions: InteractionRecord[];
  plans: InteractionRecord[];
  attention: InteractionRecord[];
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
