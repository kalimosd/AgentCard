import fs from "node:fs";

const MODEL_PRICING_PER_MILLION = {
  "claude-opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet-4": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 }
};

export function estimateUsageFromTranscript(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;

  let sessionTokens = 0;
  let outputTokens = 0;
  let model = "unknown";
  const lines = fs.readFileSync(transcriptPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const usage = entry.message?.usage;
    if (!usage) continue;

    const input = usage.input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;

    sessionTokens += input + cacheRead + cacheCreate + output;
    outputTokens += output;

    if (entry.message?.model) {
      model = entry.message.model;
    }
  }

  if (sessionTokens <= 0) return null;

  const sessionCostUsd = estimateCostUsd(model, lines);
  const abnormal = sessionTokens > 200000;

  return {
    sessionTokens,
    sessionTokensEstimated: true,
    todayTokens: sessionTokens,
    todayCostUsd: sessionCostUsd,
    quota5hPercent: Math.min(99, Math.round((sessionTokens / 200000) * 100)),
    quotaResetMinutes: 0,
    abnormal,
    model: simplifyModel(model)
  };
}

function estimateCostUsd(model, lines) {
  const pricing = resolvePricing(model);
  let total = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = entry.message?.usage;
    if (!usage) continue;

    total +=
      ((usage.input_tokens ?? 0) / 1_000_000) * pricing.input +
      ((usage.output_tokens ?? 0) / 1_000_000) * pricing.output +
      ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * pricing.cacheRead +
      ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * pricing.cacheWrite;
  }

  return Number(total.toFixed(4));
}

function resolvePricing(model) {
  const normalized = String(model).toLowerCase();
  if (normalized.includes("opus")) return MODEL_PRICING_PER_MILLION["claude-opus-4"];
  if (normalized.includes("haiku")) return MODEL_PRICING_PER_MILLION["claude-haiku"];
  return MODEL_PRICING_PER_MILLION["claude-sonnet-4"];
}

function simplifyModel(model) {
  if (model.includes("opus")) return "claude-opus";
  if (model.includes("sonnet")) return "claude-sonnet";
  if (model.includes("haiku")) return "claude-haiku";
  return model;
}
