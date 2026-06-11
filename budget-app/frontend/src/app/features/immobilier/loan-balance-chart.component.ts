import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ChartComponent } from '../../shared/chart.component';
import { SettingsService } from '../../core/services';
import { ScheduleEntry } from '../../core/housing.models';

/** Courbes du capital restant dû et des intérêts cumulés d'un prêt. */
@Component({
  selector: 'app-loan-balance-chart',
  standalone: true,
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Capital restant dû</h2>
      <app-chart [config]="config()" />
    </div>
  `,
})
export class LoanBalanceChartComponent {
  private readonly settings = inject(SettingsService);

  readonly schedule = input.required<ScheduleEntry[]>();

  readonly config = computed<ChartConfiguration<'line'>>(() => {
    const accent = this.settings.themeColor();
    const entries = this.schedule();
    let cumulated = 0;
    const cumulatedInterest = entries.map((e) => (cumulated += e.interest));
    return {
      type: 'line',
      data: {
        labels: entries.map((e) => e.date.slice(0, 7)),
        datasets: [
          {
            label: 'Capital restant dû',
            data: entries.map((e) => e.remainingBalance),
            borderColor: accent,
            backgroundColor: accent,
            pointRadius: 0,
            tension: 0.15,
          },
          {
            label: 'Intérêts cumulés',
            data: cumulatedInterest,
            borderColor: '#cbd5e1',
            backgroundColor: '#cbd5e1',
            pointRadius: 0,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true },
          x: { ticks: { maxTicksLimit: 12 } },
        },
      },
    };
  });
}
