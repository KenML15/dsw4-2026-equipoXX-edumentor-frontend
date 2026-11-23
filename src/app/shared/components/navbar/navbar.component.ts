import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly mobileMenuOpen = signal(false);

  readonly canManageAvailability = computed(() =>
    this.auth.hasRole(['TUTOR', 'COORDINADOR'])
  );

  readonly roleTranslationKey = computed(() => {
    const rol = this.auth.userRole();
    return rol ? `AUTH.ROLE_${rol}` : '';
  });

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.auth.logout();
  }
}
