# Reporte — DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
m4_state_before: "NO INTEGRADA"
m4_state_after: "PARTIAL"
m4_complete: false
global_before: "9.0 / 20 = 45.0%"
global_after: "9.5 / 20 = 47.5%"
gain_pp: 2.5
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "lib/"
  - "server.js"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-m4-clasificacion-query.js (lectura)"
  - "lib/director-ia-chat.js, tools, planner, capabilities (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M4; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M4 = PARTIAL. M4 != COMPLETE. COMPARAR/Excel siguen fuera."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con la query read-only de M4 ya integrada en `main`.

**M4 pasa de NO INTEGRADA a PARTIAL.** No se marcó COMPLETE. El propósito canónico sigue incluyendo COMPARAR y reconciliación Excel.

**Porcentaje global: 9.0 / 20 = 45.0% → 9.5 / 20 = 47.5%** (+2.5 pp).

Director IA compara `mes_a` vs `mes_b` para GASTOS / INVERSIONES / TALLER. `YYYY-MM` obligatorio, A ≠ B, planta autorizada, sin fallback a 6 plantas. El delta es factual; no implica causa ni desviación presupuestal.

COMPARAR, Excel/xlsx y writes **siguen fuera**. Ningún otro módulo cambió de etiqueta.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003`.

---

## Ejecución

- Rama: `docs/director-ia-m4-capability-matrix-sync-001` (≠ `main`).
- HEAD: `2c240407 Merge branch 'implementation/director-ia-m4-clasificacion-query-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001 |
| Merge | `2c240407` |
| Estado matriz M4 antes | NO INTEGRADA (0.0) |
| Estado matriz M4 después | **PARTIAL** (0.5) |
| M0–M20 antes | 9.0 / 20 = **45.0%** |
| M0–M20 después | 9.5 / 20 = **47.5%** |
| Efecto | **+2.5 pp** |

Fórmula vigente: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0.

---

## Implementación M4 verificada

Path físico:

```text
clasificacion_apoyos_query
  → get_clasificacion_apoyos_query
  → loadClasificacionApoyosForChat
  → SELECT public.folios + buildClasificacionMatrix
  → evidencia
  → respuesta
```

Verificado en:

- `lib/director-ia-m4-clasificacion-query.js` (`loadClasificacionApoyosForChat`, SELECT, `buildClasificacionMatrix`)
- `lib/director-ia-planner.js` (intent `clasificacion_apoyos_query`)
- `lib/director-ia-tools.js` (`executor: loadClasificacionApoyosForChat`)
- `lib/director-ia-chat.js` (rama in-process antes de OpenAI/M6)
- `lib/director-ia-capabilities.js` (`canRead: true`, coverage partial)

No se llama `buildClasificacionApoyosWorkbook`. No POSTs COMPARAR. No HTTP interno. No writes. No `resolvePlantasComparativo` (no fallback a 6 plantas).

---

## Estado antes / después

| Superficie | Antes | Después |
|---|---|---|
| Ficha M4 | NO INTEGRADA | **PARTIAL** |
| COMPLETE M4 | no | **sigue no** |
| Query `mes_a` vs `mes_b` | no | sí |
| GASTOS / INVERSIONES / TALLER | no | sí (separados) |
| COMPARAR / Excel / writes | fuera | **siguen fuera** |
| Otros módulos | — | **sin cambio de etiqueta** |

---

## Query / familias / source / periodos / planta / authz / semántica

| Regla | Documentada |
|---|---|
| `mes_a` / `mes_b` | obligatorios, `YYYY-MM`, A ≠ B; no defaults |
| Familias | GASTOS, INVERSIONES, TALLER separados |
| Source | `public.folios` + `buildClasificacionMatrix` |
| Planta | autorizada; `plantas_permitidas`; cross-planta 403; **sin fallback a 6 plantas** |
| Authz | JWT, rol, GV 403, GA solo con grupo completo, privados excluidos |
| Semántica | delta factual; no causa / problema / mejora / cumplimiento / desviación presupuestal / responsable |
| COMPARAR / Excel / writes | **fuera** |

---

## Tests reportados (IMPL, no reejecutados aquí)

| Suite | Resultado reportado |
|---|---|
| Focal M4 | 18/18 |
| capabilities | 42 |
| planner | 39 |
| orchestrator | 24 |
| `test/director-ia-*.test.js` | 575/575 |
| `git diff --check` (IMPL) | limpio |

---

## Recálculo 9.0/20 → 9.5/20 (desde fichas)

Suma independiente de las 21 fichas M0–M20 **después** de cambiar solo M4:

| Etiqueta | Módulos | Puntos |
|---|---|---|
| COMPLETA (1.0) | M3, M9, M13, M16 | 4.0 |
| PARCIAL (0.5) | M0, M1, M2, **M4**, M6, M7, M8, M11, M12, M17 | 5.0 |
| INDIRECTA (0.5) | M20 | 0.5 |
| NO INTEGRADA (0.0) | M5, M10, M14, M15, M18, M19 | 0.0 |

Total: **9.5 / 20 = 47.5%**. Antes M4 valía 0.0 → 9.0. Ningún otro módulo cambió de etiqueta.

---

## Cambios exactos en matriz

- Ficha M4: NO INTEGRADA → PARTIAL; source, periodos, planta, authz, semántica, scoring 47.5%.
- Fuente «Clasificación de apoyos»: path `loadClasificacionApoyosForChat`.
- Parte 1 superficie chat: añade M4.
- Parte 4: pregunta adicional del comparativo `mes_a` vs `mes_b`.
- Parte 7: query marcada hecha (PARTIAL); COMPARAR/Excel siguen fuera.
- Parte 9: M4 en PARCIAL; COMPARAR/Excel como hueco de COMPLETE; capacidad COMPARAR matriz; apéndice `lib/director-ia-m4-clasificacion-query.js`.

No se cambió la etiqueta de M0–M3, M5–M20.

---

## Acciones no realizadas

- No se modificó código, tests, runtime, frontend, SQL, schema, contratos.
- No se marcaron COMPLETE ni se integró COMPARAR/Excel.
- No commit / push / merge.
- No se autorizó ni ejecutó `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003`.

## Gates

| Gate | Esta sync |
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

Al cierre (sin commit):

```text
On branch docs/director-ia-m4-capability-matrix-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md
```

Solo los tres archivos autorizados.

## NEXT_TASK

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003`

Debe priorizar el siguiente frente global desde el baseline **47.5%**, por valor ejecutivo. No continuar M4 por inercia. No asumir M18. Este reporte no autoriza ni ejecuta esa tarea.

## Confirmación expresa

- **M4 = PARTIAL**
- **M4 != COMPLETE**
- **9.5 / 20 = 47.5%**
- **COMPARAR/Excel siguen fuera**
- **Ningún otro módulo cambió**

## STOP
