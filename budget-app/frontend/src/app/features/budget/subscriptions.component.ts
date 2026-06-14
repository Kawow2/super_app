import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { CategoriesService, SubscriptionsService } from '../../core/services';
import { Subscription, SubscriptionSuggestion } from '../../core/models';
import { SubscriptionCalendarComponent } from './subscription-calendar.component';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, CheckboxModule, InputNumberModule,
    InputTextModule, SelectModule, TableModule, SubscriptionCalendarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Abonnements récurrents</h1>

    <div class="cards-row">
      <div class="card">
        <div class="stat-label">Total mensuel (abonnements actifs)</div>
        <div class="stat-value neg">{{ monthlyTotal() | currency:'EUR' }}</div>
        <div class="stat-sub">{{ activeCount() }} abonnement(s) actif(s)</div>
      </div>
    </div>

    @if (suggestions().length > 0) {
      <div class="card" style="border-color: var(--accent);">
        <h2>Abonnements détectés dans vos transactions</h2>
        <p class="muted">
          Dépenses revenant chaque mois à montant et date réguliers.
          Ajoutez-les au calendrier en un clic, ou ignorez-les.
        </p>
        <p-table [value]="suggestions()" styleClass="cards-table">
          <ng-template pTemplate="header">
            <tr>
              <th>Libellé</th>
              <th>Jour estimé</th>
              <th>Observé sur</th>
              <th class="amount">Montant</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-suggestion>
            <tr>
              <td data-label="Libellé">{{ suggestion.label }}</td>
              <td data-label="Jour estimé">le {{ suggestion.dayOfMonth }}</td>
              <td class="muted" data-label="Observé sur">{{ suggestion.months }} mois</td>
              <td class="amount neg" data-label="Montant">{{ suggestion.amount | currency:'EUR' }}</td>
              <td data-label="" style="white-space: nowrap;">
                <p-button label="Ajouter" size="small" (onClick)="acceptSuggestion(suggestion)" />
                <p-button label="Ignorer" size="small" [text]="true" (onClick)="dismissSuggestion(suggestion)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
        <div style="margin-top: 0.8rem;">
          <p-button label="Tout ajouter" [outlined]="true" (onClick)="acceptAll()" />
        </div>
      </div>
    }

    <div class="grid-2">
      <app-subscription-calendar [subscriptions]="activeSubscriptions()" />

      <div>
        <div class="card">
          <h2>Nouvel abonnement</h2>
          <div class="row">
            <div>
              <label>Libellé</label>
              <input pInputText type="text" [(ngModel)]="draft.label" placeholder="Netflix, loyer..." />
            </div>
            <div>
              <label>Montant / mois</label>
              <p-inputnumber mode="currency" currency="EUR" locale="fr-FR" [min]="0"
                             [(ngModel)]="draft.amount" inputStyleClass="amount-input" />
            </div>
            <div>
              <label>Jour du mois</label>
              <p-inputnumber [min]="1" [max]="31" [showButtons]="true"
                             [(ngModel)]="draft.dayOfMonth" inputStyleClass="day-input" />
            </div>
            <div>
              <label>Catégorie</label>
              <p-select [options]="categoryOptions()" optionLabel="name" optionValue="id"
                        [(ngModel)]="draft.categoryId" />
            </div>
            <p-button label="Ajouter" (onClick)="add()" [disabled]="!draft.label" />
          </div>
        </div>

        <div class="card">
          <h2>Mes abonnements</h2>
          @if (subscriptionsService.subscriptions().length === 0) {
            <div class="empty">Aucun abonnement pour l'instant.</div>
          } @else {
            <p-table [value]="subscriptionsService.subscriptions()" dataKey="id" styleClass="cards-table">
              <ng-template pTemplate="header">
                <tr>
                  <th>Libellé</th>
                  <th>Jour</th>
                  <th class="amount">Montant</th>
                  <th>Actif</th>
                  <th></th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-subscription>
                <tr [style.opacity]="subscription.active ? 1 : 0.45">
                  <td data-label="Libellé">{{ subscription.label }}</td>
                  <td data-label="Jour">le {{ subscription.dayOfMonth }}</td>
                  <td class="amount neg" data-label="Montant">{{ subscription.amount | currency:'EUR' }}</td>
                  <td data-label="Actif">
                    <p-checkbox [binary]="true" [ngModel]="subscription.active"
                                (ngModelChange)="toggleActive(subscription, $event)" />
                  </td>
                  <td data-label=""><p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(subscription)" /></td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      </div>
    </div>
  `,
})
export class SubscriptionsComponent {
  readonly subscriptionsService = inject(SubscriptionsService);
  readonly categoriesService = inject(CategoriesService);

  readonly suggestions = signal<SubscriptionSuggestion[]>([]);

  draft = { label: '', amount: 0, dayOfMonth: 1, categoryId: null as string | null, active: true };

  readonly categoryOptions = computed(() => [
    { id: null as string | null, name: '—' },
    ...this.categoriesService.categories().map((c) => ({ id: c.id as string | null, name: c.name })),
  ]);

  readonly activeSubscriptions = computed(() =>
    this.subscriptionsService.subscriptions().filter((s) => s.active));

  readonly monthlyTotal = computed(() =>
    this.activeSubscriptions().reduce((sum, s) => sum + s.amount, 0));

  readonly activeCount = computed(() => this.activeSubscriptions().length);

  constructor() {
    this.loadSuggestions();
  }

  loadSuggestions() {
    this.subscriptionsService.detect().subscribe((s) => this.suggestions.set(s));
  }

  acceptSuggestion(suggestion: SubscriptionSuggestion) {
    this.subscriptionsService.create({
      label: suggestion.label,
      amount: suggestion.amount,
      dayOfMonth: suggestion.dayOfMonth,
      categoryId: suggestion.categoryId,
      active: true,
    }).subscribe(() => {
      this.suggestions.update((list) => list.filter((s) => s !== suggestion));
      this.subscriptionsService.refresh();
    });
  }

  dismissSuggestion(suggestion: SubscriptionSuggestion) {
    this.suggestions.update((list) => list.filter((s) => s !== suggestion));
  }

  acceptAll() {
    for (const suggestion of this.suggestions()) {
      this.acceptSuggestion(suggestion);
    }
  }

  add() {
    this.subscriptionsService.create({ ...this.draft }).subscribe(() => {
      this.draft = { label: '', amount: 0, dayOfMonth: 1, categoryId: null, active: true };
      this.subscriptionsService.refresh();
    });
  }

  toggleActive(subscription: Subscription, active: boolean) {
    this.subscriptionsService.update(subscription.id, {
      label: subscription.label,
      amount: subscription.amount,
      dayOfMonth: subscription.dayOfMonth,
      categoryId: subscription.categoryId,
      active,
    }).subscribe(() => this.subscriptionsService.refresh());
  }

  remove(subscription: Subscription) {
    if (!confirm(`Supprimer l'abonnement "${subscription.label}" ?`)) return;
    this.subscriptionsService.remove(subscription.id)
      .subscribe(() => this.subscriptionsService.refresh());
  }
}
