import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TabsModule } from 'primeng/tabs';

export interface NavLink {
  label: string;
  path: string;
}

/**
 * Barre de navigation horizontale d'une app : onglets PrimeNG pilotés par le routeur.
 */
@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [TabsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tabs [value]="currentPath()" class="topnav">
      <p-tablist>
        @for (link of links(); track link.path) {
          <p-tab [value]="link.path" [routerLink]="link.path">{{ link.label }}</p-tab>
        }
      </p-tablist>
    </p-tabs>
  `,
})
export class TopNavComponent {
  private readonly router = inject(Router);

  readonly links = input.required<NavLink[]>();

  /** URL courante sans query params, pour marquer l'onglet actif. */
  readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );
}
