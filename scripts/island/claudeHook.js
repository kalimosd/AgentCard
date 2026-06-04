#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { mapClaudeHookToIslandEvent } from "./claudeHookEvent.js";

const serverUrl = process.env.ISLAND_SERVER_URL ?? "http://127.0.0.1:4317";

async function main() {
  const input = await readStdin();
  if (!input.trim()) return;

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    return;
  }

  const output = await routeClaudeHookPayload(payload);
  if (output) {
    process.stdout.write(JSON.stringify(output));
  }
}

export async function routeClaudeHookPayload(
  payload,
  {
    postJson: post = postJson,
    preToolPermissionMode = process.env.ISLAND_PRETOOL_PERMISSION_MODE ?? "observe"
  } = {}
) {
  if (payload.hook_event_name === "PreToolUse") {
    if (payload.tool_name === "AskUserQuestion") {
      return handleQuestionRequest(payload, { postJson: post });
    }
    if (payload.tool_name === "ExitPlanMode") {
      return handlePlanChoiceRequest(payload, { postJson: post });
    }
    if (preToolPermissionMode === "gate") {
      return handlePermissionRequest(payload, { postJson: post });
    }
    const event = mapClaudeHookToIslandEvent(payload);
    if (event) {
      await post("/events", event);
    }
    return null;
  }

  if (payload.hook_event_name === "PermissionRequest") {
    if (payload.tool_name === "AskUserQuestion") {
      return handleQuestionRequest(payload, { postJson: post });
    }
    if (payload.tool_name === "ExitPlanMode") {
      return handlePlanChoiceRequest(payload, { postJson: post });
    }
    return handlePermissionRequest(payload, { postJson: post });
  }

  const event = mapClaudeHookToIslandEvent(payload);
  if (!event) return null;
  if (isAnswerableQuestionEvent(event)) {
    return handleQuestionRequest(payload, { postJson: post });
  }
  await post("/events", event);
  return null;
}

async function postObservedEvent(payload, post) {
  const event = mapClaudeHookToIslandEvent(payload);
  if (event) {
    await post("/events", event);
  }
  return null;
}

async function handlePermissionRequest(
  payload,
  { postJson: post = postJson } = {}
) {
  const event =
    payload.hook_event_name === "PreToolUse"
      ? mapPreToolUseToPermissionEvent(payload)
      : mapClaudeHookToIslandEvent(payload);
  if (!event) return;

  try {
    const permission = await post("/permissions", { event, hook: payload });
    const decision = permission.status
      ? permission
      : await post(`/permissions/${permission.id}/wait`, { timeoutMs: 300000 });
    return buildPermissionDecisionOutput(payload, decision.status);
  } catch {
    // If Agent Island is unavailable, fall back to Claude Code's native prompt.
    return null;
  }
}

async function handleQuestionRequest(payload, { postJson: post = postJson } = {}) {
  const event = mapClaudeHookToIslandEvent(payload);
  if (!event) return null;
  if (!isAnswerableQuestionEvent(event)) {
    await post("/events", event);
    return null;
  }

  try {
    const question = await post("/questions", { event, hook: payload });
    const answer = await post(`/questions/${question.id}/wait`, {
      timeoutMs: 300000
    });
    return buildQuestionAnswerOutput(payload, answer);
  } catch {
    // If Agent Island is unavailable, fall back to Claude Code's native prompt.
    return null;
  }
}

async function handlePlanChoiceRequest(
  payload,
  { postJson: post = postJson } = {}
) {
  const event = mapClaudeHookToIslandEvent(payload);
  if (!event) return null;

  try {
    const question = await post("/questions", { event, hook: payload });
    const answer = await post(`/questions/${question.id}/wait`, {
      timeoutMs: 300000
    });
    return buildPlanChoiceOutput(payload, answer);
  } catch {
    // If Agent Island is unavailable, fall back to Claude Code's native prompt.
    return null;
  }
}

