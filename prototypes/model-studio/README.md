# Model Studio sample CLI

Hackathon sample for the Alibaba Cloud Model Studio Singapore workspace.
Calls the dedicated host over both the OpenAI-compatible chat API and the
native DashScope image/video APIs from the Visual Model Catalog.

Not part of the shipped Tripwire product UI. The product CLI uses the same
DashScope / OpenAI-compatible credentials for optional post-scan escalation
(`tripwire route`). Account setup:
[tiered-router-setup.md](../../docs/user-guide/tiered-router-setup.md). Key map:
[env-vars.md](../../docs/user-guide/env-vars.md#optional--tiered-router-sie--model-studio).

## Setup

```bash
cp prototypes/.env.example prototypes/.env   # then set DASHSCOPE_API_KEY; do not commit .env
```

| Variable | Role |
|---|---|
| `DASHSCOPE_API_KEY` | Bearer token (required) |
| `DASHSCOPE_HOST` | Workspace API host; used to generate the two URLs below if they are blank |
| `ALIBABA_OPENAI_BASE_URL` | OpenAI-compatible base (`…/compatible-mode/v1`) for `chat` |
| `ALIBABA_DASH_SCOPE_API_URL` | DashScope base (`…/api/v1`) for `image`, `video`, `video-edit`, `poll` |
| `MODEL_STUDIO_MODEL` | Optional default for product `tripwire route` (sample CLI takes `--model` per command) |

Python 3.12+, stdlib only. No extra packages.

## Commands

```bash
cd prototypes/model-studio

python3 model_studio.py list
python3 model_studio.py list --all

# OpenAI-compatible chat (also works with vision IDs such as qwen3-vl-plus)
python3 model_studio.py chat "Who are you?"
python3 model_studio.py chat "Summarise this in one sentence" --model qwen3.8-max

# Image (Qwen-Image-3.0-pro by default)
python3 model_studio.py image "A flower shop with exquisite windows and a wooden door"
python3 model_studio.py image "Spray-paint the graffiti from image 2 onto the car" \
  --model wan-image \
  --image https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp \
  --image https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp

# Video — model is inferred from how many --image flags you pass
python3 model_studio.py video "A miniature cardboard city comes to life at night"
python3 model_studio.py video "A cat running on the grass" \
  --image https://cdn.translate.alibaba.com/r/wanx-demo-1.png
python3 model_studio.py video "The woman from [Image 1] unfolds the fan from [Image 2]" \
  --image https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/mvzfud/hh-v2v-girl.jpg \
  --image https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/fvuihk/hh-v2v2-folding-fan.jpg

# Video edit (needs a public video URL)
python3 model_studio.py video-edit "Make the sky a deep sunset" \
  --video https://example.com/clip.mp4

# Re-query an async task
python3 model_studio.py poll TASK_ID
```

`--image` / `--video` accept a public URL or a local file (sent as a data URI).
`--download` saves result URLs into `--out` (default `./out`).
`--no-wait` prints the `task_id` and exits instead of polling.
`--json` prints the raw API response. Default output is a short labeled summary
(model, status, task, url, or chat text).

Video jobs are async and typically take 1–5 minutes. Result URLs expire in about 24 hours.
