import path from "node:path";

const TOOL_READ = new Set(["Read", "Glob", "Grep", "LS", "WebFetch", "WebSearch"]);
const TOOL_EDIT = new Set(["Edit", "Write", "NotebookEdit"]);

export function mapClaudeHookToAgentCardEvent(payload) {
  if (!payload || typeof payload !== "object") return null;

  const hookName = payload.hook_event_name;
  const cwd = payload.cwd ?? process.cwd();
  const timestamp = Date.now();
  const base = {
    agent: "claude",
    cwd,
    timestamp,
    command: ["claude"],
    project: projectFromCwd(cwd),
    transcriptPath: payload.transcript_path
  };

  switch (hookName) {
    case "SessionStart":
      return {
        ...base,
        state: "starting",
        message: "Claude session started",
        sessionTitle: "Claude 会话"
      };

    case "UserPromptSubmit":
      return {
        ...base,
        state: "thinking",
        message: truncate(payload.prompt, 120) || "Processing your prompt",
        taskPrompt: payload.prompt ?? base.message,
        sessionTitle: sessionTitleFromPrompt(payload.prompt)
      };

    case "PreToolUse":
      return mapPreToolUse(base, payload);

    case "PostToolUse":
      return {
        ...base,
        state: "thinking",
        message: `Finished ${payload.tool_name}: ${toolSummary(payload)}`,
        toolKind: "none",
        toolLabel: "—"
      };

    case "PostToolUseFailure":
      return {
        ...base,
        state: "failed",
        message: `${payload.tool_name} failed: ${failureSummary(payload)}`,
        toolKind: toolKindForName(payload.tool_name),
        toolLabel: toolLabel(payload),
        interventionKind: payload.tool_name === "Bash" ? "command_failed" : "test_failed",
        interventionTitle:
          payload.tool_name === "Bash" ? "命令执行失败" : "工具调用失败",
        interventionDetail: failureSummary(payload),
        interventionPayload: failurePayload(payload)
      };

    case "PermissionRequest":
      if (payload.tool_name === "AskUserQuestion") {
        return mapQuestionTool(base, payload);
      }
      if (payload.tool_name === "ExitPlanMode") {
        return mapPlanTool(base, payload);
      }
      return {
        ...base,
        state: "waiting_approval",
        message: `Permission: ${payload.tool_name} — ${toolSummary(payload)}`,
        toolKind: toolKindForName(payload.tool_name),
        toolLabel: toolLabel(payload),
        interventionKind: "waiting_approval",
        interventionTitle: "等待权限确认",
        interventionDetail: `Claude 请求执行 ${payload.tool_name}，请在 terminal 中确认。`,
        interventionPayload: permissionPayload(payload),
        ...(hasAllowPermissionSuggestion(payload) ? { canAlways: true } : {})
      };

    case "Notification": {
      const type = payload.notification_type ?? "";
      if (type === "permission_prompt") {
        return {
          ...base,
          state: "waiting_input",
          message: payload.message ?? "Claude needs permission",
          interactionKind: "attention",
          interventionKind: "waiting_input",
          interventionTitle: "Terminal 等待确认",
          interventionDetail:
            payload.message ?? "Claude 在 terminal 中显示了原生确认，请回 terminal 处理。",
          interventionPayload: payload.message ?? ""
        };
      }
      if (type === "idle_prompt") {
        const message = payload.message ?? "Claude is waiting for your input";
        const options = choiceLines(message);
        if (options.length >= 2) {
          return {
            ...base,
            state: "waiting_input",
            message: truncate(message, 120),
            toolKind: "think",
            toolLabel: "Question",
            interactionKind: "question",
            interactionTitle: "需要回答",
            questionText: promptBeforeChoices(message),
            interactionPayload: message.slice(0, 1200),
            answerMode: "choice",
            options
          };
        }
        return {
          ...base,
          state: "waiting_input",
          message,
          interventionKind: "waiting_input",
          interventionTitle: "等待输入",
          interventionDetail: message,
          interventionPayload: message
        };
      }
      return {
        ...base,
        state: "thinking",
        message: payload.message ?? "Claude notification"
      };
    }

    case "Stop":
      return {
        ...base,
        state: "thinking",
        message: "Claude finished a response turn",
        toolKind: "none",
        toolLabel: "—"
      };

    case "SessionEnd":
      return {
        ...base,
        state: "completed",
        message: "Claude session ended",
        toolKind: "none",
        toolLabel: "—",
        interventionKind: "completed",
        interventionTitle: "会话结束",
        interventionDetail: "Claude 会话已结束。",
        interventionPayload: payload.reason ?? "SessionEnd"
      };

    default:
      return null;
  }
}

function mapPreToolUse(base, payload) {
  if (payload.tool_name === "AskUserQuestion") {
    return mapQuestionTool(base, payload);
  }
  if (payload.tool_name === "ExitPlanMode") {
    return mapPlanTool(base, payload);
  }

  const toolName = payload.tool_name ?? "Tool";
  const toolKind = toolKindForName(toolName);
  const state = stateForTool(toolName);
  const label = toolLabel(payload);

  return {
    ...base,
    state,
    message: `${toolName}: ${toolSummary(payload)}`,
    toolKind,
    toolLabel: label
  };
}

