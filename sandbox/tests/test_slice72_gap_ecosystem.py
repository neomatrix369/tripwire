"""
Tests for Slice 72 gap-ecosystem scanner acceptance (Rust/Cargo).

Author: swami
Created: 2026-09-20
Scope: GWT-72.2 SCANNER_GROUPS registry reuse (Cargo Audit between DepShield
       and Ossprey); GWT-72.4 named tool source string on the adapter
"""

from __future__ import annotations

import scanners


def test_gwt_72_2_cargo_audit_lands_in_scanner_groups_between_depshield_and_ossprey() -> None:
    """
    Scenario: Gap fill extends the existing registry — no orphan scanner stack.
    Slice: GWT-72.2 — Prefer extend existing adapter

    Given SCANNER_GROUPS on the sandbox scanners module,
    When Cargo Audit is registered for the Rust/Cargo gap,
    Then it appears as a group between DepShield and Ossprey with applies_to both.
    """
    ### Given / When
    groups = scanners.SCANNER_GROUPS
    sources = [tuple(g["sources"]) for g in groups]

    ### Then
    assert ("Cargo Audit",) in sources, "Cargo Audit must reuse SCANNER_GROUPS"
    assert scanners.CARGO_AUDIT_SOURCES == ["Cargo Audit"]

    dep_i = next(i for i, s in enumerate(sources) if s == ("DepShield",))
    cargo_i = next(i for i, s in enumerate(sources) if s == ("Cargo Audit",))
    oss_i = next(i for i, s in enumerate(sources) if s == ("Ossprey",))
    assert dep_i < cargo_i < oss_i, (
        f"expected DepShield < Cargo Audit < Ossprey, got indices "
        f"dep={dep_i} cargo={cargo_i} oss={oss_i}"
    )

    cargo_group = groups[cargo_i]
    assert cargo_group["applies_to"] == "both"
    assert callable(cargo_group["runner"])
    assert cargo_group["runner"].__name__ == "_run_cargo_audit_group"


def test_gwt_72_4_named_tool_source_is_cargo_audit() -> None:
    """
    Scenario: The gap scanner is named Cargo Audit (not a parallel invented brand).
    Slice: GWT-72.4 — Example: Rust/Cargo

    Given the Cargo Audit adapter constants,
    When the named tool identity is inspected,
    Then CARGO_AUDIT_SOURCES is exactly ["Cargo Audit"].
    """
    ### Given / When
    actual_sources = list(scanners.CARGO_AUDIT_SOURCES)

    ### Then
    assert actual_sources == ["Cargo Audit"]
