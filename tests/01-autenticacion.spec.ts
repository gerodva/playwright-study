import { test, expect } from '@playwright/test';
import { SauceLoginPage } from '../pages/SauceLoginPage';
import { SauceInventoryPage } from '../pages/SauceInventoryPage';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * SUITE 01: AUTENTICACIÓN, CONTROL DE ACCESO Y SESIÓN
 * Sitio de prueba: SauceDemo (https://www.saucedemo.com)
 * ============================================================================
 * ¿Por qué es fundamental esta suite en la vida real?
 * El flujo de autenticación es la puerta de entrada de cualquier aplicación.
 * Si falla el login (falso negativo) ningún usuario puede comprar; si deja pasar
 * usuarios bloqueados o sin sesión (falso positivo), existe una vulnerabilidad
 * crítica de seguridad (Broken Access Control - OWASP Top 10).
 */
test.describe('01 - Autenticación y Seguridad de Acceso (SauceDemo)', () => {
  let loginPage: SauceLoginPage;
  let inventoryPage: SauceInventoryPage;

  // test.beforeEach se ejecuta antes de CADA test individual para garantizar
  // que todas las pruebas empiecen desde un estado limpio e independiente.
  test.beforeEach(async ({ page }) => {
    loginPage = new SauceLoginPage(page);
    inventoryPage = new SauceInventoryPage(page);
    await loginPage.goto();
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 1.1: Inicio de sesión exitoso (Happy Path)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Verifica que un usuario activo puede autenticarse y que
   *   la aplicación redirige correctamente al catálogo cargando los productos.
   * - Conceptos Playwright: `toHaveURL`, `toBeVisible`, `toHaveCount` y POM.
   */
  test('1.1 Debe permitir iniciar sesión con credenciales válidas y mostrar el inventario', async ({ page }) => {
    await loginPage.login(TEST_CONFIG.sauceUsers.standard);

    // 1. Verificamos que la URL cambió a la ruta protegida de inventario
    await expect(page).toHaveURL(/.*inventory\.html/);

    // 2. Verificamos que el título de la sección sea 'Products'
    await expect(inventoryPage.pageTitle).toHaveText('Products');

    // 3. Verificamos que el catálogo cargó los 6 productos reales de la tienda
    await expect(inventoryPage.inventoryItems).toHaveCount(6);
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 1.2: Rechazo de credenciales incorrectas (Negative Testing)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Asegura que la aplicación rechaza contraseñas erróneas,
   *   NO redirige al área privada y muestra un mensaje genérico seguro (que no
   *   revela si el usuario existe o no para evitar enumeración de cuentas).
   * - Conceptos Playwright: Validación de estados de error y permanencia en URL.
   */
  test('1.2 Debe rechazar una contraseña incorrecta y mostrar un mensaje de error claro', async ({ page }) => {
    await loginPage.login(TEST_CONFIG.sauceUsers.standard, 'clave_incorrecta_123');

    // El usuario NO debe haber entrado al inventario
    await expect(page).not.toHaveURL(/.*inventory\.html/);

    // Debe mostrarse el contenedor de error con el mensaje oficial
    await loginPage.expectErrorMessageToContain(
      'Username and password do not match any user in this service'
    );
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 1.3: Prevención de acceso a cuenta bloqueada (Seguridad)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: En sistemas bancarios o e-commerce reales, las cuentas se
   *   bloquean tras múltiples intentos fallidos o sospecha de fraude. Este test
   *   valida que aunque la contraseña sea correcta, el sistema impida el paso
   *   a un usuario marcado como `locked_out_user`.
   */
  test('1.3 Debe impedir el acceso a un usuario bloqueado aunque su contraseña sea válida', async ({ page }) => {
    await loginPage.login(TEST_CONFIG.sauceUsers.lockedOut);

    await expect(page).not.toHaveURL(/.*inventory\.html/);
    await loginPage.expectErrorMessageToContain('Sorry, this user has been locked out.');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 1.4: Cierre de sesión (Logout) y protección de ruta privada
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Verifica que al cerrar sesión el usuario regresa al
   *   login y que si alguien intenta entrar directamente por URL a `/inventory.html`
   *   sin haber iniciado sesión, el sistema le bloquea el paso.
   * - Conceptos Playwright: Navegación directa (`page.goto`) y validación de rutas.
   */
  test('1.4 Debe cerrar sesión correctamente y bloquear el acceso directo sin sesión', async ({ page }) => {
    // Paso 1: Iniciar sesión normalmente
    await loginPage.login(TEST_CONFIG.sauceUsers.standard);
    await expect(page).toHaveURL(/.*inventory\.html/);

    // Paso 2: Cerrar sesión desde el menú lateral
    await inventoryPage.logout();

    // Paso 3: Verificar que volvimos a la pantalla de Login (el botón de login es visible)
    await expect(loginPage.loginButton).toBeVisible();

    // Paso 4 (Prueba de seguridad): Intentar forzar la entrada a /inventory.html por URL
    await page.goto(`${TEST_CONFIG.urls.sauceDemo}/inventory.html`);
    await loginPage.expectErrorMessageToContain(
      "You can only access '/inventory.html' when you are logged in."
    );
  });
});
