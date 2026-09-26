# SeedTrade.eu

Public source for the SeedTrade.eu read-only European seed market intelligence website.

## Build and test

Requirements: Node.js, npm, and Python 3.

```sh
npm ci
npm test
npm run build:vite
```

The production build is written to `dist/`. The build includes prerendered, static-first HTML for public routes so core content remains visible without JavaScript.

## Publication safety

This is a **PUBLIC repository**. Only data explicitly approved as `PUBLIC_SAFE` may be committed. Private, licensed, raw-source, credential, operational, and recovery material must remain outside this repository. The committed `src/generated/` files are the reviewed public website data layer; private source and transformation layers are intentionally excluded.

## EU Seed Trade Pulse

`src/generated/trade_pulse_public.json` is the publication-safe aggregate derived from verified Eurostat COMEXT DS-045409 rows. It separates EU internal dispatches, extra-EU imports and extra-EU exports; excludes the 2026-07 partial period; and labels weighted trade value per net kilogram as **unit value**, not market price. The raw normalized COMEXT source is intentionally kept outside this public repository. `scripts/generate_trade_pulse.py` regenerates the public aggregate when an authorized verified source path is supplied.
