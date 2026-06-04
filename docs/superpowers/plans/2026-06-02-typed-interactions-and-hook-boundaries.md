# Typed Interactions and Hook Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AgentCard classify real Claude Code events correctly by separating tool activity, permissions, questions, plans, attention states, diagnostics, and future jump-back context.

**Architecture:** Keep `IslandSnapshot` as the frontend compatibility surface, but introduce typed interaction records inside the server and event model. Claude hook handling should default to observing `PreToolUse` as activity, only entering permission waiting through explicit permission events or an explicit gating mode.

**Tech Stack:** Node ESM server scripts in `scripts/island/*`, React/Vite UI in `src/*`, Vitest for JS/TS tests, local HTTP + WebSocket server on port `4317`.

---

## Current Evidence

- `docs/roadmap.md` says v0.3 hook bridge is experimental and should stop treating every `PreToolUse` as permission.
- `docs/roadmap.md` recommends v0.4 typed queues: `PermissionQueue`, `QuestionQueue`, `PlanQueue`, `AttentionQueue`, plus diagnostic event log.
- `scripts/island/claudeHook.js` currently routes every `PreToolUse` through `handlePermissionRequest()`.
- `src/types.ts` currently exposes one optional `intervention?: InterventionCard`.
- `scripts/island/server.js` currently exposes `/events`, `/permissions`, `/snapshot`, and `/ws`, but no diagnostic log endpoint.
- `src/App.tsx` already has enough UI surface to render permission buttons and question options, but it reads from one generic intervention card.

## Product Decomposition

1. **Tool Activity**
   - Reads, edits, bash commands, search, and other normal tool calls update state and event tail.
   - They do not require tablet approval by default.

2. **Permission Interaction**
   - Real `PermissionRequest` or explicit hook gating creates a permission record.
   - UI may show `Yes / Always / No` only when the server has a `permissionId`.
   - `Always` is only meaningful when Claude provides session-scoped permission suggestions.

3. **Question Interaction**
   - `AskUserQuestion`, skill direction prompts, and question-like payloads create a question record.
   - UI shows question text and options.
   - Early implementation may still require `Jump Back` for answer submission when protocol support is incomplete.

4. **Plan Interaction**
   - `ExitPlanMode` and similar plan-review prompts create a plan record.
   - Early implementation may render it as a plan-flavored question card.

5. **Attention Interaction**
   - Failures, completion, idle prompts, notification-only states, and high-cost alerts create attention records.
   - These are actionable but not approve/deny permissions.

6. **Diagnostics**
   - Keep recent raw hook events and normalized events available for local debugging.
   - Diagnostics must be capped and local-only, because hook payloads may contain file paths, commands, and user prompt text.

## Technical Decomposition

### New Concepts

```ts
type InteractionRecord =
  | PermissionInteraction
  | QuestionInteraction
  | PlanInteraction
  | AttentionInteraction;

type InteractionQueueName = "permissions" | "questions" | "plans" | "attention";
```

Server data flow:

```text
Claude hook / wrapper event
  -> normalized Island event
  -> interaction classifier
  -> typed queues + diagnostic log
  -> compatibility IslandSnapshot.intervention
  -> WebSocket + /snapshot
```

Compatibility rule:

- Frontend can keep rendering `snapshot.intervention` while server also carries `snapshot.interactions`.
- The active compatibility intervention is the highest-priority unresolved interaction:
  1. permission
  2. question
  3. plan
  4. attention

## Task 1: v0.3 Hook Boundary - Stop Blanket `PreToolUse` Gating

**Files:**
- Modify: `scripts/island/claudeHook.js`
- Modify: `scripts/island/claudeHook.test.js`
- Read: `scripts/island/claudeHookEvent.js`

- [x] **Step 1: Write failing tests for default `PreToolUse` observation**

Add tests in `scripts/island/claudeHook.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
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
});
```

