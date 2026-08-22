# Reporte — DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M3; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

M3 satisface la definición canónica vigente de COMPLETE. La matriz quedó sincronizada: PARCIAL → **COMPLETA**.

Porcentaje formal M0–M20 recalculado desde las fichas vigentes: **7.5/20 = 37.5% → 8.0/20 = 40.0%**.

No se modificó código, tests ni otros contratos. Crear/editar/eliminar proyecto permanece fuera.

## Ejecución

- Rama: `docs/director-ia-m3-capability-matrix-sync-001` (≠ `main`).
- HEAD incluye `b4761802` (`IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001` fusionado).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T22:42:16-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin runtime, sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Readiness | ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001 |
| IMPL | IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001 |
| Merge en main | `b4761802` |
| Estado matriz M3 | PARCIAL |
| M0–M20 antes | 7.5 / 20 = 37.5% |

## Definición canónica aplicada (sin redefinir)

Parte 1 **COMPLETA** = «Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente».

Reglas de la tarea aplicadas:

- Plantas = scope autorizado; COMPLETE **no** exige catálogo global.
- KPIs = fuente real de dashboard, no IGF/ARR.
- Proyectos = `public.proyectos` por planta, no Action Register.
- Crear/editar/eliminar **no** es requisito de COMPLETE de lectura.
- Un endpoint/tool solo no basta: hace falta wiring accesible desde Director IA.

## Evidencia física — Plantas

| Requisito | Evidencia |
|---|---|
| `planta_id` obligatorio | Chat / loaders M3 (`requirePlantaId`) |
| `nombre`/`clave` | `resolvePlantaRow` → `SELECT id, nombre, clave FROM public.plantas` |
| Scope autorizado | `assertPlantaPermitidaM3` (GG/GA/AD + `plantas_permitidas`) |
| Sin catálogo global | No hay tool ni listado de todas las plantas |

Porción plantas cubierta. No se amplió `plantas_permitidas`.

## Evidencia física — KPIs

| Requisito | Evidencia |
|---|---|
| Tool | `get_dashboard_kpis` `available_on_demand` |
| Executor | `loadDashboardKpisForChat` |
| Fuente | `queryDashboardKpis` (misma semántica que `GET /api/dashboard/kpis`) |
| Shape | `total_activos`, `total_mxn`, `pendientes_zp`, `avg_aging`, `oldest`, `top_planta`, `top_categoria` |
| Wiring chat | `askDirectorIa` si `intent === dashboard_kpis` |
| Distinto de IGF/ARR | Planner excluye igf/arr/margen/rentabilidad/descuento/utilidad; respuesta declara agregados de folios |
| Sin HTTP interno | Loader in-process; no `fetch`/`axios` en el módulo M3 |

## Evidencia física — Proyectos

| Requisito | Evidencia |
|---|---|
| Tool | `get_project_status` `available_on_demand` |
| Executor | `loadProyectosForChat` |
| Tabla | `public.proyectos` vía `listarProyectosPorPlantaOEquivalentes` |
| Wiring chat | `askDirectorIa` si `intent === project_status` |
| `UNSUPPORTED_RULES.proyectos` | Eliminada; consulta válida ya no es `SOURCE_NOT_INTEGRATED` |
| Clarificación AR | Planner + `buildProjectStatusClarificationChatResult` |
| Sin POST/mutaciones | Módulo M3 sin INSERT/UPDATE/DELETE; `POST /api/proyectos` fuera |

## Authz

- GA: 403 en KPIs (`assertM3KpisAccess`).
- GV: 403 en KPIs y proyectos.
- Cross-planta: bloqueado para GG/GA/AD con lista.
- Más restrictivo que el gap de `GET /api/dashboard/proyectos`.

## Cycle / HTTP / mutaciones

- `lib/director-ia-real-cycle.js` no referencia M3.
- Sin HTTP interno.
- Escritura de proyectos no integrada.

## Tests verificados (reporte IMPL; no reejecutados ni modificados)

| Evidencia | Resultado reportado |
|---|---|
| Focales M3 (`it(` en el test = 20) | 20/20 |
| capabilities | 22/22 |
| planner | 30/30 |
| orchestrator | 21/21 |
| suite `test/director-ia-*.test.js` | 436/436 |
| `git diff --check` en IMPL | limpio |

