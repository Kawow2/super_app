import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../core/services';
import { Category } from '../core/models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Catégories</h1>
    <p class="muted">
      Les <strong>mots-clés</strong> (séparés par des points-virgules) servent à catégoriser automatiquement
      les transactions importées.
    </p>

    <div class="card">
      <h2>Nouvelle catégorie</h2>
      <div class="row">
        <div>
          <label>Nom</label>
          <input type="text" [(ngModel)]="draft.name" placeholder="Vacances..." />
        </div>
        <div>
          <label>Couleur</label>
          <input type="color" [(ngModel)]="draft.color" />
        </div>
        <div style="flex: 1; min-width: 220px;">
          <label>Mots-clés</label>
          <input type="text" [(ngModel)]="draft.keywords" placeholder="hotel; airbnb; camping" style="width: 100%;" />
        </div>
        <button class="btn primary" (click)="add()" [disabled]="!draft.name">Ajouter</button>
      </div>
    </div>

    <div class="card">
      @if (categoriesService.categories().length === 0) {
        <div class="empty">Aucune catégorie.</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Couleur</th>
              <th>Nom</th>
              <th style="width: 45%;">Mots-clés</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (category of categoriesService.categories(); track category.id) {
              <tr>
                <td><input type="color" [ngModel]="category.color" (ngModelChange)="category.color = $event" /></td>
                <td><input type="text" [ngModel]="category.name" (ngModelChange)="category.name = $event" /></td>
                <td><input type="text" [ngModel]="category.keywords ?? ''" (ngModelChange)="category.keywords = $event" style="width: 100%;" /></td>
                <td style="white-space: nowrap;">
                  <button class="btn small" (click)="save(category)">Enregistrer</button>
                  <button class="btn small danger" (click)="remove(category)">Supprimer</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class CategoriesComponent {
  readonly categoriesService = inject(CategoriesService);

  draft = { name: '', color: '#4f46e5', keywords: '' };

  add() {
    this.categoriesService.create({
      name: this.draft.name,
      color: this.draft.color,
      keywords: this.draft.keywords || null,
    }).subscribe(() => {
      this.draft = { name: '', color: '#4f46e5', keywords: '' };
      this.categoriesService.refresh();
    });
  }

  save(category: Category) {
    this.categoriesService.update(category.id, {
      name: category.name,
      color: category.color,
      keywords: category.keywords || null,
    }).subscribe(() => this.categoriesService.refresh());
  }

  remove(category: Category) {
    if (!confirm('Supprimer la catégorie "' + category.name + '" ? Les transactions liées deviendront non catégorisées.')) return;
    this.categoriesService.remove(category.id)
      .subscribe(() => this.categoriesService.refresh());
  }
}
