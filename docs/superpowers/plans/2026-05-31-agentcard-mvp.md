# AgentCard MVP Implementation Plan

> 状态：已废弃。本文档记录的是早期 AgentCard dashboard 原型方向。当前产品方向是 AgentCard：面向 CLI AI coding agent 的副屏状态岛。后续工作以 `README.md`、`docs/product-requirements.md` 和 `docs/roadmap.md` 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first runnable AgentCard web app prototype that presents AI coding agents as a visual dashboard with status, permissions, queue, logs, and project context.

**Architecture:** Use a Vite React TypeScript app with static mock data and one tested dashboard summary helper. Keep the MVP local-first and UI-only so the product shape can be evaluated before adding real agent integrations.

**Tech Stack:** Vite, React, TypeScript, Vitest, lucide-react, CSS modules via a single global stylesheet.

---

### Task 1: Scaffold Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`

- [x] **Step 1:** Create the Vite React TypeScript shell and scripts.
- [x] **Step 2:** Add Vitest config for data-layer tests.

### Task 2: Dashboard Data Contract

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/agentDashboard.test.ts`
- Create: `src/lib/agentDashboard.ts`

- [x] **Step 1:** Write tests for summary counts, queue selection, progress average, and permission risk.
- [x] **Step 2:** Run tests and verify they fail because `agentDashboard.ts` is missing.
- [x] **Step 3:** Implement `summarizeDockState`.
- [x] **Step 4:** Run tests and verify they pass.

### Task 3: Product UI

**Files:**
- Create: `src/data/mockDock.ts`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`

- [x] **Step 1:** Add mock agents, permission requests, queue items, projects, and logs.
- [x] **Step 2:** Build a responsive dashboard with agent cards, permission inbox, task queue, log stream, and project rail.
- [x] **Step 3:** Apply a restrained multi-accent visual system with stable panel dimensions and no nested cards.

### Task 4: Target Project Setup

**Files:**
- Create target directory: `/Users/zhanchidong/code/AgentCard`

- [x] **Step 1:** Copy verified project files to `/Users/zhanchidong/code/AgentCard`.
- [x] **Step 2:** Install dependencies.
- [x] **Step 3:** Run `npm test` and `npm run build`.
- [x] **Step 4:** Initialize a fresh git repository in the target project.
- [x] **Step 5:** Start the dev server and report the local URL.
