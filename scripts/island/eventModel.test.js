import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createExitEvent,
  createIdleSnapshot,
  createInteractiveSessionEvent,
  createOutputEvent,
  createStartingEvent,
  eventToSnapshot,
  isInteractiveAgentCommand
} from "./eventModel.js";

describe("island event model", () => {
  it("creates an idle snapshot before a wrapped command starts", () => {
    expect(createIdleSnapshot({ project: "AgentCard" })).toMatchObject({
      agent: "codex",
      project: "AgentCard",
      state: "idle",
      recentAction: "等待启动命令"
    });
  });

  it("maps wrapper lifecycle events to status island snapshots", () => {
    const started = eventToSnapshot(
      createStartingEvent({
        command: ["claude", "--model", "sonnet"],
        cwd: "/Users/me/AgentCard",
        timestamp: 1760000000000
      })
    );

    expect(started).toMatchObject({
      agent: "claude",
      agentLabel: "Claude",
      project: "AgentCard",
      state: "starting",
      recentAction: "Starting claude --model sonnet",
      currentTool: { kind: "bash", label: "claude --model sonnet" }
    });

    const output = eventToSnapshot(
      createOutputEvent({
        command: ["claude", "--model", "sonnet"],
        cwd: "/Users/me/AgentCard",
        stream: "stdout",
        line: "Running npm test",
        timestamp: 1760000000500
      }),
      started
    );

    expect(output).toMatchObject({
      state: "running_command",
      recentAction: "stdout: Running npm test",
      lastSummary: "Running npm test"
    });

    const completed = eventToSnapshot(
      createExitEvent({
        command: ["claude", "--model", "sonnet"],
        cwd: "/Users/me/AgentCard",
        exitCode: 0,
        timestamp: 1760000001000
      }),
      output
    );

    expect(completed).toMatchObject({
      state: "completed",
      recentAction: "Process exited with code 0",
      intervention: { kind: "completed", title: "任务完成" }
    });
  });

  it("detects interactive agent commands that need a real TTY", () => {
    expect(isInteractiveAgentCommand(["claude"])).toBe(true);
    expect(isInteractiveAgentCommand(["claude", "--model", "sonnet"])).toBe(true);
    expect(isInteractiveAgentCommand(["claude", "-p", "hello"])).toBe(false);
    expect(isInteractiveAgentCommand(["npm", "test"])).toBe(false);
  });

  it("maps interactive session events to thinking state", () => {
    const snapshot = eventToSnapshot(
      createInteractiveSessionEvent({
        command: ["claude"],
        cwd: "/Users/me/my-app",
        timestamp: 1760000000100
      })
    );

    expect(snapshot).toMatchObject({
      agent: "claude",
      project: "my-app",
      state: "thinking",
      sessionTitle: "交互会话中"
    });
  });

  it("merges usage from transcript path when available", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "island-event-"));
    const file = path.join(dir, "session.jsonl");
    fs.writeFileSync(
      file,
      JSON.stringify({
        type: "assistant",
        message: {
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 500, output_tokens: 100 }
        }
      })
    );

    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        command: ["claude"],
        cwd: dir,
        timestamp: Date.now(),
        state: "thinking",
        message: "Working",
        transcriptPath: file
      },
      undefined
    );

    expect(snapshot.usage.sessionTokens).toBe(600);
    expect(snapshot.model).toBe("claude-sonnet");
  });

  it("maps claude hook style events with tool labels", () => {
    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        command: ["claude"],
        cwd: "/Users/me/my-app",
        timestamp: 1760000000200,
        state: "reading",
        message: "Read: App.tsx",
        toolKind: "read",
        toolLabel: "App.tsx",
        taskPrompt: "Fix the island UI",
        sessionTitle: "Fix the island UI"
      },
      undefined
    );

    expect(snapshot).toMatchObject({
      agent: "claude",
      agentLabel: "Claude",
      project: "my-app",
      state: "reading",
      currentTool: { kind: "read", label: "App.tsx" },
      taskPrompt: "Fix the island UI"
    });
  });

  it("marks non-zero exits as failed intervention events", () => {
    const failed = eventToSnapshot(
      createExitEvent({
        command: ["npm", "test"],
        cwd: "/Users/me/AgentCard",
        exitCode: 1,
        timestamp: 1760000001000
      })
    );

    expect(failed).toMatchObject({
      agent: "codex",
      state: "failed",
      recentAction: "Process exited with code 1",
      intervention: { kind: "command_failed", title: "命令执行失败" }
    });
  });

  it("preserves a detailed permission card when Claude sends a generic notification", () => {
    const permission = eventToSnapshot({
      agent: "claude",
      command: ["claude"],
      cwd: "/Users/me/offerpilot-ai",
      timestamp: 1760000000200,
      state: "waiting_approval",
      message:
        'Permission: Bash — open "http://localhost:3000/authorize?agent_id=agentcard-001"',
      toolKind: "bash",
      toolLabel: 'open "http://localhost:3000/authorize"',
      interventionKind: "waiting_approval",
      interventionTitle: "等待权限确认",
      interventionDetail: "Claude 请求执行 Bash，请确认。",
      interventionPayload:
        'tool: Bash\ncommand: open "http://localhost:3000/authorize?agent_id=agentcard-001"',
      permissionId: "permission-123"
    });

    const notification = eventToSnapshot(
      {
        agent: "claude",
        command: ["claude"],
        cwd: "/Users/me/offerpilot-ai",
        timestamp: 1760000000300,
        state: "waiting_approval",
        message: "Claude needs your permission",
        interventionKind: "waiting_approval",
        interventionTitle: "等待权限确认",
        interventionDetail: "Claude needs your permission",
        interventionPayload: "Claude needs your permission"
      },
      permission
    );

    expect(notification.intervention).toMatchObject({
      kind: "waiting_approval",
      permissionId: "permission-123",
      payload:
        'tool: Bash\ncommand: open "http://localhost:3000/authorize?agent_id=agentcard-001"'
    });
  });

  it("keeps typed queues while exposing a permission as compatibility intervention", () => {
    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        project: "repo",
        state: "waiting_approval",
        message: "Permission: Bash — npm test",
        timestamp: 1000,
        interactionKind: "permission",
        permissionId: "perm-1",
        interactionDetail: "Claude 请求执行 Bash。",
        interactionPayload: "tool: Bash\ncommand: npm test"
      },
      createIdleSnapshot({ project: "repo" })
    );

    expect(snapshot.interactions.permissions).toHaveLength(1);
    expect(snapshot.interactions.questions).toHaveLength(0);
    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_approval",
      title: "权限确认",
      permissionId: "perm-1",
      payload: "tool: Bash\ncommand: npm test"
    });
  });

  it("keeps permission action availability on compatibility intervention", () => {
    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        project: "repo",
        state: "waiting_approval",
        message: "Permission: Bash — npm test",
        timestamp: 1000,
        interactionKind: "permission",
        permissionId: "perm-1",
        canAlways: true,
        interactionPayload: "tool: Bash\ncommand: npm test"
      },
      createIdleSnapshot({ project: "repo" })
    );

    expect(snapshot.interactions.permissions[0].actions).toEqual([
      "allow",
      "always",
      "deny"
    ]);
    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_approval",
      permissionId: "perm-1",
      actions: ["allow", "always", "deny"]
    });
  });

  it("keeps typed queues while exposing a question as compatibility intervention", () => {
    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        project: "repo",
        state: "waiting_input",
        message: "AskUserQuestion: 选择下一步方向",
        timestamp: 1000,
        interactionKind: "question",
        questionText: "选择下一步方向",
        interactionPayload: "选择下一步方向",
        options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
      },
      createIdleSnapshot({ project: "repo" })
    );

    expect(snapshot.interactions.questions).toHaveLength(1);
    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_input",
      title: "需要回答",
      options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
    });
  });

  it("preserves jump back context from cwd and command", () => {
    const snapshot = eventToSnapshot(
      {
        agent: "claude",
        project: "repo",
        state: "running_command",
        message: "Bash: npm test",
        timestamp: 1000,
        command: ["claude"],
        cwd: "/repo"
      },
      createIdleSnapshot({ project: "repo" })
    );

    expect(snapshot.jumpBack).toEqual({
      cwd: "/repo",
      command: ["claude"]
    });
  });
});
