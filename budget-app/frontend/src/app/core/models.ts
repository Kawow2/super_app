// Modèles : miroir des entités / DTO renvoyés par l'API (JSON camelCase).
// Les dates sont des chaînes ISO "yyyy-MM-dd" (DateOnly côté .NET).

export interface Account {
  id: string;
  name: string;
  bank: string | null;
  initialBalance: number;
  balance: number;          // calculé par l'API : initialBalance + somme des transactions
  transactionCount: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  keywords: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  label: string;
  amount: number;           // négatif = dépense, positif = revenu
  categoryId: string | null;
  importHash: string;
}

export interface Subscription {
  id: string;
  label: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string | null;
  active: boolean;
}

export interface SubscriptionSuggestion {
  label: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string | null;
  months: number;
  lastDate: string;
}

export interface ImportRow {
  date: string;
  label: string;
  amount: number;
  duplicate: boolean;
  category: string | null;
}

export interface ImportResult {
  total: number;
  imported: number;
  newRows: number;
  duplicates: number;
  dryRun: boolean;
  rows: ImportRow[];
}

export interface MonthlyPoint {
  month: number;
  expenses: number;
  income: number;
}

export interface YearlyPoint {
  year: number;
  expenses: number;
  income: number;
}

export interface CategoryPoint {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
}
