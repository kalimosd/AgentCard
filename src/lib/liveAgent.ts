import type { AgentSnapshot } from "../types";

export function resolveAgentCardServerOrigin(href: string): string {
  const url = new URL(href);
  // Always use the default AgentCard port (4317) in production.
  // In dev (Vite on :5173), the env var or default port is used.
  const port = url.port === "4317" ? url.port : "4317";
  return `${url.protocol}//${url.hostname}:${port}`;
}

export function resolveAgentCardWsUrl(href: string): string {
  return `${resolveAgentCardServerOrigin(href).replace(/^http/, "ws")}/ws`;
}

export function resolveAgentCardHttpUrl(href: string): string {
  return resolveAgentCardServerOrigin(href);
}

export function isAgentSnapshot(value: unknown): value is AgentSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<AgentSnapshot>;

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
