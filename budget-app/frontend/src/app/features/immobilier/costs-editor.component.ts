import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { HousingService } from '../../core/housing.service';
import { ProjectCost } from '../../core/housing.models';

/** Frais fixes du projet (cuisine, travaux, notaire...), comptés dans le prix final. */
@Component({
  selector: 'app-costs-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, InputTextModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Frais fixes</h2>
      <div class="row" style="margin-bottom: 0.8rem;">
        <div>
          <label>Libellé</label>
          <input pInputText type="text" [(ngModel)]="draftLabel" placeholder="Cuisine, travaux..." />
        </div>
        <div>
          <label>Montant</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR"
                         [(ngModel)]="draftAmount" inputStyleClass="amount-input" />
        </div>
        <p-button label="Ajouter" (onClick)="add()" [disabled]="!draftLabel.trim()" />
      </div>

      @if (costs().length === 0) {
        <div class="empty">Aucun frais fixe.</div>
      } @else {
        <p-table [value]="costs()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Libellé</th>
              <th class="amount">Montant</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-cost>
            <tr>
              <td><input pInputText type="text" [ngModel]="cost.label" (ngModelChange)="cost.label = $event" /></td>
              <td class="amount">
                <p-inputnumber mode="currency" currency="EUR" locale="fr-FR"
                               [ngModel]="cost.amount" (ngModelChange)="cost.amount = $event ?? 0"
                               inputStyleClass="amount-input" />
              </td>
              <td style="white-space: nowrap;">
                <p-button label="Enregistrer" size="small" [outlined]="true" (onClick)="save(cost)" />
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(cost)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class CostsEditorComponent {
  private readonly housing = inject(HousingService);

  readonly projectId = input.required<string>();
  readonly costs = input.required<ProjectCost[]>();
  readonly changed = output<void>();

  draftLabel = '';
  draftAmount = 0;

  add() {
    this.housing.addCost(this.projectId(), { label: this.draftLabel, amount: this.draftAmount })
      .subscribe(() => {
        this.draftLabel = '';
        this.draftAmount = 0;
        this.changed.emit();
      });
  }

  save(cost: ProjectCost) {
    this.housing.updateCost(this.projectId(), cost.id, { label: cost.label, amount: cost.amount })
      .subscribe(() => this.changed.emit());
  }

  remove(cost: ProjectCost) {
    if (!confirm(`Supprimer le frais "${cost.label}" ?`)) return;
    this.housing.deleteCost(this.projectId(), cost.id).subscribe(() => this.changed.emit());
  }
}
