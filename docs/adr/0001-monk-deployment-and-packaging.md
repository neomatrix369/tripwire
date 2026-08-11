# ADR-0001: Monk kit for Live deployment and packaging

- **Status:** Proposed
- **Date:** 2026-08-11
- **Deciders:** Tripwire maintainers
- **Tags:** deployment, packaging, monk, supabase, modal

## Context

Tripwire’s Live path today assumes an operator workstation: clone the repo,
fill a local `.env`, run setup scripts, then point a dashboard at hosted
Supabase and Modal. That works for contributors who already have the tooling,
but it does not make the project **immediately deployable** or **redistributable
as a package**.

We want a packaging and deploy story where:

1. Anyone can pull this repo and ask Monk to deploy Tripwire on their cloud.
2. Once published to the Monk registry, users can install Monk and ask to deploy
   Tripwire without assembling the stack by hand (public container images on
   Docker Hub or another registry become part of that publish path).
3. As the project grows, the template lives in this repo; shipping a new version
   is committing an updated template and publishing images from CI.

Supabase is the current Live database because the product relies on PostgREST
today. Supporting other databases would need application changes; once that
exists, alternate DB backends are natural **package flavors** rather than forks
of the whole project.

## Decision

**Package Tripwire as a Monk Kit** and treat Monk as the path that takes a user
from zero to a running Live instance.

### Ideal user path

1. Install Monk.
2. Ask Monk to deploy Tripwire (from this repo now; later from the Monk
   registry).
3. Monk asks for the required secrets (Supabase, Modal, and optional
   scanner/API keys).
4. With those keys present, Monk wires providers and provisions the required
   services and compute.
5. Monk bootstraps the instance (schema, Modal app, dashboard config).
6. Monk hands back an HTTPS URL to the running instance.

### Kit shape (this proposal)

- A repo-root Monk Kit (manifest + versioned templates + a mutable latest track)
  with a clear production entry suitable to publish later.
- **Supabase** provisioned/wired as a managed dependency for Live (current
  PostgREST-backed path).
- **Modal** remains external SaaS (tokens and scanner keys as secrets; not a
  cluster workload).
- Cluster-local pieces: dashboard (and any bootstrap needed so the instance
  comes up without a laptop after secrets are present).
- Local `.env` + CLI remains valid for development; it is no longer the only
  Live path.

## Consequences

### Expected benefits

- The project becomes **immediately deployable** via Monk.
- The project becomes **packaged**: pull the repo → tell Monk to deploy on your
  cloud.
- Registry publication is a natural next step: install Monk → deploy Tripwire,
  with images published to a public registry as part of release.
- Template evolution stays in-repo; new versions are template commits + image
  publishes from CI.
- The **same template** can run an official hosted instance and spin up
  **isolated ephemeral environments** while working on the project — so people
  and agents can test, review, and acceptance-check a live system at
  development time without sharing one long-lived stack.
- Other database backends can later appear as package flavors once the app can
  talk to them (today Supabase/PostgREST is required).

### Costs and open questions

- Hosted Live depends on Monk for provision, secrets, and ingress — by design.
- Bootstrap and image publish details are implementation work after this ADR is
  accepted; they should stay invisible to the ideal user path above.
- Flavoring non-Supabase databases is deferred until the application boundary
  allows it.

### Further considerations (not decided here)

- Teach the Tripwire CLI to target the **instance URL** (HTTPS ingress) instead
  of a raw database URL, so operators work against the deployed service.
- Auth for multi-user / shared instances: Monk can provision or wire Auth0,
  Clerk, or WorkOS, or deploy/wire Keycloak alongside Tripwire — choose when
  identity becomes a product requirement.
- After the Kit path is stable, Monk can generate a CI/CD action that deploys to
  an existing cluster; secrets stay in Monk, and the action mainly needs cluster
  coordinates plus the manifest/templates Monk already manages.

## Alternatives considered

### A. Document-only Live (status quo)

Keep README / user-guide as the only Live path (local `.env`, CLI, Modal CLI).

**Rejected for redistribution:** it does not produce a deployable package and
still requires a fully tooled operator machine.

### B. Hand-rolled CI/CD without Monk as the product path

Maintain cloud-specific Actions/Terraform as the primary deploy story.

**Not the primary path.** The next step after a working Kit is the opposite
direction: **Monk generates** the CI/CD action that deploys to an existing
cluster. Secrets remain handled by Monk; the workflow needs cluster coordinates
and the Kit’s manifest/templates, which Monk can supply when asked. Custom
pipelines remain possible for advanced operators, but they are not the default
we are packaging toward.

## References

- Live capabilities and honesty: [docs/STATUS.md](../STATUS.md)
- Architecture containers (CLI, Modal, Supabase, dashboard): [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- Operator Modal setup today: [docs/user-guide/modal-setup.md](../user-guide/modal-setup.md)
- Operator Supabase setup today: [docs/user-guide/supabase-setup.md](../user-guide/supabase-setup.md)
- Planning log: [docs/plan/DECISIONS.md](../plan/DECISIONS.md)
