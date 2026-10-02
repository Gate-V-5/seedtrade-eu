# Production responsive UI fixes V1

Canonical starting commit: 6031f3cc51cca221dcd9070fd3ce53d5df36bbc3.
The current clean checkout matched GitHub main before edits. Old dirty copies
and prior Dropbox checkpoints were not changed or used as implementation sources.

Homepage NewsCard compact mode now renders only the shared visual, stream,
publication date, full headline and Read more. Summary, event description,
linked-species metadata, Why it matters and source detail remain in archive and
article contexts. The existing multilingual card test now checks localized
headlines on the homepage and retains summary checks elsewhere.

Scoped final CSS gives desktop discovery images a nonshrinking 150px container.
Mobile cards use one compact row with a 104px illustration and a flexible text
column, a 112px minimum image area and readable 15px full headlines. Headlines
are not clamped or clipped. This favors readability over forcing two narrow
columns at 360px. Tablet cards use two columns, desktop uses four. Contain sizing
keeps the complete canonical illustration visible, and homepage/article asset
URLs stay identical. No illustration, article narrative or article CSS changed.

At widths up to 768px, Trade Pulse retains all 15 metrics, the 12-month chart,
period context, sources, limitations and full dashboard link. The panel uses 12px
padding, compact flow blocks, and three metric tiles per row instead of stacked
single metrics. Values wrap where needed. The existing header language selector
is visible in the same header row as the logo and menu, with a 40px minimum
control height. Header behavior and localization architecture are unchanged.

Validation:
- 229 Python tests PASS, including targeted responsive regression;
  4 B2B mock tests PASS; real email sends=0.
- Build PASS; static-first prerender 44 routes PASS.
- 220 route/language hydration combinations PASS.
- Daily News PUBLIC_SAFE validation PASS: 8 records / 19 active sources.
- Media-aware CSS/DOM contracts PASS at 360, 390, 430, 768, 1024 and 1440px,
  each in EN/DE/FR/ES/IT. Checks include bounded image containers, no narrative
  paragraphs in discovery cards, media grids, wrapping, language control visibility,
  15 metric values and preserved article hierarchy.
- Header, TradePulseSignal and NewsItem bodies match the starting commit.
- Asset reuse/source traceability and EN fallback checks PASS.
- No generated numerical dataset, server, publication gate, calculation or
  deployment configuration changed. Final diff whitespace checks PASS.

Browser QA is BLOCKED_ENVIRONMENT: Cloud Browser cannot open the local preview
at http://127.0.0.1:4173/ (net::ERR_BLOCKED_BY_CLIENT). No repeated waiting or
manual deployment. CSS/DOM checks do not measure browser geometry, actual card
height, pixel cropping or horizontal overflow. Final desktop/mobile visual
inspection remains necessary on production after automatic Hostinger deployment.
