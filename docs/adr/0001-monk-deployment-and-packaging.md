# ADR-0001: Monk kit for Live deployment and packaging

- **Status:** Proposed
- **Date:** 2026-08-11 (updated 2026-08-30)
- **Deciders:** Tripwire maintainers
- **Tags:** deployment, packaging, monk, supabase, modal

> **This is a proposal, not a shipped capability.** Nothing here is implemented
> on `main`. Until this ADR is accepted **and** the Kit is built, the supported
> Live path remains the operator workstation flow: clone the repo, fill a local
> `.env`, run the setup commands, point the dashboard at hosted Supabase and
> Modal. See [QUICKSTART](../../QUICKSTART.md) and
> [setup-commands](../user-guide/setup-commands.md). Tripwire is **not**
> currently deployable or redistributable via Monk.

**Monk**, in one line: a packaging and deploy runtime that consumes a *Kit* — a
manifest, templates, and secrets — and provisions the described stack.

## Context

Tripwire's Live path today assumes an operator workstation. That works for
contributors who already have the tooling, but it does not make the project
**immediately deployable** or **redistributable as a package**.

We want a packaging and deploy story where:

1. Anyone can pull this repo and ask Monk to deploy Tripwire on their cloud.
2. Once published to the Monk registry, users can install Monk and ask to deploy
   Tripwire without assembling the stack by hand (public container images
   become part of that publish path).
3. As the project grows, the template lives in this repo; shipping a new version
   is committing an updated template and publishing images from CI.

Supabase is the current Live database because the product relies on PostgREST
today ([ADR-0004](./0004-supabase-system-of-record.md)). Supporting other
databases would need application changes; once that exists, alternate DB
backends are natural **package flavors** rather than forks of the whole project.

## Decision

**Package Tripwire as a Monk Kit** and treat Monk as the intended path that takes
a user from zero to a running Live instance, *once implemented*.

### The Live baseline is five vendors

A packaged Live instance is **Supabase, Modal, Snyk, Cisco, and Tessl** — not
just a dashboard and a database. Credentials for all five are **required** input
to a Kit deploy. Scanner credentials for Snyk, Cisco, and Tessl are not
optional, and a missing scanner key is not an acceptable Live outcome: it makes
the deploy incomplete.

Cisco is one vendor with two credential shapes — the LLM-backed Skill/MCP
Scanner keys, or the paid AI Defense APIs — and **at least one is required**.
Cisco is not droppable from the baseline.

Ossprey is **outside** the Kit v1 baseline: the adapter is credential-gated and
RESEARCH-labeled, and access provisioning is still open, so it cannot be a
required input yet ([STATUS](../STATUS.md)).

### What runs in the cluster, what stays SaaS

| Location | Components |
|---|---|
| **In the cluster** | Bootstrap, the dashboard, HTTPS ingress |
| **Outside (SaaS)** | Supabase (PostgREST), Modal, and the three scanner engines |

Modal remains an external SaaS dependency. It is **not** a cluster workload; the
Kit deploys a Modal app and holds its tokens as secrets.

### Intended user path (after implementation)

1. Install Monk.
2. Ask Monk to deploy Tripwire (from this repo; later from the Monk registry).
3. Monk collects the required secrets for all five vendors.
4. Monk wires providers and provisions the required services and compute.
5. Monk bootstraps the instance (schema, Modal app, dashboard config).
6. Monk hands back an HTTPS URL to the running instance.

### Kit v1 is done when

- Credentials for all five vendors are collected.
- Supabase is provisioned and wired.
- The schema is applied.
- The Modal app is deployed with scanner secrets.
- The HTTPS Live dashboard can read PostgREST.

If scanner credentials are missing, the deploy is **incomplete** — not a
successful Live instance.

## Coexistence with today's docs

The Monk path is **additive** until it is implemented. The workstation flow
(local `.env`, CLI, QUICKSTART) stays the documented and supported Live path,
and remains valid for development afterward. No existing operator
documentation changes on the strength of this ADR alone; docs move only when
the Kit actually ships.

## Not decided here

Out of scope for this ADR: Kit YAML and Dockerfiles, registry publication,
authentication and identity providers, other database backends, teaching the
CLI to target an instance URL, locking a cloud vendor, and the implementation
plan itself. Those belong in follow-up slices under `docs/plan`.

## Consequences

### Expected benefits

- The project becomes **immediately deployable** via Monk.
- The project becomes **packaged**: pull the repo → tell Monk to deploy on your
  cloud.
- Registry publication is a natural next step, with images published to a
  public registry as part of release.
- Template evolution stays in-repo; new versions are template commits plus image
  publishes from CI.
- The **same template** can run an official hosted instance and spin up
  **isolated ephemeral environments** during development, so people and agents
  can acceptance-check a live system without sharing one long-lived stack.
- Other database backends can later appear as package flavors once the app can
  talk to them.

### Costs and open questions

- Hosted Live depends on Monk for provisioning, secrets, and ingress — by design.
- Requiring five vendors raises the bar for a successful deploy relative to the
  Minimum Viable Live (Supabase + Modal) documented in
  [env-vars](../user-guide/env-vars.md). That is deliberate: a packaged instance
  should not ship with partial scanner coverage.
- Bootstrap and image-publish details are implementation work after this ADR is
  accepted; they should stay invisible to the intended user path above.
- Flavoring non-Supabase databases is deferred until the application boundary
  allows it.

## Alternatives considered

### A. Document-only Live (status quo)

Keep README / user-guide as the only Live path (local `.env`, CLI, Modal CLI).

**Rejected for redistribution:** it does not produce a deployable package and
still requires a fully tooled operator machine. It remains the supported path
until this ADR is implemented.

### B. Hand-rolled CI/CD without Monk as the product path

Maintain cloud-specific Actions or Terraform as the primary deploy story.

**Not the primary path.** The next step after a working Kit is the opposite
direction: **Monk generates** the CI/CD action that deploys to an existing
cluster. Secrets remain handled by Monk; the workflow needs cluster coordinates
and the Kit's manifest and templates. Custom pipelines remain possible for
advanced operators, but they are not the default we are packaging toward.

## References

- Live capabilities and honesty: [docs/STATUS.md](../STATUS.md)
- Architecture containers and service inventory: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- Current Live path: [QUICKSTART.md](../../QUICKSTART.md) ·
  [setup-commands](../user-guide/setup-commands.md) ·
  [env-vars](../user-guide/env-vars.md)
- Operator Modal setup today: [modal-setup](../user-guide/modal-setup.md)
- Operator Supabase setup today: [supabase-setup](../user-guide/supabase-setup.md)
- Supabase as system of record: [ADR-0004](./0004-supabase-system-of-record.md)
- Modal for isolated scanner execution: [ADR-0003](./0003-modal-isolated-scanner-execution.md)
- Planning log: [docs/plan/DECISIONS.md](../plan/DECISIONS.md)
