# ADR-0001: Monk kit for Live deployment and packaging

- **Status:** Proposed
- **Date:** 2026-08-11 (updated 2026-09-08)
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

Two motivations carry equal weight. The first is redistribution: pull the repo,
tell Monk to deploy, get a Live instance. The second is **isolated ephemeral
environments** — each ephemeral instance is a separate Kit deploy with isolated
credentials, configured by the Monk agent from the single in-repo template. The
same template that runs an official hosted instance can therefore spin up
throwaway instances for development and review, so contributors and agents can
acceptance-check a live system without sharing one long-lived stack. For a
project with this much agent-driven workflow, that is a first-class reason to
package, not a side effect of it.

### The Live vendor baseline is tiered

A packaged Live instance is more than a dashboard and a database — but not every
vendor gates a deploy. Three tiers:

| Tier | Vendors | Required for | Kit handling |
|---|---|---|---|
| **1** | Supabase, Modal | Any deploy at all | Provisioned and wired by the Kit |
| **2** | Snyk, Cisco, Tessl | Full scanner coverage | Credentials collected; engines reached as SaaS |
| **3** | SIE (Superlinked), Alibaba Model Studio, Ossprey | Optional routing and research coverage | Env-var pass-through only, no provisioning |

**Tier 1** is the Minimum Viable Live already documented in
[env-vars](../user-guide/env-vars.md): Supabase plus Modal. Without Tier 1
credentials there is no deploy.

**Tier 2** turns an MVL instance into a full-coverage one. A Tier-1-only deploy
is a *valid but partial* Live instance: it runs, and it scans with whatever
engines are keyed. Cisco is one vendor with two credential shapes — the
LLM-backed Skill and MCP Scanner keys, or the paid AI Defense APIs — and at
least one of the two is needed for Cisco coverage.

**Tier 3** vendors are collected as pass-through secrets and nothing more: the
Kit provisions nothing for them, and a deploy never fails for want of one.
`SIE_ENDPOINT` and `SIE_API_KEY` enable the tiered router; `DASHSCOPE_API_KEY`
and `ALIBABA_OPENAI_BASE_URL` enable Model Studio escalation;
`OSSPREY_API_KEY` enables the credential-gated, RESEARCH-labeled Ossprey
malware adapter, whose access provisioning is still open
([STATUS](../STATUS.md)).

These tier boundaries — and the Kit specifics behind them — are revisitable
once the actual Monk configuration lands in the repo. This ADR is the intent
record, not the implementation contract.

### What runs in the cluster, what stays SaaS

| Location | Components |
|---|---|
| **In the cluster** | Bootstrap, the dashboard, HTTPS ingress |
| **Outside (SaaS)** | Supabase (PostgREST), Modal, the three scanner engines, and the Tier 3 endpoints |

Modal remains an external SaaS dependency. "Not a cluster workload" means no
Modal container runs inside the cluster — it does **not** mean Modal is
unconfigured. The Kit holds Modal tokens as secrets and deploys the Modal app
during bootstrap; at scan time the cluster reaches **out** to Modal, which
spins up the sandboxes on its own infrastructure. Scanner engines are reached
the same way.

### Intended user path (after implementation)

1. Install Monk.
2. Ask Monk to deploy Tripwire (from this repo; later from the Monk registry).
3. Monk collects the Tier 1 secrets it needs to deploy at all, plus whichever
   Tier 2 and Tier 3 secrets the operator holds.
4. Monk wires providers and provisions the required services and compute.
5. Monk bootstraps the instance (schema, Modal app, dashboard config).
6. Monk hands back an HTTPS URL to the running instance.

### Kit v1 is done when

**MVL-complete** — the deploy succeeds and hands back a Live instance:

- Tier 1 credentials (Supabase, Modal) are collected.
- Supabase is provisioned and wired.
- The schema is applied.
- The Modal app is deployed with whatever scanner secrets were supplied.
- The HTTPS Live dashboard can read PostgREST.

**Full-coverage-complete** — MVL-complete, and additionally:

- Tier 2 credentials (Snyk, Cisco, Tessl) are collected and reach their engines.
- Tier 3 keys, where the operator has them, are passed through to the sandbox.

An MVL-complete deploy is a successful Live instance with **partial scanner
coverage**; only full-coverage-complete gives an operator every scanner
Tripwire can run.

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
- Isolated ephemeral environments for development and review, from the same
  template as the hosted instance (see the Decision above).
- Other database backends can later appear as package flavors once the app can
  talk to them.

### Costs and open questions

- Hosted Live depends on Monk for provisioning, secrets, and ingress — by design.
- Tier 1 alone produces a valid Live instance with partial scanner coverage.
  Open question: how that instance signals its partial coverage to the operator
  — a deploy summary, a dashboard surface, or both. Live honesty rules today
  live in [STATUS](../STATUS.md).
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
cluster. That generation is an existing Monk capability, not a future one —
but Tripwire does not use it yet, and adopting it is follow-up work outside
this ADR. Secrets remain handled by Monk; the workflow needs cluster
coordinates and the Kit's manifest and templates. Custom pipelines remain
possible for advanced operators, but they are not the default we are packaging
toward.

### C. Helm, Kustomize, or Terraform

The obvious alternatives. Each solves part of the problem; none covers the
whole path from "pull the repo" to "HTTPS Live instance", which is what this
ADR is choosing.

- **Secrets are first-class in Monk.** It collects, stores, and injects them —
  including values *generated during provisioning*, such as the Supabase
  service-role and anon keys, which do not exist until the project is created.
  Helm and Kustomize template manifests and defer secrets to an external store;
  wiring a generated credential into the next step is the operator's problem.
- **Monk provisions the managed SaaS.** The Supabase entity creates the project;
  it does not merely template a reference to one that already exists. Helm and
  Kustomize cannot provision off-cluster services at all. Terraform can, but
  then Terraform provisions and something else deploys and something else holds
  secrets — three tools where the Kit is one.
- **Versioned Kit plus a registry.** A manifest with versioned templates and a
  registry install path is what makes "install Monk, deploy Tripwire" work
  without assembling the stack by hand. Helm has charts and repositories but no
  provisioning story; Terraform has modules and a registry but no packaged
  runtime.
- **Ephemeral environments from one template.** The Monk agent configures each
  ephemeral instance as a separate Kit deploy with isolated credentials from the
  same in-repo template — the motivation named in the Decision. Reproducing that
  on the alternatives means maintaining a parallel path for dev environments.

**Not rejected as tooling.** Helm or Terraform could sit *under* a future
deployment if that ever helps; the point is that neither is the packaging and
distribution unit this ADR needs.

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
