# Reporte — IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
outcome: "DONE_PENDING_REVIEW"
slice: "wiring chat legado financial_diagnosis: IGF + ARR + M9 → assemble → una llamada OpenAI"
global_percentage: "10.5 / 20 = 52.5% (0.0 pp)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "test/director-ia-financial-diagnosis.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-context.js"
  - "lib/director-ia-ies*"
  - "lib/director-ia-reasoning*"
  - "lib/director-ia-evidence-builder.js"
  - "04-IES-STANDARD.md"
  - "05-REASONING-ENGINE.md"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "package-lock.json"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"
  - "planner / chat / tool orchestrator / IGF / ARR / M9 (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia."
```

## Resumen ejecutivo

`financial_diagnosis` en el chat legado deja de caer al early-return `delta_*` o al annex IGF/ARR exclusivo. En una sola corrida carga IGF, ARR y las tres familias M9, ensambla bloques con provenance separada y hace **una** llamada OpenAI.

El orchestrator permanece declarativo. No hay runtime IES ni Reasoning Engine. Global **10.5 / 20 = 52.5%** (0.0 pp).

NEXT_TASK (propuesta; no autorizada; no ejecutada): `DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001`.

---

## Physical gap closed

Antes: planner/tool plan = IGF + ARR + M9; runtime early-return de un delta o annex IGF/ARR; M9 no entraba junto.

Después: rama `askDirectorIa` si `intent === "financial_diagnosis"`:

```text
financial_diagnosis
  → planner (sin cambio)
  → tool plan debug (sin ejecutar)
  → loadIgfArrSourceBlocksForChat
  → loadDeltaVenta/Descuento/IngresoForChat
  → assembleFinancialDiagnosisEvidence
  → contexto de 3 bloques
  → UNA llamada OpenAI
  → respuesta
