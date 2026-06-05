import type { AgentState, InterventionCard } from "../types";
import { stateLabels } from "../lib/agentDemo";

export function shouldShowInterventionActions(
  showIntervention: boolean,
  intervention?: InterventionCard
) {
  return Boolean(showIntervention && intervention);
}

export function displaySessionTitle({
  sessionTitle,
  state
}: {
  sessionTitle: string;
  state: AgentState;
}) {
  if (sessionTitle === "未启动") {
    return stateLabels[state] ?? state;
  }
  return sessionTitle;
}

export function typedInteractionLabel(intervention?: InterventionCard) {
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
  _option: string,
  index: number
) {
  if (intervention.interactionKind !== "plan") return true;
  // Plans: first 2 options are answerable from AgentCard;
  // option 3+ (feedback) must go back to terminal.
  return index < 2;
}

export function questionOptionParts(option: string, index: number) {
  const text = option.trim();
  const match = text.match(/^(\d+|[A-Z])[\).、、]\s*(.+)$/i);
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

export function questionGroupAnswerValueForOption(
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
): ("allow" | "always" | "deny")[] {
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

export const permissionDecisionLabels: Record<string, string> = {
  allow: "Yes",
  always: "Always",
  deny: "No"
};

export function permissionDecisionClassName(decision: string) {
  if (decision === "always") return "btn-always";
  if (decision === "deny") return "btn-deny";
  return "btn-allow";
}

export function permissionDecisionIcon(decision: string) {
  if (decision === "always") return "shield";
  if (decision === "deny") return "x";
  return "check";
}
