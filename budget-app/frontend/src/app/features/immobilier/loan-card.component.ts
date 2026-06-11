import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { LoanWithSummary } from '../../core/housing.models';

/** Carte de synthèse d'un prêt avec ses actions. */
@Component({
  selector: 'app-loan-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [style.opacity]="item().loan.isScenario ? 0.85 : 1">
      <div class="row" style="align-items: center; margin-bottom: 0.6rem;">
        <h2 style="margin: 0;">{{ item().loan.name }}</h2>
        @if (item().loan.isScenario) {
          <p-tag severity="warn" value="Scénario" />
        }
        <div class="spacer"></div>
        <p-button label="Modifier" size="small" [outlined]="true" (onClick)="edit.emit()" />
        <p-button label="Dupliquer en scénario" size="small" [outlined]="true" (onClick)="duplicate.emit()" />
        <p-button [label]="expanded() ? 'Masquer l\\'échéancier' : 'Échéancier'" size="small" (onClick)="toggleSchedule.emit()" />
        <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove.emit()" />
      </div>

      <div class="cards-row" style="margin-bottom: 0;">
        <div>
          <div class="stat-label">Mensualité (assurance incl.)</div>
          <div class="stat-value">{{ item().summary.currentMonthlyTotal | currency:'EUR' }}</div>
          <div class="stat-sub">dont assurance {{ item().summary.monthlyInsurance | currency:'EUR' }}</div>
        </div>
        <div>
          <div class="stat-label">Capital · Taux · Durée</div>
          <div class="stat-value" style="font-size: 1.05rem;">
            {{ item().loan.principal | currency:'EUR':'symbol':'1.0-0' }} · {{ item().loan.annualRate | number:'1.0-2' }} %
          </div>
          <div class="stat-sub">{{ duration() }} — fin {{ item().summary.endDate | date:'MM/yyyy' }}</div>
        </div>
        <div>
          <div class="stat-label">Restant dû</div>
          <div class="stat-value">{{ item().summary.remainingBalance | currency:'EUR' }}</div>
          <div class="stat-sub">intérêts restants {{ item().summary.remainingInterest | currency:'EUR' }}</div>
        </div>
        <div>
          <div class="stat-label">Coût total du crédit</div>
          <div class="stat-value neg">{{ item().summary.totalCost | currency:'EUR' }}</div>
          <div class="stat-sub">
            intérêts {{ item().summary.totalInterest | currency:'EUR' }}
            · assurance {{ item().summary.totalInsurance | currency:'EUR' }}
          </div>
        </div>
        @if (item().summary.interestSaved > 0) {
          <div>
            <div class="stat-label">Intérêts économisés</div>
            <div class="stat-value pos">{{ item().summary.interestSaved | currency:'EUR' }}</div>
            <div class="stat-sub">grâce aux remboursements anticipés</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoanCardComponent {
  readonly item = input.required<LoanWithSummary>();
  readonly expanded = input(false);

  readonly edit = output<void>();
  readonly duplicate = output<void>();
  readonly toggleSchedule = output<void>();
  readonly remove = output<void>();

  duration(): string {
    const months = this.item().loan.durationMonths;
    return months % 12 === 0 ? `${months / 12} ans` : `${months} mois`;
  }
}