## Evaluación COMPLETE

**YES.** Las tres familias canónicas tienen consulta directa, autorizada y cableada en Director IA. No se reinterpretó COMPLETE para incluir mutaciones ni catálogo global.

## Cambios exactos en la matriz

Solo `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

1. Ficha **M3**: PARCIAL → COMPLETA; sí/no consulta; archivos/tools/helpers; escritura sigue no integrada; observaciones + scoring 37.5% → 40.0%.
2. Parte 3: fuente KPIs de dashboard (nueva, inventario M3); fuente Proyectos actualizada.
3. Parte 4 #1: faltantes ajustados (KPIs/proyectos ya no «inexistentes»; siguen on-demand).
4. Parte 4 #18: COMPLETA de consulta; «retrasado» no es estatus almacenado.
5. Parte 9 §1, §2, §3, §5, §6, §7 y apéndice: M3 a COMPLETA; proyectos retirados de NO INTEGRADA como fuente de negocio.

No se reescribió la ficha de M0–M2 ni M4–M20. No se reescribió la historia de M16.

## Recálculo M0–M20

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0. Denominador 20.

| ID | Etiqueta Parte 2 / Parte 9 | Puntos |
|---|---|---|
| M0 | PARCIAL | 0.5 |
| M1 | PARCIAL | 0.5 |
| M2 | PARCIAL | 0.5 |
| **M3** | **COMPLETA** (antes PARCIAL 0.5) | **1.0** |
| M4 | NO INTEGRADA | 0.0 |
| M5 | NO INTEGRADA | 0.0 |
| M6 | NO INTEGRADA (Excel; INDIRECTA lingüística no suma módulo extra) | 0.0 |
| M7 | PARCIAL | 0.5 |
| M8 | PARCIAL | 0.5 |
| M9 | INDIRECTA (Parte 9; misma convención que el sync M16 → 7.5) | 0.5 |
| M10 | NO INTEGRADA | 0.0 |
| M11 | PARCIAL | 0.5 |
| M12 | PARCIAL | 0.5 |
| M13 | COMPLETA | 1.0 |
| M14 | NO INTEGRADA | 0.0 |
| M15 | NO INTEGRADA | 0.0 |
| M16 | COMPLETA | 1.0 |
| M17 | PARCIAL | 0.5 |
| M18 | NO INTEGRADA | 0.0 |
| M19 | NO INTEGRADA | 0.0 |
| M20 | INDIRECTA | 0.5 |

Suma antes (M3=0.5): **7.5 / 20 = 37.5%**  
Suma después (M3=1.0): **8.0 / 20 = 40.0%**

El 40.0% se verificó; no se asumió. El resto de módulos no cambió de etiqueta.

## Porcentaje antes / después

| | Numerador | Denominador | % |
|---|---|---|---|
| Antes | 7.5 | 20 | 37.5 |
| Después | 8.0 | 20 | 40.0 |

## Acciones no realizadas

- No código, tests, SQL, frontend, runtime.
- No otros contratos ni índice.
- No fichas M0–M2 / M4–M20.
- No mutaciones ni catálogo global.
- No commit, push, merge.
- No autorización ni ejecución del NEXT_TASK.
- G1 conservado: `HUMAN_APPROVER` / `2026-08-21T22:42:16-06:00`.

## Gates

| Gate | Estado |
|---|---|
| G1 | AUTHORIZED (humano; intacto) |
| G2 | N/A |
| G3 | N/A |
| G4 | NOT_AUTHORIZED |
| G5 | NOT_AUTHORIZED |
| G8 | N/A |

## NEXT_TASK

Exactamente una, **no autorizada, no ejecutada**:

**ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003**

## git diff --check / git status

`git diff --check`: limpio (exit 0, sin output).

`git status`:

```
On branch docs/director-ia-m3-capability-matrix-sync-001
Changes not staged for commit:
	modified:   docs/dev-loop/CURRENT_TASK.md
	modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
	docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md
```

Solo los tres archivos autorizados. Sin commit.
