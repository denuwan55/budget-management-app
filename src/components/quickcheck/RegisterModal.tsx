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

  useEffect(() => {
    if (open) {
      setDescription('');
      setMatchedId(null);
    }
  }, [open]);

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
                {matchedId === o.id && <span className="text-green-400">{'\u2713'}</span>}
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
