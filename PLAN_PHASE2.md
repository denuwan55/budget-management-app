# Phase 2 — Full React UI (All 5 Screens + Navigation)

> **Goal:** Complete React app with Quick Check (landing), Dashboard, Obligations, Purchases, and Settings screens. Fully functional app running on `npm run dev`.
>
> **Prerequisites:** Phase 1 complete — models, engine, repositories, and tests all passing.
>
> **Estimated deliverables:** ~25 new files, ~2,500 lines of code

---

## Architecture Overview

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx                 (bottom tab bar + route container)
│   │   └── BottomNav.tsx                (5-tab navigation bar)
│   ├── shared/
│   │   ├── CurrencyInput.tsx            (formatted numeric input)
│   │   ├── VerdictBadge.tsx             (colored severity display)
│   │   ├── EmptyState.tsx               (placeholder for empty lists)
│   │   ├── Modal.tsx                    (reusable modal/sheet)
│   │   └── ConfirmDialog.tsx            (delete confirmation)
│   ├── quickcheck/
│   │   ├── QuickCheckScreen.tsx         (landing page — the primary interface)
│   │   ├── ImpactDisplay.tsx            (impact result breakdown)
│   │   └── RegisterModal.tsx            (description + obligation match)
│   ├── dashboard/
│   │   ├── DashboardScreen.tsx          (overview screen)
│   │   ├── BudgetSummaryCard.tsx        (top summary numbers)
│   │   └── UpcomingObligations.tsx      (timeline list)
│   ├── obligations/
│   │   ├── ObligationsScreen.tsx        (full obligation list)
│   │   ├── ObligationRow.tsx            (single obligation row)
│   │   ├── AddObligationModal.tsx       (add/edit form)
│   │   └── MarkPaidModal.tsx            (enter actual amount)
│   ├── purchases/
│   │   ├── PurchasesScreen.tsx          (purchase log)
│   │   ├── PurchaseRow.tsx              (single purchase row)
│   │   └── PurchaseFilterBar.tsx        (filter controls)
│   └── settings/
│       ├── SettingsScreen.tsx           (month config)
│       └── MonthSetupModal.tsx          (first-time / new month setup)
├── hooks/
│   ├── useBudgetData.ts                (loads month + obligations + purchases)
│   └── useCurrentMonth.ts              (gets or prompts for current month)
├── lib/
│   └── formatters.ts                   (currency, date display helpers)
```

---

## Step 1: Utility Helpers

### 1.1 `src/lib/formatters.ts`

```typescript
/**
 * Format a number as USD currency string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as USD with cents.
 */
export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format an ISO date string as "Apr 7" or "Apr 7, 2026".
 */
export function formatDateShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an ISO datetime string as "Apr 7, 2:30 PM".
 */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get the severity color class for Tailwind.
 */
