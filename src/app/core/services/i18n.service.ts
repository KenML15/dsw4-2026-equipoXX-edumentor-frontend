import { Injectable, signal } from '@angular/core';

export type Lang = 'es' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  es: {
    'AUTH.LOGIN_TITLE': 'Iniciar Sesión',
    'AUTH.REGISTER_TITLE': 'Crear Cuenta',
    'AUTH.CARNE': 'Carné Universitario',
    'AUTH.EMAIL': 'Correo Institucional',
    'AUTH.PASSWORD': 'Contraseña',
    'AUTH.NOMBRE': 'Nombre',
    'AUTH.APELLIDO': 'Apellido',
    'AUTH.ROL': 'Rol en la plataforma',
    'AUTH.ROLE_ESTUDIANTE': 'Estudiante',
    'AUTH.ROLE_TUTOR': 'Tutor',
    'AUTH.ROLE_COORDINADOR': 'Coordinador',
    'AUTH.SUBMIT_LOGIN': 'Ingresar',
    'AUTH.SUBMIT_REGISTER': 'Registrarse',
    'AUTH.NO_ACCOUNT': '¿No tienes cuenta? Regístrate aquí',
    'AUTH.HAS_ACCOUNT': '¿Ya tienes cuenta? Inicia sesión',
    'AUTH.ERR_REQUIRED': 'Este campo es obligatorio',
    'AUTH.ERR_EMAIL': 'Ingresa un correo electrónico válido',
    'AUTH.ERR_MIN_LENGTH': 'Debe tener al menos 6 caracteres',
    'AUTH.ERR_INVALID_CREDENTIALS': 'Correo o contraseña incorrectos'
  },
  en: {
    'AUTH.LOGIN_TITLE': 'Sign In',
    'AUTH.REGISTER_TITLE': 'Create Account',
    'AUTH.CARNE': 'University ID',
    'AUTH.EMAIL': 'Institutional Email',
    'AUTH.PASSWORD': 'Password',
    'AUTH.NOMBRE': 'First Name',
    'AUTH.APELLIDO': 'Last Name',
    'AUTH.ROL': 'Platform Role',
    'AUTH.ROLE_ESTUDIANTE': 'Student',
    'AUTH.ROLE_TUTOR': 'Tutor',
    'AUTH.ROLE_COORDINADOR': 'Coordinator',
    'AUTH.SUBMIT_LOGIN': 'Log In',
    'AUTH.SUBMIT_REGISTER': 'Register',
    'AUTH.NO_ACCOUNT': "Don't have an account? Register here",
    'AUTH.HAS_ACCOUNT': 'Already have an account? Sign in',
    'AUTH.ERR_REQUIRED': 'This field is required',
    'AUTH.ERR_EMAIL': 'Enter a valid email address',
    'AUTH.ERR_MIN_LENGTH': 'Must be at least 6 characters long',
    'AUTH.ERR_INVALID_CREDENTIALS': 'Invalid email or password'
  }
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly currentLang = signal<Lang>('es');

  setLanguage(lang: Lang): void {
    this.currentLang.set(lang);
  }

  toggleLanguage(): void {
    this.currentLang.update(lang => (lang === 'es' ? 'en' : 'es'));
  }

  translate(key: string): string {
    const lang = this.currentLang();
    return TRANSLATIONS[lang][key] ?? key;
  }
}