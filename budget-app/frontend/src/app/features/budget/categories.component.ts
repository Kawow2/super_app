import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CategoriesService } from '../../core/services';
import { Category } from '../../core/models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ColorPickerModule, InputTextModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
          <input pInputText type="text" [(ngModel)]="draft.name" placeholder="Vacances..." />
        </div>
        <div>
          <label>Couleur</label>
          <p-colorpicker [ngModel]="draft.color" (ngModelChange)="draft.color = toHex($event)" />
        </div>
        <div style="flex: 1; min-width: 220px;">
          <label>Mots-clés</label>
          <input pInputText type="text" [(ngModel)]="draft.keywords" placeholder="hotel; airbnb; camping" style="width: 100%;" />
        </div>
        <p-button label="Ajouter" (onClick)="add()" [disabled]="!draft.name" />
      </div>
    </div>

    <div class="card">
      @if (categoriesService.categories().length === 0) {
        <div class="empty">Aucune catégorie.</div>
      } @else {
        <p-table [value]="categoriesService.categories()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Couleur</th>
              <th>Nom</th>
              <th style="width: 45%;">Mots-clés</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-category>
            <tr>
              <td><p-colorpicker [ngModel]="category.color" (ngModelChange)="category.color = toHex($event)" /></td>
              <td><input pInputText type="text" [ngModel]="category.name" (ngModelChange)="category.name = $event" /></td>
              <td><input pInputText type="text" [ngModel]="category.keywords ?? ''" (ngModelChange)="category.keywords = $event" style="width: 100%;" /></td>
              <td style="white-space: nowrap;">
                <p-button label="Enregistrer" size="small" [outlined]="true" (onClick)="save(category)" />
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(category)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class CategoriesComponent {
  readonly categoriesService = inject(CategoriesService);

  draft = { name: '', color: '#4f46e5', keywords: '' };

  /** Le ColorPicker peut émettre la valeur hex sans « # » : normalise pour l'API et les graphiques. */
  toHex(value: string): string {
    return value.startsWith('#') ? value : `#${value}`;
  }

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
