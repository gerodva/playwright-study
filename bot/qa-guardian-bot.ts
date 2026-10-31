import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ============================================================================
 * 🤖 QA GUARDIAN BOT (bot/qa-guardian-bot.ts)
 * ============================================================================
 * ¿Para qué sirve este Bot?
 * 1. AUDITA LOS TESTS (Static QA Linter): Revisa el código fuente de todos los
 *    archivos `tests/*.spec.ts` para asegurarse de que cumplan las normas de
 *    calidad (sin `test.only`, sin `waitForTimeout` en código, bien documentados).
 * 2. EJECUTA PLAYWRIGHT E INSPECCIONA RESULTADOS: Corre toda la suite E2E/API,
 *    genera un reporte JSON estructurado y detecta qué test falló, en qué línea
 *    y con qué error.
 * 3. GESTIONA ISSUES EN GITHUB DE FORMA SEGURA:
 *    - Sanitiza los errores (oculta rutas de tu PC como `D:\...` o `C:\Users\...`
 *      y cualquier patrón de token) antes de publicarlos en un repositorio público.
 *    - Evita duplicados: verifica si ya existe un Issue abierto para ese fallo.
 *    - Auto-cierre (Self-Healing): cuando todos los tests vuelven a pasar en verde,
 *      comenta y cierra automáticamente los Issues pendientes del bot.
 */

interface AuditFinding {
  file: string;
  rule: string;
  description: string;
}

interface FailedTestInfo {
  suiteTitle: string;
  testTitle: string;
  file: string;
  line: number;
  durationMs: number;
  errorMessage: string;
}

const REPO = process.env.GITHUB_REPOSITORY || 'gerodva/playwright-study';
const BOT_LABEL = 'qa-bot';
const WORKSPACE_ROOT = process.cwd();
const REPORT_DIR = path.join(WORKSPACE_ROOT, 'test-results');
const JSON_REPORT_PATH = path.join(REPORT_DIR, 'bot-report.json');

// Banderas de ejecución por CLI
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const simulateFailure = args.includes('--simulate-failure');

/**
 * ----------------------------------------------------------------------------
 * CAPA DE SEGURIDAD: Sanitización de datos sensibles y rutas locales
 * ----------------------------------------------------------------------------
 * Nunca debemos publicar en un Issue público la ruta completa del disco o
 * el nombre del usuario del sistema operativo local ni tokens accidentales.
 */
function sanitizeText(raw: string): string {
  if (!raw) return '';

  return raw
    // 1. Eliminar códigos ANSI de color de la terminal
    .replace(/\u001b\[[0-9;]*m/g, '')
    // 2. Ocultar la ruta absoluta del proyecto local (Windows / Unix)
    .replaceAll(WORKSPACE_ROOT, '<repo>')
    .replaceAll(WORKSPACE_ROOT.replace(/\\/g, '/'), '<repo>')
    // 3. Ocultar cualquier ruta de perfil de usuario de Windows (C:\Users\nombre)
    .replace(/[A-Za-z]:\\Users\\[^\\/\s]+/gi, '<user-home>')
    // 4. Enmascarar posibles tokens de GitHub o cabeceras Bearer si aparecieran
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, 'ghp_***REDACTED***')
    .replace(/github_pat_[A-Za-z0-9_]+/g, 'github_pat_***REDACTED***')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer ***REDACTED***')
    .trim();
}

/**
 * ----------------------------------------------------------------------------
 * FASE 1: Auditoría Estática de los Archivos de Test (`tests/*.spec.ts`)
 * ----------------------------------------------------------------------------
 * "Hace pruebas a los propios tests": verifica que estén bien escritos,
 * documentados y libres de anti-patrones de Playwright.
 */
