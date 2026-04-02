# Phase 3 — PWA Setup + GitHub Pages Deployment

> **Goal:** Make the app installable as a PWA (Add to Home Screen), fully offline-capable, and deployed to GitHub Pages.
>
> **Prerequisites:** Phase 2 complete — full React app functional with all 5 screens.
>
> **Estimated deliverables:** ~6 new/modified files, ~200 lines of code + config

---

## Step 1: Install PWA Plugin

```bash
npm install -D vite-plugin-pwa
```

---

## Step 2: App Icons

### 2.1 Generate Icons

Create a simple icon for the app. For a personal app, a minimal SVG icon works:

Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1e293b"/>
  <text x="256" y="320" text-anchor="middle" font-size="280" font-family="system-ui" font-weight="bold" fill="#3b82f6">$</text>
</svg>
```

Generate PNG versions for the manifest (or use the SVG directly — modern browsers support it):

Create `public/icon-192.png` and `public/icon-512.png` — these can be generated from the SVG using any online tool, or you can use a simple script. For now, the SVG fallback works.

---

## Step 3: Web App Manifest & PWA Config

### 3.1 Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/budget-management-app/',  // Must match GitHub repo name
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MindfulSpend',
        short_name: 'MindfulSpend',
        description: 'Mindful spending impact checker',
        theme_color: '#030712',         // gray-950
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/budget-management-app/',
        scope: '/budget-management-app/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Cache the SPA shell for offline navigation
        navigateFallback: '/budget-management-app/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        runtimeCaching: [
          {
            // Cache Google Fonts if used (not currently, but future-proof)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### 3.2 Update `index.html`

Add meta tags for mobile web app behavior:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />

    <!-- PWA meta tags -->
    <meta name="theme-color" content="#030712" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="MindfulSpend" />

    <!-- Apple touch icon -->
    <link rel="apple-touch-icon" href="/budget-management-app/icon-192.png" />

    <title>MindfulSpend</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 4: Update Router for GitHub Pages

GitHub Pages serves from a subdirectory (`/budget-management-app/`). React Router needs to know this.

### 4.1 Update `src/App.tsx`

Change `BrowserRouter` to use the base path:

```tsx
<BrowserRouter basename="/budget-management-app">
```

### 4.2 Handle SPA routing on GitHub Pages

GitHub Pages doesn't support client-side routing natively (refreshing `/dashboard` would 404). The standard fix is a `404.html` that redirects to `index.html`.

Create `public/404.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>MindfulSpend</title>
    <script>
      // Single Page App redirect for GitHub Pages
      // Converts the path to a query string so index.html can restore it
      var pathSegmentsToKeep = 1; // Keep /budget-management-app/
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>
```

Add redirect handler to `index.html` — add before the `</head>` tag:

```html
<script>
  // Restore SPA route from 404.html redirect
  (function(l) {
    if (l.search[1] === '/') {
      var decoded = l.search.slice(1).split('&').map(function(s) {
        return s.replace(/~and~/g, '&');
      }).join('?');
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location));
</script>
```

---

## Step 5: GitHub Repository & Pages Setup

### 5.1 Initialize Git repo

```bash
cd /Users/lahirudw/Downloads/budget-management-app
git init
```

### 5.2 Create `.gitignore`

```
node_modules
dist
.DS_Store
*.local
```

### 5.3 GitHub Pages deployment via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 5.4 Create the GitHub repo

```bash
# Create repo on GitHub (requires gh CLI)
gh repo create budget-management-app --public --source=. --push

# Or manually:
# 1. Create repo on github.com
# 2. git remote add origin https://github.com/<username>/budget-management-app.git
# 3. git push -u origin main
```

### 5.5 Enable GitHub Pages

Go to repo Settings → Pages → Source: **GitHub Actions**

After the first push to `main`, the workflow runs and the app is live at:
`https://<username>.github.io/budget-management-app/`

---

## Step 6: Test PWA Installation

### On iPhone (Safari):

1. Open `https://<username>.github.io/budget-management-app/` in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Name it "MindfulSpend"
5. Tap "Add"
6. The app icon appears on your home screen
7. Tap it — opens full-screen, no Safari UI
8. Put your phone in airplane mode — app still works
9. All data persists in IndexedDB (local to the browser/PWA)

### Verify offline:

1. Open the app
2. Enable airplane mode
3. Navigate between all tabs — everything works
4. Enter an impact check — works (all calculation is local)
5. Register a purchase — works (saved to IndexedDB)

---

## Step 7: Phase 3 Completion Checklist

- [ ] `vite-plugin-pwa` installed and configured
- [ ] Web app manifest generated correctly
- [ ] App icons in `public/` (192px and 512px)
- [ ] `index.html` has PWA meta tags (theme-color, apple-mobile-web-app-capable, etc.)
- [ ] Service worker registers and caches all static assets
- [ ] SPA routing works on GitHub Pages (404.html redirect)
- [ ] `npm run build` produces clean production build
- [ ] GitHub Actions workflow deploys to GitHub Pages
- [ ] App accessible at `https://<username>.github.io/budget-management-app/`
- [ ] "Add to Home Screen" works on iPhone Safari
- [ ] App opens full-screen (no browser chrome)
- [ ] App works in airplane mode (full offline)
- [ ] Data persists after closing and reopening the PWA
- [ ] All Phase 1 tests still pass

---

## Phase 3 Deliverable: Update HANDOFF.md

After Phase 3 is complete, update `HANDOFF.md` with:
1. Full file manifest (all phases)
2. GitHub Pages URL
3. PWA installation instructions
4. Any SPA routing quirks encountered
5. What Phase 4 needs to address
