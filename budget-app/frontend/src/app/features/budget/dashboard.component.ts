import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ChartConfiguration } from 'chart.js';
import { AccountsService, AnalyticsService, SettingsService } from '../../core/services';
import { CategoryPoint, MonthlyPoint, YearlyPoint } from '../../core/models';
import { ChartComponent } from '../../shared/chart.component';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Tableau de bord</h1>

    <div class="cards-row">
      <div class="card">
        <div class="stat-label">Solde total</div>
        <div class="stat-value" [class.neg]="totalBalance() < 0">{{ totalBalance() | currency:'EUR' }}</div>
        <div class="stat-sub">{{ accountsService.accounts().length }} compte(s)</div>
      </div>
      @for (account of accountsService.accounts(); track account.id) {
        <div class="card">
          <div class="stat-label">{{ account.name }}@if (account.bank) {<span class="muted"> · {{ account.bank }}</span>}</div>
          <div class="stat-value" [class.neg]="account.balance < 0">{{ account.balance | currency:'EUR' }}</div>
          <div class="stat-sub">{{ account.transactionCount }} transaction(s)</div>
        </div>
      }
    </div>

    <div class="toolbar">
      <div>
        <label>Compte</label>
        <p-select [options]="accountOptions()" optionLabel="name" optionValue="id"
                  [ngModel]="accountId()" (ngModelChange)="accountId.set($event)" />
      </div>
      <div>
        <label>Année</label>
        <p-select [options]="years" [ngModel]="year()" (ngModelChange)="year.set($event)" />
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>Dépenses et revenus — {{ year() }}</h2>
        <app-chart [config]="monthlyConfig()" />
      </div>
      <div class="card">
        <h2>Dépenses par catégorie — {{ year() }}</h2>
        @if (byCategory().length === 0) {
          <div class="empty">Aucune dépense sur cette période.</div>
        } @else {
          <app-chart [config]="categoryConfig()" />
        }
      </div>
    </div>

    <div class="card">
      <h2>Année par année</h2>
      @if (yearly().length === 0) {
        <div class="empty">Aucune donnée pour l'instant : importez vos premières transactions.</div>
      } @else {
        <app-chart [config]="yearlyConfig()" />
      }
    </div>
  `,
})
export class DashboardComponent {
  readonly accountsService = inject(AccountsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly settings = inject(SettingsService);

  readonly year = signal(new Date().getFullYear());
  readonly accountId = signal('');
  readonly years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i);

  readonly monthly = signal<MonthlyPoint[]>([]);
  readonly yearly = signal<YearlyPoint[]>([]);
  readonly byCategory = signal<CategoryPoint[]>([]);

  readonly totalBalance = computed(() =>
    this.accountsService.accounts().reduce((sum, a) => sum + a.balance, 0));

  readonly accountOptions = computed(() => [
    { id: '', name: 'Tous les comptes' },
    ...this.accountsService.accounts().map((a) => ({ id: a.id, name: a.name })),
  ]);

  constructor() {
    this.accountsService.refresh();

    effect(() => {
      const year = this.year();
      const accountId = this.accountId() || undefined;
      this.analytics.monthly(year, accountId).subscribe((d) => this.monthly.set(d));
      this.analytics.byCategory(`${year}-01-01`, `${year}-12-31`, accountId)
        .subscribe((d) => this.byCategory.set(d));
      this.analytics.yearly(accountId).subscribe((d) => this.yearly.set(d));
    });
  }

  readonly monthlyConfig = computed<ChartConfiguration<'bar'>>(() => {
    const accent = this.settings.themeColor();
    const data = this.monthly();
    return {
      type: 'bar',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          { label: 'Dépenses', data: data.map((m) => m.expenses), backgroundColor: accent, borderRadius: 4 },
          { label: 'Revenus', data: data.map((m) => m.income), backgroundColor: '#cbd5e1', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      },
    };
  });

  readonly categoryConfig = computed<ChartConfiguration<'doughnut'>>(() => {
    const data = this.byCategory();
    return {
      type: 'doughnut',
      data: {
        labels: data.map((c) => c.name),
        datasets: [{ data: data.map((c) => c.total), backgroundColor: data.map((c) => c.color), borderWidth: 1 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
      },
    };
  });

  readonly yearlyConfig = computed<ChartConfiguration<'bar'>>(() => {
    const accent = this.settings.themeColor();
    const data = this.yearly();
    return {
      type: 'bar',
      data: {
        labels: data.map((y) => String(y.year)),
        datasets: [
          { label: 'Dépenses', data: data.map((y) => y.expenses), backgroundColor: accent, borderRadius: 4 },
          { label: 'Revenus', data: data.map((y) => y.income), backgroundColor: '#cbd5e1', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      },
    };
  });
}