export function severityColor(severity: string): string {
  switch (severity) {
    case 'comfortable': return 'text-green-400';
    case 'tight': return 'text-yellow-400';
    case 'painful': return 'text-orange-400';
    case 'savings_risk': return 'text-orange-500';
    case 'cannot_afford': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

/**
 * Get the severity background color class for Tailwind.
 */
export function severityBg(severity: string): string {
  switch (severity) {
    case 'comfortable': return 'bg-green-400/10';
    case 'tight': return 'bg-yellow-400/10';
    case 'painful': return 'bg-orange-400/10';
    case 'savings_risk': return 'bg-orange-500/10';
    case 'cannot_afford': return 'bg-red-500/10';
    default: return 'bg-gray-400/10';
  }
}
```

---

## Step 2: Custom Hooks

### 2.1 `src/hooks/useBudgetData.ts`

Central hook that loads all data for the current month and computes derived values.

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { yearMonth as getYearMonth } from '../engine/dateHelpers';
import {
  freePool,
  dailyBudget,
  obligationsRemaining,
  discretionarySpent,
} from '../engine/budgetCalculator';
import { daysRemainingInMonth } from '../engine/dateHelpers';
import type { Month, Obligation, Purchase } from '../db/models';

export interface BudgetData {
  month: Month | undefined;
  obligations: Obligation[];
  purchases: Purchase[];
  // Derived values
  freePool: number;
  dailyBudget: number;
  obligationsRemaining: number;
  discretionarySpent: number;
  daysRemaining: number;
  // Filtered views
  pendingObligations: Obligation[];
  overdueObligations: Obligation[];
  upcomingObligations: Obligation[];
  loading: boolean;
}

export function useBudgetData(): BudgetData {
  const ym = getYearMonth();

  const month = useLiveQuery(() => db.months.where('yearMonth').equals(ym).first());

  const allObligations = useLiveQuery(
    () => (month?.id ? db.obligations.where('monthId').equals(month.id).sortBy('dueDate') : []),
    [month?.id]
  );

  const allPurchases = useLiveQuery(
    () => (month?.id ? db.purchases.where('monthId').equals(month.id).reverse().sortBy('createdAt') : []),
    [month?.id]
  );

  const obligations = allObligations ?? [];
  const purchases = allPurchases ?? [];
  const loading = month === undefined && allObligations === undefined;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const daysLeft = daysRemainingInMonth(today);

  const free = month
    ? freePool(month.totalAvailable, obligations, month.savingsTarget, purchases)
    : 0;

  const daily = dailyBudget(free, daysLeft);

  const pending = obligations.filter((o) => o.status === 'pending');
  const overdue = pending.filter((o) => o.dueDate < todayStr);
  const upcoming = pending
    .filter((o) => o.dueDate >= todayStr)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  return {
    month,
    obligations,
    purchases,
    freePool: free,
    dailyBudget: daily,
    obligationsRemaining: obligationsRemaining(obligations),
    discretionarySpent: discretionarySpent(purchases),
    daysRemaining: daysLeft,
    pendingObligations: pending,
    overdueObligations: overdue,
    upcomingObligations: upcoming,
    loading,
  };
}
```

### 2.2 `src/hooks/useCurrentMonth.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { yearMonth } from '../engine/dateHelpers';

/**
 * Returns the current month record, or undefined if not set up yet.
 */
export function useCurrentMonth() {
  const ym = yearMonth();
  return useLiveQuery(() => db.months.where('yearMonth').equals(ym).first());
}
```

---

## Step 3: Shared Components

### 3.1 `src/components/shared/CurrencyInput.tsx`

```tsx
import { useRef, useEffect } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  large?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus = false,
  className = '',
  large = false,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // Allow only one decimal point
    const parts = raw.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    onChange(sanitized);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`text-gray-400 ${large ? 'text-4xl' : 'text-xl'}`}>$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`bg-transparent outline-none w-full font-bold ${
          large ? 'text-4xl' : 'text-xl'
        }`}
      />
    </div>
  );
}
```

### 3.2 `src/components/shared/VerdictBadge.tsx`

```tsx
import type { Verdict } from '../../engine/types';
import { severityColor, severityBg } from '../../lib/formatters';

