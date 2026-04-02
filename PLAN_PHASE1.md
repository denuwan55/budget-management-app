# Phase 1 — Project Setup, Data Model & Calculation Engine

> **Goal:** A working Vite + React + TypeScript project with the complete data layer (Dexie.js) and calculation engine, fully tested. No UI yet.
>
> **Estimated deliverables:** ~15 files, ~1,200 lines of code + tests
>
> **Prerequisites:** Node.js 18+, npm

---

## Step 1: Create Project

### 1.1 Initialize Vite + React + TypeScript

```bash
cd /Users/lahirudw/Downloads/budget-management-app
npm create vite@latest . -- --template react-ts
npm install
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install dexie dexie-react-hooks react-router-dom

# Dev dependencies
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 1.3 Configure Tailwind CSS

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

Update `src/index.css`:

```css
@import "tailwindcss";
```

### 1.4 Configure Vitest

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Update `tsconfig.app.json` — add to `compilerOptions`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### 1.5 Final Directory Structure After Phase 1

```
budget-management-app/
├── src/
│   ├── db/
│   │   ├── database.ts              (Dexie database definition)
│   │   ├── models.ts                (TypeScript interfaces)
│   │   └── repositories/
│   │       ├── monthRepository.ts
│   │       ├── obligationRepository.ts
│   │       ├── purchaseRepository.ts
│   │       └── settingsRepository.ts
│   ├── engine/
│   │   ├── budgetCalculator.ts      (pure calculation logic)
│   │   ├── verdictEngine.ts         (human-readable verdict generator)
│   │   ├── dateHelpers.ts           (month boundary helpers)
│   │   └── types.ts                 (ImpactResult, Verdict types)
│   ├── test/
│   │   ├── setup.ts
│   │   ├── budgetCalculator.test.ts
│   │   ├── verdictEngine.test.ts
│   │   ├── dateHelpers.test.ts
│   │   └── integration.test.ts
│   ├── App.tsx                      (placeholder)
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
├── PRODUCT.md
├── PLAN_PHASE1.md
├── PLAN_PHASE2.md
├── PLAN_PHASE3.md
└── PLAN_PHASE4.md
```

---

## Step 2: Data Model & Database

### 2.1 `src/db/models.ts`

```typescript
export interface Month {
  id?: number;
  yearMonth: string;        // "2026-04"
  totalAvailable: number;
  savingsTarget: number;
  createdAt: string;        // ISO 8601
  updatedAt: string;
}

export interface Obligation {
  id?: number;
  monthId: number;
  name: string;
  amountPlanned: number;
  amountActual?: number;
  dueDate: string;          // "2026-04-07" ISO date
  isRecurring: boolean;
  recurrenceRule?: 'weekly' | 'monthly' | 'biweekly';
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id?: number;
  monthId: number;
  amount: number;
  description: string;
  matchedObligationId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
}
```

### 2.2 `src/db/database.ts`

```typescript
import Dexie, { type Table } from 'dexie';
import type { Month, Obligation, Purchase, AppSetting } from './models';

export class MindfulSpendDB extends Dexie {
  months!: Table<Month, number>;
  obligations!: Table<Obligation, number>;
  purchases!: Table<Purchase, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('MindfulSpendDB');

    this.version(1).stores({
      months: '++id, &yearMonth',
      obligations: '++id, monthId, status, dueDate',
      purchases: '++id, monthId, matchedObligationId, createdAt',
      settings: '&key',
    });
  }
}

export const db = new MindfulSpendDB();
```

---

## Step 3: Repositories

### 3.1 `src/db/repositories/monthRepository.ts`

```typescript
import { db } from '../database';
import type { Month } from '../models';

