# Reporte — DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
m7_state_before: "PARTIAL"
m7_state_after: "PARTIAL"
m7_complete: false
global_before: "10.0 / 20 = 50.0%"
global_after: "10.0 / 20 = 50.0%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "lib/"
  - "server.js"
  - "igf-handler.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-igf-arr.js (lectura)"
  - "lib/director-ia-tools.js, planner, capabilities (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M7; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M7 = PARTIAL. M7 != COMPLETE. 10.0/20 = 50.0% no cambia."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con la profundización de **composición IGF** de M7 ya integrada (merge `05eb54c4`).

**M7 permanece PARTIAL.** No se marcó COMPLETE. No se volvió a sumar 0.5.

**Porcentaje global: 10.0 / 20 = 50.0%** (0.0 pp).

Director IA consulta, en un snapshot único, las líneas observadas de **una** fila de `igf.compromiso_lines` (planta + versión + mes). `*_kg` = $/kg. Null ≠ 0. Signo físico preservado. `hg_kg` no invertido. `gasto_kg` no entra a la fórmula. `recalcularUtilYResultado` no se ejecuta. Sin overlay de folios. `ORDER_DELTAS` es solo presentación UI. Composición ≠ causalidad. M9 conserva los deltas temporales.

Ningún otro módulo cambió de etiqueta.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007`.

---

## Ejecución

- Rama: `docs/director-ia-m7-igf-composition-sync-001` (≠ `main`).
- HEAD: `05eb54c4 Merge branch 'implementation/director-ia-m7-igf-composition-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, contratos, SQL, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001 |
| Merge | `05eb54c4` |
| Estado M7 antes | PARTIAL |
| Estado M7 después | **PARTIAL** |
| COMPLETE | **no** |
| Global | **10.0 / 20 = 50.0%** (sin cambio) |
| pp | **0.0** |

---

## Implementación verificada / path físico

Verificado en el árbol actual (`lib/director-ia-igf-arr.js`, planner/tools):

```text
igf_status / financial_diagnosis
  → get_igf_snapshot
  → loadIgfArrAnnexForChat
  → loadIgfCommitSnapshot
  → extractIgfComposition
  → bloque acotado
  → evidencia
```

`loadIgfCommitSnapshot` resuelve una versión GLOBAL del mes (`ORDER BY version_number DESC LIMIT 1`) y `SELECT *` de `igf.compromiso_lines`. `findIgfRowForPlant` deja **una** fila. `extractIgfComposition` no combina filas.

---

## FUENTE

| Regla | Documentada |
|---|---|
| Fuente | `igf.compromiso_lines` |
| Cardinalidad | una fila: planta + versión + mes |

---

## UNIDADES

| Regla | Documentada |
|---|---|
| `*_kg` | **$/kg**, no kilogramos |
| Familias | `ton` ≠ `$/kg` ≠ `%` ≠ `MXN` |
| Mezcla | no mezclar ni sumar unidades incompatibles |
| Ranking | solo intra `$/kg` de roles `add`/`subtract` |

---

## NULL

| Regla | Documentada |
|---|---|
| Distinción | `null` ≠ `0` |
| Preservación | null/`""`/no finito se omite (`omitted_null_keys`); no se emite como cero |

---

## SIGNOS

| Regla | Documentada |
|---|---|
| Signo | físico almacenado |
| `hg_kg` | no invertido |

---

## FÓRMULA

| Regla | Documentada |
|---|---|
| `recalcularUtilYResultado` | referencia semántica de `formula_role`; **no** se ejecuta |
| `gasto_kg` | `formula_role: none`; no participa en la fórmula |
| Overlay | no overlay de folios |

---

## ORDER_DELTAS

Presentación UI. No se importa. No es fórmula.

---

## SEMÁNTICA

composición ≠ causalidad; magnitud ≠ importancia operacional; línea ≠ responsable; snapshot ≠ tendencia; signo ≠ juicio empresarial.

Copy permitido (runtime): «aparece en el snapshot», «entra en la composición con +/−», «mayor magnitud dentro de $/kg».

Prohibido: causa, problema, responsable, prioridad.

---

## M9

M9 sigue siendo el dominio de deltas temporales. `isIgfCompositionQuestion` es false ante «cómo cambió venta/descuento/ingreso». M7 composition **no** crea deltas.

---

## RUNTIME / AUTHZ

Read-only. In-process. Sin HTTP interno. Sin writes.

Authz IGF vigente del annex: JWT/contexto; GA 403; GV planta; cross-planta bloqueado; fail-closed.

---

## Tests (evidencia del IMPL; no reejecutados)

| Suite | Resultado |
|---|---|
| Focales | 13/13 |
| Capabilities | 52/52 |
| Planner | 46/46 |
| Orchestrator | 26/26 |
| Suite Director IA | 657/657 |
| `git diff --check` | limpio |

---

## Cambios exactos en matriz

- Parte 1: chat on-demand incluye `extractIgfComposition` sobre 1 fila.
- Ficha **M7**: slice de composición documentado; cobertura **sigue PARCIAL**; scoring **50.0% sin cambio**.
- Catálogo **Fuente: IGF**: 1 fila, unidades, null, signos, `gasto_kg`, no recálculo, no overlay, `ORDER_DELTAS` = UI, frontera M9.
- Pregunta 7 y pregunta adicional: composición de utilidad/resultado IGF (no es M9).
- Parte 9: resumen, línea PARCIAL M7, residual NO INTEGRADA (UI/PATCH/meta Excel/versiones/overlay/recálculo), capacidad reutilizable.

**Ningún otro módulo** cambió de COMPLETE / PARTIAL / INDIRECTA / NO INTEGRADA.

---

## Acciones no realizadas

- No código, runtime, tests, contratos, SQL, recálculo, overlay, deltas nuevos, causalidad.
- No commit / push / merge.
- No se autorizó ni ejecutó `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007`.
- No se marcó M7 COMPLETE. No se sumó 0.5.

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch docs/director-ia-m7-igf-composition-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001.md
```

Solo los tres archivos autorizados.

## Confirmación expresa

- **M7 = PARTIAL**
- **M7 != COMPLETE**
- Composición IGF documentada
- **10.0 / 20 = 50.0%**
- Ningún otro módulo cambió

## NEXT_TASK

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007` (propuesta; no autoriza G1 ni encadena). Repriorizar globalmente desde 50.0%. No asumir M5 por haber sido segundo en la priorización anterior.

## STOP
