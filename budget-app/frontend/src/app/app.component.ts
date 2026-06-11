import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <nav class="sidebar">
        <div class="brand">Mes Apps</div>
        <a routerLink="/budget" routerLinkActive="active"><span class="icon">💰</span>Budget</a>
        <a routerLink="/immobilier" routerLinkActive="active"><span class="icon">🏠</span>Immobilier</a>
        <a routerLink="/recettes" routerLinkActive="active"><span class="icon">🍳</span>Recettes</a>
      </nav>
      <router-outlet />
    </div>
  `,
})
export class AppComponent {
  // Injecté ici pour charger le thème dès le démarrage de l'application.
  private readonly settings = inject(SettingsService);
}
