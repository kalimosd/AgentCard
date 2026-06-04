import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  MessageCircleQuestion,
  Pause,
  Play,
  RadioTower,
  ShieldAlert,
  SkipForward,
  Terminal,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import angryBeaverUrl from "./assets/beaver-angry.png";
import confusedBeaverUrl from "./assets/beaver-confused.png";
import happyBeaverUrl from "./assets/beaver-happy.png";
import { useIslandDemo } from "./hooks/useIslandDemo";
import { useTicker } from "./hooks/useTicker";
import {
  formatCurrentTool,
  formatElapsed,
  formatTokens,
  getElapsedMs,
  hasIntervention,
  isWorkingState,
  quotaTone,
  stateLabels
} from "./lib/islandDemo";
import type {
  InterventionCard,
  InterventionKind,
  IslandState,
  PermissionDecision,
  QuestionAnswer
} from "./types";

type UiCase = "case1" | "case2";
type BeaverExpression = "happy" | "confused" | "angry";

const beaverExpressionLabels: Record<BeaverExpression, string> = {
  happy: "开心",
  confused: "疑惑",
  angry: "生气"
};

const beaverImageByExpression: Record<BeaverExpression, string> = {
  happy: happyBeaverUrl,
  confused: confusedBeaverUrl,
  angry: angryBeaverUrl
};

const interventionIcon: Record<InterventionKind, typeof ShieldAlert> = {
  waiting_approval: ShieldAlert,
  waiting_input: MessageCircleQuestion,
  command_failed: AlertTriangle,
  test_failed: AlertTriangle,
  completed: CheckCircle2
};

