# Project Setup

## Prerequisites

- Node.js 20+ (developed on 21.6.2)
- npm 10+

## Installation

```bash
git clone https://github.com/lahirudw/budget-management-app.git
cd budget-management-app
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173/budget-management-app/`.

The `base` path is set to `/budget-management-app/` for GitHub Pages compatibility. During local development, Vite handles this automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Generate icons, type-check, and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run generate-icons` | Regenerate PNG icons from SVG source |
| `npx vitest run` | Run all tests once |
| `npx vitest` | Run tests in watch mode |

## Testing

Tests use **Vitest 2** with **happy-dom** environment:

```bash
npx vitest run
```

```
 6 test files, 58 tests passing
 ~700ms total
```

Test files:
- `src/test/budgetCalculator.test.ts` -- core engine (17 tests)
- `src/test/dateHelpers.test.ts` -- date utilities (11 tests)
- `src/test/verdictEngine.test.ts` -- verdict generation (7 tests)
- `src/test/integration.test.ts` -- end-to-end flows (8 tests)
- `src/test/recurrenceEngine.test.ts` -- recurring obligations (6 tests)
- `src/test/edgeCases.test.ts` -- boundary conditions (9 tests)

## Build

```bash
npm run build
```

This runs three steps:
1. `scripts/generate-icons.mjs` -- renders SVG icon to 192px, 512px, and 32px PNGs using sharp
2. `tsc -b` -- TypeScript type checking
3. `vite build` -- production bundle with PWA service worker generation

Output goes to `dist/`. The build produces:
- Main JS bundle (~324 KB, ~103 KB gzip)
- Trends chunk (~372 KB, ~110 KB gzip, lazy-loaded)
- CSS (~25 KB, ~5 KB gzip)
- Service worker with 15 precached entries

## Deployment

Deployment is automated via GitHub Actions. Every push to `main` triggers:

1. `.github/workflows/deploy.yml` runs
2. Builds the app with Node 20
3. Deploys to GitHub Pages via `actions/deploy-pages@v4`

### Manual deployment

If you need to deploy manually:

```bash
npm run build
# Upload the dist/ folder to any static host
```

### GitHub Pages setup

1. Go to repo Settings > Pages
2. Source: **GitHub Actions**
3. The workflow handles the rest

### SPA routing on GitHub Pages

GitHub Pages doesn't natively support SPA routing. Two files handle this:

- `public/404.html` -- redirects deep links to `index.html` via query string encoding
- `index.html` script -- restores the original path via `history.replaceState`

## PWA Configuration

Configured in `vite.config.ts` via `vite-plugin-pwa`:

- **Service worker:** Workbox `generateSW` mode with `autoUpdate` registration
- **Precaching:** All JS, CSS, HTML, icons cached on first load
- **Offline navigation:** `navigateFallback` to `index.html`
- **Manifest:** Standalone display, portrait orientation, `#030712` theme

### Icons

Source: `public/icon.svg` (blue $ on dark slate rounded rectangle)

Generated at build time by `scripts/generate-icons.mjs`:
- `public/icon-512.png` -- manifest icon + maskable
- `public/icon-192.png` -- manifest icon + apple-touch-icon
- `public/favicon-32.png` -- browser tab favicon

## Environment Notes

- **Node 21.6.2 compatibility:** Some transitive dependencies emit `EBADENGINE` warnings. These are non-fatal and everything works correctly.
- **Vitest 2** (not v4) and **happy-dom** (not jsdom) are used for Node 21 compatibility.
- **Vite 5** (not v6) for the same reason.
