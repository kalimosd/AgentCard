import { describe, expect, it } from "vitest";
import {
  buildQuestionAnswerOutput,
  buildPermissionDecisionOutput,
  routeClaudeHookPayload
} from "./claudeHook.js";

describe("routeClaudeHookPayload", () => {
  it("posts ordinary PreToolUse as activity without waiting for permission by default", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PreToolUse",
        tool_name: "Read",
        tool_input: { file_path: "/repo/src/App.tsx" },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          return { ok: true };
        },
        preToolPermissionMode: "observe"
      }
    );

    expect(output).toBeNull();
    expect(posted).toHaveLength(1);
    expect(posted[0].pathname).toBe("/events");
    expect(posted[0].body).toMatchObject({
      state: "reading",
      message: "Read: App.tsx"
    });
  });

  it("can still gate PreToolUse when explicit mode is enabled", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "npm test" },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/permissions") return { id: "perm-1" };
          if (pathname === "/permissions/perm-1/wait") return { status: "allow" };
          return { ok: true };
        },
        preToolPermissionMode: "gate"
      }
    );

    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow"
      }
    });
    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/permissions",
      "/permissions/perm-1/wait"
    ]);
  });

  it("answers AskUserQuestion PreToolUse through the question endpoint", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PreToolUse",
        tool_name: "AskUserQuestion",
        tool_input: {
          questions: [
            {
              question: "你选哪种方式？",
              options: [
                { label: "逐轮过", description: "一题一题聊" },
                { label: "跳着聊", description: "先聊最纠结的题" },
                { label: "全量速答", description: "先合成 roadmap" }
              ]
            }
          ]
        },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return { status: "answered", answer: "跳着聊", optionIndex: 1 };
          }
          return { ok: true };
        }
      }
    );

    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/questions",
      "/questions/question-1/wait"
    ]);
    expect(posted[0].body.event).toMatchObject({
      state: "waiting_input",
      interactionKind: "question",
      questionText: "你选哪种方式？",
      options: ["逐轮过", "跳着聊", "全量速答"]
    });
    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          answer: "跳着聊",
          answers: {
            "你选哪种方式？": "跳着聊"
          }
        }
      }
    });
  });

  it("falls back to Claude native AskUserQuestion PreToolUse when the island question is skipped", async () => {
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PreToolUse",
        tool_name: "AskUserQuestion",
        tool_input: { question: "继续吗？", options: ["继续", "暂停"] },
        cwd: "/repo"
      },
      {
        postJson: async (pathname) => {
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") return { status: "skipped" };
          return { ok: true };
        }
      }
    );

    expect(output).toBeNull();
  });

  it("answers ExitPlanMode PreToolUse as a plan choice, not a generic yes/no permission", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PreToolUse",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "1. Add tests\n2. Implement" },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return {
              status: "answered",
              answer: "2. Yes, manually approve edits",
              optionIndex: 1
            };
          }
          return { ok: true };
        },
        preToolPermissionMode: "gate"
      }
    );

    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: { plan: "1. Add tests\n2. Implement" }
      }
    });
    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/questions",
      "/questions/question-1/wait"
    ]);
    expect(posted[0]).toMatchObject({
      pathname: "/questions",
      body: {
        event: {
          state: "waiting_input",
          interactionKind: "plan",
          options: [
            "1. Yes, and use auto mode",
            "2. Yes, manually approve edits",
            "3. Tell Claude what to change"
          ]
        }
      }
    });
  });

  it("answers ExitPlanMode PermissionRequest through the plan choice endpoint", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PermissionRequest",
        tool_name: "ExitPlanMode",
        tool_input: { plan: "1. Add tests\n2. Implement" },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return {
              status: "answered",
              answer: "1. Yes, and use auto mode",
              optionIndex: 0
            };
          }
          return { ok: true };
        }
      }
    );

    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "allow",
          updatedInput: { plan: "1. Add tests\n2. Implement" }
        }
      }
    });
    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/questions",
      "/questions/question-1/wait"
    ]);
    expect(posted[0].body.event.interactionKind).toBe("plan");
  });

  it("answers AskUserQuestion PermissionRequest through the question endpoint", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PermissionRequest",
        tool_name: "AskUserQuestion",
        tool_input: {
          questions: [
            {
              question: "你希望我接下来以哪种方式协作？",
              options: [
                { label: "直接执行", description: "更快，但你少一次计划确认" },
                { label: "先给方案", description: "更慢，但更稳" }
              ]
            }
          ]
        },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return { status: "answered", answer: "先给方案", optionIndex: 1 };
          }
          return { ok: true };
        }
      }
    );

    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/questions",
      "/questions/question-1/wait"
    ]);
    expect(posted[0].body.event).toMatchObject({
      state: "waiting_input",
      interactionKind: "question",
      options: ["直接执行", "先给方案"]
    });
    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "allow",
          updatedInput: {
            answer: "先给方案",
            answers: {
              "你希望我接下来以哪种方式协作？": "先给方案"
            }
          }
        }
      }
    });
  });

  it("answers multi-question AskUserQuestion with a complete answers map", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PermissionRequest",
        tool_name: "AskUserQuestion",
        tool_input: {
          questions: [
            {
              header: "工作模式",
              question: "你希望我接下来以哪种方式协作？",
              options: [
                { label: "直接执行", description: "" },
                { label: "先给方案", description: "" }
              ]
            },
            {
              header: "输出风格",
              question: "你更喜欢我用哪种回答风格？",
              options: [
                { label: "极简", description: "" },
                { label: "平衡", description: "" }
              ]
            }
          ]
        },
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return {
              status: "answered",
              answers: [
                {
                  question: "你希望我接下来以哪种方式协作？",
                  answer: "先给方案",
                  optionIndex: 1
                },
                {
                  question: "你更喜欢我用哪种回答风格？",
                  answer: "平衡",
                  optionIndex: 1
                }
              ]
            };
          }
          return { ok: true };
        }
      }
    );

    expect(posted[0].body.event).toMatchObject({
      interactionKind: "question",
      questionText: "你希望我接下来以哪种方式协作？",
      options: ["直接执行", "先给方案"],
      questions: [
        {
          question: "你希望我接下来以哪种方式协作？",
          options: ["直接执行", "先给方案"]
        },
        {
          question: "你更喜欢我用哪种回答风格？",
          options: ["极简", "平衡"]
        }
      ]
    });
    expect(output).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "allow",
          updatedInput: {
            questions: [
              {
                question: "你希望我接下来以哪种方式协作？"
              },
              {
                question: "你更喜欢我用哪种回答风格？"
              }
            ],
            answers: {
              "你希望我接下来以哪种方式协作？": "先给方案",
              "你更喜欢我用哪种回答风格？": "平衡"
            }
          }
        }
      }
    });
  });

  it("dedupes duplicate multi-question answer keys like CodeIsland", () => {
    const output = buildQuestionAnswerOutput(
      {
        hook_event_name: "PermissionRequest",
        tool_name: "AskUserQuestion",
        tool_input: {
          questions: [
            { question: "重复的问题", options: ["A", "B"] },
            { question: "重复的问题", options: ["C", "D"] }
          ]
        }
      },
      {
        status: "answered",
        answers: [
          { question: "重复的问题", answer: "A", optionIndex: 0 },
          { question: "重复的问题", answer: "D", optionIndex: 1 }
        ]
      }
    );

    expect(output.hookSpecificOutput.decision.updatedInput.answers).toEqual({
      "重复的问题": "A",
      "重复的问题_2": "D"
    });
  });

  it("falls back to Claude native AskUserQuestion when the island question is skipped", async () => {
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "PermissionRequest",
        tool_name: "AskUserQuestion",
        tool_input: { question: "继续吗？", options: ["继续", "暂停"] },
        cwd: "/repo"
      },
      {
        postJson: async (pathname) => {
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") return { status: "skipped" };
          return { ok: true };
        }
      }
    );

    expect(output).toBeNull();
  });

  it("answers idle prompt choices through the question endpoint", async () => {
    const posted = [];
    const output = await routeClaudeHookPayload(
      {
        hook_event_name: "Notification",
        notification_type: "idle_prompt",
        message:
          "你选哪种方式？\n\nA) 逐轮过 — 从第一轮开始。\nB) 跳着聊 — 先聊关键题。\nC) 全量速答 — 先合成 roadmap。",
        cwd: "/repo"
      },
      {
        postJson: async (pathname, body) => {
          posted.push({ pathname, body });
          if (pathname === "/questions") return { id: "question-1" };
          if (pathname === "/questions/question-1/wait") {
            return { status: "answered", answer: "A", optionIndex: 0 };
          }
          return { ok: true };
        }
      }
    );

    expect(posted.map((entry) => entry.pathname)).toEqual([
      "/questions",
      "/questions/question-1/wait"
    ]);
    expect(posted[0].body.event).toMatchObject({
      interactionKind: "question",
      answerMode: "choice",
      options: [
        "A) 逐轮过 — 从第一轮开始。",
        "B) 跳着聊 — 先聊关键题。",
        "C) 全量速答 — 先合成 roadmap。"
      ]
    });
    expect(output).toEqual({
      hookSpecificOutput: {
        hookEventName: "Notification",
        answer: "A"
      }
    });
  });
});

