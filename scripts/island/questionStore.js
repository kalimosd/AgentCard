import crypto from "node:crypto";

export function createQuestionStore() {
  const pending = new Map();

  return {
    create(record) {
      const id = crypto.randomUUID();
      pending.set(id, {
        id,
        status: "pending",
        createdAt: Date.now(),
        ...record
      });
      return id;
    },

    answer(id, { answer, optionIndex } = {}) {
      const entry = pending.get(id);
      if (!entry || entry.status !== "pending") return false;
      if (typeof answer !== "string" || !answer.trim()) return false;
      const result = {
        status: "answered",
        answer,
        ...(Number.isInteger(optionIndex) ? { optionIndex } : {})
      };
      entry.status = result.status;
      entry.result = result;
      if (entry.resolve) {
        entry.resolve(result);
        entry.resolve = null;
      }
      return true;
    },

    answerGroup(id, { answers } = {}) {
      const entry = pending.get(id);
      if (!entry || entry.status !== "pending") return false;
      if (!Array.isArray(answers)) return false;

      const cleanAnswers = answers
        .filter(
          (item) =>
            item &&
            typeof item.question === "string" &&
            item.question.trim() &&
            typeof item.answer === "string" &&
            item.answer.trim()
        )
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
          ...(Number.isInteger(item.optionIndex)
            ? { optionIndex: item.optionIndex }
            : {})
        }));

      if (cleanAnswers.length === 0) return false;

      const result = {
        status: "answered",
        answers: cleanAnswers
      };
      entry.status = result.status;
      entry.result = result;
      if (entry.resolve) {
        entry.resolve(result);
        entry.resolve = null;
      }
      return true;
    },

    skip(id) {
      const entry = pending.get(id);
      if (!entry || entry.status !== "pending") return false;
      const result = { status: "skipped" };
      entry.status = result.status;
      entry.result = result;
      if (entry.resolve) {
        entry.resolve(result);
        entry.resolve = null;
      }
      return true;
    },

    waitForAnswer(id, timeoutMs = 300000) {
      const entry = pending.get(id);
      if (!entry) return Promise.resolve({ status: "skipped" });
      if (entry.status !== "pending") {
        return Promise.resolve(entry.result ?? { status: "skipped" });
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          const result = { status: "skipped" };
          if (entry.status === "pending") {
            entry.status = result.status;
            entry.result = result;
          }
          resolve(entry.result ?? result);
        }, timeoutMs);

        entry.resolve = (result) => {
          clearTimeout(timer);
          resolve(result);
        };
      });
    }
  };
}
