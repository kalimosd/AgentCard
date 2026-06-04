import type { AgentState } from "../types";
import angryBeaverUrl from "../assets/beaver-angry.png";
import confusedBeaverUrl from "../assets/beaver-confused.png";
import happyBeaverUrl from "../assets/beaver-happy.png";

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

export function beaverExpressionForState(state: AgentState): BeaverExpression {
  if (state === "failed") return "angry";
  if (state === "waiting_approval" || state === "waiting_input") {
    return "confused";
  }
  return "happy";
}

export function BeaverLogo({
  state,
  className = ""
}: {
  state: AgentState;
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