function mapQuestionTool(base, payload) {
  const input = payload.tool_input ?? {};
  const options = extractOptions(input);
  const questions = extractQuestionGroups(input);
  const questionText = input.question ?? input.prompt ?? firstQuestionText(input) ?? toolSummary(payload);

  return {
    ...base,
    state: "waiting_input",
    message: `AskUserQuestion: ${truncate(questionText, 80)}`,
    toolKind: "think",
    toolLabel: "AskUserQuestion",
    interactionKind: "question",
    interactionTitle: "需要回答",
    questionText,
    interactionPayload: JSON.stringify(input, null, 2).slice(0, 1200),
    options,
    ...(questions.length > 0 ? { questions } : {})
  };
}

function mapPlanTool(base, payload) {
  const input = payload.tool_input ?? {};
  const plan = input.plan ?? input.content ?? toolSummary(payload);

  return {
    ...base,
    state: "waiting_input",
    message: "ExitPlanMode: plan review",
    toolKind: "think",
    toolLabel: "ExitPlanMode",
    interactionKind: "plan",
    interactionTitle: "计划审阅",
    interactionDetail: "Claude 请求审阅计划。",
    interactionPayload: String(plan).slice(0, 1200),
    answerMode: "choice",
    options: [
      "1. Yes, and use auto mode",
      "2. Yes, manually approve edits",
      "3. Tell Claude what to change"
    ]
  };
}

function extractOptions(input) {
  if (Array.isArray(input.questions) && input.questions.length > 0) {
    const first = input.questions[0];
    if (first && typeof first === "object") {
      return extractOptions(first);
    }
  }
  if (Array.isArray(input.options)) return input.options.map(optionLabel);
  if (Array.isArray(input.choices)) return input.choices.map(optionLabel);
  if (typeof input.question === "string") return numberedLines(input.question);
  if (typeof input.prompt === "string") return numberedLines(input.prompt);
  return [];
}

function extractQuestionGroups(input) {
  if (!Array.isArray(input.questions)) return [];
  return input.questions
    .filter((question) => question && typeof question === "object")
    .map((question) => ({
      question: String(question.question ?? question.prompt ?? question.header ?? ""),
      options: extractOptions(question)
    }))
    .filter((question) => question.question.trim());
}

function firstQuestionText(input) {
  if (Array.isArray(input.questions) && input.questions.length > 0) {
    const first = input.questions[0];
    if (first && typeof first === "object" && typeof first.question === "string") {
      return first.question;
    }
  }
  return null;
}

function optionLabel(option) {
  if (option && typeof option === "object") {
    return String(option.label ?? option.value ?? option.text ?? option.description ?? "");
  }
  return String(option);
}

function numberedLines(text) {
  return choiceLines(text).filter((line) => /^\d+[\).]\s+/.test(line));
}

function choiceLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(\d+|[A-Z])[\).]\s+/.test(line));
}

function promptBeforeChoices(text) {
  const lines = String(text).split(/\r?\n/);
  const firstChoiceIndex = lines.findIndex((line) =>
    /^(\d+|[A-Z])[\).]\s+/.test(line.trim())
  );
  const promptLines =
    firstChoiceIndex >= 0 ? lines.slice(0, firstChoiceIndex) : lines;
  return promptLines.join("\n").trim() || "Claude 在等待你的选择。";
}

export function stateForTool(toolName) {
  if (toolName === "Bash") return "running_command";
  if (TOOL_READ.has(toolName)) return "reading";
  if (TOOL_EDIT.has(toolName)) return "editing";
  return "running_command";
}

export function toolKindForName(toolName) {
  if (toolName === "Bash") return "bash";
  if (TOOL_READ.has(toolName)) return "read";
  if (TOOL_EDIT.has(toolName)) return "edit";
  return "bash";
}

export function toolLabel(payload) {
  const toolName = payload.tool_name ?? "Tool";
  const input = payload.tool_input ?? {};

  if (toolName === "Bash") {
    return truncate(input.command ?? input.description ?? "shell", 80);
  }
  if (TOOL_EDIT.has(toolName) || toolName === "Read") {
    return truncate(basename(input.file_path) ?? input.file_path ?? toolName, 80);
  }
  if (toolName === "Glob") return truncate(input.pattern ?? "glob", 80);
  if (toolName === "Grep") return truncate(input.pattern ?? "grep", 80);
  return toolName;
}

export function toolSummary(payload) {
  const label = toolLabel(payload);
  return label || payload.tool_name || "tool";
}

function failureSummary(payload) {
  return (
    payload.error ??
    payload.tool_response?.error ??
    payload.message ??
    toolSummary(payload)
  );
}

function failurePayload(payload) {
  const parts = [
    `tool: ${payload.tool_name}`,
    `summary: ${toolSummary(payload)}`,
    `error: ${failureSummary(payload)}`
  ];
  return parts.join("\n");
}

function permissionPayload(payload) {
  const input = payload.tool_input ?? {};
  return JSON.stringify(
    { tool: payload.tool_name, input },
    null,
    2
  ).slice(0, 800);
}

function hasAllowPermissionSuggestion(payload) {
  return (
    Array.isArray(payload.permission_suggestions) &&
    payload.permission_suggestions.some(
      (suggestion) => suggestion?.behavior === "allow"
    )
  );
}

function sessionTitleFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return "Claude 会话";
  const line = prompt.trim().split(/\r?\n/)[0] ?? "";
  return truncate(line, 48) || "Claude 会话";
}

function projectFromCwd(cwd) {
  if (!cwd) return "unknown-project";
  return path.basename(cwd);
}

function basename(filePath) {
  if (!filePath) return "";
  return path.basename(filePath);
}

function truncate(value, max) {
  if (!value) return "";
  const text = String(value).trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
