export const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Bills',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: 'bg-orange-500/15 text-orange-400',
  Transport: 'bg-cyan-500/15 text-cyan-400',
  Entertainment: 'bg-purple-500/15 text-purple-400',
  Healthcare: 'bg-red-500/15 text-red-400',
  Shopping: 'bg-pink-500/15 text-pink-400',
  Bills: 'bg-blue-500/15 text-blue-400',
  Other: 'bg-gray-500/15 text-gray-400',
};

export const CATEGORY_HEX: Record<Category, string> = {
  Food: '#f97316',
  Transport: '#06b6d4',
  Entertainment: '#a855f7',
  Healthcare: '#ef4444',
  Shopping: '#ec4899',
  Bills: '#3b82f6',
  Other: '#6b7280',
};