export const monthRepository = {
  async getOrCreate(
    yearMonth: string,
    totalAvailable: number = 0,
    savingsTarget: number = 0
  ): Promise<Month> {
    const existing = await db.months.where('yearMonth').equals(yearMonth).first();
    if (existing) return existing;

    const now = new Date().toISOString();
    const id = await db.months.add({
      yearMonth,
      totalAvailable,
      savingsTarget,
      createdAt: now,
      updatedAt: now,
    });
    return (await db.months.get(id))!;
  },

  async getCurrentMonth(): Promise<Month | undefined> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return db.months.where('yearMonth').equals(yearMonth).first();
  },

  async updateTotalAvailable(id: number, amount: number): Promise<void> {
    await db.months.update(id, {
      totalAvailable: amount,
      updatedAt: new Date().toISOString(),
    });
  },

  async updateSavingsTarget(id: number, amount: number): Promise<void> {
    await db.months.update(id, {
      savingsTarget: amount,
      updatedAt: new Date().toISOString(),
    });
  },

  async getByYearMonth(yearMonth: string): Promise<Month | undefined> {
    return db.months.where('yearMonth').equals(yearMonth).first();
  },
};
```

### 3.2 `src/db/repositories/obligationRepository.ts`

```typescript
import { db } from '../database';
import type { Obligation } from '../models';

