# MindfulSpend — Product Specification

> **Last updated:** 2026-04-02
> **Status:** Pre-implementation — Phase 1 pending
> **Strategy:** D — Timeline-Aware Burn Rate (Hybrid B+C)
> **Platform:** PWA (Progressive Web App) — React + IndexedDB, hosted on GitHub Pages

---

## 1. Problem Statement

The user has a poor habit of managing monthly expenses. When transferring money from a main account to an expense account, they forget future obligations, assume worst case, transfer a lump sum, and spend freely without tracking. Existing tools (notes apps, spreadsheets) fail because the friction is too high — checking totals, doing mental math, and updating balances breaks down under time pressure or impulse situations.

## 2. Core Use Case — The "Craving" Scenario

User sees something expensive → feels the urge to buy → taps the **home screen icon** → app opens directly to the **Quick Check screen** with keyboard ready → types the expense amount → **instantly sees**: Will I breach my discretionary budget? What's at risk? Does it affect my savings target?

This single interaction must be **fast (<10 seconds), clear, and decisive**.

## 3. Two Habits the App Supports

1. **Monthly setup** (~5 min) — Enter total available, planned obligations with dates, and savings target. Review/adjust as things change.
2. **On-the-spot check** (<10 sec) — Before any significant purchase, tap home screen icon, type the amount, and see the impact summary instantly.

## 4. Product Strategy — Timeline-Aware Burn Rate

### Core Concept

The user gets a **self-correcting daily budget** built on top of **dated obligations**. The daily rate is calculated against what's *actually free after all known future obligations are accounted for*. The app surfaces the most relevant upcoming obligation so the user never forgets what's coming.

### How It Works

**Monthly setup:** User enters:
- **Total available** — what's in the expense account
- **Obligations** — named expenses with amounts and due dates (some recurring)
- **Savings target** — treated as a soft obligation due month-end

The app computes:
```
True discretionary = Total available - Sum(pending obligations) - Savings target
Daily budget = True discretionary / Days remaining in month
```

**On-the-spot check (Quick Check screen — app landing page):**
- User types amount, taps "Impact Check"
- Screen shows: free pool change, daily budget change, days-equivalent cost, obligation safety, savings safety, and a human-readable verdict

**Purchase registration (Quick Check screen):**
- User types amount, taps "Register"
- Prompt for name/description
- Auto-match against known obligations (one tap to confirm)
- Deducted from appropriate pool, all numbers recalculate

### Self-Correcting Properties

1. **Obligations clear themselves** — matched purchases move money from "committed" to "spent" without changing free pool
2. **Days passing helps** — $0-spend days increase tomorrow's daily budget automatically
3. **Overdue obligations surface** — unpaid obligations past their due date are flagged
4. **Mid-month edits propagate instantly** — change any number, all derived values update in real-time

### Verdict Engine

| Condition | Verdict | Severity |
|---|---|---|
| Free pool stays positive, daily budget drops < 25% | "Comfortable." | Green |
| Free pool stays positive, daily budget drops 25-50% | "Safe, but tight." + new daily rate | Yellow-green |
| Free pool stays positive, daily budget drops > 50% | "Affordable, but it'll hurt." + recovery info | Yellow |
| Free pool goes negative, savings covers it | "This eats into savings." + exact amount | Orange |
| Free pool + savings can't cover, obligations at risk | "You can't afford this." + named obligation at risk | Red |

## 5. Interface Architecture

### 5.1 Quick Check Screen (Landing Page — Primary Interface)

This is the first screen users see when they open the app. It replaces the native widget concept. Auto-focuses the amount input for immediate typing.

**Default state:**
- Daily budget display (hero number)
- Free pool display
- Amount input field (auto-focused, numeric keyboard on mobile)
- Two buttons: "Check Impact" and "Register"
- Next upcoming obligation teaser

**Impact check result (appears inline below input):**
- Free pool: before → after
- Daily budget: before → after + "for the next N days"
- Days-equivalent cost ("That's X days of budget in one purchase")
- Savings status
- Obligations status
- Next 2-3 upcoming obligations
- Human-readable verdict with color-coded severity

**Register flow:**
- Amount → modal for description → optional obligation match → save → numbers refresh

### 5.2 Dashboard Screen

- Month summary (total available, spent, obligations remaining, savings, free pool, daily budget)
- Upcoming obligations timeline
- Overdue obligations warning

### 5.3 Obligations Screen

- Full CRUD list of all obligations
- Add/edit/delete
- Mark paid (with actual amount entry)
- Recurring management (weekly/monthly/biweekly)
- Status indicators (pending, paid, overdue, cancelled)

