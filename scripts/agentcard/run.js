import { spawn } from "node:child_process";
import {
  createExitEvent,
  createInteractiveSessionEvent,
  createOutputEvent,
  createStartingEvent,
  isInteractiveAgentCommand
} from "./eventModel.js";

export async function runWrappedCommand({ command, serverUrl, showSetupHint = true }) {
  const cwd = process.cwd();
  let warnedServer = false;
  const interactive = isInteractiveAgentCommand(command);

  const post = async (event) => {
    try {
      await fetch(new URL("/events", serverUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch {
      if (!warnedServer) {
        warnedServer = true;
        console.warn(
          `AgentCard server is not reachable at ${serverUrl}; running command normally.`
        );
      }
    }
  };

  await post(createStartingEvent({ command, cwd }));

  if (interactive) {
    await post(createInteractiveSessionEvent({ command, cwd }));
    if (showSetupHint) {
      console.info(
        "AgentCard: interactive TTY mode. For live tool/status sync, run once in this project:"
      );
      console.info("  npm run agentcard -- setup claude");
    }

    const exitCode = await runInteractiveChild({ command, cwd });
    await post(createExitEvent({ command, cwd, exitCode }));
    return exitCode;
  }

  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"]
  });

  pipeStream({
    stream: child.stdout,
    output: process.stdout,
    name: "stdout",
    command,
    cwd,
    post
  });
  pipeStream({
    stream: child.stderr,
    output: process.stderr,
    name: "stderr",
    command,
    cwd,
    post
  });

  const exitCode = await waitForChildExit(child, { command, cwd, post });
  await post(createExitEvent({ command, cwd, exitCode }));
  return exitCode;
}

function runInteractiveChild({ command, cwd }) {
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: process.env,
    stdio: "inherit"
  });

  return waitForChildExit(child);
}

function waitForChildExit(child, { command, cwd, post } = {}) {
  return new Promise((resolve) => {
    child.on("error", async (error) => {
      if (post) {
        await post(
          createOutputEvent({
            command,
            cwd,
            stream: "stderr",
            line: error.message
          })
        );
      }
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function pipeStream({ stream, output, name, command, cwd, post }) {
  let buffer = "";

  stream.on("data", (chunk) => {
    const text = chunk.toString();
    output.write(chunk);
    buffer += text;

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim()) {
        void post(createOutputEvent({ command, cwd, stream: name, line }));
      }
    }
  });

  stream.on("end", () => {
    if (buffer.trim()) {
      void post(createOutputEvent({ command, cwd, stream: name, line: buffer }));
    }
  });
}
