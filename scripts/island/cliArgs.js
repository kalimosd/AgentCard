const DEFAULT_SERVER_URL = "http://127.0.0.1:4317";

export function parseCliArgs(argv, env = process.env) {
  const [mode, ...rest] = argv;

  if (mode === "server") {
    return {
      mode: "server",
      port: readPort(rest, env.AGENTCARD_PORT ?? env.ISLAND_PORT)
    };
  }

  if (mode === "run") {
    const { command, serverUrl } = parseRunArgs(
      rest,
      env.AGENTCARD_SERVER_URL ?? env.ISLAND_SERVER_URL
    );
    if (command.length === 0) {
      return { mode: "help", error: "Missing command for agentcard run" };
    }
    return { mode: "run", command, serverUrl };
  }

  if (mode === "claude") {
    const { command, serverUrl } = parseRunArgs(
      rest,
      env.AGENTCARD_SERVER_URL ?? env.ISLAND_SERVER_URL
    );
    return { mode: "claude", command: ["claude", ...command], serverUrl };
  }

  if (mode === "setup") {
    if (rest[0] !== "claude") {
      return { mode: "help", error: "Only `agentcard setup claude` is supported right now" };
    }
    const target = rest.includes("--global") ? "global" : "project";
    return {
      mode: "setup",
      target,
      serverUrl: env.AGENTCARD_SERVER_URL ?? env.ISLAND_SERVER_URL ?? DEFAULT_SERVER_URL
    };
  }

  return { mode: "help" };
}

function readPort(args, envPort) {
  const portFlagIndex = args.indexOf("--port");
  const value = portFlagIndex >= 0 ? args[portFlagIndex + 1] : envPort;
  const port = Number(value ?? 4317);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

function parseRunArgs(args, envServerUrl) {
  const command = [];
  let serverUrl = envServerUrl ?? DEFAULT_SERVER_URL;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--server") {
      const value = args[i + 1];
      if (!value) throw new Error("Missing value for --server");
      serverUrl = value;
      i += 1;
      continue;
    }
    command.push(arg);
  }

  return { command, serverUrl };
}

export function usage() {
  return [
    "Usage:",
    "  agentcard server [--port 4317]",
    "  agentcard claude [--server http://127.0.0.1:4317] [...claude args]",
    "  agentcard run [--server http://127.0.0.1:4317] <command> [...args]",
    "  agentcard setup claude [--global]",
    "",
    "Examples:",
    "  agentcard server",
    "  agentcard claude",
    "  agentcard claude --model sonnet",
    "  agentcard setup claude",
    "  agentcard run claude",
    "  agentcard run npm test"
  ].join("\n");
}
