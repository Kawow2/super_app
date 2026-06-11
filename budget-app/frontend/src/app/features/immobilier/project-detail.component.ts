import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HousingService } from '../../core/housing.service';
import { HousingProjectDetail, Loan, LoanWithSummary } from '../../core/housing.models';
import { ProjectSummaryCardsComponent } from './project-summary-cards.component';
import { CostsEditorComponent } from './costs-editor.component';
import { LoanCardComponent } from './loan-card.component';
import { LoanFormComponent } from './loan-form.component';
import { LoanSchedulePanelComponent } from './loan-schedule-panel.component';
import { PaymentTimelineChartComponent } from './payment-timeline-chart.component';
import { ScenarioCompareComponent } from './scenario-compare.component';

/** Page de détail d'un projet : orchestration des sous-composants, rechargement sur changement. */
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ButtonModule,
    ProjectSummaryCardsComponent, CostsEditorComponent, LoanCardComponent, LoanFormComponent,
    LoanSchedulePanelComponent, PaymentTimelineChartComponent, ScenarioCompareComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail(); as d) {
      <p style="margin: 0 0 0.4rem;"><a routerLink="/immobilier" class="muted">‹ Tous les projets</a></p>
      <div class="row" style="align-items: center; margin-bottom: 0.8rem;">
        <h1 style="margin: 0;">{{ d.name }}</h1>
        <div class="spacer"></div>
        <p-button label="+ Ajouter un prêt" (onClick)="openCreate()" />
      </div>
      @if (d.notes) {<p class="muted">{{ d.notes }}</p>}

      <app-project-summary-cards [detail]="d" />

      @if (showLoanForm()) {
        <app-loan-form [projectId]="d.id" [loan]="editingLoan()"
                       (saved)="onFormClosed(true)" (cancelled)="onFormClosed(false)" />
      }

      @for (item of d.loans; track item.loan.id) {
        <app-loan-card [item]="item"
                       [expanded]="expandedLoanId() === item.loan.id"
                       (edit)="openEdit(item.loan)"
                       (duplicate)="duplicate(item.loan)"
                       (toggleSchedule)="toggleSchedule(item.loan.id)"
                       (remove)="removeLoan(item.loan)" />
        @if (expandedLoanId() === item.loan.id) {
          <app-loan-schedule-panel [loanId]="item.loan.id" (changed)="reload()" />
        }
      } @empty {
        <div class="card"><div class="empty">Aucun prêt. Ajoutez le premier prêt du projet.</div></div>
      }

      @if (scenarioLoans().length > 0) {
        <app-scenario-compare [loans]="d.loans" />
      }

      <div class="grid-2">
        <app-costs-editor [projectId]="d.id" [costs]="d.costs" (changed)="reload()" />
        @if (d.timeline.length > 0) {
          <app-payment-timeline-chart [timeline]="d.timeline" />
        }
      </div>
    } @else {
      <div class="empty">Chargement...</div>
    }
  `,
})
export class ProjectDetailComponent {
  private readonly housing = inject(HousingService);

  /** Paramètre de route (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly detail = signal<HousingProjectDetail | null>(null);
  readonly showLoanForm = signal(false);
  readonly editingLoan = signal<Loan | null>(null);
  readonly expandedLoanId = signal<string | null>(null);

  readonly scenarioLoans = computed<LoanWithSummary[]>(() =>
    this.detail()?.loans.filter((l) => l.loan.isScenario) ?? []);

  constructor() {
    effect(() => this.load(this.id()));
  }

  private load(id: string) {
    this.housing.getDetail(id).subscribe((d) => this.detail.set(d));
  }

  reload() {
    this.load(this.id());
  }

  openCreate() {
    this.editingLoan.set(null);
    this.showLoanForm.set(true);
  }

  openEdit(loan: Loan) {
    this.editingLoan.set(loan);
    this.showLoanForm.set(true);
  }

  onFormClosed(saved: boolean) {
    this.showLoanForm.set(false);
    this.editingLoan.set(null);
    if (saved) this.reload();
  }

  toggleSchedule(loanId: string) {
    this.expandedLoanId.set(this.expandedLoanId() === loanId ? null : loanId);
  }

  duplicate(loan: Loan) {
    this.housing.duplicateLoan(loan.id, '').subscribe(() => this.reload());
  }

  removeLoan(loan: Loan) {
    const kind = loan.isScenario ? 'le scénario' : 'le prêt';
    if (!confirm(`Supprimer ${kind} "${loan.name}" et son échéancier ?`)) return;
    if (this.expandedLoanId() === loan.id) this.expandedLoanId.set(null);
    this.housing.deleteLoan(loan.id).subscribe(() => this.reload());
  }
}
