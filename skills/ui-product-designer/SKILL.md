---
name: ui-product-designer
description: Use before coding frontend pages or components when product shape, page purpose, information architecture, user goals, states, or AgentCard / AI workspace UX requirements are ambiguous. Helps turn vague AI agent product ideas into page structure before implementation.
---

# UI Product Designer

Use this skill before writing code when the page or product shape is not fully clear.

## Required Workflow

1. Identify the page type:
   - landing page
   - dashboard
   - agent workspace
   - agent detail
   - task monitor
   - settings
   - onboarding

2. Clarify the page goal before coding:
   - What should the user understand in 5 seconds?
   - What is the primary user goal?
   - What is the one most important action?
   - What agent state or decision must be visible?

3. Output a page structure proposal before implementation:
   - primary user goal
   - core user actions
   - page sections
   - empty state
   - loading state
   - error state

## Agent Product Defaults

Assume users need to quickly understand:

- which agents exist
- what each agent is doing now
- what each agent can do
- what needs user attention
- what the next safe action is

The UI should feel controllable, trustworthy, and clear. It should not feel like a flashy AI demo.

## Hard Rules

- Do not start by writing code.
- Do not directly stack feature cards without a hierarchy.
- Do not make every section visually equal.
- Do not hide agent status behind logs.
- Do not assume this is OfferPilot or a job-search product.
- Prefer one clear primary action over many competing CTAs.

## Output Format

Before implementation, produce:

```md
Page type:
Primary user goal:
Core actions:
Sections:
Empty state:
Loading state:
Error state:
Primary CTA:
Key UI risk:
```
