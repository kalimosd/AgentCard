#!/usr/bin/env node
import { parseCliArgs, usage } from "./agentcard/cliArgs.js";
import { launchClaude } from "./agentcard/claude.js";
import { runWrappedCommand } from "./agentcard/run.js";
import { installClaudeHooks } from "./agentcard/setupClaudeHooks.js";
import { startAgentCardServer } from "./agentcard/server.js";

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));

  if (parsed.mode === "server") {
    await startAgentCardServer({ port: parsed.port, host: parsed.host });
    return;
  }

  if (parsed.mode === "run") {
    const exitCode = await runWrappedCommand({
      command: parsed.command,
      serverUrl: parsed.serverUrl
    });
    process.exitCode = exitCode;
    return;
  }

  if (parsed.mode === "claude") {
    const exitCode = await launchClaude({
      command: parsed.command,
      serverUrl: parsed.serverUrl
    });
    process.exitCode = exitCode;
    return;
  }

  if (parsed.mode === "setup") {
    const settingsPath = installClaudeHooks({
      target: parsed.target,
      serverUrl: parsed.serverUrl
    });
    console.log(`Installed AgentCard Claude hooks into ${settingsPath}`);
    console.log("Restart Claude Code in this project, then use agentcard claude.");
    return;
  }

  if (parsed.error) {
    console.error(parsed.error);
    console.error("");
  }
  console.log(usage());
  process.exitCode = parsed.error ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
