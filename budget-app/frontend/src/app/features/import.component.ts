import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsService, ImportService } from '../core/services';
import { ImportResult } from '../core/models';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <select [ngModel]="accountId()" (ngModelChange)="accountId.set($event)">
            <option value="">— Choisir un compte —</option>
            @for (account of accountsService.accounts(); track account.id) {
              <option [value]="account.id">{{ account.name }}</option>
            }
          </select>
        </div>
        <div>
          <label>Fichier</label>
          <input type="file" accept=".csv,.xlsx,.pdf" (change)="onFile($event)" />
        </div>
        <button class="btn" (click)="analyze()" [disabled]="!canSubmit() || busy()">Analyser</button>
        <button class="btn primary" (click)="confirm()"
                [disabled]="!canSubmit() || busy() || !preview() || preview()!.newRows === 0">
          Importer {{ preview() ? preview()!.newRows + ' ligne(s)' : '' }}
        </button>
      </div>
    </div>

    @if (error()) {
      <div class="error">{{ error() }}</div>
    }
    @if (done()) {
      <div class="success">
        Import terminé : {{ done()!.imported }} transaction(s) ajoutée(s),
        {{ done()!.duplicates }} doublon(s) ignoré(s).
      </div>
    }

    @if (preview(); as result) {
      <div class="card">
        <h2>Aperçu — {{ result.total }} ligne(s) lue(s)</h2>
        <p class="muted">
          <span class="badge new">{{ result.newRows }} nouvelle(s)</span>&nbsp;
          <span class="badge dup">{{ result.duplicates }} doublon(s)</span>
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie détectée</th>
              <th class="amount">Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            @for (row of result.rows; track $index) {
              <tr>
                <td>{{ row.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ row.label }}</td>
                <td>
                  @if (row.category) {
                    <span class="badge cat">{{ row.category }}</span>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td class="amount" [class.neg]="row.amount < 0" [class.pos]="row.amount > 0">
                  {{ row.amount | currency:'EUR' }}
                </td>
                <td>
                  @if (row.duplicate) {
                    <span class="badge dup">Doublon</span>
                  } @else {
                    <span class="badge new">Nouveau</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
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

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
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
