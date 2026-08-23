# Reporte — IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001"
outcome: "DONE_PENDING_REVIEW"
slice_label: "PARTIAL"
complete: false
m6_state_after_impl: "PARTIAL"
documentary_percentage_changed: false
future_sync_percentage: 45.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "lib/director-ia-m6-gastos-inversiones.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m6-gastos-inversiones.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "capability matrix"
  - "frontend-dashboard/"
  - "sql/"
  - "migrations"
  - "schema"
  - "server.js"
  - "lib/categoria-rango-excel.js"
  - "lib/director-ia-igf-arr.js"
  - "package.json"
  - "lockfiles"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3: no."
  - "Esta IMPL no cambia 42.5% documental."
  - "La sync futura debe llevar M6 a PARTIAL y 9.0/20 = 45.0%. No marcar COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

Director IA consulta **GASTOS** e **INVERSIONES** de folios por planta y periodo `YYYY-MM` mediante un path **SELECT-only e in-process**.

Fuente: `public.folios` + `expandCategoriaRows`. **No** Excel. **No** xlsx. **No** HTTP interno. **No** writes.

Las dos categorías permanecen separadas. IGF (M7) no se usa como fallback y M6 no absorbe «cómo van los gastos».

**M6 queda PARTIAL, no COMPLETE.** Export sigue fuera. Esta IMPL **no** cambia 8.5/20 = **42.5%**. La sync documental futura debe llevar **9.0/20 = 45.0%**.

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-m6-gastos-inversiones-001` (≠ `main`).
- HEAD al arranque: `24605863 Merge branch 'architecture/director-ia-m6-gastos-inversiones-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`.

---

## Source `public.folios` + `expandCategoriaRows`

`loadGastosInversionesForChat(category)` copia el SELECT del GET `/categoria-rango-excel` (sin workbook):

- `id`, `numero_folio`, `planta_id`, `beneficiario`, `subcategoria`, `concepto`, `importe`, `detalle_lineas`, `mes_cargo`, `estatus`
- predicado físico **GASTOS xor INVERSIONES**
- `estatus <> CANCELADO`
- `mes_cargo` en el rango `YYYY-MM` pedido
- `planta_id` obligatorio + equivalentes
- `ventanaDefault: false`
- privados excluidos (equivalente a GET sin `priv_clave`)

Después: `expandCategoriaRows` (líneas o `f.importe`; importe 0 omitido). **No** se llama `buildCategoriaRangoWorkbook`.

---

## GASTOS vs INVERSIONES

| Categoría | Predicado | Intent | Tool | Loader |
|---|---|---|---|---|
| GASTOS | `GASTOS` / `%GASTO%` y no `%TALLER%` ni `%INVERSION%` | `expense_analysis` | `get_expense_analysis` | `loadGastosInversionesForChat("GASTOS")` |
| INVERSIONES | `INVERSIONES` / `%INVERSION%` | `investment_analysis` | `get_investment_analysis` | `loadGastosInversionesForChat("INVERSIONES")` |

No se mezclan filas. Taller AT (M5) queda fuera: tool `get_taller_at_analysis` sigue `declared_not_integrated`.

---

## Period semantics

- `YYYY-MM` obligatorio. Un mes o rango de dos. Invertidos se intercambian.
- Ausencia o `2026-13` → 400 / clarificación. **No** se inventa mes actual.
- 0 filas = «no hay registros…», no error ficticio.
- No hay comparación A vs B ni desviación.

---

## Plant scope / authz

- `planta_id` obligatorio.
- `assertFolioStatusAccess`: GV 403; GA permitido en `plantas_permitidas`; cross-planta 403.
- **No** se usa `assertM3KpisAccess` (bloqueo GA de KPIs IGF).
- Fail-closed: sin planta, sin permiso, o `plantas_permitidas` vacía/ajena.

---

## Planner / tools / chat

- Intents `expense_analysis` / `investment_analysis` conservados; listado de folios GASTOS ya no cae a `folio_status`.
- «cómo van los gastos» sigue `financial_diagnosis` + clarificación IGF vs folios.
- Tools: executor `loadGastosInversionesForChat`; `available_on_demand`; read-only.
- Capabilities `gastos` / `inversiones`: `canRead: true`, `coverage: partial`. Export sigue bloqueado por `UNSUPPORTED_RULES`.
- Chat: rama in-process **después** de `detectUnsupported` y **antes** de OpenAI / `shouldAttachIgfArrAnnex`.

---

## IGF collision

| Frase | Resultado |
|---|---|
| listar gastos de folios `YYYY-MM` | M6 GASTOS |
| qué inversiones hay `YYYY-MM` | M6 INVERSIONES |
| cómo van los gastos / margen / rentabilidad | IGF (M7), no M6 |
| exportar excel de gastos/inversiones | `SOURCE_NOT_INTEGRATED` |
| taller por AT | `SOURCE_NOT_INTEGRATED` (M5) |

`PLANT_FINANCIAL_KPI_RE` no se modificó. No hay fallback IGF↔M6.

---

## Excel boundary / no side effects

| Superficie | ¿En el slice? |
|---|---|
| SELECT + `expandCategoriaRows` | sí |
| `buildCategoriaRangoWorkbook` / xlsx / GET excel | **no** |
| HTTP interno / writes / `server.js` | **no** |
| Export / COMPLETE | **fuera** |

---

## Tests

```text
node --test test/director-ia-m6-gastos-inversiones.test.js   # 24 pass
node scripts/test-director-ia-capabilities.js               # 38 pass
node scripts/test-director-ia-planner.js                    # 37 pass
node scripts/test-director-ia-tool-orchestrator.js          # 24 pass
node --test test/director-ia-*.test.js                      # 557 pass
git diff --check                                            # limpio
```

Cubre: GASTOS/INVERSIONES por planta y mes; separación; partida; importe; múltiples/cero; totales; nulls; periodo inválido/ausente; authz GA/GV/cross-planta/`plantas_permitidas`; intents; executors; chat; IGF; no Excel; no HTTP; no writes.

---

## Estado M6 / porcentaje futuro

| | Esta IMPL | Tras sync documental (si se autoriza) |
|---|---|---|
| M6 runtime | **PARTIAL** (query JSON) | PARTIAL |
| M6 COMPLETE | **no** (Export fuera) | **sigue no** |
| Global documental | **42.5%** (8.5/20) intacto | **45.0%** (9.0/20) |

---

## Acciones no realizadas

- No se tocó `docs/director-ia/`, matriz, frontend, SQL, schema, migrations, `server.js`.
- No se generó Excel. No HTTP interno. No writes.
- No se cambió 42.5% documental.
- No commit / push / merge.
- No se autorizó ni ejecutó `DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001`.

## Gates

| Gate | Esta IMPL |
|---|---|
| G1 | vigente (humano) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit): solo archivos de `in_scope` (CURRENT_TASK, este reporte, loader M6, capabilities/chat/planner/tools, scripts de test, test M6).

## NEXT_TASK

`DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001`

Debe documentar M6 **PARTIAL** (no COMPLETE) y recalcular 8.5/20 → 9.0/20 = **45.0%**. Este reporte no autoriza ni ejecuta esa tarea.

## STOP
