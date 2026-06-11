import {
  Component, effect, ElementRef, input, OnDestroy, viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);
Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
Chart.defaults.color = '#71717a';

/**
 * Enveloppe minimaliste autour de Chart.js : le graphique est détruit puis
 * recréé à chaque changement de la config (signal input), ce qui le rend
 * réactif aux filtres et au changement de couleur du thème.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<div class="chart-box"><canvas #canvas></canvas></div>`,
})
export class ChartComponent implements OnDestroy {
  readonly config = input.required<ChartConfiguration<any>>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const cfg = this.config();
      const canvas = this.canvas();
      if (!canvas) return;
      this.chart?.destroy();
      this.chart = new Chart(canvas.nativeElement, cfg);
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
