import { describe, expect, it, vi } from "vitest";
import { launchClaude, readServerPort } from "./claude.js";

describe("claude launcher", () => {
  it("reuses an existing island server", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true })
    });
    const startServer = vi.fn();
    const installHooks = vi.fn().mockReturnValue("/repo/.claude/settings.json");
    const runCommand = vi.fn().mockResolvedValue(7);
    const logger = { info: vi.fn() };

    const exitCode = await launchClaude({
      command: ["claude"],
      serverUrl: "http://127.0.0.1:4317",
      fetchImpl,
      startServer,
      installHooks,
      runCommand,
      logger
    });

    expect(exitCode).toBe(7);
    expect(fetchImpl).toHaveBeenCalledWith(new URL("/health", "http://127.0.0.1:4317"));
    expect(startServer).not.toHaveBeenCalled();
    expect(installHooks).toHaveBeenCalledWith({
      target: "project",
      serverUrl: "http://127.0.0.1:4317"
    });
    expect(runCommand).toHaveBeenCalledWith({
      command: ["claude"],
      serverUrl: "http://127.0.0.1:4317",
      showSetupHint: false
    });
  });

  it("starts and closes an island server when none is running", async () => {
    let closed = false;
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const startServer = vi.fn().mockResolvedValue({
      close(callback) {
        closed = true;
        callback();
      }
    });
    const installHooks = vi.fn().mockReturnValue("/repo/.claude/settings.json");
    const runCommand = vi.fn().mockResolvedValue(0);

    const exitCode = await launchClaude({
      command: ["claude", "--model", "sonnet"],
      serverUrl: "http://127.0.0.1:4317",
      fetchImpl,
      startServer,
      installHooks,
      runCommand,
      logger: { info: vi.fn() }
    });

    expect(exitCode).toBe(0);
    expect(startServer).toHaveBeenCalledWith({ port: 4317 });
    expect(runCommand).toHaveBeenCalledWith({
      command: ["claude", "--model", "sonnet"],
      serverUrl: "http://127.0.0.1:4317",
      showSetupHint: false
    });
    expect(closed).toBe(true);
  });

  it("reads the port from a custom server URL", () => {
    expect(readServerPort("http://127.0.0.1:4999")).toBe(4999);
  });

  it("does not treat a non-island health response as reachable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ app: "vite" })
    });
    const startServer = vi.fn().mockResolvedValue({
      close(callback) {
        callback();
      }
    });

    await launchClaude({
      command: ["claude"],
      fetchImpl,
      startServer,
      installHooks: vi.fn().mockReturnValue("/repo/.claude/settings.json"),
      runCommand: vi.fn().mockResolvedValue(0),
      logger: { info: vi.fn() }
    });

    expect(startServer).toHaveBeenCalledWith({ port: 4317 });
  });
});