export const obligationRepository = {
  async add(
    monthId: number,
    data: {
      name: string;
      amountPlanned: number;
      dueDate: string;
      isRecurring?: boolean;
      recurrenceRule?: 'weekly' | 'monthly' | 'biweekly';
    }
  ): Promise<Obligation> {
    const now = new Date().toISOString();
    const id = await db.obligations.add({
      monthId,
      name: data.name,
      amountPlanned: data.amountPlanned,
      dueDate: data.dueDate,
      isRecurring: data.isRecurring ?? false,
      recurrenceRule: data.recurrenceRule,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return (await db.obligations.get(id))!;
  },

  async getAll(monthId: number): Promise<Obligation[]> {
    return db.obligations
      .where('monthId')
      .equals(monthId)
      .sortBy('dueDate');
  },

  async getPending(monthId: number): Promise<Obligation[]> {
    return db.obligations
      .where({ monthId, status: 'pending' })
      .sortBy('dueDate');
  },

  async markPaid(id: number, actualAmount: number): Promise<void> {
    await db.obligations.update(id, {
      status: 'paid',
      amountActual: actualAmount,
      updatedAt: new Date().toISOString(),
    });
  },

  async cancel(id: number): Promise<void> {
    await db.obligations.update(id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
  },

  async update(
    id: number,
    data: Partial<Pick<Obligation, 'name' | 'amountPlanned' | 'dueDate' | 'isRecurring' | 'recurrenceRule'>>
  ): Promise<void> {
    await db.obligations.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.obligations.delete(id);
  },
};
```

### 3.3 `src/db/repositories/purchaseRepository.ts`

```typescript
import { db } from '../database';
import type { Purchase } from '../models';

export const purchaseRepository = {
  async register(
    monthId: number,
    amount: number,
    description: string
  ): Promise<Purchase> {
    const now = new Date().toISOString();
    const id = await db.purchases.add({
      monthId,
      amount,
      description,
      createdAt: now,
      updatedAt: now,
    });
    return (await db.purchases.get(id))!;
  },

  async registerWithObligation(
    monthId: number,
    amount: number,
    description: string,
    obligationId: number
  ): Promise<Purchase> {
    const now = new Date().toISOString();

    // Use a transaction to atomically register purchase + mark obligation paid
    return db.transaction('rw', [db.purchases, db.obligations], async () => {
      const id = await db.purchases.add({
        monthId,
        amount,
        description,
        matchedObligationId: obligationId,
        createdAt: now,
        updatedAt: now,
      });

      await db.obligations.update(obligationId, {
        status: 'paid',
        amountActual: amount,
        updatedAt: now,
      });

      return (await db.purchases.get(id))!;
    });
  },

  async getAll(monthId: number): Promise<Purchase[]> {
    return db.purchases
      .where('monthId')
      .equals(monthId)
      .reverse()
      .sortBy('createdAt');
  },

  async getDiscretionary(monthId: number): Promise<Purchase[]> {
    const all = await this.getAll(monthId);
    return all.filter((p) => !p.matchedObligationId);
  },

  async update(
    id: number,
    data: Partial<Pick<Purchase, 'amount' | 'description'>>
  ): Promise<void> {
    await db.purchases.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: number): Promise<void> {
    // If matched to an obligation, reset the obligation to pending
    const purchase = await db.purchases.get(id);
    if (purchase?.matchedObligationId) {
      await db.obligations.update(purchase.matchedObligationId, {
        status: 'pending',
        amountActual: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    await db.purchases.delete(id);
  },
};
```

### 3.4 `src/db/repositories/settingsRepository.ts`

```typescript
import { db } from '../database';

export const settingsRepository = {
  async get(key: string): Promise<string | undefined> {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  async set(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value });
  },

  async delete(key: string): Promise<void> {
    await db.settings.delete(key);
  },
};

// Known setting keys
export const SETTINGS_KEYS = {
  CARRY_OVER_POLICY: 'carry_over_policy',         // "carry_forward" | "reset"
  DEFAULT_SAVINGS_TARGET: 'default_savings_target',
} as const;
```

---

## Step 4: Calculation Engine

### 4.1 `src/engine/dateHelpers.ts`

```typescript
/**
 * Returns the number of days remaining in the month for the given date (including today).
 * Minimum return value is 1 to avoid division by zero.
 */
export function daysRemainingInMonth(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  return Math.max(lastDay - currentDay + 1, 1);
}

/**
 * Returns the last day of the month as a Date.
 */
export function lastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns "YYYY-MM" string for a given date.
 */
export function yearMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Days between two dates (absolute).
 */
export function daysBetween(from: Date, to: Date): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diff = Math.abs(startOfTo.getTime() - startOfFrom.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Returns the start of day (midnight) for a given date.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parse an ISO date string "YYYY-MM-DD" to a Date object (local time).
 */
export function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as "YYYY-MM-DD".
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 4.2 `src/engine/types.ts`

```typescript
export type VerdictSeverity =
  | 'comfortable'    // green
  | 'tight'          // yellow-green
  | 'painful'        // yellow
  | 'savings_risk'   // orange
  | 'cannot_afford'; // red

export const SEVERITY_ORDER: Record<VerdictSeverity, number> = {
  comfortable: 0,
  tight: 1,
  painful: 2,
  savings_risk: 3,
  cannot_afford: 4,
};

export interface Verdict {
  severity: VerdictSeverity;
  headline: string;
  detail: string;
}

export interface ObligationAtRisk {
  name: string;
  amount: number;
  dueDate: string;
  shortfall: number;
}

export interface ObligationSummary {
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface ImpactResult {
  // Current state (before purchase)
  currentFreePool: number;
  currentDailyBudget: number;

  // Proposed state (after purchase)
  proposedFreePool: number;
  proposedDailyBudget: number;

  // Impact metrics
  daysEquivalent: number;
  dailyBudgetDropPercent: number;

  // Safety checks
  savingsIntact: boolean;
  savingsAtRisk: number;
  obligationsIntact: boolean;
  obligationsAtRisk: ObligationAtRisk[];

  // Context
  daysRemaining: number;
  upcomingObligations: ObligationSummary[];

  // Verdict
  verdict: Verdict;
}
```

### 4.3 `src/engine/budgetCalculator.ts`

```typescript
import type { Obligation, Purchase } from '../db/models';
import type { ImpactResult, ObligationAtRisk, ObligationSummary } from './types';
import { daysRemainingInMonth, daysBetween, startOfDay, parseDate } from './dateHelpers';
import { generateVerdict } from './verdictEngine';

/**
 * Sum of all pending obligations for the month.
 */
export function obligationsRemaining(obligations: Obligation[]): number {
  return obligations
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + o.amountPlanned, 0);
}

/**
 * Sum of discretionary spending (purchases NOT matched to an obligation).
 */
export function discretionarySpent(purchases: Purchase[]): number {
  return purchases
    .filter((p) => !p.matchedObligationId)
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * The amount actually free to spend on discretionary purchases.
 */
export function freePool(
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number,
  purchases: Purchase[]
): number {
  return (
    totalAvailable -
    obligationsRemaining(obligations) -
    savingsTarget -
    discretionarySpent(purchases)
  );
}

/**
 * The sustainable daily discretionary budget for the rest of the month.
 */
export function dailyBudget(freePoolAmount: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  return freePoolAmount / daysRemaining;
}

/**
 * Find which obligations would be at risk given a shortfall amount.
 * Prioritizes furthest-out obligations first (you'd miss the latest ones first).
 */
function findObligationsAtRisk(
  shortfall: number,
  obligations: Obligation[]
): ObligationAtRisk[] {
  if (shortfall <= 0) return [];

  const pending = obligations
    .filter((o) => o.status === 'pending')
    .sort((a, b) => (a.dueDate > b.dueDate ? -1 : 1)); // furthest first

  const atRisk: ObligationAtRisk[] = [];
  let remaining = shortfall;

  for (const obligation of pending) {
    if (remaining <= 0) break;
    const risk = Math.min(remaining, obligation.amountPlanned);
    atRisk.push({
      name: obligation.name,
      amount: obligation.amountPlanned,
      dueDate: obligation.dueDate,
      shortfall: risk,
    });
    remaining -= risk;
  }

  return atRisk;
}

/**
 * Get summaries of the next N upcoming pending obligations.
 */
function upcomingObligationSummaries(
  obligations: Obligation[],
  today: Date,
  limit: number = 3
): ObligationSummary[] {
  const todayStart = startOfDay(today);

  return obligations
    .filter((o) => o.status === 'pending' && parseDate(o.dueDate) >= todayStart)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, limit)
    .map((o) => ({
      name: o.name,
      amount: o.amountPlanned,
      dueDate: o.dueDate,
      daysUntilDue: daysBetween(today, parseDate(o.dueDate)),
    }));
}

/**
 * Perform an impact check for a proposed discretionary purchase.
 */
export function checkImpact(
  proposedAmount: number,
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number,
  purchases: Purchase[],
  today: Date = new Date()
): ImpactResult {
  const daysLeft = daysRemainingInMonth(today);

  // Current state
  const currentFree = freePool(totalAvailable, obligations, savingsTarget, purchases);
  const currentDaily = dailyBudget(currentFree, daysLeft);

  // Proposed state
  const proposedFree = currentFree - proposedAmount;
  const proposedDaily = dailyBudget(proposedFree, daysLeft);

  // Days equivalent
  const daysEquiv = currentDaily > 0 ? proposedAmount / currentDaily : Infinity;

  // Daily budget drop percentage
  const dropPercent =
    currentDaily > 0
      ? ((currentDaily - proposedDaily) / currentDaily) * 100
      : 100;

  // Safety checks
  const savingsConsumed = proposedFree < 0 ? Math.min(Math.abs(proposedFree), savingsTarget) : 0;
  const savingsOk = savingsConsumed === 0;

  // Check if obligations are at risk
  const totalShortfall = proposedFree < 0 ? Math.abs(proposedFree) - savingsTarget : 0;
  const atRiskObligations = findObligationsAtRisk(
    Math.max(totalShortfall, 0),
    obligations
  );

  // Upcoming obligations for context
  const upcoming = upcomingObligationSummaries(obligations, today, 3);

  // Generate verdict
  const verdict = generateVerdict(
    proposedFree,
    dropPercent,
    savingsConsumed,
    atRiskObligations,
    proposedDaily,
    daysLeft
  );

  return {
    currentFreePool: currentFree,
    currentDailyBudget: currentDaily,
    proposedFreePool: proposedFree,
    proposedDailyBudget: proposedDaily,
    daysEquivalent: daysEquiv,
    dailyBudgetDropPercent: dropPercent,
    savingsIntact: savingsOk,
    savingsAtRisk: savingsConsumed,
    obligationsIntact: atRiskObligations.length === 0,
    obligationsAtRisk: atRiskObligations,
    daysRemaining: daysLeft,
    upcomingObligations: upcoming,
    verdict,
  };
}
```

### 4.4 `src/engine/verdictEngine.ts`

```typescript
import type { Verdict, ObligationAtRisk } from './types';

/**
 * Format a number as currency (e.g., "$1,234").
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a human-readable verdict for an impact check.
 */
export function generateVerdict(
  proposedFreePool: number,
  dailyBudgetDropPercent: number,
  savingsAtRisk: number,
  obligationsAtRisk: ObligationAtRisk[],
  proposedDailyBudget: number,
  daysRemaining: number
): Verdict {
  // Level 5: Can't afford — obligations at risk
  if (obligationsAtRisk.length > 0) {
    const topRisk = obligationsAtRisk[0];
    return {
      severity: 'cannot_afford',
      headline: "You can't afford this.",
      detail: `This would put ${topRisk.name} (${formatCurrency(topRisk.amount)}) at risk. You'd be short ${formatCurrency(topRisk.shortfall)}.`,
    };
  }

  // Level 4: Savings at risk
  if (savingsAtRisk > 0) {
    return {
      severity: 'savings_risk',
      headline: 'This eats into savings.',
      detail: `You'd lose ${formatCurrency(savingsAtRisk)} from your savings target. Your discretionary budget would be at $0 for the rest of the month.`,
    };
  }

  // Level 3: Painful — daily budget drops > 50%
  if (dailyBudgetDropPercent > 50) {
    return {
      severity: 'painful',
      headline: "Affordable, but it'll hurt.",
      detail: `Your daily budget drops to ${formatCurrency(proposedDailyBudget)}/day for the next ${daysRemaining} days. That's a ${Math.round(dailyBudgetDropPercent)}% cut.`,
    };
  }

  // Level 2: Tight — daily budget drops 25-50%
  if (dailyBudgetDropPercent > 25) {
    return {
      severity: 'tight',
      headline: 'Safe, but tight.',
      detail: `You'll need to average ${formatCurrency(proposedDailyBudget)}/day for the rest of the month.`,
    };
  }

  // Level 1: Comfortable
  const purchasesLeft =
    proposedDailyBudget > 0
      ? Math.floor(proposedFreePool / proposedDailyBudget)
      : 0;
  return {
    severity: 'comfortable',
    headline: 'Comfortable.',
    detail: `You'll still have ${formatCurrency(proposedFreePool)} free. That's about ${purchasesLeft} more days of normal spending.`,
  };
}
```

---

## Step 5: Minimal App Shell

### 5.1 `src/App.tsx`

```tsx
function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold">MindfulSpend</h1>
        <p className="mt-2 text-gray-400">Phase 1 complete — engine ready</p>
        <p className="mt-1 text-gray-500">UI coming in Phase 2</p>
      </div>
    </div>
  );
}

export default App;
```

---

## Step 6: Tests

### 6.1 `src/test/dateHelpers.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  daysRemainingInMonth,
  yearMonth,
  daysBetween,
  parseDate,
  formatDate,
} from '../engine/dateHelpers';

