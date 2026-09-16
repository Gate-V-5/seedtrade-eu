# Master Build decisions

User authorizes continued development with Plan A PASS and Plan B PENDING / BACKUP_WARNING. This supersedes earlier dual-backup gate. No deployment authorized.

Canonical workspace: work/master-build. Original recovery directory, ZIP and manifests unchanged. All 387 recovery payload files copied and SHA256 verified, including all raw data. No component removed. Recovery branch remains immutable; subsequent stages use a separate build branch.

Preserve frozen phenology classifier and DIRECT/PROXY/CONTEXT restrictions. Recovered source-neutral TradeObservation and validation code are extended, not replaced. Header-only source responses are missing evidence, not zero trade.
