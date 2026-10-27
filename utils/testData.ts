/**
 * ============================================================================
 * DATOS CENTRALIZADOS DE PRUEBA Y VARIABLES DE ENTORNO (utils/testData.ts)
 * ============================================================================
 * ¿Para qué sirve este archivo?
 * En un proyecto real, NUNCA debes repetir URLs o usuarios ("hardcoding")
 * dentro de decenas de archivos de prueba. Si la URL cambia o quieres correr
 * las pruebas contra un entorno de Staging vs QA, solo cambias las variables
 * de entorno.
 *
 * BUENA PRÁCTICA DE SEGURIDAD:
 * - Lee primero de `process.env` (variables de entorno).
 * - Los valores por defecto aquí corresponden ÚNICAMENTE a entornos de
 *   demostración pública oficial (SauceDemo, Playwright TodoMVC, The Internet).
 *   En un proyecto privado real, las contraseñas nunca tendrían un fallback en código.
 */
export const TEST_CONFIG = {
  urls: {
    sauceDemo: process.env.SAUCE_BASE_URL || 'https://www.saucedemo.com',
    todoMvc: process.env.TODOMVC_BASE_URL || 'https://demo.playwright.dev/todomvc/#/',
    theInternet: process.env.THE_INTERNET_BASE_URL || 'https://the-internet.herokuapp.com',
  },
  sauceUsers: {
    // Usuario estándar con acceso completo al catálogo y compras
    standard: process.env.SAUCE_STANDARD_USER || 'standard_user',
    // Usuario bloqueado para probar controles de seguridad y mensajes de rechazo
    lockedOut: process.env.SAUCE_LOCKED_USER || 'locked_out_user',
    // Contraseña pública oficial de SauceDemo
    password: process.env.SAUCE_PASSWORD || 'secret_sauce',
  },
} as const;
