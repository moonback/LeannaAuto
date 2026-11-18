# LeannaAuto

Autonomous agents ("automatons") with persistent missions, Linux sandbox execution, a constitution, resource supervision, self-improvement proposals and bounded replication. No wallets, money or blockchain.

## Requirements
- Node.js 20+
- Docker installed and accessible (shell tool runs in a container)
- An OpenAI-compatible inference endpoint (OpenAI, local Ollama with compatibility, etc.)

## Quickstart
```bash
cp .env.example .env
# Set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL
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
- `resources ID`
- `logs ID --follow`
- `identity ID`
- `spawn ID --goal GOAL` (creates a child manifest; child must be separately started)

## Limitations
- The agent runs in the foreground; no service manager or restart daemon yet.
- Tool calling uses a simple text protocol, not structured native tool calls.
- Identity currently exposes a fingerprint; private key signing and key custody are not implemented.
- Replication creates a child record only; resource budgeting/automatic spawning is not implemented.
- Self-modification is not yet implemented.
- Network access is disabled inside the sandbox; no web/API tools yet.
- Constitution checks are basic heuristics. This is a prototype and should not be run on a machine with sensitive data.
- Docker socket access, if used for host orchestration, is effectively a powerful host permission. Keep the host dedicated and never expose the socket to the agent container.

