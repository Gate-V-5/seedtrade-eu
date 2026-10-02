# Daily News article visuals and compact layout

Base: b1eaf3250978334590d9283dad3b7de9c9411469.
The separate clean checkout started at this exact GitHub main commit. The stale
2424fd0e working copy was neither changed nor used as a source.

Eight existing articles have original, text-free project SVG illustrations.
`src/data/news_visuals.json` owns one asset URL per canonical article slug,
PUBLIC_SAFE classification, creator, reuse basis, topic and a false documentary
 evidence flag. Cards and article heroes resolve the same entry. Assets are
illustrative rather than documentary; the hero caption and alt text use the
existing five-language UI catalog. No outside photographs, logos or numerical
claims are embedded. A future article must receive a reviewed manifest entry.

News-only CSS changes reduce section margins from 28px to 15px (46.4%),
separator padding from 32px to 17px (46.9%), and Why it matters vertical padding
from 22px to 12px (45.5%). Hero images are fluid, capped at 320px, and preserve
the whole illustration with contain sizing. Evidence badges remain derived from
unchanged claims but use 10px typography. The source reference area retains links,
source types and checked dates with 12px typography and a quiet top border.
News data, fingerprints, multilingual narrative, publication gates, archive,
URLs, numerical datasets, server behavior and deployment configuration are unchanged.

Validation:
- npm run build: PASS; SEO prerender 39 public and 4 private/noindex routes;
  static-first prerender 44 routes.
- npm test: 228 Python tests PASS, including the existing 19 nested Daily News
  tests and the new canonical-visual/traceability test; 4 mocked B2B tests PASS.
- node scripts/check_i18n_dom.mjs: 220 route/language hydration combinations,
  selection/persistence, blocked storage and mocked B2B feedback PASS; zero emails.
- node scripts/validate_daily_news.mjs: 8 public records / 19 active source families PASS.
- Visual SSR/DOM assertions: 4 homepage cards and 8 archive/detail pairs in
  EN/DE/FR/ES/IT; identical asset URLs; translated illustration labels/alt text;
  correct hero order; preserved source links and localized evidence labels.
- CSS/DOM: fluid width, automatic hero height, compact computed section and
  badge dimensions, mobile media rules and uncropped card sizing PASS.
- Rasterized SVG contact sheet inspected; no embedded language text.
- git diff --check PASS; no protected-data or server diffs.

Validation limit: a real desktop/mobile browser screenshot review could not run.
The cloud browser blocks localhost with ERR_BLOCKED_BY_CLIENT, and the official
Playwright Chromium download returned truncated archives. Responsive behavior was
checked through CSS/DOM contracts, not browser pixel measurements. Deployment is
left to the existing Hostinger GitHub integration; no manual deployment is made.