describe('daysRemainingInMonth', () => {
  it('returns 30 on April 1st', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 1))).toBe(30);
  });

  it('returns 1 on the last day of April', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBe(1);
  });

  it('handles February in a leap year', () => {
    expect(daysRemainingInMonth(new Date(2028, 1, 1))).toBe(29);
  });

  it('returns minimum 1 to avoid division by zero', () => {
    // Even on the last day, should return 1
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBeGreaterThanOrEqual(1);
  });
});

describe('yearMonth', () => {
  it('formats with zero-padded month', () => {
    expect(yearMonth(new Date(2026, 0, 5))).toBe('2026-01');
    expect(yearMonth(new Date(2026, 11, 25))).toBe('2026-12');
  });

  it('formats April correctly', () => {
    expect(yearMonth(new Date(2026, 3, 15))).toBe('2026-04');
  });
});

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    expect(daysBetween(new Date(2026, 3, 1), new Date(2026, 3, 10))).toBe(9);
  });

  it('returns 0 for the same date', () => {
    expect(daysBetween(new Date(2026, 3, 5), new Date(2026, 3, 5))).toBe(0);
  });

  it('is absolute (order does not matter)', () => {
    expect(daysBetween(new Date(2026, 3, 10), new Date(2026, 3, 1))).toBe(9);
  });
});

