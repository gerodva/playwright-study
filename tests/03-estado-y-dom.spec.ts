import { test, expect } from '@playwright/test';
import { TodoPage } from '../pages/TodoPage';

/**
 * ============================================================================
 * SUITE 03: MANIPULACIÓN DEL DOM, EVENTOS DE TECLADO Y PERSISTENCIA (localStorage)
 * Sitio de prueba: Playwright TodoMVC (https://demo.playwright.dev/todomvc)
 * ============================================================================
 * ¿Para qué sirve esta suite en un proyecto real?
 * Las aplicaciones modernas en React/Vue/Angular manejan mucho estado en el
 * navegador (filtros sin recargar página, edición con doble clic y guardado en
 * `localStorage`). Esta suite enseña cómo validar tanto lo que ve el usuario
 * en el DOM como lo que se guarda internamente en la memoria del navegador.
 */
test.describe('03 - Manipulación del DOM, Filtros Reactivos y localStorage (TodoMVC)', () => {
  let todoPage: TodoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 3.1: Creación de elementos con teclado y validación de listas
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Comprueba que el usuario puede agregar elementos usando
   *   la tecla `Enter`, que el input se limpia automáticamente tras cada envío
   *   y que la lista muestra los textos en el orden exacto.
   * - Conceptos Playwright: `press('Enter')`, `toBeEmpty()`, `toHaveText([...])`.
   */
  test('3.1 Debe crear múltiples tareas, limpiar el input y mostrar el contador actualizado', async () => {
    const tareas = [
      'Configurar proyecto Playwright con TypeScript',
      'Implementar Page Object Model',
      'Configurar GitHub Actions seguro',
    ];

    for (const tarea of tareas) {
      await todoPage.addTodo(tarea);
      // Buena práctica UX: verificar que el campo queda vacío tras pulsar Enter
      await expect(todoPage.newTodoInput).toBeEmpty();
    }

    // Validamos que existan exactamente 3 elementos y coincidan en orden con el arreglo
    await todoPage.expectTodoCount(3);
    await expect(todoPage.todoItems).toHaveText(tareas);
    await expect(todoPage.todoCount).toContainText('3 items left');
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 3.2: Filtrado reactivo de estados (Active / Completed) y limpieza
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Simula cómo un usuario marca tareas como completadas,
   *   cambia entre pestañas de filtro ("Active" vs "Completed") y elimina las
   *   tareas terminadas.
   * - Conceptos Playwright: `check()`, `toHaveClass(/completed/)` y filtros de ruta.
   */
  test('3.2 Debe filtrar correctamente entre tareas activas y completadas y limpiar las terminadas', async () => {
    await todoPage.addTodo('Tarea pendiente 1');
    await todoPage.addTodo('Tarea que será completada');
    await todoPage.addTodo('Tarea pendiente 2');

    // Marcamos como completada la segunda tarea (índice 1)
    await todoPage.toggleTodoByIndex(1);

    // Verificamos que el elemento adquirió la clase CSS 'completed'
    await expect(todoPage.todoItems.nth(1)).toHaveClass(/completed/);

    // Filtramos por 'Active': solo deben verse las 2 pendientes
    await todoPage.filterBy('Active');
    await todoPage.expectTodoCount(2);

    // Filtramos por 'Completed': solo debe verse la tarea terminada
    await todoPage.filterBy('Completed');
    await todoPage.expectTodoCount(1);
    await expect(todoPage.todoItems.first()).toHaveText('Tarea que será completada');

    // Pulsamos 'Clear completed' y regresamos a 'All'
    await todoPage.clearCompletedButton.click();
    await todoPage.filterBy('All');
    await todoPage.expectTodoCount(2);
  });

  /**
   * --------------------------------------------------------------------------
   * TEST 3.3: Persistencia de estado tras recargar (`page.reload` + `localStorage`)
   * --------------------------------------------------------------------------
   * - ¿Para qué sirve?: Un error muy común en Single Page Applications (SPA) es
   *   que los datos se ven en pantalla pero se pierden si el usuario presiona F5
   *   (recargar). Aquí validamos tanto el contenido interno de `localStorage`
   *   como la persistencia visual después de `page.reload()`.
   * - Conceptos Playwright: `page.evaluate()` para inspeccionar APIs del navegador
   *   y `page.reload()`.
   */
  test('3.3 Debe persistir las tareas en localStorage y conservarlas al recargar la página (F5)', async ({ page }) => {
    await todoPage.addTodo('Estudiar Playwright Trace Viewer');
    await todoPage.toggleTodoByIndex(0);

    // 1. Inspeccionamos directamente el localStorage dentro del navegador
    const storedTodos = await page.evaluate(() => {
      const raw = window.localStorage.getItem('react-todos');
      return raw ? JSON.parse(raw) : [];
    });

    expect(storedTodos).toHaveLength(1);
    expect(storedTodos[0].title).toBe('Estudiar Playwright Trace Viewer');
    expect(storedTodos[0].completed).toBe(true);

    // 2. Recargamos la página completa (simula presionar F5)
    await page.reload();

    // 3. Confirmamos que la tarea sigue visible y marcada como completada
    await todoPage.expectTodoCount(1);
    await expect(todoPage.todoItems.first()).toHaveClass(/completed/);
  });
});