```

## Chat path

Rama insertada **después** de `duplicate_folios` y **antes** de `delta_sales`.

- GA / cross-planta GG-AD: abort 403, `openai_call_count` no aplica (no llama modelo).
- GV: IGF/ARR pueden quedar OK; M9 `SOURCE_RESTRICTED`; se responde limitado.
- OpenAI inyectable vía `chatDeps.openaiChat` (tests). Producción: el mismo `openaiDirectorIaChat` de siempre, una vez.

`openai_called: true`, `openai_call_count: 1`, `ies_runtime: false`, `reasoning_engine: false`.

## Planner alignment

Planner no se modificó. `financial_diagnosis` ya declara `arr`, `igf`, `delta_venta`, `delta_descuento`, `delta_ingreso`. Orchestrator sigue sin ejecutar.

## IGF evidence

`loadIgfArrSourceBlocksForChat` (nuevo; annex `loadIgfArrAnnexForChat` intacto):

- Authz: GA 403 abort; GV `assertGVPlantaNombreAccess`.
- Periodo real `resolveYearMonthFromQuestion` (YYYY-MM).
- Snapshot + `extractIgfComposition`. Null omitido ≠ 0.
- No fusiona venta/desc. No ingreso híbrido. No `commercial_state`.

Bloque: `status`, `plant`, `period`, `payload` (versión + composition), `source=igf.compromiso_lines`, `absence`/`error`.

## ARR evidence

Misma carga, objeto separado: `venta_ton` / `desc_kg`. Ambos null → `DATA_NOT_FOUND`. Uno null → `SOURCE_PARTIAL`. No se copia venta IGF.

## M9 evidence

Reusa `loadDeltaVentaForChat` / `loadDeltaDescuentoForChat` / `loadDeltaIngresoForChat`. Bloque agregado con `period_a` / `period_b` y sub-bloques por familia. Payloads de clientes truncados (top 3) para no desbordar contexto.

## Provenance

Tres claves: `sources.igf`, `sources.arr`, `sources.m9`. Cada una con `status`, `plant`, `period`, `payload`, `source`, `absence`, `error`. Prohibido fusionar. Una fuente no sustituye a otra.

`ABSENCE_CONFIRMED` no se emite (chat legado; Evidence Builder).

## Period alignment

No hay alineación silenciosa. `alignment.status` = `comparable` solo si el YYYY-MM de IGF/ARR aparece en el par M9 **y** IGF.month = ARR.month. Si no: `mismatch` + limitation `period_mismatch` visible en el prompt.

## Authz intersection

Cada loader conserva su authz. El diagnóstico usa la intersección más restrictiva:

| Rol | Comportamiento |
|---|---|
| GA | abort 403 (IGF/ARR y M9). Sin OpenAI. |
| GV | M9 restringido (regla vigente); IGF/ARR pueden entrar; se limita. |
| GG/AD planta fuera de `plantas_permitidas` | abort 403 (M9 RESTRICTED). |

Unauthorized ≠ missing.

## Absence / error semantics

| Señal | Uso |
|---|---|
| `null` | valor ausente; no se imprime 0 |
| `0` | valor almacenado / coerción M9 de fuente |
| `DATA_NOT_FOUND` | sin versión/fila IGF; ARR vacío; M9 sin dos periodos |
| `SOURCE_RESTRICTED` | authz |
| `SOURCE_ERROR` + `error_kind=TOOL_ERROR` | fallo de loader |
| `SOURCE_PARTIAL` | un campo null u omitted_null_keys; M9 mixto |

null ≠ 0. absence ≠ 0. error ≠ absence.

## Partial failure

Fuentes OK se conservan. La faltante/errónea queda marcada. No se fabrica evidencia. No se oculta el failure. No se aborta el diagnóstico entero por una fuente no-authz.

## OpenAI call count

Una llamada final por `financial_diagnosis`. No una por fuente. GA abort: cero llamadas.

## Routing preservation

Intents intactos (planner + ramas chat):

- `igf_status` / `arr_status` → annex OpenAI legado (sin esta rama)
- `delta_sales` / `delta_discount` / `delta_income` → early-return in-process (`openai_called: false`)
- `commercial_state`, M6, M11, M12, M18, M5, duplicados, etc.

## Semantic boundaries

Prompt: coincidencias y tensiones permitidas; **prohibido** causalidad, «IGF causó ARR», «el delta prueba la causa». No hipótesis N5 (no hay IES). No se reutiliza el addendum de «causa operativa» del annex.

## IES boundary

No se editó `04-IES-STANDARD.md`. No se importó IES Builder. No hay runtime IES. El paquete es contexto de chat legado.

## Reasoning Engine boundary

No se editó `05-REASONING-ENGINE.md`. Loaders no entran a N5. Destino = OpenAI legado.

## Tests

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-financial-diagnosis.test.js` | 21/21 pass |
| `node scripts/test-director-ia-capabilities.js` | 56/56 |
| `node scripts/test-director-ia-planner.js` | 49/49 |
| `node scripts/test-director-ia-tool-orchestrator.js` | 26/26 |
| `node --test test/director-ia-*.test.js` | 694/694 pass |
| `git diff --check` | limpio |

Focal: IGF+ARR+M9 juntos; 1 OpenAI; no early-return delta en esa rama; provenance; periodos comparable/mismatch; missing/error; partial; null/0/absence; GA abort; GV limita; cross-planta; no causalidad; otros intents; sin HTTP/writes; IES/RE sin cambios.

## Percentage

**10.5 / 20 = 52.5%**. **0.0 pp.** Matriz documental no tocada. Este slice no puntúa módulos.

## Acciones no realizadas

- No commit, push, merge.
- No `docs/director-ia/**`.
- No capability matrix.
- No `server.js`, frontend, SQL, contratos.
- No IES runtime, no RE runtime.
- No tool nueva, no HTTP interno, no writes.
- NEXT_TASK no autorizada ni ejecutada.

## Gates

- G1: intacto (`HUMAN_APPROVER` / `2026-08-23`). Solo se cambió `status`.
- G2/G3/G8: N/A.
- Rama: `implementation/director-ia-financial-diagnosis-evidence-assembly-001` ≠ `main`.
- HEAD de partida: `343fa43f Merge branch 'architecture/director-ia-financial-diagnosis-evidence-assembly-readiness-001'`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`.

## git diff --check

Limpio (exit 0, sin output).

## git status

```text
On branch implementation/director-ia-financial-diagnosis-evidence-assembly-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   lib/director-ia-chat.js
  modified:   lib/director-ia-igf-arr.js
Untracked:
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md
  lib/director-ia-financial-diagnosis.js
  test/director-ia-financial-diagnosis.test.js
```

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001**

La sync documenta la capacidad transversal. No cambia estados de módulos ni 10.5/20 = 52.5%.
