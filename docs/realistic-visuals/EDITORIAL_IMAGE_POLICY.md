# Editorial image policy

Daily News: each new article must have a new, subject-specific realistic
photograph stored locally. Use only assets with documented commercial reuse
permission; search visibility is not permission. Record article mapping, original
source URL, author, source platform, licence and URL, retrieval date, changes,
alt text, dimensions and focal point in src/data/news_visuals.json. Never hotlink.
Build validation rejects new stream articles without a unique photograph and
complete provenance. The four pre-stream archive articles retain their original
illustrations; the four current stream articles use four new photographs.

Evidence: the three fixed owner-approved assets live in a separate registry,
src/data/fixed_editorial_visuals.json. Daily News refreshes cannot select or
replace them. Six byte-identical supplied PNG originals are retained in
assets/owner-approved; SHA256 is checked at build. WebP derivatives use quality
93 and at most 1600px. No content edits or regeneration.

Context: supplied Euroseeds, INTERPOM and Lagrenas assets are owner-approved for
these editorial uses. Approval is not represented as a public stock licence.
For future Context articles prefer partner-supplied or official event images,
otherwise relevant commercially licensed imagery; record permission/provenance.
Preserve Valencia / Spain, Belgium and Lithuania labels.

Four Daily News photos come from Wikimedia Commons under individual CC BY-SA
2.0, 3.0 and 4.0 licences. Optimized derivatives remain under their original
licences. Author/source and licence links plus modification notice appear below
the article hero. Originals are retained in assets/licensed-news-originals.
Photographs are illustrative: the English wet field is not presented as the
reported Latvian field; graded seed potatoes are not presented as a specific NAK
inspection. Venue photograph depicts Valencia Conference Centre, not an event
attendance record. Owner Evidence imagery does not substantiate numerical data,
actual facilities or live monitoring points.
