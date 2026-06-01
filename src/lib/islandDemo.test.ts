import { describe, expect, it } from "vitest";
import {
  formatCurrentTool,
  formatElapsed,
  formatQuotaReset,
  formatTokens,
  getElapsedMs,
  hasIntervention,
  isWorkingState,
  nextScenarioIndex,
  quotaTone
} from "./islandDemo";
import { islandScenarios } from "../data/islandScenarios";

describe("islandDemo", () => {
  it("keeps every scenario anchored to a recent action and summary", () => {
    for (const scenario of islandScenarios) {
      expect(scenario.recentAction.trim().length).toBeGreaterThan(0);
      expect(scenario.lastSummary.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the v0.1 demo focused on one primary session", () => {
    for (const scenario of islandScenarios) {
      expect("otherSessions" in scenario).toBe(false);
    }
  });

  it("covers all MVP intervention card scenarios", () => {
    const kinds = new Set(
      islandScenarios
        .map((scenario) => scenario.intervention?.kind)
        .filter(Boolean)
    );

    expect(kinds).toEqual(
      new Set([
        "waiting_approval",
        "waiting_input",
        "command_failed",
        "test_failed",
        "completed"
      ])
    );
  });

  it("formats elapsed time", () => {
    expect(formatElapsed(0)).toBe("—");
    expect(formatElapsed(45000)).toBe("45s");
    expect(formatElapsed(125000)).toBe("2m 5s");
    expect(formatElapsed(3725000)).toBe("1h 2m");
  });

  it("formats quota reset countdown", () => {
    expect(formatQuotaReset(0)).toBe("—");
    expect(formatQuotaReset(38)).toBe("38m");
    expect(formatQuotaReset(134)).toBe("2h 14m");
  });

  it("formats current tool line", () => {
    expect(formatCurrentTool({ kind: "bash", label: "npm test" })).toBe(
      "Bash: npm test"
    );
    expect(formatCurrentTool({ kind: "none", label: "—" })).toBe("—");
  });

  it("computes elapsed from session start", () => {
    const snapshot = islandScenarios[2];
    const started = snapshot.sessionStartedAt;
    expect(getElapsedMs(snapshot, started + 10000)).toBe(10000);
  });

  it("detects intervention cards", () => {
    const withCard = islandScenarios.find((s) => s.intervention);
    const without = islandScenarios[0];
    expect(hasIntervention(withCard?.intervention)).toBe(true);
    expect(hasIntervention(without.intervention)).toBe(false);
  });

  it("cycles scenario index", () => {
    const total = islandScenarios.length;
    expect(nextScenarioIndex(total - 1, total)).toBe(0);
    expect(nextScenarioIndex(2, total)).toBe(3);
  });

  it("classifies working states", () => {
    expect(isWorkingState("thinking")).toBe(true);
    expect(isWorkingState("idle")).toBe(false);
    expect(isWorkingState("waiting_approval")).toBe(false);
  });

  it("formats token counts", () => {
    expect(formatTokens(840)).toBe("840");
    expect(formatTokens(18400)).toBe("18.4k");
  });

  it("maps quota percent to tone", () => {
    expect(quotaTone(40)).toBe("ok");
    expect(quotaTone(70)).toBe("warn");
    expect(quotaTone(90)).toBe("critical");
  });
});
