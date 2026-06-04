---
name: ui-reviewer
description: Use after implementing or changing frontend UI, CSS, layout, pages, components, responsive behavior, or interaction states. Scores polish and catches visual hierarchy, spacing, typography, color, consistency, agent clarity, accessibility, and responsive issues before completion.
---

# UI Reviewer

Use this skill after implementing UI changes and before marking the task complete.

## Review Rubric

Score the UI from 0 to 100 across:

1. Visual hierarchy
2. Spacing consistency
3. Typography clarity
4. Color discipline
5. Component consistency
6. Agent-product clarity
7. Empty/loading/error states
8. Responsive layout
9. Accessibility
10. Overall polish

## Rules

- If the score is below 80, do not mark the UI task complete unless the user explicitly allows it.
- List the top 5 UI problems.
- Fix the highest-impact problems.
- Re-review after fixes.
- Use browser screenshots or DOM inspection for meaningful frontend changes when possible.

## Specific Problems To Catch

- Too many cards with the same visual weight.
- Too many primary buttons.
- Random gradients.
- Inconsistent border radius.
- Inconsistent spacing.
- Text that is too small, dense, or low contrast.
- No clear next action.
- Agent status unclear.
- Dashboard feels like a generic admin template.
- Landing page feels generic.
- Logs dominate the main product state.
- Empty states do not guide the user.

## Final Response Requirements

Include:

- score
- main improvements made
- remaining tradeoffs

Keep the response concise and honest. Do not claim polish without checking the rendered UI.
