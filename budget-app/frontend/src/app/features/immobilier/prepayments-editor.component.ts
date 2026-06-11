import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { HousingService } from '../../core/housing.service';
import { Prepayment, PrepaymentMode } from '../../core/housing.models';
import { toIsoDate } from '../../core/date-utils';

/** Remboursements anticipés d'un prêt : liste + ajout, avec les intérêts économisés. */
@Component({
  selector: 'app-prepayments-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, InputNumberModule, SelectModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Remboursements anticipés</h2>
      @if (interestSaved() > 0) {
        <p class="pos" style="font-weight: 600;">
          Intérêts économisés : {{ interestSaved() | currency:'EUR' }}
        </p>
      }
      <div class="row" style="margin-bottom: 0.8rem;">
        <div>
          <label>Date</label>
          <p-datepicker [(ngModel)]="draftDate" dateFormat="dd/mm/yy" styleClass="date-input" />
        </div>
        <div>
          <label>Montant</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR" [min]="0"
                         [(ngModel)]="draftAmount" inputStyleClass="amount-input" />
        </div>
        <div>
          <label>Effet</label>
          <p-select [options]="modes" optionLabel="label" optionValue="value" [(ngModel)]="draftMode" />
        </div>
        <p-button label="Ajouter" (onClick)="add()" [disabled]="draftAmount <= 0" />
      </div>

      @if (prepayments().length === 0) {
        <div class="empty">Aucun remboursement anticipé. Simulez-en un pour voir les intérêts économisés.</div>
      } @else {
        <p-table [value]="prepayments()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th class="amount">Montant</th>
              <th>Effet</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-prepayment>
            <tr>
              <td>{{ prepayment.date | date:'dd/MM/yyyy' }}</td>
              <td class="amount">{{ prepayment.amount | currency:'EUR' }}</td>
              <td class="muted">{{ prepayment.mode === 0 ? 'Réduire la durée' : 'Réduire la mensualité' }}</td>
              <td>
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(prepayment)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class PrepaymentsEditorComponent {
  private readonly housing = inject(HousingService);

  readonly loanId = input.required<string>();
  readonly prepayments = input.required<Prepayment[]>();
  readonly interestSaved = input(0);
  readonly changed = output<void>();

  readonly modes = [
    { label: 'Réduire la durée', value: 0 as PrepaymentMode },
    { label: 'Réduire la mensualité', value: 1 as PrepaymentMode },
  ];

  draftDate = new Date();
  draftAmount = 0;
  draftMode: PrepaymentMode = 0;

  add() {
    this.housing.addPrepayment(this.loanId(), {
      date: toIsoDate(this.draftDate),
      amount: this.draftAmount,
      mode: this.draftMode,
    }).subscribe(() => {
      this.draftAmount = 0;
      this.changed.emit();
    });
  }

  remove(prepayment: Prepayment) {
    if (!confirm('Supprimer ce remboursement anticipé ?')) return;
    this.housing.deletePrepayment(this.loanId(), prepayment.id).subscribe(() => this.changed.emit());
  }
}
