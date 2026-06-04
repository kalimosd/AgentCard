import { resolveAgentCardHttpUrl } from "./liveAgent";

export async function submitPermissionDecision(
  permissionId: string,
  decision: "allow" | "deny" | "always",
  href: string = window.location.href
): Promise<void> {
  const base = resolveAgentCardHttpUrl(href);
  const response = await fetch(
    `${base}/permissions/${permissionId}/decision`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision })
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to submit permission decision: ${response.status}`);
  }
}

export async function submitQuestionAnswer(
  questionId: string,
  answer: string,
  optionIndex: number,
  href: string = window.location.href
): Promise<void> {
  const base = resolveAgentCardHttpUrl(href);
  const response = await fetch(
    `${base}/questions/${questionId}/answer`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer, optionIndex })
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to submit question answer: ${response.status}`);
  }
}

export async function submitQuestionAnswers(
  questionId: string,
  answers: Array<{ question: string; answer: string; optionIndex: number }>,
  href: string = window.location.href
): Promise<void> {
  const base = resolveAgentCardHttpUrl(href);
  const response = await fetch(
    `${base}/questions/${questionId}/answers`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers })
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to submit question answers: ${response.status}`);
  }
}

export async function skipQuestion(
  questionId: string,
  href: string = window.location.href
): Promise<void> {
  const base = resolveAgentCardHttpUrl(href);
  await fetch(`${base}/questions/${questionId}/skip`, {
    method: "POST"
  });
}
