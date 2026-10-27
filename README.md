# 🎭 Playwright Study — Casos Reales, Arquitectura POM y Buenas Prácticas

Repositorio público de estudio y portafolio práctico de automatización de pruebas **End-to-End (E2E)** y **API** con **[Playwright](https://playwright.dev/)** y **TypeScript**, creado por **[@gerodva](https://github.com/gerodva)**.

El objetivo de este proyecto es servir como **manual vivo de referencia**: cada suite y cada test incluye documentación detallada en español explicando **qué caso del mundo real resuelve**, **por qué es crítico en producción** y **qué herramientas de Playwright utiliza**.

---

## 🗺️ Mapa de Estudio: ¿Qué hace cada Suite de Pruebas?

| Archivo de Prueba | Sitio de Práctica | ¿Qué casos reales cubre? | Conceptos Playwright que aprenderás |
| :--- | :--- | :--- | :--- |
| [`tests/01-autenticacion.spec.ts`](./tests/01-autenticacion.spec.ts) | [SauceDemo](https://www.saucedemo.com) | Login exitoso, credenciales inválidas, bloqueo de usuarios (`locked_out_user`), Logout y protección de rutas privadas. | Patrón **Page Object Model (POM)**, `toHaveURL`, `toBeVisible`, `beforeEach`. |
| [`tests/02-ecommerce-carrito.spec.ts`](./tests/02-ecommerce-carrito.spec.ts) | [SauceDemo](https://www.saucedemo.com) | Ordenamiento matemático de catálogo por precios, agregar/quitar productos del carrito y flujo completo de Checkout + validación de impuestos. | `selectOption`, `locator.filter({ hasText })`, `allInnerTexts`, `test.step`. |
| [`tests/03-estado-y-dom.spec.ts`](./tests/03-estado-y-dom.spec.ts) | [Playwright TodoMVC](https://demo.playwright.dev/todomvc) | Creación de tareas con teclado (`Enter`), filtros reactivos (`Active`/`Completed`) y persistencia tras recargar página (`F5`). | `getByPlaceholder`, `press('Enter')`, `page.evaluate()` (`localStorage`), `page.reload()`. |
| [`tests/04-red-y-api-mocking.spec.ts`](./tests/04-red-y-api-mocking.spec.ts) | [Playwright API Mocking](https://demo.playwright.dev/api-mocking) | Interceptar APIs REST para inyectar datos simulados (Mocks), modificar respuestas reales al vuelo y validar estatus HTTP 200 directo. | `page.route()`, `route.fulfill()`, `route.fetch()`, fixture `request`. |
| [`tests/05-ui-avanzada.spec.ts`](./tests/05-ui-avanzada.spec.ts) | [The Internet](https://the-internet.herokuapp.com) | Manejo de alertas/confirmaciones nativas de JS (`window.confirm`), esperas inteligentes ante spinners asíncronos y checkboxes. | `page.once('dialog')`, Auto-Waiting con `toBeVisible({ timeout })`, `check()` / `uncheck()`. |

> 📖 **¿Quieres profundizar aún más?** Consulta la **[Guía Detallada de Estudio (`docs/GUIA_DE_ESTUDIO.md`)](./docs/GUIA_DE_ESTUDIO.md)** donde se desglosa la anatomía de cada test, la jerarquía de selectores recomendados y el uso del Trace Viewer.

---

## 🏗️ Estructura del Proyecto

```text
playwright-study/
├── docs/
│   ├── GUIA_DE_ESTUDIO.md         # Manual teórico-práctico de cada test y conceptos clave
│   └── ci-playwright-workflow.yml # Plantilla lista de CI/CD para GitHub Actions con hardening
├── pages/                         # Capa Page Object Model (POM)
│   ├── SauceLoginPage.ts       # Selectores y acciones de Login
│   ├── SauceInventoryPage.ts   # Selectores y acciones de Catálogo y Carrito
│   └── TodoPage.ts             # Selectores y acciones de TodoMVC
├── tests/                      # Suites de pruebas documentadas paso a paso
│   ├── 01-autenticacion.spec.ts
│   ├── 02-ecommerce-carrito.spec.ts
│   ├── 03-estado-y-dom.spec.ts
│   ├── 04-red-y-api-mocking.spec.ts
│   └── 05-ui-avanzada.spec.ts
├── utils/
│   └── testData.ts             # Configuración centralizada y lectura segura de entorno
├── .env.example                # Plantilla segura de variables de entorno
├── .gitignore                  # Protección contra subida de secretos, trazas y sesiones
├── package.json
├── playwright.config.ts        # Configuración central de Playwright
└── tsconfig.json
```

---

## 🚀 Instalación y Ejecución Rápida

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/gerodva/playwright-study.git
cd playwright-study
npm install
```

### 2. Instalar el navegador Chromium de Playwright
```bash
npx playwright install chromium
```

### 3. Ejecutar las pruebas
```bash
# Ejecutar todas las suites en modo headless (rápido en terminal)
npm test

# Recomendado para estudiar: abrir la interfaz visual interactiva (UI Mode)
npm run test:ui

# Ejecutar viendo el navegador abrirse en tiempo real
npm run test:headed

# Ejecutar paso a paso con el inspector de depuración (Debug Mode)
npm run test:debug
```

### 4. Ejecutar una suite específica de estudio
```bash
npm run test:auth         # Suite 01: Autenticación y seguridad de acceso
npm run test:ecommerce    # Suite 02: Catálogo, filtros, carrito y checkout
npm run test:dom          # Suite 03: Manipulación del DOM y localStorage
npm run test:network      # Suite 04: Intercepción de red y API Mocking
npm run test:ui-avanzada  # Suite 05: Diálogos JS, cargas dinámicas y checkboxes
```

---

## 🔒 Medidas de Seguridad Implementadas en este Repositorio

Al ser un repositorio público, sigue buenas prácticas de seguridad (**DevSecOps**):

1. **Cero Secretos en Código Fuente**: Las URLs y usuarios se parametrizan mediante variables de entorno (`process.env`) documentadas en [`.env.example`](./.env.example). Los archivos `.env` locales están bloqueados en [`.gitignore`](./.gitignore).
2. **Exclusión de Artefactos de Sesión y Trazas**: Carpetas como `playwright-report/`, `test-results/` y `playwright/.auth/` están excluidas de Git para evitar publicar por accidente cookies de sesión, tokens JWT o capturas de pantalla.
3. **GitHub Actions con Principio de Menor Privilegio**: Se incluye la plantilla de flujo de CI ([`docs/ci-playwright-workflow.yml`](./docs/ci-playwright-workflow.yml)) que declara explícitamente `permissions: contents: read` y ejecuta `npm audit --audit-level=high` en cada ejecución.
4. **Privacidad de Identidad en Commits**: Configurado para utilizar el correo `noreply` de GitHub, evitando exponer direcciones de correo personales en el historial público de Git.
