import type { IslandSnapshot } from "../types";

export function resolveIslandServerOrigin(href: string): string {
  const url = new URL(href);
  const port = url.port === "4317" ? url.port : "4317";
  return `${url.protocol}//${url.hostname}:${port}`;
}

export function resolveIslandWsUrl(href: string): string {
  return `${resolveIslandServerOrigin(href).replace(/^http/, "ws")}/ws`;
}

export function resolveIslandHttpUrl(href: string): string {
  return resolveIslandServerOrigin(href);
}

export function isIslandSnapshot(value: unknown): value is IslandSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<IslandSnapshot>;

  return (
    typeof snapshot.agent === "string" &&
    typeof snapshot.agentLabel === "string" &&
    typeof snapshot.project === "string" &&
    typeof snapshot.sessionTitle === "string" &&
    typeof snapshot.taskPrompt === "string" &&
    typeof snapshot.state === "string" &&
    typeof snapshot.recentAction === "string" &&
    typeof snapshot.lastSummary === "string" &&
    Boolean(snapshot.currentTool) &&
    Array.isArray(snapshot.eventTail) &&
    Boolean(snapshot.usage)
  );
}
