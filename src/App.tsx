import { AlertTriangle, CheckCircle2, MessageCircleQuestion, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useAgentDemo } from "./hooks/useAgentDemo";
import { useTicker } from "./hooks/useTicker";
import {
  formatCurrentTool,
  formatElapsed,
  getElapsedMs,
  hasIntervention,
  isWorkingState,
  quotaTone,
  stateTone
} from "./lib/agentDemo";
import type {
  InterventionKind,
  AgentState
} from "./types";
import { CaseOneCompanionCard } from "./components/CaseOneCompanionCard";
import { CaseTwoControlSurface } from "./components/CaseTwoControlSurface";
import { StyleSwitcher } from "./components/StyleSwitcher";

type UiCase = "case1" | "case2";

const interventionIcon: Record<InterventionKind, typeof ShieldAlert> = {
  waiting_approval: ShieldAlert,
  waiting_input: MessageCircleQuestion,
  command_failed: AlertTriangle,
  test_failed: AlertTriangle,
  completed: CheckCircle2
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
  } = useAgentDemo();

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
        <CaseOneCompanionCard {...commonProps} working={working} />
      ) : (
        <CaseTwoControlSurface {...commonProps} />
      )}
    </div>
  );
}

export default App;