- [x] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- scripts/island/claudeHook.test.js
```

Expected before implementation:

```text
FAIL routeClaudeHookPayload is not exported
```

- [x] **Step 3: Implement route function**

Refactor `scripts/island/claudeHook.js` so `main()` delegates to an exported route function:

```js
export async function routeClaudeHookPayload(
  payload,
  {
    postJson: post = postJson,
    preToolPermissionMode = process.env.AGENTCARD_PRETOOL_PERMISSION_MODE ?? "observe"
  } = {}
) {
  if (payload.hook_event_name === "PreToolUse") {
    if (preToolPermissionMode === "gate") {
      return handlePermissionRequest(payload, { postJson: post });
    }
    const event = mapClaudeHookToIslandEvent(payload);
    if (event) await post("/events", event);
    return null;
  }

  if (payload.hook_event_name === "PermissionRequest") {
    return handlePermissionRequest(payload, { postJson: post });
  }

  const event = mapClaudeHookToIslandEvent(payload);
  if (!event) return null;
  await post("/events", event);
  return null;
}
```

Update `main()`:

```js
const output = await routeClaudeHookPayload(payload);
if (output) process.stdout.write(JSON.stringify(output));
```

Update `handlePermissionRequest()` to return the decision output instead of writing directly:

```js
async function handlePermissionRequest(payload, { postJson: post = postJson } = {}) {
  const event =
    payload.hook_event_name === "PreToolUse"
      ? mapPreToolUseToPermissionEvent(payload)
      : mapClaudeHookToIslandEvent(payload);
  if (!event) return null;

  try {
    const permission = await post("/permissions", { event, hook: payload });
    const decision = permission.status
      ? permission
      : await post(`/permissions/${permission.id}/wait`, { timeoutMs: 300000 });
    return buildPermissionDecisionOutput(payload, decision.status);
  } catch {
    return null;
  }
}
```

- [x] **Step 4: Verify focused and full tests**

Run:

```bash
npm test -- scripts/island/claudeHook.test.js
npm test
```

Expected:

```text
PASS scripts/island/claudeHook.test.js
PASS all tests
```

## Task 2: Introduce Typed Interaction Records

**Files:**
- Create: `scripts/island/interactions.js`
- Create: `scripts/island/interactions.test.js`
- Modify: `scripts/island/eventModel.js`
- Modify: `src/types.ts`

- [x] **Step 1: Write interaction classifier tests**

Create `scripts/island/interactions.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  classifyInteraction,
  createInteractionQueues,
  selectActiveInteraction
} from "./interactions.js";

describe("typed interactions", () => {
  it("classifies permission events into PermissionQueue", () => {
    expect(
      classifyInteraction({
        state: "waiting_approval",
        message: "Permission: Bash — npm test",
        interactionKind: "permission",
        permissionId: "perm-1",
        toolName: "Bash",
        target: "npm test"
      })
    ).toMatchObject({
      queue: "permissions",
      kind: "permission",
      id: "perm-1",
      title: "权限确认",
      actions: ["allow", "deny"]
    });
  });

  it("classifies AskUserQuestion into QuestionQueue with options", () => {
    expect(
      classifyInteraction({
        state: "waiting_input",
        message: "AskUserQuestion: 选择方向",
        interactionKind: "question",
        questionText: "选择实现方向",
        options: ["1. Server first", "2. UI first", "3. Tests first"]
      })
    ).toMatchObject({
      queue: "questions",
      kind: "question",
      title: "需要回答",
      options: ["1. Server first", "2. UI first", "3. Tests first"]
    });
  });

  it("prioritizes permissions over questions, plans, and attention", () => {
    const queues = createInteractionQueues();
    queues.attention.push({ id: "a1", kind: "attention", title: "完成" });
    queues.questions.push({ id: "q1", kind: "question", title: "问题" });
    queues.permissions.push({ id: "p1", kind: "permission", title: "权限" });

    expect(selectActiveInteraction(queues)).toMatchObject({
      id: "p1",
      kind: "permission"
    });
  });
});
```

- [x] **Step 2: Verify the test fails**

Run:

```bash
npm test -- scripts/island/interactions.test.js
```

Expected:

```text
FAIL Cannot find module './interactions.js'
```

- [x] **Step 3: Implement minimal interaction module**

Create `scripts/island/interactions.js`:

```js
export function createInteractionQueues() {
  return {
    permissions: [],
    questions: [],
    plans: [],
    attention: []
  };
}

