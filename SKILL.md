---
name: openclaw-tally
description: "Tokens tell you how much you paid. Tasks tell you what you got. Tally tracks every OpenClaw task from start to finish — cost, complexity, and efficiency score."
metadata:
  {"openclaw": {"emoji": "📊", "requires": {"anyBins": []}}}
---

# OpenClaw Tally

Reframes AI usage from token-counting to task-completion economics. Instead of "how many tokens?", answer "how much to get X done, and was it worth it?"

## Security & Privacy Declaration

- **Hook**: This skill registers a `message-post` hook and processes **every message**.
- **Local only**: All processing is purely local. No data is sent to any external server.
- **No message content**: Only reads metadata (token count, model, session_id). Does **not** read or store message text.
- **Sandboxed storage**: SQLite database is hardcoded to `~/.openclaw/tally/tally.db`. No writes outside this directory.
- **Permissions**: No network access. No exec permissions. Filesystem limited to `~/.openclaw/tally/`.

## What It Does

- **Detects tasks** automatically from message streams (Layer 1: Task Detector)
- **Attributes costs** across sessions, sub-agents, and cron triggers (Layer 2: Task Ledger)
- **Computes TES** (Task Efficiency Score) per task, model, and cron (Layer 3: Analytics Engine)

## Commands

- `/tasks list` — Show recent tasks with status, cost, and TES
- `/tasks stats` — Summary statistics for a time period
- `/tasks this-week` — This week's task summary
- `/tasks show <task_id>` — Show task detail
- `/tasks report --dimension model` — Model efficiency report
- `/tasks cron-health` — Cron efficiency and health check

## Complexity Levels

- **L1 (Reflex)**: Single-turn, text-only, no tools
- **L2 (Routine)**: Multi-turn or 1–3 tool calls
- **L3 (Mission)**: Multiple tools + file I/O + external APIs
- **L4 (Campaign)**: Sub-agents + cron + cross-session

## TES (Task Efficiency Score)

```
TES = quality_score / (normalized_cost × complexity_weight)
```

- **> 2.0** 🟢 Excellent
- **1.0–2.0** 🟡 Good
- **0.5–1.0** 🟠 Below average
- **< 0.5** 🔴 Poor
- **0.0** ⚫ Failed

## Usage

When the skill is installed, it automatically hooks into `message-post`. Use the `/tasks` commands above to query analytics. All data is stored locally in `~/.openclaw/tally/tally.db`.

See [PRD.md](./PRD.md) for the full product specification.
