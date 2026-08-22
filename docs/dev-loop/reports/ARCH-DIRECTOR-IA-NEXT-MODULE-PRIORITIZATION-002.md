# Reporte — ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001.md (solo contraste; no es fuente primaria)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta auditoría: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

Baseline vigente: **7.5 / 20 = 37.5%**. M16 es COMPLETE y **no compite**.

Ningún NOT_STARTED restante tiene probabilidad alta de COMPLETE en un slice (xlsx, COMPARAR con archivo, WhatsApp clase C, S3, admin C, presupuesto sin API).

El siguiente módulo que **sí puede** llegar a COMPLETE, con APIs/helpers JSON ya existentes y sin mutación, es **M3 — Plantas / KPIs / Proyectos** (hoy PARCIAL). Ganancia **+2.5 pp** → **10.0 / 20 = 40.0%**.

No se eligió M1 (COMPLETE más barato pero valor ejecutivo bajo) ni M9 (también +2.5; ya INDIRECTA; tres familias). No se eligió M6/M4 pese a +5.0 teórico: un slice realista solo llega a PARTIAL.

NEXT_TASK (no autorizado): `ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-next-module-prioritization-002` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T22:06:18-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin cambio de matriz. Sin commit/push/merge. Sin siguiente tarea.

---

## 1. Baseline canónico 37.5%

