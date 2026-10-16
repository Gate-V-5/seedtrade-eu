# News Photography Standard V1

Effective 16 October 2026. This standard supersedes permission to add schematic
News visuals. Every future News article, in every category and EN/DE/FR/ES/IT,
requires a real subject-specific photograph. AI-generated imagery, icons,
cartoons, unrelated stock, watermarks, editorial-only licences and unverifiable
rights are not accepted as documentary photography. PUBLIC_SAFE and factual
source gates remain unchanged. Images do not substantiate article claims.

## Required editorial workflow

1. Read the complete article. Record crop/species (with botanical name), region,
   season, crop stage and conditions; inspect the actual candidate photograph.
   A generic historical photograph must be labelled as illustrative, with its
   real place/date if known. Never imply it shows a reported field/event or
   today’s conditions. Do not infer drought or management need from a stock image.
2. Verify the exact image’s source page, photographer and rights. Prefer
   appropriately licensed Wikimedia Commons, Unsplash or Pexels. A platform name
   or search thumbnail is not permission. Confirm commercial use, redistribution,
   local hosting, cropping and conversion; capture the exact licence terms and
   attribution/ShareAlike obligations. Unsupported licences require independent
   review and a deliberate validator update; never relabel them to pass a build.
3. Keep an unmodified original in assets/licensed-news-originals and full
   source-page/licence evidence in the recovery checkpoint. Record original and
   derivative SHA256, source page and file URL, author, title, licence and link,
   verification/retrieval date, relevance rationale and changes in news_visuals.
   Record reviewed rights in docs/news-photography-v1/LICENSE_EVIDENCE.json.
4. Host a local optimized WebP in public/editorial; 16:9, 960–1600px wide,
   under 600 KB. Never upscale a small original. Preserve natural colours; no
   invented content. Record dimensions and focal position. Responsive cards may
   crop further on mobile; verify the focal subject remains visible.
5. Supply meaningful ALT, illustrative caption, modification notice and neutral
   missing-image text in all five languages. Preserve the photographer’s name,
   source and licence links; title/author/licence and change notice are visible
   on cards and article pages for V1 images. Distribute CC derivatives under
   their original licence; do not impose additional reuse restrictions.
6. Run node scripts/validate_editorial_assets.mjs, the image policy/DOM tests,
   npm run build and npm test. Build fails closed for missing provenance,
   unsupported licences, malformed/local-path violations, absent translations,
   wrong image bytes or schematic/AI replacement attempts.
7. Desktop AND mobile browser QA is required before final editorial sign-off:
   verify loaded image, framing, attribution, ALT, links, absence of layout shift,
   and EN/DE/FR/ES/IT. Save screenshots/viewport measurements. A DOM/CSS test or
   HTTP 200 is not visual QA. Record unavailable checks as BLOCKED/SKIP and keep
   the release review incomplete; never mark them PASS. Verify the deployed
   frontend artifacts against the tested build after the existing release.
8. If a suitable licensed photo is unavailable, stop that image replacement or
   hold the new article for editorial review. Do not insert a schematic. If a
   V1 image fails at runtime, display only a localized neutral unavailable-image
   message; preserve the article link and reserved image area.

## Historical compatibility and protected assets

Eight pre-existing unrelated News records and their visuals are hash-pinned in
src/data/news_image_legacy_v1.json. This preserves approved archives and current
Trade/Events appearance; it does not authorize schematic imagery for future
stories. Changing a pinned article or its image requires a new image review and
removal of that explicit legacy entry. Do not add future stories to this list.

The Weather/Agronomist replacements are V1 photos. Their old SVG files remain
historical unused assets; the current mappings never select them as fallbacks.

Six owner-approved fixed assets are separate in fixed_editorial_visuals.json;
Daily News updates must not alter them. Approval is not a stock licence. Their
original PNG hashes, contextual labels and existing uses remain protected.
