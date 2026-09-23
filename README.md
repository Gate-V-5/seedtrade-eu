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
