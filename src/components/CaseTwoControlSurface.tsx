import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  MessageCircleQuestion,
  RadioTower,
  ShieldAlert,
  Terminal
} from "lucide-react";
import { formatCurrentTool, formatTokens, stateLabels, stateTone } from "../lib/agentDemo";
import type { AgentViewProps } from "./types";
import { BeaverLogo } from "./BeaverLogo";
import { Metric } from "./Metric";
import { TopControls } from "./TopControls";
import { QuestionOptionActions } from "./QuestionActions";
import { PermissionControlsPreview } from "./PermissionActions";
import {
  displaySessionTitle,
  shouldShowInterventionActions,
  typedInteractionLabel
} from "./interventionUtils";

const interventionIcon: Record<string, typeof ShieldAlert> = {
  waiting_approval: ShieldAlert,
  waiting_input: MessageCircleQuestion,
  command_failed: AlertTriangle,
  test_failed: AlertTriangle,
  completed: CheckCircle2
};

export function CaseTwoControlSurface({
  snapshot,
  index,
  total,
  paused,
  liveMode,
  connectionState,
  elapsed,
  showIntervention,
  canDecideOnTablet,
  canAnswerQuestionOnTablet,
  actionFeedback,
  currentAction,
  InterventionIcon,
  quotaLevel,
  advance,
  dismissIntervention,
  jumpBack,
  decidePermission,
  answerQuestion,
  answerQuestionGroup,
  togglePause
}: AgentViewProps) {
  const interactionKind = typedInteractionLabel(snapshot.intervention);
  const displayTitle = displaySessionTitle(snapshot);
  const showActions = shouldShowInterventionActions(
    showIntervention,
    snapshot.intervention
  );
  const Icon = snapshot.intervention
    ? interventionIcon[snapshot.intervention.kind] ?? ShieldAlert
    : ShieldAlert;

  return (
    <main className={`control-surface ${stateTone[snapshot.state]}`}>
      <header className="control-header">
        <div className="control-title">
          <span className="control-kicker">Case 2 · Control Console</span>
          <h1>{snapshot.agentLabel}</h1>
          <p>{snapshot.project}</p>
        </div>
        <TopControls
          snapshot={snapshot}
          index={index}
          total={total}
          paused={paused}
          liveMode={liveMode}
          connectionState={connectionState}
          advance={advance}
          togglePause={togglePause}
        />
      </header>

      <section className="control-grid" aria-label="Agent 控制台">
        <div className="status-console">
          <div className="status-pet-panel" aria-label="状态宠物">
            <div className="pet-label">
              <span>河狸</span>
              <strong>Agent</strong>
            </div>
            <BeaverLogo state={snapshot.state} className="beaver-panel-logo" />
          </div>

          <div className="console-status-compact">
            <div className="console-state-row">
              <span className="signal-light" aria-hidden />
              <span>{stateLabels[snapshot.state]}</span>
            </div>
            <h2>{displayTitle}</h2>
            <p className="console-action" title={currentAction}>
              {currentAction}
            </p>
            <p className="console-summary">{snapshot.lastSummary}</p>
          </div>

          <div className="tool-strip">
            <Metric label="运行" value={elapsed} icon={<Terminal size={15} />} />
            <Metric label="工具" value={formatCurrentTool(snapshot.currentTool)} compact />
            <Metric label="模型" value={snapshot.model} compact />
          </div>
        </div>

        <section className="interaction-console" role={showIntervention ? "alert" : undefined}>
          <div className="interaction-head">
            <div>
              <span>{interactionKind}</span>
              <h2>{snapshot.intervention?.title ?? "暂无待处理介入"}</h2>
            </div>
            <Icon size={30} />
          </div>

          <p className="interaction-detail">
            {showIntervention && snapshot.intervention
              ? snapshot.intervention.detail
              : "AgentCard 正在观察当前 agent。权限、问题、计划、失败会按类型进入这里。"}
          </p>

          <pre className="payload-preview">
            {showIntervention && snapshot.intervention
              ? snapshot.intervention.payload
              : `recent: ${snapshot.recentAction}`}
          </pre>

          {showActions && snapshot.intervention?.kind === "waiting_input" ? (
            <QuestionOptionActions
              intervention={snapshot.intervention}
              canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
              answerQuestion={answerQuestion}
              answerQuestionGroup={answerQuestionGroup}
              jumpBack={jumpBack}
              dismissIntervention={dismissIntervention}
              actionClassName="control-actions"
            />
          ) : showActions ? (
            <PermissionControlsPreview
              snapshot={snapshot}
              canDecideOnTablet={canDecideOnTablet}
              decidePermission={decidePermission}
              jumpBack={jumpBack}
              dismissIntervention={dismissIntervention}
            />
          ) : null}
        </section>

        <aside className="diagnostic-rail" aria-label="事件诊断">
          <div className="rail-item is-primary">
            <RadioTower size={18} />
            <span>interaction</span>
            <strong>{interactionKind}</strong>
          </div>
          <div className="rail-item">
            <Activity size={18} />
            <span>quota</span>
            <strong>{snapshot.usage.quota5hPercent}%</strong>
          </div>
          <div className="rail-item">
            <ClipboardCheck size={18} />
            <span>tokens</span>
            <strong>{formatTokens(snapshot.usage.sessionTokens)}</strong>
          </div>
        </aside>
      </section>

      <footer className="event-console">
        {snapshot.eventTail.map((event) => (
          <span key={`${event.time}-${event.text}`}>
            <strong>{event.time}</strong>
            {event.text}
          </span>
        ))}
      </footer>

      {actionFeedback && (
        <p className="feedback-toast control-feedback" role="status">
          {actionFeedback}
        </p>
      )}

      <div className={`control-quota quota-${quotaLevel}`} aria-hidden>
        <i style={{ width: `${snapshot.usage.quota5hPercent}%` }} />
      </div>
    </main>
  );
}
