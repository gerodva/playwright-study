import { type Locator, type Page, expect } from '@playwright/test';

/**
 * ============================================================================
 * PAGE OBJECT MODEL: SauceInventoryPage (pages/SauceInventoryPage.ts)
 * ============================================================================
 * Representa el catálogo de productos, filtros, carrito de compras y checkout
 * de SauceDemo (https://www.saucedemo.com/inventory.html).
 */
export class SauceInventoryPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly sortDropdown: Locator;
  readonly inventoryItems: Locator;
  readonly itemPrices: Locator;
  readonly shoppingCartBadge: Locator;
  readonly shoppingCartLink: Locator;
  readonly burgerMenuButton: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('[data-test="title"]');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.itemPrices = page.locator('[data-test="inventory-item-price"]');
    this.shoppingCartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.shoppingCartLink = page.locator('[data-test="shopping-cart-link"]');
    this.burgerMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutLink = page.locator('[data-test="logout-sidebar-link"]');
  }

  /**
   * Ordena el catálogo usando el selector desplegable (`selectOption`).
   * Valores válidos: 'az' | 'za' | 'lohi' (precio menor a mayor) | 'hilo' (precio mayor a menor)
   */
  async sortBy(optionValue: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(optionValue);
  }

  /**
   * Obtiene todos los precios visibles en pantalla como un arreglo numérico (ej. [7.99, 9.99, 15.99]).
   * Muy útil para verificar matemáticamente que el filtro de precios funciona de verdad.
   */
  async getProductPricesAsNumbers(): Promise<number[]> {
    const rawPrices = await this.itemPrices.allInnerTexts();
    return rawPrices.map((text) => parseFloat(text.replace('$', '')));
  }

  /**
   * Busca una tarjeta de producto por su nombre exacto y pulsa su botón "Add to cart".
   * Demuestra el poder del filtrado de locators (`filter({ hasText })`) en Playwright.
   */
  async addProductToCartByName(productName: string): Promise<void> {
    const productCard = this.inventoryItems.filter({ hasText: productName });
    await productCard.getByRole('button', { name: /add to cart/i }).click();
  }

  /**
   * Busca una tarjeta de producto por su nombre y pulsa su botón "Remove".
   */
  async removeProductFromCartByName(productName: string): Promise<void> {
    const productCard = this.inventoryItems.filter({ hasText: productName });
    await productCard.getByRole('button', { name: /remove/i }).click();
  }

  /**
   * Cierra la sesión actual desde el menú lateral.
   */
  async logout(): Promise<void> {
    await this.burgerMenuButton.click();
    await expect(this.logoutLink).toBeVisible();
    await this.logoutLink.click();
  }
}
