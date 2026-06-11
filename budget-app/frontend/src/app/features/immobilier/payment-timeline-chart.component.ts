import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ChartComponent } from '../../shared/chart.component';
import { SettingsService } from '../../core/services';
import { TimelinePoint } from '../../core/housing.models';

/** Mensualités cumulées du projet dans le temps (chevauchements de prêts visibles). */
@Component({
  selector: 'app-payment-timeline-chart',
  standalone: true,
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Mensualités du projet dans le temps</h2>
      <app-chart [config]="config()" />
    </div>
  `,
})
export class PaymentTimelineChartComponent {
  private readonly settings = inject(SettingsService);

  readonly timeline = input.required<TimelinePoint[]>();

  readonly config = computed<ChartConfiguration<'bar'>>(() => {
    const accent = this.settings.themeColor();
    const points = this.timeline();
    return {
      type: 'bar',
      data: {
        labels: points.map((p) => p.month),
        datasets: [
          { label: 'Mensualités', data: points.map((p) => p.payment), backgroundColor: accent },
          { label: 'Assurance', data: points.map((p) => p.insurance), backgroundColor: '#cbd5e1' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, ticks: { maxTicksLimit: 12 } },
          y: { stacked: true, beginAtZero: true },
        },
      },
    };
  });
}
