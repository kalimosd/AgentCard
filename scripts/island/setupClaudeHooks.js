import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const hookScript = path.join(rootDir, "scripts/island/claudeHook.js");
const marker = "agentcard-claude-hook";

export function buildClaudeHookEntries(serverUrl = "http://127.0.0.1:4317") {
  const command = `AGENTCARD_HOOK=${marker} AGENTCARD_SERVER_URL=${serverUrl} AGENTCARD_PRETOOL_PERMISSION_MODE=gate node "${hookScript}"`;
  const observeEntry = {
    type: "command",
    command,
    timeout: 5,
    _islandMarker: marker
  };
  const blockingEntry = {
    type: "command",
    command,
    timeout: 86400,
    _islandMarker: marker
  };

  return {
    SessionStart: [{ hooks: [observeEntry] }],
    UserPromptSubmit: [{ hooks: [observeEntry] }],
    PreToolUse: [{ matcher: "", hooks: [blockingEntry] }],
    PostToolUse: [{ matcher: "", hooks: [observeEntry] }],
    PostToolUseFailure: [{ matcher: "", hooks: [observeEntry] }],
    PermissionRequest: [{ matcher: "", hooks: [blockingEntry] }],
    Notification: [{ hooks: [blockingEntry] }],
    Stop: [{ hooks: [observeEntry] }]
  };
}

export function mergeClaudeHooks(settings, serverUrl) {
  const incoming = buildClaudeHookEntries(serverUrl);
  const hooks = { ...(settings.hooks ?? {}) };

  for (const [eventName, matchers] of Object.entries(incoming)) {
    const existingMatchers = [...(hooks[eventName] ?? [])].filter(
      (matcher) => !isIslandMatcher(matcher)
    );
    const islandMatcher = matchers[0];
    existingMatchers.push(stripMarker(islandMatcher));

    hooks[eventName] = existingMatchers;
  }

  return { ...settings, hooks };
}

function isIslandMatcher(matcher) {
  return (matcher.hooks ?? []).some((hook) => {
    const command = String(hook.command ?? "");
    return (
      command.includes(marker) ||
      command.includes(hookScript) ||
      command.includes("scripts/island/claudeHook.js")
    );
  });
}

export function installClaudeHooks({
  target = "project",
  cwd = process.cwd(),
  serverUrl =
    process.env.AGENTCARD_SERVER_URL ??
    process.env.ISLAND_SERVER_URL ??
    "http://127.0.0.1:4317"
} = {}) {
  const settingsPath =
    target === "global"
      ? path.join(process.env.HOME ?? "", ".claude", "settings.json")
      : path.join(cwd, ".claude", "settings.json");

  const settingsDir = path.dirname(settingsPath);
  fs.mkdirSync(settingsDir, { recursive: true });

  const current = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, "utf8"))
    : {};

  const merged = mergeClaudeHooks(current, serverUrl);
  fs.writeFileSync(settingsPath, `${JSON.stringify(merged, null, 2)}\n`);

  return settingsPath;
}

function stripMarker(matcher) {
  return {
    ...matcher,
    hooks: matcher.hooks.map(({ _islandMarker, ...hook }) => hook)
  };
}
