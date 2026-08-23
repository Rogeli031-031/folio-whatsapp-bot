# Reporte — IMPL-DIRECTOR-IA-M9-DELTAS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M9-DELTAS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-planner.js"
  - "server.js"
  - "test/director-ia-m9-deltas.test.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "sql/"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-real-cycle.js"
  - "lib/delta-ingreso-forecast.js"
  - "lib/delta-ingreso-ai*"
  - "package.json"
  - "package-lock.json"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix documental no se modifica en esta tarea."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

M9 quedó **físicamente listo para COMPLETE** como integración **read-only** in-process de las tres familias canónicas:

- **Delta Venta** (`delta_sales` → `get_delta_sales` → `loadDeltaVentaForChat`)
- **Delta Descuento** (`delta_discount` → `get_delta_discount` → `loadDeltaDescuentoForChat`)
- **Delta Ingreso** (`delta_income` → `get_delta_income` → `loadDeltaIngresoForChat`)

Path único: `intent → tool → executor → helper/fuente → respuesta`.

No hay HTTP interno, mutaciones, forecast con DELETE/INSERT, M19, cycle, UI, endpoint nuevo ni cambio de matriz documental. IGF/ARR snapshot/KPIs M3 no sustituyen a M9.

El +2.5 pp (40.0% → 42.5%) queda para el sync documental separado.

## Autorización y gates

- Rama: `implementation/director-ia-m9-deltas-001` (≠ `main`).
- HEAD de partida: `dfb2c30a Merge branch 'architecture/director-ia-m9-deltas-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T12:40:00-06:00`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M9 — Delta Venta / Descuento / Ingreso |
| Estado de matriz | INDIRECTA (no modificado) |
| M0–M20 | 40.0% (8.0/20). El +2.5 pp queda para el sync documental |
| Readiness | ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001 |
| Estado físico tras IMPL | listo para COMPLETE |

## Arquitectura implementada

Alternativa del readiness: loaders in-process, no dispatcher genérico, no HTTP interno.

- `lib/director-ia-m9-deltas.js`: helpers extraídos (misma semántica que los POST SELECT-only del dashboard), authz, periodos, loaders y respuestas.
- `server.js`: wrappers que delegan a esos helpers; contrato HTTP de `delta-*-datos` intacto. M19 sigue llamando `getDeltaIngresoDatosInternal` (wrapper) fuera de Director IA.
- Catálogo runtime: `delta_venta`, `delta_descuento`, `delta_ingreso` con `canRead: true`, `coverage: partial`, `accessMode: on_demand`.
- Registry: las tres tools `available_on_demand` + executor real.
- Planner: intents conservados; dominios solo de la familia (ya no planean `arr`/`igf` como sustituto).
- Chat: ramas in-process **antes** de OpenAI / anexo IGF.

## Mapa end-to-end final

```text
pregunta ("¿Cómo cambió la venta|descuento|ingreso?")
  → POST /api/director-ia/chat (JWT + planta_id)
  → askDirectorIa
  → detectUnsupportedDirectorIaDomain  (deltas ya no cortan)
  → planDirectorIaQuestion → delta_sales | delta_discount | delta_income
  → buildDirectorIaToolPlan → get_delta_* executable
  → loadDelta{Venta|Descuento|Ingreso}ForChat
       → assertM9DeltasAccess (GA / GV / plantas_permitidas)
       → resolvePlantaRow (planta_id del scope)
       → getPeriodosDelta{Venta|Descuento} (lista DESC)
       → resolvePeriodPair (pregunta o default dos más recientes)
       → getDelta*Clientes / getDeltaIngresoDatosInternal
  → buildDelta*ChatResult
       semantic_class: delta_*_period_compare
       openai_called: false
```

## Delta Venta

| Campo | Valor |
|---|---|
| Intent / tool | `delta_sales` / `get_delta_sales` |
| Executor | `loadDeltaVentaForChat` |
| Fuente | `arr.ventas_diarias_cliente` (kg) |
| Periodos | `getPeriodosDeltaVenta` |
| Shape | `buildDeltaVentaDatosPayload` (dejaron / más / disminuyeron, 80/20 de esta muestra) |
| Unidad | kg |
| No es | descuento, ingreso, IGF, ARR snapshot, KPIs M3, M19 |

## Delta Descuento

| Campo | Valor |
|---|---|
| Intent / tool | `delta_discount` / `get_delta_discount` |
| Executor | `loadDeltaDescuentoForChat` |
| Fuente | `arr.descuentos_diarios_cliente` + kg de ventas ($/kg) |
| Periodos | `getPeriodosDeltaDescuento` |
| Shape | `buildDeltaDescuentoDatosPayload` |
| Unidad | $/kg |
| Coerción de fuente | kg=0 → ratio 0 en SQL; no es % inventado |
| No es | venta, ingreso, weekly LD, IGF annex, M19 |

## Delta Ingreso

| Campo | Valor |
|---|---|
| Intent / tool | `delta_income` / `get_delta_income` |
| Executor | `loadDeltaIngresoForChat` |
| Fuente modal | `getDeltaIngresoDatosInternal` + `getDeltaIngresoClientes` |
| Periodos | `getPeriodosDeltaVenta` (igual que `GET /delta-ingreso-periodos`) |
| Fórmula | `kg × (margen_$/kg − \|desc_$/kg\|)` |
| Margen | `getMargenKgPorPeriodo` (`igf.versions` + `igf.compromiso_lines`) como **insumo de fórmula**, no anexo IGF |
| Unidad | MXN |
| Fuera de COMPLETE | `lib/delta-ingreso-forecast.js` (DELETE/INSERT); M19 `/api/ai/delta-ingreso/test/*` |

