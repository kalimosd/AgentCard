import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { installClaudeHooks, mergeClaudeHooks } from "./setupClaudeHooks.js";

describe("setupClaudeHooks", () => {
  it("merges AgentCard hooks without duplicating existing entries", () => {
    const merged = mergeClaudeHooks(
      {
        hooks: {
          Notification: [
            {
              hooks: [{ type: "command", command: "echo keep-me" }]
            }
          ]
        }
      },
      "http://127.0.0.1:4317"
    );

    expect(merged.hooks.Notification).toHaveLength(2);
    expect(merged.hooks.PreToolUse).toHaveLength(1);
    expect(String(merged.hooks.PreToolUse[0].hooks[0].command)).toContain(
      "claudeHook.js"
    );
    expect(String(merged.hooks.PreToolUse[0].hooks[0].command)).toContain(
      "AGENTCARD_PRETOOL_PERMISSION_MODE=gate"
    );
    expect(merged.hooks.PreToolUse[0].hooks[0].timeout).toBe(86400);
    expect(merged.hooks.PermissionRequest[0].hooks[0].timeout).toBe(86400);
    expect(merged.hooks.Notification[1].hooks[0].timeout).toBe(86400);
    expect(merged.hooks.UserPromptSubmit[0].hooks[0].timeout).toBe(5);
  });

  it("collapses duplicate AgentCard hook entries from older setup runs", () => {
    const command =
      'AGENTCARD_SERVER_URL=http://127.0.0.1:4317 node "/Users/me/AgentCard/scripts/agentcard/claudeHook.js"';
    const merged = mergeClaudeHooks(
      {
        hooks: {
          PreToolUse: [
            { matcher: "", hooks: [{ type: "command", command }] },
            { matcher: "", hooks: [{ type: "command", command }] }
          ]
        }
      },
      "http://127.0.0.1:4317"
    );

    expect(merged.hooks.PreToolUse).toHaveLength(1);
  });

  it("writes project settings file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentcard-"));
    const settingsPath = installClaudeHooks({
      target: "project",
      cwd: dir,
      serverUrl: "http://127.0.0.1:4317"
    });

    expect(settingsPath).toBe(path.join(dir, ".claude", "settings.json"));
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
  });
});
