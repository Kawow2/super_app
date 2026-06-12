import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavLink, TopNavComponent } from '../../shared/top-nav.component';

/** Shell de l'app Recettes : onglets horizontaux + contenu de la page courante. */
@Component({
  selector: 'app-recettes-shell',
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
export class RecettesShellComponent {
  readonly links: NavLink[] = [
    { label: 'Planning', path: '/recettes' },
    { label: 'Repas', path: '/recettes/repas' },
    { label: 'Liste de courses', path: '/recettes/courses' },
  ];
}
