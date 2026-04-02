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