interface VerdictBadgeProps {
  verdict: Verdict;
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <div className={`rounded-xl p-4 ${severityBg(verdict.severity)}`}>
      <p className={`font-bold text-lg ${severityColor(verdict.severity)}`}>
        {verdict.headline}
      </p>
      <p className="text-sm text-gray-300 mt-1">{verdict.detail}</p>
    </div>
  );
}
```

### 3.3 `src/components/shared/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon: string;  // emoji
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
```

### 3.4 `src/components/shared/Modal.tsx`

```tsx
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
```

### 3.5 `src/components/shared/ConfirmDialog.tsx`

```tsx
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-gray-300 mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 py-3 rounded-xl font-semibold ${
            danger ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
```

---

## Step 4: Navigation Shell

### 4.1 `src/components/layout/BottomNav.tsx`

```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Check', icon: '⚡' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/obligations', label: 'Bills', icon: '📋' },
  { to: '/purchases', label: 'Purchases', icon: '🛒' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

### 4.2 `src/components/layout/AppShell.tsx`

```tsx
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="max-w-lg mx-auto">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
```

### 4.3 Update `src/App.tsx` with routing

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { QuickCheckScreen } from './components/quickcheck/QuickCheckScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ObligationsScreen } from './components/obligations/ObligationsScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<QuickCheckScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/obligations" element={<ObligationsScreen />} />
          <Route path="/purchases" element={<PurchasesScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Step 5: Quick Check Screen (Landing Page)

This is the most important screen — the one you see when you tap the home screen icon.

### 5.1 `src/components/quickcheck/QuickCheckScreen.tsx`

```tsx
import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { checkImpact } from '../../engine/budgetCalculator';
import { formatCurrency } from '../../lib/formatters';
import { CurrencyInput } from '../shared/CurrencyInput';
import { ImpactDisplay } from './ImpactDisplay';
import { RegisterModal } from './RegisterModal';
import { MonthSetupModal } from '../settings/MonthSetupModal';
import type { ImpactResult } from '../../engine/types';

export function QuickCheckScreen() {
  const data = useBudgetData();
  const [amount, setAmount] = useState('');
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // If no month set up, show setup prompt
  if (!data.loading && !data.month) {
    return (
      <div className="p-6 pt-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">MindfulSpend</h1>
          <p className="text-gray-400 mb-6">Set up your budget to get started.</p>
          <button
            onClick={() => setShowSetup(true)}
            className="px-6 py-3 bg-blue-600 rounded-xl font-semibold"
          >
            Set Up This Month
          </button>
        </div>
        <MonthSetupModal open={showSetup} onClose={() => setShowSetup(false)} />
      </div>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;

  const handleCheckImpact = () => {
    if (parsedAmount <= 0 || !data.month) return;
    const result = checkImpact(
      parsedAmount,
      data.month.totalAvailable,
      data.obligations,
      data.month.savingsTarget,
      data.purchases
    );
    setImpact(result);
  };

  const handleRegister = () => {
    if (parsedAmount <= 0) return;
    setShowRegister(true);
  };

  const handleRegistered = () => {
    setShowRegister(false);
    setAmount('');
    setImpact(null);
  };

  const handleClear = () => {
    setAmount('');
    setImpact(null);
  };

  return (
    <div className="p-6 pt-8">
      {/* Hero: Daily budget */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-400">Daily budget</p>
        <p className={`text-5xl font-bold tabular-nums ${data.dailyBudget >= 0 ? 'text-white' : 'text-red-500'}`}>
          {formatCurrency(data.dailyBudget)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(data.freePool)} free &middot; {data.daysRemaining} days left
        </p>
      </div>

      {/* Amount input */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4">
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          autoFocus={true}
          large={true}
          placeholder="0"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCheckImpact}
          disabled={parsedAmount <= 0}
          className="flex-1 py-4 rounded-2xl font-semibold bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
        >
          Check Impact
        </button>
        <button
          onClick={handleRegister}
          disabled={parsedAmount <= 0}
          className="flex-1 py-4 rounded-2xl font-semibold bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
        >
          Register
        </button>
      </div>

      {/* Impact result */}
      {impact && (
        <div className="space-y-4">
          <ImpactDisplay result={impact} />
          <button
            onClick={handleClear}
            className="w-full py-2 text-sm text-gray-400"
          >
            Clear
          </button>
        </div>
      )}

      {/* Next upcoming obligation teaser */}
      {!impact && data.upcomingObligations.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Coming up</p>
          {data.upcomingObligations.slice(0, 2).map((o) => (
            <div key={o.id} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-gray-400">
                {formatCurrency(o.amountPlanned)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Overdue warning */}
      {data.overdueObligations.length > 0 && (
        <div className="bg-orange-500/10 rounded-2xl p-4 mt-4">
          <p className="text-sm font-semibold text-orange-400 mb-1">Overdue</p>
          {data.overdueObligations.map((o) => (
            <p key={o.id} className="text-sm text-gray-300">
              {o.name} — {formatCurrency(o.amountPlanned)}
            </p>
          ))}
        </div>
      )}

      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        amount={parsedAmount}
        monthId={data.month?.id ?? 0}
        pendingObligations={data.pendingObligations}
        onRegistered={handleRegistered}
      />
    </div>
  );
}
```

### 5.2 `src/components/quickcheck/ImpactDisplay.tsx`

```tsx
import type { ImpactResult } from '../../engine/types';
import { formatCurrency } from '../../lib/formatters';
import { VerdictBadge } from '../shared/VerdictBadge';

interface ImpactDisplayProps {
  result: ImpactResult;
}

export function ImpactDisplay({ result }: ImpactDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Verdict */}
      <VerdictBadge verdict={result.verdict} />

      {/* Breakdown */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
        <Row
          label="Free pool"
          before={result.currentFreePool}
          after={result.proposedFreePool}
        />
        <Row
          label="Daily budget"
          before={result.currentDailyBudget}
          after={result.proposedDailyBudget}
          suffix="/day"
        />
        <div className="border-t border-gray-800 pt-3">
          <p className="text-sm text-gray-400">
            That's <span className="text-white font-medium">
              {result.daysEquivalent === Infinity ? '∞' : result.daysEquivalent.toFixed(1)}
            </span> days of budget in one purchase
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <StatusPill ok={result.savingsIntact} label="Savings" />
          <StatusPill ok={result.obligationsIntact} label="Obligations" />
        </div>
      </div>

      {/* Upcoming obligations context */}
      {result.upcomingObligations.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2">Coming up</p>
          {result.upcomingObligations.map((o, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-gray-400">
                {formatCurrency(o.amount)} in {o.daysUntilDue}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label, before, after, suffix = '',
}: {
  label: string; before: number; after: number; suffix?: string;
}) {
  const isNegative = after < 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm">
        <span className="text-gray-500">{formatCurrency(before)}</span>
        <span className="text-gray-600 mx-1">→</span>
        <span className={isNegative ? 'text-red-400 font-medium' : 'text-white font-medium'}>
          {formatCurrency(after)}{suffix}
        </span>
      </span>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
      ok ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
    }`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}
```

### 5.3 `src/components/quickcheck/RegisterModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { purchaseRepository } from '../../db/repositories/purchaseRepository';
import { formatCurrency } from '../../lib/formatters';
import type { Obligation } from '../../db/models';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  monthId: number;
  pendingObligations: Obligation[];
  onRegistered: () => void;
}

