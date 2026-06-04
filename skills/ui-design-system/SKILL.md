---
name: ui-design-system
description: Use before creating or changing visual styles, CSS, layout, typography, color, spacing, components, or responsive UI for AgentCard, AI workspaces, dashboards, landing pages, or productivity app surfaces.
---

# UI Design System

Use this skill to keep UI work visually consistent and restrained.

## Design Direction

- Modern AI workspace.
- Inspired by Linear, Vercel, Notion, and Stripe.
- Calm, clean, technical, trustworthy.
- Prefer product clarity over visual spectacle.

Avoid:

- cyberpunk styling
- rainbow gradients
- heavy glassmorphism
- Bootstrap-like generic components
- large purple/blue AI-gradient backgrounds
- thick shadows
- many saturated colors competing for attention

## Layout Rules

- Use an 8px spacing grid.
- Preferred page max-width: `1120px`, `1200px`, or `1280px`.
- Preferred section spacing: `48px`, `64px`, or `96px`.
- Preferred card padding: `16px`, `20px`, or `24px`.
- Avoid arbitrary values like `13px`, `17px`, `23px`, or `37px`.
- Each page should have one primary CTA.
- Status and navigation should be visible without dominating content.

## Typography

- Hero title: `48px` to `64px`.
- Page title: `32px` to `40px`.
- Section title: `24px` to `32px`.
- Card title: `16px` to `20px`.
- Body: `14px` to `16px`.
- Caption: `12px` to `14px`.
- Text hierarchy must be obvious.
- Do not make all text similar in size or weight.
- Do not use negative letter spacing.

## Color

- Use neutral colors as the base.
- Use only one primary accent color.
- Use status colors only for status:
  - green: running / success
  - yellow: waiting / pending
  - red: failed / error
  - gray: idle / disabled
- Do not use multiple high-saturation primary colors.
- Prefer white, off-white, neutral dark, or quiet dark backgrounds.

## Components

- Button height: `36px`, `40px`, or `44px`.
- Card radius: `12px` or `16px`.
- Modal radius: `16px` or `20px`.
- Input height: `40px` or `44px`.
- Use subtle borders before shadows.
- Use light shadows only when depth is needed.
- Icon sizes: `16px`, `20px`, or `24px`.
- Keep repeated cards visually scannable, not decorative.

## Agent-Specific Patterns

Agent cards should show:

- name
- short capability
- status
- last run or latest activity
- primary action

Agent workspaces should show:

- agent list or sidebar
- active agent/task area
- execution timeline or log
- user control area

Agent status should be visible but quiet. Logs should be readable and scannable. Empty states should guide the user to create, connect, or run an agent.

## Review Checklist

Before finishing visual work, check:

- Is the main action obvious?
- Is the current agent status obvious?
- Are spacing values on the 8px grid?
- Is there only one primary accent?
- Are cards using consistent padding and radius?
- Does the page avoid generic admin-template energy?
