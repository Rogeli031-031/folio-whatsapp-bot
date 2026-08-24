# Reporte — DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
transversal_capability: "financial_diagnosis evidence assembly"
modules_changed: []
m7_state: "PARTIAL (sin cambio)"
m8_state: "PARTIAL (sin cambio)"
m9_state: "COMPLETE (sin cambio)"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
files_not_touched:
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "lib/"
  - "test/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-financial-diagnosis.js (lectura)"
  - "lib/director-ia-chat.js / igf-arr / m9-deltas (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario; no se redefinió arquitectura ni 04/05)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Ningún módulo cambia. 10.5/20 = 52.5%."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con el ensamblaje multi-fuente ya integrado en el chat legado.

**Path documentado:**

```text
financial_diagnosis
  → planner
  → IGF + ARR + M9
  → assembleFinancialDiagnosisEvidence
  → provenance separada
  → contexto multi-source
  → UNA llamada OpenAI
  → respuesta
```

Ningún módulo cambia de etiqueta. Global **10.5 / 20 = 52.5%** (0.0 pp).

No IES runtime. No Reasoning Engine runtime. No 04. No 05. No código.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009`.

---

## Ejecución

- Rama: `docs/director-ia-financial-diagnosis-evidence-assembly-sync-001` (≠ `main`).
- HEAD: `f7f90270 Merge branch 'implementation/director-ia-financial-diagnosis-evidence-assembly-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, runtime, tests, contratos 04/05, HTTP, writes, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001 |
| Merge | `f7f90270` |
| Capacidad | transversal `financial_diagnosis` (no es módulo M0–M20) |
| M7 / M8 / M9 | PARCIAL / PARCIAL / COMPLETA — **sin cambio** |
| M0–M20 antes | 10.5 / 20 = **52.5%** |
| M0–M20 después | 10.5 / 20 = **52.5%** |
| Efecto | **0.0 pp** |

Fórmula vigente: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0.

---

## Runtime path

Verificado en HEAD (`lib/director-ia-financial-diagnosis.js`, `lib/director-ia-chat.js`, `lib/director-ia-igf-arr.js`):

Rama `askDirectorIa` si `intent === "financial_diagnosis"` (después de `duplicate_folios`, antes de `delta_sales`):

1. `loadIgfArrSourceBlocksForChat`
2. `loadDeltaVentaForChat` / `loadDeltaDescuentoForChat` / `loadDeltaIngresoForChat`
3. `assembleFinancialDiagnosisEvidence`
4. contexto de tres bloques
5. una llamada OpenAI
6. respuesta

Orchestrator permanece declarativo (no ejecuta).

## Planner / runtime alignment

El planner **ya** declaraba `financial_diagnosis` con dominios `arr`, `igf`, `delta_venta`, `delta_descuento`, `delta_ingreso`. El gap era de wiring legado (early-return `delta_*` o annex IGF/ARR). Ese gap quedó cerrado en el IMPL y ahora está documentado. `financial_diagnosis` **no** hace early-return de un delta.

## IGF block

`loadIgfArrSourceBlocksForChat`: periodo real YYYY-MM; snapshot + composición; `source=igf.compromiso_lines`; null omitido ≠ 0. No fusiona ARR/M9. `igf_status` sigue el annex.

## ARR block

Mismo loader, objeto separado: `venta_ton` / `desc_kg`; periodo real. No se copia venta IGF. `arr_status` se preserva.

## M9 block

Reusa los tres loaders canónicos. `period_a` / `period_b`. Intents `delta_sales` / `delta_discount` / `delta_income` siguen in-process (`openai_called: false`).

## Provenance

Bloques `sources.igf` / `sources.arr` / `sources.m9`. Cada uno: `status`, `plant`, `period`, `payload`, `source`/`evidence`, `absence`/`error`. No fusionar procedencia.

## Period semantics

IGF y ARR declaran su YYYY-MM. M9 declara el par. `alignment.status` = `comparable` o `mismatch` visible. **No** alineación silenciosa.

## Authz

Authz propia por fuente; intersección **más restrictiva**. GA aborta (403, sin OpenAI). GV limita M9. Cross-planta bloqueado. Fail-closed. Unauthorized ≠ missing.

## Absence / error

Se distinguen `null`, `0`, `DATA_NOT_FOUND`, `SOURCE_*`, `TOOL_ERROR`. `ABSENCE_CONFIRMED` **no** se emite en este path. `null` ≠ `0`; ausencia ≠ `0`; error ≠ ausencia.

## Partial failure

Fuentes OK se conservan. Missing/error se marca. No se presenta evidencia parcial como diagnóstico completo. No se fabrica evidencia.

## OpenAI call count

Una llamada final. `openai_call_count = 1`. GA puede abortar **antes** de llamar (cero llamadas).

## Routing preservation

Documentado: `igf_status`, `arr_status`, `delta_sales`, `delta_discount`, `delta_income`, M6, M11, M12, M18.

## Semantic boundaries

Permitido: coincidencias, tensiones, limitaciones, comparación de hechos con cortes alineados.

Prohibido: correlación = causalidad; «IGF causó ARR»; «el delta prueba la causa»; fuente faltante = resultado neutral.

## IES boundary

Sin runtime IES. `04-IES-STANDARD.md` no se tocó.

## Reasoning Engine boundary

Sin runtime N5. `05-REASONING-ENGINE.md` no se tocó. Destino = OpenAI legado.

## Tests (ya obtenidos en el IMPL)

| Evidencia | Resultado |
|---|---|
| Focal | 21/21 |
| Suite `test/director-ia-*.test.js` | 694/694 |
| capabilities / planner / orchestrator | verdes |
| `git diff --check` (IMPL) | limpio |

Esta tarea no reejecutó tests (solo docs).

## 10.5/20 = 52.5%

**Permanece.** 0.0 pp. Ningún módulo cambia.

## Acciones no realizadas

- No código / runtime / tests.
- No 04 / 05 / Constitución.
- No HTTP interno, no writes.
- No commit, push, merge.
- NEXT_TASK no autorizada ni ejecutada.

## Gates

- G1: intacto.
- G2/G3/G8: N/A (sync de inventario de capacidades; no contrato arquitectónico nuevo).
- Solo tres archivos autorizados.

## git diff --check

Limpio (exit 0).

## git status

```text
On branch docs/director-ia-financial-diagnosis-evidence-assembly-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md
Untracked:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md
```

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009**

Repriorizar globalmente desde 52.5%, considerando módulos y oportunidades transversales. No continuar `financial_diagnosis` por inercia y no asumir M10.
