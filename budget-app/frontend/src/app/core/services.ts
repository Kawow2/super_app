import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Account, Category, CategoryPoint, ImportResult, MonthlyPoint,
  Subscription, SubscriptionSuggestion, Transaction, YearlyPoint,
} from './models';

const API = '/api';

// ---------------------------------------------------------------- Paramètres

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  readonly themeColor = signal('#4f46e5');
  readonly loaded = signal(false);

  constructor() {
    // Applique la couleur d'accent au document dès qu'elle change.
    effect(() => {
      document.documentElement.style.setProperty('--accent', this.themeColor());
    });

    this.http.get<Record<string, string>>(`${API}/settings`).subscribe({
      next: (settings) => {
        if (settings['themeColor']) this.themeColor.set(settings['themeColor']);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true),
    });
  }

  saveThemeColor(color: string) {
    this.themeColor.set(color);
    this.http.put(`${API}/settings`, { themeColor: color }).subscribe();
  }

  restore(file: File): Observable<{ accounts: number; categories: number; subscriptions: number; transactions: number }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ accounts: number; categories: number; subscriptions: number; transactions: number }>(
      `${API}/export/restore`, form);
  }
}

// ------------------------------------------------------------------- Comptes

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);
  readonly accounts = signal<Account[]>([]);

  constructor() { this.refresh(); }

  refresh() {
    this.http.get<Account[]>(`${API}/accounts`).subscribe((a) => this.accounts.set(a));
  }

  create(dto: { name: string; bank: string | null; initialBalance: number }) {
    return this.http.post<Account>(`${API}/accounts`, dto);
  }
  update(id: string, dto: { name: string; bank: string | null; initialBalance: number }) {
    return this.http.put<Account>(`${API}/accounts/${id}`, dto);
  }
  remove(id: string) {
    return this.http.delete(`${API}/accounts/${id}`);
  }
}

// ---------------------------------------------------------------- Catégories

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  readonly categories = signal<Category[]>([]);

  constructor() { this.refresh(); }

  refresh() {
    this.http.get<Category[]>(`${API}/categories`).subscribe((c) => this.categories.set(c));
  }

  create(dto: { name: string; color: string; keywords: string | null }) {
    return this.http.post<Category>(`${API}/categories`, dto);
  }
  update(id: string, dto: { name: string; color: string; keywords: string | null }) {
    return this.http.put<Category>(`${API}/categories/${id}`, dto);
  }
  remove(id: string) {
    return this.http.delete(`${API}/categories/${id}`);
  }
}

// -------------------------------------------------------------- Transactions

export interface TransactionFilter {
  accountId?: string;
  from?: string;
  to?: string;
  categoryId?: string;
  uncategorized?: boolean;
}

export interface TransactionDto {
  accountId: string;
  date: string;
  label: string;
  amount: number;
  categoryId: string | null;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);

  list(filter: TransactionFilter): Observable<Transaction[]> {
    const params: Record<string, string> = {};
    if (filter.accountId) params['accountId'] = filter.accountId;
    if (filter.from) params['from'] = filter.from;
    if (filter.to) params['to'] = filter.to;
    if (filter.categoryId) params['categoryId'] = filter.categoryId;
    if (filter.uncategorized) params['uncategorized'] = 'true';
    return this.http.get<Transaction[]>(`${API}/transactions`, { params });
  }

  create(dto: TransactionDto) {
    return this.http.post<Transaction>(`${API}/transactions`, dto);
  }
  update(id: string, dto: TransactionDto) {
    return this.http.put<Transaction>(`${API}/transactions/${id}`, dto);
  }

  /** Change la catégorie et la propage aux transactions au libellé similaire. */
  setCategory(id: string, categoryId: string | null) {
    return this.http.put<{ similar: number }>(`${API}/transactions/${id}/category`,
      { categoryId, applyToSimilar: true });
  }

  remove(id: string) {
    return this.http.delete(`${API}/transactions/${id}`);
  }
}

// ----------------------------------------------------------------- Analytics

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  monthly(year: number, accountId?: string): Observable<MonthlyPoint[]> {
    const params: Record<string, string> = { year: String(year) };
    if (accountId) params['accountId'] = accountId;
    return this.http.get<MonthlyPoint[]>(`${API}/analytics/monthly`, { params });
  }

  yearly(accountId?: string): Observable<YearlyPoint[]> {
    const params: Record<string, string> = {};
    if (accountId) params['accountId'] = accountId;
    return this.http.get<YearlyPoint[]>(`${API}/analytics/yearly`, { params });
  }

  byCategory(from: string, to: string, accountId?: string): Observable<CategoryPoint[]> {
    const params: Record<string, string> = { from, to };
    if (accountId) params['accountId'] = accountId;
    return this.http.get<CategoryPoint[]>(`${API}/analytics/by-category`, { params });
  }
}

// ------------------------------------------------------------------- Import

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);

  upload(file: File, accountId: string, dryRun: boolean): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', accountId);
    form.append('dryRun', String(dryRun));
    return this.http.post<ImportResult>(`${API}/import`, form);
  }
}

// -------------------------------------------------------------- Abonnements

export interface SubscriptionDto {
  label: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string | null;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  readonly subscriptions = signal<Subscription[]>([]);

  constructor() { this.refresh(); }

  refresh() {
    this.http.get<Subscription[]>(`${API}/subscriptions`).subscribe((s) => this.subscriptions.set(s));
  }

  /** Suggestions d'abonnements devinées à partir de l'historique de transactions. */
  detect(): Observable<SubscriptionSuggestion[]> {
    return this.http.get<SubscriptionSuggestion[]>(`${API}/subscriptions/detect`);
  }

  create(dto: SubscriptionDto) {
    return this.http.post<Subscription>(`${API}/subscriptions`, dto);
  }
  update(id: string, dto: SubscriptionDto) {
    return this.http.put<Subscription>(`${API}/subscriptions/${id}`, dto);
  }
  remove(id: string) {
    return this.http.delete(`${API}/subscriptions/${id}`);
  }
}
