# Shared onboarding map

This is the role-neutral map for using Tripwire. It contains no copied commands:
[setup-commands.md](./setup-commands.md) is the single executable command source.

## 1) Check fit and prerequisites

Start with [prerequisites.md](./prerequisites.md) to confirm the required tools,
the technical comfort expected, and the five-vendor account/setup requirements for
Live capabilities.

## 2) Install and bootstrap

Follow [repository and CLI bootstrap](./setup-commands.md#1-one-off-setup-commands)
to clone the repository, install dependencies, and link `tripwire`.

## 3) Validate locally

Use [local validation](./setup-commands.md#2-local-validation-node-22--mock-dashboard)
for Node, npm, Python, and fixture discovery checks. See [QUICKSTART.md](../../QUICKSTART.md)
for the product validation journey.

## 4) Enable Live capabilities

Provision all five vendors, populate `.env`, and run the platform commands from
[Live environment bootstrap](./setup-commands.md#3-live-environment-bootstrap).
Use [env-vars.md](./env-vars.md) for accounts, keys, and capability mapping; use
[OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md) only for the
Modal scanner-secret projection and manual fallback.

## 5) Maintain or contribute

Use [re-run and maintenance commands](./setup-commands.md#4-re-run-and-maintenance-commands)
after dependency or deployment changes. A **Contributor** uses Tripwire and also
improves it; after completing the shared setup, follow [CONTRIBUTING.md](../../CONTRIBUTING.md).
