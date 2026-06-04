---
name: ui-page-builder
description: Use before implementing frontend pages, components, layouts, responsive behavior, or UI state rendering. Enforces a short UI plan, design-system compliance, component reuse, and clean implementation for AgentCard and AI workspace interfaces.
---

# UI Page Builder

Use this skill immediately before coding a page or component.

## Before Coding

1. Identify the page type.
2. Read and apply `ui-product-designer` if the requirement is ambiguous.
3. Read and apply `ui-design-system` before changing visual styles.
4. Produce a short UI plan:
   - layout
   - sections
   - components
   - responsive behavior
   - empty/loading/error states
5. Then implement.

## Implementation Rules

- Prefer the existing project component system.
- If the project uses shadcn/ui, use shadcn components.
- If the project uses Tailwind, use Tailwind utilities consistently.
- Do not introduce a new UI library unless necessary.
- Do not create one-off CSS chaos.
- Reuse existing `Button`, `Card`, `Badge`, `Input`, `Tabs`, and `Dialog` components when available.
- Keep components composable.
- Separate layout components from data or business logic where reasonable.
- Do not change data models unless the UI requirement cannot be met otherwise.

## Responsive Rules

- Build mobile first.
- Desktop should not look like stretched mobile.
- Cards should collapse cleanly.
- Sidebars should become drawers or top navigation when needed.
- Important actions must remain visible.
- Text must not overflow buttons, cards, or status pills.
- Fixed-format elements should have stable dimensions.

## Agent UI Rules

- Keep the active agent/task as the visual anchor.
- Make status visible in every major layout.
- Treat logs as supporting information, not the primary page.
- Use permissions, questions, failures, and completion as different UI states.
- Do not call all user interventions “approval”.

## Required UI Plan Format

```md
Page type:
Layout:
Sections:
Components:
Responsive behavior:
States:
Primary CTA:
Design-system notes:
```
