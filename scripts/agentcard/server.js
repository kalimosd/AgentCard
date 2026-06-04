import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createIdleSnapshot, eventToSnapshot } from "./eventModel.js";
import { createInteractionQueues } from "./interactions.js";
import { createPermissionStore } from "./permissionStore.js";
import { createQuestionStore } from "./questionStore.js";
import { createSnapshotBroadcaster } from "./websocket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const defaultStaticDir = path.join(rootDir, "dist");

export function createAgentCardHttpServer({
  project = path.basename(process.cwd()),
  staticDir = defaultStaticDir,
  permissionStore = createPermissionStore(),
  questionStore = createQuestionStore()
} = {}) {
  const store = createAgentCardStateStore({ project });
  const broadcaster = createSnapshotBroadcaster();

  const server = http.createServer(async (request, response) => {
    addCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, { ok: true });
      return;
    }

    if (request.method === "GET" && request.url === "/snapshot") {
      sendJson(response, store.getSnapshot());
      return;
    }

    if (request.method === "GET" && request.url === "/diagnostics/events") {
      sendJson(response, { events: store.getDiagnosticEvents() });
      return;
    }

    if (request.method === "POST" && request.url === "/events") {
      try {
        const event = await readJson(request);
        const snapshot = store.applyEvent(event, { raw: event });
        broadcaster.broadcast(snapshot);
        response.writeHead(204);
        response.end();
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    if (request.method === "POST" && request.url === "/permissions") {
      try {
        const body = await readJson(request);
        const matchedStatus = permissionStore.match({
          hook: body.hook,
          event: body.event
        });
        if (matchedStatus) {
          sendJson(response, { status: matchedStatus });
          return;
        }
        const id = permissionStore.create({
          hook: body.hook,
          event: body.event
        });
        const snapshot = store.applyEvent(
          {
            ...body.event,
            permissionId: id
          },
          { raw: body.hook }
        );
        broadcaster.broadcast(snapshot);
        sendJson(response, { id });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    if (request.method === "POST" && request.url === "/questions") {
      try {
        const body = await readJson(request);
        const id = questionStore.create({
          hook: body.hook,
          event: body.event
        });
        const snapshot = store.applyEvent(
          {
            ...body.event,
            questionId: id
          },
          { raw: body.hook }
        );
        broadcaster.broadcast(snapshot);
        sendJson(response, { id });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const questionWaitMatch = request.url?.match(/^\/questions\/([^/]+)\/wait$/);
    if (request.method === "POST" && questionWaitMatch) {
      try {
        const body = await readJson(request);
        const result = await questionStore.waitForAnswer(
          questionWaitMatch[1],
          body.timeoutMs ?? 300000
        );
        const snapshot = store.patchSnapshot({
          state: "thinking",
          recentAction: questionDecisionAction(result),
          lastSummary:
            result.status === "answered"
              ? "问题已在 AgentCard 副屏回答，Claude 继续执行。"
              : "问题已跳过，Claude 回到 terminal 原生流程。",
          clearIntervention: true
        });
        broadcaster.broadcast(snapshot);
        sendJson(response, result);
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const questionAnswerMatch = request.url?.match(/^\/questions\/([^/]+)\/answer$/);
    if (request.method === "POST" && questionAnswerMatch) {
      try {
        const body = await readJson(request);
        const ok = questionStore.answer(questionAnswerMatch[1], {
          answer: body.answer,
          optionIndex: body.optionIndex
        });
        sendJson(response, { ok });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const questionAnswersMatch = request.url?.match(/^\/questions\/([^/]+)\/answers$/);
    if (request.method === "POST" && questionAnswersMatch) {
      try {
        const body = await readJson(request);
        const ok = questionStore.answerGroup(questionAnswersMatch[1], {
          answers: body.answers
        });
        sendJson(response, { ok });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const questionSkipMatch = request.url?.match(/^\/questions\/([^/]+)\/skip$/);
    if (request.method === "POST" && questionSkipMatch) {
      try {
        const ok = questionStore.skip(questionSkipMatch[1]);
        sendJson(response, { ok });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const waitMatch = request.url?.match(/^\/permissions\/([^/]+)\/wait$/);
    if (request.method === "POST" && waitMatch) {
      try {
        const body = await readJson(request);
        const status = await permissionStore.waitForDecision(
          waitMatch[1],
          body.timeoutMs ?? 300000
        );
        const approved = status === "allow" || status === "always";
        const snapshot = store.patchSnapshot({
          state: "thinking",
          recentAction: permissionDecisionAction(status),
          lastSummary: approved
            ? "权限已在 AgentCard 副屏批准。"
            : "权限已在 AgentCard 副屏拒绝。",
          clearIntervention: true
        });
        broadcaster.broadcast(snapshot);
        sendJson(response, { status });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    const decisionMatch = request.url?.match(/^\/permissions\/([^/]+)\/decision$/);
    if (request.method === "POST" && decisionMatch) {
      try {
        const body = await readJson(request);
        const ok = permissionStore.decide(decisionMatch[1], body.decision);
        sendJson(response, { ok });
      } catch (error) {
        sendJson(response, { error: error.message }, 400);
      }
      return;
    }

    serveStatic(request, response, staticDir);
  });

  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws") {
      socket.destroy();
      return;
    }
    broadcaster.accept(request, socket, head, store.getSnapshot());
  });

  return server;
}

function permissionDecisionAction(status) {
  if (status === "always") return "副屏已设为本会话总是允许，Claude 继续执行";
  if (status === "allow") return "副屏已允许权限，Claude 继续执行";
  return "副屏已拒绝权限";
}

function questionDecisionAction(result) {
  if (result.status !== "answered") return "副屏已跳过问题";
  if (Array.isArray(result.answers)) {
    return `副屏已选择 ${result.answers.length} 项`;
  }
  return `副屏已选择：${result.answer}`;
}

export function createAgentCardStateStore({ project }) {
  let snapshot = createIdleSnapshot({ project });
  let diagnosticEvents = [];

  return {
    getSnapshot() {
      return snapshot;
    },
    getDiagnosticEvents() {
      return diagnosticEvents;
    },
    applyEvent(event, diagnostic = {}) {
      snapshot = eventToSnapshot(event, snapshot);
      diagnosticEvents = appendDiagnosticEvent(diagnosticEvents, {
        receivedAt: Date.now(),
        ...(diagnostic.raw ? { raw: diagnostic.raw } : {}),
        normalized: event,
        snapshotState: snapshot.state,
        activeIntervention: snapshot.intervention
      });
      return snapshot;
    },
    patchSnapshot(patch) {
      const { clearIntervention, ...rest } = patch;
      snapshot = { ...snapshot, ...rest };
      if (clearIntervention) {
        delete snapshot.intervention;
        snapshot.interactions = createInteractionQueues();
      }
      return snapshot;
    }
  };
}

function appendDiagnosticEvent(events, entry) {
  return [...events, redactDiagnosticEntry(entry)].slice(-50);
}

function redactDiagnosticEntry(entry) {
  return JSON.parse(
    JSON.stringify(entry, (_key, value) => {
      if (typeof value === "string" && value.length > 1200) {
        return `${value.slice(0, 1200)}…`;
      }
      return value;
    })
  );
}

export async function startAgentCardServer({ port }) {
  const server = createAgentCardHttpServer();

  await new Promise((resolve) => {
    server.listen(port, "0.0.0.0", resolve);
  });

  console.log(`AgentCard server listening on http://127.0.0.1:${port}`);
  return server;
}

function addCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }
  return JSON.parse(body || "{}");
}

function serveStatic(request, response, staticDir) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = safeJoin(staticDir, pathname);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(staticDir, "index.html");
    if (fs.existsSync(indexPath)) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(fs.readFileSync(indexPath));
      return;
    }
    response.writeHead(404);
    response.end("Build the UI first with npm run build.");
    return;
  }

  response.writeHead(200, { "content-type": contentType(filePath) });
  response.end(fs.readFileSync(filePath));
}

function safeJoin(baseDir, pathname) {
  const resolved = path.resolve(baseDir, `.${pathname}`);
  if (!resolved.startsWith(path.resolve(baseDir))) return null;
  return resolved;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
