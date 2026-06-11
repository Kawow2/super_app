import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { LoanWithSummary } from '../../core/housing.models';

interface CompareRow {
  item: LoanWithSummary;
  baseName: string | null;
  deltaTotalCost: number | null;       // coût total vs prêt de base (négatif = scénario moins cher)
  deltaMonthly: number | null;
}

/** Comparaison côte à côte des prêts et de leurs scénarios (variantes de taux/durée). */
@Component({
  selector: 'app-scenario-compare',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Comparaison des scénarios</h2>
      <p class="muted">Les scénarios sont exclus des totaux du projet. Delta négatif = scénario moins cher.</p>
      <p-table [value]="rows()">
        <ng-template pTemplate="header">
          <tr>
            <th>Prêt</th>
            <th class="amount">Mensualité</th>
            <th class="amount">Intérêts</th>
            <th class="amount">Assurance</th>
            <th class="amount">Coût total</th>
            <th>Fin</th>
            <th class="amount">Delta coût total</th>
            <th class="amount">Delta mensualité</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              {{ row.item.loan.name }}
              @if (row.item.loan.isScenario) {
                <p-tag severity="warn" value="Scénario" />
                @if (row.baseName) {<div class="muted" style="font-size: 0.78rem;">vs {{ row.baseName }}</div>}
              }
            </td>
            <td class="amount">{{ row.item.summary.monthlyTotal | currency:'EUR' }}</td>
            <td class="amount">{{ row.item.summary.totalInterest | currency:'EUR' }}</td>
            <td class="amount">{{ row.item.summary.totalInsurance | currency:'EUR' }}</td>
            <td class="amount">{{ row.item.summary.totalCost | currency:'EUR' }}</td>
            <td>{{ row.item.summary.endDate | date:'MM/yyyy' }}</td>
            <td class="amount" [class.pos]="row.deltaTotalCost !== null && row.deltaTotalCost < 0"
                [class.neg]="row.deltaTotalCost !== null && row.deltaTotalCost > 0">
              @if (row.deltaTotalCost !== null) {
                {{ (row.deltaTotalCost > 0 ? '+' : '') + (row.deltaTotalCost | currency:'EUR') }}
              } @else {<span class="muted">—</span>}
            </td>
            <td class="amount" [class.pos]="row.deltaMonthly !== null && row.deltaMonthly < 0"
                [class.neg]="row.deltaMonthly !== null && row.deltaMonthly > 0">
              @if (row.deltaMonthly !== null) {
                {{ (row.deltaMonthly > 0 ? '+' : '') + (row.deltaMonthly | currency:'EUR') }}
              } @else {<span class="muted">—</span>}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class ScenarioCompareComponent {
  readonly loans = input.required<LoanWithSummary[]>();

  /** Prêts de base ayant des scénarios, suivis de leurs scénarios avec deltas. */
  readonly rows = computed<CompareRow[]>(() => {
    const all = this.loans();
    const scenarios = all.filter((l) => l.loan.isScenario);
    const baseIds = new Set(scenarios.map((s) => s.loan.baseLoanId).filter((id) => id !== null));

    const rows: CompareRow[] = [];
    for (const base of all.filter((l) => !l.loan.isScenario)) {
      const related = scenarios.filter((s) => s.loan.baseLoanId === base.loan.id);
      if (related.length === 0 && !baseIds.has(base.loan.id)) continue;
      rows.push({ item: base, baseName: null, deltaTotalCost: null, deltaMonthly: null });
      for (const scenario of related) {
        rows.push({
          item: scenario,
          baseName: base.loan.name,
          deltaTotalCost: scenario.summary.totalCost - base.summary.totalCost,
          deltaMonthly: scenario.summary.monthlyTotal - base.summary.monthlyTotal,
        });
      }
    }
    // Scénarios orphelins (prêt de base supprimé) : affichés sans delta.
    for (const orphan of scenarios.filter((s) => !all.some((l) => l.loan.id === s.loan.baseLoanId))) {
      rows.push({ item: orphan, baseName: null, deltaTotalCost: null, deltaMonthly: null });
    }
    return rows;
  });
}
