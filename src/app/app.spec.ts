import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { I18nService } from './core/services/i18n.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navbar brand and switch language dynamically', () => {
    const fixture = TestBed.createComponent(App);
    const i18n = TestBed.inject(I18nService);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-text')?.textContent?.trim()).toBe('EduMentor Hub');
    expect(i18n.currentLang()).toBe('es');

    i18n.toggleLanguage();
    fixture.detectChanges();
    expect(i18n.currentLang()).toBe('en');
  });
});
