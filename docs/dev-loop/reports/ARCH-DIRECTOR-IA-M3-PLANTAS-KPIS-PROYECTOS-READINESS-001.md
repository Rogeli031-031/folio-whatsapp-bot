# Reporte — ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "sql/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "package.json"
  - "package-lock.json"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
tests_executed: []
next_task_proposed: "IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A. G3 = N/A. El inventario/registry/chat existentes bastan; no hace falta contrato D1–D9 ni dispatcher genérico nuevo."
  - "G8 permanece N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Ejecución

- Rama: `architecture/director-ia-m3-plantas-kpis-proyectos-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T22:23:00-06:00`.
- G2/G3: auditados como **N/A** (no preventivos). G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin smoke productivo. Sin commit, push, merge. Sin siguiente tarea.
- Tests existentes no ejecutados: la evidencia de readiness es estructural (código y contratos); no era necesario verificar runtime.

## Resumen ejecutivo

Baseline vigente: **7.5 / 20 = 37.5%**. Ganancia potencial si M3 pasa a COMPLETE: **+2.5 pp → 40.0%**. Fuente de priorización: `ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002`.

**CAN_REACH_COMPLETE_IN_ONE_READ_ONLY_SLICE = YES.**

M3 puede pasar de PARTIAL a COMPLETE con **exactamente un slice read-only** que consulte de forma autorizada las tres familias canónicas:

1. **Plantas** — ya satisfechas como scope/filtro (`planta_id` obligatorio + `nombre`/`clave`). No se requiere catálogo global ni tool propia.
2. **KPIs** — `GET /api/dashboard/kpis` existe; la lógica está acoplada al handler HTTP; no hay helper exportado ni tool en el registry. Hay que extraer la lógica y cablearla. Completar solo `get_project_status` **no** cubre esta familia.
3. **Proyectos** — no existe `GET /api/proyectos`. La lectura real es `GET /api/dashboard/proyectos` más helpers locales (`listarProyectosPorPlanta*`, `getProyectoById` / `getProyectoByCodigo`). `get_project_status` corresponde a este dominio cuando no choca con Action Register; hoy está `declared_not_integrated` / `executor: null` y el chat corta con `UNSUPPORTED_RULES.proyectos`.

Crear/editar/eliminar proyecto **no** forma parte de COMPLETE de lectura. No hay G2/G3. El patrón físico es el de M16: extraer helper, rama in-process en `askDirectorIa`, quitar el early-return, reaplicar authz.

---

## 1. Definición canónica verificada de M3

