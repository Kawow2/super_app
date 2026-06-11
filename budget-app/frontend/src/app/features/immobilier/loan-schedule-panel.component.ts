import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HousingService } from '../../core/housing.service';
import { LoanDetail } from '../../core/housing.models';
import { LoanBalanceChartComponent } from './loan-balance-chart.component';
import { PrepaymentsEditorComponent } from './prepayments-editor.component';
import { ScheduleTableComponent } from './schedule-table.component';

/** Panneau déplié d'un prêt : graphe du CRD, remboursements anticipés, tableau d'amortissement. */
@Component({
  selector: 'app-loan-schedule-panel',
  standalone: true,
  imports: [CommonModule, LoanBalanceChartComponent, PrepaymentsEditorComponent, ScheduleTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail(); as d) {
      <div class="grid-2">
        <app-loan-balance-chart [schedule]="d.schedule" />
        <app-prepayments-editor [loanId]="d.loan.id" [prepayments]="d.prepayments"
                                [interestSaved]="d.summary.interestSaved"
                                (changed)="onPrepaymentsChanged()" />
      </div>
      <app-schedule-table [schedule]="d.schedule" />
    } @else {
      <div class="card"><div class="empty">Chargement de l'échéancier...</div></div>
    }
  `,
})
export class LoanSchedulePanelComponent {
  private readonly housing = inject(HousingService);

  readonly loanId = input.required<string>();
  /** Émis quand un remboursement anticipé change : le projet doit recharger ses totaux. */
  readonly changed = output<void>();

  readonly detail = signal<LoanDetail | null>(null);

  constructor() {
    effect(() => this.load(this.loanId()));
  }

  private load(id: string) {
    this.housing.getLoan(id).subscribe((d) => this.detail.set(d));
  }

  onPrepaymentsChanged() {
    this.load(this.loanId());
    this.changed.emit();
  }
}
