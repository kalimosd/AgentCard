// @ts-expect-error The app tsconfig does not install Node ambient types.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, {
  beaverExpressionForState,
  displaySessionTitle,
  permissionDecisionLabelsForIntervention,
  isQuestionOptionAnswerable,
  questionAnswerLabelsForIntervention,
  questionAnswerValueForOption,
  questionGroupsForIntervention,
  questionOptionParts,
  questionOptionsForIntervention,
  shouldShowInterventionActions
} from "./App";
import type { InterventionCard } from "./types";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function cssRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*{[^}]*}`));
  return match?.[0] ?? "";
}

describe("App UI cases", () => {
  it("offers the remaining two UI variants and defaults to Case 2", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("Case 1");
    expect(html).toContain("陪伴卡");
    expect(html).toContain("Case 2");
    expect(html).toContain("控制台面");
    expect(html).toContain("暂无待处理介入");
    expect(html).not.toContain("tool:");
    expect(html).not.toContain("event:");
    expect(html).not.toContain("<h1>未启动</h1>");
    expect(html).toContain("河狸");
    expect(html).toContain("开心");
  });

  it("maps agent state to beaver expressions", () => {
    expect(beaverExpressionForState("thinking")).toBe("happy");
    expect(beaverExpressionForState("completed")).toBe("happy");
    expect(beaverExpressionForState("waiting_approval")).toBe("confused");
    expect(beaverExpressionForState("waiting_input")).toBe("confused");
    expect(beaverExpressionForState("failed")).toBe("angry");
  });

  it("keeps beaver assets fully visible inside every logo frame", () => {
    const baseImageRule = cssRule(".beaver-logo img");
    const panelLogoRule = cssRule(".beaver-panel-logo");
    const petPanelRule = cssRule(".status-pet-panel .beaver-logo");

    expect(baseImageRule).toContain("width: 100%");
    expect(baseImageRule).toContain("height: 100%");
    expect(baseImageRule).toContain("object-fit: contain");
    expect(panelLogoRule).toContain("width: 192px");
    expect(panelLogoRule).toContain("height: 192px");
    expect(petPanelRule).toContain("background: #ffffff");
  });

  it("labels question cards as questions rather than approval bars", () => {
    const question: InterventionCard = {
      kind: "waiting_input",
      title: "需要回答",
      detail: "选择下一步方向",
      payload: "选择下一步方向",
      options: ["1. 修 hook", "2. 改 UI", "3. 写文档"]
    };

    expect(questionOptionsForIntervention(question)).toEqual([
      "1. 修 hook",
      "2. 改 UI",
      "3. 写文档"
    ]);
    expect(permissionDecisionLabelsForIntervention(question, true)).toEqual([]);
  });

  it("labels plan cards separately from questions and permissions", () => {
    const plan: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "plan",
      title: "计划审阅",
      detail: "Claude has written up a plan and is ready to execute.",
      payload: "1. Add tests\n2. Implement",
      options: [
        "1. Yes, and use auto mode",
        "2. Yes, manually approve edits",
        "3. Tell Claude what to change"
      ]
    };

    expect(permissionDecisionLabelsForIntervention(plan, true)).toEqual([]);
    expect(questionOptionsForIntervention(plan)).toEqual([
      "1. Yes, and use auto mode",
      "2. Yes, manually approve edits",
      "3. Tell Claude what to change"
    ]);
  });

  it("allows plan approval choices from the island but keeps text feedback in terminal", () => {
    const plan: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "plan",
      answerMode: "choice",
      questionId: "question-1",
      title: "计划审阅",
      detail: "Claude has written up a plan and is ready to execute.",
      payload: "1. Add tests\n2. Implement",
      options: [
        "1. Yes, and use auto mode",
        "2. Yes, manually approve edits",
        "3. Tell Claude what to change"
      ]
    };

    expect(questionAnswerLabelsForIntervention(plan, true)).toEqual([
      "1. Yes, and use auto mode",
      "2. Yes, manually approve edits"
    ]);
    expect(isQuestionOptionAnswerable(plan, "1. Yes, and use auto mode", 0)).toBe(
      true
    );
    expect(
      isQuestionOptionAnswerable(plan, "3. Tell Claude what to change", 2)
    ).toBe(false);
    expect(
      questionAnswerValueForOption(plan, "2. Yes, manually approve edits", 1)
    ).toBe("2. Yes, manually approve edits");
  });

  it("labels generic terminal prompts as attention cards", () => {
    const attention: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "attention",
      title: "Terminal 等待确认",
      detail: "Claude needs your permission",
      payload: "Claude needs your permission"
    };

    expect(permissionDecisionLabelsForIntervention(attention, true)).toEqual([]);
    expect(questionOptionsForIntervention(attention)).toEqual([]);
  });

  it("enables question option answers only for live answerable questions", () => {
    const question: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "question",
      title: "需要回答",
      detail: "选择方向",
      payload: "选择方向",
      questionId: "question-1",
      options: ["1. 直接执行", "2. 先给方案"]
    };

    expect(questionAnswerLabelsForIntervention(question, true)).toEqual([
      "1. 直接执行",
      "2. 先给方案"
    ]);
    expect(questionAnswerLabelsForIntervention(question, false)).toEqual([]);
    expect(
      questionAnswerLabelsForIntervention({ ...question, questionId: undefined }, true)
    ).toEqual([]);
  });

  it("exposes grouped multi-question options for answerable question cards", () => {
    const question: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "question",
      title: "需要回答",
      detail: "多题选择",
      payload: "多题选择",
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
    };

    expect(questionGroupsForIntervention(question)).toEqual([
      {
        question: "你希望我接下来以哪种方式协作？",
        options: ["直接执行", "先给方案"]
      },
      {
        question: "你更喜欢我用哪种回答风格？",
        options: ["极简", "平衡"]
      }
    ]);
    expect(questionAnswerLabelsForIntervention(question, true)).toEqual([]);
  });

  it("uses choice labels as answer values for parsed terminal choices", () => {
    const question: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "question",
      answerMode: "choice",
      title: "需要回答",
      detail: "选择方式",
      payload: "选择方式",
      questionId: "question-1",
      options: ["A) 逐轮过", "B) 跳着聊", "C) 全量速答"]
    };

    expect(questionAnswerValueForOption(question, "A) 逐轮过", 0)).toBe("A");
    expect(questionAnswerValueForOption(question, "B) 跳着聊", 1)).toBe("B");
  });

  it("formats long numbered question options for readable choice rows", () => {
    expect(
      questionOptionParts(
        "2. 直接实现最小可用版本，但保留后续扩展点，后面再处理协议回传",
        0
      )
    ).toEqual({
      indexLabel: "2",
      text: "直接实现最小可用版本，但保留后续扩展点，后面再处理协议回传"
    });

    expect(questionOptionParts("先 polish v0.1 的视觉体验", 2)).toEqual({
      indexLabel: "3",
      text: "先 polish v0.1 的视觉体验"
    });
  });

  it("uses vertical long-form question option rows in Case 1 and Case 2", () => {
    const questionOptionsRule = cssRule(".question-options");
    const optionButtonRule = cssRule(".option-button");
    const questionSheetRule = cssRule(".attention-sheet.is-question");

    expect(questionOptionsRule).toContain("display: grid");
    expect(optionButtonRule).toContain("grid-template-columns: 28px minmax(0, 1fr)");
    expect(optionButtonRule).toContain("white-space: normal");
    expect(questionSheetRule).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("keeps Case 2 idle observation free of fake intervention actions", () => {
    expect(shouldShowInterventionActions(false, undefined)).toBe(false);
    expect(
      shouldShowInterventionActions(true, {
        kind: "waiting_input",
        title: "需要回答",
        detail: "选择方向",
        payload: "1. 写规格"
      })
    ).toBe(true);
  });

  it("uses the live state as fallback when a stale title says not started", () => {
    expect(displaySessionTitle({ sessionTitle: "未启动", state: "thinking" })).toBe(
      "思考中"
    );
    expect(displaySessionTitle({ sessionTitle: "重构 UI", state: "thinking" })).toBe(
      "重构 UI"
    );
  });

  it("shows permission decisions only when the permission is actionable", () => {
    const permission: InterventionCard = {
      kind: "waiting_approval",
      title: "权限确认",
      detail: "Claude 请求执行 Bash。",
      payload: "tool: Bash\ncommand: npm test",
      permissionId: "perm-1",
      actions: ["allow", "always", "deny"]
    };

    expect(permissionDecisionLabelsForIntervention(permission, true)).toEqual([
      "Yes",
      "Always",
      "No"
    ]);

    expect(
      permissionDecisionLabelsForIntervention(
        { ...permission, actions: ["allow", "deny"] },
        true
      )
    ).toEqual(["Yes", "No"]);

    expect(
      permissionDecisionLabelsForIntervention(
        { ...permission, permissionId: undefined },
        true
      )
    ).toEqual([]);
  });
});
