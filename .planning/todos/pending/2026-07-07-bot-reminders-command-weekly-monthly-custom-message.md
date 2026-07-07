---
created: 2026-07-07T06:11:37.885Z
title: Bot reminders command (weekly/monthly, custom message)
area: bot
files: []
---

## Problem

Pre-Phase-6 feedback (2026-07-07): the team wants cachorabot to support scheduled reminders for meetings ("juntas") or anything else. Requirements from the user:
- Recurring schedules: weekly and monthly at minimum.
- Fully customizable message text (what cachorabot will send).

This is a bot feature — it belongs in the `nocturna-bot` repo (production bot runs on Linux host "cinema" via systemd), NOT the website repo.

## Solution

New cog in nocturna-bot: a staff command to create/list/delete reminders with a schedule (weekly/monthly, and likely one-off), target channel, and custom message. Needs persistence that survives bot restarts (e.g. JSON/SQLite on the cinema host) and a scheduler loop (discord.py `tasks` or APScheduler). Details TBD in its own phase/discussion.
