# AgentCard Hardware UI Profiles

This folder contains static hardware-facing UI prototypes. Keep each physical screen class in its own HTML file so sizing decisions stay explicit.

## Strip Prototype

File: `index.html`

Canonical CSS viewport: `800 x 240`

Hard-fit guardrail: `800 x 200`

Intent: a narrow touch strip clipped to the top edge of a desktop monitor. The UI should read as one horizontal status object, not as a dashboard.

Validation URLs:

```text
http://localhost:4322/index.html?working
http://localhost:4322/index.html?approval
http://localhost:4322/index.html?question
http://localhost:4322/index.html?failed
http://localhost:4322/index.html?done
```

Rules for this profile:

- Preserve the two-zone layout: identity/status on the left, metrics or intervention on the right.
- Test every change at `800 x 240`; also check `800 x 200` for clipping.
- Keep the five scenario buttons visible for prototype work.
- Add `?clean` or `?capture` when a screenshot should hide prototype controls.
- Do not stretch this file into a tablet layout. Create or edit a separate profile instead.

## 7-Inch Touch Prototype

File: `7inch.html`

Canonical CSS viewport: `1024 x 600`

Intent: a first hardware buying/prototyping target for common 7-inch HDMI + USB capacitive touch displays. This is a small touch console, not a monitor-top strip.

Validation URLs:

```text
http://localhost:4322/7inch.html?working
http://localhost:4322/7inch.html?approval
http://localhost:4322/7inch.html?question
http://localhost:4322/7inch.html?failed
http://localhost:4322/7inch.html?done
```

Rules for this profile:

- Primary target is landscape `1024 x 600`.
- Touch targets should be at least `44px` tall.
- Keep the current agent state, user intervention, and cost/tokens visible without scrolling.
- If the purchased screen exposes a different CSS viewport, record it here before redesigning.

## Local Server

```bash
python3 -m http.server 4322 --directory /Users/zhanchidong/code/AgentCard/hardware
```

