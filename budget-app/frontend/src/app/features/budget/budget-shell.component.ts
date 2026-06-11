import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavLink, TopNavComponent } from '../../shared/top-nav.component';

/** Shell de l'app Budget : onglets horizontaux + contenu de la page courante. */
@Component({
  selector: 'app-budget-shell',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-area' },
  template: `
    <app-top-nav [links]="links" />
    <main class="content">
      <router-outlet />
    </main>
  `,
})
export class BudgetShellComponent {
  readonly links: NavLink[] = [
    { label: 'Tableau de bord', path: '/budget' },
    { label: 'Transactions', path: '/budget/transactions' },
    { label: 'Importer', path: '/budget/import' },
    { label: 'Catégories', path: '/budget/categories' },
    { label: 'Abonnements', path: '/budget/abonnements' },
    { label: 'Comptes', path: '/budget/comptes' },
    { label: 'Paramètres', path: '/budget/parametres' },
  ];
}
