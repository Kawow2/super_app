import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { HousingService } from '../../core/housing.service';
import { InsuranceMode, Loan } from '../../core/housing.models';
import { toIsoDate } from '../../core/date-utils';

/** Formulaire de création / édition d'un prêt. */
@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, InputNumberModule, InputTextModule, MessageModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" style="border-color: var(--accent);">
      <h2>{{ loan() ? 'Modifier le prêt' : 'Nouveau prêt' }}</h2>
      @if (error()) {
        <p-message severity="error" styleClass="block-message">{{ error() }}</p-message>
      }
      <div class="row">
        <div>
          <label>Nom</label>
          <input pInputText type="text" [(ngModel)]="name" placeholder="Prêt principal..." />
        </div>
        <div>
          <label>Capital emprunté</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR" [min]="0"
                         [(ngModel)]="principal" inputStyleClass="amount-input" />
        </div>
        <div>
          <label>Taux nominal annuel (%)</label>
          <p-inputnumber mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4" [min]="0"
                         suffix=" %" [(ngModel)]="annualRate" inputStyleClass="day-input" />
        </div>
        <div>
          <label>Durée</label>
          <p-inputnumber [min]="1" [max]="durationUnit === 'ans' ? 50 : 600" [showButtons]="true"
                         [(ngModel)]="durationValue" inputStyleClass="day-input" />
        </div>
        <div>
          <label>Unité</label>
          <p-select [options]="['ans', 'mois']" [(ngModel)]="durationUnit" />
        </div>
        <div>
          <label>Début du prêt</label>
          <p-datepicker [(ngModel)]="startDate" dateFormat="dd/mm/yy" styleClass="date-input" />
        </div>
      </div>
      <div class="row" style="margin-top: 0.8rem;">
        <div>
          <label>Assurance</label>
          <p-select [options]="insuranceModes" optionLabel="label" optionValue="value"
                    [(ngModel)]="insuranceMode" />
        </div>
        @if (insuranceMode === 1) {
          <div>
            <label>Taux annuel (% du capital initial)</label>
            <p-inputnumber mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="4" [min]="0"
                           suffix=" %" [(ngModel)]="insuranceAnnualRate" inputStyleClass="day-input" />
          </div>
        }
        @if (insuranceMode === 2) {
          <div>
            <label>Montant (€ / mois)</label>
            <p-inputnumber mode="currency" currency="EUR" locale="fr-FR" [min]="0"
                           [(ngModel)]="insuranceMonthlyAmount" inputStyleClass="amount-input" />
          </div>
        }
        <div>
          <label>Frais fixes (dossier, garantie...)</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR" [min]="0"
                         [(ngModel)]="fees" inputStyleClass="amount-input" />
        </div>
        <div class="spacer"></div>
        <p-button label="Annuler" [text]="true" (onClick)="cancelled.emit()" />
        <p-button [label]="loan() ? 'Enregistrer' : 'Créer le prêt'" (onClick)="save()"
                  [disabled]="!name.trim() || principal <= 0" />
      </div>
    </div>
  `,
})
export class LoanFormComponent {
  private readonly housing = inject(HousingService);

  readonly projectId = input.required<string>();
  readonly loan = input<Loan | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly error = signal('');

  readonly insuranceModes = [
    { label: 'Aucune', value: 0 as InsuranceMode },
    { label: '% du capital initial', value: 1 as InsuranceMode },
    { label: '€ / mois', value: 2 as InsuranceMode },
  ];

  name = '';
  principal = 0;
  annualRate = 3;
  durationValue = 20;
  durationUnit: 'ans' | 'mois' = 'ans';
  startDate = new Date();
  insuranceMode: InsuranceMode = 1;
  insuranceAnnualRate = 0.3;
  insuranceMonthlyAmount = 0;
  fees = 0;

  ngOnInit() {
    const loan = this.loan();
    if (!loan) return;
    this.name = loan.name;
    this.principal = loan.principal;
    this.annualRate = loan.annualRate;
    if (loan.durationMonths % 12 === 0) {
      this.durationValue = loan.durationMonths / 12;
      this.durationUnit = 'ans';
    } else {
      this.durationValue = loan.durationMonths;
      this.durationUnit = 'mois';
    }
    this.startDate = new Date(loan.startDate);
    this.insuranceMode = loan.insuranceMode;
    this.insuranceAnnualRate = loan.insuranceAnnualRate;
    this.insuranceMonthlyAmount = loan.insuranceMonthlyAmount;
    this.fees = loan.fees;
  }

  save() {
    const dto = {
      projectId: this.projectId(),
      name: this.name,
      principal: this.principal,
      annualRate: this.annualRate,
      durationMonths: this.durationUnit === 'ans' ? this.durationValue * 12 : this.durationValue,
      startDate: toIsoDate(this.startDate),
      insuranceMode: this.insuranceMode,
      insuranceAnnualRate: this.insuranceMode === 1 ? this.insuranceAnnualRate : 0,
      insuranceMonthlyAmount: this.insuranceMode === 2 ? this.insuranceMonthlyAmount : 0,
      fees: this.fees,
    };
    const loan = this.loan();
    const request = loan ? this.housing.updateLoan(loan.id, dto) : this.housing.createLoan(dto);
    request.subscribe({
      next: () => this.saved.emit(),
      error: (err) => this.error.set(err?.error ?? "L'enregistrement a échoué."),
    });
  }
}
