import { describe, expect, it } from "vitest";
import { createPermissionStore } from "./permissionStore.js";

describe("permissionStore", () => {
  it("resolves when a tablet decision arrives", async () => {
    const store = createPermissionStore();
    const id = store.create({ tool: "Bash" });

    const waitPromise = store.waitForDecision(id, 1000);
    expect(store.decide(id, "allow")).toBe(true);

    await expect(waitPromise).resolves.toBe("allow");
  });

  it("supports a session-scoped always decision", async () => {
    const store = createPermissionStore();
    const id = store.create({ tool: "AskUserQuestion" });

    const waitPromise = store.waitForDecision(id, 1000);
    expect(store.decide(id, "always")).toBe(true);

    await expect(waitPromise).resolves.toBe("always");
  });

  it("remembers always decisions for the same tool and cwd", () => {
    const store = createPermissionStore();
    const id = store.create({
      hook: { tool_name: "Read", cwd: "/Users/me/offerpilot-ai" }
    });

    expect(store.decide(id, "always")).toBe(true);

    expect(
      store.match({
        hook: { tool_name: "Read", cwd: "/Users/me/offerpilot-ai" }
      })
    ).toBe("always");
    expect(
      store.match({
        hook: { tool_name: "Bash", cwd: "/Users/me/offerpilot-ai" }
      })
    ).toBe(null);
  });
});
