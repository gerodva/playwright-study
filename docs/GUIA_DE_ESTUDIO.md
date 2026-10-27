# 📘 Guía de Estudio de Playwright: Conceptos y Casos Reales

Esta guía acompaña al código del repositorio para explicar **el porqué** detrás de cada decisión técnica.

---

## 1. ¿Cómo elegir el mejor Selector (Locator) en Playwright?

Uno de los mayores problemas en automatización tradicional (Selenium antiguo) eran los tests frágiles ("flaky tests") que se rompían cuando un diseñador cambiaba una clase CSS o movía un `<div>`.

Playwright resuelve esto con **Locators orientados al usuario y a contratos de prueba**. En este repositorio los usamos siguiendo esta prioridad:

1. **`page.getByRole()` (Prioridad #1 - Accesibilidad)**:
   - *Ejemplo en `SauceInventoryPage.ts`*: `page.getByRole('button', { name: 'Open Menu' })`
   - *¿Por qué usarlo?*: Busca los elementos igual que lo hace un usuario real o un lector de pantalla. Si un botón deja de ser accesible, el test te avisa.
2. **`page.getByTestId()` / `page.locator('[data-test="..."]')` (Prioridad #2 - Contrato QA)**:
   - *Ejemplo en `SauceLoginPage.ts`*: `page.locator('[data-test="username"]')`
   - *¿Por qué usarlo?*: Es un atributo exclusivo para pruebas. Aunque cambien el texto del idioma o el diseño CSS, el `data-test` permanece intacto.
3. **`page.getByPlaceholder()` / `page.getByText()`**:
   - *Ejemplo en `TodoPage.ts`*: `page.getByPlaceholder('What needs to be done?')`
   - *¿Por qué usarlo?*: Muy claro para inputs de búsqueda o validación de textos visibles.

---

## 2. ¿Por qué NO usamos `waitForTimeout(5000)`? (Auto-Waiting y Web-First Assertions)

En muchos cursos antiguos verás líneas como `await page.waitForTimeout(5000)` (dormir el test 5 segundos). **Eso es un anti-patrón**:
- Si la página carga en 0.5 segundos, pierdes 4.5 segundos en cada test.
- Si un día el servidor de pruebas tarda 5.2 segundos, tu test falla aunque la app funcione.

### La solución usada en este repositorio (`tests/05-ui-avanzada.spec.ts`):
```ts
const finishHeading = page.locator('#finish h4');
await expect(finishHeading).toBeVisible({ timeout: 15_000 });
```
Con las **Web-First Assertions** (`await expect(locator).toBeVisible()`), Playwright reintenta automáticamente cada pocos milisegundos hasta que la condición se cumple. Si aparece en 800 ms, continúa de inmediato; si tarda 6 segundos, espera sin fallar.

---

## 3. Desglose Pedagógico por Suite

### 🔐 Suite 01: `01-autenticacion.spec.ts`
- **Caso Real**: Validar tanto el camino feliz (*Happy Path*) como los caminos negativos (*Negative Testing*) y controles de acceso.
- **Lo más importante para estudiar**:
  - Observa el **Test 1.4**: No basta con hacer clic en "Logout". Un buen ingeniero de QA intenta volver a entrar por URL directa (`/inventory.html`) después del logout para comprobar que la sesión realmente fue destruida.

### 🛒 Suite 02: `02-ecommerce-carrito.spec.ts`
- **Caso Real**: Validar reglas de negocio financieras (orden de precios y cálculo de impuestos en el Checkout).
- **Lo más importante para estudiar**:
  - En el **Test 2.1**, usamos `allInnerTexts()` y `.map(text => parseFloat(text.replace('$', '')))` para transformar textos del DOM (`"$29.99"`) en números reales de JavaScript y verificar que el arreglo esté matemáticamente ordenado.
  - En el **Test 2.2**, usamos `inventoryItems.filter({ hasText: productName })`. Esto permite encontrar el botón *"Add to cart"* que pertenece únicamente a la mochila, aunque existan 6 botones llamados *"Add to cart"* en la misma pantalla.

### ⚡ Suite 03: `03-estado-y-dom.spec.ts`
- **Caso Real**: Aplicaciones SPA (React/Vue/Angular) que guardan información en el navegador.
- **Lo más importante para estudiar**:
  - En el **Test 3.3**, usamos `page.evaluate(() => window.localStorage.getItem('react-todos'))`. Esto ejecuta código directamente dentro del contexto de Chrome para verificar que los datos se serializaron bien en `localStorage` antes y después de un `page.reload()`.

### 🌐 Suite 04: `04-red-y-api-mocking.spec.ts`
- **Caso Real**: Desacoplar las pruebas del frontend cuando un microservicio externo falla o necesitamos probar datos específicos.
- **Lo más importante para estudiar**:
  - **Test 4.1 (`route.fulfill`)**: Sustituye por completo la respuesta del backend con nuestro propio JSON.
  - **Test 4.2 (`route.fetch` + modificación)**: Deja que la llamada llegue al servidor real, intercepta el JSON de regreso y le inyecta un dato extra antes de entregárselo a la pantalla.
  - **Test 4.3 (`request.get`)**: Hace una petición HTTP pura sin siquiera abrir una pestaña del navegador.

### 🧩 Suite 05: `05-ui-avanzada.spec.ts`
- **Caso Real**: Interactuar con elementos nativos del navegador y cargas diferidas (*Lazy Loading*).
- **Lo más importante para estudiar**:
  - En el **Test 5.1**, `page.once('dialog', ...)` debe registrarse **antes** de hacer clic en el botón que abre el `confirm()` de JavaScript, ya que los diálogos nativos bloquean el hilo de ejecución de la página hasta que se responden.

---

## 4. Herramientas de Estudio de Playwright que debes probar

Con este repositorio instalado, prueba estos comandos en tu terminal para potenciar tu aprendizaje:

1. **Modo UI Interactivo (Time Travel Debugging)**:
   ```bash
   npm run test:ui
   ```
   Te permite ver una línea de tiempo de cada milisegundo del test, inspeccionar cómo estaba el DOM antes y después de cada clic y ver las llamadas de red.

2. **Generador de Código Automático (`codegen`)**:
   ```bash
   npx playwright codegen https://www.saucedemo.com
   ```
   Abre un navegador donde todo lo que hagas con el mouse se traduce automáticamente a código TypeScript de Playwright.
