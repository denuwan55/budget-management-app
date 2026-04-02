# Architecture

## Overview

MindfulSpend is a client-side React SPA with all data stored locally in IndexedDB via Dexie.js. There is no backend server. The app is deployed as a PWA on GitHub Pages with full offline support.

```
User <-> React UI <-> Hooks <-> Repositories <-> Dexie.js <-> IndexedDB
                        |
                    Engine (pure functions)
```

## Data Layer

### Database (`src/db/database.ts`)

Dexie.js wraps IndexedDB with a clean async API. Schema version 2 (upgraded from v1 to add category indexing):

```
months:      ++id, &yearMonth
obligations: ++id, monthId, status, dueDate
purchases:   ++id, monthId, matchedObligationId, category, createdAt
settings:    &key
```

### Models (`src/db/models.ts`)

Four TypeScript interfaces: `Month`, `Obligation`, `Purchase`, `AppSetting`.

Key relationships:
- `Obligation.monthId` -> `Month.id`
- `Purchase.monthId` -> `Month.id`
- `Purchase.matchedObligationId` -> `Obligation.id` (optional)

### Repositories (`src/db/repositories/`)

Each table has a repository module with domain-specific methods:
- `monthRepository` -- CRUD + `getRecent(n)` for trends
- `obligationRepository` -- CRUD + status transitions (mark paid, cancel)
- `purchaseRepository` -- register (with optional obligation match + category), `getByMonthIds()` for trends
- `settingsRepository` -- key-value store

## Engine Layer (`src/engine/`)

Pure functions with no side effects or database access:

- **`budgetCalculator.ts`** -- `freePool()`, `dailyBudget()`, `checkImpact()`. Core math.
- **`verdictEngine.ts`** -- `generateVerdict()`. Maps impact numbers to 5 severity levels.
- **`dateHelpers.ts`** -- `daysRemainingInMonth()`, `yearMonth()`, `parseDate()`, etc.
- **`recurrenceEngine.ts`** -- `generateForNewMonth()`. Creates obligation instances for monthly/weekly/biweekly patterns.
- **`monthRollover.ts`** -- `performRollover()`. Orchestrates month transition (this one does touch the database).
- **`budgetValidator.ts`** -- `validateMonth()`. Returns warnings/errors for overcommitment, low budget, etc.

### Verdict Severity Levels

| Severity | Condition |
|----------|-----------|
| `comfortable` | Free pool positive, daily budget drops < 25% |
| `tight` | Free pool positive, daily budget drops 25-50% |
| `painful` | Free pool positive, daily budget drops > 50% |
| `savings_risk` | Free pool negative, savings covers it |
| `cannot_afford` | Free pool + savings insufficient, obligations at risk |

## UI Layer

### Hooks (`src/hooks/`)

- **`useBudgetData()`** -- primary hook. Uses `useLiveQuery` (Dexie reactive queries) to fetch current month's data and compute all derived values. Returns: month, obligations, purchases, freePool, dailyBudget, etc.
- **`useTrendsData()`** -- fetches last 6 months and aggregates purchases by category for charts.

### Screens

| Screen | Path | Key Components |
|--------|------|----------------|
| Quick Check | `/` | `QuickCheckScreen`, `ImpactDisplay`, `RegisterModal` |
| Dashboard | `/dashboard` | `DashboardScreen`, `BudgetSummaryCard`, `UpcomingObligations` |
| Obligations | `/obligations` | `ObligationsScreen`, `ObligationRow`, `AddObligationModal`, `MarkPaidModal` |
| Purchases | `/purchases` | `PurchasesScreen`, `PurchaseRow`, `PurchaseFilterBar` |
| Trends | `/trends` | `TrendsScreen`, `MonthlySpendingChart`, `CategoryBreakdownChart` |
| Settings | `/settings` | `SettingsScreen`, `MonthSetupModal`, `MonthRolloverModal` |

The Trends screen is **lazy-loaded** via `React.lazy()` to keep the main bundle under 350KB.

### Shared Components (`src/components/shared/`)

- `Modal` -- backdrop + centered card
- `ConfirmDialog` -- modal with confirm/cancel actions
- `CurrencyInput` -- formatted numeric input with $ prefix
- `VerdictBadge` -- color-coded severity display
- `EmptyState` -- icon + title + subtitle placeholder

### Navigation (`src/components/layout/`)

- `AppShell` -- `<Outlet />` wrapper with bottom padding for nav bar
- `BottomNav` -- 6-tab fixed bottom navigation using `NavLink`

## Categories (`src/db/categories.ts`)

Predefined list: Food, Transport, Entertainment, Healthcare, Shopping, Bills, Other.

Each category has:
- Tailwind badge classes (`CATEGORY_COLORS`)
- Hex color for charts (`CATEGORY_HEX`)

Obligation-matched purchases auto-categorize as "Bills". Uncategorized purchases are handled gracefully in filters and charts.

## Data Flow: Impact Check

```
User types amount
  -> QuickCheckScreen calls checkImpact(amount, month, obligations, savings, purchases)
    -> budgetCalculator computes freePool, dailyBudget, drop%, savings/obligation risk
      -> verdictEngine maps to severity level
        -> ImpactDisplay renders result with verdict-enter animation
```

## Data Flow: Month Rollover

```
New month detected (no current month record, previous month exists)
  -> MonthRolloverModal shows previous month summary
    -> User enters new total, savings target, toggle carry-over
      -> performRollover():
        1. Calculate previous month's free pool
        2. Create new Month record (+ carry-over if enabled)
        3. generateForNewMonth() creates recurring obligations
        4. Return result
```
