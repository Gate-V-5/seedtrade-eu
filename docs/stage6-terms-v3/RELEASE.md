# Stage 6 V3 release preparation — 2026-11-20

Local candidate only. Marketplace/Admin production remain OFF. No deployment,
migration, account creation, privilege grant or real email is performed here.
This supersedes obsolete proposed email tests and V2 text-approval actions in
historical records; those records and the three unpublished drafts are retained.

## Approved terms and consistency

Version: `brokerage-simple-1pct-v3`.

Canonical SHA-256:
`8cc4387f69a345d07565e9ea529b5dcd567edabf0c2e59d5b0d5f0936dca021c`.

[Exact five-language terms](../../public/legal/brokerage/v3.html) and
[downloadable hash-bound source](../../public/legal/brokerage/v3.json).
The owner supplied full English V3 and expressly approved it, including 14 calendar
days from invoice issuance and effect from actual publication, on 2026-11-20.
Only the internal review label, proposed-payment qualifier and unresolved-date
label were replaced as expressly authorized. English prevails. Record the actual
first publication date in the execution receipt; no publication date is invented.

The original signed B2B Terms/Privacy/authority snapshots and registration bundle
remain immutable. The current Terms page additionally presents the separately
accepted brokerage terms in the selected supported language: the free membership,
listing, notification and enquiry services are distinguished from the listing
publisher's contingent commission. General B2B acceptance does not replace the
mandatory, initially unchecked, per-listing brokerage acceptance. The server rejects
absent/false/string acceptance and stale V2 hashes, and stores the complete V3,
hash/version, company, user, listing and timestamp. Earlier acceptances are not rewritten.

V3 reporting is manual: publisher informs info@seedtrade.eu of conclusion and of
delivery/acceptance, identifying listing, counterparty, quantity, final goods value
and execution date; reasonable supporting documents may be requested. No extra
reporting deadline, penalty, minimum commission, fee or automated accounting is added.
The existing Privacy draft covers supplied commercial data, brokerage evidence
and manual coordination; no contradictory promise is added. V3 defers unresolved
disputes to applicable contractual terms and law, consistent with the existing B2B
Terms section 9 (statutory rules; no exclusive chosen court). No new jurisdiction
decision is necessary to implement this approved wording.

## Specific remaining privacy blockers

Reuse `docs/stage6-simplified-v1/privacy-review.json` and the supported review HTML.
Unknown facts remain unknown; they are not findings of non-compliance.

1. Existing Hostinger website/VPS/database/email: applicable non-EEA support or
   subprocessor recipients, destinations and actual safeguard, or supported
   no-transfer boundary. One existing-account service/support confirmation suffices.
2. Existing Dropbox recovery-file/metadata/support flow and intended continuation:
   applicable destinations/recipients and safeguard. Do not infer Business DPA,
   EEA residency or that future Stage 6 records were already uploaded.
3. Restricted recovery copies: private owner confirmation of actual storage
   countries and authorized remote-access countries/roles.

Insert only the evidence-backed disclosures, obtain approval of the exact completed
Privacy Notice and effective date, and seal that new immutable snapshot through
the existing legal process before publication. Preserve old accepted snapshots.
No new hosting, storage, monitoring, contract inventory or compliance system is required.

## Minimum Admin identity and exact supported MFA enrollment

Intended login: `info@seedtrade.eu`; role: `COMPANY_REVIEW`; permission:
`company:review`. Leave member-management assignment and all brokerage/billing
bindings empty. MB Gate-V is operator/broker and needs no Marketplace Member.
Existing owner mailbox-control attestation is reused, not represented as a fresh
independent check. No account has been created or identity privilege granted.

1. Privately record the actual human reviewer assignment, genuine authorization
   reference and complete affiliated/conflicted Member-company IDs. An empty list
   requires actual confirmation, not an automated default. Do not invent a Gate-V ID.
2. Only at separately authorized release, use the existing migrator to apply the
   additive `005_platform_admin_REVIEW_ONLY.sql` and existing least-privilege grant
   file if absent. Verify actual schema/grants and backup coverage first. Prepare
   the fresh 32-byte MFA encryption key as 64 lowercase hex characters in
   `B2B_ADMIN_MFA_KEY` through the existing protected environment mechanism; preserve
   it in the existing encrypted configuration recovery process without printing it.
