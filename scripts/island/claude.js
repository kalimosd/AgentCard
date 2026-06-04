import { runWrappedCommand } from "./run.js";
import { installClaudeHooks } from "./setupClaudeHooks.js";
import { startIslandServer } from "./server.js";

const DEFAULT_SERVER_URL = "http://127.0.0.1:4317";

export async function launchClaude({
  command = ["claude"],
  serverUrl = DEFAULT_SERVER_URL,
  fetchImpl = fetch,
  startServer = startIslandServer,
  installHooks = installClaudeHooks,
  runCommand = runWrappedCommand,
  logger = console
} = {}) {
  let ownedServer = null;

  try {
    if (!(await isServerReachable(serverUrl, fetchImpl))) {
      ownedServer = await startServer({ port: readServerPort(serverUrl) });
    }

    const settingsPath = installHooks({ target: "project", serverUrl });
    logger.info?.(`Agent Island: Claude hooks ready in ${settingsPath}`);

    return await runCommand({ command, serverUrl, showSetupHint: false });
  } finally {
    if (ownedServer) {
      await closeServer(ownedServer);
    }
  }
}

export async function isServerReachable(serverUrl, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(new URL("/health", serverUrl));
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}

export function readServerPort(serverUrl) {
  const url = new URL(serverUrl);
  const port = Number(url.port || 4317);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid island server URL port: ${serverUrl}`);
  }

  return port;
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
