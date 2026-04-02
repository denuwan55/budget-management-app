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