function auditTestFiles(): AuditFinding[] {
  const testsDir = path.join(WORKSPACE_ROOT, 'tests');
  const findings: AuditFinding[] = [];

  if (!fs.existsSync(testsDir)) {
    return findings;
  }

  const specFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith('.spec.ts'));

  for (const file of specFiles) {
    const fullPath = path.join(testsDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Eliminamos comentarios para analizar solo el código ejecutable real
    const executableCode = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    // Regla 1: Prohibido dejar `test.only` o `describe.only`
    if (/\b(test|describe)\.only\s*\(/.test(executableCode)) {
      findings.push({
        file: `tests/${file}`,
        rule: 'NO_TEST_ONLY',
        description: 'Se detectó `test.only` o `describe.only` activo, lo cual desactiva el resto de la suite.',
      });
    }

    // Regla 2: Prohibido usar esperas fijas `waitForTimeout` en código ejecutable
    if (/\.waitForTimeout\s*\(/.test(executableCode)) {
      findings.push({
        file: `tests/${file}`,
        rule: 'NO_HARD_SLEEP',
        description: 'Se detectó el anti-patrón `waitForTimeout()`. Usa aserciones Web-First (`expect().toBeVisible()`).',
      });
    }

    // Regla 3: Cada archivo debe tener documentación pedagógica (`/** ... */`)
    const docBlocks = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
    if (docBlocks.length < 2) {
      findings.push({
        file: `tests/${file}`,
        rule: 'MISSING_DOCUMENTATION',
        description: 'El archivo de pruebas no cuenta con suficientes bloques de documentación (`/** ... */`) explicando cada test.',
      });
    }
  }

  return findings;
}

/**
 * ----------------------------------------------------------------------------
 * FASE 2: Ejecución de Playwright y Análisis del Reporte JSON
 * ----------------------------------------------------------------------------
 */
function runPlaywrightSuite(): { totalTests: number; passedTests: number; failures: FailedTestInfo[] } {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  if (fs.existsSync(JSON_REPORT_PATH)) {
    fs.unlinkSync(JSON_REPORT_PATH);
  }

  console.log('🎭 [QA-Bot] Ejecutando suites de Playwright...');

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'npx';
  const commandArgs = isWindows
    ? ['/c', 'npx.cmd', 'playwright', 'test', '--reporter=json']
    : ['playwright', 'test', '--reporter=json'];

  try {
    const stdout = execFileSync(command, commandArgs, {
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    fs.writeFileSync(JSON_REPORT_PATH, stdout, 'utf-8');
  } catch (err: unknown) {
    // Cuando al menos 1 test falla, Playwright sale con código != 0,
    // pero igual entrega el reporte JSON completo en `stdout`.
    const execErr = err as { stdout?: string };
    if (execErr.stdout) {
      fs.writeFileSync(JSON_REPORT_PATH, execErr.stdout, 'utf-8');
    } else {
      throw err;
    }
  }

  const reportRaw = fs.readFileSync(JSON_REPORT_PATH, 'utf-8');
  const report = JSON.parse(reportRaw);

  let totalTests = 0;
  let passedTests = 0;
  const failures: FailedTestInfo[] = [];

  // Función recursiva para recorrer las suites del reporte JSON de Playwright
  function traverseSuites(suites: any[], parentTitle = ''): void {
    for (const suite of suites || []) {
      const currentSuiteTitle = suite.title
        ? parentTitle
          ? `${parentTitle} > ${suite.title}`
          : suite.title
        : parentTitle;

      for (const spec of suite.specs || []) {
        totalTests++;
        const testObj = spec.tests?.[0];
        const lastResult = testObj?.results?.[testObj.results.length - 1];
        const status = lastResult?.status;

        if (spec.ok && status === 'passed') {
          passedTests++;
        } else {
          const rawError =
            lastResult?.error?.message ||
            lastResult?.errors?.map((e: any) => e.message).join('\n') ||
            'Fallo inesperado sin stack trace detallado.';

          failures.push({
            suiteTitle: currentSuiteTitle,
            testTitle: spec.title,
            file: sanitizeText(spec.file || suite.file || 'tests/unknown.spec.ts'),
            line: spec.line || 1,
            durationMs: lastResult?.duration || 0,
            errorMessage: sanitizeText(rawError).slice(0, 1200),
          });
        }
      }

      if (suite.suites) {
        traverseSuites(suite.suites, currentSuiteTitle);
      }
    }
  }

  traverseSuites(report.suites || []);

  // Si se activó `--simulate-failure`, agregamos un fallo controlado de demostración
  if (simulateFailure) {
    console.log('🧪 [QA-Bot] Modo --simulate-failure activo: inyectando fallo controlado de prueba.');
    totalTests++;
    failures.push({
      suiteTitle: '01 - Autenticación y Seguridad de Acceso (SauceDemo)',
      testTitle: '[SIMULACIÓN QA-BOT] Validar alerta ante expiración de sesión',
      file: 'tests/01-autenticacion.spec.ts',
      line: 42,
      durationMs: 1450,
      errorMessage: sanitizeText(
        `Error: Timed out 5000ms waiting for expect(locator).toBeVisible()\n` +
          `Locator: locator('[data-test="session-expired-banner"]')\n` +
          `Expected: visible\n` +
          `Received: <element(s) not found>\n` +
          `Call log:\n  - waiting for locator('[data-test="session-expired-banner"]') at ${WORKSPACE_ROOT}\\tests\\01-autenticacion.spec.ts:42:15`
      ),
    });
  }

  return { totalTests, passedTests, failures };
}

/**
 * ----------------------------------------------------------------------------
 * FASE 3: Sincronización Segura con GitHub Issues (`gh` CLI)
 * ----------------------------------------------------------------------------
 */
function ensureBotLabelExists(): void {
  if (isDryRun) return;
  try {
    execFileSync(
      'gh',
      [
        'label',
        'create',
        BOT_LABEL,
        '--repo',
        REPO,
        '--color',
        'D93F0B',
        '--description',
        'Issue gestionado automáticamente por QA Guardian Bot',
        '--force',
      ],
      { stdio: 'ignore' }
    );
  } catch {
    // Si falla por permisos de label, continuamos sin bloquear
  }
}

function getOpenBotIssues(): Array<{ number: number; title: string }> {
  const out = execFileSync(
    'gh',
    [
      'issue',
      'list',
      '--repo',
      REPO,
      '--label',
      BOT_LABEL,
      '--state',
      'open',
      '--json',
      'number,title',
    ],
    { encoding: 'utf-8' }
  );
  return JSON.parse(out || '[]');
}

function buildIssueMarkdown(
  totalTests: number,
  passedTests: number,
  failures: FailedTestInfo[],
  auditFindings: AuditFinding[]
): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [
    '## 🤖 Reporte Automático de QA Guardian Bot',
    '',
    `El bot de monitoreo ejecutó una auditoría y corrida de pruebas sobre \`${REPO}\` y detectó incidencias que requieren atención.`,
    '',
    '### 📊 Resumen de Ejecución',
    '| Métrica | Resultado |',
    '| :--- | :--- |',
    `| **Fecha UTC** | \`${timestamp}\` |`,
    `| **Tests Ejecutados** | **${totalTests}** |`,
    `| **Tests Aprobados** | ✅ **${passedTests}** |`,
    `| **Tests Fallidos** | ❌ **${failures.length}** |`,
    `| **Alertas de Calidad en Código** | ⚠️ **${auditFindings.length}** |`,
    '',
  ];

  if (failures.length > 0) {
    lines.push('---', '### ❌ Detalle de Pruebas Fallidas', '');
    for (const [idx, fail] of failures.entries()) {
      lines.push(
        `#### ${idx + 1}. \`${fail.testTitle}\``,
        `- **Suite**: ${fail.suiteTitle}`,
        `- **Ubicación**: \`${fail.file}:${fail.line}\``,
        `- **Duración**: \`${fail.durationMs} ms\``,
        '',
        '**Error Sanitizado (rutas locales y secretos protegidos):**',
        '```text',
        fail.errorMessage,
        '```',
        '',
        '**¿Cómo reproducir y depurar este fallo localmente?**',
        '```bash',
        `npx playwright test ${fail.file} --debug`,
        '```',
        ''
      );
    }
  }

  if (auditFindings.length > 0) {
    lines.push('---', '### ⚠️ Hallazgos de Auditoría Estática en los Tests', '');
    for (const finding of auditFindings) {
      lines.push(`- **\`${finding.file}\` (${finding.rule})**: ${finding.description}`);
    }
    lines.push('');
  }

  lines.push(
    '---',
    '> 🔒 *Nota de seguridad: Este reporte fue sanitizado automáticamente por `qa-guardian-bot.ts` para no exponer rutas locales del sistema operativo ni variables de entorno.*',
    '> 🔄 *Auto-cierre: Cuando todos los tests vuelvan a pasar con `npm run bot:qa`, el bot cerrará este Issue automáticamente.*'
  );

  return lines.join('\n');
}

function syncWithGitHub(
  totalTests: number,
  passedTests: number,
  failures: FailedTestInfo[],
  auditFindings: AuditFinding[]
): void {
  const hasProblems = failures.length > 0 || auditFindings.length > 0;

  ensureBotLabelExists();
  const openIssues = getOpenBotIssues();

  if (hasProblems) {
    const primaryTarget =
      failures[0]?.testTitle || auditFindings[0]?.rule || 'Anomalía en Suite Playwright';
    const issueTitle = `🚨 [QA-Bot] Fallo detectado: ${primaryTarget}`.slice(0, 120);
    const issueBody = buildIssueMarkdown(totalTests, passedTests, failures, auditFindings);

    console.log(`\n❌ [QA-Bot] Se detectaron ${failures.length} fallo(s) de ejecución y ${auditFindings.length} hallazgo(s) de auditoría.`);

    if (isDryRun) {
      console.log('\n--- [DRY-RUN] Vista previa del Issue que se abriría en GitHub ---');
      console.log(`TÍTULO: ${issueTitle}\n`);
      console.log(issueBody);
      return;
    }

    // Verificamos si ya existe un Issue abierto con el mismo título para evitar spam
    const existing = openIssues.find((i) => i.title === issueTitle);
    if (existing) {
      console.log(
        `ℹ️ [QA-Bot] Ya existe el Issue abierto #${existing.number} ("${existing.title}"). No se creará un duplicado.`
      );
      return;
    }

    // Guardamos el cuerpo en un archivo temporal dentro de test-results (ignorado por Git)
    const bodyFilePath = path.join(REPORT_DIR, 'issue-body.md');
    fs.writeFileSync(bodyFilePath, issueBody, 'utf-8');

    const createdUrl = execFileSync(
      'gh',
      [
        'issue',
        'create',
        '--repo',
        REPO,
        '--title',
        issueTitle,
        '--body-file',
        bodyFilePath,
        '--label',
        `${BOT_LABEL},bug`,
      ],
      { encoding: 'utf-8' }
    ).trim();

    fs.unlinkSync(bodyFilePath);
    console.log(`🚀 [QA-Bot] Nuevo Issue creado exitosamente en GitHub: ${createdUrl}`);
  } else {
    console.log(
      `\n✅ [QA-Bot] ¡Excelente! Los ${passedTests}/${totalTests} tests pasaron y la auditoría de código reportó 0 problemas.`
    );

    if (isDryRun || openIssues.length === 0) {
      console.log('ℹ️ [QA-Bot] No hay Issues pendientes del bot por cerrar.');
      return;
    }

    // Auto-cierre (Self-Healing): cerramos cualquier Issue abierto por el bot previamente
    for (const issue of openIssues) {
      const resolutionComment =
        `✅ **Resuelto automáticamente por QA Guardian Bot**\n\n` +
        `En la última ejecución (\`${new Date().toISOString()}\`), las **${passedTests}/${totalTests} pruebas** pasaron al 100% y la auditoría de calidad no reportó errores. Se procede a cerrar este Issue.`;

      execFileSync(
        'gh',
        [
          'issue',
          'close',
          String(issue.number),
          '--repo',
          REPO,
          '--comment',
          resolutionComment,
        ],
        { stdio: 'inherit' }
      );
      console.log(`🎉 [QA-Bot] Issue #${issue.number} cerrado automáticamente tras verificar que la suite está sana.`);
    }
  }
}

function main(): void {
  console.log('====================================================================');
  console.log('🤖 INICIANDO QA GUARDIAN BOT - AUDITORÍA Y MONITOREO DE PLAYWRIGHT');
  console.log('====================================================================');

  // Paso 1: Auditar la calidad de los archivos de test (*.spec.ts)
  console.log('🔍 [Fase 1/3] Auditando calidad y seguridad del código de los tests...');
  const auditFindings = auditTestFiles();
  console.log(`   -> Hallazgos estáticos en archivos .spec.ts: ${auditFindings.length}`);

  // Paso 2: Ejecutar Playwright y analizar resultados
  console.log('🎭 [Fase 2/3] Ejecutando pruebas en Playwright y analizando reporte...');
  const { totalTests, passedTests, failures } = runPlaywrightSuite();
  console.log(`   -> Resultado Playwright: ${passedTests}/${totalTests} aprobados, ${failures.length} fallidos.`);

  // Paso 3: Sincronizar con GitHub Issues
  console.log('🐙 [Fase 3/3] Sincronizando estado con GitHub Issues...');
  syncWithGitHub(totalTests, passedTests, failures, auditFindings);
}

main();
