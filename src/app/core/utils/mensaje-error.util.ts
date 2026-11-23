import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../services/i18n.service';
import { formatearEnZonaApi, instanteDeApi } from './zona-horaria.util';

interface ProblemaApi {
  detail?: string;
  codigo?: string;
  parametros?: Record<string, string | number>;
}

const PARAMETROS_DE_FECHA = new Set(['desde']);

export function mensajeDeError(err: unknown, i18n: I18nService): string {
  const problema = (err instanceof HttpErrorResponse ? err.error : (err as { error?: unknown })?.error) as
    | ProblemaApi
    | null
    | undefined;

  if (problema?.codigo) {
    const clave = `ERRORES.${problema.codigo}`;
    const parametros = formatearParametros(problema.parametros ?? {}, i18n);
    const traducido = i18n.translate(clave, parametros);
    if (traducido !== clave) {
      return traducido;
    }
  }

  if (err instanceof HttpErrorResponse && err.status === 403) {
    return i18n.translate('ERRORES.ACCESO_DENEGADO');
  }

  return problema?.detail || i18n.translate('COMMON.ERROR_GENERIC');
}

function formatearParametros(
  parametros: Record<string, string | number>,
  i18n: I18nService
): Record<string, string | number> {
  const locale = i18n.currentLang() === 'es' ? 'es-CR' : 'en-US';
  const resultado: Record<string, string | number> = {};
  for (const [clave, valor] of Object.entries(parametros)) {
    if (PARAMETROS_DE_FECHA.has(clave) && typeof valor === 'string') {
      const instante = instanteDeApi(valor);
      resultado[clave] = Number.isNaN(instante)
        ? valor
        : formatearEnZonaApi(instante, locale, { dateStyle: 'medium', timeStyle: 'short' });
    } else if (clave === 'estado' && typeof valor === 'string') {
      resultado[clave] = i18n.translate(`SESIONES.ESTADO_${valor}`);
    } else if (clave === 'accion' && typeof valor === 'string') {
      resultado[clave] = i18n.translate(`ERRORES.ACCION_${valor.toUpperCase()}`);
    } else {
      resultado[clave] = valor;
    }
  }
  return resultado;
}