describe('parseDate / formatDate', () => {
  it('round-trips correctly', () => {
    expect(formatDate(parseDate('2026-04-07'))).toBe('2026-04-07');
  });

  it('parses to correct components', () => {
    const d = parseDate('2026-12-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11); // 0-indexed
    expect(d.getDate()).toBe(25);
  });
});
```

### 6.2 `src/test/budgetCalculator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  obligationsRemaining,
  discretionarySpent,
  freePool,
  dailyBudget,
  checkImpact,
} from '../engine/budgetCalculator';
import type { Obligation, Purchase } from '../db/models';

// Helper factories
function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1,
    monthId: 1,
    name: 'Test',
    amountPlanned: 100,
    dueDate: '2026-04-15',
    isRecurring: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 1,
    monthId: 1,
    amount: 50,
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('obligationsRemaining', () => {
  it('sums only pending obligations', () => {
    const obligations = [
      makeObligation({ amountPlanned: 1500, status: 'pending' }),
      makeObligation({ amountPlanned: 500, status: 'pending' }),
      makeObligation({ amountPlanned: 300, status: 'paid' }),
    ];
    expect(obligationsRemaining(obligations)).toBe(2000);
  });

  it('returns 0 for empty array', () => {
    expect(obligationsRemaining([])).toBe(0);
  });
});

