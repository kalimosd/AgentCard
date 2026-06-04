import crypto from "node:crypto";

const VALID_DECISIONS = new Set(["allow", "deny", "always"]);

export function createPermissionStore() {
  const pending = new Map();
  const sessionAllows = new Set();

  return {
    create(record) {
      const id = crypto.randomUUID();
      pending.set(id, {
        id,
        status: "pending",
        createdAt: Date.now(),
        ...record
      });
      return id;
    },

    get(id) {
      return pending.get(id) ?? null;
    },

    decide(id, decision) {
      const entry = pending.get(id);
      if (!entry || entry.status !== "pending") return false;
      if (!VALID_DECISIONS.has(decision)) return false;
      entry.status = decision;
      if (decision === "always") {
        const key = permissionKey(entry);
        if (key) sessionAllows.add(key);
      }
      if (entry.resolve) {
        entry.resolve(decision);
        entry.resolve = null;
      }
      return true;
    },

    waitForDecision(id, timeoutMs = 300000) {
      const entry = pending.get(id);
      if (!entry) return Promise.resolve("deny");
      if (entry.status !== "pending") return Promise.resolve(entry.status);

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (entry.status === "pending") {
            entry.status = "denied";
          }
          resolve(entry.status);
        }, timeoutMs);

        entry.resolve = (decision) => {
          clearTimeout(timer);
          resolve(decision);
        };
      });
    },

    match(record) {
      const key = permissionKey(record);
      if (!key) return null;
      return sessionAllows.has(key) ? "always" : null;
    }
  };
}

function permissionKey(record) {
  const hook = record?.hook ?? record ?? {};
  const toolName = hook.tool_name ?? hook.toolName ?? record?.tool;
  const cwd = hook.cwd ?? record?.cwd;
  if (!toolName || !cwd) return null;
  return `${toolName}:${cwd}`;
}
