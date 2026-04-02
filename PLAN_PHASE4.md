# Phase 4 — Polish, Month Rollover, Recurring Obligations & Edge Cases

> **Goal:** Production-ready personal app. Handle all edge cases, month transitions, recurring obligation generation, data export, and UX polish.
>
> **Prerequisites:** Phase 3 complete — full PWA deployed to GitHub Pages, installable and offline-capable.
>
> **Estimated deliverables:** ~8 new/modified files, ~700 lines of code

---

## Step 1: Recurring Obligation Engine

### 1.1 `src/engine/recurrenceEngine.ts`

```typescript
import type { Obligation } from '../db/models';

interface GeneratedObligation {
  name: string;
  amountPlanned: number;
  dueDate: string;        // "YYYY-MM-DD"
  isRecurring: boolean;
  recurrenceRule: 'weekly' | 'monthly' | 'biweekly';
}

/**
 * Generate obligation instances for a new month based on
 * recurring obligations from the previous month.
 */
export function generateForNewMonth(
  previousObligations: Obligation[],
  newYearMonth: string    // "2026-05"
): GeneratedObligation[] {
  const [yearStr, monthStr] = newYearMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);  // 1-indexed

  const recurring = previousObligations.filter((o) => o.isRecurring && o.recurrenceRule);
  const results: GeneratedObligation[] = [];

  for (const template of recurring) {
    const rule = template.recurrenceRule!;
    const templateDate = new Date(
      parseInt(template.dueDate.split('-')[0]),
      parseInt(template.dueDate.split('-')[1]) - 1,
      parseInt(template.dueDate.split('-')[2])
    );

    switch (rule) {
      case 'monthly': {
        // Same day of month, clamped to last day if needed
        const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed, so (year, month, 0) = last day of that month
        const day = Math.min(templateDate.getDate(), lastDay);
        const dateStr = `${yearStr}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        results.push({
          name: template.name,
          amountPlanned: template.amountPlanned,
          dueDate: dateStr,
          isRecurring: true,
          recurrenceRule: 'monthly',
        });
        break;
      }

      case 'weekly': {
        // Generate all instances of this weekday in the month
        const targetWeekday = templateDate.getDay(); // 0=Sun, 6=Sat
        const firstOfMonth = new Date(year, month - 1, 1);
        let current = new Date(firstOfMonth);

        // Find first occurrence of target weekday
        while (current.getDay() !== targetWeekday) {
          current.setDate(current.getDate() + 1);
        }

        // Collect all occurrences in the month
        while (current.getMonth() === month - 1) {
          const d = String(current.getDate()).padStart(2, '0');
          const m = String(month).padStart(2, '0');
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: `${yearStr}-${m}-${d}`,
            isRecurring: true,
            recurrenceRule: 'weekly',
          });
          current.setDate(current.getDate() + 7);
        }
        break;
      }

      case 'biweekly': {
        // Generate every-2-week instances in the month
        const targetWeekday = templateDate.getDay();
        const firstOfMonth = new Date(year, month - 1, 1);
        let current = new Date(firstOfMonth);

        while (current.getDay() !== targetWeekday) {
          current.setDate(current.getDate() + 1);
        }

        while (current.getMonth() === month - 1) {
          const d = String(current.getDate()).padStart(2, '0');
          const m = String(month).padStart(2, '0');
          results.push({
            name: template.name,
            amountPlanned: template.amountPlanned,
            dueDate: `${yearStr}-${m}-${d}`,
            isRecurring: true,
            recurrenceRule: 'biweekly',
          });
          current.setDate(current.getDate() + 14);
        }
        break;
      }
    }
  }

  return results;
}
```

### 1.2 `src/test/recurrenceEngine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateForNewMonth } from '../engine/recurrenceEngine';
import type { Obligation } from '../db/models';

