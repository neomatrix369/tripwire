"""In-memory Supabase fakes for guard/tests (no network anywhere).

Reproduces the tiny slice of the PostgREST query-builder API the guard uses:
select / eq / in_ / order / limit / execute.
"""

from __future__ import annotations

from typing import Any


class FakeResponse:
    def __init__(self, data: Any) -> None:
        self.data = data


class FakeQuery:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = list(rows)
        self._filters: list[Any] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None

    def select(self, *_args: Any, **_kwargs: Any) -> FakeQuery:
        return self

    def eq(self, column: str, value: Any) -> FakeQuery:
        self._filters.append(lambda row, c=column, v=value: row.get(c) == v)
        return self

    def in_(self, column: str, values: Any) -> FakeQuery:
        allowed = list(values)
        self._filters.append(lambda row, c=column, v=allowed: row.get(c) in v)
        return self

    def order(self, column: str, desc: bool = False) -> FakeQuery:
        self._order = (column, desc)
        return self

    def limit(self, count: int) -> FakeQuery:
        self._limit = count
        return self

    def execute(self) -> FakeResponse:
        rows = [r for r in self._rows if all(f(r) for f in self._filters)]
        if self._order is not None:
            column, desc = self._order
            rows.sort(key=lambda r: r.get(column) or "", reverse=desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        return FakeResponse(rows)


class FakeSupabase:
    def __init__(self, tables: dict[str, list[dict[str, Any]]]) -> None:
        self.tables = tables

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables.get(name, []))


class NoneReturningClient:
    """Client-version quirk (T2): execute() returns None instead of a response."""

    def table(self, _name: str) -> Any:
        return self

    def __getattr__(self, _name: str) -> Any:
        return lambda *args, **kwargs: self

    def execute(self) -> None:
        return None


def default_config() -> dict[str, Any]:
    return {"id": 1, "monitoring_enabled": True, "threshold": "red"}


def make_tables(
    *,
    config: dict[str, Any] | None = None,
    items: list[dict[str, Any]] | None = None,
    scan_runs: list[dict[str, Any]] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    return {
        "config": [config if config is not None else default_config()],
        "items": items or [],
        "scan_runs": scan_runs or [],
    }