describe("claudeHook permission output", () => {
  it("maps PreToolUse tablet Yes to Claude permissionDecision allow", () => {
    expect(buildPermissionDecisionOutput({ hook_event_name: "PreToolUse" }, "allow"))
      .toMatchObject({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow"
        }
      });
  });

  it("maps PreToolUse tablet No to Claude permissionDecision deny", () => {
    expect(buildPermissionDecisionOutput({ hook_event_name: "PreToolUse" }, "deny"))
      .toMatchObject({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny"
        }
      });
  });

  it("maps tablet Yes to a one-shot Claude permission allow", () => {
    expect(buildPermissionDecisionOutput({ hook_event_name: "PermissionRequest" }, "allow"))
      .toMatchObject({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "allow" }
        }
      });
  });

  it("maps tablet Always to session-scoped permission updates", () => {
    const output = buildPermissionDecisionOutput(
      {
        hook_event_name: "PermissionRequest",
        permission_suggestions: [
          {
            behavior: "allow",
            destination: "localSettings",
            rule: "AskUserQuestion"
          }
        ]
      },
      "always"
    );

    expect(output.hookSpecificOutput.decision.behavior).toBe("allow");
    expect(output.hookSpecificOutput.updatedPermissions).toEqual([
      {
        behavior: "allow",
        destination: "session",
        rule: "AskUserQuestion"
      }
    ]);
  });
});
