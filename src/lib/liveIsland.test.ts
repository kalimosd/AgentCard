import { describe, expect, it } from "vitest";
import {
  isIslandSnapshot,
  resolveIslandHttpUrl,
  resolveIslandWsUrl
} from "./liveIsland";

describe("liveIsland", () => {
  it("uses the AgentCard server port when the UI is served by Vite", () => {
    expect(resolveIslandWsUrl("http://localhost:5173/")).toBe(
      "ws://localhost:4317/ws"
    );
  });

  it("uses the current origin when the AgentCard server serves the UI", () => {
    expect(resolveIslandWsUrl("http://127.0.0.1:4317/")).toBe(
      "ws://127.0.0.1:4317/ws"
    );
    expect(resolveIslandHttpUrl("http://127.0.0.1:4317/")).toBe(
      "http://127.0.0.1:4317"
    );
  });

  it("accepts valid island snapshots", () => {
    expect(
      isIslandSnapshot({
        agent: "claude",
        agentLabel: "Claude",
        project: "AgentCard",
        sessionTitle: "启动 agent",
        taskPrompt: "agentcard run claude",
        state: "starting",
        recentAction: "Starting claude",
        lastSummary: "claude 已启动",
        currentTool: { kind: "bash", label: "claude" },
        eventTail: [],
        model: "unknown",
        sessionStartedAt: 1760000000000,
        usage: {
          sessionTokens: 0,
          sessionTokensEstimated: true,
          todayTokens: 0,
          todayCostUsd: 0,
          quota5hPercent: 0,
          quotaResetMinutes: 0,
          abnormal: false
        }
      })
    ).toBe(true);
  });
});
