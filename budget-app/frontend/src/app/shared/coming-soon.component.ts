import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';

/**
 * Page placeholder pour une app pas encore développée.
 * `appName` et `icon` viennent du `data` de la route (withComponentInputBinding).
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-area' },
  template: `
    <main class="content">
      <p-card class="coming-soon">
        <div class="coming-soon-icon">{{ icon() }}</div>
        <h1>{{ appName() }}</h1>
        <p class="muted">Cette application arrive bientôt.</p>
      </p-card>
    </main>
  `,
})
export class ComingSoonComponent {
  readonly appName = input.required<string>();
  readonly icon = input.required<string>();
}
