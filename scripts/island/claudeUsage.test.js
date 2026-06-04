import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { estimateUsageFromTranscript } from "./claudeUsage.js";

describe("claudeUsage", () => {
  it("sums assistant usage lines from a transcript", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "island-usage-"));
    const file = path.join(dir, "session.jsonl");
    fs.writeFileSync(
      file,
      [
        JSON.stringify({
          type: "assistant",
          message: {
            model: "claude-sonnet-4-20250514",
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_read_input_tokens: 1000,
              cache_creation_input_tokens: 0
            }
          }
        }),
        JSON.stringify({
          type: "assistant",
          message: {
            model: "claude-sonnet-4-20250514",
            usage: {
              input_tokens: 20,
              output_tokens: 10,
              cache_read_input_tokens: 0,
              cache_creation_input_tokens: 200
            }
          }
        })
      ].join("\n")
    );

    const usage = estimateUsageFromTranscript(file);

    expect(usage).toMatchObject({
      sessionTokens: 1380,
      sessionTokensEstimated: true,
      model: "claude-sonnet"
    });
    expect(usage.todayCostUsd).toBeGreaterThan(0);
  });
});