describe('discretionarySpent', () => {
  it('sums only unmatched purchases', () => {
    const purchases = [
      makePurchase({ amount: 200 }),
      makePurchase({ amount: 115 }),
      makePurchase({ amount: 300, matchedObligationId: 5 }),
    ];
    expect(discretionarySpent(purchases)).toBe(315);
  });
});

describe('freePool', () => {
  it('calculates basic scenario', () => {
    const obligations = [
      makeObligation({ amountPlanned: 1500, status: 'pending' }),
      makeObligation({ amountPlanned: 500, status: 'pending' }),
      makeObligation({ amountPlanned: 300, status: 'paid' }),
    ];
    const purchases = [
      makePurchase({ amount: 200 }),
      makePurchase({ amount: 115 }),
      makePurchase({ amount: 300, matchedObligationId: 1 }),
    ];
    // 3200 - 2000 - 500 - 315 = 385
    expect(freePool(3200, obligations, 500, purchases)).toBeCloseTo(385);
  });

  it('returns full amount minus savings when no obligations or purchases', () => {
    expect(freePool(1000, [], 200, [])).toBe(800);
  });

  it('can go negative', () => {
    const obligations = [makeObligation({ amountPlanned: 900, status: 'pending' })];
    const purchases = [makePurchase({ amount: 200 })];
    expect(freePool(1000, obligations, 200, purchases)).toBe(-300);
  });
});

describe('dailyBudget', () => {
  it('divides evenly', () => {
    expect(dailyBudget(280, 14)).toBeCloseTo(20);
  });

  it('returns 0 for zero days', () => {
    expect(dailyBudget(280, 0)).toBe(0);
  });

  it('handles negative free pool', () => {
    expect(dailyBudget(-100, 10)).toBeCloseTo(-10);
  });
});

