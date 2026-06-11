import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccountsService, ImportService } from '../../core/services';
import { ImportResult } from '../../core/models';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, FileUploadModule, MessageModule, SelectModule, TableModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Importer un relevé</h1>
    <p class="muted">
      Formats acceptés : <strong>.csv</strong>, <strong>.xlsx</strong> et <strong>.pdf</strong> (lecture best effort).
      Les doublons (même compte, date, montant et libellé) sont détectés et ne sont jamais réimportés.
    </p>

    <div class="card">
      <div class="row">
        <div>
          <label>Compte de destination</label>
          <p-select [options]="accountsService.accounts()" optionLabel="name" optionValue="id"
                    placeholder="— Choisir un compte —"
                    [ngModel]="accountId()" (ngModelChange)="accountId.set($event)" />
        </div>
        <div>
          <label>Fichier</label>
          <p-fileupload mode="basic" accept=".csv,.xlsx,.pdf" [customUpload]="true"
                        chooseLabel="Choisir un fichier..." chooseIcon="pi pi-file"
                        (onSelect)="onFile($event)" />
        </div>
        <p-button label="Analyser" [outlined]="true" (onClick)="analyze()"
                  [disabled]="!canSubmit() || busy()" [loading]="busy()" />
        <p-button label="Importer {{ preview() ? preview()!.newRows + ' ligne(s)' : '' }}"
                  (onClick)="confirm()"
                  [disabled]="!canSubmit() || busy() || !preview() || preview()!.newRows === 0" />
      </div>
    </div>

    @if (error()) {
      <p-message severity="error" styleClass="block-message">{{ error() }}</p-message>
    }
    @if (done()) {
      <p-message severity="success" styleClass="block-message">
        Import terminé : {{ done()!.imported }} transaction(s) ajoutée(s),
        {{ done()!.duplicates }} doublon(s) ignoré(s).
      </p-message>
    }

    @if (preview(); as result) {
      <div class="card">
        <h2>Aperçu — {{ result.total }} ligne(s) lue(s)</h2>
        <p>
          <p-tag severity="success" value="{{ result.newRows }} nouvelle(s)" />&nbsp;
          <p-tag severity="danger" value="{{ result.duplicates }} doublon(s)" />
        </p>
        <p-table [value]="result.rows">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie détectée</th>
              <th class="amount">Montant</th>
              <th>Statut</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.date | date:'dd/MM/yyyy' }}</td>
              <td>{{ row.label }}</td>
              <td>
                @if (row.category) {
                  <p-tag severity="secondary" [value]="row.category" />
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td class="amount" [class.neg]="row.amount < 0" [class.pos]="row.amount > 0">
                {{ row.amount | currency:'EUR' }}
              </td>
              <td>
                @if (row.duplicate) {
                  <p-tag severity="danger" value="Doublon" />
                } @else {
                  <p-tag severity="success" value="Nouveau" />
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    }
  `,
})
export class ImportComponent {
  readonly accountsService = inject(AccountsService);
  private readonly importService = inject(ImportService);

  readonly accountId = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly preview = signal<ImportResult | null>(null);
  readonly done = signal<ImportResult | null>(null);

  private file: File | null = null;

  onFile(event: FileSelectEvent) {
    this.file = event.files[0] ?? null;
    this.preview.set(null);
    this.done.set(null);
    this.error.set('');
  }

  canSubmit(): boolean {
    return !!this.file && !!this.accountId();
  }

  analyze() {
    this.run(true);
  }

  confirm() {
    this.run(false);
  }

  private run(dryRun: boolean) {
    if (!this.file || !this.accountId()) return;
    this.busy.set(true);
    this.error.set('');
    this.done.set(null);

    this.importService.upload(this.file, this.accountId(), dryRun).subscribe({
      next: (result) => {
        this.busy.set(false);
        if (dryRun) {
          this.preview.set(result);
        } else {
          this.done.set(result);
          this.preview.set(null);
          this.accountsService.refresh();
        }
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? "L'import a échoué. Vérifiez le fichier.");
      },
    });
  }
}
