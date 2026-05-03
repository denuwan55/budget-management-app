import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false,
  secondaryLabel, onSecondary,
}: ConfirmDialogProps) {
  const hasSecondary = secondaryLabel && onSecondary;
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
        {hasSecondary && (
          <button
            onClick={() => { onSecondary(); onClose(); }}
            className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white"
          >
            {secondaryLabel}
          </button>
        )}
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
