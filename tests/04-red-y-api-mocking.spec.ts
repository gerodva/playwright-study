import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * SUITE 04: INTERCEPCIÓN DE RED, API MOCKING Y RESILIENCIA ANTE ERRORES 500
 * ============================================================================
 * ¿Por qué esta es una de las habilidades más buscadas en QA Automation?
 * En proyectos reales:
 * 1. A veces el backend aún no está listo o es inestable en QA, pero necesitas
 *    probar cómo reacciona el frontend (API Mocking con `page.route`).
 * 2. ¿Cómo pruebas qué muestra tu web cuando el servidor de pagos devuelve un
 *    Error 500 o tarda 4 segundos? No puedes tumbar el servidor real, pero con
 *    Playwright puedes simular el Error 500 en 3 líneas de código.
 * 3. También puedes probar endpoints REST directamente sin abrir un navegador (`request`).
 */
test.describe('04 - Intercepción de Red, API Mocking y Pruebas de API', () => {
  /**
   * --------------------------------------------------------------------------
   * TEST 4.1: API Mocking — Inyectar datos personalizados en una respuesta HTTP
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Intercepta una llamada de red antes de que llegue al
   *   servidor y devuelve un JSON controlado por el test. Así garantizas datos
   *   100% predecibles.
   * - Conceptos Playwright: `page.route()`, `route.fulfill()`.
   */
  test('4.1 Debe interceptar una petición de API y renderizar datos simulados (Mock)', async ({ page }) => {
    // Interceptamos cualquier llamada a la API de frutas de la demo oficial de Playwright
    await page.route('*/**/api/v1/fruits', async (route) => {
      const datosSimulados = [
        { name: 'Mango de Chiapas (Mock)', id: 101 },
        { name: 'Aguacate Hass (Mock)', id: 102 },
        { name: 'Guayaba Rosa (Mock)', id: 103 },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(datosSimulados),
      });
    });

    // Abrimos la aplicación oficial de mocking de Playwright
    await page.goto('https://demo.playwright.dev/api-mocking');

    // Verificamos que la interfaz pintó nuestros 3 productos simulados en vez de los reales
    await expect(page.getByText('Mango de Chiapas (Mock)')).toBeVisible();
    await expect(page.getByText('Aguacate Hass (Mock)')).toBeVisible();
    await expect(page.getByText('Guayaba Rosa (Mock)')).toBeVisible();
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 4.2: Modificar una respuesta real del servidor al vuelo (`route.fetch`)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: En vez de reemplazar toda la respuesta, dejamos que la
   *   petición vaya al servidor real, tomamos el JSON original y le agregamos
   *   un elemento extra al principio para probar casos borde (ej. un nombre muy largo).
   * - Conceptos Playwright: `route.fetch()` + `route.fulfill({ json })`.
   */
  test('4.2 Debe interceptar la API real, conservar sus datos e inyectar un registro adicional', async ({ page }) => {
    await page.route('*/**/api/v1/fruits', async (route) => {
      const response = await route.fetch();
      const jsonOriginal = await response.json();

      // Agregamos un ítem de prueba al inicio de la respuesta real del servidor
      jsonOriginal.unshift({ name: 'Fruta Inyectada en Tiempo Real', id: 999 });

      await route.fulfill({ response, json: jsonOriginal });
    });

    await page.goto('https://demo.playwright.dev/api-mocking');

    // Tanto nuestro ítem inyectado como los ítems reales ('Strawberry') deben estar visibles
    await expect(page.getByText('Fruta Inyectada en Tiempo Real')).toBeVisible();
    await expect(page.getByText('Strawberry')).toBeVisible();
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 4.3: Prueba directa de contrato y estado HTTP con `request` (API Testing)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Verifica que el servidor web responde con código HTTP 200
   *   y cabeceras de seguridad/contenido válidas sin necesidad de renderizar UI.
   *   En la industria se usa para Smoke Tests ultrarrápidos antes de correr E2E.
   * - Conceptos Playwright: Fixture `request` para pruebas de integración/API.
   */
  test('4.3 Debe verificar disponibilidad HTTP 200 y cabeceras mediante API Request directa', async ({ request }) => {
    const response = await request.get(TEST_CONFIG.urls.sauceDemo);

    // Validamos que el servidor responda con código 200 OK
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Validamos que el tipo de contenido devuelto sea HTML válido
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 4.4: Simulación de caída de Backend (Error HTTP 500)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: En la vida real es casi imposible "forzar" a que un
   *   servidor de QA falle con un error 500 justo cuando quieres probar cómo
   *   reacciona tu aplicación web. Con `route.fulfill({ status: 500 })` puedes
   *   simular fallos del servidor de forma segura y verificar que la app no se
   *   rompa con una pantalla en blanco no controlada.
   * - Conceptos Playwright: Simulación de errores HTTP y `page.waitForResponse`.
   */
  test('4.4 Debe simular un Error 500 en la API y verificar que la aplicación no colapse', async ({ page }) => {
    await page.route('*/**/api/v1/fruits', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error simulado por Playwright' }),
      });
    });

    // Escuchamos la respuesta de red para comprobar que el navegador recibió el 500
    const responsePromise = page.waitForResponse('*/**/api/v1/fruits');
    await page.goto('https://demo.playwright.dev/api-mocking');
    const response = await responsePromise;

    expect(response.status()).toBe(500);
    // Verificamos que el documento principal sigue activo y no renderizó ítems corruptos
    await expect(page.locator('li')).toHaveCount(0);
  });
});