describe('checkImpact', () => {
  it('returns comfortable for small purchase', () => {
    const obligations = [makeObligation({ amountPlanned: 500, status: 'pending' })];
    const result = checkImpact(
      20, 2000, obligations, 300, [],
      new Date(2026, 3, 1) // April 1
    );

    expect(result.currentFreePool).toBeCloseTo(1200);
    expect(result.proposedFreePool).toBeCloseTo(1180);
    expect(result.savingsIntact).toBe(true);
    expect(result.obligationsIntact).toBe(true);
    expect(result.verdict.severity).toBe('comfortable');
  });

  it('returns tight when daily budget drops 25-50%', () => {
    const obligations = [makeObligation({ amountPlanned: 500, status: 'pending' })];
    // Free pool = 2000 - 500 - 300 = 1200, daily = 1200/30 = 40
    // Spending 400: proposed daily = 800/30 = 26.67, drop = 33%
    const result = checkImpact(
      400, 2000, obligations, 300, [],
      new Date(2026, 3, 1)
    );
    expect(result.verdict.severity).toBe('tight');
    expect(result.savingsIntact).toBe(true);
  });

  it('returns painful when daily budget drops > 50%', () => {
    // Free pool = 700 - 300 - 200 = 200, daily = 200/10 = 20
    // Spending 120: proposed daily = 80/10 = 8, drop = 60%
    const result = checkImpact(
      120, 700,
      [makeObligation({ amountPlanned: 300, status: 'pending' })],
      200, [],
      new Date(2026, 3, 21) // 10 days left
    );
    expect(result.verdict.severity).toBe('painful');
  });

  it('returns savings_risk when free pool goes negative', () => {
    // Free pool = 750 - 500 - 200 = 50
    // Spending 100 → proposed free = -50, savings covers it
    const result = checkImpact(
      100, 750,
      [makeObligation({ amountPlanned: 500, status: 'pending' })],
      200, [],
      new Date(2026, 3, 21)
    );
    expect(result.verdict.severity).toBe('savings_risk');
    expect(result.savingsIntact).toBe(false);
    expect(result.savingsAtRisk).toBeCloseTo(50);
    expect(result.obligationsIntact).toBe(true);
  });

  it('returns cannot_afford when obligations are at risk', () => {
    // Free pool = 650 - 500 - 100 = 50
    // Spending 200 → proposed free = -150, savings(100) can cover 100, shortfall = 50
    const result = checkImpact(
      200, 650,
      [makeObligation({ amountPlanned: 500, status: 'pending', name: 'Rent' })],
      100, [],
      new Date(2026, 3, 21)
    );
    expect(result.verdict.severity).toBe('cannot_afford');
    expect(result.obligationsIntact).toBe(false);
    expect(result.obligationsAtRisk[0].name).toBe('Rent');
  });
});
```

### 6.3 `src/test/verdictEngine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateVerdict } from '../engine/verdictEngine';
import type { ObligationAtRisk } from '../engine/types';

describe('generateVerdict', () => {
  it('returns comfortable for small impact', () => {
    const verdict = generateVerdict(500, 10, 0, [], 25, 20);
    expect(verdict.severity).toBe('comfortable');
  });

  it('returns tight for 25-50% drop', () => {
    const verdict = generateVerdict(300, 35, 0, [], 15, 20);
    expect(verdict.severity).toBe('tight');
  });

  it('returns painful for >50% drop', () => {
    const verdict = generateVerdict(100, 60, 0, [], 5, 20);
    expect(verdict.severity).toBe('painful');
  });

  it('returns savings_risk when savings consumed', () => {
    const verdict = generateVerdict(-50, 100, 50, [], 0, 20);
    expect(verdict.severity).toBe('savings_risk');
  });

  it('returns cannot_afford when obligations at risk', () => {
    const atRisk: ObligationAtRisk[] = [
      { name: 'Rent', amount: 1500, dueDate: '2026-04-15', shortfall: 200 },
    ];
    const verdict = generateVerdict(-300, 100, 100, atRisk, -15, 20);
    expect(verdict.severity).toBe('cannot_afford');
    expect(verdict.detail).toContain('Rent');
  });

  it('prioritizes cannot_afford over savings_risk', () => {
    const atRisk: ObligationAtRisk[] = [
      { name: 'Rent', amount: 1500, dueDate: '2026-04-15', shortfall: 200 },
    ];
    // Both savings at risk AND obligations at risk → should be cannot_afford
    const verdict = generateVerdict(-500, 100, 300, atRisk, -25, 20);
    expect(verdict.severity).toBe('cannot_afford');
  });
});
```

### 6.4 `src/test/integration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { MindfulSpendDB } from '../db/database';
import { freePool, checkImpact } from '../engine/budgetCalculator';
import type { Month, Obligation, Purchase } from '../db/models';

// Use an in-memory Dexie database for integration tests
let testDb: MindfulSpendDB;

beforeEach(async () => {
  // Delete any existing test database
  await Dexie.delete('MindfulSpendTestDB');

  // Create a fresh test database
  testDb = new MindfulSpendDB();
  // Override the database name for testing
  testDb.close();
  testDb = new (class extends MindfulSpendDB {
    constructor() {
      super();
      // Re-open with the test name
    }
  })();
});

