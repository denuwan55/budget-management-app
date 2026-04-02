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
