import { describe, expect, it } from "vitest";
import { liveInterventionResetKey } from "./useAgentDemo";
import type { InterventionCard } from "../types";

describe("liveInterventionResetKey", () => {
  it("changes when a new live question arrives", () => {
    const first: InterventionCard = {
      kind: "waiting_input",
      interactionKind: "question",
      title: "需要回答",
      detail: "选择方向",
      payload: "选择方向",
      questionId: "question-1"
    };
    const second: InterventionCard = {
      ...first,
      questionId: "question-2"
    };

    expect(liveInterventionResetKey(first)).not.toBe(
      liveInterventionResetKey(second)
    );
  });

  it("changes when a new live permission arrives", () => {
    const first: InterventionCard = {
      kind: "waiting_approval",
      title: "权限确认",
      detail: "Claude 请求执行 Bash。",
      payload: "npm test",
      permissionId: "permission-1"
    };
    const second: InterventionCard = {
      ...first,
      permissionId: "permission-2"
    };

    expect(liveInterventionResetKey(first)).not.toBe(
      liveInterventionResetKey(second)
    );
  });
});
