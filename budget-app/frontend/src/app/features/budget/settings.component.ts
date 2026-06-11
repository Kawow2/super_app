import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SettingsService } from '../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ColorPickerModule, FileUploadModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
          <p-colorpicker [ngModel]="settings.themeColor()" (ngModelChange)="apply($event)" />
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Sauvegarde des données</h2>
      <p class="muted">
        Téléchargez un fichier JSON contenant l'intégralité de vos données
        (comptes, transactions, catégories, abonnements, paramètres) pour changer de PC ou faire une sauvegarde.
      </p>
      <a pButton href="/api/export" download>Exporter toutes les données</a>
    </div>

    <div class="card">
      <h2>Restauration</h2>
      <p class="muted">
        Importez un fichier d'export pour restaurer vos données.
        <strong>Attention : cela remplace TOUTES les données actuelles.</strong>
      </p>
      @if (restoreMessage()) {
        <p-message severity="success" styleClass="block-message">{{ restoreMessage() }}</p-message>
      }
      @if (restoreError()) {
        <p-message severity="error" styleClass="block-message">{{ restoreError() }}</p-message>
      }
      <p-fileupload #uploader mode="basic" accept=".json" [auto]="true" [customUpload]="true"
                    chooseLabel="Choisir un fichier d'export..." chooseIcon="pi pi-upload"
                    (uploadHandler)="restore($event); uploader.clear()" />
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
    this.settings.saveThemeColor(color.startsWith('#') ? color : `#${color}`);
  }

  restore(event: FileUploadHandlerEvent) {
    const file = event.files[0];
    if (!file) return;

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