Fuente primaria: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` (ficha + Parte 9) y la fórmula del loop.

| Etiqueta | Peso |
|---|---|
| COMPLETE | 1.0 |
| PARTIAL / INDIRECTA (en este scoring) | 0.5 |
| NOT_STARTED | 0.0 |
| N_A | excluido del denominador |

M0–M20 = 21 módulos. **M19 = N_A** (sistema paralelo; no Director IA) → denominador **20**.

| Grupo | Módulos | Peso |
|---|---|---|
| COMPLETE | M13, **M16** | 2.0 |
| PARTIAL | M0, M1, M2, M3, M7, M8, M11, M12, M17 | 4.5 |
| INDIRECTA (0.5) | M9, M20 | 1.0 |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 | 0 |
| N_A | M19 | excluido |
| **Total** | | **7.5 / 20 = 37.5%** |

INDIRECTA se cuenta 0.5 para no romper el baseline formal. Completar M9 o M20 vale **+2.5 pp**, no +5.0.

**BLOCKED** no es etiqueta de la matriz. Se revalidan M18 (presupuesto) y M19 (paralelo) más abajo.

M16 no se reevalúa.

---

## 2. Candidatos (desde la matriz vigente)

**Incluidos — PARTIAL:** M0, M1, M2, M3, M7, M8, M11, M12, M17  
**Incluidos — INDIRECTA (como PARTIAL de scoring):** M9, M20  
**Incluidos — NOT_STARTED:** M4, M5, M6, M10, M14, M15, M18  
**Incluido — revalidar blocker:** M19 (N_A / no integrar)

**Excluidos:** M13 COMPLETE, M16 COMPLETE, M19 N_A (no ranking de ganador).

Ganancias:

- PARTIAL/INDIRECTA → COMPLETE = **+2.5 pp**
- NOT_STARTED → COMPLETE = **+5.0 pp**

---

## 3–5. Tabla comparativa (evidencia física)

| MODULE | CANONICAL_PURPOSE | CURRENT_STATE | POTENTIAL_GAIN_PP | EXISTING_BACKEND | EXISTING_FRONTEND | EXISTING_TOOL_OR_INTENT | DATA_SOURCE | AUTHZ_READY | DEPENDENCIES | DB_OR_MIGRATION | EXTERNAL | IMPLEMENTATION_EFFORT | TESTABILITY | SEMANTIC_RISK | PRODUCTION_RISK | CAN_REACH_COMPLETE_IN_ONE_SLICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 Auth | Autenticar y aplicar permisos/planta | PARTIAL | +2.5 | `dashboard-auth.js`, `usuario-permisos.js` | `auth.ts` | `get_user_permissions` (es M14) | `usuarios`, `roles` | Gates sí; catálogo no | Todo el dashboard | no | no | alto (exponer catálogo) | media | alto | alto | no |
| M1 Health | Monitoreo servicio y DB | PARTIAL | +2.5 | `GET /health`, `/health-db`, `/health-proyectos`, `/health-director-ia` | header Shell (solo Director IA) | no tool chat | process + `pool` + proyectos | `/health*` sin JWT | ninguna de negocio | no | no | bajo | alta | bajo (no confundir con ACQUIRED_OK) | bajo | **sí** |
| M2 Folios/Kanban | Flujo por etapas | PARTIAL (solo comentarios) | +2.5 | `GET /api/folios/:id`, `/timeline`, `/kanban` | Kanban, FolioDrawer | `folio_status` / `get_folio_status` `executor:null` | `public.folios` | JWT + GV + planta | M3, M18 | no | no | alto (todo el flujo) | media | alto | **alto**: `GET /folios/:id` llama `maybeAdvanceFolioToComprobaciones` (puede mutar) | no |
| M3 Plantas/KPIs/Proyectos | Catálogo plantas, KPIs dashboard, proyectos | PARTIAL (solo planta filtro) | +2.5 | `GET /kpis`, `GET /proyectos`; helpers `listarProyectosPorPlantaOEquivalentes`, `listarProyectosPorPlantaConTotales` | `KPIHeader`, `CrearProyectoModal` | `project_status` / `get_project_status` `executor:null` | `public.plantas`, `public.proyectos`, `public.folios` | KPIs: GA financiero + GV; proyectos: GV | Folios | no | no | medio | alta (JSON/helpers) | medio (proyectos vs AR; planner ya pide aclaración) | medio (KPIs) | **sí**, si COMPLETE = consultar las tres fuentes ya existentes (crear proyecto queda fuera) |
| M4 Clasificación+COMPARAR | Comparativo mensual + reconciliación Excel | NOT_STARTED | +5.0 | `GET /clasificacion-apoyos` JSON + `buildClasificacionMatrix`; COMPARAR POST escribe | 2 modales | capability `clasificacion_apoyos`; **sin tool** | `public.folios` | GV; `priv_clave`; GA sin COMPARAR | Folios | no | archivo Excel para reconciliar | alto | media | medio | alto si se toca COMPARAR write | no (sin archivo no hay reconciliación; write = C) |
| M5 Taller AT | Excel taller AT + hoja duplicados | NOT_STARTED | +5.0 | `GET /taller-at-excel` xlsx; `buildTallerAtWorkbook` | `TallerAtExportModal` | `taller_at` → `get_expense_analysis` | `public.folios` | GV; `priv_clave` | Folios, homologación AT | no | no | medio-alto | baja (xlsx) | alto («Taller» = AR) | medio | no |
| M6 GASTOS/INV | Export categoría × meses | NOT_STARTED | +5.0 | `GET /categoria-rango-excel` xlsx; `expandCategoriaRows` | `CategoriaRangoExportModal` | `expense_analysis` / `investment_analysis` | `public.folios` | GV; `priv_clave` | Folios | no | no | medio-alto | media si se extrae JSON | **alto** (IGF «gasto» ≠ Excel) | medio | no (2 categorías + ambigüedad) |
| M7 IGF | Forecast / compromiso / HG | PARTIAL | +2.5 | annex `loadIgfCommitSnapshot`; `/api/dashboard/igf-*` | UI IGF | `get_igf_snapshot` ya on-demand | `igf.*` | `acceso_igf_forecast_kpis` | ARR | no | no | alto (UI/versiones/HG) | media | medio | medio | no |
| M8 ARR | Forecast ventas/descuento | PARTIAL | +2.5 | annex + `loadArrProyForPlant`; `/api/arr/*` | `/arr` | `get_arr_snapshot` ya on-demand | `arr.*` | GA en commercial_state | upload ARR | no | no | alto | media | medio | alto si se toca load | no |
| M9 Deltas | Comparar periodos venta/desc/ingreso | INDIRECTA / endpoints NO INTEGRADA | +2.5 | `delta-venta-*`, `delta-descuento-*`, `delta-ingreso-*` JSON; param `planta` (nombre) | `Delta*Modal` | 3 tools + 3 intents; `executor:null` | ARR + `arr.delta_ingreso_forecast_cliente` | GA 403; GV | ARR | no | no | medio-alto (3 familias) | media | medio (solapa commercial_state/IGF) | medio | dudoso en un slice |
| M10 Weekly LD | Narrativa semanal **+ envío WhatsApp** | NOT_STARTED | +5.0 | `POST /weekly-discount-lectura` JSON; `buildWeeklyDiscountNarrative`; scheduler | pestaña Delta Descuento | no tool | ARR | GA 403; GV | ARR, Twilio | no | **Twilio** | bajo (solo narrativa) | alta (JSON) | medio | alto si se envía | no (propósito incluye envío = C) |
| M11 DICF | Oportunidades / acciones / comentarios | PARTIAL | +2.5 | summarizers + commercial_state | UI DICF | tools ya available | `arr.dicf_*` | `acceso_acciones_dicf` | ARR | no | no | alto (límites/attachments) | media | medio | medio | no |
| M12 Action Register | Tablero temas/ítems | PARTIAL | +2.5 | board + summarizers | UI Acciones | tools already | `arr.action_register_*` | `acceso_acciones_dicf` | Plantas | no | no | alto (notas/CRUD) | media | medio | alto si muta | no |
| M14 Usuarios admin | Admin usuarios/roles/permisos | NOT_STARTED | +5.0 | `/api/usuarios-admin*` | `UsuariosAdminModal` | `user_permissions` | `usuarios`, `roles` | `USUARIOS_ADMIN_CLAVE` | Auth global | no | no | medio | media | alto | **alto / C** | no |
| M15 Docs/media | Cotización, facturas, póliza, adjuntos | NOT_STARTED | +5.0 | `/folios/:id/media`, documentos, póliza | FolioDrawer, PDF | `folio_documents` / financial | `folio_archivos`, S3 | GV; `acceso_ver_imprimir_folios` | Folios, **S3** | no | **S3** | alto | baja | medio | alto | no |
| M17 WhatsApp | Comandos y URLs firmadas | PARTIAL | +2.5 | comando `DirectorIA`; Twilio | n/a | capability `whatsapp` | Twilio, usuarios | tokens en query | **Twilio** | no | **Twilio** | alto | baja | medio | alto | no |
| M18 Presupuesto semanal | Solicitudes/carro semanal | NOT_STARTED | +5.0 | SQL embebido `server.js`; `presupuesto-detalle` (otro uso); bot WhatsApp | UI app limitada | `budget_status` / `get_budget_status` | `presupuesto_*` | GG / etapas | Folios, WhatsApp | no | WhatsApp | alto | baja | alto | **alto** | no |
| M20 Home KPI | Vista inicio IGF/DICF | INDIRECTA | +2.5 | comparte annex/DICF | `app/page.tsx` | no | mismas que M7/M11 | igual | M7/M11 | no | no | medio (replicar página) | media | medio | bajo | no (página ≠ fuente nueva) |

---

## 6. PARTIAL vs NOT_STARTED

Terminar un PARTIAL por **+2.5** gana si P(COMPLETE) es alta y el NOT_STARTED +5.0 solo puede entregar PARTIAL.

Eso ocurre aquí: M4/M5/M6/M10/M14/M15/M18 no tienen un slice de COMPLETE creíble. M1 y M3 sí.

M3 se elige sobre M1: misma ganancia, más valor de negocio (KPIs + proyectos vs health de producto), tool/intent ya declarados, helpers JSON, sin S3/Twilio.

---

## 7. Blockers revalidados

### M18 Presupuesto

**Sigue presente.** No hay API REST de presupuesto semanal para Director IA. Las tablas `presupuesto_*` se tocan desde helpers embebidos en `server.js` y el carrito WhatsApp. Existen `POST /presupuesto-comparar` y `GET /presupuesto-detalle` (otro uso, no el carro semanal). Escritura ALTO. El blocker de 001 **no desapareció** (M16 no lo tocó).

### M19 Delta Ingreso AI

**Sigue N_A / no integrar.** Stack paralelo (`lib/delta-ingreso-ai*.js`, `/api/ai/delta-ingreso/test/*` sin `dashboardAuthMiddleware` según la matriz). Parte 9 clase C. No se absorbe en Director IA. El blocker **sigue**.

No se intentó resolver ninguno.

---

## 8–9. Ranking total

Criterios en orden: P(COMPLETE), ganancia, reutilización, dependencias, riesgo productivo, riesgo semántico, testabilidad. Sin score opaco.

| # | Módulo | Ganancia | Esfuerzo | Dependencias | Riesgo | Por qué esa posición |
|---:|---|---|---|---|---|---|
| 1 | **M3** | +2.5 real | medio | plantas/folios | medio | Único PARTIAL de negocio con las **tres** fuentes físicas ya en repo y P(COMPLETE) alta si no se exige crear proyecto |
| 2 | M1 | +2.5 real | bajo | ninguna | bajo | COMPLETE casi mecánico; valor ejecutivo **Baja** (matriz Parte 7) |
| 3 | M9 | +2.5 | medio-alto | ARR; `planta` nombre ≠ `planta_id` | medio | 3 tools/JSON listos; ya INDIRECTA; un slice de 3 familias es ancho |
| 4 | M10 | +2.5 realista | bajo | ARR, Twilio | alto si envía | Narrativa JSON lista; COMPLETE bloqueado por WhatsApp (C) |
| 5 | M4 | +2.5 realista | medio-alto | `priv_clave`, Excel file | alto write | Comparativo JSON existe; reconciliación exige archivo; COMPARAR escribe |
| 6 | M6 | +2.5 realista | medio-alto | `priv_clave` | semántico alto | `expandCategoriaRows` existe; IGF vs GASTOS es hallazgo crítico |
| 7 | M5 | +2.5 realista | medio-alto | homologación AT | semántico alto | Solo xlsx; «Taller» ≠ Excel AT |
| 8 | M7/M8 | +2.5 teórico | alto | ARR/IGF UI | medio | Ya on-demand; COMPLETE = UI/versiones/GET sources |
| 9 | M11/M12 | +2.5 teórico | alto | — | medio | Ya fuente primaria; COMPLETE = quitar límites/notas/CRUD |
| 10 | M2 | +2.5 teórico | alto | — | **mutación en GET :id** | Kanban completo; no un slice |
| 11 | M15 | +2.5 | alto | S3 | alto | Superficie documental grande |
| 12 | M14 | +2.5 | medio | clave admin | C | No integrar mutación de permisos |
| 13 | M17 | +2.5 | alto | Twilio | alto | Ya hay link; el resto es canal externo |
| 14 | M20 | +2.5 | medio | M7/M11 | bajo | No es fuente nueva |
| 15 | M0 | +2.5 | alto | — | alto | Gates ≠ dominio de respuesta |
| 16 | M18 | +5.0 teórico | alto | WhatsApp | alto | Blocker de API vigente |

No se eligió por número de módulo.

---

## 10. Ganador

**M3 — Plantas / KPIs / Proyectos**

| Campo | Valor |
|---|---|
| Estado actual | PARCIAL (planta como filtro; no KPIs ni proyectos) |
| Estado objetivo | COMPLETE |
| Ganancia | **+2.5 pp** (7.5 → 10.0 / 20 = **40.0%**) |
| Delta físico faltante | Loader read-only de `GET /api/dashboard/kpis` (o la misma query/`buildDashboardWhere`) + loader de proyectos reutilizando `listarProyectosPorPlantaOEquivalentes` / `listarProyectosPorPlantaConTotales` (no el JSON recortado `{id,codigo,nombre}` del GET) + tool `get_project_status` + capability `proyectos` + quitar corte `UNSUPPORTED_RULES.proyectos` + rama chat (patrón M16) + tests + semántica proyectos≠AR |
| Path | intent `project_status` → `get_project_status` → executor in-process → helpers existentes → evidencia → respuesta; más consulta de KPIs en el mismo módulo |
| Riesgos | GA/GV en KPIs; «proyectos de mantenimiento» vs Action Register (planner ya `requires_clarification`); GET `/proyectos` HTTP es selector pobre — hay que usar el helper; no crear proyecto (`POST /api/proyectos`) |
| Blockers | Ninguno que impida un IMPL read-only. Sí hace falta fijar COMPLETE (¿listar + fechas/estatus basta? ¿criterio de «retrasado» = `fecha_cierre_estimada` vencida?) |
| Gates NEXT_TASK | G1 humano; G2 N/A; G3 N/A; G8 N/A |
| Por qué antes que #2 (M1) | Misma ganancia y P(COMPLETE) alta, pero M3 es el hueco de negocio que la matriz ya nombra (KPIs + proyectos). M1 es COMPLETE más barato y de prioridad Baja. |

Evidencia concreta:

- Ficha M3: no consulta `/kpis` ni listado proyectos.
- `server.js` `GET /api/dashboard/kpis` (~11427) — JSON `total_activos`, `total_mxn`, aging, etc.; `dashboardBlockGAFinancialKpis` + GV.
- `server.js` `GET /api/dashboard/proyectos` (~11066) — lista EN_CURSO recortada.
- Helpers ~3510 y `listarProyectosPorPlantaConTotales` (~3524) — `estatus`, `fecha_cierre_estimada`, equivalentes de planta.
- Tabla `public.proyectos` (DDL en `server.js` ~2666).
- Tool `get_project_status` `declared_not_integrated` / `executor: null`.
- Planner `project_status` + aclaración vs AR.
- FE: `fetchKpis`, `KPIHeader`, `fetchProyectosPorPlanta`, `CrearProyectoModal` (crear = fuera).
- Sin tests de módulo en `test/`.

---

## 11. ¿Readiness o IMPL?

**B — ARCH readiness.**

Quedan abiertas: ¿un slice cubre KPIs **y** proyectos?; criterio de «retrasado»; authz KPI vs GV/GA; no usar `GET /folios/:id` ni crear proyecto; semántica vs Action Register.

No IMPL directo.

---

## 12–13. NEXT_TASK y gates

Exactamente uno, **no autorizado, no ejecutado**:

**`ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001`**

| Gate | Valor | Motivo |
|---|---|---|
| G1 | requerido | Autorizar la auditoría M3 |
| G2 | N/A | Cabe en arquitectura existente (capability + tool + loader chat) |
| G3 | N/A | Contratos actuales bastan; no D1–D9 |
| G8 | N/A | Sin calibración material |

---

## Acciones no realizadas

- No implementación.
- No runtime, frontend, backend, tests, SQL, matriz, contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó el NEXT_TASK.

## git

`git diff --check`: limpio.  
`git status`: solo `CURRENT_TASK.md` y este reporte.

STOP.
