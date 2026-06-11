import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Paramètres</h1>

    <div class="card">
      <h2>Couleur du thème</h2>
      <p class="muted">La couleur d'accent est utilisée dans toute l'application (navigation, boutons, graphiques).</p>
      <div class="row" style="align-items: center;">
        <div class="swatches">
          @for (color of presets; track color) {
            <button class="swatch"
                    [style.background]="color"
                    [class.selected]="settings.themeColor() === color"
                    (click)="apply(color)"
                    [attr.aria-label]="'Couleur ' + color"></button>
          }
        </div>
        <div>
          <label>Personnalisée</label>
          <input type="color" [ngModel]="settings.themeColor()" (ngModelChange)="apply($event)" />
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Sauvegarde des données</h2>
      <p class="muted">
        Téléchargez un fichier JSON contenant l'intégralité de vos données
        (comptes, transactions, catégories, abonnements, paramètres) pour changer de PC ou faire une sauvegarde.
      </p>
      <a class="btn primary" href="/api/export" download style="text-decoration: none; display: inline-block;">
        Exporter toutes les données
      </a>
    </div>

    <div class="card">
      <h2>Restauration</h2>
      <p class="muted">
        Importez un fichier d'export pour restaurer vos données.
        <strong>Attention : cela remplace TOUTES les données actuelles.</strong>
      </p>
      @if (restoreMessage()) {
        <div class="success">{{ restoreMessage() }}</div>
      }
      @if (restoreError()) {
        <div class="error">{{ restoreError() }}</div>
      }
      <input type="file" accept=".json" (change)="restore($event)" />
    </div>
  `,
})
export class SettingsComponent {
  readonly settings = inject(SettingsService);

  readonly presets = [
    '#4f46e5', '#0891b2', '#16a34a', '#ca8a04', '#ea580c',
    '#dc2626', '#db2777', '#9333ea', '#1c1c1e',
  ];

  readonly restoreMessage = signal('');
  readonly restoreError = signal('');

  apply(color: string) {
    this.settings.saveThemeColor(color);
  }

  restore(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (!confirm('Restaurer cette sauvegarde ? Toutes les données actuelles seront REMPLACÉES.')) return;

    this.restoreMessage.set('');
    this.restoreError.set('');
    this.settings.restore(file).subscribe({
      next: (result) => {
        this.restoreMessage.set(
          `Restauration réussie : ${result.accounts} compte(s), ${result.transactions} transaction(s), ` +
          `${result.categories} catégorie(s), ${result.subscriptions} abonnement(s). Rechargement...`);
        setTimeout(() => location.reload(), 1500);
      },
      error: (err) => {
        this.restoreError.set(err?.error?.message ?? 'La restauration a échoué.');
      },
    });
  }
}
