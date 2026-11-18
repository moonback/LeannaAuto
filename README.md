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
npm run dev -- start researcher
npm run dev -- status researcher
npm run dev -- logs researcher --follow
```

`init` writes the genesis mission. `start` runs a foreground loop. Stop with Ctrl+C.
The Docker executor creates isolated containers and limits CPU/memory/PIDs. The constitution blocks a small set of risky commands and tool access; this is a prototype policy, not a guarantee of safety. Never expose it to untrusted users without further hardening.

## CLI
- `init --name NAME --goal GOAL`
- `start ID`
- `stop ID` (records stopped status; does not signal another foreground process yet)
- `status ID`
- `resources ID`
- `logs ID --follow`
- `identity ID`
- `spawn ID --goal GOAL` (creates a child manifest; child must be separately started)

## Safety
Use a dedicated host, Docker isolation, restricted outbound networking and provider-side API limits. Agents cannot modify constitution, host supervisor or resource policy. This project is an early MVP.
