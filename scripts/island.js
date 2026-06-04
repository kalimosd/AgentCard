#!/usr/bin/env node
import { parseCliArgs, usage } from "./island/cliArgs.js";
import { launchClaude } from "./island/claude.js";
import { runWrappedCommand } from "./island/run.js";
import { installClaudeHooks } from "./island/setupClaudeHooks.js";
import { startIslandServer } from "./island/server.js";

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));

  if (parsed.mode === "server") {
    await startIslandServer({ port: parsed.port });
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
    console.log(`Installed Agent Island Claude hooks into ${settingsPath}`);
    console.log("Restart Claude Code in this project, then use island claude.");
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
