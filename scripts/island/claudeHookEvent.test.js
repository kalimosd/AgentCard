import { describe, expect, it } from "vitest";
import {
  mapClaudeHookToIslandEvent,
  stateForTool,
  toolLabel
} from "./claudeHookEvent.js";

describe("claudeHookEvent", () => {
  it("maps bash pre-tool use to running_command", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PreToolUse",
      cwd: "/Users/me/my-app",
      tool_name: "Bash",
      tool_input: { command: "npm test", description: "Run tests" }
    });

    expect(event).toMatchObject({
      agent: "claude",
      project: "my-app",
      state: "running_command",
      toolKind: "bash",
      toolLabel: "npm test"
    });
  });

  it("maps read and edit tools to file states", () => {
    const read = mapClaudeHookToIslandEvent({
      hook_event_name: "PreToolUse",
      cwd: "/Users/me/my-app",
      tool_name: "Read",
      tool_input: { file_path: "/Users/me/my-app/src/App.tsx" }
    });
    const edit = mapClaudeHookToIslandEvent({
      hook_event_name: "PreToolUse",
      cwd: "/Users/me/my-app",
      tool_name: "Edit",
      tool_input: { file_path: "/Users/me/my-app/src/App.tsx" }
    });

    expect(read?.state).toBe("reading");
    expect(edit?.state).toBe("editing");
  });

  it("maps permission request to waiting_approval intervention", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PermissionRequest",
      cwd: "/Users/me/my-app",
      tool_name: "Bash",
      tool_input: { command: "rm -rf dist" }
    });

    expect(event).toMatchObject({
      state: "waiting_approval",
      interventionKind: "waiting_approval",
      interventionTitle: "等待权限确认"
    });
  });

  it("maps ExitPlanMode PermissionRequest to a plan interaction, not a yes/no permission", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PermissionRequest",
      cwd: "/Users/me/my-app",
      tool_name: "ExitPlanMode",
      tool_input: { plan: "1. Build hook bridge\n2. Verify UI" }
    });

    expect(event).toMatchObject({
      state: "waiting_input",
      interactionKind: "plan",
      interactionTitle: "计划审阅",
      options: [
        "1. Yes, and use auto mode",
        "2. Yes, manually approve edits",
        "3. Tell Claude what to change"
      ]
    });
    expect(event?.interventionKind).not.toBe("waiting_approval");
  });

  it("marks permission requests as always-capable when Claude sends session suggestions", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PermissionRequest",
      cwd: "/Users/me/my-app",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      permission_suggestions: [
        {
          behavior: "allow",
          rule: "Bash(npm test:*)"
        }
      ]
    });

    expect(event).toMatchObject({
      state: "waiting_approval",
      canAlways: true
    });
  });

  it("maps user prompt submit to thinking with task anchor", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "UserPromptSubmit",
      cwd: "/Users/me/my-app",
      prompt: "Add Claude hooks to Agent Island"
    });

    expect(event).toMatchObject({
      state: "thinking",
      taskPrompt: "Add Claude hooks to Agent Island",
      sessionTitle: "Add Claude hooks to Agent Island"
    });
  });

  it("maps notification idle prompt to waiting_input", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "Notification",
      cwd: "/Users/me/my-app",
      notification_type: "idle_prompt",
      message: "Claude is waiting for your input"
    });

    expect(event?.state).toBe("waiting_input");
    expect(event?.interventionKind).toBe("waiting_input");
  });

  it("extracts lettered idle prompt choices into an answerable question", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "Notification",
      cwd: "/Users/me/my-app",
      notification_type: "idle_prompt",
      message:
        "你想怎么来？\n\nA) 逐轮过 — 从第一轮开始，一题一题聊。\n\nB) 跳着聊 — 直接告诉我是哪个。\n\nC) 全量速答 — 12 题先全部给出初步倾向。"
    });

    expect(event).toMatchObject({
      state: "waiting_input",
      interactionKind: "question",
      interactionTitle: "需要回答",
      answerMode: "choice",
      options: [
        "A) 逐轮过 — 从第一轮开始，一题一题聊。",
        "B) 跳着聊 — 直接告诉我是哪个。",
        "C) 全量速答 — 12 题先全部给出初步倾向。"
      ]
    });
  });

  it("maps generic permission notifications to terminal attention, not an actionable permission", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "Notification",
      cwd: "/Users/me/my-app",
      notification_type: "permission_prompt",
      message: "Claude needs your permission"
    });

    expect(event).toMatchObject({
      state: "waiting_input",
      interactionKind: "attention",
      interventionKind: "waiting_input",
      interventionTitle: "Terminal 等待确认"
    });
  });

  it("maps AskUserQuestion PreToolUse to a question interaction, not permission", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PreToolUse",
      cwd: "/Users/me/my-app",
      tool_name: "AskUserQuestion",
      tool_input: {
        question: "选择下一步方向",
        options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
      }
    });

    expect(event).toMatchObject({
      state: "waiting_input",
      interactionKind: "question",
      interactionTitle: "需要回答",
      options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
    });
    expect(event?.interventionKind).not.toBe("waiting_approval");
  });

  it("maps ExitPlanMode PreToolUse to a plan interaction", () => {
    const event = mapClaudeHookToIslandEvent({
      hook_event_name: "PreToolUse",
      cwd: "/Users/me/my-app",
      tool_name: "ExitPlanMode",
      tool_input: { plan: "1. Add queues\n2. Add tests" }
    });

    expect(event).toMatchObject({
      state: "waiting_input",
      interactionKind: "plan",
      interactionTitle: "计划审阅",
      interactionPayload: "1. Add queues\n2. Add tests"
    });
  });

  it("classifies tool helpers", () => {
    expect(stateForTool("Read")).toBe("reading");
    expect(
      toolLabel({
        tool_name: "Bash",
        tool_input: { command: "npm run build" }
      })
    ).toBe("npm run build");
  });
});
