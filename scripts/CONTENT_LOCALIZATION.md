# V1-B public editorial localization

One canonical News, Insights or Weather record retains its English fields.
`localizations.de/fr/es/it` contain textual fields only. EN is never duplicated.
Use the existing LanguageProvider/useLanguage and `localizedContentText(record,
language, field)`; no second selector, persistence mechanism or DOM wrapper.

Every missing, blank or invalid translated field independently falls back to
canonical EN. Unsupported languages use EN. Source titles, source names, authors,
identifiers, slugs, categories, publication controls, URLs, dates, measurements,
claims/evidence and SEO remain canonical, outside translations. Proper event and
programme names intentionally retain their official spelling.

Insights and future Weather sections use canonical `content: [{heading, body}]`
plus matching localized section arrays. Resolve `content.0.heading` and
`content.0.body` separately. Canonical section order/count is authoritative;
translations cannot add sections. Weather region display names use
`regions.0.name`; region codes/countries remain canonical. Weather has no published
regional impact narratives; none are invented here.

The same resolver supports `current_situation`, `crop_weather_interpretation`,
`regional_context`, `risk_narrative`, `opportunity_narrative`, `interpretation`,
`explanation` and `context` for future PUBLIC_SAFE records. Future producers must
provide canonical EN before translations and keep their publication/evidence
controls. Existing EN-only exports continue to work. No new editorial producer,
Daily Intelligence, SEO route tree, sitemap or deployment configuration is added.

Check exports/rendering with `node scripts/check_i18n_v1b.mjs`; build and run
`node scripts/check_i18n_dom.mjs` to exercise React hydration and stored language
selection across the existing 40 routes. B2B tests mock delivery only.
