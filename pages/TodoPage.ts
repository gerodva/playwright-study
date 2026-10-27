import { type Locator, type Page, expect } from '@playwright/test';
import { TEST_CONFIG } from '../utils/testData';

/**
 * ============================================================================
 * PAGE OBJECT MODEL: TodoPage (pages/TodoPage.ts)
 * ============================================================================
 * Encapsula las interacciones con la aplicación oficial TodoMVC de Playwright
 * (https://demo.playwright.dev/todomvc/#/).
 * Ideal para estudiar manipulación reactiva del DOM, eventos de teclado y filtros.
 */
export class TodoPage {
  readonly page: Page;
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly todoCount: Locator;
  readonly clearCompletedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Usamos getByPlaceholder: un locator semántico orientado a lo que ve el usuario
    this.newTodoInput = page.getByPlaceholder('What needs to be done?');
    this.todoItems = page.getByTestId('todo-item');
    this.todoCount = page.getByTestId('todo-count');
    this.clearCompletedButton = page.getByRole('button', { name: 'Clear completed' });
  }

  async goto(): Promise<void> {
    await this.page.goto(TEST_CONFIG.urls.todoMvc);
  }

  /**
   * Agrega una nueva tarea escribiendo en el input y presionando la tecla Enter.
   */
  async addTodo(taskText: string): Promise<void> {
    await this.newTodoInput.fill(taskText);
    await this.newTodoInput.press('Enter');
  }

  /**
   * Marca como completada una tarea según su índice (0 = primera tarea).
   */
  async toggleTodoByIndex(index: number): Promise<void> {
    const itemCheckbox = this.todoItems.nth(index).getByRole('checkbox');
    await itemCheckbox.check();
  }

  /**
   * Filtra las tareas visibles usando los enlaces inferiores: 'All' | 'Active' | 'Completed'.
   */
  async filterBy(filterName: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.page.getByRole('link', { name: filterName }).click();
  }

  /**
   * Verifica cuántas tareas están visibles actualmente en la lista.
   */
  async expectTodoCount(count: number): Promise<void> {
    await expect(this.todoItems).toHaveCount(count);
  }
}
