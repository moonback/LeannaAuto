# LeannaAuto

Autonomous agents ("automatons") with persistent missions, Linux sandbox execution, a constitution, resource supervision, self-improvement proposals and bounded replication. No wallets, money or blockchain.

## Requirements
- Node.js 20+
- Docker installed and accessible (shell tool runs in a container)
- An OpenRouter API key and model ID

## Quickstart
```bash
cp .env.example .env
# Set OPENROUTER_API_KEY and OPENROUTER_MODEL
npm install
npm run dev -- init --name Researcher --goal "Build a useful open-source tool"
npm run dev -- start researcher-XXXXXXXX # replace with generated id
npm run dev -- status researcher-XXXXXXXX
npm run dev -- logs researcher-XXXXXXXX --follow
```

`init` writes the genesis mission. `start` runs a foreground loop. Stop with Ctrl+C or the stop command.
The Docker executor creates isolated containers with CPU, memory and PID limits and disables networking by default. The constitution has a simple command gate; it is not a safety guarantee. The MVP is not production-ready.

## CLI
- `init --name NAME --goal GOAL`
- `start ID`
- `stop ID`
- `status ID`
- `resources ID`\n- `usage [ID]` (token totals and global quota)
- `logs ID --follow`
- `identity ID`
- `spawn ID --goal GOAL` (creates a child manifest; child must be separately started)

## Limitations
- Agent loops run in the foreground. `supervise` is a foreground watchdog for agents marked running; it can start loops and log heartbeat staleness, but is not yet a process-level kill/recovery mechanism.
- Tool calling uses a simple text protocol, not structured native tool calls.
- Identity currently exposes a fingerprint; private key signing and key custody are not implemented.
- Replication creates a child record only; resource budgeting/automatic spawning is not implemented.
- Self-modification is not yet implemented.
- Network access is disabled inside the sandbox; no web/API tools yet.
- Constitution checks are basic heuristics. This is a prototype and should not be run on a machine with sensitive data.
- Docker socket access, if used for host orchestration, is effectively a powerful host permission. Keep the host dedicated and never expose the socket to the agent container.


## Persistent task tracking
Tasks can be stored and tracked separately from the agent loop:
```bash
npm run dev -- task add AGENT_ID --title "Investigate issue" --description "Write findings to workspace"
npm run dev -- task list AGENT_ID
npm run dev -- task set TASK_ID active
npm run dev -- task set TASK_ID completed
```
Task state is stored in SQLite (pending, active, completed, failed). This CLI tracking is not yet automatically consumed by the agent planner.

## OpenRouter
Configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env`. The default endpoint is `https://openrouter.ai/api/v1`. Optional attribution headers are configured with `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME`.

## Inference budget\n\n`INFERENCE_QUOTA` is a global token ceiling. OpenRouter-reported `usage.total_tokens` is persisted to SQLite per agent. Calls are blocked when the recorded total reaches the ceiling. Use `npm run dev -- usage` for global totals or append an agent ID for per-agent usage. Models/providers that omit usage fields may be undercounted.\n\n## Supervisor
```bash
npm run dev -- supervise --interval 10 --stale 90
```
The watchdog starts loops for database agents marked `running`, records heartbeat timestamps, and logs stale heartbeat detections. For production process-level recovery, run it under systemd, Docker restart policy, or another external process manager; a hung loop is not yet force-killed/replaced by this MVP.


## Dashboard authentication
The local dashboard binds to `127.0.0.1`. Before starting it, set `LEANNAAUTO_UI_TOKEN` in `.env` to a long, unique random secret. The dashboard login accepts `LEANNAAUTO_UI_TOKEN` (admin) or the optional `LEANNAAUTO_UI_OPERATOR_TOKEN` (restricted operator). Admins can use every dashboard action. Operators can view agents, tasks, logs, quota and audit history, start/stop agents, and create tasks; agent creation and other privileged actions are admin-only. The browser keeps the token in session storage for the current tab session. Use two different long random secrets. Do not expose the dashboard port publicly or reuse these tokens elsewhere.

Generate a token with Node.js:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```
