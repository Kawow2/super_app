import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ScheduleEntry } from '../../core/housing.models';

/** Tableau d'amortissement mois par mois (pagination côté client). */
@Component({
  selector: 'app-schedule-table',
  standalone: true,
  imports: [CommonModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Tableau d'amortissement</h2>
      <div class="table-scroll">
      <p-table [value]="schedule()" [paginator]="schedule().length > 12" [rows]="12"
               [showCurrentPageReport]="true"
               currentPageReportTemplate="échéances {first} à {last} sur {totalRecords}">
        <ng-template pTemplate="header">
          <tr>
            <th>N°</th>
            <th>Date</th>
            <th class="amount">Mensualité</th>
            <th class="amount">Capital</th>
            <th class="amount">Intérêts</th>
            <th class="amount">Assurance</th>
            <th class="amount">Remb. anticipé</th>
            <th class="amount">Restant dû</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-entry>
          <tr [style.background]="entry.prepaidAmount > 0 ? 'var(--accent-soft)' : ''">
            <td class="muted">{{ entry.paymentNumber }}</td>
            <td>{{ entry.date | date:'MM/yyyy' }}</td>
            <td class="amount">{{ entry.payment | currency:'EUR' }}</td>
            <td class="amount">{{ entry.principal | currency:'EUR' }}</td>
            <td class="amount neg">{{ entry.interest | currency:'EUR' }}</td>
            <td class="amount">{{ entry.insurance | currency:'EUR' }}</td>
            <td class="amount">
              @if (entry.prepaidAmount > 0) {{{ entry.prepaidAmount | currency:'EUR' }}} @else {<span class="muted">—</span>}
            </td>
            <td class="amount">{{ entry.remainingBalance | currency:'EUR' }}</td>
          </tr>
        </ng-template>
      </p-table>
      </div>
    </div>
  `,
})
export class ScheduleTableComponent {
  readonly schedule = input.required<ScheduleEntry[]>();
}
