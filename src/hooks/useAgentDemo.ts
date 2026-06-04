import { useCallback, useEffect, useState } from "react";
import { DEMO_STEP_MS, agentScenarios } from "../data/agentScenarios";
import { nextScenarioIndex } from "../lib/agentDemo";
import {
  skipQuestion,
  submitPermissionDecision,
  submitQuestionAnswer,
  submitQuestionAnswers
} from "../lib/agentApi";
import type { InterventionCard, QuestionAnswer } from "../types";
import { useAgentLive } from "./useAgentLive";

export function useAgentDemo() {
  const live = useAgentLive();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dismissedIntervention, setDismissedIntervention] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const demoSnapshot = agentScenarios[index] ?? agentScenarios[0];
  const snapshot = live.snapshot ?? demoSnapshot;
  const liveMode = Boolean(live.snapshot);
  const liveResetKey = liveMode
    ? liveInterventionResetKey(snapshot.intervention)
    : "";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDismissedIntervention(false);
    setActionFeedback(null);
  }, [index]);

  useEffect(() => {
    if (!liveMode) return;
    setDismissedIntervention(false);
    setActionFeedback(null);
  }, [liveMode, liveResetKey]);

  useEffect(() => {
    if (liveMode) return;
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => nextScenarioIndex(current, agentScenarios.length));
    }, DEMO_STEP_MS);
    return () => window.clearInterval(timer);
  }, [liveMode, paused]);

  const advance = useCallback(() => {
    setIndex((current) => nextScenarioIndex(current, agentScenarios.length));
  }, []);

  const dismissIntervention = useCallback(() => {
    setDismissedIntervention(true);
    setActionFeedback("提醒已忽略，agent 仍会在 terminal 继续。");
  }, []);

  const decidePermission = useCallback(
    async (permissionId: string, decision: "allow" | "deny" | "always") => {
      try {
        await submitPermissionDecision(permissionId, decision);
        setDismissedIntervention(true);
        setActionFeedback(
          decision === "allow"
            ? "已在副屏允许，Claude 会继续执行。"
            : decision === "always"
              ? "本会话已总是允许该权限，Claude 会继续执行。"
              : "已在副屏拒绝该权限请求。"
        );
      } catch {
        setActionFeedback("无法连接 AgentCard server，请确认服务是否在运行。");
      }
    },
    []
  );

  const answerQuestion = useCallback(
    async (questionId: string, answer: string, optionIndex: number) => {
      try {
        await submitQuestionAnswer(questionId, answer, optionIndex);
        setDismissedIntervention(true);
        setActionFeedback(`已在副屏选择「${answer}」，Claude 会继续执行。`);
      } catch {
        setActionFeedback("无法连接 AgentCard server，请确认服务是否在运行。");
      }
    },
    []
  );

  const answerQuestionGroup = useCallback(
    async (questionId: string, answers: QuestionAnswer[]) => {
      try {
        await submitQuestionAnswers(questionId, answers);
        setDismissedIntervention(true);
        setActionFeedback(
          `已在副屏选择 ${answers.length} 项，Claude 会继续执行。`
        );
      } catch {
        setActionFeedback("无法连接 AgentCard server，请确认服务是否在运行。");
      }
    },
    []
  );

  const jumpBack = useCallback(
    async (questionId?: string) => {
      if (liveMode && questionId) {
        try {
          await skipQuestion(questionId);
          setDismissedIntervention(true);
          setActionFeedback("已释放给 Claude terminal，请回 terminal 继续处理。");
          return;
        } catch {
          setActionFeedback("无法连接 AgentCard server，请回到运行 claude 的 terminal。");
          return;
        }
      }

      setActionFeedback("若副屏按钮无效，请回到运行 claude 的 terminal。");
    },
    [liveMode]
  );

  const togglePause = useCallback(() => {
    setPaused((value) => !value);
  }, []);

  return {
    snapshot,
    index,
    total: agentScenarios.length,
    paused,
    now,
    dismissedIntervention,
    actionFeedback,
    liveMode,
    connectionState: live.connectionState,
    advance,
    dismissIntervention,
    jumpBack,
    decidePermission,
    answerQuestion,
    answerQuestionGroup,
    togglePause
  };
}

export function liveInterventionResetKey(intervention?: InterventionCard) {
  if (!intervention) return "none";
  return [
    intervention.kind,
    intervention.interactionKind ?? "",
    intervention.permissionId ?? "",
    intervention.questionId ?? "",
    intervention.title,
    intervention.detail
  ].join("|");
}
