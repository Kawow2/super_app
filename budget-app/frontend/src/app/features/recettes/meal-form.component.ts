import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { RecettesService } from '../../core/recettes.service';
import { IngredientLine, MEAL_TYPE_LABELS, MealType } from '../../core/recettes.models';

/** Création / édition d'un repas et de ses lignes d'ingrédients. */
@Component({
  selector: 'app-meal-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputNumberModule, InputTextModule, SelectModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ id() ? 'Modifier le repas' : 'Nouveau repas' }}</h1>

    <div class="card">
      <div class="row">
        <div style="flex: 1; min-width: 220px;">
          <label>Nom *</label>
          <input pInputText type="text" [(ngModel)]="name" placeholder="Pâtes carbonara..." style="width: 100%;" />
        </div>
        <div>
          <label>Type</label>
          <p-select [options]="typeOptions" optionLabel="label" optionValue="value" [(ngModel)]="type" />
        </div>
        <div>
          <label>Temps de préparation</label>
          <p-inputnumber [(ngModel)]="timeToCook" [min]="1" suffix=" min" [showButtons]="true" [step]="5" class="amount-input" />
        </div>
      </div>
      <div style="margin-top: 0.9rem;">
        <label>Description</label>
        <textarea pTextarea [(ngModel)]="description" rows="2" placeholder="Notes, recette..." style="width: 100%;"></textarea>
      </div>
    </div>

    <div class="card">
      <h2>Ingrédients</h2>
      <p class="muted">Quantité et unité facultatives. Les noms sont partagés entre tous les repas.</p>
      @for (line of ingredients(); track $index; let i = $index) {
        <div class="row" style="margin-bottom: 0.5rem;">
          <input pInputText type="text" [ngModel]="line.name" (ngModelChange)="patch(i, { name: $event })"
                 placeholder="Lardons..." list="ingredient-names" style="flex: 1; min-width: 180px;" />
          <p-inputnumber [ngModel]="line.quantity" (ngModelChange)="patch(i, { quantity: $event })"
                         [min]="0" [maxFractionDigits]="2" placeholder="Qté" class="day-input" />
          <input pInputText type="text" [ngModel]="line.unit" (ngModelChange)="patch(i, { unit: $event })"
                 placeholder="g, L..." class="day-input" />
          <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="removeLine(i)" />
        </div>
      }
      <datalist id="ingredient-names">
        @for (name of knownIngredients(); track name) {
          <option [value]="name"></option>
        }
      </datalist>
      <p-button label="Ajouter un ingrédient" icon="pi pi-plus" [text]="true" (onClick)="addLine()" />
    </div>

    <div class="row">
      <p-button [label]="id() ? 'Enregistrer' : 'Créer le repas'" (onClick)="save()" [disabled]="!name.trim()" />
      <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="back()" />
    </div>
  `,
})
export class MealFormComponent {
  private readonly recettes = inject(RecettesService);
  private readonly router = inject(Router);

  /** Renseigné par le routeur sur /recettes/repas/:id, absent en création. */
  readonly id = input<string>();

  readonly typeOptions = (Object.entries(MEAL_TYPE_LABELS) as unknown as [string, string][])
    .map(([value, label]) => ({ value: Number(value) as MealType, label }));

  name = '';
  description = '';
  type: MealType = 0;
  timeToCook = 15;
  readonly ingredients = signal<IngredientLine[]>([]);
  readonly knownIngredients = signal<string[]>([]);

  constructor() {
    this.recettes.ingredientNames().subscribe((names) => this.knownIngredients.set(names));
    effect(() => {
      const id = this.id();
      if (!id) return;
      this.recettes.getMeal(id).subscribe((meal) => {
        this.name = meal.name;
        this.description = meal.description ?? '';
        this.type = meal.type;
        this.timeToCook = meal.timeToCook;
        this.ingredients.set(meal.ingredients.map((i) => ({ ...i })));
      });
    });
  }

  addLine() {
    this.ingredients.update((lines) => [...lines, { name: '', quantity: null, unit: null }]);
  }

  removeLine(index: number) {
    this.ingredients.update((lines) => lines.filter((_, i) => i !== index));
  }

  patch(index: number, change: Partial<IngredientLine>) {
    this.ingredients.update((lines) => lines.map((l, i) => (i === index ? { ...l, ...change } : l)));
  }

  save() {
    const dto = {
      name: this.name,
      description: this.description || null,
      type: this.type,
      timeToCook: this.timeToCook,
      ingredients: this.ingredients().filter((l) => l.name.trim()),
    };
    const id = this.id();
    const request = id ? this.recettes.updateMeal(id, dto) : this.recettes.createMeal(dto);
    request.subscribe(() => {
      this.recettes.refreshMeals();
      this.back();
    });
  }

  back() {
    this.router.navigate(['/recettes/repas']);
  }
}
