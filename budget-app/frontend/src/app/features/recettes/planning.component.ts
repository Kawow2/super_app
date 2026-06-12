import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { RecettesService } from '../../core/recettes.service';
import { MealTime, Planning, PlanningSlot } from '../../core/recettes.models';
import { addDaysIso, mondayOf, toIsoDate } from '../../core/date-utils';

/** Planning de la semaine : un créneau midi et soir par jour, génération aléatoire. */
@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, MessageModule, SelectModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Planning des repas</h1>

    <div class="toolbar">
      <p-button icon="pi pi-chevron-left" [outlined]="true" (onClick)="changeWeek(-1)" />
      <span class="week-label">
        Semaine du {{ weekStart() | date: 'd MMMM' }} au {{ weekEnd() | date: 'd MMMM' }}
      </span>
      <p-button icon="pi pi-chevron-right" [outlined]="true" (onClick)="changeWeek(1)" />
      <span class="spacer"></span>
      <p-button label="Liste de courses" icon="pi pi-shopping-cart" [outlined]="true"
                routerLink="/recettes/courses" [queryParams]="{ weekStart: weekStart() }" />
      <p-button label="Générer la semaine" icon="pi pi-sparkles" (onClick)="generate()" [loading]="generating()" />
    </div>

    @if (error()) {
      <p-message severity="warn" [text]="error()" class="block-message" />
    }

    @if (planning(); as p) {
      <div class="days">
        @for (day of days; track $index; let dayIndex = $index) {
          <div class="card day-card" [class.today]="isToday(dayIndex)">
            <h2>{{ day }} <span class="muted date">{{ dateOf(dayIndex) | date: 'd MMM' }}</span></h2>
            @for (time of mealTimes; track time.value) {
              <div class="slot">
                <span class="slot-icon">{{ time.icon }}</span>
                <p-select class="slot-select" [options]="recettes.meals()" optionLabel="name" optionValue="id"
                          [placeholder]="time.label" [showClear]="true"
                          [disabled]="slotFor(dayIndex, time.value)?.locked ?? false"
                          [ngModel]="slotFor(dayIndex, time.value)?.mealId ?? null"
                          (ngModelChange)="setMeal(dayIndex, time.value, $event)" />
                @if (slotFor(dayIndex, time.value); as slot) {
                  <p-button [icon]="slot.locked ? 'pi pi-lock' : 'pi pi-lock-open'" [text]="true"
                            [severity]="slot.locked ? 'primary' : 'secondary'"
                            pTooltip="Un créneau verrouillé n'est pas remplacé par la génération"
                            (onClick)="toggleLock(slot)" />
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .week-label { font-weight: 600; min-width: 250px; text-align: center; align-self: center; }
    .days { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.9rem; }
    .day-card { margin-bottom: 0; }
    .day-card.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .day-card .date { font-size: 0.8rem; font-weight: 400; }
    .slot { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; }
    .slot-icon { width: 1.4rem; text-align: center; }
    .slot-select { flex: 1; min-width: 0; }
  `,
})
export class PlanningComponent {
  readonly recettes = inject(RecettesService);

  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  readonly mealTimes: { value: MealTime; label: string; icon: string }[] = [
    { value: 0, label: 'Midi', icon: '☀️' },
    { value: 1, label: 'Soir', icon: '🌙' },
  ];

  readonly weekStart = signal(toIsoDate(mondayOf(new Date())));
  readonly planning = signal<Planning | null>(null);
  readonly generating = signal(false);
  readonly error = signal('');

  constructor() {
    this.recettes.refreshMeals();
    this.load();
  }

  weekEnd() { return addDaysIso(this.weekStart(), 6); }
  dateOf(dayIndex: number) { return addDaysIso(this.weekStart(), dayIndex); }
  isToday(dayIndex: number) { return this.dateOf(dayIndex) === toIsoDate(new Date()); }

  slotFor(dayOfWeek: number, mealTime: MealTime): PlanningSlot | undefined {
    return this.planning()?.slots.find((s) => s.dayOfWeek === dayOfWeek && s.mealTime === mealTime);
  }

  changeWeek(offset: number) {
    this.weekStart.set(addDaysIso(this.weekStart(), offset * 7));
    this.error.set('');
    this.load();
  }

  setMeal(dayOfWeek: number, mealTime: MealTime, mealId: string | null) {
    const planning = this.planning();
    if (!planning) return;
    if (mealId === null) {
      const slot = this.slotFor(dayOfWeek, mealTime);
      if (slot) this.recettes.clearSlot(planning.id, slot.id).subscribe(() => this.load());
      return;
    }
    this.recettes.setSlot(planning.id, { dayOfWeek, mealTime, mealId }).subscribe(() => this.load());
  }

  toggleLock(slot: PlanningSlot) {
    const planning = this.planning();
    if (!planning) return;
    this.recettes.toggleLock(planning.id, slot.id).subscribe(() => this.load());
  }

  generate() {
    this.generating.set(true);
    this.error.set('');
    this.recettes.generate(this.weekStart()).subscribe({
      next: (p) => { this.planning.set(p); this.generating.set(false); },
      error: (err) => {
        this.error.set(typeof err.error === 'string' ? err.error : 'Ajoutez des repas avant de générer un planning.');
        this.generating.set(false);
      },
    });
  }

  private load() {
    this.recettes.getPlanning(this.weekStart()).subscribe((p) => this.planning.set(p));
  }
}
