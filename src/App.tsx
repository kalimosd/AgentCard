import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  ExternalLink,
  MessageCircleQuestion,
  Pause,
  Play,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Terminal,
  X
} from "lucide-react";
import { useIslandDemo } from "./hooks/useIslandDemo";
import {
  formatCurrentTool,
  formatElapsed,
  formatQuotaReset,
  formatTokens,
  getElapsedMs,
  hasIntervention,
  isWorkingState,
  quotaTone,
  stateLabels
} from "./lib/islandDemo";
import type { InterventionKind, IslandState } from "./types";

const mascotMood: Record<IslandState, string> = {
  idle: "mood-idle",
  starting: "mood-starting",
  thinking: "mood-thinking",
  reading: "mood-reading",
  editing: "mood-editing",
  running_command: "mood-running",
  waiting_approval: "mood-waiting",
  waiting_input: "mood-waiting",
  completed: "mood-done",
  failed: "mood-failed"
};

const interventionIcon: Record<InterventionKind, typeof ShieldAlert> = {
  waiting_approval: ShieldAlert,
  waiting_input: MessageCircleQuestion,
  command_failed: AlertTriangle,
  test_failed: AlertTriangle,
  completed: CheckCircle2
};

function App() {
  const {
    snapshot,
    index,
    total,
    paused,
    now,
    dismissedIntervention,
    actionFeedback,
    advance,
    dismissIntervention,
    jumpBack,
    markDone,
    togglePause
  } = useIslandDemo();

  const elapsed = formatElapsed(getElapsedMs(snapshot, now));
  const showIntervention =
    hasIntervention(snapshot.intervention) && !dismissedIntervention;
  const working = isWorkingState(snapshot.state);
  const quotaLevel = quotaTone(snapshot.usage.quota5hPercent);
  const InterventionIcon = snapshot.intervention
    ? interventionIcon[snapshot.intervention.kind]
    : ShieldAlert;
  const tail = snapshot.eventTail.slice(-3);

  return (
    <div className="demo-viewport">
      <main className={`island-shell state-${snapshot.state}`}>
        <header className="island-header">
          <div className="brand">
            <div className={`mascot-mini ${mascotMood[snapshot.state]}`} aria-hidden>
              <div className="mascot-face">
                <span className="eye left" />
                <span className="eye right" />
                <span className="mouth" />
              </div>
            </div>
            <div>
              <p className="eyebrow">Agent Island</p>
              <h1>{snapshot.sessionTitle}</h1>
            </div>
          </div>
          <div className="header-meta">
            <span className="demo-pill">v0.1 Demo</span>
            <span className="live-pill">
              <span className="live-dot" />
              模拟连接
            </span>
          </div>
        </header>

        <section className="island-body">
          <div className="main-column">
            <div className="identity-row">
              <span className="agent-name">{snapshot.agentLabel}</span>
              <span className="project-name">{snapshot.project}</span>
              <span className={`state-pill ${working ? "is-active" : ""}`}>
                {stateLabels[snapshot.state]}
              </span>
              <span className="runtime-chip">
                <Terminal size={13} />
                {elapsed}
              </span>
            </div>

            <section className="status-focus-panel" aria-label="当前状态摘要">
              <div>
                <span className="card-label">最近动作</span>
                <strong>{snapshot.recentAction}</strong>
              </div>
              <div>
                <span className="card-label">最后摘要</span>
                <p>{snapshot.lastSummary}</p>
              </div>
            </section>

            <p className="task-prompt" title={snapshot.taskPrompt}>
              <span className="card-label">任务</span>
              {snapshot.taskPrompt}
            </p>

            <div className="current-tool-bar">
              <span className="card-label">当前 tool</span>
              <code>{formatCurrentTool(snapshot.currentTool)}</code>
            </div>

            <section className="event-tail-panel" aria-label="最近事件">
              <p className="card-label">事件 tail（最近 3 条）</p>
              <ul className="event-tail-list">
                {tail.map((item, i) => (
                  <li key={`${item.time}-${i}`}>
                    <time>{item.time}</time>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="usage-panel" aria-label="Token 与 Cost">
            <p className="panel-title">
              <Coins size={16} />
              用量
            </p>
            <div className="usage-grid">
              <UsageStat
                label="本次 session"
                value={formatTokens(snapshot.usage.sessionTokens)}
                hint={snapshot.usage.sessionTokensEstimated ? "estimated" : "exact"}
              />
              <UsageStat
                label="今日 token"
                value={formatTokens(snapshot.usage.todayTokens)}
                hint="estimated"
              />
              <UsageStat
                label="今日 cost"
                value={`$${snapshot.usage.todayCostUsd.toFixed(2)}`}
                hint="estimated"
              />
              <UsageStat label="模型" value={snapshot.model} hint="detected" />
            </div>

            <div className={`quota-block quota-${quotaLevel}`}>
              <div className="quota-head">
                <span>5h 额度</span>
                <strong>{snapshot.usage.quota5hPercent}%</strong>
              </div>
              <div className="quota-track">
                <span style={{ width: `${snapshot.usage.quota5hPercent}%` }} />
              </div>
              <p className="quota-reset">
                重置倒计时 {formatQuotaReset(snapshot.usage.quotaResetMinutes)}
              </p>
            </div>

            {snapshot.usage.abnormal && (
              <p className="usage-alert">
                <CircleDollarSign size={14} />
                消耗偏高，建议回到 terminal 查看
              </p>
            )}
          </aside>
        </section>

        {showIntervention && snapshot.intervention && (
          <section className="intervention-card" role="alert">
            <div className="intervention-icon">
              <InterventionIcon size={22} />
            </div>
            <div className="intervention-copy">
              <p className="card-label">需要介入</p>
              <h2>{snapshot.intervention.title}</h2>
              <p>{snapshot.intervention.detail}</p>
              <pre className="intervention-payload">{snapshot.intervention.payload}</pre>
              {snapshot.intervention.options && (
                <ul className="intervention-options">
                  {snapshot.intervention.options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="intervention-actions">
              <button type="button" className="btn-primary" onClick={jumpBack}>
                <ArrowLeft size={16} />
                Jump Back
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={dismissIntervention}
              >
                <X size={16} />
                Dismiss
              </button>
              <button type="button" className="btn-ghost" onClick={markDone}>
                <CheckCircle2 size={16} />
                Mark Done
              </button>
            </div>
          </section>
        )}

        {actionFeedback && (
          <p className="action-feedback" role="status">
            {actionFeedback}
          </p>
        )}

        <footer className="demo-controls">
          <button type="button" className="btn-ghost" onClick={togglePause}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? "继续演示" : "暂停演示"}
          </button>
          <button type="button" className="btn-ghost" onClick={advance}>
            <SkipForward size={16} />
            下一步 ({index + 1}/{total})
          </button>
          <span className="demo-hint">
            <Sparkles size={14} />
            状态 · 最近动作 · 最后摘要 · 介入提醒 · 5h 额度
          </span>
          <a
            className="docs-link"
            href="https://github.com/wxtsky/CodeIsland"
            target="_blank"
            rel="noreferrer"
          >
            参考 CodeIsland
            <ExternalLink size={14} />
          </a>
        </footer>
      </main>
    </div>
  );
}

function UsageStat({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="usage-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{hint}</em>
    </div>
  );
}

export default App;
