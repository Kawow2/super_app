import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AccountsService, CategoriesService } from '../../core/services';

/** Barre de filtres de la liste des transactions (état partagé avec la page via model()). */
@Component({
  selector: 'app-transaction-filters',
  standalone: true,
  imports: [FormsModule, ButtonModule, DatePickerModule, InputNumberModule, InputTextModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="toolbar" style="margin-bottom: 0;">
        <div>
          <label>Compte</label>
          <p-select [options]="accountOptions()" optionLabel="name" optionValue="id"
                    [ngModel]="accountId()" (ngModelChange)="accountId.set($event)" />
        </div>
        <div>
          <label>Catégorie</label>
          <p-select [options]="categoryOptions()" optionLabel="name" optionValue="id"
                    [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" />
        </div>
        <div>
          <label>Du</label>
          <p-datepicker [ngModel]="from()" (ngModelChange)="from.set($event)"
                        dateFormat="dd/mm/yy" [showClear]="true" styleClass="date-input" />
        </div>
        <div>
          <label>Au</label>
          <p-datepicker [ngModel]="to()" (ngModelChange)="to.set($event)"
                        dateFormat="dd/mm/yy" [showClear]="true" styleClass="date-input" />
        </div>
        <div>
          <label>Montant min (€)</label>
          <p-inputnumber mode="decimal" [maxFractionDigits]="2" [min]="0" placeholder="0"
                         [ngModel]="minAmount()" (ngModelChange)="minAmount.set($event)"
                         inputStyleClass="amount-input" />
        </div>
        <div>
          <label>Montant max (€)</label>
          <p-inputnumber mode="decimal" [maxFractionDigits]="2" [min]="0" placeholder="∞"
                         [ngModel]="maxAmount()" (ngModelChange)="maxAmount.set($event)"
                         inputStyleClass="amount-input" />
        </div>
        <div>
          <label>Libellé</label>
          <input pInputText type="text" placeholder="Rechercher..."
                 [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </div>
        <p-button label="Réinitialiser" size="small" [outlined]="true" (onClick)="reset()" />
        <div class="spacer"></div>
        <p-button [label]="showAdd() ? 'Fermer' : '+ Ajouter'" (onClick)="showAdd.set(!showAdd())" />
      </div>
    </div>
  `,
})
export class TransactionFiltersComponent {
  private readonly accountsService = inject(AccountsService);
  private readonly categoriesService = inject(CategoriesService);

  readonly accountId = model('');
  readonly categoryFilter = model('');   // '' = toutes, 'none' = non catégorisé, sinon id
  readonly from = model<Date | null>(null);
  readonly to = model<Date | null>(null);
  readonly search = model('');
  readonly minAmount = model<number | null>(null);
  readonly maxAmount = model<number | null>(null);
  readonly showAdd = model(false);

  readonly accountOptions = computed(() => [
    { id: '', name: 'Tous' },
    ...this.accountsService.accounts().map((a) => ({ id: a.id, name: a.name })),
  ]);

  readonly categoryOptions = computed(() => [
    { id: '', name: 'Toutes' },
    { id: 'none', name: 'Non catégorisé' },
    ...this.categoriesService.categories().map((c) => ({ id: c.id, name: c.name })),
  ]);

  reset() {
    this.accountId.set('');
    this.categoryFilter.set('');
    this.from.set(null);
    this.to.set(null);
    this.search.set('');
    this.minAmount.set(null);
    this.maxAmount.set(null);
  }
}