Fuente: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` §M3 (filas 137–156) y Parte 1 (fila 38).

| Campo | Valor físico |
|---|---|
| ID | M3 |
| Módulo | Plantas / KPIs / Proyectos |
| Propósito empresarial | Catálogo de plantas, KPIs de dashboard, proyectos por planta |
| Cobertura actual | **PARCIAL** (planta como filtro); KPIs y proyectos **NO INTEGRADOS** |
| Sí consulta | `planta_id` obligatorio; `nombre`/`clave` en IGF/ARR y commercial_state (`SELECT nombre, clave FROM public.plantas`) |
| No consulta | `GET /api/dashboard/kpis`, listado de proyectos, crear proyecto, KPIs agregados del kanban header |
| Endpoints citados | `/api/dashboard/plantas`, `/kpis`, `/proyectos`, `POST /api/proyectos` |
| Tablas | `public.plantas`, `public.proyectos`, `proyecto_*` |
| Lectura posible | CONSULTAR nombre planta; CONSULTAR proyectos vía endpoint existente (no cableado) |
| Escritura posible | `POST /api/proyectos` — **no** en Director IA |
| Permisos | Acceso por planta en token; KPIs con bloqueos GA/GV |
| Riesgo | Lectura planta: BAJO. KPIs financieros: MEDIO |

**COMPLETE (Parte 1)** = «Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente».

Condición mínima legítima de COMPLETE para este módulo (sin redefinir el contrato):

- consulta directa, autorizada y consistente de **las tres** familias;
- crear/editar/eliminar proyecto **fuera**;
- no declarar COMPLETE si falta una familia.

Pregunta canónica #18 («¿Qué proyectos están retrasados?») cita `/api/dashboard/proyectos` y falta «criterio de retraso + datos». Eso **no** exige inventar un estatus de producto «retrasado». COMPLETE de M3 = consultar proyectos por planta con campos existentes. «Retrasado» no es columna; se puede reportar `fecha_cierre_estimada` vs hoy como **derivado explícito**, o abstenerse.

Hallazgo de inventario (no blocker, no G2): la matriz cita `/proyectos` como lectura. Físicamente **no existe** `GET /api/proyectos`. Existe `GET /api/dashboard/proyectos` (lectura recortada) y `POST /api/proyectos` (escritura).

---

## 2. Estado físico — Plantas

### `GET /api/dashboard/plantas` (`server.js` ~7140)

- Auth: `dashboardAuthMiddleware` (JWT).
- Fuente: `getPlantas(client)` → `SELECT id, nombre, clave FROM public.plantas ORDER BY id ASC` (~2988).
- Respuesta HTTP: `{ plantas: [{ id, nombre }] }` (no expone `clave`).
- Scope: filtra por `plantas_permitidas` salvo ZP / AD / CF_CDMX. GV y SEH-only también quedan acotados a la lista.
- Side effects: ninguno (SELECT).

### Resolución ya usada por Director IA

- Chat exige `planta_id`.
- `lib/director-ia-igf-arr.js` `resolvePlantaNombre`: `SELECT nombre, clave FROM public.plantas WHERE id = $1`.
- commercial_state usa el mismo patrón de nombre/clave.
- Sin `planta_id`, el context responde `action_register.ok: false` (observación canónica).

### Determinación

| Pregunta | Respuesta |
|---|---|
| ¿Director IA ya satisface la porción plantas? | **Sí**, como scope/filtro + identidad (`id` / `nombre` / `clave`) de la planta autorizada. |
| ¿«Catálogo» = listado completo? | **No para COMPLETE.** La matriz ya cuenta esa porción como integrada. «Información que no consulta» no lista `/api/dashboard/plantas`. |
| ¿Hace falta tool propia de plantas? | **No.** El chat ya trae `planta_id` + auth. |
| ¿Listado global sería seguro? | **No.** Para roles con `plantas_permitidas` sería cross-scope si no se refiltra. ZP/AD/CF_CDMX sí ven el universo; no hay que ampliar eso al chat. |

Contrato mínimo de evidencia de plantas: `planta_id`, `nombre`, `clave` de la planta del scope. No inventar directorio corporativo.

---

## 3. Estado físico — KPIs

### `GET /api/dashboard/kpis` (`server.js` ~11427)

Middleware, en orden:

1. `dashboardAuthMiddleware`
2. `dashboardBlockGAFinancialKpis` — GA → 403 «GA no tiene acceso a KPIs financieros.»
3. `dashboardBlockGVForbidden` — GV → 403 (solo Delta ingreso Forecast / acciones DICF)

Lógica **acoplada al handler**. No hay helper exportado. `parseDashboardFilters` (~5627) y `buildDashboardWhere` (~5701) son locales a `server.js`.

Fuente: `public.folios f` ⋈ `public.plantas p`. **No** IGF/ARR/commercial_state.

JSON real (también `Kpis` en `frontend-dashboard/lib/api.ts` ~1030 y `KPIHeader.tsx`):

| Campo | Semántica física | Null / cero |
|---|---|---|
| `total_activos` | `COUNT(*)` con `where` + opcional exclusión CERRADO/CANCELADO si `soloActivos` | entero; 0 si no hay filas |
| `total_mxn` | `COALESCE(SUM(f.importe), 0)` | el SQL ya convierte SUM vacío en 0; el JS conserva ese 0 |
| `pendientes_zp` | COUNT con `estatus = PENDIENTE_APROB_ZP` sobre `where` **sin** el extra de `soloActivos` | 0 si no hay |
| `avg_aging` | `AVG(días desde creado_en)` redondeado | **null** si no hay fechas |
| `oldest` | folio más antiguo con `creado_en` | **null** si no hay |
| `top_planta` | planta con más folios en el filtro | **null** si no hay |
| `top_categoria` | categoría con más folios | **null** si no hay |

`buildDashboardWhere` aplica: `solo_zp_ad`, exclusión AD para no-ZP/AD/CF_CDMX, `plantas_permitidas` para GG/GA (si vacío → `planta_id = -1`), filtro de plantas de query (expande equivalentes), categoría/etapa, `soloActivos`, `miSemana`, `mes`, **ventana por defecto** (mes_cargo actual/anterior + creados mes actual/pasado, salvo `ventana=0`).

Side effects: **ninguno** (solo SELECT).

Frontend: `fetchKpis` → `/api/dashboard/kpis`. `KPIHeader` muestra exactamente esos campos; «N/A» para `total_mxn`/`avg_aging` null. Los «KPIs agregados del kanban header» de la matriz **son esta misma ruta**, no otra fuente.

Tests en `test/` para este endpoint: **ninguno**.

### Determinación

- KPIs canónicos de M3 = el JSON de `/api/dashboard/kpis` (agregados de **folios** del dashboard), no IGF/ARR.
- No hay helper reusable fuera de HTTP. El IMPL **debe extraer** la lógica a lib. HTTP interno queda prohibido.
- Riesgo semántico: afirmar «salud», «desempeño» o causalidad. Son conteos/montos/aging de folios en una ventana.
- Riesgo financiero: `total_mxn` es monto. GA y GV no deben verlo. El chat **hoy no** aplica esos bloqueos; el loader debe reaplicarlos.
- Conservar null de `avg_aging` / `oldest` / `top_*`. No convertir ausencia de KPI en cero salvo el `COALESCE` que **ya** hace el endpoint en `total_mxn`.
- El IMPL debe pasar `planta_id` del chat y documentar la ventana (default del dashboard, no universo eterno).

Hace falta **tool/rama de KPIs** o un loader M3 que sirva KPIs + proyectos. Completar solo `get_project_status` deja M3 incompleto.

---

## 4. Estado físico — Proyectos

### Hallazgo: no existe `GET /api/proyectos`

Única ruta `/api/proyectos` en runtime: `POST /api/proyectos` (~11083). Escritura. Roles: GA, GG, AD, ZP. Fuera de COMPLETE de lectura. UI: `CrearProyectoModal` / `postCrearProyecto`.

### Lectura HTTP real: `GET /api/dashboard/proyectos` (~11066)

- JWT + `dashboardBlockGVForbidden`.
- `planta_id` obligatorio.
- Llama `listarProyectosPorPlantaOEquivalentes(client, planta_id, true)`.
- Recorta a `{ id, codigo, nombre }`.
- **No** llama `assertPlantaPermitidaDashboard`. Gap preexistente del HTTP; el IMPL debe ser **igual o más restrictivo** (reaplicar planta).
- Side effects: ninguno.

### Helpers locales (no módulo; no exportados)

| Helper | Campos | Notas |
|---|---|---|
| `listarProyectosPorPlanta` (~3499) | id, codigo, nombre, fecha_inicio, fecha_cierre_estimada, estatus, aprobado_zp | default `soloEnCurso=true` (`estatus = 'EN_CURSO'`) |
| `listarProyectosPorPlantaOEquivalentes` (~3510) | mismos | expande IDs ubicación/código |
| `listarProyectosPorPlantaConTotales` (~3524) | + `total_folios`, `total_monto`, `total_urgentes` | agregados de `public.folios` por `proyecto_id`; `COALESCE(...,0)` en montos |
| `getProyectoById` / `getProyectoByCodigo` (~3473+) | fila completa + `planta_nombre` | incluye descripcion, fechas reales, aprobación, creado_* |

Tabla `public.proyectos` (~2666): codigo, planta_id, nombre, descripcion, fecha_inicio, fecha_cierre_estimada, fecha_cierre_real, estatus (default `EN_CURSO`), aprobado_zp, …  
`proyecto_historial` / `proyecto_archivos`: existen; **no** son requisito de COMPLETE de listado.

Consulta por nombre: no hay helper de búsqueda por nombre. Por id/codigo: sí.

### Distinción Action Register

`public.proyectos` ≠ `arr.action_register_*`. El planner ya trata la colisión: `project_status` mapea dominios `["proyectos", "action_register"]` y pide clarificación si el wording mezcla temas AR (mantenimiento/seguridad/calidad/taller) o es ambiguo («cómo van / retrasados»).

No convertir `project_status` en Action Register.

Tests en `test/` para proyectos / `get_project_status`: **ninguno**. Scripts planner/orchestrator cubren el **bloqueo** y la clarificación, no la lectura.

---

## 5. Planner / tools / chat

| Pieza | Estado físico |
|---|---|
| Intent `project_status` | Existe. Label «Proyectos». Dominios `proyectos` + `action_register`. Clarificación si colisión AR. |
| Tool `get_project_status` | `declared_not_integrated`, `executor: null`, `requiredInputs: ["planta_id"]`, domain `proyectos` |
| Capability `proyectos` | `coverage: none`, `canRead: false` |
| Tool de KPIs | **No existe** |
| Tool de plantas | **No existe** (y no hace falta) |
| Orchestrator | No ejecuta tools; solo planifica (igual que antes de M16) |
| Chat | `detectUnsupportedDirectorIaDomain` corre **antes** del planner. `UNSUPPORTED_RULES.proyectos` (~460) corta con `SOURCE_NOT_INTEGRATED` si «proyectos» + retrasad/pendient/estado/avance/`que proyectos`. |
| Chat keyword AR | `/\bproyectos?\b/` puede mapear keyword `"proyecto"` para temas AR (`director-ia-chat.js` ~1492). Distinto del módulo `public.proyectos`. |
| Intent KPI dashboard | **No existe.** `\bkpi\b` hoy cae en `financial_diagnosis` solo junto a «gastos». «Cómo va la planta» es `plant_diagnosis` (AR/IGF/ARR), no `/kpis`. |
| Cycle constitucional | M3 es tool conversacional read-only. **No** entra al cycle N1–N5. |

`project_status` / `get_project_status` **sí** corresponden al módulo Proyectos de M3 cuando no chocan con AR. El wiring existe pero está incompleto (sin executor, cortado por UNSUPPORTED_RULES).

Completar la tool existente cubre **proyectos**, no KPIs. Hace falta:

- una tool nueva de inventario runtime (p. ej. `get_dashboard_kpis`) **o**
- un loader M3 agregado que sirva ambas familias (patrón anexo IGF / `loadDuplicateFoliosForChat`),

sin contrato D1–D9 nuevo. Añadir un `id` en el registry Fase 3 no es G3 de `docs/director-ia/`.

Planner + registry se reutilizan. El orchestrator **no** despacha; el chat debe añadir ramas in-process (patrón M16).

---

## 6. Mapa authz

Ningún path propuesto puede ampliar visibilidad.

| Superficie | Restricción física |
|---|---|
| `GET /api/dashboard/plantas` | JWT; `plantas_permitidas` salvo ZP/AD/CF_CDMX |
| `GET /api/dashboard/kpis` | JWT; **GA bloqueado**; **GV bloqueado**; `buildDashboardWhere` (planta / solo_zp_ad / ventana) |
| `GET /api/dashboard/proyectos` | JWT; **GV bloqueado**; `planta_id`; **no** revalida `plantas_permitidas` |
| `POST /api/proyectos` | JWT; solo GA/GG/AD/ZP — **fuera de este COMPLETE** |
| Chat Director IA hoy | JWT + `planta_id`; **no** aplica bloqueos GA/GV de esas rutas |

Precedente M16: el loader reaplicó GV + `assertPlantaPermitidaDashboard`. El IMPL de M3 debe:

- reaplicar **GA** en KPIs;
- reaplicar **GV** en KPIs y proyectos;
- reaplicar **planta** en las tres familias;
- no listar plantas fuera de `plantas_permitidas`;
- no usar el gap del GET proyectos como permiso.

Roles GG/GA sin `plantas_permitidas`: `buildDashboardWhere` fuerza `planta_id = -1` (vacío). No fingir aislamiento extra ni relajarlo.

---

## 7. Contrato de datos

| Dato | Fuente primaria | Observado vs derivado | Freshness | Evidencia mínima |
|---|---|---|---|---|
| Identidad de planta | `public.plantas` | observado | live SELECT | `planta_id`, `nombre`, `clave` |
| KPIs dashboard | `public.folios` (+ join plantas) vía lógica de `/kpis` | observados los agregados; `avg_aging`/`oldest`/`top_*` son agregados de esa query | live; sujeto a ventana default | shape JSON del endpoint + filtros usados |
| Listado proyectos | `public.proyectos` vía helpers | observados id/codigo/nombre/fechas/estatus/aprobado_zp | live | lista por planta (+ equivalentes si el helper los usa) |
| Totales por proyecto | `public.folios` WHERE `proyecto_id` | derivados del helper de totales | live | opcional; no requisito de COMPLETE |
| «Retrasado» | **no existe** | solo derivado si se declara criterio (`fecha_cierre_estimada < hoy` ∧ estatus) | n/a | no afirmar estatus de producto |

Preservar null/unknown. No convertir ausencia de proyecto o de KPI en cero, salvo el `COALESCE` ya presente en `total_mxn` (y en totales de proyectos si se reutiliza ese helper).

No mezclar estos KPIs con IGF, ARR ni commercial_state.

---

## 8. Tabla de evidencia

| surface | canonical_requirement | current_physical_state | endpoint_or_helper | source_table_or_view | authz | side_effects | existing_director_ia_wiring | missing_delta | testability | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Plantas identidad | Scope + nombre/clave | Integrado en anexos | `resolvePlantaNombre`; chat `planta_id` | `public.plantas` | JWT + planta del chat | none | Sí | Ninguno obligatorio | Alta (ya hay queries) | Bajo | Matriz §M3; `director-ia-igf-arr.js` ~162 |
| Catálogo global plantas | No exigido para COMPLETE | Endpoint existe; filtrado | `GET /api/dashboard/plantas` / `getPlantas` | `public.plantas` | JWT; lista salvo ZP/AD/CF_CDMX | none | No cableado (y no hace falta) | No listar universo | Media | Cross-scope si se lista sin filtro | `server.js` ~7140 |
| KPIs dashboard | Consultar `/kpis` de forma consistente | Endpoint vivo; no cableado | handler `/api/dashboard/kpis`; `parseDashboardFilters` + `buildDashboardWhere` | `public.folios` ⋈ `public.plantas` | JWT; GA 403; GV 403; where de rol/planta | none | No tool, no loader, no rama | Extraer lógica + rama/tool + reaplicar GA/GV/planta | Alta (JSON fijo) | Medio (monto; semántica de «salud») | `server.js` ~11427; `KPIHeader.tsx` |
| KPIs kanban header | Citados como no consultados | Misma fuente que `/kpis` | `fetchKpis` | mismas | mismas | none | No | Cubierto al cablear `/kpis` | Alta | Confundir con IGF | `frontend-dashboard/lib/api.ts` ~1842 |
| Proyectos listado | CONSULTAR proyectos por planta | HTTP recortado; helpers más ricos; no cableado | `GET /api/dashboard/proyectos`; `listarProyectosPorPlanta*` | `public.proyectos` | JWT; GV 403; HTTP no revalida planta | none | Intent+tool declarados; executor null; UNSUPPORTED_RULES corta | Extraer helper + executor + quitar corte + authz planta | Alta | Confusión con AR; «retrasado» inventado | `server.js` ~11066, ~3499 |
| `GET /api/proyectos` | Inspección pedida por la tarea | **No existe** | solo `POST /api/proyectos` | n/a lectura | POST: GA/GG/AD/ZP | INSERT (fuera) | n/a | Usar dashboard GET + helpers; no crear GET | n/a | Tratar POST como lectura | grep `app.get("/api/proyectos")` vacío |
| Crear proyecto | Explicitamente fuera de COMPLETE | POST + modal | `POST /api/proyectos` / `crearProyecto` | `public.proyectos` | roles creación | INSERT | No | No implementar | n/a | Meter escritura en COMPLETE | matriz + CURRENT_TASK |
| Planner `project_status` | Dominio M3 vs AR | Existe; clarifica colisión | `planDirectorIaQuestion` | n/a | n/a | none | Parcial | No convertirlo en AR | Scripts planner | Colisión semántica | `director-ia-planner.js` ~237, ~68 |
| Tool `get_project_status` | Ejecución read-only | `declared_not_integrated` | registry Fase 3 | n/a | `planta_id` declarado | none | Declarado | executor + status available | Scripts tools | Completarla y olvidar KPIs | `director-ia-tools.js` ~264 |
| Capability `proyectos` | Lectura | `canRead: false` | catálogo | n/a | n/a | none | Bloqueado | `canRead` + coverage | `scripts/test-director-ia-capabilities.js` | Dejar UNSUPPORTED_RULES | `director-ia-capabilities.js` ~228, ~460 |
| Chat early-return | Acceso a la fuente | Corta proyectos | `detectUnsupportedDirectorIaDomain` | n/a | n/a | none | Bloqueo honesto | Quitar/ajustar regla `proyectos`; añadir rama KPIs | Scripts capabilities | Dejar el corte | `director-ia-chat.js` ~2445 |

---

## 9. Tabla de gaps

| gap_id | domain | missing_capability | required_for_complete | existing_reusable_component | proposed_physical_change | architecture_change | contract_change | authz_change | estimated_complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|---|
| G-P1 | plantas | Tool/catálogo global | **No** | `planta_id` + `resolvePlantaNombre` | Ninguno (exponer identidad ya resuelta en evidencia M3) | No | No | No ampliar | Baja | No |
| G-K1 | kpis | Consulta `/kpis` desde Director IA | **Sí** | handler + `parseDashboardFilters` / `buildDashboardWhere` | Extraer a lib; loader/tool; rama chat; reaplicar GA/GV/planta | No | No | Reaplicar, no ampliar | Media | Sí si no se cierra |
| G-K2 | kpis | Tool/intent de KPIs dashboard | **Sí** (o loader agregado M3) | registry Fase 3; patrón M16 | Tool nueva de inventario **o** loader M3 que sirva KPIs | No | No (no D1–D9) | Igual que G-K1 | Media | Sí si no hay ningún path de KPIs |
| G-R1 | proyectos | Executor de listado | **Sí** | `listarProyectosPorPlantaOEquivalentes` / `getProyectoById` | Extraer helper; completar `get_project_status`; rama `project_status` | No | No | Reaplicar GV + planta (más restrictivo que el HTTP) | Media | Sí si no se cierra |
| G-R2 | proyectos | Corte `UNSUPPORTED_RULES` | **Sí** | `detectUnsupportedDirectorIaDomain` | Quitar/ajustar regla `proyectos` y `canRead` | No | No | No | Baja | Sí (si no, el usuario no llega a la fuente) |
| G-R3 | proyectos | `GET /api/proyectos` | **No** | `GET /api/dashboard/proyectos` + helpers | Documentar hallazgo; no crear endpoint | No | No (sync de matriz es otra tarea) | n/a | Nula | No |
| G-R4 | proyectos | Crear proyecto | **No** | `POST /api/proyectos` | No tocar | No | No | No | n/a | No |
| G-R5 | proyectos | Estatus «retrasado» | **No** | `fecha_cierre_estimada`, `estatus` | No inventar; opcional derivado explícito | No | No | No | Baja | No |
| G-S1 | semántica | Colisión AR | No bloquea COMPLETE | clarificación del planner | Conservar clarificación; no fusionar dominios | No | No | No | Baja | No |
| G-T1 | tests | Cero tests de lectura M3 | **Sí** para el IMPL | scripts que hoy afirman bloqueo | Batería §15; actualizar scripts | No | No | No | Media | Sí para cerrar IMPL |

Un único slice IMPL puede cerrar G-K1, G-K2, G-R1, G-R2 y G-T1.

---

## 10. Fit arquitectónico

| Pregunta | Determinación |
|---|---|
| ¿Cabe en arquitectura existente? | **Sí.** Catálogo de capabilities, registry Fase 3, planner, anexos/ramas de chat. |
| ¿Toca OP / EB / EKS / IES / Reasoning? | **No.** |
| ¿Entra al cycle constitucional? | **No.** |
| ¿G2? | **N/A.** No se modifica contrato existente en `docs/director-ia/`. |
| ¿G3? | **N/A.** No se crea contrato arquitectónico nuevo. Tool id de KPIs (si se crea) es inventario runtime, no `06-*`. |
| ¿G8? | **N/A.** |

No se solicitan gates por precaución.

El orchestrator no hace falta convertirlo en dispatcher genérico.

---

## 11. Definición binaria de COMPLETE

**M3 = COMPLETE IFF** todas las siguientes son verdaderas:

1. Director IA consulta **directamente** la planta del scope (identidad ya existente) **y** los KPIs de `/api/dashboard/kpis` **y** el listado de `public.proyectos` por planta.
2. Las tres consultas son read-only, con evidencia estructurada trazable a esas fuentes.
3. Authz equivalente o más restrictiva que el dashboard: JWT + planta; GA no ve KPIs; GV no ve KPIs ni proyectos; no cross-planta.
4. Empty / error / 403 se responden sin inventar ceros (salvo `COALESCE` ya existente en `total_mxn`) ni «no hay proyectos/KPIs» como hecho universal.
5. No se afirma salud, desempeño o causalidad; no se confunde con IGF/ARR; no se confunde con Action Register.
6. «Retrasado» no se presenta como estatus almacenado.
7. Las preguntas canónicas de proyectos (p. ej. «qué proyectos» / «cómo van los proyectos» sin tema AR) **ya no** early-return `SOURCE_NOT_INTEGRATED`.
8. Las preguntas de KPIs de dashboard llegan a `/kpis`, no se responden con IGF/ARR salvo wording financiero explícito ya existente.
9. Tests focales de la batería §14 verdes.
10. Sin mutaciones (`POST /api/proyectos` y resto de escritura fuera).

Un endpoint existente **solo** no basta (hoy ya existen `/kpis` y `/dashboard/proyectos` y la cobertura es PARCIAL/NO INTEGRADA).

El sync documental de la matriz a COMPLETA queda **fuera** de este IMPL (otra tarea DOCS, como M16).

---

## 12. Viabilidad de un solo slice

**CAN_REACH_COMPLETE_IN_ONE_READ_ONLY_SLICE = YES**

Delta mínimo exacto del IMPL (no ejecutado aquí):

1. Extraer a lib la lógica de KPIs (`parseDashboardFilters` / `buildDashboardWhere` + queries del handler, o un wrapper que las reciba sin HTTP).
2. Extraer a lib `listarProyectosPorPlanta` / `listarProyectosPorPlantaOEquivalentes` (y, si se usa, `getProyectoById`). No recortar a `{id,codigo,nombre}` si se necesita fecha/estatus para responder con evidencia.
3. Loader(s) read-only que reapliquen GA (solo KPIs), GV y `assertPlantaPermitidaDashboard` / equivalente.
4. Completar `get_project_status` (`available_on_demand` + executor). Añadir tool/rama de KPIs **o** un loader M3 que sirva ambas familias. Capability `proyectos` `canRead`.
5. Ramas in-process en `askDirectorIa` (patrón `duplicate_folios`). Quitar/ajustar `UNSUPPORTED_RULES.proyectos`.
6. Conservar clarificación planner AR vs módulo Proyectos.
7. Tests §14. Actualizar scripts que afirmen `not_integrated` / blocked de proyectos.
8. Fuera: POST crear, catálogo global de plantas, cycle, UI, matriz, contratos, HTTP interno, dispatcher genérico.

No se rebaja a PARTIAL: un slice cubre las tres familias canónicas de consulta.

---

## 13. Archivos probables de implementación (no tocados ahora)

- `lib/director-ia-m3-plantas-kpis-proyectos.js` (nuevo; o dos loaders)
- `lib/director-ia-chat.js` (ramas + imports)
- `lib/director-ia-tools.js` (executor `get_project_status`; tool KPIs si aplica)
- `lib/director-ia-capabilities.js` (`proyectos` readable; regla unsupported)
- `lib/director-ia-planner.js` (solo si hace falta intent/keyword de KPIs dashboard **sin** redefinir `financial_diagnosis` / IGF)
- `server.js` (solo si se extrae helper; no nuevo endpoint)
- `scripts/test-director-ia-capabilities.js` / planner / orchestrator
- `test/director-ia-*.test.js` (focales M3)

No: `docs/director-ia/`, frontend, SQL, cycle, `CrearProyectoModal`.

---

## 14. Tests requeridos (batería del eventual IMPL)

- Happy path KPIs: shape canónico con `planta_id`; ventana documentada.
- Happy path proyectos: lista con campos del helper; planta + equivalentes si aplica.
- Empty: `proyectos: []` / KPIs en cero-o-null según el endpoint; no afirmar «no existen en el universo».
- Error de carga.
- Authz: GA 403 en KPIs; GV 403 en KPIs y proyectos; GG/GA/AD fuera de `plantas_permitidas` 403.
- Scope: no cruzar planta.
- `planta_id` ausente.
- Null: `avg_aging` / `oldest` / `top_*` no forzados a 0.
- Semántica: no salud/causalidad; no IGF; no AR; no «retrasado» como estatus.
- Wiring: preguntas de proyectos ya no `SOURCE_NOT_INTEGRATED`; pregunta de KPIs dashboard llega a la fuente.
- Registry: `get_project_status` available + executor; capability `canRead`.
- Ausencia de mutaciones: no `POST /api/proyectos`.
- Actualizar scripts que hoy exigen blocked/not_integrated de proyectos.
- Clarificación AR vs módulo Proyectos se conserva.

No hay tests actuales en `test/` que cubran estas rutas.

---

## 15. Dependencias

- JWT dashboard + `planta_id` (ya exigido).
- `public.folios`, `public.plantas`, `public.proyectos`.
- Helpers hoy alojados en `server.js` (deben extraerse o duplicación divergente).
- Precedente M16 (`lib/director-ia-duplicados.js` + rama chat) como patrón, no como fuente de datos.
- Sin dependencias externas nuevas.
- Sin migration.
- Sin secretos.

---

## 16. Riesgos

### Semánticos

- Confundir KPIs de folios con IGF/ARR/commercial_state.
- Afirmar salud, «cómo va la planta» o causalidad a partir de `total_activos` / `total_mxn` / aging.
- Confundir `public.proyectos` con Action Register (keyword `"proyecto"` del chat AR).
- Inventar estatus «retrasado».
- Convertir null/ausencia en cero (salvo `COALESCE` ya existente de `total_mxn`).
- Presentar la ventana default como universo histórico.
- Completar solo proyectos y declarar COMPLETE (faltaría KPIs).

### Productivos / authz

- Saltar GA/GV al llamar SQL crudo desde el chat.
- Usar el GET proyectos HTTP sin revalidar planta (gap preexistente).
- Listar todas las plantas a un rol acotado.
- Dejar `UNSUPPORTED_RULES.proyectos` y solo cambiar el registry.
- HTTP interno como «helper».
- Extraer mal `buildDashboardWhere` y divergir del dashboard.
- Meter M3 en el cycle.
- Actualizar mal los scripts que hoy exigen bloqueo.

---

## 17. Gates de esta auditoría

Decididos solo con evidencia:

| Gate | Decisión | Motivo |
|---|---|---|
| G1 | AUTHORIZED (humano; intacto) | `HUMAN_APPROVER` / `2026-08-21T22:23:00-06:00` |
| G2 | **N/A** | El IMPL cabe en arquitectura existente. |
| G3 | **N/A** | No hace falta contrato nuevo en `docs/director-ia/`. |
| G4 | NOT_AUTHORIZED | Sin commit/push/merge. |
| G5 | NOT_AUTHORIZED | NEXT_TASK solo propuesta. |
| G6 | N/A | |
| G7 | N/A | Sin ambigüedad contractual que bloquee. El hueco `GET /api/proyectos` es de inventario, no contradicción. |
| G8 | **N/A** | |

---

## 18. NEXT_TASK

Exactamente uno, **no autorizado, no ejecutado**:

**IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001**

Gates requeridos para ese NEXT_TASK:

- G1: humano (esta ARCH no lo autoriza)
- G2: N/A
- G3: N/A
- G8: N/A

No se propone ARCH previa: el gap está determinado y no hay decisión arquitectónica/contractual pendiente.

---

## 19. Acciones explícitamente no realizadas

- No implementación de loader, executor, capability, tool, chat, frontend ni backend.
- No cambio de capability matrix ni de `docs/director-ia/`.
- No contratos nuevos ni editados.
- No SQL / migration.
- No creación/edición/eliminación de proyectos.
- No mutación de folios ni Action Register.
- No tests escritos ni ejecutados.
- No commit, push, merge.
- No autorización ni ejecución del NEXT_TASK.
- No se reutilizaron timestamps de tareas anteriores.
- G1 conservado: `HUMAN_APPROVER` / `2026-08-21T22:23:00-06:00`.

---

## 20. Respuestas a las preguntas secundarias

1. **Catálogo de plantas para COMPLETE:** resolver la planta actual/autorizada. No exponer listado completo.
2. **Campos `/kpis`:** `total_activos`, `total_mxn`, `pendientes_zp`, `avg_aging`, `top_planta`, `top_categoria`, `oldest` (semántica §3).
3. **Permisos `/kpis`:** JWT + bloqueo GA financiero + bloqueo GV + `buildDashboardWhere`.
4. **Helper KPI reusable:** no. Lógica acoplada al handler; hay que extraerla.
5. **`GET /api/proyectos`:** no existe. Lectura = `GET /api/dashboard/proyectos` `{id,codigo,nombre}` + helpers más ricos.
6. **Helpers proyectos:** sí, locales en `server.js` (`listarProyectosPorPlanta*`, `getProyectoById`/`Codigo`, totales).
7. **vs Action Register:** tablas y semántica distintas; planner ya clarifica.
8. **`project_status` / `get_project_status`:** corresponden a M3 Proyectos; colisión posible con AR; no convertir.
9. **Planner + orchestrator:** se reutiliza el planner/registry; el orchestrator no ejecuta; chat in-process. Sin contrato nuevo.
10. **Evidencia/tests para COMPLETE:** §11 y §14.

---

## 21. git diff --check / git status

`git diff --check`: limpio (exit 0, sin output).

`git status`:

```
On branch architecture/director-ia-m3-plantas-kpis-proyectos-readiness-001
Changes not staged for commit:
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md
```

Solo los dos archivos writable. Sin commit.
