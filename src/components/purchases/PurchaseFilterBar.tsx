import type { PurchaseFilter } from './PurchasesScreen';
import { CATEGORIES, CATEGORY_COLORS, type Category } from '../../db/categories';

interface Props {
  filter: PurchaseFilter;
  onChange: (f: PurchaseFilter) => void;
  categoryFilter: string | null;
  onCategoryChange: (c: string | null) => void;
}

const filters: { value: PurchaseFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'discretionary', label: 'Discretionary' },
  { value: 'obligations', label: 'Obligations' },
];

export function PurchaseFilterBar({ filter, onChange, categoryFilter, onCategoryChange }: Props) {
  return (
    <div className="space-y-2">
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
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
            categoryFilter === null ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(categoryFilter === c ? null : c)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              categoryFilter === c
                ? CATEGORY_COLORS[c as Category]
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
