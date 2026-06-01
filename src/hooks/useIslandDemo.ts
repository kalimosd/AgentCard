import { useCallback, useEffect, useState } from "react";
import { DEMO_STEP_MS, islandScenarios } from "../data/islandScenarios";
import { nextScenarioIndex } from "../lib/islandDemo";

export function useIslandDemo() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dismissedIntervention, setDismissedIntervention] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const snapshot = islandScenarios[index] ?? islandScenarios[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDismissedIntervention(false);
    setActionFeedback(null);
  }, [index]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => nextScenarioIndex(current, islandScenarios.length));
    }, DEMO_STEP_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const advance = useCallback(() => {
    setIndex((current) => nextScenarioIndex(current, islandScenarios.length));
  }, []);

  const dismissIntervention = useCallback(() => {
    setDismissedIntervention(true);
    setActionFeedback("提醒已忽略，agent 仍会在 terminal 继续。");
  }, []);

  const jumpBack = useCallback(() => {
    setActionFeedback("请回到对应 terminal 处理；v0.1 demo 不执行远程控制。");
  }, []);

  const markDone = useCallback(() => {
    setDismissedIntervention(true);
    setActionFeedback("已标记处理完成，不会向 agent 发送 approve 或 reply。");
  }, []);

  const togglePause = useCallback(() => {
    setPaused((value) => !value);
  }, []);

  return {
    snapshot,
    index,
    total: islandScenarios.length,
    paused,
    now,
    dismissedIntervention,
    actionFeedback,
    advance,
    dismissIntervention,
    jumpBack,
    markDone,
    togglePause
  };
}