export function classifyInteraction(event) {
  if (event.interactionKind === "permission" || event.interventionKind === "waiting_approval") {
    return {
      queue: "permissions",
      id: event.permissionId ?? stableId(event, "permission"),
      kind: "permission",
      title: event.interactionTitle ?? "权限确认",
      detail: event.interactionDetail ?? event.interventionDetail ?? event.message,
      payload: event.interactionPayload ?? event.interventionPayload ?? event.message,
      actions: event.canAlways ? ["allow", "always", "deny"] : ["allow", "deny"],
      toolName: event.toolName,
      target: event.target
    };
  }

  if (event.interactionKind === "question" || event.interventionKind === "waiting_input") {
    return {
      queue: "questions",
      id: stableId(event, "question"),
      kind: "question",
      title: event.interactionTitle ?? "需要回答",
      detail: event.questionText ?? event.interventionDetail ?? event.message,
      payload: event.interactionPayload ?? event.interventionPayload ?? event.message,
      options: event.options ?? []
    };
  }

  if (event.interactionKind === "plan") {
    return {
      queue: "plans",
      id: stableId(event, "plan"),
      kind: "plan",
      title: event.interactionTitle ?? "计划审阅",
      detail: event.interactionDetail ?? event.message,
      payload: event.interactionPayload ?? event.message,
      options: event.options ?? []
    };
  }

  if (
    event.interactionKind === "attention" ||
    event.interventionKind === "command_failed" ||
    event.interventionKind === "test_failed" ||
    event.interventionKind === "completed"
  ) {
    return {
      queue: "attention",
      id: stableId(event, "attention"),
      kind: "attention",
      title: event.interventionTitle ?? event.interactionTitle ?? "需要注意",
      detail: event.interventionDetail ?? event.interactionDetail ?? event.message,
      payload: event.interventionPayload ?? event.interactionPayload ?? event.message
    };
  }

  return null;
}

export function applyInteraction(queues, event) {
  const interaction = classifyInteraction(event);
  if (!interaction) return queues;
  const next = cloneQueues(queues);
  upsert(next[interaction.queue], interaction);
  return next;
}

export function selectActiveInteraction(queues) {
  return (
    queues.permissions[0] ??
    queues.questions[0] ??
    queues.plans[0] ??
    queues.attention[0] ??
    null
  );
}

function cloneQueues(queues) {
  return {
    permissions: [...(queues?.permissions ?? [])],
    questions: [...(queues?.questions ?? [])],
    plans: [...(queues?.plans ?? [])],
    attention: [...(queues?.attention ?? [])]
  };
}

function upsert(queue, interaction) {
  const index = queue.findIndex((item) => item.id === interaction.id);
  if (index >= 0) queue[index] = interaction;
  else queue.push(interaction);
}

function stableId(event, prefix) {
  return `${prefix}-${event.timestamp ?? Date.now()}-${hashText(event.message ?? prefix)}`;
}

function hashText(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}
```

- [x] **Step 4: Extend snapshot types**

Modify `src/types.ts`:

```ts
export type InteractionQueueName = "permissions" | "questions" | "plans" | "attention";

export type InteractionKind = "permission" | "question" | "plan" | "attention";

export interface InteractionRecord {
  id: string;
  kind: InteractionKind;
  title: string;
  detail: string;
  payload: string;
  actions?: Array<"allow" | "always" | "deny">;
  options?: string[];
  permissionId?: string;
}

