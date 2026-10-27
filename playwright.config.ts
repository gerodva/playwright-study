import { defineConfig, devices } from '@playwright/test';

/**
 * ============================================================================
 * CONFIGURACIÓN CENTRAL DE PLAYWRIGHT (playwright.config.ts)
 * ============================================================================
 * ¿Para qué sirve este archivo?
 * Define cómo se ejecutan las pruebas: tiempos de espera (timeouts), ejecución
 * en paralelo, qué navegadores usar, y qué evidencias recolectar cuando un test falla.
 *
 * NOTA DE SEGURIDAD:
 * - No se escriben contraseñas reales ni tokens privados aquí.
 * - Los reportes y trazas se guardan en carpetas ignoradas por Git (`.gitignore`).
 */
export default defineConfig({
  // Carpeta donde viven todos los archivos de prueba (*.spec.ts)
  testDir: './tests',

  // Ejecuta los tests dentro de cada archivo en paralelo para mayor velocidad
  fullyParallel: true,

  // Seguridad en CI: Falla el build si alguien dejó un `test.only` por accidente en el código
  forbidOnly: !!process.env.CI,

  // Reintentos automáticos: 2 en integración continua (CI) para detectar flakiness, 0 en local
  retries: process.env.CI ? 2 : 0,

  // Número de procesos paralelos (workers)
  workers: process.env.CI ? 2 : undefined,

  // Generadores de reportes:
  // - 'list': muestra el progreso claro en la terminal
  // - 'html': genera un reporte interactivo local (sin abrirse automáticamente en CI)
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Configuración compartida por todas las pruebas
  use: {
    // URL base por defecto (SauceDemo), las demás suites pueden usar su propia URL
    baseURL: process.env.SAUCE_BASE_URL || 'https://www.saucedemo.com',

    // Recolecta una traza completa (DOM, red, consola) en el primer reintento o al fallar
    // Puedes inspeccionarla con: npx playwright show-trace trace.zip
    trace: 'retain-on-failure',

    // Toma captura de pantalla automáticamente SOLO cuando un test falla
    screenshot: 'only-on-failure',

    // Graba video solo si el test falla (ahorra disco y protege privacidad)
    video: 'retain-on-failure',

    // Tiempo máximo por cada acción individual (click, fill, etc.)
    actionTimeout: 15_000,
  },

  // Tiempo máximo total por cada test individual (30 segundos)
  timeout: 30_000,

  // Navegadores donde se ejecutan las pruebas.
  // Por defecto activamos Chromium para ejecuciones rápidas de estudio,
  // pero puedes descomentar Firefox y WebKit cuando quieras probar compatibilidad cruzada.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
