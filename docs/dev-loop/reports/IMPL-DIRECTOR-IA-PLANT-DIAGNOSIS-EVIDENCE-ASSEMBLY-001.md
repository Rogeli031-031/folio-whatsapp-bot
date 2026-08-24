# Reporte — IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
slice: >
  rama in-process plant_diagnosis en askDirectorIa:
  AR + DICF + bitácora + ARR + IGF + commercial_state SELECT-only;
  provenance de seis bloques; GA partial SOURCE_RESTRICTED;
  sin M9; sin computeDicf; una llamada OpenAI; financial_diagnosis intacto
destination: "chat legado (OpenAI existente), NO Reasoning Engine oficial N5"
g2: "N/A"
g3: "N/A"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-chat.js"
  - "test/director-ia-plant-diagnosis.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-commercial-state.js"
  - "lib/dicf.js"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

`plant_diagnosis` ya no cae al dump JSON de Action Register. `askDirectorIa` tiene rama in-process que carga **seis fuentes** en una corrida, ensambla provenance separada y hace **una** llamada OpenAI.

`commercial_state` se lee **SELECT-only** de `arr.dicf_cliente_mes`. No se llama `computeDicf` ni `loadCommercialStateForChat`. M9 **no** entra. `financial_diagnosis` se preserva.

GA ve AR/DICF/bitácora; IGF/ARR/CS quedan `SOURCE_RESTRICTED` **sin abortar el pack**.

Global: **10.5 / 20 = 52.5%** (0.0 pp).

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-plant-diagnosis-evidence-assembly-001` (≠ `main`).
- HEAD al iniciar: `7e1dbc96 Merge branch 'architecture/director-ia-plant-diagnosis-evidence-assembly-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, IES, RE, matriz, server.js.

---

## Physical gap closed

Antes: planner declaraba 6 dominios; el chat no tenía `intent === "plant_diagnosis"` y respondía con JSON de AR.

Ahora:

```text
plant_diagnosis
  → planner (ya)
  → askDirectorIa rama in-process
  → loadPlantDiagnosisForChat
      AR | DICF | bitácora | CS SELECT | IGF+ARR bloques
  → assemblePlantDiagnosisEvidence
  → buildPlantDiagnosisPrompt
  → 1× openaiDirectorIaChat
  → buildPlantDiagnosisChatResult
```

---

## Chat path / planner alignment

Llave: `directorIaPlan.intent === "plant_diagnosis"` (no `isPlantDiagnosticQuestion`).

Planner: `action_register, dicf, bitacora, arr, igf, commercial_state`. Sin `delta_*`.

Orchestrator sigue declarativo. El chat no lo ejecuta.

---

## Evidencia por fuente

| Bloque | Source | Periodo/ventana | Authz |
|---|---|---|---|
| action_register | `arr.action_register_revisions` | snapshot `as_of` + última revisión | AR (`plantas_permitidas`; ZP/AD/CF_CDMX global) |
| dicf | `arr.dicf_acciones` | fechas de acción | misma planta operativa |
| bitacora | `arr.director_ia_bitacora` | 3 meses | misma planta operativa |
| arr | `arr.proyeccion_planta` | YYYY-MM pregunta/mes CDMX | GA → `SOURCE_RESTRICTED` |
| igf | `igf.compromiso_lines` | mismo YYYY-MM que ARR | GA → `SOURCE_RESTRICTED` |
| commercial_state | `arr.dicf_cliente_mes` | year/month materializado | GA → `SOURCE_RESTRICTED`; SELECT-only |

AR: `includeNotes: false`. DICF: máx. 8, sin historial. Bitácora: 5 sesiones, sin contenido crudo. CS: conteos + top acotado. IGF/ARR: `loadIgfArrSourceBlocksForChat` (no annex fusionado).

---

## Provenance

Seis bloques con `status`, `plant`, `period`/`window`, `payload`, `source`, `absence`/`error`. No fusión de origen. `sources.m9` no existe.

---

## Period semantics

Cada fuente declara su corte. `alignment.silently_aligned = false`. `heterogeneous_windows = true`. Si YYYY-MM de IGF/ARR/CS difieren: `alignment.status = mismatch` visible en contexto.

---

## Authz / GA

- Sin planta en `plantas_permitidas` (salvo ZP/AD/CF_CDMX): **abort 403**.
- GA con planta: AR/DICF/bitácora OK; IGF/ARR/CS `SOURCE_RESTRICTED`; **no abort pack**; OpenAI sí.
- `SOURCE_RESTRICTED.absence = null` (≠ missing).
- Abort financiero de `loadIgfArrSourceBlocksForChat` se convierte en bloques restricted; no tumba el pack.

---

## Absence / partial / OpenAI

null ≠ 0. 0 de AR es conteo. Error ≠ ausencia. Una fuente no sustituye otra.

`assembly_status`: `complete` | `partial` | `empty`. El prompt prohíbe presentar parcial como completo.

`openai_call_count = 1`. No hay llamada por fuente.

---

## M9 / routing / semántica

M9 fuera: no `loadDelta*`, no bloque M9.

Preservados: `financial_diagnosis`, `igf_status`/`arr_status` (path genérico annex), `commercial_state` (listas; sigue `computeDicf` en **ese** intent), DICF focused, bitácora, AR, M5/M6/M11/M12/M18.

Prompt: riesgos/acciones/tensiones permitidos; causalidad prohibida.

---

## IES / RE

Sin cambios en `04`/`05`. Sin runtime IES/N5. Chat legado.

---

## Tests

```text
node --test test/director-ia-plant-diagnosis.test.js     21 pass
node scripts/test-director-ia-capabilities.js            56 pass
node scripts/test-director-ia-planner.js                 49 pass
node scripts/test-director-ia-tool-orchestrator.js       26 pass
node --test test/director-ia-*.test.js                   715 pass
```

---

## Percentage

**10.5 / 20 = 52.5%.** Gain **0.0 pp.** Ningún módulo cambia de estado.

---

## Acciones no realizadas

No IES/RE, no matriz, no server.js, no frontend, no SQL, no commit, no push, no merge. NEXT_TASK no ejecutada. Intent `commercial_state` (listas) no se reescribió.

## Gates

G1 intacto. G2/G3/G8 N/A.

## secrets_check

none

## git diff --check

Limpio (se confirma al cerrar).

## git status

```text
On branch implementation/director-ia-plant-diagnosis-evidence-assembly-001
 modified: docs/dev-loop/CURRENT_TASK.md
 modified: lib/director-ia-chat.js
 untracked: lib/director-ia-plant-diagnosis.js
 untracked: test/director-ia-plant-diagnosis.test.js
 untracked: docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md
```

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001**
