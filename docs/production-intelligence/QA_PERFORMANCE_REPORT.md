# Production Intelligence V1: rendered QA and performance gate

Recovered the exact existing implementation, verified against every repository member in the canonical 88,593,930-byte checkpoint. Its SHA256, ZIP CRC and 231 member hashes passed. Connected Dropbox manifest evidence matched the preserved local archive. No implementation was recreated, no research repeated, no taxonomy expanded and no canonical V5 data modified.

## Rendered QA remains blocked

Local Playwright cannot launch: its Chromium headless-shell executable is missing. One bounded official installation attempt (25 seconds) received an invalid/truncated archive (`End of central directory record signature not found`) and timed out. No further infrastructure retries or circumvention occurred. The earlier cloud browser preview timeout was not repeated. None of the requested six widths has an actual rendered visual PASS. CSS/DOM and SSR results remain separate evidence; they cannot establish clipped text, physical overflow, wrapping quality or readability.

## Measured bundle and minimum optimization

Production data was previously in the initial bundle. The only application change replaces its eager import with a conditional dynamic import. SSR still loads the same component before static rendering. In the browser, module initialization awaits Production only for `/production-intelligence` (including its trailing-slash form) before hydration; other pages do not request it. Existing full-page navigation and routing remain intact. No new runtime dependency, CSS change, UI redesign or dataset change was introduced.

Initial static JS closure fell from 1,539,106 to 660,146 bytes (57.11%). Level-6 gzip sums fell from 270,336 to 198,412 bytes (26.61%). The current entry is 513,379 bytes and its shared initial chunk is 146,767 bytes. The lazy Production chunk is 880,712 bytes. Public source JSON remains 1,280,851 bytes (81,083 gzip); these JSON bytes are transformed into the separate Production chunk. Build >500 kB warnings remain for the lazy chunk and the pre-existing main code. Broader splitting was outside this targeted task.

`check_production_bundle.py` traverses real built static imports and verifies that the Production chunk is absent from the initial closure, an actual conditional dynamic import exists, and the V5 observation marker is present only in the route chunk. Sizes use actual file bytes, level-6 gzip, zero timestamp and the sum of separately compressed responses; this explains differences from Vite's displayed compression numbers. Source projection SHA256 is unchanged: `458bc3f0328fd7b7b879d2536685a3d485d5de626cd74e7f8096b59cc14308c4`.

## Regression gates

Build and 45 prerendered routes passed. Static/client initial markup and interactive Production controls passed; a two-year gap remains absent rather than zero. Full multilingual hydration, production evidence tests, mock B2B regression and all original suite checks are rerun. The existing physical-assets test now accepts valid shared-module preload references while retaining exactly one entry, one stylesheet and physical-file checks for every reference. It explicitly prevents eager Production preload on the homepage. One lazy-bundle regression was added.

PUBLIC_SAFE source projection, canonical identities, all original metrics and source grains remain unchanged. The 20 isolated source anomalies remain excluded upstream. No credentials, private paths or research binaries enter public data. Daily News, Trade Pulse, Weather, Research & Partner Insights, approved production visual, header/footer and V5 source are unchanged.

No commit, push, deployment, Hostinger trigger or real email. READY_TO_PUSH remains NO solely because real rendered visual QA is unverified. The previous checkpoint is preserved; a separate QA checkpoint includes complete source/build state, immutable V5 dependency, baseline Git history, tools, performance evidence and regression logs.
