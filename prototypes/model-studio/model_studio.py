#!/usr/bin/env python3
"""Sample CLI for Alibaba Cloud Model Studio (Singapore dedicated workspace)."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
PROTOTYPES_DIR = HERE.parent
CATALOG_PATH = HERE / "models.json"
ENV_EXAMPLE_PATH = PROTOTYPES_DIR / ".env.example"
ENV_PATH = PROTOTYPES_DIR / ".env"
DEFAULT_HOST = "ws-217y1bpliyzcf5nl.ap-southeast-1.maas.aliyuncs.com"
POLL_INTERVAL_S = 5
POLL_TIMEOUT_S = 600
TERMINAL = {"SUCCEEDED", "FAILED", "CANCELED", "UNKNOWN"}


def load_dotenv(path: Path, *, override: bool) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if not key or not value:
            continue
        if override or key not in os.environ:
            os.environ[key] = value


def load_env_files() -> None:
    load_dotenv(ENV_EXAMPLE_PATH, override=False)
    load_dotenv(ENV_PATH, override=True)
    load_dotenv(Path.cwd() / ".env", override=True)


def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def strip_slash(url: str) -> str:
    return url.rstrip("/")


def settings_from_env(catalog: dict[str, Any], *, require_key: bool) -> dict[str, str]:
    host = env("DASHSCOPE_HOST", catalog.get("host", DEFAULT_HOST))
    openai = env("ALIBABA_OPENAI_BASE_URL") or f"https://{host}{catalog['openai_base']}"
    dashscope = env("ALIBABA_DASH_SCOPE_API_URL") or f"https://{host}{catalog['dashscope_base']}"
    key = env("DASHSCOPE_API_KEY")
    if require_key and not key:
        raise SystemExit(
            "Set DASHSCOPE_API_KEY in prototypes/.env "
            "(copy prototypes/.env.example) or export it in the shell"
        )
    return {
        "api_key": key,
        "host": host,
        "openai_base_url": strip_slash(openai),
        "dashscope_base_url": strip_slash(dashscope),
    }


def infer_kind(model_id: str) -> str:
    name = model_id.lower()
    if any(token in name for token in ("embedding", "rerank")):
        return "embed"
    if any(token in name for token in ("asr", "tts", "audio", "livetranslate", "speech", "omni")):
        return "audio"
    if "image" in name:
        return "image"
    if any(token in name for token in ("t2v", "i2v", "r2v", "video", "happyhorse", "animate", "kf2v", "vace")):
        return "video-edit" if "edit" in name else "video"
    if "-vl" in name or "vl-" in name or name.endswith("-vl"):
        return "vision"
    return "chat"


def infer_spec(model_id: str) -> dict[str, Any]:
    kind = infer_kind(model_id)
    spec: dict[str, Any] = {"title": model_id, "kind": kind, "model": model_id}
    if kind in {"chat", "vision", "audio"}:
        spec["mode"] = "openai"
    elif kind == "embed":
        spec["mode"] = "openai"
        spec["path"] = "/embeddings"
    elif kind == "image":
        spec["mode"] = "sync"
        spec["path"] = "/services/aigc/multimodal-generation/generation"
    else:
        spec["mode"] = "async"
        spec["path"] = "/services/aigc/video-generation/video-synthesis"
    return spec


def resolve_model(catalog: dict[str, Any], name: str) -> tuple[str, dict[str, Any]]:
    models: dict[str, Any] = catalog["models"]
    if name in models:
        return name, models[name]
    lowered = name.lower()
    for key, spec in models.items():
        ids = [key, spec["model"], *spec.get("aliases", [])]
        if lowered in {item.lower() for item in ids}:
            return key, spec
    known_ids = {item.lower() for item in catalog.get("all_ids", [])}
    if lowered in known_ids:
        return name, infer_spec(name)
    known = ", ".join(sorted(models))
    raise SystemExit(f"Unknown model {name!r}. Known aliases: {known}. Use list --all for IDs.")


def settings_of(catalog: dict[str, Any]) -> dict[str, str]:
    return catalog["settings"]


def http_json(
    method: str,
    url: str,
    *,
    api_key: str,
    body: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
    timeout: int = 120,
) -> dict[str, Any]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(brief_http_error(exc.code, detail)) from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Request failed: {exc.reason}") from exc
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Non-JSON response from {url}: {raw[:400]}") from exc
    if not isinstance(parsed, dict):
        raise SystemExit(f"Unexpected JSON from {url}: {raw[:400]}")
    return parsed


def to_media_url(value: str) -> str:
    if value.startswith(("http://", "https://", "data:")):
        return value
    path = Path(value).expanduser()
    if not path.is_file():
        raise SystemExit(f"Media path not found: {value}")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def collect_urls(node: Any, found: list[str] | None = None) -> list[str]:
    urls = found if found is not None else []
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"url", "video_url", "image", "orig_url"} and isinstance(value, str):
                if value.startswith("http"):
                    urls.append(value)
            else:
                collect_urls(value, urls)
    elif isinstance(node, list):
        for item in node:
            collect_urls(item, urls)
    return urls


def unique_urls(payload: dict[str, Any]) -> list[str]:
    return list(dict.fromkeys(collect_urls(payload)))


def brief_http_error(status: int, detail: str) -> str:
    try:
        payload = json.loads(detail)
    except json.JSONDecodeError:
        return f"HTTP {status}  {detail[:200]}"
    if not isinstance(payload, dict):
        return f"HTTP {status}  {detail[:200]}"
    code, message = dashscope_error(payload)
    parts = [f"HTTP {status}"]
    if code:
        parts.append(code)
    if message:
        parts.append(message)
    if len(parts) == 1:
        parts.append(detail[:200])
    return "  ".join(parts)


def dashscope_error(payload: dict[str, Any]) -> tuple[str, str]:
    error = payload.get("error")
    if isinstance(error, dict):
        return str(error.get("code") or ""), str(error.get("message") or "")
    return str(payload.get("code") or ""), str(payload.get("message") or "")


def chat_text(payload: dict[str, Any]) -> str:
    try:
        return str(payload["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError):
        return ""


def chat_usage(payload: dict[str, Any]) -> str:
    usage = payload.get("usage") or {}
    prompt = usage.get("prompt_tokens")
    completion = usage.get("completion_tokens")
    if prompt is None or completion is None:
        return ""
    total = usage.get("total_tokens", prompt + completion)
    return f"{prompt} in / {completion} out / {total} total"


LABEL_WIDTH = 6


def print_fields(fields: dict[str, str]) -> None:
    for key, value in fields.items():
        if not value:
            continue
        print(f"{key.ljust(LABEL_WIDTH)}  {value}")


def print_brief(
    payload: dict[str, Any],
    *,
    model: str = "",
    no_wait: bool = False,
) -> None:
    output = payload.get("output") or {}
    status = str(output.get("task_status") or "")
    task_id = str(output.get("task_id") or "")
    code, message = dashscope_error(payload)
    text = chat_text(payload)
    urls = unique_urls(payload)
    print_fields(
        {
            "model": model or str(payload.get("model") or output.get("model") or ""),
            "status": status,
            "task": task_id,
            "error": code,
            "detail": message,
            "usage": chat_usage(payload),
        }
    )
    for url in urls:
        print_fields({"url": url})
    if no_wait and task_id:
        script = Path(sys.argv[0]).name
        if script in {"", "-"}:
            script = "model_studio.py"
        print_fields({"next": f"python3 {script} poll {task_id}"})
        return
    if text:
        print()
        print(text)
        return
    if not any((status, task_id, code, message, urls)):
        print("No result in response. Re-run with --json.")


def download_urls(urls: list[str], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for index, url in enumerate(dict.fromkeys(urls), start=1):
        parsed = urlparse(url)
        suffix = Path(parsed.path).suffix or ".bin"
        dest = out_dir / f"result-{index}{suffix}"
        urllib.request.urlretrieve(url, dest)
        print_fields({"saved": str(dest)})


def call_api(
    catalog: dict[str, Any],
    method: str,
    url: str,
    **kwargs: Any,
) -> dict[str, Any]:
    return http_json(method, url, api_key=settings_of(catalog)["api_key"], **kwargs)


def poll_task(catalog: dict[str, Any], task_id: str, *, timeout: int) -> dict[str, Any]:
    url = f"{settings_of(catalog)['dashscope_base_url']}/tasks/{task_id}"
    deadline = time.monotonic() + timeout
    last: dict[str, Any] = {}
    seen = ""
    while time.monotonic() < deadline:
        last = call_api(catalog, "GET", url, timeout=60)
        status = str(last.get("output", {}).get("task_status", "UNKNOWN"))
        if status != seen:
            print(status, file=sys.stderr)
            seen = status
        if status in TERMINAL:
            if status != "SUCCEEDED":
                print_brief(last)
                raise SystemExit(1)
            return last
        time.sleep(POLL_INTERVAL_S)
    raise SystemExit(f"Timed out after {timeout}s waiting for {task_id}")


def maybe_poll(catalog: dict[str, Any], payload: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    output = payload.get("output") or {}
    task_id = output.get("task_id")
    status = output.get("task_status")
    if not task_id or status in {None, "SUCCEEDED"}:
        return payload
    if args.no_wait:
        return payload
    return poll_task(catalog, task_id, timeout=args.timeout)


def finish(payload: dict[str, Any], args: argparse.Namespace) -> None:
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print_brief(
            payload,
            model=getattr(args, "resolved_model", ""),
            no_wait=args.no_wait,
        )
    if args.download:
        urls = unique_urls(payload)
        if not urls:
            raise SystemExit("No downloadable URL in the response")
        download_urls(urls, Path(args.out))


def cmd_list(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    cfg = settings_of(catalog)
    print_fields(
        {
            "host": cfg["host"],
            "openai": cfg["openai_base_url"],
            "dash": cfg["dashscope_base_url"],
        }
    )
    counts = catalog.get("counts") or {}
    if counts:
        summary = "  ".join(f"{kind} {count}" for kind, count in counts.items())
        print_fields({"ids": f"{len(catalog.get('all_ids', []))} ({summary})"})
    print()
    featured = catalog.get("featured") or list(catalog["models"])
    for key in featured:
        spec = catalog["models"].get(key)
        if spec is None:
            continue
        print(f"{spec['kind']:10}  {key:18}  {spec['model']}")
    if not getattr(args, "all", False):
        print("\nUse list --all for every workspace model ID.")
        return
    print()
    grouped: dict[str, list[str]] = {}
    for model_id in catalog.get("all_ids", []):
        grouped.setdefault(infer_kind(model_id), []).append(model_id)
    for kind, ids in grouped.items():
        print(f"\n{kind} ({len(ids)})")
        for model_id in ids:
            print(f"  {model_id}")


def cmd_chat(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    model_name = args.model or catalog["chat_default"]
    _, spec = resolve_model(catalog, model_name)
    if spec["kind"] not in {"chat", "vision", "audio"}:
        raise SystemExit(f"{model_name} is a {spec['kind']} model; use the matching subcommand")
    url = f"{settings_of(catalog)['openai_base_url']}/chat/completions"
    body = {
        "model": spec["model"],
        "messages": [
            {"role": "system", "content": args.system},
            {"role": "user", "content": args.prompt},
        ],
    }
    payload = call_api(catalog, "POST", url, body=body, timeout=args.timeout)
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    print_brief(payload, model=spec["model"])


def image_body(spec: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    content: list[dict[str, str]] = [{"image": to_media_url(item)} for item in args.image]
    content.append({"text": args.prompt})
    parameters: dict[str, Any] = {"watermark": False, "n": args.n}
    if spec["model"].startswith("qwen-image"):
        parameters["prompt_extend"] = True
        if args.size:
            parameters["size"] = args.size
    else:
        parameters["size"] = args.size or "2K"
        parameters["thinking_mode"] = True
    return {
        "model": spec["model"],
        "input": {"messages": [{"role": "user", "content": content}]},
        "parameters": parameters,
    }


def cmd_image(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    _, spec = resolve_model(catalog, args.model)
    if spec["kind"] != "image":
        raise SystemExit(f"{args.model} is not an image model")
    args.resolved_model = spec["model"]
    url = f"{settings_of(catalog)['dashscope_base_url']}{spec['path']}"
    payload = call_api(catalog, "POST", url, body=image_body(spec, args), timeout=args.timeout)
    finish(maybe_poll(catalog, payload, args), args)


def pick_video_spec(catalog: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    if args.model:
        _, spec = resolve_model(catalog, args.model)
        return spec
    count = len(args.image)
    key = "hh-t2v" if count == 0 else "hh-i2v" if count == 1 else "hh-r2v"
    return catalog["models"][key]


def video_body(spec: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    kind = spec["kind"]
    media: list[dict[str, str]] = []
    if kind == "video-edit":
        if not args.video:
            raise SystemExit("video-edit requires --video")
        media.append({"type": "video", "url": to_media_url(args.video)})
        media.extend({"type": "reference_image", "url": to_media_url(item)} for item in args.image)
    elif spec["model"].endswith("-i2v"):
        if len(args.image) != 1:
            raise SystemExit("I2V needs exactly one --image")
        media.append({"type": "first_frame", "url": to_media_url(args.image[0])})
    elif spec["model"].endswith("-r2v"):
        if not args.image:
            raise SystemExit("R2V needs at least one --image")
        media.extend({"type": "reference_image", "url": to_media_url(item)} for item in args.image)

    parameters: dict[str, Any] = {"resolution": args.resolution, "watermark": False}
    if kind != "video-edit" and not spec["model"].endswith("-i2v"):
        parameters["ratio"] = args.ratio
        parameters["duration"] = args.duration
    elif spec["model"].endswith("-i2v"):
        parameters["duration"] = args.duration

    body: dict[str, Any] = {
        "model": spec["model"],
        "input": {"prompt": args.prompt},
        "parameters": parameters,
    }
    if media:
        body["input"]["media"] = media
    return body


def cmd_video(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    spec = pick_video_spec(catalog, args)
    if spec["kind"] not in {"video", "video-edit"}:
        raise SystemExit(f"{spec['model']} is not a video model")
    args.resolved_model = spec["model"]
    url = f"{settings_of(catalog)['dashscope_base_url']}{spec['path']}"
    headers = {"X-DashScope-Async": "enable"}
    payload = call_api(
        catalog, "POST", url, body=video_body(spec, args), extra_headers=headers, timeout=60
    )
    finish(maybe_poll(catalog, payload, args), args)


def cmd_poll(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    finish(poll_task(catalog, args.task_id, timeout=args.timeout), args)


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--json", action="store_true", help="Print the raw JSON response")
    parser.add_argument("--download", action="store_true", help="Save result URLs to --out")
    parser.add_argument("--out", default=str(HERE / "out"), help="Download directory")
    parser.add_argument("--no-wait", action="store_true", help="Do not poll async tasks")
    parser.add_argument("--timeout", type=int, default=POLL_TIMEOUT_S, help="Seconds to wait")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Call Alibaba Cloud Model Studio from the CLI.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Copy prototypes/.env.example → prototypes/.env and set DASHSCOPE_API_KEY (never commit it).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    list_p = sub.add_parser("list", help="Show catalog models and endpoints")
    list_p.add_argument("--all", action="store_true", help="Print every workspace model ID")
    list_p.set_defaults(func=cmd_list)

    chat_p = sub.add_parser("chat", help="OpenAI-compatible chat completion")
    chat_p.add_argument("prompt")
    chat_p.add_argument("--model", default=None)
    chat_p.add_argument("--system", default="You are a helpful assistant.")
    add_common(chat_p)
    chat_p.set_defaults(func=cmd_chat)

    image_p = sub.add_parser("image", help="Generate or edit an image")
    image_p.add_argument("prompt")
    image_p.add_argument("--model", default="qwen-image")
    image_p.add_argument("--image", action="append", default=[], help="Reference image URL or file")
    image_p.add_argument("--size", default=None, help='e.g. "2K" or "1024*1024"')
    image_p.add_argument("-n", type=int, default=1)
    add_common(image_p)
    image_p.set_defaults(func=cmd_image)

    video_p = sub.add_parser("video", help="Text / image / reference to video")
    video_p.add_argument("prompt")
    video_p.add_argument("--model", default=None, help="Default: inferred from --image count")
    video_p.add_argument("--image", action="append", default=[], help="Reference image URL or file")
    video_p.add_argument("--resolution", default="720P")
    video_p.add_argument("--ratio", default="16:9")
    video_p.add_argument("--duration", type=int, default=5)
    add_common(video_p)
    video_p.set_defaults(func=cmd_video)

    edit_p = sub.add_parser("video-edit", help="Edit an existing video")
    edit_p.add_argument("prompt")
    edit_p.add_argument("--video", required=True, help="Source video URL or file")
    edit_p.add_argument("--image", action="append", default=[], help="Optional reference image")
    edit_p.add_argument("--model", default="hh-edit")
    edit_p.add_argument("--resolution", default="720P")
    edit_p.add_argument("--ratio", default="16:9")
    edit_p.add_argument("--duration", type=int, default=5)
    add_common(edit_p)
    edit_p.set_defaults(func=cmd_video)

    poll_p = sub.add_parser("poll", help="Poll an existing async task_id")
    poll_p.add_argument("task_id")
    add_common(poll_p)
    poll_p.set_defaults(func=cmd_poll)
    return parser


def main(argv: list[str] | None = None) -> None:
    load_env_files()
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "model", None):
        env_model = env("MODEL_STUDIO_MODEL")
        if env_model:
            args.model = env_model
    catalog = load_catalog()
    catalog["settings"] = settings_from_env(catalog, require_key=args.command != "list")
    args.func(catalog, args)


if __name__ == "__main__":
    main()
