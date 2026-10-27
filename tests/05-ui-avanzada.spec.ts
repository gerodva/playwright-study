import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * SUITE 05: INTERACCIONES DE UI AVANZADAS (DIÁLOGOS, CARGA ASÍNCRONA Y CONTROLES)
 * Sitio de prueba: The Internet - Herokuapp (https://the-internet.herokuapp.com)
 * ============================================================================
 * ¿Para qué sirve esta suite en un proyecto real?
 * En aplicaciones empresariales te encontrarás con retos clásicos donde muchos
 * principiantes fallan:
 * - Alertas o confirmaciones nativas de JavaScript (`window.confirm`) que congelan la página.
 * - Elementos que tardan varios segundos en aparecer tras un spinner de carga
 *   (donde NUNCA debes usar `waitForTimeout(5000)`, sino esperas inteligentes).
 * - Checkboxes y listas desplegables dinámicas.
 */
test.describe('05 - UI Avanzada: Diálogos Nativos, Carga Dinámica y Controles', () => {
  /**
   * --------------------------------------------------------------------------
   * TEST 5.1: Manejo de Alertas y Confirmaciones nativas (`window.confirm`)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Muchos sistemas muestran un "¿Estás seguro de eliminar
   *   este registro?" usando un diálogo nativo del navegador. Este test enseña
   *   cómo escuchar el evento `dialog`, validar su mensaje y aceptarlo.
   * - Conceptos Playwright: `page.once('dialog', ...)` y `dialog.accept()`.
   */
  test('5.1 Debe interceptar y aceptar un diálogo nativo de confirmación JavaScript', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.urls.theInternet}/javascript_alerts`);

    // Configuramos el listener ANTES de hacer clic en el botón que dispara la alerta
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('I am a JS Confirm');
      await dialog.accept(); // Equivale a pulsar "Aceptar / OK"
    });

    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();

    // Verificamos que la página registró nuestra confirmación
    await expect(page.locator('#result')).toHaveText('You clicked: Ok');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 5.2: Esperas inteligentes ante cargas asíncronas (Spinners / Lazy Loading)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Cuando pulsas "Start", aparece una barra de carga durante
   *   ~5 segundos y luego se renderiza "Hello World!". Aquí demostramos cómo
   *   usar `toBeVisible({ timeout })` en lugar del anti-patrón `waitForTimeout`.
   * - ¿Por qué es mejor?: Si el servidor responde en 1 segundo, el test continúa
   *   al instante; si tarda 6 segundos, espera lo necesario sin fallar en falso.
   */
  test('5.2 Debe esperar inteligentemente a que termine una carga asíncrona sin usar sleeps fijos', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.urls.theInternet}/dynamic_loading/2`);

    await page.getByRole('button', { name: 'Start' }).click();

    // El elemento #finish se crea en el DOM después de que termina el loader
    const finishHeading = page.locator('#finish h4');
    await expect(finishHeading).toBeVisible({ timeout: 15_000 });
    await expect(finishHeading).toHaveText('Hello World!');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 5.3: Manipulación y aserción de Checkboxes (`check` / `uncheck`)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Valida el estado inicial de casillas de verificación
   *   (ej. "Acepto términos y condiciones") y asegura que `check()` y `uncheck()`
   *   son idempotentes (si ya estaba marcado, `check()` no lo desmarca por error).
   * - Conceptos Playwright: `toBeChecked()`, `not.toBeChecked()`, `check()`, `uncheck()`.
   */
  test('5.3 Debe marcar y desmarcar checkboxes verificando su estado accesible', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.urls.theInternet}/checkboxes`);

    const checkboxes = page.getByRole('checkbox');
    const firstCheckbox = checkboxes.nth(0);
    const secondCheckbox = checkboxes.nth(1);

    // Estado inicial en esta página: el 1º viene desmarcado y el 2º viene marcado
    await expect(firstCheckbox).not.toBeChecked();
    await expect(secondCheckbox).toBeChecked();

    // Marcamos el primero y desmarcamos el segundo
    await firstCheckbox.check();
    await secondCheckbox.uncheck();

    // Verificamos que los estados se invirtieron correctamente
    await expect(firstCheckbox).toBeChecked();
    await expect(secondCheckbox).not.toBeChecked();
  });
});
