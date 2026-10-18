# Market Cards V1.1 — offline release candidate

Scope:53 existing commercial cards in Catch/Cover and Fodder/Amenity. A single canonical map supplies both category appearances, snapshot appearances and detail pages. Existing taxonomy, Market Watch, customs data and protected visuals are unchanged.

Public commercial-price presentation has two states:Estimated Market Range with a numeric EUR/kg interval, or Price discovery in progress. Labels are localized EN/DE/FR/ES/IT. Customs trade unit values retain their distinct indicator label and are not used as a commercial price anchor.

The preparation model is stored in the private recovery package:model/build.py and model/config.json. It reuses the193 V1 observations and full53-card enrichment. Default uncertainty is±20%, an uncalibrated configurable editorial assumption, not measured model accuracy. Per-card overrides accept a nonnegative absolute EUR/kg or percentage margin. For one anchor p the interval is[max(0,p−margin),p+margin]; for a comparable group it expands the observed minimum and maximum. Bounds round outward to EUR0.01/kg. No source-count minimum applies.

Eligible anchors are public sowing-seed asks normalized to net EUR/kg, in agricultural packs≥5kg, without an unavailable flag. The pack threshold is this pilot's segmentation choice, not a universal wholesale definition. Small packets and unavailable asks remain in research evidence. Historical/undated asks retain their dates and are never LIVE. No freight, FX, certification-class, quality or wholesale discount is invented.

Comparability groups match country,variety,certification,organic status,treatment,pack size,VAT basis,delivery basis,quantity context and seller. Conservative matching can leave one observation; this is allowed. These are source-segment estimates, not a calibrated pan-European wholesale index. Original asks,source URLs,hashes,dates,excluded observations and assumptions remain in private calculation traces, outside src/public/dist. The public projection contains only state and bounds.

49 numeric states;4 discovery states:fodder-turnip,dill(small packs only),sorghum(no pure-species numeric anchor),hemp(unavailable reference). All19 shared cards have numeric states. New prices do not overwrite any historic customs series.

Deployment is not authorized. Before publication:review the assumed margins and market basis, complete real browser responsive QA, then obtain separate release authorization. Full device/assistive QA has not been performed. No claim of current stock,confirmed offer,calibrated accuracy or LIVE price is made.
