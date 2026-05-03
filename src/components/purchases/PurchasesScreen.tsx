import { useState } from 'react';
import { useBudgetData } from '../../hooks/useBudgetData';
import { purchaseRepository } from '../../db/repositories/purchaseRepository';
import { PurchaseRow } from './PurchaseRow';
import { PurchaseFilterBar } from './PurchaseFilterBar';
import { EmptyState } from '../shared/EmptyState';
import { formatCurrency } from '../../lib/formatters';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import type { Purchase } from '../../db/models';

export type PurchaseFilter = 'all' | 'discretionary' | 'obligations';

export function PurchasesScreen() {
  const data = useBudgetData();
  const [filter, setFilter] = useState<PurchaseFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Purchase | null>(null);

  const filtered = data.purchases.filter((p) => {
    if (filter === 'discretionary' && p.matchedObligationId) return false;
    if (filter === 'obligations' && !p.matchedObligationId) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    return true;
  });

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);

  const handleGiveBack = async () => {
    if (deleting?.id) {
      await purchaseRepository.delete(deleting.id);
      setDeleting(null);
    }
  };

  const handleJustCut = async () => {
    if (deleting?.id) {
      await purchaseRepository.deleteAndAbsorb(deleting.id);
      setDeleting(null);
    }
  };

  if (!data.month) {
    return <EmptyState icon={'🛒'} title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const isDiscretionary = deleting !== null && !deleting.matchedObligationId;

  return (
    <div className="p-6 pt-8">
      <h1 className="text-xl font-bold mb-4">Purchases</h1>

      <PurchaseFilterBar
        filter={filter}
        onChange={setFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="flex justify-between items-center my-3">
        <span className="text-sm text-gray-400">Total</span>
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={'🛒'} title="No Purchases" subtitle="Registered purchases will appear here." />
      ) : (
        <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800">
          {filtered.map((p) => (
            <PurchaseRow
              key={p.id}
              purchase={p}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      )}

      {isDiscretionary ? (
        <ConfirmDialog
          open={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={handleJustCut}
          onSecondary={handleGiveBack}
          title="Delete Purchase"
          message={`Remove ${formatCurrency(deleting!.amount)} spend. "Give Back" restores the amount to your free pool. "Just Cut" removes the record but keeps the money gone (your total budget shrinks).`}
          confirmLabel="Just Cut"
          secondaryLabel="Give Back"
          danger
        />
      ) : (
        <ConfirmDialog
          open={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={handleGiveBack}
          title="Delete Purchase"
          message="This will restore the amount to your free pool. The matched obligation will be reset to pending."
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}
