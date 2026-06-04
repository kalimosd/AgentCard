import { describe, expect, it } from "vitest";
import { parseCliArgs } from "./cliArgs.js";

describe("agentcard cli args", () => {
  it("parses the one-command Claude launcher", () => {
    expect(parseCliArgs(["claude"])).toEqual({
      mode: "claude",
      command: ["claude"],
      serverUrl: "http://127.0.0.1:4317"
    });
  });

  it("passes Claude launcher arguments through", () => {
    expect(parseCliArgs(["claude", "--model", "sonnet"])).toEqual({
      mode: "claude",
      command: ["claude", "--model", "sonnet"],
      serverUrl: "http://127.0.0.1:4317"
    });
  });

  it("passes claude command arguments through without rewriting them", () => {
    expect(parseCliArgs(["run", "claude", "--model", "sonnet"])).toEqual({
      mode: "run",
      command: ["claude", "--model", "sonnet"],
      serverUrl: "http://127.0.0.1:4317"
    });
  });

  it("parses server port overrides", () => {
    expect(parseCliArgs(["server", "--port", "4321"])).toEqual({
      mode: "server",
      port: 4321
    });
  });
});
