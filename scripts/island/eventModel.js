import path from "node:path";
import { estimateUsageFromTranscript } from "./claudeUsage.js";
import {
  applyInteraction,
  createInteractionQueues,
  selectActiveInteraction
} from "./interactions.js";

const KNOWN_AGENTS = {
  claude: { agent: "claude", agentLabel: "Claude" },
  codex: { agent: "codex", agentLabel: "Codex" },
  gemini: { agent: "gemini", agentLabel: "Gemini" }
};

export function createIdleSnapshot({ project = "Agent Island" } = {}) {
  return {
    agent: "codex",
    agentLabel: "Codex",
    project,
    sessionTitle: "未启动",
    taskPrompt: "等待通过 island run <command> 启动当前 agent session",
    state: "idle",
    recentAction: "等待启动命令",
    lastSummary: "当前没有活跃 agent；状态岛保持安静待命。",
    currentTool: { kind: "none", label: "—" },
    eventTail: [{ time: "—", text: "Idle: waiting for island run <command>" }],
    model: "unknown",
    sessionStartedAt: 0,
    interactions: createInteractionQueues(),
    usage: createEmptyUsage()
  };
}

export function createStartingEvent({ command, cwd, timestamp = Date.now() }) {
  return createEvent({
    command,
    cwd,
    timestamp,
    state: "starting",
    message: `Starting ${formatCommand(command)}`
  });
}

export function createOutputEvent({
  command,
  cwd,
  stream,
  line,
  timestamp = Date.now()
}) {
  return createEvent({
    command,
    cwd,
    timestamp,
    state: "running_command",
    message: line.trim() || `Running ${formatCommand(command)}`,
    stream
  });
}

export function createExitEvent({
  command,
  cwd,
  exitCode,
  timestamp = Date.now()
}) {
  return createEvent({
    command,
    cwd,
    timestamp,
    state: exitCode === 0 ? "completed" : "failed",
    message: `Process exited with code ${exitCode}`,
    exitCode
  });
}

export function createInteractiveSessionEvent({
  command,
  cwd,
  timestamp = Date.now()
}) {
  return createEvent({
    command,
    cwd,
    timestamp,
    state: "thinking",
    message: `Interactive ${formatCommand(command)} session (watch terminal for live output)`
  });
}

export function isInteractiveAgentCommand(command) {
  const name = path.basename(command?.[0] ?? "").toLowerCase();
  if (!(name in KNOWN_AGENTS)) return false;

  const args = command.slice(1);
  if (args.includes("-p") || args.includes("--print")) return false;
  if (args.includes("-h") || args.includes("--help")) return false;
  if (args.includes("--version") || args.includes("-V")) return false;

  return true;
}

export function eventToSnapshot(event, previous) {
  const command = event.command ?? [];
  const commandLabel = formatCommand(command);
  const project = event.project ?? projectFromCwd(event.cwd);
  const agentInfo = event.agent
    ? {
        agent: event.agent,
        agentLabel: KNOWN_AGENTS[event.agent]?.agentLabel ?? event.agent
      }
    : detectAgent(command);
  const sessionStartedAt =
    previous?.sessionStartedAt && previous.sessionStartedAt > 0
      ? previous.sessionStartedAt
      : event.timestamp;
  const recentAction = event.stream
    ? `${event.stream}: ${event.message}`
    : event.message;
  const interactions = applyInteraction(
    previous?.interactions ?? createInteractionQueues(),
    event
  );
  const activeInteraction = selectActiveInteraction(interactions);
  const intervention = buildIntervention(
    event,
    commandLabel,
    previous,
    activeInteraction
  );
  const currentTool = resolveCurrentTool(event, commandLabel);

  return {
    agent: agentInfo.agent,
    agentLabel: agentInfo.agentLabel,
    project,
    sessionTitle:
      event.sessionTitle ??
      previous?.sessionTitle ??
      titleForState(event.state, commandLabel),
    taskPrompt:
      event.taskPrompt ?? previous?.taskPrompt ?? `island run ${commandLabel}`,
    state: event.state,
    recentAction,
    lastSummary: summaryForEvent(event, commandLabel),
    currentTool,
    eventTail: appendTail(previous?.eventTail, {
      time: formatEventTime(event.timestamp),
      text: recentAction
    }),
    model: pickModel(event, previous),
    sessionStartedAt,
    interactions,
    jumpBack: jumpBackForEvent(event, previous),
    usage: mergeUsage(previous?.usage, event.transcriptPath),
    ...(intervention ? { intervention } : {})
  };
}

function jumpBackForEvent(event, previous) {
  const cwd = event.cwd ?? previous?.jumpBack?.cwd;
  const command = event.command ?? previous?.jumpBack?.command;
  const terminalHint = event.terminalHint ?? previous?.jumpBack?.terminalHint;
  const editorHint = event.editorHint ?? previous?.jumpBack?.editorHint;

  return {
    ...(cwd ? { cwd } : {}),
    ...(command ? { command } : {}),
    ...(terminalHint ? { terminalHint } : {}),
    ...(editorHint ? { editorHint } : {})
  };
}

function mergeUsage(previousUsage, transcriptPath) {
  const fromTranscript = transcriptPath
    ? estimateUsageFromTranscript(transcriptPath)
    : null;
  if (!fromTranscript) {
    return previousUsage ?? createEmptyUsage();
  }
  return {
    ...(previousUsage ?? createEmptyUsage()),
    ...fromTranscript
  };
}

