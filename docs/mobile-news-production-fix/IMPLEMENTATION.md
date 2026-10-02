# Mobile Daily News production fix

Canonical starting main: 3fd521723e3e7ccbecf0dad579c42c86a8e595d1.
Existing workspace was clean and matched GitHub main before changes.

Root cause: legacy .news-list .news-card > div { grid-column:1 } persisted
on .news-card-body. Grid columns on the card did not override placement of its
children. The image auto-placed in the first row, while the body was forced into
column 1 in a later row. This produced a blank right cell and narrow headline.
The earlier CSS/DOM checks did not inspect sibling grid placement.

Mobile-only CSS (max-width 620px) now explicitly assigns the image to column 1,
row 1 and the information body to column 2, row 1. Tracks use 35% / remaining
width, zero gap and card padding, 8px body padding, no artificial min-height or
aspect ratio. The absolutely positioned cover image fills the stretched left
cell; full headlines naturally wrap across the stretched right column.
A responsive label shows EUROPE on the first mobile card while retaining EU on
the approved desktop. The four photos, card content and article pages are kept.

check_mobile_news_placement.mjs reproduces the prior column-1 defect from the
canonical commit, checks explicit shared-row placement at 360/390/430 for all
five languages, compares full headlines and asset URLs, checks mobile metadata
visibility, and compares desktop computed styles and visible text against the
canonical version at 768/1024/1440. This is a computed CSS/DOM placement contract,
not a browser pixel measurement. Browser QA remains BLOCKED_ENVIRONMENT based
on the session's net::ERR_BLOCKED_BY_CLIENT; no local Chromium/Playwright/
Puppeteer renderer is installed. True visual output needs production inspection.

Evidence and Context assets/registries, Market Signal, navigation, routes,
article hero/narrative/source logic, B2B form/server and numeric datasets have
no modifications. Real emails=0; B2B tests use mocks only. No manual Hostinger
deployment, Globalwits, browser logins or local PC folder access.
