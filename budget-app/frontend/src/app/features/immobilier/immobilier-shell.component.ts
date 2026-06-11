import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavLink, TopNavComponent } from '../../shared/top-nav.component';

/** Shell de l'app Immobilier : onglets horizontaux + contenu de la page courante. */
@Component({
  selector: 'app-immobilier-shell',
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
export class ImmobilierShellComponent {
  readonly links: NavLink[] = [
    { label: 'Projets', path: '/immobilier' },
  ];
}
