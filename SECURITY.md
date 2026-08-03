# Security

[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)

## Supported versions

Only the latest `main` branch is supported for security fixes during this hackathon / early phase.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

Email the maintainer via the contact listed on [github.com/neomatrix369](https://github.com/neomatrix369), or open a private GitHub Security Advisory on [neomatrix369/tripwire](https://github.com/neomatrix369/tripwire) if available.

Include: affected component (CLI / sandbox / dashboard / fixtures), reproduction steps, and impact.

## Intentional vulnerable fixtures

Paths under `fixtures/` contain deliberate insecure patterns for scanner demos. They use fake credentials and non-resolving hosts — treat them as test data only, never as production templates.