export interface InteractionQueues {
  permissions: InteractionRecord[];
  questions: InteractionRecord[];
  plans: InteractionRecord[];
  attention: InteractionRecord[];
}
```

Add to `IslandSnapshot`:

```ts
interactions?: InteractionQueues;
```

- [x] **Step 5: Verify tests**

Run:

```bash
npm test -- scripts/island/interactions.test.js
npm test
```

Expected:

```text
PASS scripts/island/interactions.test.js
PASS all tests
```

## Task 3: Wire Typed Interactions Into Server Snapshots

**Files:**
- Modify: `scripts/island/eventModel.js`
- Modify: `scripts/island/eventModel.test.js`
- Modify: `scripts/island/server.js`
- Modify: `scripts/island/server.test.js`

- [x] **Step 1: Write failing snapshot compatibility tests**

Add to `scripts/island/eventModel.test.js`:

```js
it("keeps typed queues while exposing the active interaction as compatibility intervention", () => {
  const snapshot = eventToSnapshot(
    {
      agent: "claude",
      project: "repo",
      state: "waiting_approval",
      message: "Permission: Bash — npm test",
      timestamp: 1000,
      interactionKind: "permission",
      permissionId: "perm-1",
      interactionPayload: "tool: Bash\ncommand: npm test"
    },
    createIdleSnapshot({ project: "repo" })
  );

  expect(snapshot.interactions.permissions).toHaveLength(1);
  expect(snapshot.interactions.questions).toHaveLength(0);
  expect(snapshot.intervention).toMatchObject({
    kind: "waiting_approval",
    title: "权限确认",
    permissionId: "perm-1"
  });
});
```

- [x] **Step 2: Run and verify failure**

Run:

```bash
npm test -- scripts/island/eventModel.test.js
```

Expected:

```text
FAIL expected undefined to have property permissions
```

- [x] **Step 3: Implement queue integration**

In `scripts/island/eventModel.js`, import:

```js
import {
  applyInteraction,
  createInteractionQueues,
  selectActiveInteraction
} from "./interactions.js";
```

Inside `eventToSnapshot()`:

```js
const interactions = applyInteraction(
  previous?.interactions ?? createInteractionQueues(),
  event
);
const activeInteraction = selectActiveInteraction(interactions);
const intervention = buildIntervention(event, commandLabel, previous, activeInteraction);
```

Return snapshot with:

```js
interactions,
...(intervention ? { intervention } : {})
```

Update `buildIntervention()` to accept `activeInteraction` and convert it to existing `InterventionCard` shape:

```js
function buildIntervention(event, commandLabel, previous, activeInteraction) {
  if (activeInteraction) return interventionFromInteraction(activeInteraction);
  if (event.interventionKind) {
    // keep current fallback for wrapper events
  }
  return interventionForEvent(event, commandLabel);
}
```

Implement:

```js
function interventionFromInteraction(interaction) {
  if (interaction.kind === "permission") {
    return {
      kind: "waiting_approval",
      title: interaction.title,
      detail: interaction.detail,
      payload: interaction.payload,
      ...(interaction.id ? { permissionId: interaction.id } : {}),
      ...(interaction.options ? { options: interaction.options } : {})
    };
  }
  if (interaction.kind === "question" || interaction.kind === "plan") {
    return {
      kind: "waiting_input",
      title: interaction.title,
      detail: interaction.detail,
      payload: interaction.payload,
      ...(interaction.options ? { options: interaction.options } : {})
    };
  }
  return {
    kind: interaction.title === "任务完成" ? "completed" : "command_failed",
    title: interaction.title,
    detail: interaction.detail,
    payload: interaction.payload
  };
}
```

- [x] **Step 4: Verify event model and server tests**

Run:

```bash
npm test -- scripts/island/eventModel.test.js scripts/island/server.test.js
npm test
```

Expected:

```text
PASS eventModel/server tests
PASS all tests
```

## Task 4: Map `AskUserQuestion` and Plan-Like Tools Correctly

**Files:**
- Modify: `scripts/island/claudeHookEvent.js`
- Modify: `scripts/island/claudeHookEvent.test.js`

- [x] **Step 1: Write failing tests**

Add to `scripts/island/claudeHookEvent.test.js`:

```js
it("maps AskUserQuestion PreToolUse to a question interaction, not permission", () => {
  const event = mapClaudeHookToIslandEvent({
    hook_event_name: "PreToolUse",
    tool_name: "AskUserQuestion",
    tool_input: {
      question: "选择下一步方向",
      options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
    },
    cwd: "/repo"
  });

  expect(event).toMatchObject({
    state: "waiting_input",
    interactionKind: "question",
    interactionTitle: "需要回答",
    options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
  });
  expect(event.interventionKind).not.toBe("waiting_approval");
});

it("maps ExitPlanMode to a plan interaction", () => {
  const event = mapClaudeHookToIslandEvent({
    hook_event_name: "PreToolUse",
    tool_name: "ExitPlanMode",
    tool_input: { plan: "1. Add queues\n2. Add tests" },
    cwd: "/repo"
  });

  expect(event).toMatchObject({
    state: "waiting_input",
    interactionKind: "plan",
    interactionTitle: "计划审阅"
  });
});
```

- [x] **Step 2: Run and verify failure**

Run:

```bash
npm test -- scripts/island/claudeHookEvent.test.js
```

Expected:

```text
FAIL expected state running_command to equal waiting_input
```

- [x] **Step 3: Implement special mappings**

In `mapPreToolUse(base, payload)`:

```js
if (payload.tool_name === "AskUserQuestion") return mapQuestionTool(base, payload);
if (payload.tool_name === "ExitPlanMode") return mapPlanTool(base, payload);
```

Add:

```js
function mapQuestionTool(base, payload) {
  const input = payload.tool_input ?? {};
  const options = extractOptions(input);
  const questionText = input.question ?? input.prompt ?? toolSummary(payload);
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
    options
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
    options: ["Approve plan", "Request changes", "Jump Back"]
  };
}

