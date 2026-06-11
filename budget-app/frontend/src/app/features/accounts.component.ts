import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsService } from '../core/services';
import { Account } from '../core/models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>Comptes bancaires</h1>

    <div class="card">
      <h2>Nouveau compte</h2>
      <div class="row">
        <div>
          <label>Nom</label>
          <input type="text" [(ngModel)]="draft.name" placeholder="Livret A..." />
        </div>
        <div>
          <label>Banque (optionnel)</label>
          <input type="text" [(ngModel)]="draft.bank" placeholder="Boursorama..." />
        </div>
        <div>
          <label>Solde initial</label>
          <input type="number" step="0.01" [(ngModel)]="draft.initialBalance" style="width: 130px;" />
        </div>
        <button class="btn primary" (click)="add()" [disabled]="!draft.name">Créer</button>
      </div>
    </div>

    <div class="card">
      @if (accountsService.accounts().length === 0) {
        <div class="empty">Aucun compte.</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Banque</th>
              <th class="amount">Solde initial</th>
              <th class="amount">Solde actuel</th>
              <th>Transactions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (account of accountsService.accounts(); track account.id) {
              <tr>
                <td><input type="text" [ngModel]="account.name" (ngModelChange)="account.name = $event" /></td>
                <td><input type="text" [ngModel]="account.bank ?? ''" (ngModelChange)="account.bank = $event" /></td>
                <td class="amount">
                  <input type="number" step="0.01"
                         [ngModel]="account.initialBalance"
                         (ngModelChange)="account.initialBalance = +$event"
                         style="width: 110px; text-align: right;" />
                </td>
                <td class="amount" [class.neg]="account.balance < 0">{{ account.balance | currency:'EUR' }}</td>
                <td class="muted">{{ account.transactionCount }}</td>
                <td style="white-space: nowrap;">
                  <button class="btn small" (click)="save(account)">Enregistrer</button>
                  <button class="btn small danger" (click)="remove(account)">Supprimer</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
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
