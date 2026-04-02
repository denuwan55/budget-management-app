# MindfulSpend

A personal mindful spending PWA that helps you make better purchase decisions by showing the real-time impact of any expense on your monthly budget.

**Live app:** [lahirudw.github.io/budget-management-app](https://lahirudw.github.io/budget-management-app/)

## What It Does

You see something expensive, feel the urge to buy it, and open MindfulSpend. Type the amount and instantly see:

- Will this breach your discretionary budget?
- How many days of spending does this cost?
- Does it affect your savings target?
- Are any upcoming obligations at risk?

The app gives you a clear verdict (from "Comfortable" to "You can't afford this") so you can make an informed decision in under 10 seconds.

## Features

- **Quick Check** -- instant impact analysis for any purchase amount with 5-level verdict system
- **Purchase Registration** -- log purchases with category tags, match against known obligations
- **Budget Dashboard** -- daily budget, free pool, overdue alerts, validation warnings
- **Obligations Management** -- track bills with due dates, mark paid, recurring support
- **Category Tagging** -- 7 categories (Food, Transport, Entertainment, Healthcare, Shopping, Bills, Other)
- **Spending Trends** -- stacked bar chart (last 6 months) and category donut breakdown
- **Month Rollover** -- carry over unspent budget, auto-generate recurring obligations
- **Data Export/Import** -- full JSON backup and restore
- **Offline PWA** -- works without internet after first load, installable on home screen

## How the Budget Engine Works

```
Free pool = Total available - Pending obligations - Savings target - Discretionary spent
Daily budget = Free pool / Days remaining in month
```

The daily budget self-corrects: $0-spend days increase tomorrow's budget automatically. Obligations clear themselves when matched to purchases. Mid-month edits propagate instantly.

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 4 |
| Database | Dexie.js (IndexedDB) |
| Charts | Recharts 3 |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest 2 |
| Hosting | GitHub Pages |

All data stays local in your browser's IndexedDB. No server, no accounts, no tracking.

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npx vitest run

# Production build
npm run build
```

## Install as PWA

### iPhone (Safari)
1. Open the app URL in Safari
2. Tap **Share** > **Add to Home Screen**
3. Name it "MindfulSpend" > **Add**

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the "Install" banner or menu > **Install app**

## Project Structure

```
src/
  db/              Data model, Dexie database, repositories
  engine/          Budget calculator, verdict engine, recurrence, validation
  hooks/           React hooks (useBudgetData, useTrendsData)
  components/
    quickcheck/    Quick Check screen (landing page)
    dashboard/     Budget summary + validation
    obligations/   Bill management
    purchases/     Purchase log + filters
    trends/        Spending charts (lazy-loaded)
    settings/      Budget config, month rollover, export/import
    layout/        App shell + bottom navigation
    shared/        Reusable components (Modal, CurrencyInput, etc.)
  lib/             Formatters and utilities
  test/            Unit and integration tests
```

See the [docs/](docs/) folder for detailed setup and architecture documentation.

## License

Private project. Not licensed for redistribution.
