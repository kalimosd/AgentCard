import {
  AlertTriangle,
  CheckCircle2,
  MessageCircleQuestion,
  ShieldAlert
} from "lucide-react";
import { stateLabels } from "../lib/agentDemo";
import type { AgentViewProps } from "./types";
import { BeaverLogo } from "./BeaverLogo";
import { TopControls } from "./TopControls";
import { MetricsFooter } from "./MetricsFooter";
import { QuestionOptionActions } from "./QuestionActions";
import { PermissionOrJumpActions } from "./PermissionActions";

const stateTone: Record<string, string> = {
  idle: "tone-idle",
  starting: "tone-working",
  thinking: "tone-working",
  reading: "tone-working",
  editing: "tone-working",
  running_command: "tone-working",
  waiting_approval: "tone-waiting",
  waiting_input: "tone-waiting",
  completed: "tone-done",
  failed: "tone-failed"
};

const interventionIcon: Record<string, typeof ShieldAlert> = {
  waiting_approval: ShieldAlert,
  waiting_input: MessageCircleQuestion,
  command_failed: AlertTriangle,
  test_failed: AlertTriangle,
  completed: CheckCircle2
};

export function CaseOneCompanionCard({
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
  interventionPreview,
  InterventionIcon,
  quotaLevel,
  advance,
  dismissIntervention,
  jumpBack,
  decidePermission,
  answerQuestion,
  answerQuestionGroup,
  togglePause,
  working
}: AgentViewProps & { working: boolean }) {
  const isQuestionIntervention = snapshot.intervention?.kind === "waiting_input";
  const Icon = snapshot.intervention
    ? interventionIcon[snapshot.intervention.kind] ?? ShieldAlert
    : ShieldAlert;

  return (
    <main className={`agent-card ${stateTone[snapshot.state]}`}>
      <header className="card-header">
        <div className="brand-lockup">
          <span className="device-dot" aria-hidden />
          <span className="product-name">Case 1 · Companion Card</span>
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

      <section className="card-stage" aria-label="Agent 状态">
        <BeaverLogo state={snapshot.state} className="beaver-stage-logo" />

        <div className="status-copy">
          <span className="agent-label">{snapshot.agentLabel}</span>
          <h1 className={`status-title ${working ? "is-working" : ""}`}>
            {stateLabels[snapshot.state]}
          </h1>
          <p className="action-line" title={currentAction}>
            {currentAction}
          </p>
          <p className="summary-line">{snapshot.lastSummary}</p>
        </div>
      </section>

      {showIntervention && snapshot.intervention && (
        <section
          className={`attention-sheet ${isQuestionIntervention ? "is-question" : ""}`}
          role="alert"
        >
          <div className="attention-copy">
            <Icon size={28} />
            <div>
              <span>需要你处理</span>
              <h2>{snapshot.intervention.title}</h2>
              <p>{interventionPreview}</p>
            </div>
          </div>
          {snapshot.intervention.kind === "waiting_input" ? (
            <QuestionOptionActions
              intervention={snapshot.intervention}
              canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
              answerQuestion={answerQuestion}
              answerQuestionGroup={answerQuestionGroup}
              jumpBack={jumpBack}
              dismissIntervention={dismissIntervention}
              actionClassName="attention-actions"
            />
          ) : (
            <PermissionOrJumpActions
              snapshot={snapshot}
              canDecideOnTablet={canDecideOnTablet}
              decidePermission={decidePermission}
              jumpBack={jumpBack}
              dismissIntervention={dismissIntervention}
            />
          )}
        </section>
      )}

      {actionFeedback && (
        <p className="feedback-toast" role="status">
          {actionFeedback}
        </p>
      )}

      <MetricsFooter
        snapshot={snapshot}
        elapsed={elapsed}
        quotaLevel={quotaLevel}
      />
    </main>
  );
}