function pickModel(event, previous) {
  const fromTranscript = event.transcriptPath
    ? estimateUsageFromTranscript(event.transcriptPath)
    : null;
  return fromTranscript?.model ?? previous?.model ?? "unknown";
}

function resolveCurrentTool(event, commandLabel) {
  if (event.state === "completed" || event.state === "idle") {
    return { kind: "none", label: "—" };
  }
  if (event.toolKind && event.toolLabel) {
    return { kind: event.toolKind, label: event.toolLabel };
  }
  if (event.state === "thinking") {
    return { kind: "think", label: "—" };
  }
  return {
    kind: event.state === "reading" ? "read" : event.state === "editing" ? "edit" : "bash",
    label: commandLabel
  };
}

function buildIntervention(event, commandLabel, previous, activeInteraction) {
  if (activeInteraction) {
    return interventionFromInteraction(activeInteraction);
  }

  if (event.interventionKind) {
    if (
      event.interventionKind === "waiting_approval" &&
      !event.permissionId &&
      previous?.intervention?.kind === "waiting_approval" &&
      previous.intervention.permissionId
    ) {
      return previous.intervention;
    }

    return {
      kind: event.interventionKind,
      title: event.interventionTitle ?? "需要介入",
      detail: event.interventionDetail ?? event.message,
      payload: event.interventionPayload ?? event.message,
      ...(event.permissionId ? { permissionId: event.permissionId } : {}),
      ...(event.questionId ? { questionId: event.questionId } : {}),
      ...(event.actions ? { actions: event.actions } : {})
    };
  }
  return interventionForEvent(event, commandLabel);
}

function interventionFromInteraction(interaction) {
  if (interaction.kind === "permission") {
    return {
      kind: "waiting_approval",
      title: interaction.title,
      detail: interaction.detail,
      payload: interaction.payload,
      interactionKind: "permission",
      permissionId: interaction.permissionId ?? interaction.id,
      ...(interaction.actions ? { actions: interaction.actions } : {}),
      ...(interaction.options ? { options: interaction.options } : {})
    };
  }

  if (interaction.kind === "question" || interaction.kind === "plan") {
    return {
      kind: "waiting_input",
      title: interaction.title,
      detail: interaction.detail,
      payload: interaction.payload,
      interactionKind: interaction.kind,
      ...(interaction.questionId ? { questionId: interaction.questionId } : {}),
      ...(interaction.answerMode ? { answerMode: interaction.answerMode } : {}),
      ...(interaction.questions ? { questions: interaction.questions } : {}),
      ...(interaction.options ? { options: interaction.options } : {})
    };
  }

  return {
    kind: interaction.interventionKind ?? "command_failed",
    title: interaction.title,
    detail: interaction.detail,
    payload: interaction.payload,
    interactionKind: interaction.kind
  };
}

function createEvent({
  command,
  cwd,
  timestamp,
  state,
  message,
  stream,
  exitCode
}) {
  return {
    agent: detectAgent(command).agent,
    project: projectFromCwd(cwd),
    state,
    message,
    timestamp,
    command,
    cwd,
    ...(stream ? { stream } : {}),
    ...(typeof exitCode === "number" ? { exitCode } : {})
  };
}

function createEmptyUsage() {
  return {
    sessionTokens: 0,
    sessionTokensEstimated: true,
    todayTokens: 0,
    todayCostUsd: 0,
    quota5hPercent: 0,
    quotaResetMinutes: 0,
    abnormal: false
  };
}

function detectAgent(command) {
  const name = path.basename(command?.[0] ?? "").toLowerCase();
  return KNOWN_AGENTS[name] ?? KNOWN_AGENTS.codex;
}

function projectFromCwd(cwd) {
  if (!cwd) return "unknown-project";
  return path.basename(cwd);
}

function formatCommand(command) {
  return command.join(" ").trim();
}

function titleForState(state, commandLabel) {
  if (state === "starting") return "启动 agent";
  if (state === "thinking") return "交互会话中";
  if (state === "running_command") return "执行命令";
  if (state === "completed") return "任务完成";
  if (state === "failed") return "命令执行失败";
  return commandLabel;
}

function summaryForEvent(event, commandLabel) {
  if (event.state === "starting") {
    return `${commandLabel} 已启动，正在等待输出。`;
  }
  if (event.state === "thinking") {
    return event.message || `${commandLabel} 正在处理中。`;
  }
  if (event.state === "reading") {
    return event.message || "正在读取文件或搜索代码库。";
  }
  if (event.state === "editing") {
    return event.message || "正在修改文件。";
  }
  if (event.state === "running_command") {
    return event.message || "正在执行 shell 命令。";
  }
  if (event.state === "waiting_approval") {
    return event.message || "等待你在 terminal 中确认权限。";
  }
  if (event.state === "waiting_input") {
    return event.message || "等待你的回复。";
  }
  if (event.state === "completed") {
    return "进程已正常退出，任务完成。";
  }
  if (event.state === "failed") {
    return `进程异常退出，exit code ${event.exitCode}。`;
  }
  return event.message;
}

function interventionForEvent(event, commandLabel) {
  if (event.state === "completed") {
    return {
      kind: "completed",
      title: "任务完成",
      detail: `${commandLabel} 已正常退出。`,
      payload: event.message
    };
  }
  if (event.state === "failed") {
    return {
      kind: "command_failed",
      title: "命令执行失败",
      detail: `${commandLabel} 退出码为 ${event.exitCode}。`,
      payload: event.message
    };
  }
  return undefined;
}

function appendTail(previousTail = [], item) {
  return [...previousTail.filter((entry) => entry.time !== "—"), item].slice(-3);
}

function formatEventTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
