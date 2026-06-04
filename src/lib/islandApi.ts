import { resolveIslandHttpUrl } from "./liveIsland";
import type { QuestionAnswer } from "../types";

export async function submitPermissionDecision(
  permissionId: string,
  decision: "allow" | "deny" | "always",
  href = window.location.href
) {
  const response = await fetch(
    `${resolveIslandHttpUrl(href)}/permissions/${permissionId}/decision`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision })
    }
  );

  if (!response.ok) {
    throw new Error(`Permission decision failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function submitQuestionAnswer(
  questionId: string,
  answer: string,
  optionIndex: number,
  href = window.location.href
) {
  const response = await fetch(
    `${resolveIslandHttpUrl(href)}/questions/${questionId}/answer`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer, optionIndex })
    }
  );

  if (!response.ok) {
    throw new Error(`Question answer failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function submitQuestionAnswers(
  questionId: string,
  answers: QuestionAnswer[],
  href = window.location.href
) {
  const response = await fetch(
    `${resolveIslandHttpUrl(href)}/questions/${questionId}/answers`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers })
    }
  );

  if (!response.ok) {
    throw new Error(`Question answers failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function skipQuestion(
  questionId: string,
  href = window.location.href
) {
  const response = await fetch(
    `${resolveIslandHttpUrl(href)}/questions/${questionId}/skip`,
    {
      method: "POST",
      headers: { "content-type": "application/json" }
    }
  );

  if (!response.ok) {
    throw new Error(`Question skip failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}
