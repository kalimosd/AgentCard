export function createInteractionQueues() {
  return {
    permissions: [],
    questions: [],
    plans: [],
    attention: []
  };
}

export function classifyInteraction(event) {
  if (
    event.interactionKind === "permission" ||
    (!event.interactionKind && event.interventionKind === "waiting_approval")
  ) {
    const id = event.permissionId ?? stableId(event, "permission");
    return {
      queue: "permissions",
      id,
      kind: "permission",
      title: event.interactionTitle ?? "权限确认",
      detail: event.interactionDetail ?? event.interventionDetail ?? event.message,
      payload: event.interactionPayload ?? event.interventionPayload ?? event.message,
      actions: event.canAlways ? ["allow", "always", "deny"] : ["allow", "deny"],
      permissionId: id,
      toolName: event.toolName,
      target: event.target
    };
  }

  if (
    event.interactionKind === "question" ||
    (!event.interactionKind && event.interventionKind === "waiting_input")
  ) {
    return {
      queue: "questions",
      id: event.questionId ?? stableId(event, "question"),
      kind: "question",
      title: event.interactionTitle ?? "需要回答",
      detail: event.questionText ?? event.interventionDetail ?? event.message,
      payload: event.interactionPayload ?? event.interventionPayload ?? event.message,
      options: event.options ?? [],
      questions: event.questions ?? [],
      questionId: event.questionId,
      answerMode: event.answerMode
    };
  }

  if (event.interactionKind === "plan") {
    return {
      queue: "plans",
      id: event.questionId ?? stableId(event, "plan"),
      kind: "plan",
      title: event.interactionTitle ?? "计划审阅",
      detail: event.interactionDetail ?? event.message,
      payload: event.interactionPayload ?? event.message,
      options: event.options ?? [],
      questionId: event.questionId,
      answerMode: event.answerMode
    };
  }

  if (
    event.interactionKind === "attention" ||
    event.interventionKind === "command_failed" ||
    event.interventionKind === "test_failed" ||
    event.interventionKind === "completed"
  ) {
    return {
      queue: "attention",
      id: stableId(event, "attention"),
      kind: "attention",
      title: event.interventionTitle ?? event.interactionTitle ?? "需要注意",
      detail: event.interventionDetail ?? event.interactionDetail ?? event.message,
      payload: event.interventionPayload ?? event.interactionPayload ?? event.message,
      interventionKind: event.interventionKind
    };
  }

  return null;
}

export function applyInteraction(queues, event) {
  const interaction = classifyInteraction(event);
  if (!interaction) return queues;

  const next = cloneQueues(queues);
  upsert(next[interaction.queue], interaction);
  return next;
}

export function selectActiveInteraction(queues) {
  return (
    queues?.permissions?.[0] ??
    queues?.questions?.[0] ??
    queues?.plans?.[0] ??
    queues?.attention?.[0] ??
    null
  );
}

function cloneQueues(queues) {
  return {
    permissions: [...(queues?.permissions ?? [])],
    questions: [...(queues?.questions ?? [])],
    plans: [...(queues?.plans ?? [])],
    attention: [...(queues?.attention ?? [])]
  };
}

function upsert(queue, interaction) {
  if (interaction.kind === "question" && interaction.questionId) {
    const previewIndex = queue.findIndex(
      (item) =>
        item.kind === "question" &&
        !item.questionId &&
        item.detail === interaction.detail
    );
    if (previewIndex >= 0) {
      queue.splice(previewIndex, 1);
    }
  }

  const index = queue.findIndex((item) => item.id === interaction.id);
  if (index >= 0) {
    queue[index] = interaction;
    return;
  }

  // Only keep one active attention item; replace the oldest.
  if (interaction.kind === "attention" && queue.length > 0) {
    queue[queue.length - 1] = interaction;
    return;
  }

  // Cap permissions and questions at a reasonable max.
  if (interaction.kind !== "attention" && queue.length >= 20) {
    queue.splice(0, queue.length - 19);
  }

  queue.push(interaction);
}

function stableId(event, prefix) {
  return `${prefix}-${event.timestamp ?? Date.now()}-${hashText(
    event.message ?? prefix
  )}`;
}

function hashText(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
