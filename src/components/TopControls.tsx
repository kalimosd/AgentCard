import { Pause, Play, SkipForward } from "lucide-react";
import type { AgentViewProps } from "./types";

export function TopControls({
  snapshot,
  index,
  total,
  paused,
  liveMode,
  connectionState,
  advance,
  togglePause
}: {
  snapshot: AgentViewProps["snapshot"];
  index: number;
  total: number;
  paused: boolean;
  liveMode: boolean;
  connectionState: AgentViewProps["connectionState"];
  advance: () => void;
  togglePause: () => void;
}) {
  return (
    <div className="header-right">
      <div className="session-meta">
        <span>{snapshot.project}</span>
        <span className={`connection-pill ${liveMode ? "is-live" : ""}`}>
          {liveMode ? "实时" : connectionState === "connecting" ? "连接中" : "演示"}
        </span>
      </div>
      {!liveMode && (
        <div className="demo-controls">
          <button type="button" className="btn-muted" onClick={togglePause}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "继续" : "暂停"}
          </button>
          <button type="button" className="btn-muted" onClick={advance}>
            <SkipForward size={14} />
            {index + 1}/{total}
          </button>
        </div>
      )}
    </div>
  );
}
