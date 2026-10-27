import { type Locator, type Page, expect } from '@playwright/test';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * PAGE OBJECT MODEL: SauceLoginPage (pages/SauceLoginPage.ts)
 * ============================================================================
 * ¿Qué es el patrón Page Object Model (POM) y para qué sirve?
 * - Separa el "¿CÓMO interactúo con la pantalla?" (selectores y clicks)
 *   del "¿QUÉ quiero validar en mi prueba?" (lógica del test).
 * - Si mañana el equipo de frontend cambia el ID del botón de login,
 *   solo lo actualizas en ESTE archivo y tus 50 tests siguen funcionando.
 */
export class SauceLoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Usamos atributos dedicados a pruebas (`data-test`) que son inmunes a cambios de estilos CSS
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  /**
   * Navega a la página de inicio de sesión de SauceDemo.
   */
  async goto(): Promise<void> {
    await this.page.goto(TEST_CONFIG.urls.sauceDemo);
  }

  /**
   * Completa el formulario de login y envía las credenciales.
   */
  async login(username: string, password: string = TEST_CONFIG.sauceUsers.password): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Verifica que se muestre un mensaje de error específico en el formulario.
   */
  async expectErrorMessageToContain(expectedText: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedText);
  }
}
