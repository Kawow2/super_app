import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccountsService } from '../../core/services';
import { Account } from '../../core/models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, InputTextModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Comptes bancaires</h1>

    <div class="card">
      <h2>Nouveau compte</h2>
      <div class="row">
        <div>
          <label>Nom</label>
          <input pInputText type="text" [(ngModel)]="draft.name" placeholder="Livret A..." />
        </div>
        <div>
          <label>Banque (optionnel)</label>
          <input pInputText type="text" [(ngModel)]="draft.bank" placeholder="Boursorama..." />
        </div>
        <div>
          <label>Solde initial</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR"
                         [(ngModel)]="draft.initialBalance" inputStyleClass="amount-input" />
        </div>
        <p-button label="Créer" (onClick)="add()" [disabled]="!draft.name" />
      </div>
    </div>

    <div class="card">
      @if (accountsService.accounts().length === 0) {
        <div class="empty">Aucun compte.</div>
      } @else {
        <p-table [value]="accountsService.accounts()" dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Nom</th>
              <th>Banque</th>
              <th class="amount">Solde initial</th>
              <th class="amount">Solde actuel</th>
              <th>Transactions</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-account>
            <tr>
              <td><input pInputText type="text" [ngModel]="account.name" (ngModelChange)="account.name = $event" /></td>
              <td><input pInputText type="text" [ngModel]="account.bank ?? ''" (ngModelChange)="account.bank = $event" /></td>
              <td class="amount">
                <p-inputnumber mode="currency" currency="EUR" locale="fr-FR"
                               [ngModel]="account.initialBalance"
                               (ngModelChange)="account.initialBalance = $event ?? 0"
                               inputStyleClass="amount-input" />
              </td>
              <td class="amount" [class.neg]="account.balance < 0">{{ account.balance | currency:'EUR' }}</td>
              <td class="muted">{{ account.transactionCount }}</td>
              <td style="white-space: nowrap;">
                <p-button label="Enregistrer" size="small" [outlined]="true" (onClick)="save(account)" />
                <p-button label="Supprimer" size="small" severity="danger" [text]="true" (onClick)="remove(account)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class AccountsComponent {
  readonly accountsService = inject(AccountsService);

  draft = { name: '', bank: '', initialBalance: 0 };

  add() {
    this.accountsService.create({
      name: this.draft.name,
      bank: this.draft.bank || null,
      initialBalance: this.draft.initialBalance,
    }).subscribe(() => {
      this.draft = { name: '', bank: '', initialBalance: 0 };
      this.accountsService.refresh();
    });
  }

  save(account: Account) {
    this.accountsService.update(account.id, {
      name: account.name,
      bank: account.bank || null,
      initialBalance: Number(account.initialBalance),
    }).subscribe(() => this.accountsService.refresh());
  }

  remove(account: Account) {
    if (!confirm('Supprimer le compte "' + account.name + '" et TOUTES ses transactions (' + account.transactionCount + ') ?')) return;
    this.accountsService.remove(account.id)
      .subscribe(() => this.accountsService.refresh());
  }
}
