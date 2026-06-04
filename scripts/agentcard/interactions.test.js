import { describe, expect, it } from "vitest";
import {
  applyInteraction,
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

  it("classifies multi-question payloads into the question queue", () => {
    expect(
      classifyInteraction({
        state: "waiting_input",
        message: "AskUserQuestion: 多题选择",
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
        ],
        questionId: "question-1"
      })
    ).toMatchObject({
      queue: "questions",
      kind: "question",
      questionId: "question-1",
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
  });

  it("keeps answerable plan choices in the plan queue with a question id", () => {
    expect(
      classifyInteraction({
        state: "waiting_input",
        message: "ExitPlanMode: plan review",
        interactionKind: "plan",
        questionId: "question-1",
        answerMode: "choice",
        interactionPayload: "1. Add tests\n2. Implement",
        options: [
          "1. Yes, and use auto mode",
          "2. Yes, manually approve edits",
          "3. Tell Claude what to change"
        ]
      })
    ).toMatchObject({
      queue: "plans",
      kind: "plan",
      questionId: "question-1",
      answerMode: "choice",
      options: [
        "1. Yes, and use auto mode",
        "2. Yes, manually approve edits",
        "3. Tell Claude what to change"
      ]
    });
  });

  it("prioritizes permissions over questions, plans, and attention", () => {
    const queues = createInteractionQueues();
    queues.attention.push({ id: "a1", kind: "attention", title: "完成" });
    queues.plans.push({ id: "pl1", kind: "plan", title: "计划" });
    queues.questions.push({ id: "q1", kind: "question", title: "问题" });
    queues.permissions.push({ id: "p1", kind: "permission", title: "权限" });

    expect(selectActiveInteraction(queues)).toMatchObject({
      id: "p1",
      kind: "permission"
    });
  });

  it("keeps generic terminal prompts behind richer plan interactions", () => {
    const queues = createInteractionQueues();
    queues.plans.push({ id: "pl1", kind: "plan", title: "计划" });
    queues.attention.push({
      id: "a1",
      kind: "attention",
      title: "Terminal 等待确认",
      interventionKind: "waiting_input"
    });

    expect(selectActiveInteraction(queues)).toMatchObject({
      id: "pl1",
      kind: "plan"
    });
  });

  it("classifies terminal confirmation notifications as attention", () => {
    expect(
      classifyInteraction({
        state: "waiting_input",
        message: "Claude needs your permission",
        interactionKind: "attention",
        interventionKind: "waiting_input",
        interventionTitle: "Terminal 等待确认"
      })
    ).toMatchObject({
      queue: "attention",
      kind: "attention",
      interventionKind: "waiting_input"
    });
  });

  it("upserts interactions by id in the correct queue", () => {
    const first = applyInteraction(createInteractionQueues(), {
      state: "waiting_approval",
      message: "Permission: Bash — npm test",
      interactionKind: "permission",
      permissionId: "perm-1",
      interactionDetail: "first detail"
    });
    const second = applyInteraction(first, {
      state: "waiting_approval",
      message: "Permission: Bash — npm test",
      interactionKind: "permission",
      permissionId: "perm-1",
      interactionDetail: "second detail"
    });

    expect(second.permissions).toHaveLength(1);
    expect(second.permissions[0]).toMatchObject({
      id: "perm-1",
      detail: "second detail"
    });
  });

  it("replaces preview questions when the answerable question arrives", () => {
    const preview = applyInteraction(createInteractionQueues(), {
      state: "waiting_input",
      message: "AskUserQuestion: 选择方向",
      interactionKind: "question",
      questionText: "选择方向",
      options: ["直接执行", "先给方案"]
    });
    const answerable = applyInteraction(preview, {
      state: "waiting_input",
      message: "AskUserQuestion: 选择方向",
      interactionKind: "question",
      questionId: "question-1",
      questionText: "选择方向",
      options: ["直接执行", "先给方案"]
    });

    expect(answerable.questions).toHaveLength(1);
    expect(answerable.questions[0]).toMatchObject({
      id: "question-1",
      questionId: "question-1"
    });
    expect(selectActiveInteraction(answerable)).toMatchObject({
      id: "question-1"
    });
  });
});
