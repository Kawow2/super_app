import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { RecettesService } from '../../core/recettes.service';
import { ShoppingItem } from '../../core/recettes.models';
import { addDaysIso, mondayOf, toIsoDate } from '../../core/date-utils';

/** Liste de courses : ingrédients du planning de la semaine, à cocher au fil des achats. */
@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Liste de courses</h1>

    <div class="toolbar">
      <p-button icon="pi pi-chevron-left" [outlined]="true" (onClick)="changeWeek(-1)" />
      <span class="week-label">
        Semaine du {{ week() | date: 'd MMMM' }} au {{ weekEnd() | date: 'd MMMM' }}
      </span>
      <p-button icon="pi pi-chevron-right" [outlined]="true" (onClick)="changeWeek(1)" />
    </div>

    @if (items().length === 0) {
      <div class="card">
        <div class="empty">
          Aucun ingrédient pour cette semaine.<br />
          Planifiez des repas avec des ingrédients pour les voir ici.
        </div>
      </div>
    } @else {
      <div class="card">
        @for (item of remaining(); track item.name) {
          <label class="item">
            <p-checkbox [binary]="true" [ngModel]="false" (ngModelChange)="toggle(item.name)" />
            <span class="item-name">{{ item.name }}</span>
            @if (item.count > 1) {
              <span class="count">×{{ item.count }}</span>
            }
            <span class="muted meals">{{ item.meals.join(', ') }}</span>
          </label>
        }
        @if (remaining().length === 0) {
          <div class="empty">Tout est dans le panier 🎉</div>
        }
      </div>

      @if (inCart().length > 0) {
        <div class="card">
          <h2 class="muted">Dans le panier ({{ inCart().length }})</h2>
          @for (item of inCart(); track item.name) {
            <label class="item done">
              <p-checkbox [binary]="true" [ngModel]="true" (ngModelChange)="toggle(item.name)" />
              <span class="item-name">{{ item.name }}</span>
            </label>
          }
        </div>
      }
    }
  `,
  styles: `
    .week-label { font-weight: 600; min-width: 250px; text-align: center; align-self: center; }
    .item { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0; border-bottom: 1px solid var(--border); cursor: pointer; }
    .item:last-of-type { border-bottom: none; }
    .item-name { font-weight: 500; text-transform: capitalize; }
    .item.done .item-name { text-decoration: line-through; color: var(--muted); font-weight: 400; }
    .count { font-family: var(--font-mono); font-size: 0.78rem; color: var(--accent); background: var(--accent-soft); padding: 0 0.4rem; border-radius: 6px; }
    .meals { font-size: 0.78rem; margin-left: auto; text-align: right; }
  `,
})
export class ShoppingListComponent {
  private readonly recettes = inject(RecettesService);

  /** Optionnel, lié au query param (lien depuis le planning) ; défaut : semaine courante. */
  readonly weekStart = input<string>();

  readonly week = signal(toIsoDate(mondayOf(new Date())));
  readonly items = signal<ShoppingItem[]>([]);
  /** Coché = déjà dans le panier. État local uniquement, remis à zéro à chaque visite. */
  readonly checked = signal<ReadonlySet<string>>(new Set());

  readonly remaining = computed(() => this.items().filter((i) => !this.checked().has(i.name)));
  readonly inCart = computed(() => this.items().filter((i) => this.checked().has(i.name)));

  constructor() {
    // Le query param (lien depuis le planning) pilote la semaine affichée.
    effect(() => {
      const param = this.weekStart();
      if (param) this.week.set(param);
    });
    // Recharge à chaque changement de semaine.
    effect(() => this.load(this.week()));
  }

  weekEnd() { return addDaysIso(this.week(), 6); }

  changeWeek(offset: number) {
    this.week.set(addDaysIso(this.week(), offset * 7));
  }

  toggle(name: string) {
    this.checked.update((set) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  private load(week: string) {
    this.checked.set(new Set());
    this.recettes.getShoppingList(week).subscribe((list) => this.items.set(list.items));
  }
}
