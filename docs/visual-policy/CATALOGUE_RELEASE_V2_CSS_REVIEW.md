# Reviewed catalogue CSS update — release V2

Authority: owner's “SEEDTRADE — GIT/HOSTINGER COMPATIBLE RELEASE V2” local preparation instruction, 12 November 2026. This authorizes preparation and verification, not push or production deployment.

The documented update mechanism in `VISUAL_ASSET_POLICY.md` requires a deliberately reviewed inventory and independent checksum update. Only the `src/marketCatalogue.css` entry changes, from `ee8cb046c06d7104b955df73fd191333952d7bc06cc9407522adc9a487351dfc` to `9acd57f87c930db58a902a0bdc6325c9c8431c5ab402650f095c308034a734ed`. The approved additions style catalogue search, Clear search and contextual Production Evidence links/focus. Existing image framing, layout rules, taxonomy, images, source originals, all 18 derivatives, rights evidence and visual approval identifiers remain unchanged.

The inventory checksum changes from `deacee4f2f4486e50faa658b6ab995ea0b6cd0b2c48daa508265a18909505811` to `18ed56d5f4c41d15e0ef944136adaca3398d5ce776bc68454cff3d97010f8206`. `validate_visual_assets.mjs` changes only that pin. No guard assertion, skip path, runtime override, image approval or license statement is changed. Focused mutation tests must continue to reject altered inventory, CSS and image bytes.

Eight existing immutable cached chunks are now tracked in `public/assets/`: `AppV2-DMDzLkFX.js`, `MarketCatalogue-oWbuu2vY.js`, `MarketCategories-uQOA9Nxx.js`, `ProductionIntelligence-DV4OIR8N.js`, `TradeCoverage-h5T_2TQB.js`, `i18n-OGx0jO2p.js`, `index-Dl5h7D5k.js`, `trade_pulse_public-BpRoQVLO.js`. They are copied byte-for-byte from the verified production checkpoint and are retained for cached historical URLs. They are not new active analytics entrypoints.

The six `public/catalogue-v3/{cereals-pulses,fodder-amenity,catch-crops,oil-fibre,maize-sorghum,vegetables}.png` originals remain intact in source/recovery. The unchanged normal finalizer omits them from `dist`, as it already does in production. Existing pages use reviewed WebP derivatives; none of those six PNG paths is present in the current production output.

The normal npm commands and all validation/finalization stages remain unchanged. A source-only SSR loading correction uses Vite's production SSR build inside the existing prerender script to avoid the Windows dev-runner CommonJS React error. Rendering, hydratable markers, private-shell isolation and public metadata generation remain in the same pipeline. No separately invoked packaging driver supplies missing output afterward.
