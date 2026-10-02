# Realistic visual upgrade V1

Starting GitHub main: f43c9e19f63202d034d9976e894b41f1d85aa04d.
Clean checkout in the existing seedtrade-visual-upgrade workspace. No old dirty
workspace or historical checkpoints used.

The four homepage stream articles share the same local photograph with their
archive and article pages. Homepage cards retain full localized headlines,
category, secondary geographic label, compact date and Read more. No excerpts.
At 360/390/430px cards form one vertical list of horizontal rows: 96px left image
with cover crop and flexible right content; normal word wrapping, no line clamp.
Tablet and desktop retain two/four columns. Evidence uses three fixed approved
WebP assets. Context uses the three exact approved graphics, contained so logos,
event text and dates are not clipped, with explicit geographic labels.

Market Signal, 15 Trade Pulse metrics, localization/fallback, narrative content,
PUBLIC_SAFE gating, B2B server/form behavior, SEO and route architecture retained.
Network form testing uses mocks; real emails=0. No Globalwits or local PC access.

Cloud Browser local preview returned net::ERR_BLOCKED_BY_CLIENT.
BROWSER_QA=BLOCKED_ENVIRONMENT. CSS/DOM media checks do not measure actual browser
geometry, text line lengths, clipping or overflow; production visual inspection
remains an owner action after automatic deployment.
