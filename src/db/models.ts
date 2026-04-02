export interface Month {
  id?: number;
  yearMonth: string;        // "2026-04"
  totalAvailable: number;
  savingsTarget: number;
  createdAt: string;        // ISO 8601
  updatedAt: string;
}

export interface Obligation {
  id?: number;
  monthId: number;
  name: string;
  amountPlanned: number;
  amountActual?: number;
  dueDate: string;          // "2026-04-07" ISO date
  isRecurring: boolean;
  recurrenceRule?: 'weekly' | 'monthly' | 'biweekly';
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id?: number;
  monthId: number;
  amount: number;
  description: string;
  category?: string;
  matchedObligationId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
}