export function buildPermissionDecisionOutput(payload, decision) {
  const behavior = decision === "deny" ? "deny" : "allow";

  if (payload.hook_event_name === "PreToolUse") {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: behavior,
        ...(behavior === "deny"
          ? { permissionDecisionReason: "Denied from Agent Island" }
          : {})
      }
    };
  }

  const hookSpecificOutput = {
    hookEventName: payload.hook_event_name ?? "PermissionRequest",
    decision: { behavior }
  };

  if (decision === "always") {
    const updatedPermissions = sessionPermissionUpdates(payload);
    if (updatedPermissions.length > 0) {
      hookSpecificOutput.updatedPermissions = updatedPermissions;
    }
  }

  return { hookSpecificOutput };
}

function sessionPermissionUpdates(payload) {
  const suggestions = Array.isArray(payload.permission_suggestions)
    ? payload.permission_suggestions
    : [];

  return suggestions
    .filter((suggestion) => suggestion?.behavior === "allow")
    .map((suggestion) => ({
      ...suggestion,
      behavior: "allow",
      destination: "session"
    }));
}

export function buildQuestionAnswerOutput(payload, result) {
  if (payload.hook_event_name === "Notification") {
    if (!hasAnsweredQuestionResult(result)) {
      return {
        hookSpecificOutput: {
          hookEventName: "Notification"
        }
      };
    }

    return {
      hookSpecificOutput: {
        hookEventName: "Notification",
        answer: result.answer ?? result.answers?.[0]?.answer
      }
    };
  }

  if (!hasAnsweredQuestionResult(result)) {
    if (payload.hook_event_name === "PreToolUse") {
      return null;
    }
    return null;
  }

  if (payload.hook_event_name === "PreToolUse") {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: askUserQuestionUpdatedInput(
          payload.tool_input ?? {},
          result
        )
      }
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "allow",
        updatedInput: askUserQuestionUpdatedInput(payload.tool_input ?? {}, result)
      }
    }
  };
}

export function buildPlanChoiceOutput(payload, result) {
  if (result?.status !== "answered" || !result.answer) {
    return null;
  }

  const updatedInput = { ...(payload.tool_input ?? {}) };
  const additionalContext = `User selected this plan option from AgentDock: ${result.answer}`;

  if (payload.hook_event_name === "PreToolUse") {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput,
        additionalContext
      }
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: payload.hook_event_name ?? "PermissionRequest",
      decision: {
        behavior: "allow",
        updatedInput
      },
      additionalContext
    }
  };
}

function hasAnsweredQuestionResult(result) {
  if (result?.status !== "answered") return false;
  if (typeof result.answer === "string" && result.answer.trim()) return true;
  return (
    Array.isArray(result.answers) &&
    result.answers.some(
      (item) => typeof item?.answer === "string" && item.answer.trim()
    )
  );
}

function askUserQuestionUpdatedInput(input, resultOrAnswer) {
  const originalQuestions = Array.isArray(input.questions) ? input.questions : [];
  const answers = normalizedQuestionAnswers(resultOrAnswer);
  const answerMap = questionAnswerMap(input, answers);
  const answer = answers[0]?.answer;
  return {
    ...input,
    questions: originalQuestions,
    answers: answerMap,
    ...(answer ? { answer } : {})
  };
}

function normalizedQuestionAnswers(resultOrAnswer) {
  if (typeof resultOrAnswer === "string") {
    return [{ answer: resultOrAnswer }];
  }

  if (Array.isArray(resultOrAnswer?.answers)) {
    return resultOrAnswer.answers
      .filter((item) => typeof item?.answer === "string" && item.answer.trim())
      .map((item) => ({
        question:
          typeof item.question === "string" && item.question.trim()
            ? item.question.trim()
            : undefined,
        answer: item.answer.trim(),
        ...(Number.isInteger(item.optionIndex)
          ? { optionIndex: item.optionIndex }
          : {})
      }));
  }

  if (typeof resultOrAnswer?.answer === "string" && resultOrAnswer.answer.trim()) {
    return [
      {
        answer: resultOrAnswer.answer.trim(),
        ...(Number.isInteger(resultOrAnswer.optionIndex)
          ? { optionIndex: resultOrAnswer.optionIndex }
          : {})
      }
    ];
  }

  return [];
}

