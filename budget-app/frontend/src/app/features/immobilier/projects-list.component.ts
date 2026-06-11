import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { HousingService } from '../../core/housing.service';
import { HousingProjectListItem } from '../../core/housing.models';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputTextModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Projets immobiliers</h1>
    <p class="muted">
      Un projet regroupe les prêts et les frais fixes (cuisine, travaux, notaire...) d'un achat.
    </p>

    <div class="card">
      <h2>Nouveau projet</h2>
      <div class="row">
        <div>
          <label>Nom</label>
          <input pInputText type="text" [(ngModel)]="draftName" placeholder="Appartement 1..." />
        </div>
        <div style="flex: 1; min-width: 220px;">
          <label>Notes (optionnel)</label>
          <input pInputText type="text" [(ngModel)]="draftNotes" style="width: 100%;" />
        </div>
        <p-button label="Créer" (onClick)="add()" [disabled]="!draftName.trim()" />
      </div>
    </div>

    <div class="card">
      @if (housing.projects().length === 0) {
        <div class="empty">Aucun projet pour l'instant. Créez votre premier projet ci-dessus.</div>
      } @else {
        <p-table [value]="housing.projects()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Nom</th>
              <th>Prêts</th>
              <th class="amount">Emprunté</th>
              <th class="amount">Mensualité</th>
              <th class="amount">Prix final estimé</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-project>
            <tr>
              <td>
                <a [routerLink]="['projets', project.id]" class="project-link">{{ project.name }}</a>
                @if (project.notes) {<div class="muted" style="font-size: 0.8rem;">{{ project.notes }}</div>}
              </td>
              <td class="muted">{{ project.loanCount }}</td>
              <td class="amount">{{ project.totalBorrowed | currency:'EUR' }}</td>
              <td class="amount">{{ project.monthlyPayment | currency:'EUR' }}<span class="muted"> /mois</span></td>
              <td class="amount">{{ project.finalPrice | currency:'EUR' }}</td>
              <td style="white-space: nowrap; text-align: right;">
                <p-button label="Ouvrir" size="small" [outlined]="true" [routerLink]="['projets', project.id]" />
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(project)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class ProjectsListComponent {
  readonly housing = inject(HousingService);

  draftName = '';
  draftNotes = '';

  constructor() {
    this.housing.refresh();
  }

  add() {
    this.housing.createProject({ name: this.draftName, notes: this.draftNotes || null }).subscribe(() => {
      this.draftName = '';
      this.draftNotes = '';
      this.housing.refresh();
    });
  }

  remove(project: HousingProjectListItem) {
    if (!confirm(`Supprimer le projet "${project.name}", ses prêts et ses frais ?`)) return;
    this.housing.deleteProject(project.id).subscribe(() => this.housing.refresh());
  }
}