function makeObligation(overrides: Partial<Obligation>): Obligation {
  return {
    id: 1, monthId: 1, name: 'Test', amountPlanned: 100,
    dueDate: '2026-03-15', isRecurring: false, status: 'pending',
    createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('generateForNewMonth', () => {
  it('generates monthly obligation on same day', () => {
    const templates = [
      makeObligation({ name: 'Rent', amountPlanned: 1500, dueDate: '2026-03-01', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2026-04');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rent');
    expect(result[0].dueDate).toBe('2026-04-01');
    expect(result[0].amountPlanned).toBe(1500);
  });

  it('clamps day to last day of shorter month', () => {
    const templates = [
      makeObligation({ name: 'Test', dueDate: '2026-03-31', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2026-04');  // April has 30 days
    expect(result[0].dueDate).toBe('2026-04-30');
  });

  it('generates weekly obligations (4-5 per month)', () => {
    const templates = [
      makeObligation({ name: 'Groceries', amountPlanned: 100, dueDate: '2026-03-02', isRecurring: true, recurrenceRule: 'weekly' }),
    ];
    // March 2 is a Monday. April 2026 Mondays: 6, 13, 20, 27 = 4
    const result = generateForNewMonth(templates, '2026-04');
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.every((o) => o.name === 'Groceries')).toBe(true);
  });

  it('generates biweekly obligations (2 per month)', () => {
    const templates = [
      makeObligation({ name: 'Cleaner', amountPlanned: 80, dueDate: '2026-03-05', isRecurring: true, recurrenceRule: 'biweekly' }),
    ];
    const result = generateForNewMonth(templates, '2026-04');
    expect(result.length).toBe(2);
  });

  it('skips non-recurring obligations', () => {
    const templates = [
      makeObligation({ name: 'Birthday', isRecurring: false }),
    ];
    expect(generateForNewMonth(templates, '2026-04')).toHaveLength(0);
  });

  it('handles February in a leap year', () => {
    const templates = [
      makeObligation({ name: 'Test', dueDate: '2028-01-31', isRecurring: true, recurrenceRule: 'monthly' }),
    ];
    const result = generateForNewMonth(templates, '2028-02');
    expect(result[0].dueDate).toBe('2028-02-29');
  });
});
```

---

## Step 2: Month Rollover

### 2.1 `src/engine/monthRollover.ts`

```typescript
import { db } from '../db/database';
import { obligationRepository } from '../db/repositories/obligationRepository';
import { freePool } from './budgetCalculator';
import { generateForNewMonth } from './recurrenceEngine';
import type { Month, Obligation } from '../db/models';

export interface RolloverResult {
  newMonth: Month;
  generatedObligations: number;
  carriedOverAmount: number;
}

export async function performRollover(
  previousMonth: Month,
  newYearMonth: string,
  newTotalAvailable: number,
  newSavingsTarget: number,
  carryOver: boolean
): Promise<RolloverResult> {
  // Calculate carry-over
  const previousObligations = await db.obligations.where('monthId').equals(previousMonth.id!).toArray();
  const previousPurchases = await db.purchases.where('monthId').equals(previousMonth.id!).toArray();

  const previousFree = freePool(
    previousMonth.totalAvailable,
    previousObligations,
    previousMonth.savingsTarget,
    previousPurchases
  );
  const carriedOverAmount = carryOver ? Math.max(previousFree, 0) : 0;

  // Create new month
  const now = new Date().toISOString();
  const newMonthId = await db.months.add({
    yearMonth: newYearMonth,
    totalAvailable: newTotalAvailable + carriedOverAmount,
    savingsTarget: newSavingsTarget,
    createdAt: now,
    updatedAt: now,
  });

  // Generate recurring obligations
  const generated = generateForNewMonth(previousObligations, newYearMonth);
  for (const g of generated) {
    await obligationRepository.add(newMonthId as number, {
      name: g.name,
      amountPlanned: g.amountPlanned,
      dueDate: g.dueDate,
      isRecurring: g.isRecurring,
      recurrenceRule: g.recurrenceRule,
    });
  }

  const newMonth = (await db.months.get(newMonthId as number))!;

  return {
    newMonth,
    generatedObligations: generated.length,
    carriedOverAmount,
  };
}
```

### 2.2 `src/components/settings/MonthRolloverModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { performRollover } from '../../engine/monthRollover';
import { freePool } from '../../engine/budgetCalculator';
import { formatCurrency } from '../../lib/formatters';
import { db } from '../../db/database';
import type { Month } from '../../db/models';

interface Props {
  open: boolean;
  onClose: () => void;
  previousMonth: Month;
  newYearMonth: string;
}

export function MonthRolloverModal({ open, onClose, previousMonth, newYearMonth }: Props) {
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState(String(previousMonth.savingsTarget));
  const [carryOver, setCarryOver] = useState(true);
  const [previousFree, setPreviousFree] = useState(0);
  const [recurringCount, setRecurringCount] = useState(0);

  useEffect(() => {
    if (open) {
      // Calculate previous month's free pool
      Promise.all([
        db.obligations.where('monthId').equals(previousMonth.id!).toArray(),
        db.purchases.where('monthId').equals(previousMonth.id!).toArray(),
      ]).then(([obligations, purchases]) => {
        setPreviousFree(freePool(
          previousMonth.totalAvailable, obligations,
          previousMonth.savingsTarget, purchases
        ));
        setRecurringCount(obligations.filter((o) => o.isRecurring).length);
      });
    }
  }, [open, previousMonth]);

  const handleStart = async () => {
    const total = parseFloat(totalStr);
    const savings = parseFloat(savingsStr) || 0;
    if (total <= 0) return;

    await performRollover(previousMonth, newYearMonth, total, savings, carryOver);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Month">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Starting <span className="text-white font-medium">{newYearMonth}</span>
        </p>

        {/* Previous month summary */}
        <div className="bg-gray-800 rounded-xl p-3 space-y-1">
          <p className="text-xs text-gray-400">Previous month</p>
          <div className="flex justify-between text-sm">
            <span>Total available</span>
            <span>{formatCurrency(previousMonth.totalAvailable)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Unspent free pool</span>
            <span className={previousFree >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatCurrency(previousFree)}
            </span>
          </div>
        </div>

        {/* New month setup */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Total Available</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={totalStr} onChange={setTotalStr} autoFocus large />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings Target</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={savingsStr} onChange={setSavingsStr} />
          </div>
        </div>

        {/* Carry over toggle */}
        {previousFree > 0 && (
          <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
            <span className="text-sm">Carry over {formatCurrency(previousFree)}</span>
            <button
              onClick={() => setCarryOver(!carryOver)}
              className={`w-12 h-7 rounded-full transition-colors ${carryOver ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transform transition-transform mx-1 ${
                carryOver ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
        )}

        {/* Recurring obligations info */}
        {recurringCount > 0 && (
          <p className="text-xs text-gray-400">
            {recurringCount} recurring obligation{recurringCount > 1 ? 's' : ''} will be generated automatically.
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!parseFloat(totalStr) || parseFloat(totalStr) <= 0}
          className="w-full py-3 rounded-xl font-semibold bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600"
        >
          Start Month
        </button>
      </div>
    </Modal>
  );
}
```

### 2.3 Auto-detect Month Rollover

Update `src/components/quickcheck/QuickCheckScreen.tsx` — add month rollover detection.

After the existing `if (!data.loading && !data.month)` block, add a check for the previous month:

```typescript
// Add state
const [showRollover, setShowRollover] = useState(false);
const [previousMonth, setPreviousMonth] = useState<Month | null>(null);

// Add effect to check for previous month when current month doesn't exist
useEffect(() => {
  if (!data.loading && !data.month) {
    // Check for previous month
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    db.months.where('yearMonth').equals(prevYM).first().then((prev) => {
      if (prev) {
        setPreviousMonth(prev);
        setShowRollover(true);
      }
    });
  }
}, [data.loading, data.month]);
```

Then render the rollover modal alongside the setup flow.

---

## Step 3: Data Export / Import

### 3.1 Add to Settings Screen

Add export and import buttons to `SettingsScreen.tsx`:

```typescript
// Export all data as JSON
async function handleExport() {
  const months = await db.months.toArray();
  const obligations = await db.obligations.toArray();
  const purchases = await db.purchases.toArray();
  const settings = await db.settings.toArray();

  const data = { months, obligations, purchases, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindfulspend-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import from JSON file
async function handleImport(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);

  await db.transaction('rw', [db.months, db.obligations, db.purchases, db.settings], async () => {
    // Clear existing data
    await db.months.clear();
    await db.obligations.clear();
    await db.purchases.clear();
    await db.settings.clear();

    // Import
    if (data.months) await db.months.bulkAdd(data.months);
    if (data.obligations) await db.obligations.bulkAdd(data.obligations);
    if (data.purchases) await db.purchases.bulkAdd(data.purchases);
    if (data.settings) await db.settings.bulkAdd(data.settings);
  });

  window.location.reload(); // Refresh to pick up new data
}
```

Add to the Settings screen JSX:

```tsx
<div className="bg-gray-900 rounded-2xl p-4 space-y-3">
  <h2 className="text-sm font-semibold text-gray-400">Data</h2>
  <button
    onClick={handleExport}
    className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-blue-400"
  >
    Export Backup (JSON)
  </button>
  <label className="block">
    <span className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-orange-400 text-center block cursor-pointer">
      Import Backup
    </span>
    <input
      type="file"
      accept=".json"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleImport(file);
      }}
    />
  </label>
</div>
```

---

## Step 4: Budget Validation

### 4.1 `src/engine/budgetValidator.ts`

```typescript
import type { Obligation } from '../db/models';
import { daysRemainingInMonth } from './dateHelpers';

export interface ValidationResult {
  warnings: string[];
  errors: string[];
}

export function validateMonth(
  totalAvailable: number,
  obligations: Obligation[],
  savingsTarget: number
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (totalAvailable <= 0) {
    errors.push('Total available must be greater than zero.');
  }

  if (savingsTarget > totalAvailable) {
    errors.push('Savings target exceeds total available.');
  }

  const pendingSum = obligations
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + o.amountPlanned, 0);

  const totalCommitted = pendingSum + savingsTarget;

  if (totalCommitted > totalAvailable) {
    warnings.push(
      `Your commitments ($${Math.round(totalCommitted)}) exceed your total available ($${Math.round(totalAvailable)}). You have no discretionary budget.`
    );
  }

  const freePool = totalAvailable - totalCommitted;
  if (freePool > 0) {
    const daysLeft = daysRemainingInMonth();
    const daily = freePool / daysLeft;
    if (daily < 5) {
      warnings.push(`Your daily budget is very low ($${daily.toFixed(2)}/day).`);
    }
  }

  return { warnings, errors };
}
```

### 4.2 Show Validation on Dashboard

Add to `DashboardScreen.tsx` — compute and display validation warnings:

```tsx
import { validateMonth } from '../../engine/budgetValidator';

// Inside component:
const validation = data.month
  ? validateMonth(data.month.totalAvailable, data.obligations, data.month.savingsTarget)
  : { warnings: [], errors: [] };

// In JSX, between summary card and upcoming:
{validation.warnings.map((w, i) => (
  <div key={i} className="bg-yellow-500/10 rounded-2xl p-3">
    <p className="text-sm text-yellow-400">{w}</p>
  </div>
))}
```

---

## Step 5: Edge Case Tests

### 5.1 `src/test/edgeCases.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { checkImpact, freePool } from '../engine/budgetCalculator';
import { daysRemainingInMonth, yearMonth } from '../engine/dateHelpers';
import { validateMonth } from '../engine/budgetValidator';
import type { Obligation } from '../db/models';

function makeObligation(overrides: Partial<Obligation> = {}): Obligation {
  return {
    id: 1, monthId: 1, name: 'Test', amountPlanned: 100,
    dueDate: '2026-04-15', isRecurring: false, status: 'pending',
    createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('edge cases', () => {
  it('last day of month returns 1', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 30))).toBe(1);
  });

  it('first day of month returns full month', () => {
    expect(daysRemainingInMonth(new Date(2026, 3, 1))).toBe(30);
  });

  it('February leap year', () => {
    expect(daysRemainingInMonth(new Date(2028, 1, 1))).toBe(29);
  });

  it('yearMonth pads single-digit months', () => {
    expect(yearMonth(new Date(2026, 0, 5))).toBe('2026-01');
  });

  it('zero total available', () => {
    const result = checkImpact(50, 0, [], 0, [], new Date(2026, 3, 15));
    expect(result.verdict.severity).toBe('savings_risk');
  });

  it('very large purchase', () => {
    const result = checkImpact(999999, 3000, [], 500, [], new Date(2026, 3, 1));
    expect(result.verdict.severity).toBe('cannot_afford');
  });

  it('all obligations paid — full amount is free', () => {
    const obligations = [
      makeObligation({ amountPlanned: 1500, status: 'paid', amountActual: 1500 }),
    ];
    // 3000 - 0 (no pending) - 500 = 2500
    expect(freePool(3000, obligations, 500, [])).toBe(2500);
  });

  it('validation catches overcommitment', () => {
    const obligations = [
      makeObligation({ amountPlanned: 2000 }),
      makeObligation({ amountPlanned: 500 }),
    ];
    const result = validateMonth(2000, obligations, 200);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('exceed');
  });

  it('validation catches negative savings', () => {
    const result = validateMonth(100, [], 200);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

---

## Step 6: UX Polish

### 6.1 Loading State

Add a simple loading skeleton to Quick Check screen:

```tsx
if (data.loading) {
  return (
    <div className="p-6 pt-12 animate-pulse space-y-4">
      <div className="h-8 w-32 bg-gray-800 rounded mx-auto" />
      <div className="h-16 w-48 bg-gray-800 rounded mx-auto" />
      <div className="h-14 bg-gray-800 rounded-2xl" />
      <div className="flex gap-3">
        <div className="flex-1 h-14 bg-gray-800 rounded-2xl" />
        <div className="flex-1 h-14 bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}
```

### 6.2 Pull-to-Refresh Feel

Since this is a PWA and all data is local, there's no actual refresh needed. But add a visual indicator that data is live by showing "Updated just now" or the current time on the dashboard.

### 6.3 Haptic Feedback (Limited in PWA)

iOS Safari supports `navigator.vibrate()` only in limited cases. Instead, rely on visual feedback:
- Flash the verdict color briefly on impact check
- Subtle scale animation on buttons when tapped

Add to `src/index.css`:

```css
/* Tap feedback */
button:active {
  transform: scale(0.97);
  transition: transform 0.1s;
}

/* Verdict flash animation */
@keyframes verdict-flash {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

.verdict-enter {
  animation: verdict-flash 0.2s ease-out;
}
```

---

## Step 7: Month Navigation in Settings

Add ability to start a new month from Settings. Update `SettingsScreen.tsx`:

```tsx
// Add "Start New Month" button
<button
  onClick={() => setShowRollover(true)}
  className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-800 text-green-400"
>
  Start New Month
</button>
```

This triggers the `MonthRolloverModal` from Step 2.

---

## Step 8: Final Testing

Run the full test suite:

```bash
npx vitest run
```

Expected output:
```
✓ src/test/dateHelpers.test.ts (X tests)
✓ src/test/budgetCalculator.test.ts (X tests)
✓ src/test/verdictEngine.test.ts (X tests)
✓ src/test/integration.test.ts (X tests)
✓ src/test/recurrenceEngine.test.ts (X tests)
✓ src/test/edgeCases.test.ts (X tests)

Test Files  6 passed
Tests       ~30 passed
```

---

## Step 9: Final Build & Deploy

```bash
npm run build
git add -A
git commit -m "Phase 4: Polish, month rollover, recurring obligations, data export"
git push
```

GitHub Actions will auto-deploy to GitHub Pages.

---

## Step 10: Phase 4 Completion Checklist

- [ ] Recurrence engine generates monthly, weekly, biweekly obligations correctly
- [ ] Month rollover flow works (previous month detected, carry-over option, recurring auto-generated)
- [ ] Data export downloads a JSON backup file
- [ ] Data import restores from a JSON backup file
- [ ] Budget validation shows warnings on dashboard
- [ ] Edge case tests all pass (leap year, last day, zero amounts, huge amounts)
- [ ] Loading skeleton shows while data loads
- [ ] Button animations and verdict flash working
- [ ] "Start New Month" in Settings works
- [ ] All tests pass (`npx vitest run`)
- [ ] Production build is clean (`npm run build`)
- [ ] Deployed to GitHub Pages, PWA works offline
- [ ] Full end-to-end test: setup month → add obligations → impact check → register purchases → month rollover → verify new month

---

## Phase 4 Deliverable: Final HANDOFF.md

Generate the final `HANDOFF.md` with:
1. Complete file manifest with line counts
2. Full feature list with status (all complete)
3. All test results
4. GitHub Pages URL
5. PWA installation instructions
6. Known limitations:
   - No home screen widget (PWA limitation)
   - No push notifications
   - Data lives in browser — clearing Safari data deletes everything (use export!)
   - No multi-device sync
7. Future improvement ideas (if desired):
   - Firebase sync for multi-device
   - Spending trends / graphs over multiple months
   - Category tagging for discretionary purchases
   - Budget templates for quick month setup