### 5.4 Purchases Screen

- Chronological log of all registered purchases
- Each entry shows: amount, description, date, whether matched to obligation
- Filter by: discretionary, obligation-matched
- Edit or delete (restores amount to free pool)

### 5.5 Settings Screen

- Edit total available
- Edit savings target
- Month rollover (start new month, carry forward option)
- Data management (export/import JSON)

### 5.6 Navigation

Bottom tab bar (mobile-optimized):
- Quick Check (home icon — default/landing)
- Dashboard (gauge icon)
- Obligations (list icon)
- Purchases (cart icon)
- Settings (gear icon)

## 6. Data Model

### IndexedDB Tables (via Dexie.js)

```typescript
// Database schema version 1

months: '++id, &yearMonth'
// Fields: id, yearMonth, totalAvailable, savingsTarget, createdAt, updatedAt

obligations: '++id, monthId, status, dueDate'
// Fields: id, monthId, name, amountPlanned, amountActual, dueDate,
//         isRecurring, recurrenceRule, status, createdAt, updatedAt

purchases: '++id, monthId, matchedObligationId, createdAt'
// Fields: id, monthId, amount, description, matchedObligationId,
//         createdAt, updatedAt

settings: '&key'
// Fields: key, value
```

### TypeScript Interfaces

```typescript
interface Month {
  id?: number;
  yearMonth: string;        // "2026-04"
  totalAvailable: number;
  savingsTarget: number;
  createdAt: string;        // ISO 8601
  updatedAt: string;
}

interface Obligation {
  id?: number;
  monthId: number;
  name: string;
  amountPlanned: number;
  amountActual?: number;    // filled when marked paid
  dueDate: string;          // ISO 8601 date "2026-04-07"
  isRecurring: boolean;
  recurrenceRule?: string;  // "weekly" | "monthly" | "biweekly"
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id?: number;
  monthId: number;
  amount: number;
  description: string;
  matchedObligationId?: number;
  createdAt: string;
  updatedAt: string;
}

interface AppSetting {
  key: string;
  value: string;
}
```

### Key Derived Calculations (never stored, always computed)

```
obligations_remaining = SUM(amountPlanned) FROM obligations
                        WHERE monthId = current AND status = 'pending'

discretionary_spent   = SUM(amount) FROM purchases
                        WHERE monthId = current AND matchedObligationId IS NULL

free_pool             = totalAvailable - obligations_remaining - savingsTarget - discretionary_spent

days_left             = last_day_of_month - today  (minimum 1)

daily_budget          = free_pool / days_left

-- Impact check for proposed amount X:
proposed_free_pool    = free_pool - X
proposed_daily_budget = proposed_free_pool / days_left
days_equivalent       = X / daily_budget
```

## 7. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Type safety, great tooling, runs everywhere |
| UI Framework | React 18 | Component-based, fast, huge ecosystem |
| Build Tool | Vite | Fast dev server, optimized production builds |
| Styling | Tailwind CSS | Utility-first, mobile-first, minimal CSS |
| Local Database | Dexie.js (IndexedDB) | Persistent browser storage, no server needed |
| Testing | Vitest | Fast, Vite-native, Jest-compatible API |
| PWA | vite-plugin-pwa | Service worker generation, web app manifest |
| Hosting | GitHub Pages | Free, static hosting, zero maintenance |
| Routing | React Router v6 | Client-side routing for SPA |

## 8. Constraints

- Mobile-first PWA (works on any device with a browser)
- Absolute minimum friction for on-the-spot check
- No bank sync — manual entry, low habit overhead
- Local-only database (IndexedDB), zero connectivity dependency after first load
- Private app hosted on GitHub Pages (public repo, but data is local to each browser)
- Design should enforce good habits, not rely on willpower
- Must work fully offline after initial install

## 9. Implementation Phases

| Phase | Scope | Deliverable |
|---|---|---|
| Phase 1 | Project setup, Dexie.js data model, calculation engine, tests | Working engine with tests, no UI |
| Phase 2 | Full React UI (all 5 screens + navigation) | Complete functional app |
| Phase 3 | PWA setup (service worker, manifest, offline) + GitHub Pages deploy | Installable offline PWA |
| Phase 4 | Polish, edge cases, month rollover, recurring obligations | Production-ready personal app |

Each phase produces a `HANDOFF.md` — a self-contained context document enabling any new conversation to pick up from cold.

---

*This is a living document. Updated as the product evolves through implementation.*
