import { useEffect, useState } from "react";
import type { InterventionCard, QuestionAnswer } from "../types";
import type { AgentViewProps } from "./types";
import {
  isQuestionOptionAnswerable,
  questionAnswerValueForOption,
  questionGroupAnswerValueForOption,
  questionGroupsForIntervention,
  questionOptionParts,
  questionOptionsForIntervention
} from "./interventionUtils";

export function QuestionOptionActions({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestion,
  answerQuestionGroup,
  jumpBack,
  dismissIntervention,
  actionClassName
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestion: AgentViewProps["answerQuestion"];
  answerQuestionGroup: AgentViewProps["answerQuestionGroup"];
  jumpBack: (questionId?: string) => void;
  dismissIntervention: () => void;
  actionClassName: string;
}) {
  return (
    <div className="question-action-stack">
      <QuestionOptionButtons
        intervention={intervention}
        canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
        answerQuestion={answerQuestion}
      />
      <QuestionGroupButtons
        intervention={intervention}
        canAnswerQuestionOnTablet={canAnswerQuestionOnTablet}
        answerQuestionGroup={answerQuestionGroup}
      />
      <div className={actionClassName}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => jumpBack(intervention.questionId)}
        >
          Jump Back
        </button>
        <button type="button" className="btn-muted" onClick={dismissIntervention}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function QuestionOptionButtons({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestion
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestion: AgentViewProps["answerQuestion"];
}) {
  const options = questionOptionsForIntervention(intervention);
  if (options.length === 0) return null;

  return (
    <div className="question-options" aria-label="问题选项">
      {options.map((option, index) => {
        const parts = questionOptionParts(option, index);
        return (
          <button
            type="button"
            className="option-button"
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

function QuestionGroupButtons({
  intervention,
  canAnswerQuestionOnTablet,
  answerQuestionGroup
}: {
  intervention: InterventionCard;
  canAnswerQuestionOnTablet: boolean;
  answerQuestionGroup: AgentViewProps["answerQuestionGroup"];
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
    <div className="question-options question-groups" aria-label="多题选项">
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
                  className={`option-button ${isSelected ? "is-selected" : ""}`}
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