3. In the existing owner-controlled Linux root shell, prepare a root-owned 0600
   input in a root-owned 0700 directory. Fields: `email` = `info@seedtrade.eu`, a
   separate new password of at least 12 characters, `ownerAuthorized` = true,
   genuine `ownerAuthorizationRef`, `conflictsCompleteConfirmed` = true, and
   accurate `conflictCompanyIds`. Confirmations must be true facts. Prepare a
   root-owned 0700 enrollment-output directory and a nonexistent output filename.
4. From the exact staged API release, run the existing CLI privately:

   ```sh
   node --env-file=/etc/seedtrade-production/app.env scripts/provision-first-platform-admin.mjs /root/PRIVATE_INPUT.json /root/PRIVATE_DIRECTORY/admin-enrollment.json
   ```

   Replace the private paths locally. The CLI uses the existing migrator, refuses
   to overwrite an existing first admin, and prints status only. Do not paste or
   log the input, enrollment output, password, encryption key, secret or codes.
5. Enter the protected enrollment-file secret directly into the owner's
   authenticator: issuer `SEEDTRADE.EU Administration`, account `info@seedtrade.eu`,
   time-based SHA1, six digits, 30 seconds. No new recovery-code flow is introduced.
6. After separately authorized Admin activation, open
   `https://seedtrade.eu/b2b/admin` and enter email, separate password and current
   six-digit code. First successful MFA login activates the provisioned account.
   Verify only company-review authority, Member-cookie rejection and conflict
   refusal before reviewing real companies. No MFA bypass is supported.

## Shortest release and rollback route

After the privacy closure, use the existing GitHub-to-Hostinger procedure with the
exact committed website/API candidate. Set the existing exact-hash approval inputs
only during separately authorized execution: `B2B_BROKERAGE_TERMS_HASH` must equal
the hash above, and `B2B_BROKERAGE_TERMS_APPROVAL_REF` must reference the actual
2026-11-20 V3 approval. Neither value is deployment authority. Keep all other
existing legal/privacy/proxy/runtime/storage/delivery gates in place.

At execution, capture fresh website/API/private configuration/grant before-images
and an encrypted full-database/configuration backup with authenticated readback.
Retain existing infrastructure and Dropbox arrangements. Keep commercial/Admin
ingress closed during staging and private enrollment. Apply only absent existing
additive schema and necessary per-table runtime/backup grants under that separate
authorization. No schema change is introduced by V3. Build the changed website
source through the existing Hostinger process; the old built website/API packages
do not contain V3. Do not infer production readiness from local input sealing.

On failure: close Marketplace/Admin ingress first; restore fresh pre-attempt
website/API/private settings and revoke only newly added runtime grants where
appropriate. Preserve additive schema/data, audit and acceptance history,
revocations, backup coverage and the three drafts. Never restore an old database
over committed records or resend uncertain mail. The recorded website rollback
ZIP is `tmp/stage2-top-news-recovery-v1/release/website-source.zip`, SHA-256
`a0f09e495699a3fbdef2c6eed3796a4d3abc4b43d3242d676413baa52453836c`,
baseline `ac6a0868dffafda8a6773f79704db8e3459f2f16`. Fresh drift/before-image
verification at execution takes precedence over historical evidence.

Preserve SMTP. No additional real email test, customer or listing is required by
this preparation. The owner performs the real registration/listing/enquiry journey
after separately authorized publication.

## Focused verification

11 checks PASS: complete five-language downloadable/rendered text, canonical hash,
unchanged original legal snapshots, both publication directions, mandatory boolean
acceptance, stale V2 rejection, bound evidence, enquiry confirmation/CSRF and closed
activation gates. JSX compilation PASS with zero warnings. All transport, accounts
and data are synthetic/in-memory. Reuse prior production build, desktop/mobile,
MySQL and Admin MFA evidence where unchanged; no new general audit was run.

The existing test runner's child spawning is restricted here; run the same node:test
assertions directly without changing application code:

```sh
node --input-type=module -e "await import('./tests/b2bBrokerageV3.test.mjs'); await import('./tests/b2bSimpleMarketplace.test.mjs'); await import('./tests/b2bSimplifiedRelease.test.mjs');"
```
