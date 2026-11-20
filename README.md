# SeedTrade.eu

Public source for the SeedTrade.eu read-only European seed market intelligence website.

## Stage 6 simplified Marketplace V1 — local candidate, 2026-11-20

MB Gate-V is the platform operator and manual broker, identified by its approved
public legal identifiers. It does not need a Member account, company approval,
billing authority or transaction administrator to receive confirmed enquiries.
Existing genuine Member registration, email verification/password setup,
independent company approval, listings, opted-in notices and confirmed enquiries
are reused. Publication records explicit acceptance of the exact 1% terms.
The listing author pays only on goods actually delivered and accepted, excluding
VAT and separately invoiced transport/ancillary services. Enquiries alone are free.
Negotiation, contracts, delivery and invoicing remain manual.

The historical transaction engine and evidence remain available in their prior
scope. Simplified mode refuses automated member and operator transaction actions
and mounts no transaction-administrator routes. Privileged company review and
member management retain separate MFA and explicit permission requirements.

The hosted composition is prepared behind all existing Marketplace/registration
release gates. It additionally requires `B2B_BROKERAGE_TERMS_HASH` to match the
current `digest(simpleTerms)` and `B2B_BROKERAGE_TERMS_APPROVAL_REF` to reference
genuine owner acceptance of that exact text. Neither value is approval by itself.
No production configuration is changed. The owner-approved five-language V3 is in
[v3.html](public/legal/brokerage/v3.html), with its exact canonical hash and
[approval record](docs/stage6-terms-v3/APPROVAL.json). The earlier V2 review remains historical.
Previous accepted legal versions and the three unpublished drafts are preserved.

Current bounded release preparation and exact MFA steps are in
[RELEASE.md](docs/stage6-terms-v3/RELEASE.md). Reuse the existing supported Privacy
Notice draft and specific remaining provider/recovery facts. The current owner
instruction supersedes the historical proposal for another real email test:
preserve SMTP, send no additional test, and leave the real journey to the owner
after separately authorized publication.

Local API input preparation reuses the sealed dedicated-Admin API archive and its
unchanged package/lock, overlays committed backend and `shared/` modules, and checks
relative imports. Run `py scripts/prepare_stage6_api_candidate.py --base-api
PATH_TO_EXISTING_ADMIN_API_ZIP --output NEW_WORKSPACE_DIRECTORY` from a committed
candidate. This performs no install, database operation, mail, deployment or activation.
The existing GitHub-to-Hostinger website build must include the committed `shared/`
directory. The website entrypoint retains the earlier reviewed private Admin HTML
route; all privileged API gates and MFA remain unchanged.

Production pilot remains blocked by the existing specific provider/recovery
privacy facts and completed-notice approval, operational MFA enrollment for
privileged review, release/recovery sealing and separate deployment approval.
Brokerage V3 text, its 14-calendar-day payment term and effect from actual
publication are approved; this does not authorize publication or activation.
Gate-V Member registration, automated billing and transaction-admin enrollment
are not V1 release prerequisites. Use the existing GitHub → Hostinger process
and close-first rollback; do not publish from the local preview.

Focused checks: `node --test tests/b2bSimplifiedRelease.test.mjs
tests/b2bSimpleMarketplace.test.mjs tests/b2bSimpleRegistration.test.mjs`.
All mail and production-shape composition in these tests use synthetic adapters.
Prior real MySQL/MariaDB migration checks are reused; this correction adds no schema.

## Build and test

Requirements: Node.js, npm, and Python 3.

```sh
npm ci
npm test
npm run build:vite
```

The production build is written to `dist/`. The build includes prerendered, static-first HTML for public routes so core content remains visible without JavaScript.

## Publication safety

This is a **PUBLIC repository**. Only data explicitly approved as `PUBLIC_SAFE` may be committed. Private, licensed, raw-source, credential, operational, and recovery material must remain outside this repository. The committed `src/generated/` files are the reviewed public website data layer; private source and transformation layers are intentionally excluded.

## EU Seed Trade Pulse

`src/generated/trade_pulse_public.json` is the publication-safe aggregate derived from verified Eurostat COMEXT DS-045409 rows. It separates EU internal dispatches, extra-EU imports and extra-EU exports; excludes the 2026-07 partial period; and labels weighted trade value per net kilogram as **unit value**, not market price. The raw normalized COMEXT source is intentionally kept outside this public repository. `scripts/generate_trade_pulse.py` regenerates the public aggregate when an authorized verified source path is supplied.
