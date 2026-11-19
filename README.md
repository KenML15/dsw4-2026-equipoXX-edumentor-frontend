### 2. `README.md` para el Frontend
Guárdalo en la raíz de `dsw4-2026-equipoXX-edumentor-frontend`:

```markdown
# EduMentor Hub - Frontend SPA

Aplicación Single Page Application (SPA) desarrollada en Angular Standalone para la plataforma **EduMentor Hub** (IF0009 - Desarrollo de Software IV, Universidad de Costa Rica, Recinto de Paraíso).

## Tecnologías Utilizadas
- **Framework:** Angular (Standalone Components, Signals, Reactive Forms tipados)
- **Lenguaje y Estilos:** TypeScript y CSS3
- **Seguridad en Cliente:** Interceptores HTTP funcionales (`HttpInterceptorFn`) y Guardas de Ruta (`CanActivateFn`)
- **Internacionalización (i18n):** Cambio dinámico entre Español (`ES`) e Inglés (`EN`)
- **Accesibilidad:** Diseñado siguiendo pautas WCAG para cumplir puntuación Lighthouse $\ge 90$

## Requisitos Previos
- Node.js 20+ y npm
- Angular CLI (`npm install -g @angular/cli`)

## Instrucciones de Ejecución Local

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone <URL_DEL_REPOSITORIO_FRONTEND>
   cd dsw4-2026-equipoXX-edumentor-frontend
   npm install