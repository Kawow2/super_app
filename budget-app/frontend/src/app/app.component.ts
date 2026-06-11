import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <nav class="sidebar">
        <div class="brand">Mon Budget</div>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
        <a routerLink="/transactions" routerLinkActive="active">Transactions</a>
        <a routerLink="/import" routerLinkActive="active">Importer</a>
        <a routerLink="/categories" routerLinkActive="active">Catégories</a>
        <a routerLink="/abonnements" routerLinkActive="active">Abonnements</a>
        <a routerLink="/comptes" routerLinkActive="active">Comptes</a>
        <a routerLink="/parametres" routerLinkActive="active">Paramètres</a>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  // Injecté ici pour charger le thème dès le démarrage de l'application.
  private readonly settings = inject(SettingsService);
}
