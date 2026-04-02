import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { QuickCheckScreen } from './components/quickcheck/QuickCheckScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ObligationsScreen } from './components/obligations/ObligationsScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';

const TrendsScreen = lazy(() => import('./components/trends/TrendsScreen').then(m => ({ default: m.TrendsScreen })));

function App() {
  return (
    <BrowserRouter basename="/budget-management-app">
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<QuickCheckScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/obligations" element={<ObligationsScreen />} />
          <Route path="/purchases" element={<PurchasesScreen />} />
          <Route path="/trends" element={<Suspense fallback={<div className="p-6 pt-8 animate-pulse"><div className="h-56 bg-gray-800 rounded-2xl" /></div>}><TrendsScreen /></Suspense>} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