function extractOptions(input) {
  if (Array.isArray(input.options)) return input.options.map(String);
  if (Array.isArray(input.choices)) return input.choices.map(String);
  if (typeof input.question === "string") return numberedLines(input.question);
  if (typeof input.prompt === "string") return numberedLines(input.prompt);
  return [];
}

function numberedLines(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[\).]\s+/.test(line));
}
```

- [x] **Step 4: Verify tests**

Run:

```bash
npm test -- scripts/island/claudeHookEvent.test.js
npm test
```

Expected:

```text
PASS claudeHookEvent tests
PASS all tests
```

## Task 5: Add Diagnostic Event Log Endpoint

**Files:**
- Modify: `scripts/island/server.js`
- Modify: `scripts/island/server.test.js`

- [x] **Step 1: Write failing server test**

Add to `scripts/island/server.test.js`:

```js
it("exposes capped diagnostic events for local debugging", async () => {
  const server = createIslandHttpServer({ project: "repo" });
  await listen(server, 0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      state: "reading",
      message: "Read: package.json",
      timestamp: 1000,
      command: ["claude"],
      cwd: "/repo"
    })
  });

  const response = await fetch(`${baseUrl}/diagnostics/events`);
  const body = await response.json();
  server.close();

  expect(body.events).toHaveLength(1);
  expect(body.events[0]).toMatchObject({
    normalized: {
      state: "reading",
      message: "Read: package.json"
    }
  });
});
```

- [x] **Step 2: Verify failure**

Run:

```bash
npm test -- scripts/island/server.test.js
```

Expected:

```text
FAIL expected 404 or missing events
```

- [x] **Step 3: Implement diagnostic log in state store**

In `createIslandStateStore()`:

```js
let diagnosticEvents = [];
```

In `applyEvent(event)`:

```js
snapshot = eventToSnapshot(event, snapshot);
diagnosticEvents = appendDiagnosticEvent(diagnosticEvents, {
  receivedAt: Date.now(),
  normalized: event,
  snapshotState: snapshot.state,
  activeIntervention: snapshot.intervention
});
return snapshot;
```

Add:

```js
getDiagnosticEvents() {
  return diagnosticEvents;
}
```

Add helper:

```js
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
```

In HTTP handler:

```js
if (request.method === "GET" && request.url === "/diagnostics/events") {
  sendJson(response, { events: store.getDiagnosticEvents() });
  return;
}
```

- [x] **Step 4: Verify endpoint**

Run:

```bash
npm test -- scripts/island/server.test.js
npm test
```

Expected:

```text
PASS server tests
PASS all tests
```

## Task 6: Split Permission and Question Rendering Paths

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/types.ts`

- [x] **Step 1: Write failing SSR tests**

Add to `src/App.test.tsx`:

```tsx
it("names question cards as questions rather than approval bars", () => {
  const question = {
    kind: "waiting_input",
    title: "需要回答",
    detail: "选择下一步方向",
    payload: "选择下一步方向",
    options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
  };

  expect(question.title).toBe("需要回答");
  expect(question.options).toContain("1. 修 hook");
});
```

This is a lightweight test. Add a stronger rendering test once `App` accepts injected snapshots or once card rendering helpers are extracted.

- [x] **Step 2: Extract label helpers**

In `src/App.tsx`, add:

```ts
function interactionCardTitle(snapshot: IslandSnapshot) {
  if (snapshot.intervention?.kind === "waiting_input") return "Question Bar";
  if (snapshot.intervention?.kind === "waiting_approval") return "Approval Bar";
  if (snapshot.intervention?.kind === "completed") return "Completion Bar";
  if (snapshot.intervention) return "Attention Bar";
  return "Approval Bar";
}
```

Export the helper for testing if needed.

- [x] **Step 3: Make question buttons non-permission actions**

In question rendering branches, ensure option buttons do not call `decidePermission()`. They should either:

```tsx
<button type="button" className="ci-option" disabled title="请回 terminal 回答">
  {option}
</button>
```

or call a future `submitQuestionAnswer()` only after an answer API exists.

- [x] **Step 4: Verify frontend tests and build**

Run:

```bash
npm test -- src/App.test.tsx
npm test
npm run build
```

Expected:

```text
PASS App tests
PASS all tests
Build succeeds
```

