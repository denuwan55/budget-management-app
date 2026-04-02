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
    return <EmptyState icon={'\uD83D\uDCCB'} title="No Month Set Up" subtitle="Go to Check tab to set up your first month." />;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const overdue = data.obligations.filter((o) => o.status === 'pending' && o.dueDate < todayStr);
  const pending = data.obligations.filter((o) => o.status === 'pending' && o.dueDate >= todayStr);
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
        <EmptyState icon={'\uD83D\uDCCB'} title="No Obligations" subtitle="Add your monthly expenses like rent, utilities, and subscriptions." />
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
