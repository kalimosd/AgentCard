import { Terminal } from "lucide-react";
import { formatTokens } from "../lib/agentDemo";
import type { AgentViewProps } from "./types";
import { Metric } from "./Metric";

export function MetricsFooter({
  snapshot,
  elapsed,
  quotaLevel
}: {
  snapshot: AgentViewProps["snapshot"];
  elapsed: string;
  quotaLevel: AgentViewProps["quotaLevel"];
}) {
  return (
    <footer className="device-footer" aria-label="运行指标">
      <Metric label="运行" value={elapsed} icon={<Terminal size={15} />} />
      <Metric label="本次" value={formatTokens(snapshot.usage.sessionTokens)} />
      <Metric label="今日" value={`$${snapshot.usage.todayCostUsd.toFixed(2)}`} />
      <Metric label="模型" value={snapshot.model} compact />
      <div className={`quota-meter quota-${quotaLevel}`}>
        <div className="quota-head">
          <span>5h 额度</span>
          <strong>{snapshot.usage.quota5hPercent}%</strong>
        </div>
        <div className="quota-track">
          <i style={{ width: `${snapshot.usage.quota5hPercent}%` }} />
        </div>
      </div>
    </footer>
  );
}