const stateTone: Record<IslandState, string> = {
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

const permissionDecisionLabels: Record<PermissionDecision, string> = {
  allow: "Yes",
  always: "Always",
  deny: "No"
};

function App() {
  const [activeCase, setActiveCase] = useState<UiCase>("case2");
  const {
    snapshot,
    index,
    total,
    paused,
    now,
    dismissedIntervention,
    actionFeedback,
    liveMode,
    connectionState,
    advance,
    dismissIntervention,
    jumpBack,
    decidePermission,
    answerQuestion,
    answerQuestionGroup,
    togglePause
  } = useIslandDemo();

  const canDecideOnTablet = Boolean(
    liveMode &&
      snapshot.intervention?.permissionId &&
      snapshot.intervention.kind === "waiting_approval"
  );
  const canAnswerQuestionOnTablet = Boolean(
    liveMode &&
      snapshot.intervention?.questionId &&
      snapshot.intervention.kind === "waiting_input" &&
      (snapshot.intervention.interactionKind === "question" ||
        snapshot.intervention.interactionKind === "plan")
  );

  const elapsed = formatElapsed(getElapsedMs(snapshot, now));
  const showIntervention =
    hasIntervention(snapshot.intervention) && !dismissedIntervention;
  const working = isWorkingState(snapshot.state);
  const quotaLevel = quotaTone(snapshot.usage.quota5hPercent);
  const InterventionIcon = snapshot.intervention
    ? interventionIcon[snapshot.intervention.kind]
    : ShieldAlert;

  const currentAction = useTicker([
    snapshot.recentAction,
    formatCurrentTool(snapshot.currentTool),
    snapshot.taskPrompt
  ]);

  const interventionPreview =
    snapshot.intervention?.payload?.split("\n")[0]?.trim() ||
    snapshot.intervention?.detail ||
    "";

  const commonProps = {
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
    togglePause
  };

  return (
    <div className={`screen-viewport screen-${activeCase}`}>
      <StyleSwitcher activeCase={activeCase} onChange={setActiveCase} />
      {activeCase === "case1" ? (
        <CaseOneIsland {...commonProps} working={working} />
      ) : (
        <CaseTwoControlSurface {...commonProps} />
      )}
    </div>
  );
}

interface IslandViewProps {
  snapshot: ReturnType<typeof useIslandDemo>["snapshot"];
  index: number;
  total: number;
  paused: boolean;
  liveMode: boolean;
  connectionState: ReturnType<typeof useIslandDemo>["connectionState"];
  elapsed: string;
  showIntervention: boolean;
  canDecideOnTablet: boolean;
  canAnswerQuestionOnTablet: boolean;
  actionFeedback: string | null;
  currentAction: string;
  interventionPreview: string;
  InterventionIcon: typeof ShieldAlert;
  quotaLevel: ReturnType<typeof quotaTone>;
  advance: () => void;
  dismissIntervention: () => void;
  jumpBack: (questionId?: string) => void;
  decidePermission: (
    permissionId: string,
    decision: "allow" | "deny" | "always"
  ) => void;
  answerQuestion: (questionId: string, answer: string, optionIndex: number) => void;
  answerQuestionGroup: (questionId: string, answers: QuestionAnswer[]) => void;
  togglePause: () => void;
}

function StyleSwitcher({
  activeCase,
  onChange
}: {
  activeCase: UiCase;
  onChange: (value: UiCase) => void;
}) {
  return (
    <nav className="case-switcher" aria-label="UI 风格切换">
      <button
        type="button"
        className={activeCase === "case1" ? "is-active" : ""}
        onClick={() => onChange("case1")}
      >
        <span>Case 1</span>
        <strong>陪伴卡</strong>
      </button>
      <button
        type="button"
        className={activeCase === "case2" ? "is-active" : ""}
        onClick={() => onChange("case2")}
      >
        <span>Case 2</span>
        <strong>控制台面</strong>
      </button>
    </nav>
  );
}

function CaseOneIsland({
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
}: IslandViewProps & { working: boolean }) {
  const isQuestionIntervention = snapshot.intervention?.kind === "waiting_input";

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
            <InterventionIcon size={28} />
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

function CaseTwoControlSurface({
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
}: IslandViewProps) {
  const interactionKind = typedInteractionLabel(snapshot.intervention);
  const displayTitle = displaySessionTitle(snapshot);
  const showActions = shouldShowInterventionActions(
    showIntervention,
    snapshot.intervention
  );

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
            <InterventionIcon size={30} />
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

function TopControls({
  snapshot,
  index,
  total,
  paused,
  liveMode,
  connectionState,
  advance,
  togglePause
}: {
  snapshot: IslandViewProps["snapshot"];
  index: number;
  total: number;
  paused: boolean;
  liveMode: boolean;
  connectionState: IslandViewProps["connectionState"];
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

function QuestionOptionActions({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestion,
  answerQuestionGroup,
  jumpBack,
  dismissIntervention,
  optionContainerClassName = "question-options",
  optionButtonClassName = "option-button",
  actionClassName
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestion: IslandViewProps["answerQuestion"];
  answerQuestionGroup: IslandViewProps["answerQuestionGroup"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
  optionContainerClassName?: string;
  optionButtonClassName?: string;
  actionClassName: string;
}) {
  return (
    <div className="question-action-stack">
      <QuestionOptionButtons
        intervention={intervention}
        canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
        answerQuestion={answerQuestion}
        containerClassName={optionContainerClassName}
        buttonClassName={optionButtonClassName}
      />
      <QuestionGroupButtons
        intervention={intervention}
        canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
        answerQuestionGroup={answerQuestionGroup}
        containerClassName={optionContainerClassName}
        buttonClassName={optionButtonClassName}
      />
      <div className={actionClassName}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => jumpBack(intervention.questionId)}
        >
          <ArrowLeft size={18} />
          Jump Back
        </button>
        <button type="button" className="btn-muted" onClick={dismissIntervention}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function QuestionGroupButtons({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestionGroup,
  containerClassName,
  buttonClassName
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestionGroup: IslandViewProps["answerQuestionGroup"];
  containerClassName: string;
  buttonClassName: string;
}) {
  const groups = questionGroupsForIntervention(intervention);
  const [selected, setSelected] = useState<Record<number, QuestionAnswer>>({});
  const resetKey = `${intervention.questionId ?? ""}:${groups
    .map((group) => `${group.question}:${group.options.join("|")}`)
    .join("||")}`;

  useEffect(() => {
    setSelected({});
  }, [resetKey]);

  if (groups.length === 0) return null;

  return (
    <div className={`${containerClassName} question-groups`} aria-label="多题选项">
      {groups.map((group, groupIndex) => (
        <div className="question-group" key={`${group.question}-${groupIndex}`}>
          <div className="question-group-head">
            <span>{groupIndex + 1}</span>
            <p>{group.question}</p>
          </div>
          <div className="question-group-options">
            {group.options.map((option, optionIndex) => {
              const parts = questionOptionParts(option, optionIndex);
              const answer = questionGroupAnswerValueForOption(
                intervention,
                option,
                optionIndex
              );
              const isSelected = selected[groupIndex]?.answer === answer;
              return (
                <button
                  type="button"
                  className={`${buttonClassName} ${isSelected ? "is-selected" : ""}`}
                  key={`${group.question}-${option}-${optionIndex}`}
                  disabled={!canAnswerQuestionOnTablet || !intervention.questionId}
                  title={
                    canAnswerQuestionOnTablet
                      ? "选择这一项；选齐后会发送给 Claude"
                      : "请回 terminal 回答"
                  }
                  onClick={() => {
                    if (!intervention.questionId) return;
                    const next = {
                      ...selected,
                      [groupIndex]: {
                        question: group.question,
                        answer,
                        optionIndex
                      }
                    };
                    setSelected(next);
                    if (Object.keys(next).length === groups.length) {
                      answerQuestionGroup(
                        intervention.questionId,
                        groups.map((nextGroup, nextIndex) => ({
                          question: nextGroup.question,
                          answer: next[nextIndex].answer,
                          optionIndex: next[nextIndex].optionIndex
                        }))
                      );
                    }
                  }}
                >
                  <span className="option-index" aria-hidden>
                    {parts.indexLabel}
                  </span>
                  <span className="option-copy">{parts.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="question-group-status" role="status">
        已选 {Object.keys(selected).length}/{groups.length}，选齐后自动提交
      </p>
    </div>
  );
}

function QuestionOptionButtons({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestion,
  containerClassName,
  buttonClassName
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestion: IslandViewProps["answerQuestion"];
  containerClassName: string;
  buttonClassName: string;
}) {
  const options = questionOptionsForIntervention(intervention);
  if (options.length === 0) return null;

  return (
    <div className={containerClassName} aria-label="问题选项">
      {options.map((option, index) => {
        const parts = questionOptionParts(option, index);
        return (
          <button
            type="button"
            className={buttonClassName}
            key={option}
            disabled={
              !canAnswerQuestionOnTablet ||
              !isQuestionOptionAnswerable(intervention, option, index)
            }
            title={
              canAnswerQuestionOnTablet &&
              isQuestionOptionAnswerable(intervention, option, index)
                ? "在 AgentCard 中选择这个回答"
                : intervention.interactionKind === "plan"
                  ? "请回 terminal 输入文字反馈"
                : "请回 terminal 回答"
            }
            onClick={() => {
              if (!intervention.questionId) return;
              answerQuestion(
                intervention.questionId,
                questionAnswerValueForOption(intervention, option, index),
                index
              );
            }}
          >
            <span className="option-index" aria-hidden>
              {parts.indexLabel}
            </span>
            <span className="option-copy">{parts.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function PermissionDecisionButtons({
  intervention,
  canDecideOnTablet,
  decidePermission
}: {
  intervention?: InterventionCard;
  canDecideOnTablet: boolean;
  decidePermission: IslandViewProps["decidePermission"];
}) {
  return (
    <>
      {permissionDecisionsForIntervention(intervention, canDecideOnTablet).map(
        (decision) => (
          <button
            type="button"
            className={permissionDecisionClassName(decision)}
            key={decision}
            onClick={() => decidePermission(intervention!.permissionId!, decision)}
          >
            {permissionDecisionIcon(decision)}
            {permissionDecisionLabels[decision]}
          </button>
        )
      )}
    </>
  );
}

function PermissionOrJumpActions({
  snapshot,
  canDecideOnTablet,
  decidePermission,
  jumpBack,
  dismissIntervention
}: {
  snapshot: IslandViewProps["snapshot"];
  canDecideOnTablet: boolean;
  decidePermission: IslandViewProps["decidePermission"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
}) {
  const decisions = permissionDecisionsForIntervention(
    snapshot.intervention,
    canDecideOnTablet
  );

  return (
    <div className="attention-actions">
      {decisions.length > 0 ? (
        <PermissionDecisionButtons
          intervention={snapshot.intervention}
          canDecideOnTablet={canDecideOnTablet}
          decidePermission={decidePermission}
        />
      ) : (
        <button type="button" className="btn-primary" onClick={() => jumpBack()}>
          <ArrowLeft size={18} />
          回 Terminal
        </button>
      )}
      <button type="button" className="btn-muted" onClick={dismissIntervention}>
        忽略
      </button>
    </div>
  );
}

function PermissionControlsPreview({
  snapshot,
  canDecideOnTablet,
  decidePermission,
  jumpBack,
  dismissIntervention
}: {
  snapshot: IslandViewProps["snapshot"];
  canDecideOnTablet: boolean;
  decidePermission: IslandViewProps["decidePermission"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
}) {
  if (snapshot.intervention?.kind === "waiting_approval") {
    const decisions = permissionDecisionsForIntervention(
      snapshot.intervention,
      canDecideOnTablet
    );

    return (
      <div className="control-actions">
        {decisions.length > 0 ? (
          <PermissionDecisionButtons
            intervention={snapshot.intervention}
            canDecideOnTablet={canDecideOnTablet}
            decidePermission={decidePermission}
          />
        ) : (
          <button type="button" className="btn-primary" onClick={() => jumpBack()}>
            <ArrowLeft size={18} />
            Terminal
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="control-actions">
      <button type="button" className="btn-primary" onClick={() => jumpBack()}>
        <ArrowLeft size={18} />
        Jump Back
      </button>
      <button type="button" className="btn-muted" onClick={dismissIntervention}>
        Dismiss
      </button>
    </div>
  );
}

function MetricsFooter({
  snapshot,
  elapsed,
  quotaLevel
}: {
  snapshot: IslandViewProps["snapshot"];
  elapsed: string;
  quotaLevel: IslandViewProps["quotaLevel"];
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

function typedInteractionLabel(intervention?: InterventionCard) {
  if (!intervention) return "观察中";
  if (intervention.interactionKind === "plan") return "计划队列";
  if (intervention.interactionKind === "question") return "问题队列";
  if (intervention.interactionKind === "attention") return "注意队列";
  if (intervention.kind === "waiting_approval") return "权限队列";
  if (intervention.kind === "waiting_input") return "问题队列";
  if (intervention.kind === "command_failed" || intervention.kind === "test_failed") {
    return "失败队列";
  }
  return "完成队列";
}

function permissionDecisionClassName(decision: PermissionDecision) {
  if (decision === "always") return "btn-always";
  if (decision === "deny") return "btn-deny";
  return "btn-allow";
}

function permissionDecisionIcon(decision: PermissionDecision) {
  if (decision === "always") return <ShieldAlert size={18} />;
  if (decision === "deny") return <X size={18} />;
  return <CheckCircle2 size={18} />;
}

export function shouldShowInterventionActions(
  showIntervention: boolean,
  intervention?: InterventionCard
) {
  return Boolean(showIntervention && intervention);
}

export function displaySessionTitle({
  sessionTitle,
  state
}: Pick<IslandViewProps["snapshot"], "sessionTitle" | "state">) {
  if (sessionTitle === "未启动") {
    return stateLabels[state];
  }
  return sessionTitle;
}

export function questionOptionsForIntervention(intervention?: InterventionCard) {
  if (intervention?.kind !== "waiting_input") return [];
  if (questionGroupsForIntervention(intervention).length > 0) return [];
  return intervention.options ?? [];
}

export function questionGroupsForIntervention(intervention?: InterventionCard) {
  if (intervention?.kind !== "waiting_input") return [];
  if (intervention.interactionKind !== "question") return [];
  return (intervention.questions ?? []).filter(
    (group) =>
      typeof group.question === "string" &&
      group.question.trim() &&
      Array.isArray(group.options) &&
      group.options.length > 0
  );
}

export function questionAnswerLabelsForIntervention(
  intervention: InterventionCard | undefined,
  canAnswerQuestionOnTablet: boolean
) {
  if (!canAnswerQuestionOnTablet) return [];
  if (intervention?.kind !== "waiting_input") return [];
  if (
    intervention.interactionKind !== "question" &&
    intervention.interactionKind !== "plan"
  ) {
    return [];
  }
  if (!intervention.questionId) return [];
  if (questionGroupsForIntervention(intervention).length > 0) return [];
  return (intervention.options ?? []).filter((option, index) =>
    isQuestionOptionAnswerable(intervention, option, index)
  );
}

export function isQuestionOptionAnswerable(
  intervention: InterventionCard,
  option: string,
  index: number
) {
  if (intervention.interactionKind !== "plan") return true;
  const text = option.toLowerCase();
  return index < 2 && !text.includes("tell claude what to change");
}

export function questionOptionParts(option: string, index: number) {
  const text = option.trim();
  const match = text.match(/^(\d+|[A-Z])[\).\u3001、]\s*(.+)$/i);
  if (!match) {
    return {
      indexLabel: String(index + 1),
      text
    };
  }
  return {
    indexLabel: match[1],
    text: match[2].trim()
  };
}

export function questionAnswerValueForOption(
  intervention: InterventionCard,
  option: string,
  index: number
) {
  if (intervention.interactionKind === "plan") {
    return option;
  }
  const parts = questionOptionParts(option, index);
  if (intervention.answerMode === "choice") {
    return parts.indexLabel;
  }
  return parts.text;
}

function questionGroupAnswerValueForOption(
  intervention: InterventionCard,
  option: string,
  index: number
) {
  const parts = questionOptionParts(option, index);
  if (intervention.answerMode === "choice") return parts.indexLabel;
  return parts.text;
}

export function permissionDecisionsForIntervention(
  intervention: InterventionCard | undefined,
  canDecideOnTablet: boolean
) {
  if (!canDecideOnTablet) return [];
  if (intervention?.kind !== "waiting_approval") return [];
  if (!intervention.permissionId) return [];
  return intervention.actions ?? ["allow", "deny"];
}

export function permissionDecisionLabelsForIntervention(
  intervention: InterventionCard | undefined,
  canDecideOnTablet: boolean
) {
  return permissionDecisionsForIntervention(intervention, canDecideOnTablet).map(
    (decision) => permissionDecisionLabels[decision]
  );
}

export function beaverExpressionForState(state: IslandState): BeaverExpression {
  if (state === "failed") return "angry";
  if (state === "waiting_approval" || state === "waiting_input") {
    return "confused";
  }
  return "happy";
}

function BeaverLogo({
  state,
  className = ""
}: {
  state: IslandState;
  className?: string;
}) {
  const expression = beaverExpressionForState(state);
  const label = beaverExpressionLabels[expression];

  return (
    <div
      className={`beaver-logo beaver-${expression} beaver-state-${state} ${className}`}
      role="img"
      aria-label={`河狸 ${label}`}
    >
      <img src={beaverImageByExpression[expression]} alt="" />
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  compact = false
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`metric ${compact ? "is-compact" : ""}`}>
      <span>{label}</span>
      <strong>
        {icon}
        {value}
      </strong>
    </div>
  );
}

export default App;
