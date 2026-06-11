import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsService, CategoriesService, TransactionsService } from '../core/services';
import { Transaction } from '../core/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Transactions</h1>

    <div class="card">
      <div class="toolbar" style="margin-bottom: 0;">
        <div>
          <label>Compte</label>
          <select [ngModel]="accountId()" (ngModelChange)="accountId.set($event)">
            <option value="">Tous</option>
            @for (account of accountsService.accounts(); track account.id) {
              <option [value]="account.id">{{ account.name }}</option>
            }
          </select>
        </div>
        <div>
          <label>Catégorie</label>
          <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
            <option value="">Toutes</option>
            <option value="none">Non catégorisé</option>
            @for (category of categoriesService.categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
        </div>
        <div>
          <label>Du</label>
          <input type="date" [ngModel]="from()" (ngModelChange)="from.set($event ?? '')" />
        </div>
        <div>
          <label>Au</label>
          <input type="date" [ngModel]="to()" (ngModelChange)="to.set($event ?? '')" />
        </div>
        <div>
          <label>Montant min (€)</label>
          <input type="number" min="0" step="0.01" placeholder="0"
                 [ngModel]="minAmount()" (ngModelChange)="minAmount.set($event)" style="width: 110px;" />
        </div>
        <div>
          <label>Montant max (€)</label>
          <input type="number" min="0" step="0.01" placeholder="∞"
                 [ngModel]="maxAmount()" (ngModelChange)="maxAmount.set($event)" style="width: 110px;" />
        </div>
        <div>
          <label>Libellé</label>
          <input type="text" placeholder="Rechercher..." [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <button class="btn small" (click)="resetFilters()">Réinitialiser</button>
        <div class="spacer"></div>
        <button class="btn primary" (click)="showAdd.set(!showAdd())">
          {{ showAdd() ? 'Fermer' : '+ Ajouter' }}
        </button>
      </div>
    </div>

    @if (showAdd()) {
      <div class="card">
        <h2>Nouvelle transaction</h2>
        <div class="row">
          <div>
            <label>Compte</label>
            <select [(ngModel)]="draft.accountId">
              @for (account of accountsService.accounts(); track account.id) {
                <option [value]="account.id">{{ account.name }}</option>
              }
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" [(ngModel)]="draft.date" />
          </div>
          <div>
            <label>Libellé</label>
            <input type="text" [(ngModel)]="draft.label" placeholder="Courses..." />
          </div>
          <div>
            <label>Montant (négatif = dépense)</label>
            <input type="number" step="0.01" [(ngModel)]="draft.amount" />
          </div>
          <div>
            <label>Catégorie</label>
            <select [(ngModel)]="draft.categoryId">
              <option [ngValue]="null">Automatique</option>
              @for (category of categoriesService.categories(); track category.id) {
                <option [ngValue]="category.id">{{ category.name }}</option>
              }
            </select>
          </div>
          <button class="btn primary" (click)="add()" [disabled]="!draft.accountId || !draft.label">Enregistrer</button>
        </div>
      </div>
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
      <div class="success">{{ notice() }}</div>
    }

    <div class="card">
      @if (filtered().length === 0) {
        <div class="empty">Aucune transaction. Modifiez les filtres ou importez un relevé.</div>
      } @else {
        <p class="muted" style="margin-top: 0;">{{ filtered().length }} transaction(s)</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Compte</th>
              <th>Catégorie</th>
              <th class="amount">Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (transaction of filtered(); track transaction.id) {
              <tr>
                <td>{{ transaction.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ transaction.label }}</td>
                <td class="muted">{{ accountName(transaction.accountId) }}</td>
                <td>
                  <select [ngModel]="transaction.categoryId"
                          (ngModelChange)="setCategory(transaction, $event)">
                    <option [ngValue]="null">—</option>
                    @for (category of categoriesService.categories(); track category.id) {
                      <option [ngValue]="category.id">{{ category.name }}</option>
                    }
                  </select>
                </td>
                <td class="amount" [class.neg]="transaction.amount < 0" [class.pos]="transaction.amount > 0">
                  {{ transaction.amount | currency:'EUR' }}
                </td>
                <td><button class="btn small danger" (click)="remove(transaction)">Supprimer</button></td>
              </tr>
            }
          </tbody>
        </table>
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
  readonly from = signal('');
  readonly to = signal('');
  // Filtres côté client
  readonly search = signal('');
  readonly minAmount = signal<number | null>(null);
  readonly maxAmount = signal<number | null>(null);

  readonly transactions = signal<Transaction[]>([]);
  readonly showAdd = signal(false);
  readonly notice = signal('');

  draft = {
    accountId: '',
    date: new Date().toISOString().slice(0, 10),
    label: '',
    amount: 0,
    categoryId: null as string | null,
  };

  constructor() {
    effect(() => this.load());
  }

  private load() {
    const categoryFilter = this.categoryFilter();
    this.transactionsService.list({
      accountId: this.accountId() || undefined,
      from: this.from() || undefined,
      to: this.to() || undefined,
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

  resetFilters() {
    this.accountId.set('');
    this.categoryFilter.set('');
    this.from.set('');
    this.to.set('');
    this.search.set('');
    this.minAmount.set(null);
    this.maxAmount.set(null);
  }

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

  add() {
    this.transactionsService.create({ ...this.draft }).subscribe(() => {
      this.draft.label = '';
      this.draft.amount = 0;
      this.load();
      this.accountsService.refresh();
    });
  }

  remove(transaction: Transaction) {
    if (!confirm('Supprimer la transaction "' + transaction.label + '" ?')) return;
    this.transactionsService.remove(transaction.id).subscribe(() => {
      this.transactions.update((list) => list.filter((t) => t.id !== transaction.id));
      this.accountsService.refresh();
    });
  }
}