export function RegisterModal({
  open, onClose, amount, monthId, pendingObligations, onRegistered,
}: RegisterModalProps) {
  const [description, setDescription] = useState('');
  const [matchedId, setMatchedId] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setDescription('');
      setMatchedId(null);
    }
  }, [open]);

  // Suggest obligations with similar amounts (within 20% tolerance)
  const suggestions = pendingObligations.filter((o) => {
    const ratio = amount / o.amountPlanned;
    return ratio > 0.8 && ratio < 1.2;
  });

  const handleSave = async () => {
    if (!description.trim()) return;

    if (matchedId) {
      await purchaseRepository.registerWithObligation(
        monthId, amount, description.trim(), matchedId
      );
    } else {
      await purchaseRepository.register(monthId, amount, description.trim());
    }

    onRegistered();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Register ${formatCurrency(amount)}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">What was this for?</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner with Jake"
            autoFocus
            className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {suggestions.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2">Match to obligation?</p>
            {suggestions.map((o) => (
              <button
                key={o.id}
                onClick={() => setMatchedId(matchedId === o.id ? null : o.id!)}
                className={`w-full flex justify-between items-center p-3 rounded-xl mb-2 transition-colors ${
                  matchedId === o.id ? 'bg-blue-600/20 ring-1 ring-blue-500' : 'bg-gray-800'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrency(o.amountPlanned)}</p>
                </div>
                {matchedId === o.id && <span className="text-green-400">✓</span>}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!description.trim()}
          className="w-full py-3 rounded-xl font-semibold bg-green-600 disabled:bg-gray-800 disabled:text-gray-600"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
```

---

## Step 6: Dashboard Screen

### 6.1 `src/components/dashboard/DashboardScreen.tsx`

```tsx
import { useBudgetData } from '../../hooks/useBudgetData';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { UpcomingObligations } from './UpcomingObligations';
import { formatCurrency } from '../../lib/formatters';
import { EmptyState } from '../shared/EmptyState';

export function DashboardScreen() {
  const data = useBudgetData();

  if (!data.month) {
    return <EmptyState icon="📊" title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  return (
    <div className="p-6 pt-8 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <BudgetSummaryCard data={data} />

      {data.overdueObligations.length > 0 && (
        <div className="bg-orange-500/10 rounded-2xl p-4">
          <p className="text-sm font-semibold text-orange-400 mb-2">Overdue</p>
          {data.overdueObligations.map((o) => (
            <div key={o.id} className="flex justify-between py-1">
              <span className="text-sm text-gray-300">{o.name}</span>
              <span className="text-sm text-orange-400">{formatCurrency(o.amountPlanned)}</span>
            </div>
          ))}
        </div>
      )}

      <UpcomingObligations obligations={data.upcomingObligations} />
    </div>
  );
}
```

### 6.2 `src/components/dashboard/BudgetSummaryCard.tsx`

```tsx
import type { BudgetData } from '../../hooks/useBudgetData';
import { formatCurrency } from '../../lib/formatters';

interface Props {
  data: BudgetData;
}

export function BudgetSummaryCard({ data }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
      {/* Hero metric */}
      <div className="text-center">
        <p className="text-sm text-gray-400">Daily Budget</p>
        <p className={`text-5xl font-bold tabular-nums ${data.dailyBudget >= 0 ? 'text-white' : 'text-red-500'}`}>
          {formatCurrency(data.dailyBudget)}
        </p>
        <p className="text-xs text-gray-500 mt-1">{data.daysRemaining} days remaining</p>
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <SummaryRow label="Total available" amount={data.month?.totalAvailable ?? 0} />
        <SummaryRow label="Obligations pending" amount={-data.obligationsRemaining} />
        <SummaryRow label="Savings target" amount={-(data.month?.savingsTarget ?? 0)} />
        <SummaryRow label="Discretionary spent" amount={-data.discretionarySpent} />
        <div className="border-t border-gray-800 pt-2">
          <SummaryRow label="Free pool" amount={data.freePool} bold />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${
        amount < 0 && bold ? 'text-red-400' : ''
      }`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
```

### 6.3 `src/components/dashboard/UpcomingObligations.tsx`

```tsx
import type { Obligation } from '../../db/models';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  obligations: Obligation[];
}

export function UpcomingObligations({ obligations }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <p className="text-sm font-semibold mb-3">Upcoming</p>
      {obligations.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming obligations</p>
      ) : (
        obligations.slice(0, 5).map((o) => (
          <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <div>
              <p className="text-sm font-medium">{o.name}</p>
              <p className="text-xs text-gray-500">{formatDateShort(o.dueDate)}</p>
            </div>
            <p className="text-sm tabular-nums">{formatCurrency(o.amountPlanned)}</p>
          </div>
        ))
      )}
    </div>
  );
}
```

---

## Step 7: Obligations Screen

### 7.1 `src/components/obligations/ObligationsScreen.tsx`

```tsx
import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { obligationRepository } from '../../db/repositories/obligationRepository';
import { ObligationRow } from './ObligationRow';
import { AddObligationModal } from './AddObligationModal';
import { MarkPaidModal } from './MarkPaidModal';
import { EmptyState } from '../shared/EmptyState';
import type { Obligation } from '../../db/models';

export function ObligationsScreen() {
  const data = useBudgetData();
  const [showAdd, setShowAdd] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [payingObligation, setPayingObligation] = useState<Obligation | null>(null);

  if (!data.month) {
    return <EmptyState icon="📋" title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const overdue = data.obligations.filter((o) => o.status === 'pending' && o.dueDate < new Date().toISOString().split('T')[0]);
  const pending = data.obligations.filter((o) => o.status === 'pending' && o.dueDate >= new Date().toISOString().split('T')[0]);
  const paid = data.obligations.filter((o) => o.status === 'paid');
  const cancelled = data.obligations.filter((o) => o.status === 'cancelled');

  const handleDelete = async (id: number) => {
    await obligationRepository.delete(id);
  };

  const handleCancel = async (id: number) => {
    await obligationRepository.cancel(id);
  };

  return (
    <div className="p-6 pt-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Obligations</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold"
        >
          + Add
        </button>
      </div>

      {data.obligations.length === 0 ? (
        <EmptyState icon="📋" title="No Obligations" subtitle="Add your monthly expenses like rent, utilities, and subscriptions." />
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <Section title="Overdue" items={overdue}
              onEdit={setEditingObligation} onPay={setPayingObligation}
              onCancel={handleCancel} onDelete={handleDelete} />
          )}
          {pending.length > 0 && (
            <Section title="Pending" items={pending}
              onEdit={setEditingObligation} onPay={setPayingObligation}
              onCancel={handleCancel} onDelete={handleDelete} />
          )}
          {paid.length > 0 && (
            <Section title="Paid" items={paid}
              onEdit={setEditingObligation} onPay={setPayingObligation}
              onCancel={handleCancel} onDelete={handleDelete} />
          )}
          {cancelled.length > 0 && (
            <Section title="Cancelled" items={cancelled}
              onEdit={setEditingObligation} onPay={setPayingObligation}
              onCancel={handleCancel} onDelete={handleDelete} />
          )}
        </div>
      )}

      <AddObligationModal
        open={showAdd || editingObligation !== null}
        onClose={() => { setShowAdd(false); setEditingObligation(null); }}
        monthId={data.month.id!}
        editing={editingObligation}
      />

      {payingObligation && (
        <MarkPaidModal
          open={true}
          onClose={() => setPayingObligation(null)}
          obligation={payingObligation}
        />
      )}
    </div>
  );
}

function Section({
  title, items, onEdit, onPay, onCancel, onDelete,
}: {
  title: string;
  items: Obligation[];
  onEdit: (o: Obligation) => void;
  onPay: (o: Obligation) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800">
        {items.map((o) => (
          <ObligationRow
            key={o.id}
            obligation={o}
            onEdit={() => onEdit(o)}
            onPay={() => onPay(o)}
            onCancel={() => onCancel(o.id!)}
            onDelete={() => onDelete(o.id!)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 7.2 `src/components/obligations/ObligationRow.tsx`

```tsx
import type { Obligation } from '../../db/models';
import { formatCurrency, formatDateShort } from '../../lib/formatters';

interface Props {
  obligation: Obligation;
  onEdit: () => void;
  onPay: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ObligationRow({ obligation: o, onEdit, onPay, onCancel, onDelete }: Props) {
  const isOverdue = o.status === 'pending' && o.dueDate < new Date().toISOString().split('T')[0];

  return (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className={`font-medium ${o.status === 'cancelled' ? 'line-through text-gray-500' : ''}`}>
              {o.name}
            </p>
            {o.isRecurring && <span className="text-xs text-blue-400">↻</span>}
          </div>
          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
            {formatDateShort(o.dueDate)}
            {o.status === 'paid' && o.amountActual !== undefined && (
              <span className="text-green-400 ml-2">Paid: {formatCurrency(o.amountActual)}</span>
            )}
          </p>
        </div>
        <p className={`font-medium tabular-nums ${o.status === 'paid' ? 'text-gray-500' : ''}`}>
          {formatCurrency(o.amountPlanned)}
        </p>
      </div>

      {o.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button onClick={onPay} className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded-lg">
            Pay
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg">
            Edit
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-orange-600/20 text-orange-400 rounded-lg">
            Cancel
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 rounded-lg">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
```

### 7.3 `src/components/obligations/AddObligationModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { obligationRepository } from '../../db/repositories/obligationRepository';
import { formatDate } from '../../engine/dateHelpers';
import type { Obligation } from '../../db/models';

interface Props {
  open: boolean;
  onClose: () => void;
  monthId: number;
  editing: Obligation | null;
}

export function AddObligationModal({ open, onClose, monthId, editing }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(formatDate(new Date()));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<'weekly' | 'monthly' | 'biweekly'>('monthly');

  useEffect(() => {
    if (open && editing) {
      setName(editing.name);
      setAmount(String(editing.amountPlanned));
      setDueDate(editing.dueDate);
      setIsRecurring(editing.isRecurring);
      setRecurrenceRule(editing.recurrenceRule ?? 'monthly');
    } else if (open) {
      setName('');
      setAmount('');
      setDueDate(formatDate(new Date()));
      setIsRecurring(false);
      setRecurrenceRule('monthly');
    }
  }, [open, editing]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || !parsedAmount || parsedAmount <= 0) return;

    if (editing?.id) {
      await obligationRepository.update(editing.id, {
        name: name.trim(),
        amountPlanned: parsedAmount,
        dueDate,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
      });
    } else {
      await obligationRepository.add(monthId, {
        name: name.trim(),
        amountPlanned: parsedAmount,
        dueDate,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
      });
    }

    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Obligation' : 'Add Obligation'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Rent"
            autoFocus
            className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Recurring</span>
          <button
            onClick={() => setIsRecurring(!isRecurring)}
            className={`w-12 h-7 rounded-full transition-colors ${isRecurring ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transform transition-transform mx-1 ${
              isRecurring ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {isRecurring && (
          <div className="flex gap-2">
            {(['weekly', 'biweekly', 'monthly'] as const).map((rule) => (
              <button
                key={rule}
                onClick={() => setRecurrenceRule(rule)}
                className={`flex-1 py-2 rounded-xl text-sm ${
                  recurrenceRule === rule ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {rule}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!name.trim() || !parseFloat(amount)}
          className="w-full py-3 rounded-xl font-semibold bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600"
        >
          {editing ? 'Update' : 'Add'}
        </button>
      </div>
    </Modal>
  );
}
```

### 7.4 `src/components/obligations/MarkPaidModal.tsx`

```tsx
import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { obligationRepository } from '../../db/repositories/obligationRepository';
import { formatCurrency } from '../../lib/formatters';
import type { Obligation } from '../../db/models';

interface Props {
  open: boolean;
  onClose: () => void;
  obligation: Obligation;
}

export function MarkPaidModal({ open, onClose, obligation }: Props) {
  const [amount, setAmount] = useState(String(obligation.amountPlanned));

  const parsedAmount = parseFloat(amount) || 0;
  const diff = parsedAmount - obligation.amountPlanned;

  const handleConfirm = async () => {
    if (parsedAmount <= 0) return;
    await obligationRepository.markPaid(obligation.id!, parsedAmount);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Mark as Paid">
      <div className="space-y-4">
        <div>
          <p className="font-semibold text-lg">{obligation.name}</p>
          <p className="text-sm text-gray-400">Planned: {formatCurrency(obligation.amountPlanned)}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Actual amount paid</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={amount} onChange={setAmount} autoFocus />
          </div>
        </div>

        {diff !== 0 && parsedAmount > 0 && (
          <p className={`text-sm ${diff > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {diff > 0
              ? `${formatCurrency(Math.abs(diff))} more than planned. The extra comes from your free pool.`
              : `${formatCurrency(Math.abs(diff))} less than planned. The savings go back to your free pool.`
            }
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={parsedAmount <= 0}
          className="w-full py-3 rounded-xl font-semibold bg-green-600 disabled:bg-gray-800 disabled:text-gray-600"
        >
          Confirm Payment
        </button>
      </div>
    </Modal>
  );
}
```

---

## Step 8: Purchases Screen

### 8.1 `src/components/purchases/PurchasesScreen.tsx`

```tsx
import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { purchaseRepository } from '../../db/repositories/purchaseRepository';
import { PurchaseRow } from './PurchaseRow';
import { PurchaseFilterBar } from './PurchaseFilterBar';
import { EmptyState } from '../shared/EmptyState';
import { formatCurrency } from '../../lib/formatters';
import { ConfirmDialog } from '../shared/ConfirmDialog';

export type PurchaseFilter = 'all' | 'discretionary' | 'obligations';

export function PurchasesScreen() {
  const data = useBudgetData();
  const [filter, setFilter] = useState<PurchaseFilter>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = data.purchases.filter((p) => {
    if (filter === 'discretionary') return !p.matchedObligationId;
    if (filter === 'obligations') return !!p.matchedObligationId;
    return true;
  });

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = async () => {
    if (deletingId) {
      await purchaseRepository.delete(deletingId);
      setDeletingId(null);
    }
  };

  if (!data.month) {
    return <EmptyState icon="🛒" title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  return (
    <div className="p-6 pt-8">
      <h1 className="text-xl font-bold mb-4">Purchases</h1>

      <PurchaseFilterBar filter={filter} onChange={setFilter} />

      <div className="flex justify-between items-center my-3">
        <span className="text-sm text-gray-400">Total</span>
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🛒" title="No Purchases" subtitle="Registered purchases will appear here." />
      ) : (
        <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800">
          {filtered.map((p) => (
            <PurchaseRow
              key={p.id}
              purchase={p}
              onDelete={() => setDeletingId(p.id!)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message="This will restore the amount to your free pool. If this was matched to an obligation, the obligation will be reset to pending."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
```

### 8.2 `src/components/purchases/PurchaseRow.tsx`

```tsx
import type { Purchase } from '../../db/models';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface Props {
  purchase: Purchase;
  onDelete: () => void;
}

export function PurchaseRow({ purchase: p, onDelete }: Props) {
  return (
    <div className="p-4 flex justify-between items-start">
      <div className="flex-1">
        <p className="font-medium">{p.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{formatDateTime(p.createdAt)}</span>
          {p.matchedObligationId && (
            <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full">
              obligation
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-medium tabular-nums">{formatCurrency(p.amount)}</p>
        <button onClick={onDelete} className="text-red-400 text-xs">✗</button>
      </div>
    </div>
  );
}
```

### 8.3 `src/components/purchases/PurchaseFilterBar.tsx`

```tsx
import type { PurchaseFilter } from './PurchasesScreen';

interface Props {
  filter: PurchaseFilter;
  onChange: (f: PurchaseFilter) => void;
}

const filters: { value: PurchaseFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'discretionary', label: 'Discretionary' },
  { value: 'obligations', label: 'Obligations' },
];

export function PurchaseFilterBar({ filter, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
```

---

## Step 9: Settings Screen

### 9.1 `src/components/settings/SettingsScreen.tsx`

```tsx
import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { monthRepository } from '../../db/repositories/monthRepository';
import { CurrencyInput } from '../shared/CurrencyInput';
import { EmptyState } from '../shared/EmptyState';

export function SettingsScreen() {
  const data = useBudgetData();
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form values from data
  if (data.month && !initialized) {
    setTotalStr(String(data.month.totalAvailable));
    setSavingsStr(String(data.month.savingsTarget));
    setInitialized(true);
  }

  if (!data.month) {
    return <EmptyState icon="⚙️" title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const handleSaveTotal = async () => {
    const val = parseFloat(totalStr);
    if (val > 0 && data.month?.id) {
      await monthRepository.updateTotalAvailable(data.month.id, val);
    }
  };

  const handleSaveSavings = async () => {
    const val = parseFloat(savingsStr) || 0;
    if (data.month?.id) {
      await monthRepository.updateSavingsTarget(data.month.id, val);
    }
  };

  return (
    <div className="p-6 pt-8 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400">Monthly Budget</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Total Available</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3">
              <CurrencyInput value={totalStr} onChange={setTotalStr} />
            </div>
            <button onClick={handleSaveTotal} className="px-4 py-3 bg-blue-600 rounded-xl text-sm font-semibold">
              Save
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings Target</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3">
              <CurrencyInput value={savingsStr} onChange={setSavingsStr} />
            </div>
            <button onClick={handleSaveSavings} className="px-4 py-3 bg-blue-600 rounded-xl text-sm font-semibold">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">Current Month</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Month</span>
          <span>{data.month.yearMonth}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Created</span>
          <span>{new Date(data.month.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">About</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">App</span>
          <span>MindfulSpend</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Version</span>
          <span>1.0</span>
        </div>
      </div>
    </div>
  );
}
```

### 9.2 `src/components/settings/MonthSetupModal.tsx`

```tsx
import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CurrencyInput } from '../shared/CurrencyInput';
import { monthRepository } from '../../db/repositories/monthRepository';
import { yearMonth } from '../../engine/dateHelpers';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MonthSetupModal({ open, onClose }: Props) {
  const [totalStr, setTotalStr] = useState('');
  const [savingsStr, setSavingsStr] = useState('');

  const handleStart = async () => {
    const total = parseFloat(totalStr);
    const savings = parseFloat(savingsStr) || 0;
    if (total <= 0) return;

    await monthRepository.getOrCreate(yearMonth(), total, savings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Up This Month">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Set up your budget for <span className="text-white font-medium">{yearMonth()}</span>
        </p>

        <div>
          <label className="block text-sm text-gray-400 mb-1">How much is in your expense account?</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={totalStr} onChange={setTotalStr} autoFocus large />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Savings target this month</label>
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <CurrencyInput value={savingsStr} onChange={setSavingsStr} placeholder="0" />
          </div>
        </div>

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

---

## Step 10: Update index.css for Mobile Optimization

Add to `src/index.css`:

```css
@import "tailwindcss";

/* Safe area padding for bottom nav on notched iPhones */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Prevent text selection on interactive elements */
button, a {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Dark mode input styling */
input[type="date"] {
  color-scheme: dark;
}
```

---

## Step 11: Phase 2 Completion Checklist

- [ ] All 5 screens render and navigate via bottom tab bar
- [ ] Quick Check: amount input auto-focuses, Impact Check shows layered result, Register saves purchase
- [ ] Dashboard: shows correct calculated values, upcoming obligations, overdue warnings
- [ ] Obligations: add, edit, mark paid, cancel, delete all work
- [ ] Purchases: list, filter, delete all work (obligation reset on delete)
- [ ] Settings: edit total available and savings target, values persist
- [ ] Month setup flow works (first launch → setup modal → Quick Check populates)
- [ ] All Phase 1 tests still pass (`npx vitest run`)
- [ ] `npm run dev` serves the app, works in mobile browser
- [ ] Data persists across browser refresh (IndexedDB working)

---

## Phase 2 Deliverable: Update HANDOFF.md

After Phase 2 is complete, update `HANDOFF.md` with:
1. Full file manifest with line counts (Phase 1 + Phase 2 files)
2. All screens implemented and their current state
3. Any deviations from the plan
4. What Phase 3 expects to find (Vite PWA plugin, manifest, etc.)
