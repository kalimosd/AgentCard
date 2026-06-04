import type { useAgentDemo } from "../hooks/useAgentDemo";
import type { quotaTone } from "../lib/agentDemo";
import type { QuestionAnswer } from "../types";

export interface AgentViewProps {
  snapshot: ReturnType<typeof useAgentDemo>["snapshot"];
  index: number;
  total: number;
  paused: boolean;
  liveMode: boolean;
  connectionState: ReturnType<typeof useAgentDemo>["connectionState"];
  elapsed: string;
  showIntervention: boolean;
  canDecideOnTablet: boolean;
  canAnswerQuestionOnTablet: boolean;
  actionFeedback: string | null;
  currentAction: string;
  interventionPreview: string;
  InterventionIcon: typeof import("lucide-react").ShieldAlert;
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
