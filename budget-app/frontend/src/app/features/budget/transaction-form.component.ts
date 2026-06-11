import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AccountsService, CategoriesService, TransactionsService } from '../../core/services';
import { toIsoDate } from '../../core/date-utils';

/** Formulaire de création d'une transaction manuelle. */
@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, DatePickerModule, InputNumberModule, InputTextModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Nouvelle transaction</h2>
      <div class="row">
        <div>
          <label>Compte</label>
          <p-select [options]="accountsService.accounts()" optionLabel="name" optionValue="id"
                    placeholder="— Choisir —" [(ngModel)]="draft.accountId" />
        </div>
        <div>
          <label>Date</label>
          <p-datepicker [(ngModel)]="draft.date" dateFormat="dd/mm/yy" styleClass="date-input" />
        </div>
        <div>
          <label>Libellé</label>
          <input pInputText type="text" [(ngModel)]="draft.label" placeholder="Courses..." />
        </div>
        <div>
          <label>Montant (négatif = dépense)</label>
          <p-inputnumber mode="currency" currency="EUR" locale="fr-FR"
                         [(ngModel)]="draft.amount" inputStyleClass="amount-input" />
        </div>
        <div>
          <label>Catégorie</label>
          <p-select [options]="categoryOptions()" optionLabel="name" optionValue="id"
                    [(ngModel)]="draft.categoryId" />
        </div>
        <p-button label="Enregistrer" (onClick)="add()" [disabled]="!draft.accountId || !draft.label" />
      </div>
    </div>
  `,
})
export class TransactionFormComponent {
  readonly accountsService = inject(AccountsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly transactionsService = inject(TransactionsService);

  /** Émis après création réussie, pour que la page recharge la liste. */
  readonly saved = output<void>();

  draft = {
    accountId: '',
    date: new Date(),
    label: '',
    amount: 0,
    categoryId: null as string | null,
  };

  readonly categoryOptions = computed(() => [
    { id: null as string | null, name: 'Automatique' },
    ...this.categoriesService.categories().map((c) => ({ id: c.id as string | null, name: c.name })),
  ]);

  add() {
    this.transactionsService.create({
      ...this.draft,
      date: toIsoDate(this.draft.date),
    }).subscribe(() => {
      this.draft.label = '';
      this.draft.amount = 0;
      this.saved.emit();
    });
  }
}
