# Alibaba Cloud Model Studio setup

> Optional for Live scans. Used for **escalation** in the tiered router after
> Superlinked SIE triage (`tripwire route` / auto-route after `tripwire scan`).
> Complete [sie-setup.md](./sie-setup.md) first — SIE is required for routing;
> Model Studio is the second hop when SIE escalates.
>
> **Cost and billing:** Model Studio / DashScope calls incur Alibaba Cloud
> charges. Review billing and quotas before enabling escalation or running the
> sample CLI.

## What this enables

When SIE escalates an item, Tripwire calls Alibaba Cloud Model Studio over the
OpenAI-compatible chat API ([ADR-0016](../adr/0016-tiered-router-sie-model-studio.md)).
A sample CLI under [`prototypes/model-studio/`](../../prototypes/model-studio/README.md)
uses the same credentials for chat, image, and video experiments.

Hackathon / Singapore workspace hosts look like
`ws-….ap-southeast-1.maas.aliyuncs.com` (see `prototypes/.env.example`).

## 1. Account + region

1. Sign in to the [Alibaba Cloud Model Studio console](https://modelstudio.console.alibabacloud.com/).
2. In the upper-right corner, select the region that matches your workspace
   (Tripwire samples use **Singapore** / `ap-southeast-1`).
3. Confirm Model Studio / DashScope is activated for that region.

Official key guide:
[How to obtain an API key](https://www.alibabacloud.com/help/en/model-studio/get-api-key).

## 2. Create an API key

1. Open the **API Key** page in Model Studio.
2. Click **Create API Key**.
3. Prefer the **default workspace** with broad model permission for first setup.
4. Copy the key immediately — it is shown once. Store it as `DASHSCOPE_API_KEY`.

API keys are **region-specific**. A Singapore key will not work against a
Beijing or US endpoint.

## 3. Workspace host and base URLs

For workspace-dedicated Singapore hosts, obtain the **Workspace ID** / host from
Model Studio workspace settings (see
[Get App ID and Workspace ID](https://www.alibabacloud.com/help/en/model-studio/obtain-the-app-id-and-workspace-id)
and [Base URL by region](https://www.alibabacloud.com/help/en/model-studio/base-url)).

| Key | Role |
|-----|------|
| `DASHSCOPE_API_KEY` | Bearer token (required for router escalation + sample CLI) |
| `DASHSCOPE_HOST` | Workspace API host without scheme (e.g. `ws-….ap-southeast-1.maas.aliyuncs.com`) |
| `ALIBABA_OPENAI_BASE_URL` | OpenAI-compatible base for router + `chat` (`https://$DASHSCOPE_HOST/compatible-mode/v1`) |
| `ALIBABA_DASH_SCOPE_API_URL` | Native DashScope base for sample image/video only (`https://$DASHSCOPE_HOST/api/v1`) |
| `MODEL_STUDIO_MODEL` | Optional router model override (default `qwen3.8-max`) |

The product CLI router requires `DASHSCOPE_API_KEY` and `ALIBABA_OPENAI_BASE_URL`.
The sample CLI can derive both URLs from `DASHSCOPE_HOST` when the URL keys are blank.

Example (replace the host with yours):

```text
DASHSCOPE_HOST=ws-<workspace>.ap-southeast-1.maas.aliyuncs.com
ALIBABA_OPENAI_BASE_URL=https://ws-<workspace>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
ALIBABA_DASH_SCOPE_API_URL=https://ws-<workspace>.ap-southeast-1.maas.aliyuncs.com/api/v1
```

## 4. Wire into `.env`

Add values to the **repo-root** `.env` (the CLI loads root env):

```bash
cp .env.example .env   # if you have not already
# set DASHSCOPE_API_KEY, ALIBABA_OPENAI_BASE_URL (and optionally MODEL_STUDIO_MODEL)
```

Key reference: [env-vars.md](./env-vars.md#optional--tiered-router-sie--model-studio).

For the sample CLI only, you may also copy keys into `prototypes/.env` from
[`prototypes/.env.example`](../../prototypes/.env.example).

## 5. Verify

Smoke chat via the sample CLI:

```bash
cd prototypes/model-studio
python3 model_studio.py chat "Reply with one word: ok"
```

Or, after a completed Live scan with SIE configured:

```bash
tripwire route --batch-id <batch_id>
```

If Model Studio keys are missing, auto-route fails closed for escalation (SIE
must still be configured for routing to run). Scan results are unchanged when
auto-route warns and skips.

## Next

→ [sie-setup.md](./sie-setup.md) ·
[env-vars.md](./env-vars.md) ·
[setup-commands.md](./setup-commands.md#tiered-router-optional) ·
[QUICKSTART](../../QUICKSTART.md#live-capabilities)
