# AgentCard Agent Instructions

This project is AgentCard: an early AI agent product, agent sidecar, workspace monitor, task monitor, or AI productivity app. It is not OfferPilot. Avoid job-search-specific assumptions unless the user explicitly asks for them.

## Frontend / UI Tasks

For any task involving frontend pages, components, styles, layout, interaction states, or visual review:

- Use `skills/ui-product-designer` when requirements are ambiguous.
- Use `skills/ui-design-system` before creating or changing visual styles.
- Use `skills/ui-page-builder` before implementing pages or components.
- Use `skills/ui-reviewer` before finishing.
- Do not finish a UI task with a reviewer score below 80 unless explicitly allowed by the user.
- Prefer clean AI workspace aesthetics over flashy AI marketing visuals.
- Keep agent status, user control, and next action clear.

## Product Guardrails

- Favor calm, technical, trustworthy UI.
- Do not create generic admin dashboards.
- Do not pile up equal-weight feature cards.
- Do not use random gradients, inconsistent spacing, or inconsistent radii.
- Treat permissions, questions, plans, failures, and completion as distinct agent interaction states.