## Task 7: Jump Back Preparation Only

**Files:**
- Modify: `src/types.ts`
- Modify: `scripts/island/eventModel.js`
- Modify: `scripts/island/eventModel.test.js`

- [x] **Step 1: Add context shape without implementing OS focus**

Add to `src/types.ts`:

```ts
export interface JumpBackContext {
  cwd?: string;
  command?: string[];
  terminalHint?: string;
  editorHint?: string;
}
```

Add to `IslandSnapshot`:

```ts
jumpBack?: JumpBackContext;
```

- [x] **Step 2: Write event model test**

Add to `scripts/island/eventModel.test.js`:

```js
it("preserves jump back context from cwd and command", () => {
  const snapshot = eventToSnapshot(
    {
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
```

- [x] **Step 3: Implement context propagation**

In `eventToSnapshot()` return:

```js
jumpBack: {
  cwd: event.cwd ?? previous?.jumpBack?.cwd,
  command: event.command ?? previous?.jumpBack?.command
},
```

- [x] **Step 4: Verify**

Run:

```bash
npm test -- scripts/island/eventModel.test.js
npm test
```

Expected:

```text
PASS event model tests
PASS all tests
```

## Test Plan by Milestone

After Task 1:

```bash
npm test -- scripts/island/claudeHook.test.js
npm test
```

After Tasks 2-3:

```bash
npm test -- scripts/island/interactions.test.js scripts/island/eventModel.test.js
npm test
```

After Task 4:

```bash
npm test -- scripts/island/claudeHookEvent.test.js
npm test
```

After Task 5:

```bash
npm test -- scripts/island/server.test.js
npm test
```

After Task 6:

```bash
npm test -- src/App.test.tsx
npm test
npm run build
```

Final verification:

```bash
npm test
npm run build
```

Manual browser check:

- Open `http://127.0.0.1:4317`.
- Trigger a normal `PreToolUse Read`; expected: status updates to reading, no tablet approval wait.
- Trigger a `PermissionRequest`; expected: permission card with Yes/No and Always only when supported.
- Trigger `AskUserQuestion`; expected: question card with options, not "Approval Bar".
- Open `/diagnostics/events`; expected: recent normalized events visible.

## Adversarial Review

### Challenge 1: "Why not implement v0.4 queues first and ignore v0.3?"

If `PreToolUse` still gates everything, typed queues will receive bad classifications. The first task must fix the ingestion boundary so the queues classify real product semantics rather than artifacts of the temporary hook implementation.

**Decision:** Pass. Task 1 must come first.

### Challenge 2: "Will disabling `PreToolUse` gating lose useful tablet approvals?"

It may reduce approvals for environments that only expose `PreToolUse`, but the current default creates false positives and blocks normal Claude Code behavior. The plan keeps explicit `AGENTCARD_PRETOOL_PERMISSION_MODE=gate` for live experiments while making product default observe-only.

**Decision:** Pass with explicit gate mode.

### Challenge 3: "Can question answers actually be submitted from the tablet?"

Not reliably yet. The plan must not fake answer submission. Early question cards can display options and tell the user to jump back until a protocol-supported answer endpoint exists.

**Decision:** Pass. Display is useful; fake submission is forbidden.

### Challenge 4: "Does adding `interactions` to snapshot break the UI?"

The property is optional and additive. Existing frontend keeps using `intervention`; server derives compatibility intervention from active typed interaction.

**Decision:** Pass.

### Challenge 5: "Will diagnostics leak too much?"

Diagnostics are local-only but still contain sensitive prompts, commands, and paths. The plan caps entries to 50 and truncates long strings to 1200 characters. Do not expose it remotely beyond the local server surface already used by AgentCard.

**Decision:** Pass with capped diagnostic log.

### Challenge 6: "Is Jump Back too early?"

Full OS focus is too early. Capturing `cwd` and `command` is low-risk and makes later Jump Back implementation easier. No focus stealing is implemented in this milestone.

**Decision:** Pass as metadata-only.

## Plan Pass Criteria

The plan is considered passed when:

- It preserves the product distinction between activity, permission, question, plan, and attention.
- It keeps frontend compatibility through `snapshot.intervention`.
- It fixes blanket `PreToolUse` gating before adding queues.
- It includes diagnostics for real Claude Code testing.
- It does not fake permission approval or question answering.
- Each major task has focused tests and full test/build verification.

This plan passes the adversarial review and is ready for implementation.