describe('Full monthly flow (unit-level integration)', () => {
  it('calculates correctly through a full month scenario', () => {
    // Instead of using the actual DB (which needs indexedDB),
    // we test the calculation engine with realistic data arrays.

    // 1. Set up the month
    const month: Month = {
      id: 1,
      yearMonth: '2026-04',
      totalAvailable: 3200,
      savingsTarget: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Obligations
    const obligations: Obligation[] = [
      {
        id: 1, monthId: 1, name: 'Rent', amountPlanned: 1500,
        dueDate: '2026-04-01', isRecurring: false, status: 'pending',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 2, monthId: 1, name: 'Groceries', amountPlanned: 400,
        dueDate: '2026-04-07', isRecurring: true, recurrenceRule: 'weekly', status: 'pending',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: 3, monthId: 1, name: 'Electricity', amountPlanned: 120,
        dueDate: '2026-04-07', isRecurring: false, status: 'pending',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ];

    // 3. Verify initial state
    // 3200 - 2020 - 500 - 0 = 680
    expect(freePool(month.totalAvailable, obligations, month.savingsTarget, [])).toBeCloseTo(680);

    // 4. Pay rent (obligation matched)
    obligations[0].status = 'paid';
    obligations[0].amountActual = 1500;
    const purchases: Purchase[] = [
      {
        id: 1, monthId: 1, amount: 1500, description: 'April rent',
        matchedObligationId: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ];

    // Free pool: 3200 - 520 (pending) - 500 - 0 (no discretionary) = 2180
    expect(freePool(month.totalAvailable, obligations, month.savingsTarget, purchases)).toBeCloseTo(2180);

    // 5. Discretionary purchase
    purchases.push({
      id: 2, monthId: 1, amount: 85, description: 'Dinner',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    // Free pool: 3200 - 520 - 500 - 85 = 2095
    expect(freePool(month.totalAvailable, obligations, month.savingsTarget, purchases)).toBeCloseTo(2095);

    // 6. Impact check
    const impact = checkImpact(
      200,
      month.totalAvailable,
      obligations,
      month.savingsTarget,
      purchases,
      new Date(2026, 3, 5)
    );

    expect(impact.currentFreePool).toBeCloseTo(2095);
    expect(impact.proposedFreePool).toBeCloseTo(1895);
    expect(impact.savingsIntact).toBe(true);
    expect(impact.obligationsIntact).toBe(true);
    expect(impact.verdict.severity).toBe('comfortable');

    // 7. Cancel electricity
    obligations[2].status = 'cancelled';
    // Free pool: 3200 - 400 (only groceries pending) - 500 - 85 = 2215
    expect(freePool(month.totalAvailable, obligations, month.savingsTarget, purchases)).toBeCloseTo(2215);
  });
});
```

---

## Step 7: Phase 1 Completion Checklist

- [ ] `npm create vite@latest` project initialized
- [ ] All dependencies installed (`dexie`, `tailwindcss`, `vitest`, etc.)
- [ ] Tailwind CSS configured and working
- [ ] All models defined in `src/db/models.ts`
- [ ] Dexie database defined in `src/db/database.ts`
- [ ] All 4 repositories implemented
- [ ] `dateHelpers.ts` — all date utility functions
- [ ] `budgetCalculator.ts` — freePool, dailyBudget, checkImpact
- [ ] `verdictEngine.ts` — all 5 severity levels
- [ ] `dateHelpers.test.ts` — all pass
- [ ] `budgetCalculator.test.ts` — all pass
- [ ] `verdictEngine.test.ts` — all pass
- [ ] `integration.test.ts` — all pass
- [ ] `npm run dev` serves the placeholder app
- [ ] `npm run build` produces a clean production build

---

## Phase 1 Deliverable: HANDOFF.md

After Phase 1 is complete, generate `HANDOFF.md` with:
1. What was built (models, engine, repos, tests)
2. File manifest with line counts
3. All test results (paste `npx vitest run` output)
4. Any deviations from the plan
5. What Phase 2 expects to find
6. Copy of the full current PRODUCT.md state