function questionAnswerMap(input, answers) {
  const originalQuestions = Array.isArray(input.questions) ? input.questions : [];
  const map = {};
  const keyCounts = new Map();

  if (originalQuestions.length > 0) {
    originalQuestions.forEach((question, index) => {
      const answer = answers[index]?.answer;
      if (!answer) return;
      const key = dedupedAnswerKey(
        questionText(question) ?? answers[index]?.question ?? `answer_${index + 1}`,
        keyCounts
      );
      map[key] = answer;
    });

    answers.slice(originalQuestions.length).forEach((answer, index) => {
      const key = dedupedAnswerKey(
        answer.question ?? `answer_${originalQuestions.length + index + 1}`,
        keyCounts
      );
      map[key] = answer.answer;
    });

    return map;
  }

  const answer = answers[0]?.answer;
  if (!answer) return map;
  map[firstQuestionText(input) ?? "answer"] = answer;
  return map;
}

function dedupedAnswerKey(value, keyCounts) {
  const base = String(value || "answer").trim() || "answer";
  const nextCount = (keyCounts.get(base) ?? 0) + 1;
  keyCounts.set(base, nextCount);
  return nextCount === 1 ? base : `${base}_${nextCount}`;
}

function questionText(question) {
  if (question && typeof question === "object") {
    const value = question.question ?? question.prompt ?? question.header;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof question === "string" && question.trim()) return question.trim();
  return null;
}

function firstQuestionText(input) {
  if (Array.isArray(input.questions) && input.questions.length > 0) {
    const first = input.questions[0];
    if (first && typeof first === "object" && typeof first.question === "string") {
      return first.question;
    }
  }
  if (typeof input.question === "string" && input.question.trim()) {
    return "answer";
  }
  return null;
}

function isAnswerableQuestionEvent(event) {
  return (
    event.interactionKind === "question" &&
    ((Array.isArray(event.options) && event.options.length > 0) ||
      (Array.isArray(event.questions) &&
        event.questions.some(
          (question) =>
            Array.isArray(question?.options) && question.options.length > 0
        )))
  );
}

function mapPreToolUseToPermissionEvent(payload) {
  const event = mapClaudeHookToIslandEvent(payload);
  if (!event) return null;

  return {
    ...event,
    state: "waiting_approval",
    message: `Permission: ${payload.tool_name} — ${toolSummary(payload)}`,
    interventionKind: "waiting_approval",
    interventionTitle: "等待权限确认",
    interventionDetail: `Claude 请求使用 ${payload.tool_name}。`,
    interventionPayload: permissionPayload(payload),
    ...(hasAllowPermissionSuggestion(payload) ? { canAlways: true } : {})
  };
}

function hasAllowPermissionSuggestion(payload) {
  return (
    Array.isArray(payload.permission_suggestions) &&
    payload.permission_suggestions.some(
      (suggestion) => suggestion?.behavior === "allow"
    )
  );
}

function toolSummary(payload) {
  const input = payload.tool_input ?? {};
  if (payload.tool_name === "Read") return input.file_path ?? "Read";
  if (payload.tool_name === "Bash") return input.command ?? input.description ?? "Bash";
  if (payload.tool_name === "Glob") return input.pattern ?? "Glob";
  if (payload.tool_name === "Grep") return input.pattern ?? "Grep";
  return payload.tool_name ?? "Tool";
}

function permissionPayload(payload) {
  const input = payload.tool_input ?? {};
  if (payload.tool_name === "Read" && input.file_path) {
    return `tool: Read\nfile: ${input.file_path}`;
  }
  if (payload.tool_name === "Bash" && input.command) {
    return `tool: Bash\ncommand: ${input.command}`;
  }
  return JSON.stringify({ tool: payload.tool_name, input }, null, 2).slice(0, 800);
}

async function postJson(pathname, body) {
  const response = await fetch(new URL(pathname, serverUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Island server ${pathname} failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.exit(0);
  });
}
