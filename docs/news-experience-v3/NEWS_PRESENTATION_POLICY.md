# Canonical News Experience V3

This is the single presentation standard for homepage, /news archive and /news/*
articles in EN/DE/FR/ES/IT. It supersedes conflicting earlier card/caption layout
instructions; photographic rights and PUBLIC_SAFE gates remain mandatory.

## Discovery cards

One shared NewsCard is used for homepage highlights and all archive categories.
Only photograph, category, region, original publication date, full headline and
Read more appear. No author, licence, processing notes, provenance/status codes,
summary, internal source classification or technical metadata belongs in cards.
Cards use a reserved16:9 media region, width100%, object-fit:cover and the image's
reviewed focal position. There are no side thumbnails, contain gutters or fixed
pixel image heights. A flex column stretches cards to the row and anchors Read
more at the bottom. Archive desktop/tablet has2columns; <=620px has1column.
Homepage uses available verified streams and reflows4/3/1/0cards without empty
slots. The category navigation remains. Missing images preserve the same media
box with localized neutral text and article navigation, never an unrelated
image. Article heroes do not upscale beyond recorded source width; the retained
640px historical photo needs editorial review before a larger reuse. Existing
archived SVG identities are preserved under the explicit immutable legacy rule;
this is not permission to add schematic images to future stories.

## Article attribution and references

Display `Photo: [original image title] — [photographer]`, with title linking to
the exact original image page. Native keyboard-accessible Photo credits details
retain licence name/link, an honest adaptation notice and an illustrative-photo
disclaimer. Keep full processing details, original dates, hashes and licence
evidence in internal registries/recovery. Never imply stock photos document an
event or field; never weaken ShareAlike, attribution or commercial-use review.

Sources & References shows organization, verified original document title/link
and verified date when available. Titles stay in their source language. Missing
URL means no invented link; unknown title/date is omitted. Never turn a URL slug
into a purported verified title. Credential-bearing or non-HTTPS references are
not linked. Ambiguous Copernicus dates are not shown as resolved; the existing
article text and internal evidence retain the discrepancy.

Internal verification codes, Checked dates, source tiers, evidence labels and
pipeline notices are not editorial UI. Full source records and eligibility
checks remain unchanged. New references require a reviewed presentation entry.
The build gate checks every prerendered article, and stops publication when an
internal pipeline term remains in public text. It must not silently rewrite
immutable narrative to pass.

## QA and release

Run image/rights validation, check_news_v3.mjs, all regressions and production
build. Check every article and category in5languages;6computed widths;portrait,
landscape,square media and missing-photo behavior;no captions in discovery;
compliant article disclosures;reference links;keyboard;overflow;unchanged other
homepage sections. Preserve article and image registries byte-for-byte.

CSS lives in one consolidated News Experience V3 block. Remove superseded news
selectors instead of appending competing overrides. Compare non-news CSS rules
and media conditions to the production baseline to protect other sections.

Actual desktop/tablet/mobile browser QA is separate from DOM/CSS tests. An
unavailable viewport is BLOCKED/SKIP, never visual PASS. Do not release with a
failing mandatory gate.

## Approved narrow public presentation exception

On 2026-10-16 the owner authorized suppressing only the exact internal Market
Signal sentence in `europe-summer-crop-heat-drought-2026`, `why_it_matters`, and
its exact DE/FR/ES/IT equivalents. `src/newsPresentation.mjs` pins all five full
original paragraphs and returns only the unchanged preceding agronomic sentence
when the complete paragraph matches. Other fields, articles, altered paragraphs
and unknown wording remain unchanged; this is not a keyword filter. English
fallback uses the same exact-match rule. Original article JSON, translations,
source records and quantitative Market Signal separation remain intact.
Internal provenance belongs in stored evidence, not reader-facing editorial
prose. Any additional narrative exception requires its own editorial review.
