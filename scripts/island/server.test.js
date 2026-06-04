import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createStartingEvent } from "./eventModel.js";
import { createIslandHttpServer, createIslandStateStore } from "./server.js";

describe("island server", () => {
  it("updates the latest snapshot from wrapper events", () => {
    const store = createIslandStateStore({ project: "AgentDock" });

    store.applyEvent(
      createStartingEvent({
        command: ["claude"],
        cwd: "/Users/me/AgentDock",
        timestamp: 1760000000000
      })
    );

    const snapshot = store.getSnapshot();

    expect(snapshot).toMatchObject({
      agent: "claude",
      project: "AgentDock",
      state: "starting",
      recentAction: "Starting claude"
    });
  });

  it("clears typed interactions when the active intervention is cleared", () => {
    const store = createIslandStateStore({ project: "AgentDock" });

    const permission = store.applyEvent({
      agent: "claude",
      project: "AgentDock",
      state: "waiting_approval",
      message: "Permission: Bash — npm test",
      timestamp: 1760000000000,
      interactionKind: "permission",
      permissionId: "perm-1",
      interactionPayload: "tool: Bash\ncommand: npm test"
    });

    expect(permission.intervention).toMatchObject({
      kind: "waiting_approval",
      permissionId: "perm-1"
    });

    store.patchSnapshot({
      state: "thinking",
      recentAction: "副屏已允许权限，Claude 继续执行",
      clearIntervention: true
    });

    const reading = store.applyEvent({
      agent: "claude",
      project: "AgentDock",
      state: "reading",
      message: "Read: App.tsx",
      timestamp: 1760000001000,
      toolKind: "read",
      toolLabel: "App.tsx"
    });

    expect(reading.intervention).toBeUndefined();
    expect(reading.interactions.permissions).toHaveLength(0);
  });

  it("exposes capped diagnostic events for local debugging", async () => {
    const server = createIslandHttpServer({ project: "AgentDock" });

    await requestServer(server, {
      method: "POST",
      url: "/events",
      body: {
        agent: "claude",
        project: "AgentDock",
        state: "reading",
        message: "Read: package.json",
        timestamp: 1760000000000,
        command: ["claude"],
        cwd: "/Users/me/AgentDock"
      }
    });

    const response = await requestServer(server, {
      method: "GET",
      url: "/diagnostics/events"
    });
    const body = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      normalized: {
        state: "reading",
        message: "Read: package.json"
      },
      snapshotState: "reading"
    });
  });

  it("creates answerable question interventions and resolves answers", async () => {
    const server = createIslandHttpServer({ project: "AgentDock" });

    const created = await requestServer(server, {
      method: "POST",
      url: "/questions",
      body: {
        hook: {
          hook_event_name: "PermissionRequest",
          tool_name: "AskUserQuestion"
        },
        event: {
          agent: "claude",
          project: "AgentDock",
          state: "waiting_input",
          message: "AskUserQuestion: 选择方向",
          timestamp: 1760000000000,
          command: ["claude"],
          cwd: "/Users/me/AgentDock",
          interactionKind: "question",
          interactionTitle: "需要回答",
          questionText: "选择方向",
          options: ["直接执行", "先给方案"]
        }
      }
    });
    const createdBody = JSON.parse(created.body);

    const snapshot = JSON.parse(
      (
        await requestServer(server, {
          method: "GET",
          url: "/snapshot"
        })
      ).body
    );

    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_input",
      interactionKind: "question",
      questionId: createdBody.id,
      options: ["直接执行", "先给方案"]
    });

    const waitPromise = requestServer(server, {
      method: "POST",
      url: `/questions/${createdBody.id}/wait`,
      body: { timeoutMs: 1000 }
    });

    const answer = await requestServer(server, {
      method: "POST",
      url: `/questions/${createdBody.id}/answer`,
      body: { answer: "先给方案", optionIndex: 1 }
    });
    const waited = await waitPromise;

    expect(JSON.parse(answer.body)).toEqual({ ok: true });
    expect(JSON.parse(waited.body)).toEqual({
      status: "answered",
      answer: "先给方案",
      optionIndex: 1
    });
  });

  it("creates multi-question interventions and resolves grouped answers", async () => {
    const server = createIslandHttpServer({ project: "AgentDock" });

    const created = await requestServer(server, {
      method: "POST",
      url: "/questions",
      body: {
        hook: {
          hook_event_name: "PermissionRequest",
          tool_name: "AskUserQuestion"
        },
        event: {
          agent: "claude",
          project: "AgentDock",
          state: "waiting_input",
          message: "AskUserQuestion: 多题选择",
          timestamp: 1760000000000,
          command: ["claude"],
          cwd: "/Users/me/AgentDock",
          interactionKind: "question",
          interactionTitle: "需要回答",
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
        }
      }
    });
    const createdBody = JSON.parse(created.body);

    const snapshot = JSON.parse(
      (
        await requestServer(server, {
          method: "GET",
          url: "/snapshot"
        })
      ).body
    );

    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_input",
      interactionKind: "question",
      questionId: createdBody.id,
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

    const waitPromise = requestServer(server, {
      method: "POST",
      url: `/questions/${createdBody.id}/wait`,
      body: { timeoutMs: 1000 }
    });

    const answer = await requestServer(server, {
      method: "POST",
      url: `/questions/${createdBody.id}/answers`,
      body: {
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
      }
    });
    const waited = await waitPromise;

    expect(JSON.parse(answer.body)).toEqual({ ok: true });
    expect(JSON.parse(waited.body)).toEqual({
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
    });
  });

  it("marks parsed terminal choice questions as answerable in the snapshot", async () => {
    const server = createIslandHttpServer({ project: "AgentDock" });

    const created = await requestServer(server, {
      method: "POST",
      url: "/questions",
      body: {
        hook: {
          hook_event_name: "Notification",
          notification_type: "idle_prompt"
        },
        event: {
          agent: "claude",
          project: "AgentDock",
          state: "waiting_input",
          message: "你选哪种方式？",
          timestamp: 1760000000000,
          command: ["claude"],
          cwd: "/Users/me/AgentDock",
          interactionKind: "question",
          interactionTitle: "需要回答",
          questionText: "你选哪种方式？",
          answerMode: "choice",
          options: ["A) 逐轮过", "B) 跳着聊", "C) 全量速答"]
        }
      }
    });
    const createdBody = JSON.parse(created.body);
    const snapshot = JSON.parse(
      (
        await requestServer(server, {
          method: "GET",
          url: "/snapshot"
        })
      ).body
    );

    expect(snapshot.intervention).toMatchObject({
      kind: "waiting_input",
      interactionKind: "question",
      answerMode: "choice",
      questionId: createdBody.id,
      options: ["A) 逐轮过", "B) 跳着聊", "C) 全量速答"]
    });
  });
});

function requestServer(server, { method, url, body }) {
  return new Promise((resolve) => {
    const request = Readable.from(
      body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
    );
    request.method = method;
    request.url = url;

    const chunks = [];
    const response = {
      headers: {},
      status: 200,
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      writeHead(status, headers = {}) {
        this.status = status;
        for (const [name, value] of Object.entries(headers)) {
          this.setHeader(name, value);
        }
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        resolve({
          status: this.status,
          headers: this.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      }
    };

    server.emit("request", request, response);
  });
}
