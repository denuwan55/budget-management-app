export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'comfortable': return 'text-green-400';
    case 'tight': return 'text-yellow-400';
    case 'painful': return 'text-orange-400';
    case 'savings_risk': return 'text-orange-500';
    case 'cannot_afford': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function severityBg(severity: string): string {
  switch (severity) {
    case 'comfortable': return 'bg-green-400/10';
    case 'tight': return 'bg-yellow-400/10';
    case 'painful': return 'bg-orange-400/10';
    case 'savings_risk': return 'bg-orange-500/10';
    case 'cannot_afford': return 'bg-red-500/10';
    default: return 'bg-gray-400/10';
  }
}
