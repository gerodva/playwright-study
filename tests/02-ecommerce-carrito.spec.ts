import { test, expect } from '@playwright/test';
import { SauceLoginPage } from '../pages/SauceLoginPage';
import { SauceInventoryPage } from '../pages/SauceInventoryPage';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * SUITE 02: E-COMMERCE, FILTROS DE CATÁLOGO Y FLUJO DE CHECKOUT
 * Sitio de prueba: SauceDemo (https://www.saucedemo.com)
 * ============================================================================
 * ¿Para qué sirve esta suite en un proyecto real?
 * En cualquier tienda en línea, el flujo crítico de ingresos ("Money Path")
 * consiste en buscar/ordenar productos, agregarlos al carrito y completar
 * el pago. Un error en este flujo significa pérdida directa de ventas.
 */
test.describe('02 - Flujo Real de E-Commerce: Catálogo, Carrito y Checkout', () => {
  let loginPage: SauceLoginPage;
  let inventoryPage: SauceInventoryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new SauceLoginPage(page);
    inventoryPage = new SauceInventoryPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_CONFIG.sauceUsers.standard);
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 2.1: Ordenamiento matemático de productos por precio
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Muchas veces un test básico solo verifica que el dropdown
   *   cambió de texto, pero no comprueba si los productos realmente se ordenaron.
   *   Aquí extraemos todos los precios del DOM, los convertimos a números y
   *   comprobamos que estén ordenados de menor a mayor.
   * - Conceptos Playwright: `selectOption`, `allInnerTexts` y aserciones de arrays.
   */
  test('2.1 Debe ordenar los productos por precio de menor a mayor (Low to High) correctamente', async () => {
    // Seleccionamos la opción 'lohi' (Price: low to high)
    await inventoryPage.sortBy('lohi');

    // Obtenemos los precios mostrados en la interfaz como arreglo numérico
    const pricesInUi = await inventoryPage.getProductPricesAsNumbers();

    // Creamos una copia ordenada matemáticamente para comparar
    const sortedPrices = [...pricesInUi].sort((a, b) => a - b);

    // Validamos que el orden en pantalla coincida exactamente con el orden matemático
    expect(pricesInUi).toEqual(sortedPrices);
    expect(pricesInUi[0]).toBeLessThanOrEqual(pricesInUi[pricesInUi.length - 1]);
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 2.2: Gestión dinámica del carrito (Agregar y Quitar productos)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Comprueba que el contador del carrito (badge) se actualiza
   *   reactivamente al añadir y quitar artículos desde el catálogo.
   * - Conceptos Playwright: `locator.filter({ hasText })` para localizar botones
   *   dentro de una tarjeta específica sin usar XPaths frágiles.
   */
  test('2.2 Debe actualizar el contador del carrito al agregar y eliminar productos', async () => {
    // Al inicio el badge del carrito no debe existir porque hay 0 productos
    await expect(inventoryPage.shoppingCartBadge).toBeHidden();

    // Agregamos 2 productos específicos por nombre
    await inventoryPage.addProductToCartByName('Sauce Labs Backpack');
    await expect(inventoryPage.shoppingCartBadge).toHaveText('1');

    await inventoryPage.addProductToCartByName('Sauce Labs Bike Light');
    await expect(inventoryPage.shoppingCartBadge).toHaveText('2');

    // Quitamos 1 producto y validamos que el contador baje a 1
    await inventoryPage.removeProductFromCartByName('Sauce Labs Backpack');
    await expect(inventoryPage.shoppingCartBadge).toHaveText('1');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 2.3: Compra End-to-End completa (Checkout + Validación de Impuestos)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Simula el viaje completo de un comprador real desde que
   *   elige productos hasta que recibe la confirmación de su orden, verificando
   *   además que la suma de Subtotal + Impuesto = Total sea exacta.
   * - Conceptos Playwright: `test.step` para documentar fases dentro del reporte HTML.
   */
  test('2.3 Debe completar el flujo End-to-End de compra y calcular el total con impuestos', async ({ page }) => {
    await test.step('1. Agregar productos al carrito e ir al resumen', async () => {
      await inventoryPage.addProductToCartByName('Sauce Labs Backpack'); // $29.99
      await inventoryPage.addProductToCartByName('Sauce Labs Onesie');   // $7.99
      await inventoryPage.shoppingCartLink.click();
      await expect(page).toHaveURL(/.*cart\.html/);
    });

    await test.step('2. Iniciar Checkout y completar datos de envío', async () => {
      await page.locator('[data-test="checkout"]').click();
      await page.locator('[data-test="firstName"]').fill('Gerardo');
      await page.locator('[data-test="lastName"]').fill('QA');
      await page.locator('[data-test="postalCode"]').fill('06600');
      await page.locator('[data-test="continue"]').click();
    });

    await test.step('3. Verificar cálculo matemático de Subtotal + Impuestos = Total', async () => {
      const subtotalText = await page.locator('[data-test="subtotal-label"]').innerText();
      const taxText = await page.locator('[data-test="tax-label"]').innerText();
      const totalText = await page.locator('[data-test="total-label"]').innerText();

      const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
      const tax = parseFloat(taxText.replace(/[^0-9.]/g, ''));
      const total = parseFloat(totalText.replace(/[^0-9.]/g, ''));

      // $29.99 + $7.99 = $37.98
      expect(subtotal).toBeCloseTo(37.98, 2);
      // Verificamos que Subtotal + Tax sea igual al Total cobrado
      expect(subtotal + tax).toBeCloseTo(total, 2);
    });

    await test.step('4. Finalizar compra y verificar confirmación de pedido', async () => {
      await page.locator('[data-test="finish"]').click();
      await expect(page).toHaveURL(/.*checkout-complete\.html/);
      await expect(page.locator('[data-test="complete-header"]')).toHaveText(
        'Thank you for your order!'
      );
    });
  });
});
