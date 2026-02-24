---
name: task-metrics
description: "Task-level efficiency analytics for OpenClaw. Tracks task completion, cost attribution, and TES (Task Efficiency Score) across models, sessions, and cron jobs."
metadata:
  {"openclaw": {"emoji": "📊", "requires": {"anyBins": []}}}
---

# Task Metrics Skill

Reframes AI usage from token-counting to task-completion economics. Instead of "how many tokens?", answer "how much to get X done, and was it worth it?"

## What It Does

- **Detects tasks** automatically from message streams (Layer 1: Task Detector)
- **Attributes costs** across sessions, sub-agents, and cron triggers (Layer 2: Task Ledger)
- **Computes TES** (Task Efficiency Score) per task, model, and cron (Layer 3: Analytics Engine)

## Commands

| Command | Description |
|---------|-------------|
| `/tasks list` | Show recent tasks with status, cost, and TES |
| `/tasks stats` | Summary statistics for a time period |
| `/tasks this-week` | This week's task summary |
| `/tasks show <task_id>` | Show task detail |
| `/tasks report --dimension model` | Model efficiency report |
| `/tasks cron-health` | Cron efficiency and health check |

## Complexity Levels

| Level | Name | Description |
|-------|------|-------------|
| L1 | Reflex | Single-turn, text-only, no tools |
| L2 | Routine | Multi-turn or 1–3 tool calls |
| L3 | Mission | Multiple tools + file I/O + external APIs |
| L4 | Campaign | Sub-agents + cron + cross-session |

## TES (Task Efficiency Score)

```
TES = quality_score / (normalized_cost × complexity_weight)
```

- **> 2.0** 🟢 Excellent
- **1.0–2.0** 🟡 Good
- **0.5–1.0** 🟠 Below average
- **< 0.5** 🔴 Poor
- **0.0** ⚫ Failed

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `db_path` | `~/.openclaw/task-metrics.db` | SQLite database location |
| `timeout.L1` | `2min` | Silent completion timeout for L1 tasks |
| `timeout.L2` | `5min` | Silent completion timeout for L2 tasks |
| `timeout.L3` | `15min` | Silent completion timeout for L3 tasks |
| `timeout.L4` | `60min` | Silent completion timeout for L4 tasks |

## Hook

Listens on `message-post` to intercept every message for task detection and cost attribution.

See [PRD.md](./PRD.md) for the full product specification.
