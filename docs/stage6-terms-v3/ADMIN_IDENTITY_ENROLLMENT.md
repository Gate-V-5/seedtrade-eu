# Private Admin identity enrollment — no operational review authority

This supersedes the former combined first-admin/conflict-declaration bootstrap.
Owner authorization on 2026-11-20 explicitly separates private password/MFA
identity enrollment from a later company-review assignment. No exhaustive personal
affiliation declaration is requested or recorded by the identity enrollment path.

New identities have role `ENROLLMENT_ONLY`, no permissions and null affiliation
and confirmation fields. Even after correct password/TOTP confirmation, the
existing Admin login and review authentication reject this role. Runtime SQL
grants cannot update role, affiliations or authorization. There is no automatic
promotion or public enrollment endpoint.

Historical acceptance company IDs 1, 2 and 3 remain independently protected from
review. Their account labels or mailbox links do not establish the owner's
personal affiliation or non-affiliation. A future authorized reviewer receives
these historical restrictions in the effective review-denial set separately from
its recorded account/affiliation conflicts. No historical record is deleted,
reclassified as a verified real legal company, or approved by this work.

The owner personally runs this in the existing private VPS root SSH session:

```sh
python3 /opt/seedtrade-production/admin-preparation/company-review-20261120/scripts/enroll-admin-privately.py
```

1. Type `ENROLL`, then choose and confirm the separate password through hidden
   prompts. The owner-run command creates the identity-encryption key and TOTP
   material privately; the agent does not run this command or generate those secrets.
2. In a second private root SSH session, open the protected enrollment JSON path
   displayed by the command. Add its secret to an authenticator: issuer
   `SEEDTRADE.EU Administration`, account `info@seedtrade.eu`, SHA1, six digits,
   30 seconds. Do not paste the file, secret, password or code into chat.
3. Enter the current authenticator code into the first session's hidden prompt.
   Successful confirmation prints `MFA_ENROLLED_REVIEW_DISABLED` and creates an
   encrypted recovery snapshot using the existing backup implementation/recipient.
   Return only that status. Independent authenticated backup readback can then be
   performed on the existing owner recovery computer without exposing secrets.

If provisioning succeeded but confirmation was interrupted, the same command with
`--confirm` reuses the protected identity/key and prompts privately for the existing
password and fresh code. Initial enrollment refuses to overwrite existing private
material. An ambiguous provisioning error requires reconciliation, not a blind retry.

The separate root-only key file is included in the owner-run encrypted snapshot;
it is not added to the disabled serving API's environment. No service restart,
gateway change, public Admin activation, Marketplace activation, Member/company
creation, real email or transaction test is part of this procedure. Operational
company-review authority remains disabled until separately authorized conflict
controls are satisfied. Rollback retains expanded schema and identity/audit data;
never promote an enrollment-only identity or narrow its role ENUM on rollback.
