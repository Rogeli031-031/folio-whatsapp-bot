# Reporte — DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
m18_state_before: "NO INTEGRADA"
m18_state_after: "PARTIAL"
m18_complete: false
global_before: "9.5 / 20 = 47.5%"
global_after: "10.0 / 20 = 50.0%"
gain_pp: 2.5
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-m18-presupuesto-semanal.js (lectura)"
  - "lib/director-ia-chat.js, tools, planner, capabilities (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M18; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M18 = PARTIAL. M18 != COMPLETE. Cheques/Twilio/WhatsApp/writes siguen fuera."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con la query read-only de M18 ya integrada en `main`.

**M18 pasa de NO INTEGRADA a PARTIAL.** No se marcó COMPLETE. El propósito canónico sigue incluyendo operación del carro, envío a cheques y WhatsApp.

**Porcentaje global: 9.5 / 20 = 47.5% → 10.0 / 20 = 50.0%** (+2.5 pp).

Director IA consulta el carro semanal por planta: asignado / seleccionado / disponible / folios / urgentes. Semana no inventada. Lookup sin filtrar solo `ABIERTO`. Authz fail-closed.

Cheques, Twilio, WhatsApp y writes **siguen fuera**. Ningún otro módulo cambió de etiqueta.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004`.

---

## Ejecución

- Rama: `docs/director-ia-m18-capability-matrix-sync-001` (≠ `main`).
- HEAD: `719b3eaa Merge branch 'implementation/director-ia-m18-presupuesto-semanal-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001 |
| Merge | `719b3eaa` |
| Estado matriz M18 antes | NO INTEGRADA (0.0) |
| Estado matriz M18 después | PARTIAL (0.5) |
| Global antes | **9.5 / 20 = 47.5%** |
| Global después | **10.0 / 20 = 50.0%** |
| Ganancia | +2.5 pp |

---

## Implementación M18 verificada

Path físico en `main` / HEAD:

```text
budget_status
  → get_budget_status (available_on_demand, executor loadPresupuestoSemanalForChat)
  → loadPresupuestoSemanalForChat
  → SELECT public.presupuestos_semanales (planta + semana_inicio + semana_fin; sin estatus=ABIERTO)
  → SELECT public.presupuesto_folios
  → computeResumen (= getPresupuestoResumen)
  → evidencia / respuesta
```

| Hecho | Evidencia |
|---|---|
| Semana explícita | `resolveWeek` fechas `YYYY-MM-DD` / `DD/MM/AAAA` |
| `getCurrentWeekMexico()` | Solo «esta semana», «semana actual», «mi presupuesto», `presupuesto semanal` |
| No inventar semana | `missing_week` / clarificar |
| No solo ABIERTO | SQL sin filtro de estatus |
| asignado | `monto_asignado` |
| seleccionado | suma de `presupuesto_folios.importe` |
| disponible | `Math.max(0, asignado - seleccionado)` |
| urgente | `/urgente/i` en `prioridad` |
| Authz | `assertFolioStatusAccess` + `requirePlantaId`; GV 403; GA en planta; cross-planta 403 |
| Fuera | `presupuesto_asignacion_detalle`; cheques; Twilio; WhatsApp; INSERT/UPDATE/DELETE |

---

## Estado antes / después

| Módulo | Antes | Después |
|---|---|---|
| M18 | NO INTEGRADA | **PARTIAL** |
| Resto M0–M20 | sin cambio | sin cambio |

**M18 != COMPLETE.**

---

## Recálculo

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0.

| Grupo | Módulos | Puntos |
|---|---|---|
| COMPLETE | M3, M9, M13, M16 | 4.0 |
| PARTIAL | M0, M1, M2, M4, M6, M7, M8, M11, M12, M17, **M18** | 5.5 |
| INDIRECTA | M20 | 0.5 |
| NO INTEGRADA | M5, M10, M14, M15, M19 | 0.0 |
| **Total** | 20 | **10.0** |

**10.0 / 20 = 50.0%** (antes 9.5 / 20 = 47.5%).

---

## Cambios exactos en matriz

- Ficha M18: NO INTEGRADA → PARTIAL; path, fórmulas, semana, authz, fronteras.
- Fuente «Presupuestos semanales»: PARCIAL; `loadPresupuestoSemanalForChat`.
- Pregunta #17: Sí / PARCIAL.
- Superficie chat: añade `loadPresupuestoSemanalForChat`.
- Prioridad lectura: **Hecha (PARTIAL)**.
- Hallazgo 10: ya no bloquea la query; sí writes/cheques/WhatsApp.
- Parte 9: M18 en PARCIAL; writes/cheques/WhatsApp en NO INTEGRADA residual; capacidad CONSULTAR carro.
- Ningún otro módulo cambió de cobertura.

---

## Tests (evidencia del IMPL)

| Suite | Resultado |
|---|---|
| Focal M18 | 24/24 |
| capabilities | 46 |
| planner | 40 |
| orchestrator | 24 |
| suite Director IA | 599/599 |
| git diff --check (IMPL) | limpio |

Esta tarea no reejecuta tests (solo docs).

---

## Acciones no realizadas

- No código, runtime, tests, frontend, SQL, contratos.
- No cheques, Twilio, WhatsApp, writes.
- No commit / push / merge.
- No se autorizó ni ejecutó la NEXT_TASK.
- M18 no se marcó COMPLETE.

## Gates

G1 autorizado. G2/G3/G8 N/A (inventario; no contrato nuevo).

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch docs/director-ia-m18-capability-matrix-sync-001
 M docs/dev-loop/CURRENT_TASK.md
 M docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md
```

Solo los tres archivos autorizados.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004`

Priorizar desde 50.0%. No continuar M18 por inercia. No elegir M12 solo por haber sido segundo.

## STOP
