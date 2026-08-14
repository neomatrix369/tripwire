# SIE sample CLI

Hackathon sample for Superlinked's managed Inference Engine (SIE).
Talks to the Qwen lineup on the cloud cluster: embeddings, rerankers, and generation.

Not part of the shipped Tripwire product UI. The product CLI uses `SIE_ENDPOINT`
and `SIE_API_KEY` (optional `SIE_MODEL`) for post-scan triage
(`tripwire route`). Account setup:
[sie-setup.md](../../docs/user-guide/sie-setup.md). Key map:
[env-vars.md](../../docs/user-guide/env-vars.md#optional--tiered-router-sie--model-studio).

## Setup

```bash
cp prototypes/.env.example prototypes/.env   # then set SIE_API_KEY; do not commit .env
```

| Variable | Role |
|---|---|
| `SIE_ENDPOINT` | Managed API base (`https://api.superlinked.com` for us-east-2; EU: `https://eu.api.superlinked.com`) |
| `SIE_API_KEY` | Bearer token from [console.superlinked.com](https://console.superlinked.com) Keys page (`sk-sie-…`) |
| `SIE_MODEL` | Optional default for product `tripwire route` (sample CLI takes `--model` per command) |

Auth header: `Authorization: Bearer $SIE_API_KEY`.

Python 3.12+, stdlib only. No extra packages.

## Commands

```bash
cd prototypes/sie-studio

python3 sie_studio.py list
python3 sie_studio.py list -v

# Live catalog from the cluster
python3 sie_studio.py models

# Dense embeddings (SIE-native /v1/encode by default)
python3 sie_studio.py encode "hello, agents"
python3 sie_studio.py encode "hello" "agents" --model embed-4b
python3 sie_studio.py encode "hello, agents" --openai   # POST /v1/embeddings

# Rerank
python3 sie_studio.py score "security scan findings" \
  "SQL injection in login" "typo in README" "hardcoded API key"
python3 sie_studio.py score "query" "doc a" "doc b" --model rerank-4b --openai

# Generation — iterate on 4B, demo on 27B
python3 sie_studio.py generate "Summarise Tripwire in one sentence"
python3 sie_studio.py generate "Who are you?" --model gen-4b
python3 sie_studio.py generate "Who are you?" --model gen-27b
python3 sie_studio.py generate "Who are you?" --native   # POST /v1/generate/{model}
```

Aliases (`embed-4b`, `gen-4b`, …) resolve via `models.json`. Full Hugging Face ids also work, e.g. `Qwen/Qwen3-Embedding-4B`.

Native path routes (`--native`, default `encode` / `score`) rewrite `org/model` → `org__model` automatically (SIE-safe IDs).

`--json` prints the raw API response.

## Tip on credits

`Qwen/Qwen3.6-27B` is roughly an order of magnitude more expensive than `Qwen/Qwen3.5-4B`. Iterate on `gen-4b`, switch to `gen-27b` for demo-quality answers.

## Docs

- Cloud quickstart: https://superlinked.com/cloud/quickstart
- API reference: https://superlinked.com/docs/reference/api
- Model catalog: https://superlinked.com/models
