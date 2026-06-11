import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HousingProjectDetail } from '../../core/housing.models';

/** Cartes de synthèse d'un projet : prix final, emprunté, intérêts, assurance, mensualité. */
@Component({
  selector: 'app-project-summary-cards',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cards-row">
      <div class="card" style="border-color: var(--accent);">
        <div class="stat-label">Prix final estimé</div>
        <div class="stat-value">{{ detail().finalPrice | currency:'EUR' }}</div>
        <div class="stat-sub">prêts (capital + coûts) + frais fixes</div>
      </div>
      <div class="card">
        <div class="stat-label">Total emprunté</div>
        <div class="stat-value">{{ detail().totalBorrowed | currency:'EUR' }}</div>
        <div class="stat-sub">hors scénarios</div>
      </div>
      <div class="card">
        <div class="stat-label">Coût des intérêts</div>
        <div class="stat-value neg">{{ detail().totalInterest | currency:'EUR' }}</div>
      </div>
      <div class="card">
        <div class="stat-label">Assurance + frais bancaires</div>
        <div class="stat-value neg">{{ detail().totalInsurance + detail().totalFees | currency:'EUR' }}</div>
      </div>
      <div class="card">
        <div class="stat-label">Frais fixes (travaux...)</div>
        <div class="stat-value">{{ detail().totalCosts | currency:'EUR' }}</div>
      </div>
      <div class="card">
        <div class="stat-label">Mensualité courante</div>
        <div class="stat-value">{{ detail().monthlyPayment | currency:'EUR' }}</div>
        <div class="stat-sub">assurance incluse</div>
      </div>
    </div>
  `,
})
export class ProjectSummaryCardsComponent {
  readonly detail = input.required<HousingProjectDetail>();
}
