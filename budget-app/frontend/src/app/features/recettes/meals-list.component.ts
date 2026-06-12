import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RecettesService } from '../../core/recettes.service';
import { Meal, MEAL_TYPE_LABELS, MealType } from '../../core/recettes.models';

/** Catalogue des repas : liste, suppression (soft delete côté API) et accès au formulaire. */
@Component({
  selector: 'app-meals-list',
  standalone: true,
  imports: [RouterLink, ButtonModule, TableModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Mes repas</h1>
    <p class="muted">
      {{ recettes.meals().length }} repas enregistrés. Les ingrédients alimentent la liste de courses
      de la semaine.
    </p>

    <div class="toolbar">
      <span class="spacer"></span>
      <p-button label="Nouveau repas" icon="pi pi-plus" routerLink="/recettes/repas/nouveau" />
    </div>

    <div class="card">
      @if (recettes.meals().length === 0) {
        <div class="empty">Aucun repas. Créez votre premier repas pour planifier la semaine.</div>
      } @else {
        <p-table [value]="recettes.meals()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Temps</th>
              <th>Ingrédients</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-meal>
            <tr>
              <td>
                <strong>{{ meal.name }}</strong>
                @if (meal.description) {
                  <div class="muted">{{ meal.description }}</div>
                }
              </td>
              <td><p-tag [value]="typeLabel(meal.type)" [severity]="typeSeverity(meal.type)" /></td>
              <td style="white-space: nowrap;"><i class="pi pi-clock muted"></i> {{ meal.timeToCook }} min</td>
              <td class="muted">{{ ingredientsSummary(meal) }}</td>
              <td style="white-space: nowrap; text-align: right;">
                <p-button label="Modifier" size="small" [outlined]="true" [routerLink]="['/recettes/repas', meal.id]" />
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(meal)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class MealsListComponent {
  readonly recettes = inject(RecettesService);

  constructor() {
    this.recettes.refreshMeals();
  }

  typeLabel(type: MealType) {
    return MEAL_TYPE_LABELS[type];
  }

  /** Plat / Entrée / Dessert : une couleur de badge par type. */
  typeSeverity(type: MealType): 'info' | 'warn' | 'secondary' {
    return type === 0 ? 'info' : type === 1 ? 'warn' : 'secondary';
  }

  ingredientsSummary(meal: Meal): string {
    if (meal.ingredients.length === 0) return '—';
    return meal.ingredients.map((i) => i.name).join(', ');
  }

  remove(meal: Meal) {
    if (!confirm('Supprimer le repas "' + meal.name + '" ? Les plannings passés restent lisibles.')) return;
    this.recettes.deleteMeal(meal.id).subscribe(() => this.recettes.refreshMeals());
  }
}
