import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import esJson from '../../../assets/i18n/es.json';
import enJson from '../../../assets/i18n/en.json';

export type Lang = 'es' | 'en';

type TranslationTree = { [key: string]: string | TranslationTree };

function flattenTranslations(tree: TranslationTree, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flattenTranslations(value, fullKey));
    }
  }
  return result;
}

const DICTIONARIES: Record<Lang, Record<string, string>> = {
  es: flattenTranslations(esJson as TranslationTree),
  en: flattenTranslations(enJson as TranslationTree)
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageKey = 'edumentor_lang';

  readonly currentLang = signal<Lang>(this.loadInitialLang());

  constructor() {
    effect(() => {
      const lang = this.currentLang();
      if (this.isBrowser) {
        localStorage.setItem(this.storageKey, lang);
        this.document.documentElement.lang = lang;
      }
    });
  }

  setLanguage(lang: Lang): void {
    this.currentLang.set(lang);
  }

  toggleLanguage(): void {
    this.currentLang.update(lang => (lang === 'es' ? 'en' : 'es'));
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLang();
    let text = DICTIONARIES[lang][key] ?? key;

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replaceAll(`{{${paramKey}}}`, String(paramValue));
      }
    }

    return text;
  }

  private loadInitialLang(): Lang {
    if (!this.isBrowser) return 'es';
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'en' ? 'en' : 'es';
  }
}
