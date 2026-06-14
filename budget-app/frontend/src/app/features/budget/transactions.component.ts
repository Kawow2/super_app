import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AccountsService, CategoriesService, TransactionsService } from '../../core/services';
import { Transaction } from '../../core/models';
import { toIsoDate } from '../../core/date-utils';
import { TransactionFiltersComponent } from './transaction-filters.component';
import { TransactionFormComponent } from './transaction-form.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, MessageModule, SelectModule, TableModule,
    TransactionFiltersComponent, TransactionFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Transactions</h1>

    <app-transaction-filters
      [(accountId)]="accountId" [(categoryFilter)]="categoryFilter"
      [(from)]="from" [(to)]="to"
      [(search)]="search" [(minAmount)]="minAmount" [(maxAmount)]="maxAmount"
      [(showAdd)]="showAdd" />

    @if (showAdd()) {
      <app-transaction-form (saved)="onSaved()" />
    }

    <div class="cards-row">
      <div class="card">
        <div class="stat-label">Dépenses (sélection)</div>
        <div class="stat-value neg">{{ totalExpenses() | currency:'EUR' }}</div>
      </div>
      <div class="card">
        <div class="stat-label">Revenus (sélection)</div>
        <div class="stat-value pos">{{ totalIncome() | currency:'EUR' }}</div>
      </div>
      <div class="card" [style.cursor]="'pointer'" (click)="toggleUncategorized()"
           [style.borderColor]="categoryFilter() === 'none' ? 'var(--accent)' : ''">
        <div class="stat-label">Non catégorisées (sélection)</div>
        <div class="stat-value">{{ uncategorizedCount() }}</div>
        <div class="stat-sub">cliquer pour {{ categoryFilter() === 'none' ? 'tout afficher' : 'les afficher' }}</div>
      </div>
    </div>

    @if (notice()) {
      <p-message severity="success" styleClass="block-message">{{ notice() }}</p-message>
    }

    <div class="card">
      @if (filtered().length === 0) {
        <div class="empty">Aucune transaction. Modifiez les filtres ou importez un relevé.</div>
      } @else {
        <p class="muted" style="margin-top: 0;">{{ filtered().length }} transaction(s)</p>
        <p-table [value]="filtered()" dataKey="id" styleClass="cards-table">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Compte</th>
              <th>Catégorie</th>
              <th class="amount">Montant</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-transaction>
            <tr>
              <td data-label="Date">{{ transaction.date | date:'dd/MM/yyyy' }}</td>
              <td data-label="Libellé">{{ transaction.label }}</td>
              <td class="muted" data-label="Compte">{{ accountName(transaction.accountId) }}</td>
              <td data-label="Catégorie">
                <p-select [options]="categoryOptions()" optionLabel="name" optionValue="id"
                          [ngModel]="transaction.categoryId"
                          (ngModelChange)="setCategory(transaction, $event)" />
              </td>
              <td class="amount" data-label="Montant" [class.neg]="transaction.amount < 0" [class.pos]="transaction.amount > 0">
                {{ transaction.amount | currency:'EUR' }}
              </td>
              <td data-label=""><p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(transaction)" /></td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class TransactionsComponent {
  readonly accountsService = inject(AccountsService);
  readonly categoriesService = inject(CategoriesService);
  private readonly transactionsService = inject(TransactionsService);

  // Filtres côté serveur
  readonly accountId = signal('');
  readonly categoryFilter = signal('');   // '' = toutes, 'none' = non catégorisé, sinon id
  readonly from = signal<Date | null>(null);
  readonly to = signal<Date | null>(null);
  // Filtres côté client
  readonly search = signal('');
  readonly minAmount = signal<number | null>(null);
  readonly maxAmount = signal<number | null>(null);

  readonly transactions = signal<Transaction[]>([]);
  readonly showAdd = signal(false);
  readonly notice = signal('');

  readonly categoryOptions = computed(() => [
    { id: null as string | null, name: '—' },
    ...this.categoriesService.categories().map((c) => ({ id: c.id as string | null, name: c.name })),
  ]);

  constructor() {
    effect(() => this.load());
  }

  private load() {
    const categoryFilter = this.categoryFilter();
    const from = this.from();
    const to = this.to();
    this.transactionsService.list({
      accountId: this.accountId() || undefined,
      from: from ? toIsoDate(from) : undefined,
      to: to ? toIsoDate(to) : undefined,
      categoryId: categoryFilter && categoryFilter !== 'none' ? categoryFilter : undefined,
      uncategorized: categoryFilter === 'none',
    }).subscribe((t) => this.transactions.set(t));
  }

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const min = this.minAmount();
    const max = this.maxAmount();
    return this.transactions().filter((t) => {
      if (query && !t.label.toLowerCase().includes(query)) return false;
      const abs = Math.abs(t.amount);
      if (min != null && min !== 0 && abs < min) return false;
      if (max != null && max !== 0 && abs > max) return false;
      return true;
    });
  });

  readonly totalExpenses = computed(() =>
    this.filtered().filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  readonly totalIncome = computed(() =>
    this.filtered().filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0));
  readonly uncategorizedCount = computed(() =>
    this.filtered().filter((t) => t.categoryId === null).length);

  toggleUncategorized() {
    this.categoryFilter.set(this.categoryFilter() === 'none' ? '' : 'none');
  }

  accountName(id: string): string {
    return this.accountsService.accounts().find((a) => a.id === id)?.name ?? '';
  }

  setCategory(transaction: Transaction, categoryId: string | null) {
    this.transactionsService.setCategory(transaction.id, categoryId).subscribe((result) => {
      transaction.categoryId = categoryId;
      if (result.similar > 0) {
        const name = this.categoriesService.categories().find((c) => c.id === categoryId)?.name;
        this.notice.set(categoryId
          ? result.similar + ' transaction(s) similaire(s) également passée(s) dans « ' + name + ' ».'
          : result.similar + ' transaction(s) similaire(s) également décatégorisée(s).');
        setTimeout(() => this.notice.set(''), 5000);
      }
      this.load();
    });
  }

  onSaved() {
    this.load();
    this.accountsService.refresh();
  }

  remove(transaction: Transaction) {
    if (!confirm('Supprimer la transaction "' + transaction.label + '" ?')) return;
    this.transactionsService.remove(transaction.id).subscribe(() => {
      this.transactions.update((list) => list.filter((t) => t.id !== transaction.id));
      this.accountsService.refresh();
    });
  }
}
