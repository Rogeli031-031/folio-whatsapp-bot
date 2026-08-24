# Reporte — DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
transversal_capability: "plant_diagnosis evidence assembly"
modules_changed: []
m7_state: "PARTIAL (sin cambio)"
m8_state: "PARTIAL (sin cambio)"
m9_state: "COMPLETE (sin cambio; fuera del pack)"
m11_state: "PARTIAL (sin cambio)"
m12_state: "PARTIAL (sin cambio)"
m13_state: "COMPLETE (sin cambio)"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-plant-diagnosis.js (lectura)"
  - "lib/director-ia-chat.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010"
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
plant_diagnosis
  → Action Register + DICF + bitácora + ARR + IGF + commercial_state
  → assemblePlantDiagnosisEvidence
  → provenance de seis bloques
  → UNA llamada OpenAI
  → respuesta
```

M9 **fuera**. `commercial_state` es SELECT-only. GA restringe IGF/ARR/CS sin abortar el pack. `financial_diagnosis` se preserva.

Ningún módulo cambia de etiqueta. Global **10.5 / 20 = 52.5%** (0.0 pp).

No IES runtime. No Reasoning Engine runtime. No 04. No 05. No código.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010`.

---

## Ejecución

- Rama: `docs/director-ia-plant-diagnosis-evidence-assembly-sync-001` (≠ `main`).
- HEAD: `7faa3ead Merge branch 'implementation/director-ia-plant-diagnosis-evidence-assembly-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, runtime, tests, contratos 04/05, HTTP, writes, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001 |
| Merge | `7faa3ead` |
| Capacidad | transversal `plant_diagnosis` (no es módulo M0–M20) |
| M7 / M8 / M9 / M11 / M12 / M13 | PARCIAL / PARCIAL / COMPLETA / PARCIAL / PARCIAL / COMPLETA — **sin cambio** |
| M0–M20 antes | 10.5 / 20 = **52.5%** |
| M0–M20 después | 10.5 / 20 = **52.5%** |
| Efecto | **0.0 pp** |

Fórmula vigente: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0.

---

## Runtime path

Verificado en HEAD (`lib/director-ia-plant-diagnosis.js`, `lib/director-ia-chat.js`):

Rama `askDirectorIa` si `intent === "plant_diagnosis"` (después de `financial_diagnosis`, antes de `delta_sales`):

1. `loadPlantDiagnosisForChat`
2. Action Register + DICF + bitácora + commercial_state SELECT + IGF/ARR bloques
3. `assemblePlantDiagnosisEvidence`
4. contexto de seis bloques
5. una llamada OpenAI
6. `buildPlantDiagnosisChatResult`

Orchestrator permanece declarativo (no ejecuta).

## Six-source pack

| Bloque | Tabla / origen | Periodo/ventana | Recorte |
|---|---|---|---|
| `action_register` | `arr.action_register_revisions` | snapshot `as_of` + última revisión | `includeNotes: false`; top 5 vencidas / 5 responsables |
| `dicf` | `arr.dicf_acciones` | fechas de acción | máx. 8; sin historial |
| `bitacora` | `arr.director_ia_bitacora` | 3 meses | 5 sesiones; sin contenido crudo |
| `arr` | `arr.proyeccion_planta` | YYYY-MM pregunta/mes CDMX | bloque separado; no copia venta IGF |
| `igf` | `igf.compromiso_lines` | mismo YYYY-MM que ARR | snapshot/composición; no annex híbrido |
| `commercial_state` | `arr.dicf_cliente_mes` | year/month materializado | conteos + top acotado |

M9 **no** entra. `sources.m9` no existe. `m9_included: false`.

## commercial_state SELECT-only

El pack lee `arr.dicf_cliente_mes` con SELECT. **No** llama `loadCommercialStateForChat`. **No** ejecuta `computeDicf`. **No** escribe caché.

El intent de listas `commercial_state` **se preserva** y sigue usando `computeDicf`.

## Provenance

Seis bloques: `action_register`, `dicf`, `bitacora`, `arr`, `igf`, `commercial_state`.

Cada uno conserva: `status`, `plant`, `period`/`window`, `payload`, `source`/`evidence`, `absence`/`error`.

No fusionar procedencia. Una fuente no se presenta como otra.

## Plant scope

`planta_id` común. Cross-planta bloqueado. Una fuente no amplía scope. Fail-closed.

## Period semantics

Cada fuente declara su corte real. `alignment.silently_aligned = false`. `heterogeneous_windows = true`. Si YYYY-MM de IGF/ARR/CS difieren: `alignment.status = mismatch` visible. **No** alineación silenciosa.

## Authz / GA partial restrictions / SOURCE_RESTRICTED

Authz propia por fuente; intersección restrictiva.

- Sin acceso a la planta operativa: abort 403 (sin OpenAI).
- GA con planta: AR / DICF / bitácora visibles; IGF / ARR / commercial_state = `SOURCE_RESTRICTED`; **no aborta el pack**; OpenAI sí.
- `SOURCE_RESTRICTED.absence = null` (≠ missing).
- Unauthorized ≠ missing.
- Un abort financiero de `loadIgfArrSourceBlocksForChat` se convierte en bloques restricted; no tumba el pack.

## Partial failure / assembly_status

`assembly_status`: `complete` | `partial` | `empty`.

- `complete` = las seis `SOURCE_AVAILABLE`.
- Fuentes OK se conservan.
- Restriction / missing / error visibles.
- El prompt prohíbe presentar parcial como diagnóstico completo.
- No se fabrica evidencia.

## Absence / error

Se distinguen `null`, `0`, `DATA_NOT_FOUND`, `SOURCE_RESTRICTED`, `SOURCE_*`, `TOOL_ERROR`, unauthorized.

Reglas: `null` ≠ `0`; ausencia ≠ `0`; error ≠ ausencia; `SOURCE_RESTRICTED` ≠ missing.

## OpenAI call count

Una llamada final. `openai_call_count = 1`. No hay llamada por fuente. Abort de planta puede ocurrir **antes** de llamar (cero llamadas).

## M9 boundary

M9 **fuera** del pack. No `loadDelta*`. Intents `delta_sales` / `delta_discount` / `delta_income` se preservan in-process. `financial_diagnosis` sigue incluyendo M9.

## financial_diagnosis preservation

Rama `financial_diagnosis` intacta (IGF+ARR+M9; una OpenAI). No se fusionó con `plant_diagnosis`.

## Semantic boundaries

Permitido: riesgos observables; acciones/responsables registrados; coincidencias; tensiones; limitaciones.

Prohibido: correlación = causalidad; «AR causó IGF»; «comentario DICF prueba causa»; «KPI identifica responsable».

## IES boundary

Sin runtime IES. `04-IES-STANDARD.md` no se tocó.

## Reasoning Engine boundary

Sin runtime N5. `05-REASONING-ENGINE.md` no se tocó. Destino = OpenAI legado.

## Tests (ya obtenidos en el IMPL)

| Evidencia | Resultado |
|---|---|
| Focal | 21/21 |
| Suite `test/director-ia-*.test.js` | 715/715 |
| capabilities / planner / orchestrator | 56 / 49 / 26, verdes |
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
- G2: N/A (inventario de runtime ya integrado; no redefinición arquitectónica).
- G3: N/A.
- G8: N/A.
- G5: pendiente de HUMANO.

## secrets_check

none

## git diff --check

Se confirma al cerrar.

## git status

Se confirma al cerrar (solo los tres archivos autorizados de esta tarea).

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010**

Repriorizar globalmente desde 52.5%, considerando módulos y oportunidades transversales. No continuar `plant_diagnosis` por inercia y no asumir M10.
