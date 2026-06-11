import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Subscription } from '../../core/models';

interface CalendarCell {
  day: number | null;       // null = case vide avant le 1er du mois
  today: boolean;
  subscriptions: Subscription[];
}

/** Calendrier mensuel des prélèvements (abonnements actifs reçus en entrée). */
@Component({
  selector: 'app-subscription-calendar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="row" style="align-items: center; margin-bottom: 0.8rem;">
        <p-button label="‹" size="small" [outlined]="true" (onClick)="previousMonth()" />
        <h2 style="margin: 0;">{{ viewDate() | date:'MMMM yyyy' }}</h2>
        <p-button label="›" size="small" [outlined]="true" (onClick)="nextMonth()" />
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
  `,
})
export class SubscriptionCalendarComponent {
  readonly subscriptions = input.required<Subscription[]>();

  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly viewDate = signal(new Date());

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
        subscriptions: this.subscriptions()
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
}
