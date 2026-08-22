# Reporte — IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
  - "lib/director-ia-m3-plantas-kpis-proyectos.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-planner.js"
  - "server.js"
  - "test/director-ia-m3-plantas-kpis-proyectos.test.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "sql/"
  - "lib/director-ia-real-cycle.js"
  - "package.json"
  - "package-lock.json"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix documental no se modifica en esta tarea."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

M3 quedó **físicamente listo para COMPLETE** como consulta read-only in-process:

- **Plantas:** scope existente (`planta_id` + `nombre`/`clave` en evidencia). Sin catálogo global.
- **KPIs:** `GET /api/dashboard/kpis` consultable desde Director IA vía `loadDashboardKpisForChat` / `get_dashboard_kpis`.
- **Proyectos:** listado `public.proyectos` vía `loadProyectosForChat` / `get_project_status`.

No hay HTTP interno, mutaciones, cycle, UI, endpoint nuevo ni cambio de matriz documental.

## Autorización y gates

- Rama: `implementation/director-ia-m3-plantas-kpis-proyectos-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T22:42:16-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M3 — Plantas / KPIs / Proyectos |
| Estado de matriz | PARTIAL (no modificado) |
| M0–M20 | 37.5% (el +2.5 pp queda para el sync documental) |
| Readiness | ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001 |

## Implementación KPIs

- Extraídos a `lib/director-ia-m3-plantas-kpis-proyectos.js`: `parseDashboardFilters`, `getMesActualYAnteriorMx`, `buildDashboardWhere`, `queryDashboardKpis`.
- `server.js` reutiliza esas funciones; el JSON de `GET /api/dashboard/kpis` no cambia de contrato.
- Loader aplica ventana default del dashboard (`ventana=1`) y documenta filtros en `filters_applied`.
- Shape canónico: `total_activos`, `total_mxn`, `pendientes_zp`, `avg_aging`, `oldest`, `top_planta`, `top_categoria`.
- Nulls de `avg_aging` / `oldest` / `top_*` se preservan. `total_mxn` conserva el `COALESCE` de la fuente.

## Implementación Proyectos

- Extraídos `listarProyectosPorPlanta` y `listarProyectosPorPlantaOEquivalentes`.
- `server.js` delega en esos helpers (contrato HTTP de `GET /api/dashboard/proyectos` intacto).
- `get_project_status`: `available_on_demand` + executor `loadProyectosForChat`.
- Campos: id, codigo, nombre, fecha_inicio, fecha_cierre_estimada, estatus, aprobado_zp.
- `cierre_estimado_vencido_derivado` se declara explícitamente como derivado; no se afirma estatus «retrasado».
- Colisión con Action Register: el planner sigue pidiendo clarificación; el chat responde sin OpenAI y no mezcla fuentes.

## Plantas

Sin catálogo global. La evidencia M3 reusa la identidad ya autorizada: `planta_id`, `nombre`, `clave`.

## Authz

| Rol / caso | KPIs | Proyectos |
|---|---|---|
| GA | 403 | permitido si la planta está en scope (igual que dashboard GET, más planta) |
| GV | 403 | 403 (más restrictivo que el gap del GET dashboard) |
| GG/GA/AD + `plantas_permitidas` | no cruza planta | no cruza planta |
| JWT + `planta_id` | obligatorio | obligatorio |

No se aprovechó el gap de `GET /api/dashboard/proyectos` (ese HTTP sigue sin `assertPlantaPermitidaDashboard`; Director IA sí revalida).

## Semántica

- KPIs = agregados de `public.folios`, no IGF/ARR/commercial_state.
- La respuesta niega salud, desempeño y causalidad.
- Proyectos ≠ Action Register.
- Empty: no afirma ausencia universal.
- Error de fuente: abstención; no se presenta como empty/cero.

## Wiring

```text
pregunta KPIs dashboard
  → detectUnsupported (no corta)
  → plan intent dashboard_kpis
  → loadDashboardKpisForChat
       → assertM3KpisAccess (GA/GV/planta)
       → parseDashboardFilters + buildDashboardWhere + queryDashboardKpis
  → buildDashboardKpisChatResult (openai_called: false)

pregunta proyectos válida
  → detectUnsupported (regla proyectos eliminada)
  → plan intent project_status (sin clarificación AR)
  → loadProyectosForChat
       → assertM3ProyectosAccess (GV/planta)
       → listarProyectosPorPlantaOEquivalentes
  → buildProyectosChatResult

pregunta "proyectos de mantenimiento"
  → project_status + requires_clarification
  → buildProjectStatusClarificationChatResult
```

Capability runtime `proyectos` y `dashboard_kpis`: `canRead: true`, `on_demand`. La matriz en `docs/director-ia/` no se tocó.

## Tests y resultados

| Comando | Totales | Pass | Fail |
|---|---|---|---|
| `node --test test/director-ia-m3-plantas-kpis-proyectos.test.js` | 20 | 20 | 0 |
| `node scripts/test-director-ia-capabilities.js` | 22 | 22 | 0 |
| `node scripts/test-director-ia-planner.js` | 30 | 30 | 0 |
| `node scripts/test-director-ia-tool-orchestrator.js` | 21 | 21 | 0 |
| `node --test test/director-ia-*.test.js` | 436 | 436 | 0 |

Suite Director IA relevante: **436/436** (incluye cycle constitucional y los 20 focales M3).

Cubiertos: happy KPIs/proyectos, empty, error, `planta_id` ausente, cross-planta, GA KPIs, GV KPIs, GV proyectos, nulls, `SOURCE_NOT_INTEGRATED` ausente en consulta válida, clarificación AR, KPIs ≠ IGF/ARR, executor, `canRead`, ausencia de POST/HTTP/cycle.

## Acciones no realizadas

- No commit, push, merge.
- No NEXT_TASK ejecutada ni autorizada.
- No sync documental de la matriz a COMPLETE.
- No frontend, SQL, migrations, cycle, contratos `docs/director-ia/`.
- No `POST /api/proyectos` ni creación/edición/eliminación.
- No catálogo global de plantas.
- No HTTP interno ni dispatcher genérico.
- G1 conservado: `HUMAN_APPROVER` / `2026-08-21T22:42:16-06:00`.

## Gates

| Gate | Estado |
|---|---|
| G1 | AUTHORIZED (humano; intacto) |
| G2 | N/A |
| G3 | N/A |
| G4 | NOT_AUTHORIZED |
| G5 | NOT_AUTHORIZED (NEXT_TASK solo propuesta) |
| G8 | N/A |

## NEXT_TASK

Exactamente una, **no autorizada, no ejecutada**:

**DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001**

## git diff --check / git status

`git diff --check`: limpio (exit 0, sin output).

`git status`:

```
On branch implementation/director-ia-m3-plantas-kpis-proyectos-001
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
	docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md
	lib/director-ia-m3-plantas-kpis-proyectos.js
	test/director-ia-m3-plantas-kpis-proyectos.test.js
```

Solo archivos autorizados. Sin commit.
