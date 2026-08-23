# Reporte — DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
m6_state_before: "NO INTEGRADA"
m6_state_after: "PARTIAL"
m6_complete: false
global_before: "8.5 / 20 = 42.5%"
global_after: "9.0 / 20 = 45.0%"
gain_pp: 2.5
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-m6-gastos-inversiones.js (lectura)"
  - "lib/director-ia-chat.js, tools, planner, capabilities (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M6; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M6 = PARTIAL. M6 != COMPLETE. Export/xlsx siguen fuera."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con la query read-only de M6 ya integrada en `main`.

**M6 pasa de NO INTEGRADA a PARTIAL.** No se marcó COMPLETE. El propósito canónico sigue incluyendo Export.

**Porcentaje global: 8.5 / 20 = 42.5% → 9.0 / 20 = 45.0%** (+2.5 pp).

GASTOS ≠ INVERSIONES ≠ IGF. `YYYY-MM` obligatorio. 0 filas válido. Authz de folios. Sin Excel, sin HTTP interno, sin writes.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002`.

---

## Ejecución

- Rama: `docs/director-ia-m6-capability-matrix-sync-001` (≠ `main`).
- HEAD: `7b8e8bdf Merge branch 'implementation/director-ia-m6-gastos-inversiones-001'`.
- M6 en `origin/main`: `lib/director-ia-m6-gastos-inversiones.js` presente (`2d145056`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001 |
| Merge en main | `7b8e8bdf` / `2d145056` |
| Estado matriz M6 antes | NO INTEGRADA (0.0) |
| Estado matriz M6 después | **PARTIAL** (0.5) |
| M0–M20 antes | 8.5 / 20 = **42.5%** |
| M0–M20 después | 9.0 / 20 = **45.0%** |
| Efecto | **+2.5 pp** |

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0.

---

## Implementación M6 verificada

Path físico en main:

```text
expense_analysis | investment_analysis
  → get_expense_analysis | get_investment_analysis
  → loadGastosInversionesForChat("GASTOS"|"INVERSIONES")
  → SELECT public.folios + expandCategoriaRows
  → evidencia
  → respuesta
```

Verificado en:

- `lib/director-ia-m6-gastos-inversiones.js`
- `lib/director-ia-chat.js` (ramas in-process antes de OpenAI/IGF)
- `lib/director-ia-tools.js` (`executor: loadGastosInversionesForChat`)
- `lib/director-ia-planner.js` / `lib/director-ia-capabilities.js`

No se llama `buildCategoriaRangoWorkbook`. No HTTP interno. No writes.

---

## Estado antes / después

| Superficie | Antes | Después |
|---|---|---|
| Ficha M6 | NO INTEGRADA | **PARTIAL** |
| COMPLETE M6 | no | **sigue no** |
| Export/xlsx | fuera | **sigue fuera** |
| GASTOS query | no | sí (folios, `YYYY-MM`) |
| INVERSIONES query | no | sí (folios, `YYYY-MM`) |
| IGF (M7) | PARCIAL | **sin cambio de etiqueta** |

---

## GASTOS / INVERSIONES / source / periodo / IGF / authz / Export

| Regla | Documentada |
|---|---|
| GASTOS ≠ INVERSIONES | predicados e intents separados |
| M6 ≠ IGF | «cómo van los gastos» / margen / rentabilidad siguen M7 |
| Periodo | `YYYY-MM` obligatorio; no se inventa mes |
| 0 filas | respuesta válida |
| Authz | JWT, rol, `planta_id`, `plantas_permitidas`, GV 403, GA en planta, cross-planta 403, fail-closed |
| Export / Excel / xlsx | **fuera** |
| HTTP interno / writes | **no** |

---

## Tests reportados (IMPL, no reejecutados aquí)

| Suite | Resultado reportado |
|---|---|
| Focal M6 | 24/24 |
| capabilities | verde (38/38) |
| planner | verde (37/37) |
| orchestrator | verde (24/24) |
| `test/director-ia-*.test.js` | 557/557 |
| `git diff --check` (IMPL) | limpio |

---

## Recálculo 8.5/20 → 9.0/20 (desde fichas)

Suma independiente de las 21 fichas M0–M20 **después** de cambiar solo M6:

| Etiqueta | Módulos | Puntos |
|---|---|---|
| COMPLETA (1.0) | M3, M9, M13, M16 | 4.0 |
| PARCIAL (0.5) | M0, M1, M2, **M6**, M7, M8, M11, M12, M17 | 4.5 |
| INDIRECTA (0.5) | M20 | 0.5 |
| NO INTEGRADA (0.0) | M4, M5, M10, M14, M15, M18, M19 | 0.0 |

Total: **9.0 / 20 = 45.0%**. Antes M6 valía 0.0 → 8.5. Ningún otro módulo cambió de etiqueta.

La nota «gastos → IGF» permanece como colisión lingüística, **no** como score INDIRECTA de M6 (evitaría doble conteo).

---

## Cambios exactos en matriz

- Ficha M6: NO INTEGRADA → PARTIAL; source, authz, limitaciones, scoring 45.0%.
- Fuentes Gastos / Inversiones: path `loadGastosInversionesForChat`.
- Parte 4 #15 / #16: PARCIAL (query); Export y «pendiente» fuera.
- Parte 1 superficie chat: añade M6.
- Parte 7: query marcada hecha (PARTIAL); Export sigue fuera.
- Parte 8 #2: routing IGF vs M6 actualizado.
- Parte 9: M6 en PARCIAL; Export en NO INTEGRADA como hueco de COMPLETE; capacidades CONSULTAR GASTOS/INVERSIONES; apéndice `lib/director-ia-m6-gastos-inversiones.js`.

No se cambió la etiqueta de M0–M5, M7–M20.

---

## Acciones no realizadas

- No se modificó código, tests, runtime, frontend, SQL, schema.
- No se marcaron COMPLETE ni se integró Export.
- No commit / push / merge.
- No se autorizó ni ejecutó `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002`.

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
On branch docs/director-ia-m6-capability-matrix-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md
```

Solo los tres archivos autorizados.

## NEXT_TASK

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002`

Debe priorizar el siguiente frente global desde el baseline **45.0%**, por valor ejecutivo, sin asumir M4 ni otro módulo. Este reporte no autoriza ni ejecuta esa tarea.

## Confirmación expresa

- **M6 = PARTIAL**
- **M6 != COMPLETE**
- **9.0 / 20 = 45.0%**
- **Export/Excel/xlsx siguen fuera**

## STOP
