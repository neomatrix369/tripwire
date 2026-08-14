# Superlinked SIE setup

> Optional for Live scans. Required for post-scan tiered routing
> (`tripwire route` / auto-route after `tripwire scan`).
> Complete [supabase-setup](./supabase-setup.md) and [modal-setup](./modal-setup.md)
> first if you want scan results before enabling the router.
>
> **Cost and billing:** managed SIE inference consumes Superlinked credits.
> Review quotas before enabling routing or running the sample CLI.

## What this enables

Superlinked’s managed Inference Engine (SIE) is the first hop of Tripwire’s
tiered router ([ADR-0016](../adr/0016-tiered-router-sie-model-studio.md)): it
triages scanner findings per item. Escalation to Alibaba Cloud Model Studio
happens only when SIE signals conflict, unusual status, or low confidence.

A sample CLI under [`prototypes/sie-studio/`](../../prototypes/sie-studio/README.md)
uses the same credentials for encode / score / generate experiments.

## 1. Account

1. Sign in at [console.superlinked.com](https://console.superlinked.com).
2. Create or select an organization with managed SIE access.
3. Open the **Keys** page.

## 2. Copy API values

| Key | Where | Used for |
|-----|-------|----------|
| `SIE_API_KEY` | Console → Keys (`sk-sie-…`) | `tripwire route` + sample CLI |
| `SIE_ENDPOINT` | Region endpoint (see below) | API base URL |
| `SIE_MODEL` | Optional; default `gen-4b` | Router generation model override |

Regional endpoints:

```text
# us-east-2 (default in .env.example)
https://api.superlinked.com

# EU
https://eu.api.superlinked.com
```

Auth header used by Tripwire: `Authorization: Bearer $SIE_API_KEY`.

## 3. Wire into `.env`

After you have the values, add them to the **repo-root** `.env` (the CLI loads
root env, not `prototypes/.env`):

```bash
cp .env.example .env   # if you have not already
# set SIE_ENDPOINT, SIE_API_KEY; optionally SIE_MODEL
```

Key reference: [env-vars.md](./env-vars.md#optional--tiered-router-sie--model-studio).

For the sample CLI only, you may also copy the same keys into
`prototypes/.env` from [`prototypes/.env.example`](../../prototypes/.env.example).

## 4. Verify

Smoke the sample CLI (stdlib Python only):

```bash
cd prototypes/sie-studio
python3 sie_studio.py list
python3 sie_studio.py generate "Reply with one word: ok" --model gen-4b
```

Or, after a completed Live scan batch:

```bash
tripwire route --batch-id <batch_id>
```

Missing `SIE_ENDPOINT` / `SIE_API_KEY` causes auto-route to warn and skip; the
scan itself still succeeds.

## Next

→ [model-studio-setup.md](./model-studio-setup.md) (optional escalation) ·
[env-vars.md](./env-vars.md) ·
[setup-commands.md](./setup-commands.md#tiered-router-optional) ·
[QUICKSTART](../../QUICKSTART.md#live-capabilities)