El módulo M9 no importa forecast write ni `delta-ingreso-ai*`. No contiene `INSERT`/`UPDATE`/`DELETE`, `fetch(` ni `axios`.

## M9 vs M19

M9 consulta el modal de periodos reales. M19 (WhatsApp AI test) reutiliza el helper HTTP `getDeltaIngresoDatosInternal` fuera de este wiring. Director IA no llama `/api/ai/delta-ingreso/*` ni integra M19.

## Authz

Equivalente o más restrictivo que el dashboard:

- **GA**: 403, no consulta fuente.
- **GV**: 403 (solo tiene forecast/DICF en dashboard; no M9 COMPLETE).
- **GG/GA/AD** con `plantas_permitidas`: fail-closed si `planta_id` no está en la lista. GA ya está bloqueado antes de esa lista.
- **ZP** y roles sin lista: pasan al scope de `planta_id`.
- No se amplía `plantas_permitidas`. No hay cross-planta. `planta_id` ausente → 400.

## Periodos

- Formato `YYYY-MM`. A ≠ B.
- Si la pregunta trae dos distintos, se usan (orden de aparición = A, B).
- Si no, default = los dos más recientes de la lista DESC (B = `[0]`, A = `[1]`).
- Si hay <2 periodos, fail-closed: no se inventan.
- Periodos iguales → 400.

## Null / división por cero

- `percentChangeOrUnknown(base, delta)`: base 0/null/undefined o delta no finito → `null`. No se produce % válido.
- Error de fuente → `SOURCE_ERROR`; no se convierte en ceros.
- Periodos insuficientes → `DATA_NOT_FOUND`; no se inventa par.
- Coerción de ceros que ya existe en SQL/helpers (COALESCE kg; kg=0 → ratio 0; margen IGF ausente → `?? 0` en la fórmula del modal) se declara en `source_coercion`; no se afirma como porcentaje.

## Wiring / tools / executors

| Intent | Tool | Status | Executor |
|---|---|---|---|
| `delta_sales` | `get_delta_sales` | `available_on_demand` | `loadDeltaVentaForChat` |
| `delta_discount` | `get_delta_discount` | `available_on_demand` | `loadDeltaDescuentoForChat` |
| `delta_income` | `get_delta_income` | `available_on_demand` | `loadDeltaIngresoForChat` |

Inputs mínimos: `planta_id`, `question`. Chat intercepta los tres intents antes de OpenAI / `isPlantFinancialKpiQuestion`.

Planner `INTENT_DOMAIN_MAP`:

- `delta_sales: ["delta_venta"]`
- `delta_discount: ["delta_descuento"]`
- `delta_income: ["delta_ingreso"]`

Ya no planean ARR/IGF snapshot como dominio de esos intents.

## Tests

Focales en `test/director-ia-m9-deltas.test.js`: intents, registry/executors, GA/GV/cross-planta/`planta_id`, happy path de las tres familias, periodos válidos/faltantes/iguales, empty, error de fuente, null/cero/división por cero, no mutación/HTTP/M19/forecast, e2e chat in-process.

Scripts afectados: capabilities (dominios legibles + `expectAllowed` de las tres preguntas), planner (intents + dominio de familia), orchestrator (tools executable).

## Resultados completos

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-m9-deltas.test.js` | **23/23 pass**, 0 fail |
| `node scripts/test-director-ia-capabilities.js` | **25/25 pass** |
| `node scripts/test-director-ia-planner.js` | **30/30 pass** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24 pass** |
| `node --test test/director-ia-*.test.js` | **459/459 pass**, 0 fail (124 suites) |
| `git diff --check` | limpio (exit 0, sin output) |
| `git status` | ver sección siguiente |

## git status

Al cierre (sin commit):

```text
On branch implementation/director-ia-m9-deltas-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   lib/director-ia-capabilities.js
  modified:   lib/director-ia-chat.js
  modified:   lib/director-ia-planner.js
  modified:   lib/director-ia-tools.js
  modified:   scripts/test-director-ia-capabilities.js
  modified:   scripts/test-director-ia-planner.js
  modified:   scripts/test-director-ia-tool-orchestrator.js
  modified:   server.js

Untracked files:
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md
  lib/director-ia-m9-deltas.js
  test/director-ia-m9-deltas.test.js
```

Solo archivos autorizados en `in_scope.writable`.

## Acciones no realizadas

- No commit / push / merge.
- No NEXT_TASK ejecutada ni autorizada.
- No se modificó `docs/director-ia/`.
- No se modificó capability matrix documental.
- No frontend, SQL, migrations, contratos, cycle.
- No HTTP interno.
- No IGF/ARR snapshot/KPIs M3 como sustituto.
- No M19.
- No forecast de ingreso con DELETE/INSERT.
- No mutaciones.
- No ampliación de authz.
- No se tocó `lib/director-ia-igf-arr.js` (el chat intercepta deltas antes del anexo IGF).

## ¿M9 queda físicamente listo para COMPLETE?

**Sí.** Las tres familias canónicas (modales de periodos reales) son consultables directamente por Director IA, con fuente/helper real, authz, periodos, nulls y separación M9/M19. La matriz documental sigue INDIRECTA hasta una tarea DOCS separada.

## NEXT_TASK propuesta (no autorizada)

`DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001`

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

## STOP
