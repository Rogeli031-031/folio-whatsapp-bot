# Reporte — HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001

```yaml
task_id: "HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001.md"
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"
files_not_touched:
  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.js"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "test/director-ia-dashboard-cycle-client.test.js"
  - "server.js"
  - "lib/director-ia-dashboard-cycle-transport.js"
  - "docs/director-ia/"
  - "package.json"
  - "frontend-dashboard/package.json"
  - ".env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `hotfix/director-ia-dashboard-cycle-client-types-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T11:22:03-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3/G8: `N/A`, no usados.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status` del bloque G1) → este reporte → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea.

El `.d.ts` corregido bastó. No se tocaron `DirectorIaCyclePanel.tsx`, `api.ts` ni el test focal.

## Causa raíz confirmada

El fallo de Render en `DirectorIaCyclePanel.tsx:45:29` (`createDirectorIaCycleUiSession()` — `This expression is not callable`) no venía del panel ni del runtime JS.

`cycle-client-core.d.ts` declaraba el default export como **objeto valor**:

```ts
export default {
  createDirectorIaCycleUiSession: typeof createDirectorIaCycleUiSession;
  // ...
};
```

En un `.d.ts`, ese `typeof` queda en **posición de valor** (operador JavaScript), no como consulta de tipo. TypeScript tipa cada propiedad como el union `'"string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"'`, que no tiene call signatures.

El panel hace:

```ts
import cycleCore from "@/modules/director-ia/lib/cycle-client-core";
const createDirectorIaCycleUiSession = cycleCore.createDirectorIaCycleUiSession;
useRef(createDirectorIaCycleUiSession()); // línea 45
```

`api.ts` consume el mismo default import para `executeDirectorIaCycleRequest`.

Reproducción local **antes** del fix, en `frontend-dashboard`, con `npx tsc --noEmit --pretty false` (exit 2): errores de parseo en `cycle-client-core.d.ts` líneas 81–98 (`TS1005 ',' expected` / `TS1109 Expression expected`) exactamente sobre ese `export default { ... }` con `;` y `typeof` en posición de valor. Misma causa que el error de `next build` en Render (`Type error: This expression is not callable` en la línea 45 del panel).

## Diff mínimo aplicado

Solo el bloque default de `frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts`:

- `declare const cycleClientCore` con object type explícito.
- `typeof` ahora en **posición de tipo** (consulta de signature).
- `export default cycleClientCore`.

Named exports y signatures existentes se conservaron. Sin `any`, sin `@ts-ignore`, sin casts, sin migrar el helper a TypeScript.

`cycle-client-core.js` sin diff. Default export runtime (`module.exports` + `module.exports.default = module.exports`) intacto. `createDirectorIaCycleUiSession` y `executeDirectorIaCycleRequest` siguen callables en el objeto default.

## Comando exacto de build

No hay `render.yaml` en el repo. El comando se identificó así:

| Fuente | Hallazgo |
|--------|----------|
| Render (known_failure / log del deploy) | `==> Running build command 'npm ci && npm run build'...` (Node v18.20.8, root del servicio frontend) |
| `frontend-dashboard/package.json` | `"build": "next build && node scripts/prepare-standalone.js"` |
| `frontend-dashboard/next.config.js` | `output: "standalone"`; comentario de huella en Render Starter |
| `frontend-dashboard/scripts/prepare-standalone.js` | copia assets para Render / Docker |
| `package.json` raíz | `start:dashboard` → `node frontend-dashboard/.next/standalone/server.js` |

Comando de deploy del frontend (cwd `frontend-dashboard`):

```text
npm ci && npm run build
```

Equivale a:

```text
npm ci && next build && node scripts/prepare-standalone.js
```

No se inventó otro script (`next build` suelto, `tsc` como sustituto de Render, ni `npm run build` desde la raíz del bot).

### Resultado exacto del build

Secuencia ejecutada en `frontend-dashboard`:

1. `npm ci` — exit 0 (instalación previa a la validación de tipos).
2. `npx tsc --noEmit --pretty false` **antes** del fix — exit 2 (reproducción; ver causa raíz).
3. `npx tsc --noEmit --pretty false` **después** del fix — exit 0.
4. `npm run build` **después** del fix (el paso que Render ejecuta tras `npm ci`; es el typecheck + compile que falló) — **exit 0**.

Salida relevante de `npm run build`:

```text
> frontend-dashboard@0.1.0 build
> next build && node scripts/prepare-standalone.js

  ▲ Next.js 14.2.18
 ✓ Compiled successfully
   Skipping linting
   Checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (12/12)
[prepare-standalone] Copiados .next/static y public → .next/standalone
```

No reapareció `DirectorIaCyclePanel.tsx:45:29` ni `This expression is not callable`.

Los artefactos de `.next/` y `tsconfig.tsbuildinfo` generados por el build se restauraron a HEAD; no forman parte del arreglo.

## Tests

| Suite | Comando | Resultado |
|-------|---------|-----------|
| Focal cliente | `node --test test/director-ia-dashboard-cycle-client.test.js` | **16 pass / 0 fail** (4 suites) |
| Regresión Director IA | `node --test test/director-ia-*.test.js` | **351 pass / 0 fail** (88 suites) |

## git diff --check / git status

- `git diff --check -- frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts`: limpio.
- `git diff --check` sobre `CURRENT_TASK.md`: trailing whitespace en la línea 18 del bloque G1 humano (`G8 ... N/A` seguida de línea en blanco con espacios). Preexistente en el YAML autorizado; no se alteró el bloque G1 salvo `status`.
- `git status --short` al cierre de implementación (antes de este reporte):

```text
 M docs/dev-loop/CURRENT_TASK.md
 M frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts
```

Tras este reporte también aparece el archivo de reporte (autorizado).

## Confirmación de no-cambio

| Superficie | ¿Cambió? |
|------------|----------|
| `cycle-client-core.js` runtime | No. `git diff` vacío. |
| API runtime / default export JS | No. `module.exports` + `module.exports.default` intactos. |
| Backend / `server.js` / endpoint `POST /api/director-ia/cycle` | No. |
| Semántica UI (`DirectorIaCyclePanel.tsx`, `api.ts`) | No. El `.d.ts` bastó. |
| Dependencias / `package.json` | No. |
| Contratos `docs/director-ia/` | No. |
