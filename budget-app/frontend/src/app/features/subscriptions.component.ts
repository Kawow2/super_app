import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, SubscriptionsService } from '../core/services';
import { Subscription, SubscriptionSuggestion } from '../core/models';

interface CalendarCell {
  day: number | null;       // null = case vide avant le 1er du mois
  today: boolean;
  subscriptions: Subscription[];
}

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <table>
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Jour estimé</th>
              <th>Observé sur</th>
              <th class="amount">Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (suggestion of suggestions(); track suggestion.label) {
              <tr>
                <td>{{ suggestion.label }}</td>
                <td>le {{ suggestion.dayOfMonth }}</td>
                <td class="muted">{{ suggestion.months }} mois</td>
                <td class="amount neg">{{ suggestion.amount | currency:'EUR' }}</td>
                <td style="white-space: nowrap;">
                  <button class="btn small primary" (click)="acceptSuggestion(suggestion)">Ajouter</button>
                  <button class="btn small" (click)="dismissSuggestion(suggestion)">Ignorer</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div style="margin-top: 0.8rem;">
          <button class="btn" (click)="acceptAll()">Tout ajouter</button>
        </div>
      </div>
    }

    <div class="grid-2">
      <div class="card">
        <div class="row" style="align-items: center; margin-bottom: 0.8rem;">
          <button class="btn small" (click)="previousMonth()">‹</button>
          <h2 style="margin: 0;">{{ viewDate() | date:'MMMM yyyy' }}</h2>
          <button class="btn small" (click)="nextMonth()">›</button>
        </div>
        <div class="calendar">
          @for (head of weekDays; track head) {
            <div class="head">{{ head }}</div>
          }
          @for (cell of cells(); track $index) {
            @if (cell.day === null) {
              <div class="day empty"></div>
            } @else {
              <div class="day" [class.today]="cell.today">
                <span class="num">{{ cell.day }}</span>
                @for (subscription of cell.subscriptions; track subscription.id) {
                  <span class="chip" [title]="subscription.label">
                    {{ subscription.label }} · {{ subscription.amount | number:'1.0-2' }} €
                  </span>
                }
              </div>
            }
          }
        </div>
      </div>

      <div>
        <div class="card">
          <h2>Nouvel abonnement</h2>
          <div class="row">
            <div>
              <label>Libellé</label>
              <input type="text" [(ngModel)]="draft.label" placeholder="Netflix, loyer..." />
            </div>
            <div>
              <label>Montant / mois</label>
              <input type="number" step="0.01" min="0" [(ngModel)]="draft.amount" style="width: 110px;" />
            </div>
            <div>
              <label>Jour du mois</label>
              <input type="number" min="1" max="31" [(ngModel)]="draft.dayOfMonth" style="width: 80px;" />
            </div>
            <div>
              <label>Catégorie</label>
              <select [(ngModel)]="draft.categoryId">
                <option [ngValue]="null">—</option>
                @for (category of categoriesService.categories(); track category.id) {
                  <option [ngValue]="category.id">{{ category.name }}</option>
                }
              </select>
            </div>
            <button class="btn primary" (click)="add()" [disabled]="!draft.label">Ajouter</button>
          </div>
        </div>

        <div class="card">
          <h2>Mes abonnements</h2>
          @if (subscriptionsService.subscriptions().length === 0) {
            <div class="empty">Aucun abonnement pour l'instant.</div>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Jour</th>
                  <th class="amount">Montant</th>
                  <th>Actif</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (subscription of subscriptionsService.subscriptions(); track subscription.id) {
                  <tr [style.opacity]="subscription.active ? 1 : 0.45">
                    <td>{{ subscription.label }}</td>
                    <td>le {{ subscription.dayOfMonth }}</td>
                    <td class="amount neg">{{ subscription.amount | currency:'EUR' }}</td>
                    <td>
                      <input type="checkbox" [ngModel]="subscription.active"
                             (ngModelChange)="toggleActive(subscription, $event)" />
                    </td>
                    <td><button class="btn small danger" (click)="remove(subscription)">Supprimer</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
})
export class SubscriptionsComponent {
  readonly subscriptionsService = inject(SubscriptionsService);
  readonly categoriesService = inject(CategoriesService);

  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly viewDate = signal(new Date());
  readonly suggestions = signal<SubscriptionSuggestion[]>([]);

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

  draft = { label: '', amount: 0, dayOfMonth: 1, categoryId: null as string | null, active: true };

  readonly activeSubscriptions = computed(() =>
    this.subscriptionsService.subscriptions().filter((s) => s.active));

  readonly monthlyTotal = computed(() =>
    this.activeSubscriptions().reduce((sum, s) => sum + s.amount, 0));

  readonly activeCount = computed(() => this.activeSubscriptions().length);

  readonly cells = computed<CalendarCell[]>(() => {
    const date = this.viewDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Décalage pour commencer la semaine le lundi.
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const today = new Date();

    const cells: CalendarCell[] = Array.from({ length: offset }, () => ({
      day: null, today: false, subscriptions: [],
    }));

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        today: today.getFullYear() === year && today.getMonth() === month && today.getDate() === day,
        // Math.min : un abonnement "le 31" tombe le dernier jour des mois courts.
        subscriptions: this.activeSubscriptions()
          .filter((s) => Math.min(s.dayOfMonth, daysInMonth) === day),
      });
    }
    return cells;
  });

  previousMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
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
