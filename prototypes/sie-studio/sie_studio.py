#!/usr/bin/env python3
"""Sample CLI for Superlinked SIE (managed cloud, Qwen lineup)."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
PROTOTYPES_DIR = HERE.parent
CATALOG_PATH = HERE / "models.json"
ENV_EXAMPLE_PATH = PROTOTYPES_DIR / ".env.example"
ENV_PATH = PROTOTYPES_DIR / ".env"
DEFAULT_ENDPOINT = "https://api.superlinked.com"
LABEL_WIDTH = 8


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
    endpoint = env("SIE_ENDPOINT") or catalog.get("endpoint_default", DEFAULT_ENDPOINT)
    key = env("SIE_API_KEY")
    if require_key and not key:
        raise SystemExit(
            "Set SIE_API_KEY in prototypes/.env "
            "(copy prototypes/.env.example) or export it in the shell"
        )
    return {
        "api_key": key,
        "endpoint": strip_slash(endpoint),
    }


def settings_of(catalog: dict[str, Any]) -> dict[str, str]:
    return catalog["settings"]


def print_fields(fields: dict[str, str]) -> None:
    for key, value in fields.items():
        if not value:
            continue
        print(f"{key.ljust(LABEL_WIDTH)}  {value}")


def brief_http_error(status: int, detail: str) -> str:
    try:
        payload = json.loads(detail)
    except json.JSONDecodeError:
        return f"HTTP {status}  {detail[:200]}"
    if not isinstance(payload, dict):
        return f"HTTP {status}  {detail[:200]}"
    error = payload.get("error")
    if isinstance(error, dict):
        code = str(error.get("code") or "")
        message = str(error.get("message") or "")
    else:
        code = str(payload.get("code") or "")
        message = str(payload.get("message") or detail[:200])
    parts = [f"HTTP {status}"]
    if code:
        parts.append(code)
    if message:
        parts.append(message)
    if len(parts) == 1:
        parts.append(detail[:200])
    return "  ".join(parts)


def http_json(
    method: str,
    url: str,
    *,
    api_key: str,
    body: dict[str, Any] | None = None,
    timeout: int = 120,
) -> Any:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
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
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Non-JSON response from {url}: {raw[:400]}") from exc


def call_api(catalog: dict[str, Any], method: str, url: str, **kwargs: Any) -> Any:
    return http_json(method, url, api_key=settings_of(catalog)["api_key"], **kwargs)


def sie_safe_id(model_id: str) -> str:
    """SIE path routes reject HF slashes; use double-underscore instead."""
    return model_id.replace("/", "__")


def resolve_model(catalog: dict[str, Any], name: str) -> tuple[str, dict[str, Any]]:
    models: dict[str, Any] = catalog["models"]
    if name in models:
        return name, models[name]
    lowered = name.lower()
    safe_lowered = sie_safe_id(name).lower()
    for key, spec in models.items():
        ids = [key, spec["model"], sie_safe_id(spec["model"]), *spec.get("aliases", [])]
        if lowered in {item.lower() for item in ids} or safe_lowered in {
            sie_safe_id(item).lower() for item in ids
        }:
            return key, spec
    if "/" in name or "__" in name:
        kind = infer_kind(name.replace("__", "/"))
        return name, {"title": name, "kind": kind, "model": name.replace("__", "/")}
    known = ", ".join(sorted(models))
    raise SystemExit(f"Unknown model {name!r}. Known aliases: {known}.")


def infer_kind(model_id: str) -> str:
    name = model_id.lower()
    if "rerank" in name:
        return "score"
    if any(token in name for token in ("embedding", "colqwen", "siglip", "bge")):
        return "encode"
    return "generate"


def model_path_segment(model_id: str) -> str:
    return urllib.parse.quote(sie_safe_id(model_id), safe="")


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


def print_generate(payload: Any, *, model: str) -> None:
    if isinstance(payload, dict):
        text = chat_text(payload)
        if text:
            print_fields({"model": model, "usage": chat_usage(payload)})
            print()
            print(text)
            return
        if "output" in payload or "text" in payload or "content" in payload:
            print_fields({"model": model})
            print()
            print(payload.get("output") or payload.get("text") or payload.get("content"))
            return
    print(json.dumps(payload, indent=2))


def print_encode(payload: Any, *, model: str, preview: int) -> None:
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict) and "dense" in first:
            dense = first["dense"]
            print_fields(
                {
                    "model": model,
                    "items": str(len(payload)),
                    "dims": str(len(dense)) if isinstance(dense, list) else "",
                    "dense": str(dense[:preview]),
                }
            )
            return
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list) and data:
            emb = data[0].get("embedding") if isinstance(data[0], dict) else None
            if isinstance(emb, list):
                print_fields(
                    {
                        "model": model,
                        "items": str(len(data)),
                        "dims": str(len(emb)),
                        "dense": str(emb[:preview]),
                    }
                )
                return
    print(json.dumps(payload, indent=2))


def print_score(payload: Any, *, model: str) -> None:
    if isinstance(payload, dict):
        results = payload.get("results") or payload.get("data")
        if isinstance(results, list):
            print_fields({"model": model, "hits": str(len(results))})
            for index, item in enumerate(results[:20], start=1):
                if not isinstance(item, dict):
                    print(f"  {index}. {item}")
                    continue
                score = item.get("score", item.get("relevance_score", ""))
                text = item.get("document") or item.get("text") or item.get("index", "")
                print(f"  {index}. score={score}  {text}")
            return
    if isinstance(payload, list):
        print_fields({"model": model, "hits": str(len(payload))})
        for index, item in enumerate(payload[:20], start=1):
            print(f"  {index}. {item}")
        return
    print(json.dumps(payload, indent=2))


def cmd_list(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    cfg = settings_of(catalog)
    print_fields(
        {
            "endpoint": cfg["endpoint"],
            "region": str(catalog.get("region") or ""),
            "key": "set" if cfg.get("api_key") else "missing",
        }
    )
    print()
    featured = catalog.get("featured") or list(catalog["models"])
    for key in featured:
        spec = catalog["models"].get(key)
        if spec is None:
            continue
        print(f"{spec['kind']:10}  {key:14}  {spec['model']}")
        if getattr(args, "verbose", False):
            print(f"            {spec.get('best', '')}")


def cmd_models(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    url = f"{settings_of(catalog)['endpoint']}/v1/models"
    payload = call_api(catalog, "GET", url, timeout=args.timeout)
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    data = payload.get("data", payload) if isinstance(payload, dict) else payload
    if not isinstance(data, list):
        print(json.dumps(payload, indent=2))
        return
    print_fields({"endpoint": settings_of(catalog)["endpoint"], "count": str(len(data))})
    print()
    for item in data:
        if isinstance(item, dict):
            print(item.get("id") or item.get("model") or item)
        else:
            print(item)


def cmd_encode(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    model_name = args.model or catalog["encode_default"]
    _, spec = resolve_model(catalog, model_name)
    if spec["kind"] not in {"encode"}:
        raise SystemExit(f"{model_name} is a {spec['kind']} model; use encode for embedding models")
    model_id = spec["model"]
    if args.openai:
        url = f"{settings_of(catalog)['endpoint']}/v1/embeddings"
        body: dict[str, Any] = {"model": model_id, "input": args.texts}
    else:
        url = f"{settings_of(catalog)['endpoint']}/v1/encode/{model_path_segment(model_id)}"
        body = {
            "items": [{"text": text} for text in args.texts],
            "params": {"output_types": ["dense"]},
        }
    payload = call_api(catalog, "POST", url, body=body, timeout=args.timeout)
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    print_encode(payload, model=model_id, preview=args.preview)


def cmd_score(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    model_name = args.model or catalog["score_default"]
    _, spec = resolve_model(catalog, model_name)
    if spec["kind"] not in {"score"}:
        raise SystemExit(f"{model_name} is a {spec['kind']} model; use score for rerankers")
    model_id = spec["model"]
    if args.openai:
        url = f"{settings_of(catalog)['endpoint']}/v1/rerank"
        body: dict[str, Any] = {
            "model": model_id,
            "query": args.query,
            "documents": args.documents,
        }
    else:
        url = f"{settings_of(catalog)['endpoint']}/v1/score/{model_path_segment(model_id)}"
        body = {
            "query": {"text": args.query},
            "items": [{"text": doc} for doc in args.documents],
        }
    payload = call_api(catalog, "POST", url, body=body, timeout=args.timeout)
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    print_score(payload, model=model_id)


def cmd_generate(catalog: dict[str, Any], args: argparse.Namespace) -> None:
    model_name = args.model or catalog["generate_default"]
    _, spec = resolve_model(catalog, model_name)
    if spec["kind"] not in {"generate"}:
        raise SystemExit(f"{model_name} is a {spec['kind']} model; use generate for chat models")
    model_id = spec["model"]
    if args.native:
        url = f"{settings_of(catalog)['endpoint']}/v1/generate/{model_path_segment(model_id)}"
        body: dict[str, Any] = {
            "messages": [
                {"role": "system", "content": args.system},
                {"role": "user", "content": args.prompt},
            ]
        }
    else:
        url = f"{settings_of(catalog)['endpoint']}/v1/chat/completions"
        body = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": args.system},
                {"role": "user", "content": args.prompt},
            ],
        }
    payload = call_api(catalog, "POST", url, body=body, timeout=args.timeout)
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    if isinstance(payload, dict):
        print_generate(payload, model=model_id)
        return
    print(json.dumps(payload, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Call Superlinked SIE (managed Qwen cluster) from the CLI.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Copy prototypes/.env.example → prototypes/.env and set "
            "SIE_ENDPOINT + SIE_API_KEY (never commit the key)."
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    list_p = sub.add_parser("list", help="Show featured Qwen models and endpoint")
    list_p.add_argument("-v", "--verbose", action="store_true", help="Include blurb per model")
    list_p.set_defaults(func=cmd_list)

    models_p = sub.add_parser("models", help="GET /v1/models from the live cluster")
    models_p.add_argument("--json", action="store_true")
    models_p.add_argument("--timeout", type=int, default=60)
    models_p.set_defaults(func=cmd_models)

    encode_p = sub.add_parser("encode", help="Embed text via /v1/encode or /v1/embeddings")
    encode_p.add_argument("texts", nargs="+", help="One or more texts to embed")
    encode_p.add_argument("--model", default=None, help="Alias or full model id")
    encode_p.add_argument("--openai", action="store_true", help="Use OpenAI-compatible /v1/embeddings")
    encode_p.add_argument("--preview", type=int, default=5, help="Dense dims to print")
    encode_p.add_argument("--json", action="store_true")
    encode_p.add_argument("--timeout", type=int, default=120)
    encode_p.set_defaults(func=cmd_encode)

    score_p = sub.add_parser("score", help="Rerank documents via /v1/score or /v1/rerank")
    score_p.add_argument("query", help="Query text")
    score_p.add_argument("documents", nargs="+", help="Candidate documents")
    score_p.add_argument("--model", default=None)
    score_p.add_argument("--openai", action="store_true", help="Use OpenAI-compatible /v1/rerank")
    score_p.add_argument("--json", action="store_true")
    score_p.add_argument("--timeout", type=int, default=120)
    score_p.set_defaults(func=cmd_score)

    gen_p = sub.add_parser("generate", help="Chat/generate via OpenAI or SIE-native route")
    gen_p.add_argument("prompt")
    gen_p.add_argument("--model", default=None)
    gen_p.add_argument("--system", default="You are a helpful assistant.")
    gen_p.add_argument("--native", action="store_true", help="Use POST /v1/generate/{model}")
    gen_p.add_argument("--json", action="store_true")
    gen_p.add_argument("--timeout", type=int, default=180)
    gen_p.set_defaults(func=cmd_generate)

    return parser


def main(argv: list[str] | None = None) -> None:
    load_env_files()
    parser = build_parser()
    args = parser.parse_args(argv)
    catalog = load_catalog()
    need_key = args.command != "list"
    catalog["settings"] = settings_from_env(catalog, require_key=need_key)
    args.func(catalog, args)


if __name__ == "__main__":
    main()
