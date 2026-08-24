# DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

**Tipo:** Mapa de capacidades y fuentes (solo lectura del repositorio)  
**Fecha:** 2026-08-04  
**Documento base verificado:** [`docs/ARQUITECTURA_DASHBOARD_FOLIOS.md`](../ARQUITECTURA_DASHBOARD_FOLIOS.md)  
*(La ruta `docs/director-ia/ARQUITECTURA_DASHBOARD_FOLIOS.md` no existe en el repositorio; se usa la ubicación real del archivo.)*  
**Evidencia de código adicional:** `lib/director-ia-*.js`, `lib/cliente-comentarios.js`, `lib/comercial-entidad.js`, `lib/usuario-permisos.js`, `server.js` (rutas `/api/director-ia/*`).

**Límites de este documento**

- No modifica código, configuración ni DDL.
- No propone implementaciones ni calendarios.
- Toda capacidad afirmada cita archivo, función, endpoint o tabla existente.
- Donde el repositorio no confirma algo, se marca **DESCONOCIDA** o se lista en «preguntas pendientes».

---

## Índice navegable

1. [Parte 1 — Definiciones](#parte-1--definiciones)
2. [Parte 2 — Matriz maestra M0–M20](#parte-2--matriz-maestra-m0m20)
3. [Parte 3 — Catálogo de fuentes](#parte-3--catálogo-de-fuentes)
4. [Parte 4 — Capacidades de negocio (preguntas)](#parte-4--capacidades-de-negocio-preguntas)
5. [Parte 5 — Matriz de veracidad](#parte-5--matriz-de-veracidad)
6. [Parte 6 — Lectura contra ejecución](#parte-6--lectura-contra-ejecución)
7. [Parte 7 — Prioridad de integración](#parte-7--prioridad-de-integración)
8. [Parte 8 — Hallazgos críticos](#parte-8--hallazgos-críticos)
9. [Parte 9 — Resultado final](#parte-9--resultado-final)

---

## Parte 1 — Definiciones

### Cobertura actual

| Etiqueta | Significado operativo |
|----------|----------------------|
| **COMPLETA** | Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente. |
| **PARCIAL** | Consulta solo una parte del dominio, un resumen, filas limitadas o únicamente bajo demanda (p. ej. regex de chat). |
| **INDIRECTA** | Conoce datos relacionados, pero no consulta el módulo real (endpoints/UI del dominio). |
| **NO INTEGRADA** | El dominio existe en el dashboard/API, pero Director IA no lo consulta. |
| **DESCONOCIDA** | El repositorio no permite confirmar la integración. |

### Tipos de capacidad

`CONSULTAR` · `BUSCAR` · `RESUMIR` · `COMPARAR` · `EXPLICAR` · `DETECTAR RIESGOS` · `RECOMENDAR` · `CREAR` · `EDITAR` · `APROBAR` · `CANCELAR` · `ENVIAR` · `DESCARGAR DOCUMENTO`

### Nivel de riesgo

| Nivel | Criterio |
|-------|----------|
| **BAJO** | Solo lectura sin datos especialmente sensibles. |
| **MEDIO** | Información financiera, comercial, personal o documental. |
| **ALTO** | Cambia estados, dinero, autorizaciones, documentos o historial operativo. |

### Superficie actual de Director IA (evidencia)

| Pieza | Evidencia |
|-------|-----------|
| Flag | `ENABLE_DIRECTOR_IA` (`lib/director-ia.js`); chat también `AI_ENABLED` + `OPENAI_API_KEY` |
| Auth | `dashboardAuthMiddleware` en todas las rutas `/api/director-ia/*` |
| GET contexto | `GET /api/director-ia/context` → `buildDirectorIaContextPayload` (`lib/director-ia-context.js`) |
| Chat | `POST /api/director-ia/chat` → `askDirectorIa` (`lib/director-ia-chat.js`) |
| Routing chat | Regex / heurísticas en `director-ia-chat.js`, `director-ia-igf-arr.js`, `director-ia-commercial-state.js` |
| Fuentes en GET `sources` | `action_register`, `dicf`, `bitacora_ia`, `cliente_comentarios`, `folio_comentarios` pueden pasar a `true`; `igf`, `arr`, `commercial_state` permanecen `false` en `EMPTY_SOURCES` |
| Fuentes solo en chat | Anexo IGF/ARR (`loadIgfArrAnnexForChat` + `extractIgfComposition` sobre 1 fila de `igf.compromiso_lines`; no recálculo; no overlay), estado comercial (`loadCommercialStateForChat`), expediente comercial factual (`loadCommercialDossierForChat`; SELECT-only; no `computeDicf`); Mejora Continua (`loadMejoraContinuaForChat`); M6 GASTOS/INVERSIONES (`loadGastosInversionesForChat`); M5 Taller por AT (`loadTallerAtForChat`; SELECT `public.folios.unidad`; no Excel; no duplicados); M4 clasificación query (`loadClasificacionApoyosForChat`); M18 presupuesto semanal (`loadPresupuestoSemanalForChat`) |
| Persistencia de chat | No hay tabla de historial; solo `req.body.history` opcional en el request |
| Escritura propia del módulo | Bitácora y entidades comerciales vía API CRUD (no vía chat) |

---

## Parte 2 — Matriz maestra M0–M20

### M0 — Auth / permisos transversales

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M0 |
| **Módulo** | Auth / sesión dashboard |
| **Propósito empresarial** | Autenticar al usuario del dashboard y aplicar permisos/roles por planta. |
| **Cobertura actual de Director IA** | PARCIAL |
| **Información exacta que sí consulta** | JWT vía `req.dashboardAuth`; acceso a planta (`assertPlantaAccess` / helpers inyectados); rol GA bloqueado en commercial_state (`dashboardAuthRoleNorm === "GA"`). |
| **Información que no consulta** | Catálogo completo de permisos como dominio de respuesta; CRUD usuarios; unlock admin. |
| **Archivos actuales relacionados** | `lib/dashboard-auth.js`, `lib/usuario-permisos.js`, `frontend-dashboard/lib/auth.ts`, guards en `server.js` |
| **Endpoints actuales relacionados** | Middleware en `/api/director-ia/*`; no hay endpoint Director IA de «listar permisos». |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.roles` (lectura incidental de roles en Action Register). Vistas: no encontradas en repo. |
| **Funciones existentes reutilizables** | `authHasPermiso`, `dashboardAuthMiddleware`, `assertPlantaPermitidaDashboard` (server) |
| **Capacidades de lectura posibles** | CONSULTAR (quién está autenticado / si tiene acceso a planta) — solo a nivel de gate, no como respuesta de negocio. |
| **Capacidades de escritura posibles** | Ninguna vía Director IA chat. Cambiar permisos existe en `/api/usuarios-admin*` (fuera de Director IA). |
| **Permisos aplicables** | Token JWT; `acceso_acciones_dicf` / `acceso_consola_whatsapp_ar` catalogados; enforcement WhatsApp nivel 6 (GO/SG/SEH) limitado a `AR` y `DirectorIA`. |
| **Nivel de riesgo** | ALTO (si se usara para mutar permisos); lectura de gates = MEDIO. |
| **Dependencias** | Todos los módulos dashboard. |
| **Observaciones verificadas** | Director IA no expone el catálogo `PERMISO_CLAVES` al LLM; solo aplica auth de entrada. |

### M1 — Health

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M1 |
| **Módulo** | Health |
| **Propósito empresarial** | Monitoreo de servicio y DB. |
| **Cobertura actual de Director IA** | PARCIAL |
| **Información exacta que sí consulta** | Readiness técnica de Director IA vía `GET /health-director-ia` (`enabled` / `ready`) en el header de `DirectorIaShell`. Estados UI: `loading`, `ready`, `disabled`, `unavailable`, `transport_error`. One-shot al entrar al módulo + refresh manual. Sin polling. Sin retry automático. Request sin `Authorization`. Desacoplado de `DirectorIaCyclePanel`. |
| **Información que no consulta** | `GET /health`, `GET /health-db`, `GET /health-proyectos`. No hay herramienta de chat/LLM. `ready=true` no significa datos disponibles, operación saludable, `ACQUIRED_OK` ni conclusión de negocio. |
| **Archivos actuales relacionados** | `server.js` (ruta existente), `lib/director-ia-dashboard-cycle-transport.js` (`handleGetDirectorIaReadiness`), `frontend-dashboard/modules/director-ia/lib/api.ts` (`fetchDirectorIaHealth`), `frontend-dashboard/modules/director-ia/lib/health-client-core.js`, `frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx`, `test/director-ia-dashboard-health-client.test.js`. `frontend-dashboard/app/health/route.ts` permanece ajeno (health del frontend Next). |
| **Endpoints actuales relacionados** | Integrado: `GET /health-director-ia`. Existentes y no consultados por este slice: `GET /health`, `GET /health-db`, `GET /health-proyectos`. |
| **Tablas o vistas relacionadas** | Ninguna propia. |
| **Funciones existentes reutilizables** | `fetchDirectorIaHealth` / `interpretDirectorIaHealthResponse`; handler `handleGetDirectorIaReadiness`. Handlers `/health`, `/health-db`, `/health-proyectos` no usados por Director IA. |
| **Capacidades de lectura posibles** | CONSULTAR readiness técnica del servicio Director IA en dashboard. No CONSULTAR liveness/DB/proyectos. No tool conversacional. |
| **Capacidades de escritura posibles** | N/A |
| **Permisos aplicables** | Sin auth en `GET /health-director-ia`. El módulo de página sigue exigiendo token para ver el shell. |
| **Nivel de riesgo** | BAJO |
| **Dependencias** | Ninguna de negocio. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001` (integrado en main). Tests focales 14/14; suite `test/director-ia-*.test.js` 399/399 según el reporte IMPL. No se declara COMPLETA: el dominio Health de producto (`/health`, `/health-db`, `/health-proyectos`) sigue fuera. |

### M2 — Kanban / Folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M2 |
| **Módulo** | Kanban / Folios |
| **Propósito empresarial** | Flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias). |
| **Cobertura actual de Director IA** | PARCIAL (comentarios de folio + slice read-only `folio_status` + slice read-only `folio_history` + slice read-only `folio_documents` metadata-only). **No** es COMPLETE: no cubre el kanban HTTP, contenido PDF/S3, documentos faltantes, cumplimiento documental, cheque/póliza, `kanban_flow` inferencial ni mutaciones. |
| **Información exacta que sí consulta** | Comentarios: `loadFolioComentariosForDirectorIa` (límite 80) → `public.comentarios` ⋈ `public.folios`. Estatus/etapa on-demand: intent `folio_status` → tool `get_folio_status` → `loadFolioStatusForChat` → SELECT-only (`getFolioById` / `getFolioByNumero` / `getManyFoliosStatus` / `listFoliosByPlanta` + `buildDashboardWhere` con `ventana: "0"`). Consulta por id, por `numero_folio`, varios folios, listado por planta y filtro/listado por etapa. `estatus` = columna observada `public.folios.estatus`. `etapa` = derivada con `estatusToEtapaVisual` (no hay columna DB `etapa`). Historial on-demand: intent `folio_history` → tool `get_folio_history` → `loadFolioHistoryForChat` → resolver/autorizar folio → SELECT-only `public.folio_historial` (`listHistorialForFolio`). History por id o por `numero_folio`. Campos observados del evento: `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`. `etapa` del evento = derivada con `estatusToEtapaVisual` **solo** si el `estatus` del evento existe y mapea. Eventos no deduplicados; misma etapa repetida se preserva. Metadata documental on-demand: intent `folio_documents` → tool `get_folio_documents` → `loadFolioDocumentsMetadataForChat` → resolver/autorizar folio → SELECT-only `public.folio_archivos` (`listDocumentsMetadataForFolio`) → `projectDocument` (allowlist). Metadata por id o por `numero_folio`. Campos seguros: `document_id`, `tipo`, `status`, `file_name`, `subido_en` + identidad mínima del folio. Semántica: «Estos son los registros documentales que existen para este folio.» Cero filas: «no hay registros documentales encontrados» (**no** «faltan documentos»). Evidencia status: `folio_id`, `numero_folio`, `estatus`, `etapa`, `planta_id`, `planta_nombre`, `source`, `retrieved_at`. Evidencia history: esos identificadores + eventos crudos (`event_id` solo si `id` físico existe). Evidencia documents: esos identificadores + registros proyectados (`source` = `public.folio_archivos`). |
| **Información que no consulta** | `GET /api/dashboard/kanban` (excluido: puede autoavanzar). `GET /api/folios/:id` (excluido: puede autoavanzar). `GET /api/folios/:id/timeline` (excluido como transporte interno; no autoavanza, pero no es fuente de Director IA y su `dedupeHistorialByStage` no se copia). `maybeAdvanceFolioToComprobaciones`. `dedupeHistorialByStage`. Contenido PDF, S3, signed URLs, descarga, OCR. `s3_key`, URL, bucket, raw path, `sha256`, bytes. Documentos faltantes / cumplimiento documental. Cheque, póliza, presupuesto. `kanban_flow` inferencial. `estatus_anterior` / `estatus_nuevo` / `event_type` del evento (no existen en la fila). Actor sistema inferido (actor null **no** significa sistema). Crear/editar/aprobar/cancelar. Cualquier UPDATE/INSERT/DELETE. |
| **Archivos actuales relacionados** | `lib/director-ia-m2-folio-status.js`; `lib/director-ia-m2-history.js`; `lib/director-ia-m2-documents-metadata.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; comentarios: `lib/cliente-comentarios.js`. `server.js` handlers kanban/`/folios/:id`/`/timeline`/`/media` **no** usados por Director IA. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno). Folios HTTP existentes y **no** usados como fuente: `/api/dashboard/kanban`, `/api/folios/:id` (pueden llamar `maybeAdvanceFolioToComprobaciones`); `/api/folios/:id/timeline` (no autoavanza; excluido por HTTP interno + dedupe); `/api/folios/:id/media*`, `/cotizacion`, `documento-*` (excluidos: pueden exponer `s3_key` o contenido). |
| **Tablas o vistas relacionadas** | `public.folios` (estatus observado), `public.plantas`, `public.comentarios`, `public.folio_historial` (eventos observados del slice history), `public.folio_archivos` (solo metadata del slice documents; SELECT sin `s3_key`/`url`/`sha256`). |
| **Funciones existentes reutilizables** | `loadFolioStatusForChat`, `getFolioById`, `getFolioByNumero`, `getManyFoliosStatus`, `listFoliosByPlanta`, `estatusToEtapaVisual`, `etapaVisualToEstatusTecnicos`, `buildDashboardWhere`, `loadFolioHistoryForChat`, `listHistorialForFolio`, `loadFolioDocumentsMetadataForChat`, `listDocumentsMetadataForFolio`, `projectDocument`, `assertFolioStatusAccess`, `folioVisibleToAuth`, `folioInPlantScope`, `loadFolioComentariosForDirectorIa`. |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR comentarios; CONSULTAR estatus observado; CONSULTAR etapa derivada; BUSCAR por id/`numero_folio`; LISTAR por planta/etapa; CONSULTAR historial de eventos observados (sin dedupe); CONSULTAR metadata documental registrada (sin contenido). CONSULTAR PDF/S3/faltantes/cheque/póliza **no** integrados. |
| **Capacidades de escritura posibles** | CREAR/EDITAR/APROBAR/CANCELAR folio existen en API folios; **no** conectadas a Director IA. No autoavance. No uploads/deletes de media. |
| **Permisos aplicables** | JWT/`req.dashboardAuth`; rol; `planta_id`; `plantas_permitidas` (GG/GA/AD fail-closed). GV = 403. GA solo en planta autorizada. Folio cross-planta = 403. Not found = 404. History y metadata: resolver folio y autorizar **antes** de consultar `public.folio_historial` / `public.folio_archivos`. |
| **Nivel de riesgo** | Lectura estatus/etapa/historial/comentarios/metadata: MEDIO. Mutaciones folio / exposición S3: ALTO (fuera de Director IA). |
| **Dependencias** | Plantas; equivalentes M3; contenido M15, presupuestos (carro) y proyectos siguen fuera de este slice. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001` (main `e5bd3a05`) + `IMPL-DIRECTOR-IA-M2-HISTORY-001` (main `368394f7`) + `IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001` (main `243d7e91`). Tests metadata: focales 24/24; capabilities 33/33; planner 36/36; orchestrator 24/24; suite `test/director-ia-*.test.js` 533/533; `git diff --check` limpio. M2 **sigue PARCIAL**. Scoring M0–M20 **sin cambio**: 8.5/20 = **42.5%** (PARTIAL ya valía 0.5; no se suma +2.5 pp). |

### M3 — Plantas / KPIs / Proyectos

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M3 |
| **Módulo** | Plantas / KPIs / Proyectos |
| **Propósito empresarial** | Catálogo de plantas, KPIs de dashboard, proyectos por planta. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la consulta canónica de las tres familias: planta del scope, KPIs de dashboard y proyectos por planta; no implica catálogo global, estatus «retrasado» almacenado ni creación de proyectos). |
| **Información exacta que sí consulta** | `planta_id` obligatorio + `nombre`/`clave` de la planta del scope; KPIs de folios vía `get_dashboard_kpis` / `loadDashboardKpisForChat` / `queryDashboardKpis` (misma semántica que `GET /api/dashboard/kpis`: `total_activos`, `total_mxn`, `pendientes_zp`, `avg_aging`, `oldest`, `top_planta`, `top_categoria`, ventana default); listado `public.proyectos` EN_CURSO vía `get_project_status` / `loadProyectosForChat`. |
| **Información que no consulta** | Catálogo global de plantas; crear/editar/eliminar proyecto (`POST /api/proyectos`); estatus almacenado «retrasado»; IGF/ARR/commercial_state como sustituto de estos KPIs. |
| **Archivos actuales relacionados** | `lib/director-ia-m3-plantas-kpis-proyectos.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; `server.js` reutiliza helpers extraídos. UI `CrearProyectoModal` sigue fuera de Director IA. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno): lógica de `GET /api/dashboard/kpis` y helpers de `GET /api/dashboard/proyectos`. Escritura existente y no integrada: `POST /api/proyectos`. `GET /api/proyectos` no existe. |
| **Tablas o vistas relacionadas** | `public.plantas`, `public.folios` (KPIs), `public.proyectos`, `proyecto_*` (no requisito de COMPLETE) |
| **Funciones existentes reutilizables** | `loadDashboardKpisForChat`, `queryDashboardKpis`, `parseDashboardFilters`, `buildDashboardWhere`, `loadProyectosForChat`, `listarProyectosPorPlantaOEquivalentes`; identidad de planta en anexos IGF/ARR / commercial_state. |
| **Capacidades de lectura posibles** | CONSULTAR identidad de planta del scope; CONSULTAR KPIs dashboard; CONSULTAR proyectos por planta. |
| **Capacidades de escritura posibles** | CREAR proyecto (`POST /api/proyectos`) — **no** en Director IA. |
| **Permisos aplicables** | JWT + `planta_id`; `plantas_permitidas` (GG/GA/AD); GA bloqueado en KPIs; GV bloqueado en KPIs y proyectos. |
| **Nivel de riesgo** | Lectura planta: BAJO. KPIs financieros (monto): MEDIO. |
| **Dependencias** | Base de casi todos los módulos. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001` (integrado en main, `b4761802`). Tests focales 20/20; suite `test/director-ia-*.test.js` 436/436; scripts capabilities 22/22, planner 30/30, orchestrator 21/21. COMPLETE = consulta autorizada de las tres familias; no catálogo global; no mutaciones; no cycle. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED=0.0): 7.5/20 = 37.5% → **8.0/20 = 40.0%**. |

### M4 — Clasificación de apoyos + COMPARAR

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M4 |
| **Módulo** | Clasificación de apoyos + COMPARAR |
| **Propósito empresarial** | Comparativo mensual por planta/categoría; reconciliación Excel. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de matriz comparativa `mes_a` vs `mes_b` por planta y familia). **No** es COMPLETE: el propósito canónico incluye COMPARAR y reconciliación Excel, que permanecen fuera. |
| **Información exacta que sí consulta** | Matriz agregada de `public.folios` vía `buildClasificacionMatrix`: GASTOS, INVERSIONES y TALLER separados; `valor_a`, `valor_b`, `delta` absoluto; `%` solo si la base (`valor_b`) ≠ 0. `mes_a` y `mes_b` obligatorios, formato `YYYY-MM`, A ≠ B; no se inventan periodos. 0 filas = matriz de ceros (respuesta válida). El delta es factual: aumento/disminución observada; no implica causa, problema, mejora, cumplimiento, desviación presupuestal ni responsable. |
| **Información que no consulta** | COMPARAR (inspección/agregar/rechazar/confirmar); `insertFolio`; `UPDATE mes_cargo`; Excel/xlsx; `buildClasificacionApoyosWorkbook`; GET `/clasificacion-apoyos-excel`; detalle de celda HTTP; fallback a 6 plantas. No es listado M6 (`expandCategoriaRows`). Celda TALLER ≠ M5 Taller por AT. No IGF. |
| **Archivos actuales relacionados** | `lib/director-ia-m4-clasificacion-query.js`; `lib/clasificacion-apoyos-excel.js` (`buildClasificacionMatrix`, `PLANTAS_COMPARATIVO` únicamente); wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`. `lib/clasificacion-comparar.js` **no** usado. |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). GET `/api/dashboard/clasificacion-apoyos*` y POST `/clasificacion-comparar*` **no** se usan como transporte interno. |
| **Tablas o vistas relacionadas** | Lectura `public.folios` (sin tablas `clasificacion_*`). Escritura de COMPARAR existe en producto y **sigue fuera**. |
| **Funciones existentes reutilizables** | `loadClasificacionApoyosForChat` → SELECT + `buildClasificacionMatrix`. **No** `resolvePlantasComparativo` (evita fallback global). **No** `buildClasificacionApoyosWorkbook`. Authz: `requirePlantaId` + `assertFolioStatusAccess` + grupo canónico ∩ `plantas_permitidas`. |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR (tipo lectura: diffs A vs B) / RESUMIR matriz. DESCARGAR DOCUMENTO / reconciliación Excel **no** cableados. |
| **Capacidades de escritura posibles** | Actualizar/agregar folios vía COMPARAR — ALTO; **no** en Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id` obligatorio; `plantas_permitidas`; GV 403; GA permitido solo si el grupo comparativo completo está autorizado; cross-planta 403; planta fuera de `PLANTAS_COMPARATIVO` = fail-closed (no 6 provincias); privados excluidos (sin `priv_clave` de chat). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (actualizar vía COMPARAR — fuera). |
| **Dependencias** | Folios, plantas. Distinto de M5, M6 y M7. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001` (integrado en main, `2c240407`). Tests: focales 18/18; capabilities 42/42; planner 39/39; orchestrator 24/24; suite `test/director-ia-*.test.js` 575/575; `git diff --check` limpio. COMPARAR/Excel **siguen fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0): 9.0/20 = 45.0% → **9.5/20 = 47.5%**. |

### M5 — Taller por AT

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M5 |
| **Módulo** | Taller por AT |
| **Propósito empresarial** | Excel de gasto taller por unidad AT, con hoja de duplicados. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de folios TALLER por token de `public.folios.unidad`, planta y `YYYY-MM`). **No** es COMPLETE: el propósito canónico incluye Excel/workbook y hoja de duplicados, que permanecen fuera. |
| **Información exacta que sí consulta** | Slice on-demand `taller_at` → `get_taller_at` → `loadTallerAtForChat` → SELECT `public.folios` (`categoria LIKE '%TALLER%'`; `estatus <> 'CANCELADO'`) + `expandTallerRows`. Unidad = token físico de `public.folios.unidad` homologado con `unidad-taller` (ej. `AT-15`, `PT-03`). **No** existe `at_id`. **No** existe catálogo AT. Unidad ≠ responsable. Periodo `YYYY-MM` obligatorio (un mes o rango de dos); si falta, clarifica; no inventa mes. Campos observados: unidad, folio, periodo, concepto, importe, estatus; count/total del conjunto consultado. 0 filas: «No se encontraron registros TALLER para esa planta/unidad/periodo.» Authz folios **antes** del SELECT (`assertFolioStatusAccess`). In-process. Sin HTTP interno. |
| **Información que no consulta** | Excel/workbook (`buildTallerAtWorkbook`); GET `/api/dashboard/taller-at-excel`; hoja de duplicados de taller (detector ≠ M16); writes; `priv_clave`. No es listado M6 GASTOS/INVERSIONES. No es familia agregada M4. No es «cómo va Taller» (Action Register). No afirma causa, responsable, atraso, urgencia, desviación. |
| **Archivos actuales relacionados** | `lib/director-ia-m5-taller-at.js`; `lib/taller-at-excel.js` (`expandTallerRows` únicamente); `lib/unidad-taller.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). El GET `/api/dashboard/taller-at-excel` **no** se usa como transporte interno. |
| **Tablas o vistas relacionadas** | `public.folios` ⋈ `public.plantas`. Campo de unidad: `public.folios.unidad`. |
| **Funciones existentes reutilizables** | `loadTallerAtForChat` → SELECT + `expandTallerRows` + `parseUnidadesList`. **No** `buildTallerAtWorkbook`. Authz: `assertFolioStatusAccess` (no el bloqueo GA de KPIs IGF). |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR gasto TALLER por unidad. DESCARGAR DOCUMENTO / Excel / duplicados taller **no** cableados. |
| **Capacidades de escritura posibles** | DESCARGAR xlsx en API dashboard; no vía chat Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed. Privados excluidos (sin `priv_clave`). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO si se lee como AR, M4, M6, causa o Excel. |
| **Dependencias** | Folios. Distinto de M4, M6, M7 y Action Register. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M5-TALLER-AT-001` (integrado, merge `848d3eb1`). Tests: focales 16/16; capabilities 56/56; planner 49/49; orchestrator 26/26; suite `test/director-ia-*.test.js` 673/673; `git diff --check` limpio. TALLER ≠ GASTOS ≠ INVERSIONES. M4 familia TALLER ≠ detalle por unidad. «cómo va Taller» / acciones AT-15 siguen AR. Excel/duplicados **siguen fuera**. M5 = **PARCIAL**. **No** COMPLETE. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0): 10.0/20 = 50.0% → **10.5/20 = 52.5%**. |

### M6 — GASTOS / INVERSIONES (rango Excel)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M6 |
| **Módulo** | GASTOS / INVERSIONES Excel |
| **Propósito empresarial** | Export por categoría y ventana de meses. |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only de folios GASTOS e INVERSIONES por planta y `YYYY-MM`). **No** es COMPLETE: el propósito canónico incluye Export/xlsx, que permanece fuera. |
| **Información exacta que sí consulta** | Listados estructurados de `public.folios` categoría GASTOS xor INVERSIONES (predicados físicos distintos; no se mezclan). Campos observados tras `expandCategoriaRows`: folio, partida/subcategoría, concepto, importe, estatus, beneficiario, `mes_cargo`. Conteos/totales solo del conjunto consultado. Periodo `YYYY-MM` obligatorio (un mes o rango de dos; no se inventa mes). 0 filas es respuesta válida. |
| **Información que no consulta** | Export/xlsx; `buildCategoriaRangoWorkbook`; GET `/categoria-rango-excel`; Taller AT (M5); IGF/ARR (M7/M8). No afirma desviación, causa, comparación ni «pendiente» como etapa. |
| **Archivos actuales relacionados** | `lib/director-ia-m6-gastos-inversiones.js`; `lib/categoria-rango-excel.js` (`expandCategoriaRows` únicamente); wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). El GET `/api/dashboard/categoria-rango-excel` **no** se usa como transporte interno. |
| **Tablas o vistas relacionadas** | `public.folios` ⋈ `public.plantas` |
| **Funciones existentes reutilizables** | `loadGastosInversionesForChat` → SELECT + `expandCategoriaRows`. **No** `buildCategoriaRangoWorkbook`. Authz: `assertFolioStatusAccess` (no el bloqueo GA de KPIs IGF). |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR listados GASTOS e INVERSIONES de folios. DESCARGAR DOCUMENTO / Export **no** cableado. |
| **Capacidades de escritura posibles** | N/A en este módulo. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; GV 403; GA permitido en planta autorizada; cross-planta 403; fail-closed. Privados excluidos (equivalente a GET sin `priv_clave`). |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | Folios. Distinto de IGF (M7). |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001` (integrado en main, `7b8e8bdf` / `2d145056`). Tests: focales 24/24; capabilities 38/38; planner 37/37; orchestrator 24/24; suite `test/director-ia-*.test.js` 557/557; `git diff --check` limpio. GASTOS ≠ INVERSIONES ≠ IGF. «cómo van los gastos» / margen / rentabilidad siguen M7. Export/xlsx **sigue fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0): 8.5/20 = 42.5% → **9.0/20 = 45.0%**. |

### M7 — IGF Forecast

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M7 |
| **Módulo** | IGF Forecast |
| **Propósito empresarial** | Forecast financiero por planta/empresa, compromiso, HG, pronóstico. |
| **Cobertura actual de Director IA** | PARCIAL (chat on-demand + slice de composición observada de **una** fila). `sources.igf` siempre false en GET context. **No** es COMPLETE: UI IGF, PATCH HG, meta Excel, versiones UI, overlay de folios, recálculo y causalidad permanecen fuera. |
| **Información exacta que sí consulta** | Anexo IGF on-demand: `igf_status` / `financial_diagnosis` → `get_igf_snapshot` → `loadIgfArrAnnexForChat` → `loadIgfCommitSnapshot` (`SELECT id, version_number` de `igf.versions` GLOBAL del mes, `ORDER BY version_number DESC LIMIT 1`; `SELECT *` de `igf.compromiso_lines`; `findIgfRowForPlant` → **una** fila: planta + versión + mes) → `extractIgfComposition` (allowlist `IGF_COMPOSITION_CATALOG`; omite null/`""`/no finito; `omitted_null_keys`; ranking de magnitud solo intra `$/kg` de roles `add`/`subtract`) → `formatIgfCompositionBlock` (bloque «COMPOSICIÓN IGF (snapshot, no tendencia)») → evidencia en annex. Margen vía `getMargenKgPorPeriodo` (inyectado). Activado por `shouldAttachIgfArrAnnex` / `isPlantFinancialKpiQuestion` / `isIgfCompositionQuestion` / `isIgfForecastQuestion`. Fuente de líneas: `igf.compromiso_lines`. Unidades: `*_kg` = **$/kg**, no kilogramos; `ton` ≠ `$/kg` ≠ `%` ≠ `MXN`; no se mezclan. Null ≠ 0 (null se omite, no se emite como cero). Signo físico preservado; `hg_kg` **no** invertido. `gasto_kg` tiene `formula_role: none` (aparece en el snapshot; no entra a la fórmula de utilidad/resultado). `recalcularUtilYResultado` es **referencia semántica** de roles (`add`/`subtract`/`stored_*`); **no** se ejecuta. Sin overlay de folios. `ORDER_DELTAS` es presentación UI; **no** se importa ni entra a fórmula. Snapshot ≠ tendencia: `isIgfCompositionQuestion` es false ante «cómo cambió venta/descuento/ingreso» (M9). Composición ≠ causalidad; magnitud ≠ importancia operacional; línea ≠ responsable; signo ≠ juicio empresarial. |
| **Información que no consulta** | UI completa IGF, PATCH HG, meta Excel, metahg completo, `igf-folios-detalle`, presupuesto-detalle UI, versiones UI. Recálculo de utilidad/resultado. Overlay de folios/presupuesto del GET dashboard. Deltas temporales de líneas IGF (dominio M9). Causalidad / problema / responsable / prioridad. GET `sources.igf`. |
| **Archivos actuales relacionados** | `lib/director-ia-igf-arr.js` (`extractIgfComposition`, `formatIgfCompositionBlock`, `loadIgfCommitSnapshot`, `loadIgfArrAnnexForChat`); wiring existente `lib/director-ia-tools.js` (`get_igf_snapshot`), `lib/director-ia-planner.js` (`igf_status` / `financial_diagnosis`), `lib/director-ia-capabilities.js`; `igf-handler.js`, `lib/dashboard-arr-forecast.js` (referencia de producto; no transporte del slice). |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process; sin HTTP interno). Dashboard (no usados por IA): `/api/dashboard/igf-*`. |
| **Tablas o vistas relacionadas** | `igf.versions`, `igf.compromiso_lines`. Schemas `igf_meta` / `igf_metahg` (UI; no en el bloque de composición). |
| **Funciones existentes reutilizables** | `loadIgfArrAnnexForChat`, `loadIgfCommitSnapshot`, `extractIgfComposition`, `formatIgfCompositionBlock`, `isIgfCompositionQuestion`, `buildIgfForecastPayload` (handler/server). **No** `recalcularUtilYResultado`. **No** `ORDER_DELTAS`. |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR/EXPLICAR KPIs bajo demanda. CONSULTAR composición observada de un snapshot IGF (1 fila; read-only; sin causalidad; sin tendencia). |
| **Capacidades de escritura posibles** | PATCH IGF existe en dashboard; no en Director IA. Slice read-only; sin writes. |
| **Permisos aplicables** | Authz IGF vigente del annex: JWT/contexto; GA → 403 («GA no tiene acceso a KPIs financieros.»); GV vía `assertGVPlantaNombreAccess`; planta del scope; cross-planta bloqueado; fail-closed. `acceso_igf_forecast_kpis` en UI. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO si se lee composición como causa, problema, responsable o tendencia. |
| **Dependencias** | ARR (proyección en el mismo annex), folios KPI, plantas. Distinto de M6 (folios GASTOS/INVERSIONES) y de M9 (deltas de periodos reales). |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001` (integrado, merge `05eb54c4`). Tests: focales 13/13; capabilities 52/52; planner 46/46; orchestrator 26/26; suite `test/director-ia-*.test.js` 657/657; `git diff --check` limpio. Runtime: read-only, in-process, sin HTTP interno, sin writes. Chat no se tocó: el annex ya entra al prompt. M7 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 **sin cambio**: 10.0/20 = **50.0%** (PARTIAL ya valía 0.5; no se suma +2.5 pp). Diferencia GET context vs chat sigue siendo hallazgo (Parte 8). |

### M8 — ARR / Forecast provincia

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M8 |
| **Módulo** | ARR |
| **Propósito empresarial** | Carga y forecast de ventas/descuentos por cliente y provincia. |
| **Cobertura actual de Director IA** | PARCIAL (anexo chat + motor DICF/commercial_state que lee ARR) |
| **Información exacta que sí consulta** | `loadArrProyForPlant`, top clientes (`loadTopClientesDescBrief`), `dashboard-arr-forecast` helpers; `dicf.computeDicf` lee datos ARR. |
| **Información que no consulta** | UI `/arr`, `POST /api/arr/load`, Excel dashboard ARR completo, refresh provincia como herramienta IA. |
| **Archivos actuales relacionados** | `lib/director-ia-igf-arr.js`, `lib/arr-load.js`, `lib/dashboard-arr-forecast.js`, `lib/dicf.js` |
| **Endpoints actuales relacionados** | `/api/arr/*` (no invocados por chat HTTP); chat usa libs directamente. |
| **Tablas o vistas relacionadas** | `arr.ventas_diarias_cliente`, `arr.descuentos_*`, `arr.forecast_mensual`, `arr.hg_diario`, etc. |
| **Funciones existentes reutilizables** | `loadIgfArrAnnexForChat`, `loadCommercialStateForChat` → `dicf.computeDicf`, `dashboardArrForecast.*` |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR proyección y listas comerciales. |
| **Capacidades de escritura posibles** | Carga ARR (`POST /api/arr/load`) — ALTO; no en Director IA. |
| **Permisos aplicables** | Auth dashboard; GA bloqueado en commercial_state. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (carga). |
| **Dependencias** | Upload ARR, feriados, provincia_plants. |
| **Observaciones verificadas** | `sources.arr = false` fijo en context GET. |

### M9 — Delta Venta / Descuento / Ingreso

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M9 |
| **Módulo** | Deltas UI |
| **Propósito empresarial** | Comparar periodos de venta, descuento e ingreso en modales dashboard. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la consulta canónica read-only de las tres familias de periodos reales: Delta Venta, Delta Descuento y Delta Ingreso; no implica forecast con escritura, M19, causalidad ni weekly LD). |
| **Información exacta que sí consulta** | Comparación in-process de dos YYYY-MM por planta del scope: Delta Venta (kg, `arr.ventas_diarias_cliente`) vía `delta_sales` → `get_delta_sales` → `loadDeltaVentaForChat`; Delta Descuento ($/kg, descuentos + kg) vía `delta_discount` → `get_delta_discount` → `loadDeltaDescuentoForChat`; Delta Ingreso (MXN, `kg × (margen_$/kg − \|desc_$/kg\|)`) vía `delta_income` → `get_delta_income` → `loadDeltaIngresoForChat`. Periodos A≠B; default = los dos YYYY-MM más recientes con datos; no se inventan. |
| **Información que no consulta** | Forecast de ingreso con `DELETE`/`INSERT` (`lib/delta-ingreso-forecast.js`); M19 `/api/ai/delta-ingreso/test/*`; weekly LD (M10); IGF/ARR snapshot o KPIs M3 como sustituto; causalidad de una diferencia. |
| **Archivos actuales relacionados** | `lib/director-ia-m9-deltas.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`; `server.js` reutiliza helpers extraídos (contrato HTTP `delta-*` intacto). UI `Delta*Modal.tsx` y `lib/delta-ingreso-forecast.js` siguen fuera de este COMPLETE. |
| **Endpoints actuales relacionados** | Lectura integrada in-process (no HTTP interno): semántica de `POST /api/dashboard/delta-venta-datos`, `delta-descuento-datos`, `delta-ingreso-datos` y periodos asociados. Escritura existente y no integrada: `POST /api/dashboard/delta-ingreso-forecast-datos`. M19 no es Director IA. |
| **Tablas o vistas relacionadas** | `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.provincia_plants`, `public.plantas`; margen IGF (`igf.versions` + `igf.compromiso_lines`) solo como insumo de la fórmula de ingreso, no como anexo. `arr.delta_ingreso_forecast_cliente` queda fuera (forecast mutante). |
| **Funciones existentes reutilizables** | `loadDeltaVentaForChat`, `loadDeltaDescuentoForChat`, `loadDeltaIngresoForChat`, `getPeriodosDeltaVenta`, `getPeriodosDeltaDescuento`, `getDeltaVentaClientes`, `getDeltaDescuentoClientes`, `getDeltaIngresoDatosInternal`, `assertM9DeltasAccess`, `resolvePeriodPair`, `percentChangeOrUnknown`. |
| **Capacidades de lectura posibles** | COMPARAR/CONSULTAR las tres familias de periodos reales, read-only, on-demand. |
| **Capacidades de escritura posibles** | Forecast ingreso (`DELETE`/`INSERT` de cache) — **no** en Director IA. M19 envío test — **no** en Director IA. |
| **Permisos aplicables** | JWT + `planta_id`; GA 403; GV 403; `plantas_permitidas` (GG/AD); fail-closed cross-planta. Equivalente o más restrictivo que dashboard. |
| **Nivel de riesgo** | MEDIO (lectura financiera). Escritura forecast/M19: ALTO y fuera de este módulo. |
| **Dependencias** | ARR diario (venta/descuento); IGF solo como insumo de margen en la fórmula de ingreso. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M9-DELTAS-001` (integrado en main, `7b3e5a98`). Tests focales 23/23; suite `test/director-ia-*.test.js` 459/459; scripts capabilities 25/25, planner 30/30, orchestrator 24/24. COMPLETE = consulta autorizada de las tres familias de periodos reales; no forecast mutante; no M19; no causalidad. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED=0.0): 8.0/20 = 40.0% → **8.5/20 = 42.5%**. |

### M10 — Weekly discount LD

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M10 |
| **Módulo** | Weekly discount LD |
| **Propósito empresarial** | Narrativa semanal de descuento + envío WhatsApp programado. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna. |
| **Información que no consulta** | `POST /api/dashboard/weekly-discount-lectura`, scheduler LD. |
| **Archivos actuales relacionados** | `lib/weekly-discount-narrative.js`, `weekly-discount-ld-config.js`, `weekly-discount-ld-scheduler.js` |
| **Endpoints actuales relacionados** | `/api/dashboard/weekly-discount-lectura` |
| **Tablas o vistas relacionadas** | Lectura ARR. |
| **Funciones existentes reutilizables** | Narrativa weekly-discount-* |
| **Capacidades de lectura posibles** | RESUMIR/EXPLICAR — no cableado. |
| **Capacidades de escritura posibles** | ENVIAR WhatsApp (scheduler) — no vía Director IA. |
| **Permisos aplicables** | Auth dashboard en endpoint. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (enviar). |
| **Dependencias** | ARR, Twilio. |
| **Observaciones verificadas** | Auditoría §M10 §7: No lo usa. |

### M11 — DICF + acciones + comentarios cliente

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M11 |
| **Módulo** | DICF + Acciones DICF + Comentarios cliente |
| **Propósito empresarial** | Oportunidades/proyección por cliente; compromisos DICF; comentarios. |
| **Cobertura actual de Director IA** | PARCIAL (context/listas + slice on-demand de expediente comercial factual). **No** es COMPLETE: attachments, Excel/UI DICF, bitácora dentro del expediente, causalidad y writes permanecen fuera. |
| **Información exacta que sí consulta** | Context: `summarizeDicfContext` (máx. 40 detalles); chat enfocado DICF (`buildFocusedDicfContext`); comentarios always-on `loadClienteComentariosForDirectorIa` (80). Listas commercial_state on-demand vía `loadCommercialStateForChat` → `dicf.computeDicf` (path distinto del expediente). Slice on-demand de **expediente comercial factual**: `expediente_comercial` → `get_commercial_dossier` → `loadCommercialDossierForChat` → autorizar planta (`assertCommercialDossierAccess`) → resolver **cliente único** → SELECT `arr.dicf_cliente_mes` (último year/month del `plant_code`; **no** `loadCommercialStateForChat`; **no** `computeDicf`; **no** write/cache) → comentarios solo con `cliente_key` coincidente (`IS NOT NULL` / no vacío) → acciones `arr.dicf_acciones` por `planta_id` + `cliente_key` → historial `arr.dicf_accion_historial` y `resultado_cierre` **por action id** → recorte 1 cliente / 8 comentarios / 500 caracteres / 8 acciones / 8 eventos; truncation explícito → evidencia con procedencia separada (`commercial_state`, `comments`, `dicf_actions`, `action_history`, `close_result`). Identidad runtime: `planta_id` + `cliente_key`. `cliente_key` de estado comercial **no está persistido**; se deriva con `buildClienteKey` + grupos de `injectAccionesAbiertas`. Ambigüedad → clarificación; no selección silenciosa. Comentario con `cliente_key` null **no se une**; **no** join por nombre. |
| **Información que no consulta** | Bitácora/Plaud dentro del expediente. Attachments DICF binarios. UI completa dicf-accion. Excel DICF. Universo de clientes sin límite. Causalidad / motivo / solución / efectividad / responsable del desempeño. Comentarios sin `cliente_key`. Listas «dejaron/aumentaron» (siguen el intent `commercial_state`). |
| **Archivos actuales relacionados** | `lib/director-ia-m11-commercial-dossier.js`; `lib/dicf.js`; `lib/dicf-acciones.js`; `lib/cliente-comentarios.js`; `lib/director-ia-action-register.js`; `lib/director-ia-commercial-state.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). `GET /api/director-ia/context` (DICF/comentarios always-on; expediente no entra al GET). Dashboard `/api/dashboard/dicf-*`, `/api/dicf-*` (**no** transporte interno del slice). |
| **Tablas o vistas relacionadas** | Expediente: `arr.dicf_cliente_mes`, `arr.cliente_comentarios`, `arr.dicf_acciones`, `arr.dicf_accion_historial`. Resolución: `public.plantas`, `arr.comercial_entidad` / alias (no son clave de join). Context: `arr.dicf_config`. `arr.dicf_acciones_attachments` **fuera**. |
| **Funciones existentes reutilizables** | `loadCommercialDossierForChat` (SELECT-only; authz antes de datos). `buildClienteKey` / `getCanonicalPlantaId` / `getPlantaIdsEquivalentes`. `summarizeDicfContext`, `dicf.computeDicf` (solo listas commercial_state, no expediente), `loadCommercialStateForChat`, `buildFocusedDicfContext`, `buildComentariosAnnexText`. |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/COMPARAR/EXPLICAR/DETECTAR RIESGOS (acciones abiertas). CONSULTAR expediente factual de un cliente (on-demand, recortado, sin causalidad). |
| **Capacidades de escritura posibles** | CRUD DICF acciones en dashboard API — no vía chat Director IA. Comentario cliente: `createClienteComentario` existe en lib; no expuesto como tool de chat. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; cross-planta 403; fail-closed. GA 403 (regla commercial_state: KPIs financieros). ZP/AD globales. Authz **antes** de consultar el expediente. `acceso_acciones_dicf` / `dashboardBlockDicfAccionesRole` siguen en el dominio DICF de dashboard. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (mutar acciones/attachments — fuera). |
| **Dependencias** | ARR (listas commercial_state / compute); plantas. Distinto de bitácora/Plaud, M2 y Action Register. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001` (integrado en main, merge `a5fdea23` / `e3529599`). Tests: focales 19/19; capabilities 50/50; planner 46/46; orchestrator 26/26; suite `test/director-ia-*.test.js` 644/644; `git diff --check` limpio. Routing `commercial_state` / `dicf_focused` / `client_analysis` / Action Register / listas **preservado**. M11 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 **sin cambio**: 10.0/20 = **50.0%** (PARTIAL ya valía 0.5; no se suma +2.5 pp). `sources.dicf` true solo si hay filas; `sources.commercial_state` nunca true en GET. |

### M12 — Action Register

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M12 |
| **Módulo** | Action Register |
| **Propósito empresarial** | Tablero de temas, ítems, revisiones, notas y evidencias por planta. |
| **Cobertura actual de Director IA** | PARCIAL (tablero/resumen con límites + slice on-demand de notas de revisión). **No** es COMPLETE: evidencias/binarios y CRUD de ítems permanecen fuera. |
| **Información exacta que sí consulta** | Board vía `buildActionRegisterBoardPayload` → summarizers: summary, responsables (10), temas, top_overdue (10), invalid_overdue, tema_details (5 temas × 10 acciones), executive_summary; Mejora Continua (`buildMejoraContinuaPayload`). Slice on-demand de **notas de revisión**: `revision_notes` → `get_action_register_revision_notes` → `loadActionRegisterRevisionNotesForChat` → resolver revisión → SELECT `arr.action_register_revision_notes` ⋈ `arr.action_register_revisions` (`revision_id` only) → recorte (1 revisión; máx. 8 notas; 500 caracteres; truncation explícito) → evidencia separada. Campos: `body` (texto almacenado), `author_name` (vacío se preserva; no se inventa autor), `created_at`, `revision_id`, `revision_date`. Última revisión = `ORDER BY revision_date DESC, id DESC`. Sin revisión identificada ni «última»/«más reciente»: clarifica. |
| **Información que no consulta** | Context always-on sigue con `includeNotes: false` (las notas no entran al board/summarizers de ítems). Attachments/binarios/S3/PDF. Export Excel/PDF evidencias. CRUD de ítems. No atribuye nota a action item (no hay `item_id`). No trata el texto como acuerdo formal, transición de estatus, history M2, comentario de folio ni Plaud. |
| **Archivos actuales relacionados** | `lib/director-ia-m12-revision-notes.js`; `lib/action-register-board.js`; `lib/director-ia-action-register.js`; `lib/director-ia-mejora-continua.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-planner.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). `GET /api/director-ia/context` y `GET /api/director-ia/mejora-continua` (board sin notas). CRUD `/api/action-register/*` (UI Acciones; **no** transporte interno del slice). |
| **Tablas o vistas relacionadas** | Lectura de notas: `arr.action_register_revision_notes`, `arr.action_register_revisions`. Board: `arr.action_register_*`. `arr.action_register_revision_note_attachments` **fuera**. |
| **Funciones existentes reutilizables** | `loadActionRegisterRevisionNotesForChat` (SELECT-only; authz `assertActionRegisterAccess` = gate AR vigente, no M2). `summarizeTopOverdueActions`, `buildExecutiveSummary`, `buildMejoraContinuaPayload`, `buildFocusedNarrativeContext`. |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/EXPLICAR/DETECTAR RIESGOS/RECOMENDAR (narrativo). CONSULTAR notas de una revisión (on-demand, recortadas). |
| **Capacidades de escritura posibles** | CRUD Action Register en `/api/action-register/*` — no expuesto como tool de chat. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id`; `plantas_permitidas`; gate AR (`ZP`/`AD`/`CF_CDMX` globales; resto por lista); cross-planta 403; fail-closed. GA/GV según reglas vigentes de AR (no `assertFolioStatusAccess`). |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (mutar ítems/evidencias — fuera). |
| **Dependencias** | Plantas, usuarios responsables, DICF inyectado en board. Distinto de M2 history, comentarios de folio y bitácora/Plaud. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001` (integrado, merge `776df919`). Tests: focales 26/26; capabilities 48/48; planner 42/42; orchestrator 25/25; suite `test/director-ia-*.test.js` 625/625; `git diff --check` limpio. `includeNotes` del context **sigue false**. M12 **sigue PARCIAL**. **No** COMPLETE. Scoring M0–M20 **sin cambio**: 10.0/20 = **50.0%** (PARTIAL ya valía 0.5; no se suma +2.5 pp). |

### M13 — Director IA (módulo propio)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M13 |
| **Módulo** | Director IA |
| **Propósito empresarial** | Bitácora, entidades comerciales, mejora continua y chat ejecutivo. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a su propio módulo) |
| **Información exacta que sí consulta** | Bitácora (chat hasta 30; UI list hasta 100), entidades/alias, mejora continua, contexto AR/DICF/comentarios, anexos on-demand. |
| **Información que no consulta** | Historial persistente de conversaciones (no existe tabla). |
| **Archivos actuales relacionados** | `lib/director-ia.js`, `director-ia-context.js`, `director-ia-chat.js`, `director-ia-bitacora.js`, `comercial-entidad.js`, `frontend-dashboard/modules/director-ia/*` |
| **Endpoints actuales relacionados** | `/api/director-ia/context`, `/mejora-continua`, `/bitacora*`, `/comercial-entidades*`, `/comercial-entidad-alias*`, `/chat` |
| **Tablas o vistas relacionadas** | `arr.director_ia_bitacora`, `arr.comercial_entidad`, `arr.comercial_entidad_alias` |
| **Funciones existentes reutilizables** | `askDirectorIa`, `buildDirectorIaContextPayload`, CRUD bitácora/entidades |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/EXPLICAR/COMPARAR/DETECTAR RIESGOS/RECOMENDAR |
| **Capacidades de escritura posibles** | CREAR/EDITAR/CANCELAR (soft delete) bitácora y entidades vía API UI — no como acciones del chat LLM. |
| **Permisos aplicables** | `ENABLE_DIRECTOR_IA`; JWT; acceso planta. |
| **Nivel de riesgo** | MEDIO (chat + bitácora); mutaciones entidades MEDIO. |
| **Dependencias** | Action Register, DICF, ARR/IGF on-demand, OpenAI. |
| **Observaciones verificadas** | Flag FE `is-enabled.ts` vs BE `isDirectorIaEnabled()` pueden diverger. |

### M14 — Usuarios admin

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M14 |
| **Módulo** | Usuarios admin |
| **Propósito empresarial** | Administrar usuarios, roles, permisos y plantas. |
| **Cobertura actual de Director IA** | NO INTEGRADA (lectura incidental de `public.usuarios` para roles de responsables AR) |
| **Información exacta que sí consulta** | Roles de responsables AR (`loadUsuarioRolesByIds`). |
| **Información que no consulta** | Unlock, listado admin, Excel usuarios, permisos_json como dominio. |
| **Archivos actuales relacionados** | `lib/usuario-permisos.js`, `UsuariosAdminModal.tsx` |
| **Endpoints actuales relacionados** | `/api/usuarios-admin*` |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.roles` |
| **Funciones existentes reutilizables** | Handlers usuarios-admin; `authHasPermiso` |
| **Capacidades de lectura posibles** | CONSULTAR usuarios — no cableado a chat. |
| **Capacidades de escritura posibles** | EDITAR permisos — ALTO; no en Director IA. |
| **Permisos aplicables** | Clave `USUARIOS_ADMIN_CLAVE` / unlock. |
| **Nivel de riesgo** | ALTO |
| **Dependencias** | Auth de todo el sistema. |
| **Observaciones verificadas** | Auditoría §M14 §7. |

### M15 — Documentos PDF / medios de folio

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M15 |
| **Módulo** | Documentos / media folio |
| **Propósito empresarial** | Cotización, facturas, gastos, póliza, paquete completo, adjuntos. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna de M15 (no lista media, no genera PDF, no accede S3). La metadata DB de `public.folio_archivos` es un slice **M2** distinto; no integra este módulo. |
| **Información que no consulta** | `/api/folios/:id/documento*`, `/media`, póliza, S3, signed URLs, contenido, OCR, documentos faltantes. |
| **Archivos actuales relacionados** | Handlers en `server.js`; `ImprimirGastosModal.tsx` |
| **Endpoints actuales relacionados** | Documentales y media bajo `/api/folios/:id/...` |
| **Tablas o vistas relacionadas** | `public.folio_archivos`, campos en `public.folios` |
| **Funciones existentes reutilizables** | Endpoints documento/media existentes. |
| **Capacidades de lectura posibles** | CONSULTAR existencia / DESCARGAR DOCUMENTO — requeriría herramienta nueva. |
| **Capacidades de escritura posibles** | Subir póliza/media — ALTO. |
| **Permisos aplicables** | `acceso_ver_imprimir_folios`, `acceso_subir_poliza` |
| **Nivel de riesgo** | MEDIO (lectura docs); ALTO (subir). |
| **Dependencias** | Folios, S3. |
| **Observaciones verificadas** | Auditoría §M15 §7. M2 documenta metadata-only de `folio_archivos` (`IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001`); M15 (contenido/S3/PDF) **sigue NO INTEGRADA**. |

### M16 — Análisis duplicados de folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M16 |
| **Módulo** | Análisis duplicados |
| **Propósito empresarial** | Detectar parejas de folios similares y opcionalmente cancelar. |
| **Cobertura actual de Director IA** | COMPLETA (respecto a la capacidad canónica de análisis/consulta; no implica confirmación determinística de cada par ni cancelación). |
| **Información exacta que sí consulta** | Pares candidatos a posible duplicidad en `public.folios` (planta + equivalentes, no CANCELADO, ventana de `creado_en`, `LIMIT 1500`) vía `loadFoliosParaDuplicados` + `findDuplicatePairs` (mismo importe redondeado a 2 decimales + similitud de concepto ≥ 0.72). Intent `duplicate_folios` → tool `get_duplicate_folios` → executor `loadDuplicateFoliosForChat`. Evidencia estructurada (`semantic_class: possible_duplicate_heuristic`, IDs, importe, concepto, score, umbral, `scanned`, `truncated`). Happy / empty / error fail-safe. Sin OpenAI en este camino. |
| **Información que no consulta** | `POST /api/folios/duplicados/check` (`findSimilarTo`, alarma al crear). No cancela, no edita, no fusiona, no confirma duplicidad humana. No usa duplicados Excel Taller (M5). No afirma fraude. |
| **Archivos actuales relacionados** | `lib/folio-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/director-ia-duplicados.js`, `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `test/director-ia-duplicados.test.js` |
| **Endpoints actuales relacionados** | Superficie Director IA: `POST /api/director-ia/chat`. Dashboard (no HTTP interno desde el tool): `GET /api/folios/duplicados/analisis`. Escritura ajena a esta capacidad: `POST /api/folios/:id/cancelar`. |
| **Tablas o vistas relacionadas** | `public.folios` |
| **Funciones existentes reutilizables** | `findDuplicatePairs` (reutilizado, umbral 0.72 sin recalibrar), `loadFoliosParaDuplicados`, `loadDuplicateFoliosForChat`, `buildDuplicateFoliosChatResult`. `findSimilarTo` sigue en el check de creación, no en el chat. |
| **Capacidades de lectura posibles** | DETECTAR RIESGOS/CONSULTAR — integrada (posibles duplicados / candidatos heurísticos). |
| **Capacidades de escritura posibles** | CANCELAR folio desde UI análisis — ALTO; **no integrada** en Director IA (clase C). |
| **Permisos aplicables** | Auth dashboard + bloqueo GV folios + `assertPlantaPermitidaDashboard` (GG/GA/AD con `plantas_permitidas`). |
| **Nivel de riesgo** | MEDIO (lectura heurística); ALTO (cancelar, fuera de esta capacidad). |
| **Dependencias** | Folios. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M16-DUPLICADOS-001` (integrado en main). Tests focales 17/17; suite `test/director-ia-*.test.js` 416/416; scripts capabilities 20/20, planner 28/28, orchestrator 19/19. Independiente de duplicados Excel Taller. COMPLETE = integración de la consulta canónica, no certeza de cada par. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL=0.5, NOT_STARTED=0.0): 6.5/20 = 32.5% → **7.5/20 = 37.5%**. |

### M17 — WhatsApp → Dashboard

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M17 |
| **Módulo** | WhatsApp bridge |
| **Propósito empresarial** | Comandos de negocio y URLs firmadas al dashboard. |
| **Cobertura actual de Director IA** | PARCIAL (genera link a `/director-ia`; no consulta Twilio como fuente de datos) |
| **Información exacta que sí consulta** | N/A como fuente; comando `DirectorIA` genera JWT + URL. |
| **Información que no consulta** | Historial de mensajes WhatsApp, outbox Delta Ingreso AI, carrito como dominio de respuesta. |
| **Archivos actuales relacionados** | `server.js` (comando DirectorIA ~línea 16684+), `createDashboardToken` |
| **Endpoints actuales relacionados** | `POST /twilio/whatsapp` |
| **Tablas o vistas relacionadas** | `public.usuarios`, `public.notificaciones_log` |
| **Funciones existentes reutilizables** | `createDashboardToken`, `buildActionRegisterUrl`, encode URL WhatsApp |
| **Capacidades de lectura posibles** | N/A (es canal de entrada). |
| **Capacidades de escritura posibles** | ENVIAR mensajes (bot) — fuera del chat Director IA. |
| **Permisos aplicables** | Nivel 6 solo AR/DirectorIA; `acceso_consola_whatsapp_ar` catalogado. |
| **Nivel de riesgo** | MEDIO (tokens en URL); ALTO (acciones bot sobre folios). |
| **Dependencias** | Twilio, DASHBOARD_URL. |
| **Observaciones verificadas** | Tokens en query string (hallazgo crítico). |

### M18 — Presupuestos semanales

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M18 |
| **Módulo** | Presupuestos semanales |
| **Propósito empresarial** | Solicitudes/asignación semanal de presupuesto (carro). |
| **Cobertura actual de Director IA** | PARCIAL (query JSON read-only del carro semanal por planta). **No** es COMPLETE: el propósito canónico incluye operación del carro, envío a cheques y canal WhatsApp, que permanecen fuera. |
| **Información exacta que sí consulta** | Carro de `public.presupuestos_semanales` + `public.presupuesto_folios` por `planta_id` y semana. Asignado = `monto_asignado`. Seleccionado = `SUM(presupuesto_folios.importe)`. Disponible = `max(0, asignado - seleccionado)`. Folios: `folio_id`, `numero_folio`, `importe`, `prioridad`; urgente solo si `prioridad` coincide `/urgente/i`. `estatus` del carro si existe. Lookup **sin** filtrar solo `ABIERTO` (un carro enviado/cerrado sigue consultable). Semana: fechas explícitas `YYYY-MM-DD` / `DD/MM/AAAA`; `getCurrentWeekMexico()` solo con «esta semana», «semana actual», «mi presupuesto» o pregunta #17 (`presupuesto semanal`); si no hay fecha ni trigger, clarifica (no inventa semana). 0 filas = `DATA_NOT_FOUND` (no INSERT). Seleccionado ≠ pagado; presupuesto ≠ cheque; asignado ≠ aprobado. |
| **Información que no consulta** | `presupuesto_asignacion_detalle` (asignación mensual; otro dominio). Asignar/reemplazar monto. Seleccionar/quitar folios. `enviarPresupuestoACheques`. Crear cheque. Twilio/WhatsApp/notificaciones. Solicitudes PRE-YYYYMM, archivos S3, catálogo, línea detalle. No afirma pagado, cheque emitido, desviación ni causa. |
| **Archivos actuales relacionados** | `lib/director-ia-m18-presupuesto-semanal.js`; wiring en `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js`. DDL/writes/bot en `server.js` **no** usados como transporte. |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat` (in-process). Sin grupo REST `/api/presupuesto*` como transporte interno. WhatsApp carrito **no** se usa. |
| **Tablas o vistas relacionadas** | Lectura: `public.presupuestos_semanales`, `public.presupuesto_folios`. El resto de `presupuesto_*` (asignación mensual, solicitudes, archivos) **sigue fuera**. |
| **Funciones existentes reutilizables** | `loadPresupuestoSemanalForChat` → SELECT (equivalente a `getPresupuestoResumen`) + `assertFolioStatusAccess`. **No** `linkFoliosToPresupuesto`. **No** `enviarPresupuestoACheques`. **No** `sendWhatsApp`. |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR carro semanal. |
| **Capacidades de escritura posibles** | Modificar presupuesto / enviar a cheques — ALTO; **no** en Director IA. |
| **Permisos aplicables** | JWT/contexto; rol; `planta_id` obligatorio; `plantas_permitidas`; `assertFolioStatusAccess`; GV 403; GA solo en planta autorizada; cross-planta 403; fail-closed. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (writes/cheques — fuera). |
| **Dependencias** | Folios. WhatsApp/Twilio **no** son dependencia de este slice. Distinto de M4, M6, M7 e IGF. |
| **Observaciones verificadas** | `IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001` (integrado en main, `719b3eaa`). Tests: focales 24/24; capabilities 46/46; planner 40/40; orchestrator 24/24; suite `test/director-ia-*.test.js` 599/599; `git diff --check` limpio. Cheques/Twilio/WhatsApp/writes **siguen fuera**. Scoring M0–M20 del loop (COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0): 9.5/20 = 47.5% → **10.0/20 = 50.0%**. |

### M19 — Delta Ingreso AI (test)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M19 |
| **Módulo** | Delta Ingreso AI (test HTTP) |
| **Propósito empresarial** | Otro subsistema de IA para preguntas/resúmenes de delta ingreso vía WhatsApp. |
| **Cobertura actual de Director IA** | NO INTEGRADA (sistema paralelo) |
| **Información exacta que sí consulta** | Ninguna de Director IA sobre este stack. |
| **Información que no consulta** | Outbox/inbox/actions de delta ingreso AI. |
| **Archivos actuales relacionados** | `lib/delta-ingreso-ai.js`, `delta-ingreso-ai-db.js`, `delta-ingreso-commands.js` |
| **Endpoints actuales relacionados** | `/api/ai/delta-ingreso/test/*` (sin `dashboardAuthMiddleware` según inventario) |
| **Tablas o vistas relacionadas** | `public.delta_ingreso_ai_*` |
| **Funciones existentes reutilizables** | Stack delta-ingreso-ai (paralelo, no Director IA). |
| **Capacidades de lectura posibles** | N/A para Director IA. |
| **Capacidades de escritura posibles** | ENVIAR mensajes test — ALTO / fuera de alcance. |
| **Permisos aplicables** | No hay middleware dashboard en rutas test inventariadas. |
| **Nivel de riesgo** | ALTO (endpoints abiertos + envío). |
| **Dependencias** | OpenAI, WhatsApp, ARR. |
| **Observaciones verificadas** | Dos sistemas de IA en el mismo proceso Node. |

### M20 — Home KPI / Inicio

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M20 |
| **Módulo** | Home KPI |
| **Propósito empresarial** | Vista financiera de inicio (IGF mini, DICF, comentarios). |
| **Cobertura actual de Director IA** | INDIRECTA |
| **Información exacta que sí consulta** | No renderiza ni llama la página `/`; comparte fuentes subyacentes (DICF, comentarios, IGF/ARR on-demand) cuando el chat las activa. |
| **Información que no consulta** | Composición exacta de `app/page.tsx` ni `igf-forecast-mini` como endpoint dedicado del context. |
| **Archivos actuales relacionados** | `frontend-dashboard/app/page.tsx` |
| **Endpoints actuales relacionados** | Reutiliza M7/M11. |
| **Tablas o vistas relacionadas** | Igual que IGF/DICF/ARR. |
| **Funciones existentes reutilizables** | Mismas que M7/M11. |
| **Capacidades de lectura posibles** | Las de fuentes compartidas, no las de la página Home. |
| **Capacidades de escritura posibles** | Ninguna propia. |
| **Permisos aplicables** | Bloqueo GA en página según auditoría. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | M7, M11, M8. |
| **Observaciones verificadas** | Anexo C auditoría: «No (datos compartidos indirectos)». |

---

## Parte 3 — Catálogo de fuentes

### Fuente: Action Register

- **Dominio:** Acciones / temas / responsables / vencidas (M12); notas de revisión on-demand
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-context.js`, `lib/director-ia-action-register.js`, `lib/action-register-board.js`, `lib/director-ia-m12-revision-notes.js`
- **Función de acceso:** `buildActionRegisterBoardPayload` → summarizers de ítems. Notas: `loadActionRegisterRevisionNotesForChat` (loader dedicado; no voltea `includeNotes`)
- **Endpoint relacionado:** `GET /api/director-ia/context` (board **sin** notas); chat `POST /api/director-ia/chat` (intent `revision_notes`); board UI `/api/action-register/*` no es transporte interno
- **Tablas consultadas:** Board: `arr.action_register_revisions`, `items`, `entries`, `attachments`. Notas on-demand: `arr.action_register_revision_notes` ⋈ `revisions` por `revision_id`. Context always-on: `includeNotes: false`
- **Filtros disponibles:** `planta_id`; notas: `revision_id` / `revision_date` / última (`revision_date DESC`)
- **Alcance por planta:** Sí (obligatorio)
- **Alcance por periodo:** Ítems: implícito vía fechas/overdue. Notas: una revisión (fecha o última)
- **Límites de filas:** responsables 10; top_overdue 10; findings 5; tema_details 5×10; narrativa chat máx. 10 acciones. Notas: 1 revisión; 8 notas; 500 caracteres; truncation explícito
- **Permisos:** JWT + acceso planta; gate AR vigente (`assertActionRegisterAccess`); no authz M2
- **Información sensible:** Responsables, títulos de acción, estatus; texto/autor de notas de revisión
- **Estado de actualización:** Context en cada GET; notas solo si el intent `revision_notes` se activa
- **Posibles errores:** `planta_id requerido`, `Sin acceso a esta planta`, revisión no identificada (clarifica), revisión inexistente
- **Evidencia de integración actual:** `sources.action_register = true` tras carga OK del board; slice notas = `context_meta.mode = revision_notes`
- **Información que no puede concluirse con esta fuente:** Estado de kanban/folios, IGF completo, attachments binarios, atribución nota→ítem, acuerdo formal, Plaud, history M2, comentario de folio

### Fuente: DICF

- **Dominio:** Acciones e historial DICF por cliente (M11)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-action-register.js` (`summarizeDicfContext`), `lib/director-ia-chat.js` (contextos enfocados), `lib/director-ia-m11-commercial-dossier.js` (expediente)
- **Función de acceso:** `summarizeDicfContext`; filtros chat `filterDicfDetailsByQuestion`, `buildFocusedDicfContext`; expediente: `loadCommercialDossierForChat` (acciones/historial por `cliente_key` / `accion_id`)
- **Endpoint relacionado:** `GET /api/director-ia/context`; `POST /api/director-ia/chat` (intent `expediente_comercial`); dashboard `/api/dashboard/dicf-*` (no transporte interno del expediente)
- **Tablas consultadas:** `arr.dicf_acciones`; historial context según summarizer; expediente: `arr.dicf_accion_historial` por `accion_id`
- **Filtros disponibles:** planta; chat: tokens comerciales / nombre cliente; ventana 3 meses en chat mensual; expediente: `planta_id` + `cliente_key` (acciones) / `accion_id` (historial)
- **Alcance por planta:** Sí (+ equivalentes canónicos en expediente y commercial_state)
- **Alcance por periodo:** Ventana `BITACORA_CHAT_MONTH_WINDOW = 3` en modos mensuales de chat; expediente no usa esa ventana
- **Límites de filas:** `DEFAULT_DICF_DETAILS_LIMIT = 40` (context). Expediente: 8 acciones; 8 eventos de historial por acción
- **Permisos:** JWT; bloqueos DICF role; GA sin KPIs financieros; expediente: `assertCommercialDossierAccess` antes de datos
- **Información sensible:** Clientes, compromisos, resultados de cierre
- **Estado de actualización:** Por request
- **Posibles errores:** Sin filas → `sources.dicf` false aunque AR cargue; expediente ambiguo/missing → clarificación
- **Evidencia de integración actual:** `sources.dicf` si `dicf_details.length > 0`; expediente = `context_meta.mode = expediente_comercial`
- **Información que no puede concluirse con esta fuente:** Listas «dejaron/aumentaron» completas sin commercial_state; attachments; causalidad; acción cerrada = exitosa; `resultado_cierre` = impacto; responsable de acción = responsable del desempeño

### Fuente: Expediente comercial

- **Dominio:** Expediente factual por un cliente (M11)
- **Cobertura actual:** PARCIAL (on-demand; no COMPLETE del módulo)
- **Archivo de acceso:** `lib/director-ia-m11-commercial-dossier.js`
- **Función de acceso:** `loadCommercialDossierForChat` → `get_commercial_dossier`
- **Endpoint relacionado:** `POST /api/director-ia/chat` (intent `expediente_comercial`; in-process). No HTTP interno.
- **Tablas consultadas:** `arr.dicf_cliente_mes` (SELECT-only, último year/month); `arr.cliente_comentarios`; `arr.dicf_acciones`; `arr.dicf_accion_historial`. Resolución: `public.plantas`, `arr.comercial_entidad` / alias
- **Filtros disponibles:** `planta_id` autorizado; cliente único (`planta_id` + `cliente_key`). `cliente_key` de estado **derivado** con `buildClienteKey` (no persistido en `dicf_cliente_mes`)
- **Alcance por planta:** Sí; authz **antes** de datos; cross-planta 403; GA 403; ZP/AD globales; resto `plantas_permitidas`; fail-closed
- **Alcance por periodo:** Periodo materializado más reciente del `plant_code` en `arr.dicf_cliente_mes`
- **Límites de filas:** 1 cliente; 8 comentarios / 500 caracteres; 8 acciones; 8 eventos de historial; truncation explícito
- **Permisos:** `assertCommercialDossierAccess` (intersección DICF / commercial_state vigente)
- **Información sensible:** Estado comercial, comentarios, acciones, responsables de acción, `resultado_cierre`
- **Estado de actualización:** Por request; no escribe caché; no llama `computeDicf` ni `loadCommercialStateForChat`
- **Posibles errores:** `planta_id` obligatorio; 403 GA / planta no autorizada; `ambiguous_client` / `missing_client` (clarifica; no selecciona en silencio)
- **Evidencia de integración actual:** `context_meta.mode = expediente_comercial`; bloques `commercial_state` / `comments` / `dicf_actions` / historial / `resultado_cierre` separados
- **Información que no puede concluirse con esta fuente:** Causa del estado; motivo/diagnóstico del comentario; acción = solución; cerrada = exitosa; `resultado_cierre` = impacto causal; responsable de acción = dueño del desempeño; cronología = causalidad; correlación = causalidad; 0 comentarios = nadie comentó jamás; 0 acciones DICF = no hay seguimiento fuera de DICF; sin estado = inactivo; sin `resultado_cierre` = fracaso; bitácora/Plaud; listas comerciales

### Fuente: Bitácora IA

- **Dominio:** Notas de campo / visitas (M13)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-bitacora.js`, uso en context/chat
- **Función de acceso:** `loadBitacoraForChat`, `createBitacoraEntry`, `extractBitacoraExcerptForSearch`
- **Endpoint relacionado:** `/api/director-ia/bitacora*`
- **Tablas consultadas:** `arr.director_ia_bitacora`
- **Filtros disponibles:** planta; búsqueda por tokens/cliente en chat; ventana 3 meses
- **Alcance por planta:** Sí
- **Alcance por periodo:** Últimos 3 meses en formatos mensuales de chat
- **Límites de filas:** `CHAT_CONTEXT_LIMIT = 30` (chat); list UI hasta 100
- **Permisos:** JWT + planta; flag `ENABLE_DIRECTOR_IA`
- **Información sensible:** Contenido de visitas / nombres
- **Estado de actualización:** CRUD soft-delete; chat lee snapshot
- **Posibles errores:** Tabla no asegurada; planta sin acceso
- **Evidencia de integración actual:** `sources.bitacora_ia` si hay sesiones
- **Información que no puede concluirse con esta fuente:** KPIs financieros; estado de folio

### Fuente: Comentarios de cliente

- **Dominio:** Comentarios comerciales de cliente (M11)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/cliente-comentarios.js`; expediente: `lib/director-ia-m11-commercial-dossier.js`
- **Función de acceso:** `loadClienteComentariosForDirectorIa`, `buildComentariosAnnexText`; expediente: comentarios solo si `cliente_key` válido y coincidente
- **Endpoint relacionado:** Context/chat; dashboard cliente-comentarios; expediente in-process en chat
- **Tablas consultadas:** `arr.cliente_comentarios`
- **Filtros disponibles:** Context: `planta_id`. Expediente: `planta_id` + `cliente_key IS NOT NULL AND TRIM(cliente_key) <> '' AND cliente_key = ANY(keys)`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Orden por fecha desc; sin selector de meses en loader IA
- **Límites de filas:** Context: 80. Expediente: 8 comentarios; 500 caracteres; truncation explícito (`truncated` + `original_length`)
- **Permisos:** JWT + planta; expediente usa `assertCommercialDossierAccess`
- **Información sensible:** Comentarios comerciales
- **Estado de actualización:** Por request
- **Posibles errores:** Fallos de query logueados; comentario sin `cliente_key` **no se une** (tampoco por nombre)
- **Evidencia de integración actual:** `sources.cliente_comentarios`; expediente incluye bloque `comments` separado
- **Información que no puede concluirse con esta fuente:** Historial DICF completo; ARR toneladas; comentario = motivo/diagnóstico; 0 comentarios enlazables = nadie comentó jamás

### Fuente: Comentarios de folio

- **Dominio:** Comentarios operativos de folio (M2 parcial)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/cliente-comentarios.js`
- **Función de acceso:** `loadFolioComentariosForDirectorIa`
- **Endpoint relacionado:** Context/chat; folios comentarios en dashboard
- **Tablas consultadas:** `public.comentarios` ⋈ `public.folios`
- **Filtros disponibles:** `planta_id`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Últimos N por fecha
- **Límites de filas:** 80
- **Permisos:** JWT + planta
- **Información sensible:** Texto de comentarios, referencia a folio
- **Estado de actualización:** Por request
- **Evidencia de integración actual:** `sources.folio_comentarios`
- **Información que no puede concluirse con esta fuente:** Etapa kanban, timeline completo, documentos adjuntos, estatus técnico del folio

### Fuente: Entidades comerciales

- **Dominio:** Alias / identidad de cliente (M13)
- **Cobertura actual:** PARCIAL (CRUD vía API; resolución en chat)
- **Archivo de acceso:** `lib/comercial-entidad.js`
- **Función de acceso:** `resolveCommercialEntitiesForQuestion`, `findCommercialAliases`, CRUD handlers
- **Endpoint relacionado:** `/api/director-ia/comercial-entidades*`, `/comercial-entidad-alias*`
- **Tablas consultadas:** `arr.comercial_entidad`, `arr.comercial_entidad_alias`
- **Filtros disponibles:** planta; búsqueda de alias
- **Alcance por planta:** Sí
- **Alcance por periodo:** N/A (catálogo)
- **Límites de filas:** Según list/search del lib
- **Permisos:** JWT + planta
- **Información sensible:** Nombres comerciales / alias
- **Estado de actualización:** CRUD soft-delete
- **Evidencia de integración actual:** Bloque de entidades en prompt de chat cuando hay match
- **Información que no puede concluirse con esta fuente:** Toneladas/ingreso sin cruzar ARR/DICF

### Fuente: ARR

- **Dominio:** Ventas/descuentos forecast (M8)
- **Cobertura actual:** PARCIAL (chat on-demand; no en GET `sources`)
- **Archivo de acceso:** `lib/director-ia-igf-arr.js`, `lib/dashboard-arr-forecast.js`, `lib/dicf.js`
- **Función de acceso:** `loadIgfArrAnnexForChat`, `loadArrProyForPlant`, `loadTopClientesDescBrief`; indirecto `dicf.computeDicf`
- **Endpoint relacionado:** `POST /api/director-ia/chat` (no marca `sources.arr` en GET)
- **Tablas consultadas:** tablas `arr.*` de ventas/descuentos/forecast según helpers
- **Filtros disponibles:** planta → plant code; año/mes parseado de pregunta o mes CDMX actual
- **Alcance por planta:** Sí
- **Alcance por periodo:** Mes resuelto desde pregunta / fallback
- **Límites de filas:** top clientes brief default 8
- **Permisos:** Auth; GA bloqueado en caminos financieros
- **Información sensible:** Venta, descuento, clientes
- **Estado de actualización:** Datos ARR cargados externamente (`arr-load`)
- **Evidencia de integración actual:** `shouldAttachIgfArrAnnex` + sources de prompt `igf.forecast` / `arr.forecast` en modos focused
- **Información que no puede concluirse con esta fuente:** UI ARR completa; carga; Excel dashboard

### Fuente: IGF

- **Dominio:** Compromiso / forecast financiero (M7)
- **Cobertura actual:** PARCIAL (chat on-demand + composición observada de 1 fila; `sources.igf` siempre false en GET)
- **Archivo de acceso:** `lib/director-ia-igf-arr.js`
- **Función de acceso:** `loadIgfCommitSnapshot`, `extractIgfComposition`, `formatIgfCompositionBlock`, `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo` (inyectado desde server)
- **Endpoint relacionado:** `POST /api/director-ia/chat` (in-process; tool `get_igf_snapshot`)
- **Tablas consultadas:** `igf.versions` (1 versión GLOBAL del mes), `igf.compromiso_lines` (fuente de líneas; 1 fila planta + versión + mes vía `findIgfRowForPlant`)
- **Filtros disponibles:** planta, year/month
- **Alcance por planta:** Sí (una fila; no combina plantas)
- **Alcance por periodo:** Mes de pregunta / actual (snapshot; no tendencia)
- **Límites de filas:** Versión más reciente (`ORDER BY version_number DESC LIMIT 1`); composición = allowlist de esa fila; máx. 18 líneas `*_kg` (`IGF_COMPOSITION_MAX_USD_KG`)
- **Unidades:** `*_kg` = **$/kg**, no kilogramos. Familias distintas: `ton` ≠ `$/kg` ≠ `%` ≠ `MXN`. No mezclar ni sumar unidades incompatibles. Ranking de magnitud solo intra `$/kg` de roles `add`/`subtract`.
- **Null:** `null` ≠ `0`. Null/`""`/no finito se omite (`omitted_null_keys`); no se emite como cero.
- **Signos:** Signo físico almacenado; `hg_kg` no se invierte.
- **Fórmula:** `recalcularUtilYResultado` es referencia semántica de `formula_role`; **no** se ejecuta. `gasto_kg` no participa. Sin overlay de folios.
- **ORDER_DELTAS:** Presentación UI; no se importa; no es fórmula.
- **Permisos:** Authz IGF vigente: GA 403; GV planta; cross-planta bloqueado; fail-closed. `acceso_igf_forecast_kpis` en UI.
- **Información sensible:** Compromiso, margen, utilidad, resultado, HG
- **Estado de actualización:** Según versiones IGF cargadas (snapshot ≠ tendencia)
- **Evidencia de integración actual:** `shouldAttachIgfArrAnnex` / `isIgfCompositionQuestion` / `extractIgfComposition`; regex IGF/margen/rentabilidad. Semántica: composición ≠ causalidad; magnitud ≠ importancia operacional; línea ≠ responsable; signo ≠ juicio empresarial. M9 conserva deltas temporales.
- **Información que no puede concluirse con esta fuente:** Meta HG completa UI, folios detalle IGF, PATCH, causalidad, tendencia, overlay de folios, recálculo de utilidad/resultado

### Fuente: Margen o estado comercial

- **Dominio:** Listas dejaron/disminuyeron/aumentaron/nuevos + margen $/kg (M8/M11/M7)
- **Cobertura actual:** PARCIAL (solo chat on-demand; `sources.commercial_state` siempre false en GET)
- **Archivo de acceso:** `lib/director-ia-commercial-state.js`, margen en `director-ia-igf-arr.js`
- **Función de acceso:** `loadCommercialStateForChat` → `dicf.computeDicf` + `injectAccionesAbiertas`; `getMargenKgPorPeriodo`
- **Endpoint relacionado:** Equivalente lógico a motor de `POST /api/dashboard/dicf-datos` (sin HTTP desde chat)
- **Tablas consultadas:** ARR + `arr.dicf_acciones` (conteos abiertos)
- **Filtros disponibles:** planta; categoría por regex de pregunta; límite clientes `COMMERCIAL_STATE_CLIENT_LIMIT = 20`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Periodo del compute DICF (mes de negocio del motor)
- **Límites de filas:** 20 clientes por categoría en formateo chat
- **Permisos:** GA → 403; assert GV planta
- **Información sensible:** Clientes e ingreso/ton
- **Estado de actualización:** Cálculo on-demand
- **Evidencia de integración actual:** `isCommercialStateListQuestion` / prompt mode `commercial_state`
- **Información que no puede concluirse con esta fuente:** Endpoints Delta UI; weekly LD; expediente de un cliente (es otro intent: `expediente_comercial`, SELECT `arr.dicf_cliente_mes`, sin `computeDicf`)

### Fuente: Folios

- **Dominio:** Entidad operativa folio (M2)
- **Cobertura actual:** PARCIAL (estatus/etapa read-only; comentarios en fuente aparte)
- **Archivo de acceso:** `lib/director-ia-m2-folio-status.js`
- **Función de acceso:** `loadFolioStatusForChat` → `getFolioById` / `getFolioByNumero` / `getManyFoliosStatus` / `listFoliosByPlanta`
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas` (`f.estatus` observado)
- **Filtros disponibles:** id, `numero_folio`, planta/equivalentes, etapa visual (`etapaVisualToEstatusTecnicos`)
- **Alcance por planta / periodo:** `planta_id` + equivalentes; listado con `ventana: "0"` (sin recorte de 2 meses de KPIs)
- **Límites de filas:** listado truncado (límite 40)
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404
- **Información sensible:** Importes, estatus, identidad de folio
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_status` + tool `get_folio_status` + rama en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Historial (fuente aparte), contenido PDF/S3, documentos faltantes, cheque, póliza, presupuesto, tablero HTTP kanban, mutaciones

### Fuente: Historial de folios

- **Dominio:** Timeline / `folio_historial` (M2)
- **Cobertura actual:** PARCIAL (eventos crudos read-only; **no** es GET `/timeline` ni timeline HTTP deduplicado)
- **Archivo de acceso:** `lib/director-ia-m2-history.js`
- **Función de acceso:** `loadFolioHistoryForChat` → resolver/autorizar folio (`getFolioById` / `getFolioByNumero` + authz de `folio_status`) → `listHistorialForFolio` (SELECT-only)
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id/timeline`, `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folio_historial` (después de resolver el folio en `public.folios`)
- **Filtros disponibles:** un folio por id o por `numero_folio`
- **Alcance por planta / periodo:** `planta_id` + equivalentes; historial solo del folio autorizado
- **Límites de filas:** 80 + `truncated`
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404; fail-closed. Orden: resolver folio → autorizar → **luego** SELECT historial
- **Información sensible:** `actor_telefono`, `actor_rol`, comentario, estatus observado del evento
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_history` + tool `get_folio_history` + rama en `askDirectorIa`
- **Campos observados del evento:** `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`. `id` físico como `event_id` si existe
- **Campos derivados:** `etapa` solo si `estatus` existe y mapea (`estatusToEtapaVisual`). Si `estatus` es null/vacío/no mapeable → sin etapa derivada; el evento no se oculta
- **Campos que no existen en el evento:** `estatus_anterior`, `estatus_nuevo`, `event_type`. `folios.estatus_anterior` no es el estatus anterior de cada evento
- **Nulls:** se preservan. Actor null **no** significa sistema. Estatus null no convierte el evento en transición
- **Orden / preservación:** `creado_en ASC` (desempate `id`). Eventos no deduplicados. Misma etapa repetida se preserva. **No** `dedupeHistorialByStage`
- **Información que no puede concluirse con esta fuente:** Contenido PDF/S3, documentos faltantes, cheque, póliza, presupuesto, `kanban_flow`, transiciones inventadas, causa, retraso, responsabilidad, actor sistema, tablero HTTP

### Fuente: Kanban

- **Dominio:** Tablero por etapa visual (M2)
- **Cobertura actual:** PARCIAL (listado/filtro por etapa derivada; **no** es el GET kanban)
- **Archivo de acceso:** `lib/director-ia-m2-folio-status.js` (no `server.js` handler kanban)
- **Función de acceso:** `listFoliosByPlanta` + `estatusToEtapaVisual` / `etapaVisualToEstatusTecnicos`. **No** llama `maybeAdvanceFolioToComprobaciones`
- **Endpoint relacionado:** **excluido** `GET /api/dashboard/kanban` (puede autoavanzar con UPDATE + historial)
- **Tablas consultadas:** `public.folios` (+ `public.plantas`)
- **Evidencia de integración actual:** mismo path `folio_status` / `get_folio_status` / `loadFolioStatusForChat`
- **Información que no puede concluirse con esta fuente:** Tablero HTTP completo, autoavance, historial, contenido PDF/S3, documentos faltantes, cheque/póliza

### Fuente: Metadata documental de folio

- **Dominio:** Registros de `folio_archivos` (M2; **no** es M15)
- **Cobertura actual:** PARCIAL (metadata DB read-only; **no** es contenido, PDF ni S3)
- **Archivo de acceso:** `lib/director-ia-m2-documents-metadata.js`
- **Función de acceso:** `loadFolioDocumentsMetadataForChat` → resolver/autorizar folio (`getFolioById` / `getFolioByNumero` + authz de `folio_status`) → `listDocumentsMetadataForFolio` (SELECT-only) → `projectDocument` (allowlist)
- **Endpoint relacionado:** semántica SELECT-only in-process. **No** usa `GET /api/folios/:id/media`, `/media/:id/url`, `/cotizacion`, `documento-*`, `GET /api/folios/:id` ni `GET /api/dashboard/kanban`
- **Tablas consultadas:** `public.folio_archivos` (después de resolver el folio en `public.folios`)
- **Filtros disponibles:** un folio por id o por `numero_folio`
- **Alcance por planta / periodo:** `planta_id` + equivalentes; metadata solo del folio autorizado
- **Límites de filas:** 50 + `truncated`
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA solo planta autorizada; cross-planta 403; not found 404; fail-closed. Orden: resolver folio → autorizar → **luego** SELECT metadata
- **Información sensible:** `file_name` (nombre observado, no contenido). **Nunca** `s3_key`, URL, signed URL, bucket, raw path, `sha256`, bytes, contenido
- **Estado de actualización:** Por request (`retrieved_at`)
- **Evidencia de integración actual:** Intent `folio_documents` + tool `get_folio_documents` + rama en `askDirectorIa` (después de `detectUnsupported`)
- **Campos seguros:** `document_id`, `tipo`, `status`, `file_name`, `subido_en` + identidad mínima del folio (`folio_id`, `numero_folio`, `planta_id`, `planta_nombre`)
- **Campos que nunca se exponen:** `s3_key`, `url`, signed URL, `bucket`, raw path, `sha256`, bytes, contenido
- **Semántica:** «Estos son los registros documentales que existen para este folio.»
- **Cero filas:** «no hay registros documentales encontrados». **No** «faltan documentos». No implica set esperado, documentación completa/incompleta ni cumplimiento
- **Guardrail:** preguntas de faltantes / PDF / contenido / descarga / OCR / «debería tener» siguen `SOURCE_NOT_INTEGRATED`
- **Información que no puede concluirse con esta fuente:** Contenido PDF, S3, signed URLs, descarga, OCR, documentos faltantes, cumplimiento documental, póliza operativa, cheque, `kanban_flow`, writes

### Fuente: Documentos y medios

- **Dominio:** PDF/media (M15)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers documento/media en `server.js`
- **Función de acceso:** Endpoints documento/media (no IA)
- **Endpoint relacionado:** `/api/folios/:id/documento*`, `/media*`
- **Tablas consultadas:** `public.folio_archivos` (contenido/S3; **no** es el SELECT de metadata M2)
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Documentos faltantes, URLs firmadas, contenido PDF, S3

### Fuente: KPIs de dashboard

- **Dominio:** Agregados de folios del header/dashboard (M3)
- **Cobertura actual:** COMPLETA (consulta on-demand; no IGF/ARR)
- **Archivo de acceso:** `lib/director-ia-m3-plantas-kpis-proyectos.js`; `server.js` `GET /api/dashboard/kpis`
- **Función de acceso:** `loadDashboardKpisForChat` → `queryDashboardKpis`
- **Endpoint relacionado:** semántica de `GET /api/dashboard/kpis` (sin HTTP interno)
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Evidencia de integración actual:** Intent `dashboard_kpis` + tool `get_dashboard_kpis` + rama en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Salud, desempeño o causalidad; IGF/ARR; KPIs para roles GA/GV

### Fuente: Proyectos

- **Dominio:** Proyectos por planta (M3)
- **Cobertura actual:** COMPLETA (listado read-only EN_CURSO; no Action Register; no escritura)
- **Archivo de acceso:** `lib/director-ia-m3-plantas-kpis-proyectos.js`; helpers reutilizados por `server.js`
- **Función de acceso:** `loadProyectosForChat` → `listarProyectosPorPlantaOEquivalentes`
- **Endpoint relacionado:** semántica de `GET /api/dashboard/proyectos` (campos de helper, no POST)
- **Tablas consultadas:** `public.proyectos`
- **Evidencia de integración actual:** Intent `project_status` + tool `get_project_status` + rama en `askDirectorIa`; clarificación si wording choca con Action Register
- **Información que no puede concluirse con esta fuente:** Estatus almacenado «retrasado»; creación/edición/eliminación de proyecto

### Fuente: Presupuestos semanales

- **Dominio:** Presupuesto / carro (M18)
- **Cobertura actual:** PARCIAL (query JSON del carro semanal; writes/cheques/WhatsApp no integrados)
- **Archivo de acceso:** `lib/director-ia-m18-presupuesto-semanal.js`
- **Función de acceso:** `loadPresupuestoSemanalForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. Bot WhatsApp y writes de `server.js` **no** usados
- **Tablas consultadas:** `public.presupuestos_semanales`, `public.presupuesto_folios`
- **Evidencia de integración actual:** Intent `budget_status` → tool `get_budget_status` → SELECT + fórmulas de `getPresupuestoResumen`
- **Información que no puede concluirse con esta fuente:** Pagado; cheque emitido; aprobado IGF; `presupuesto_asignacion_detalle`; asignación/selección/envío a cheques; Twilio/WhatsApp

### Fuente: Cheques o datos equivalentes

- **Dominio:** Etapa cheque / número de cheque en folio (M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Folios en `server.js` (`numero-cheque`, etapa `CHEQUE_GENERADO`)
- **Función de acceso:** Endpoints folio (no IA)
- **Endpoint relacionado:** `/api/folios/:id` patches relacionados
- **Tablas consultadas:** campos en `public.folios`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Si un folio «tiene cheque»

### Fuente: Pólizas

- **Dominio:** Póliza de folio (M15/M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `POST /api/folios/:id/poliza`, documento póliza
- **Función de acceso:** Handlers póliza (no IA)
- **Endpoint relacionado:** citados; permiso `acceso_subir_poliza`
- **Tablas consultadas:** `public.folios` / `folio_archivos`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Existencia/contenido de póliza

### Fuente: Clasificación de apoyos

- **Dominio:** M4
- **Cobertura actual:** PARCIAL (query JSON `mes_a` vs `mes_b`; COMPARAR/Excel no integrados)
- **Archivo de acceso:** `lib/director-ia-m4-clasificacion-query.js`; `buildClasificacionMatrix` en `lib/clasificacion-apoyos-excel.js`
- **Función de acceso:** `loadClasificacionApoyosForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. GET `/clasificacion-apoyos*` y POSTs COMPARAR **no** usados
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** Intent `clasificacion_apoyos_query` → tool `get_clasificacion_apoyos_query` → SELECT + `buildClasificacionMatrix`
- **Información que no puede concluirse con esta fuente:** Causa del delta; desviación presupuestal; COMPARAR/reconciliación Excel; Taller por AT (M5); listado M6

### Fuente: Taller por AT

- **Dominio:** M5. Distinto de familia TALLER en M4, de GASTOS/INVERSIONES (M6) y de tema «Taller» en Action Register
- **Cobertura actual:** PARCIAL (query JSON on-demand por unidad; Excel/workbook/duplicados no integrados)
- **Archivo de acceso:** `lib/director-ia-m5-taller-at.js`; `expandTallerRows` en `lib/taller-at-excel.js`; `lib/unidad-taller.js`
- **Función de acceso:** `loadTallerAtForChat` (in-process)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`. GET `/taller-at-excel` **no** usado
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`. Campo de unidad: `public.folios.unidad` (tokens `AT-15` / `PT-03`; **no** `at_id`; **no** catálogo)
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio; unidad opcional si aparece en la pregunta (helper físico `unidad-taller`)
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed
- **Evidencia de integración actual:** Intent `taller_at` → tool `get_taller_at` → SELECT + `expandTallerRows`
- **Información que no puede concluirse con esta fuente:** Excel/workbook; duplicados taller; causa; responsable; atraso; mes inventado; igualdad con M4/M6/AR

### Fuente: Gastos

- **Dominio:** Folios categoría GASTOS (M6 query JSON). Distinto de IGF «gasto» (M7) y de Taller AT (M5)
- **Cobertura actual:** PARCIAL (consulta on-demand; Export/xlsx no integrado)
- **Archivo de acceso:** `lib/director-ia-m6-gastos-inversiones.js`; `expandCategoriaRows` en `lib/categoria-rango-excel.js`
- **Función de acceso:** `loadGastosInversionesForChat("GASTOS")` → SELECT `public.folios` + `expandCategoriaRows`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat` (in-process). **No** usa `GET /api/dashboard/categoria-rango-excel`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio (un mes o rango); partida/concepto opcional si aparece en la pregunta
- **Permisos:** JWT/contexto; rol; `plantas_permitidas`; GV 403; GA en planta autorizada; cross-planta 403; fail-closed
- **Evidencia de integración actual:** Intent `expense_analysis` + tool `get_expense_analysis` + rama en `askDirectorIa` (después de `detectUnsupported`, antes de OpenAI/IGF)
- **Información que no puede concluirse con esta fuente:** Export/xlsx; IGF/margen/rentabilidad; Taller AT; desviación; causa; mes inventado

### Fuente: Inversiones

- **Dominio:** Folios categoría INVERSIONES (M6 query JSON)
- **Cobertura actual:** PARCIAL (consulta on-demand; Export/xlsx no integrado)
- **Archivo de acceso:** `lib/director-ia-m6-gastos-inversiones.js`; `expandCategoriaRows` en `lib/categoria-rango-excel.js`
- **Función de acceso:** `loadGastosInversionesForChat("INVERSIONES")` → SELECT `public.folios` + `expandCategoriaRows`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat` (in-process). **No** usa `GET /api/dashboard/categoria-rango-excel`
- **Tablas consultadas:** `public.folios` ⋈ `public.plantas`
- **Filtros disponibles:** `planta_id` obligatorio; `YYYY-MM` obligatorio; partida/concepto opcional
- **Permisos:** mismos que Gastos (authz de folios, no bloqueo GA de KPIs IGF)
- **Evidencia de integración actual:** Intent `investment_analysis` + tool `get_investment_analysis` + rama en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Export/xlsx; «pendiente» como etapa almacenada; IGF; desviación; causa; mes inventado

### Fuente: Delta Venta

- **Dominio:** M9
- **Cobertura actual:** COMPLETA (consulta canónica read-only; no es descuento/ingreso)
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaVentaForChat` → `getPeriodosDeltaVenta` / `getDeltaVentaClientes` / `buildDeltaVentaDatosPayload`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-venta-datos` (sin HTTP interno)
- **Tablas consultadas:** `arr.ventas_diarias_cliente`
- **Evidencia de integración actual:** Intent `delta_sales`; tool `get_delta_sales` con executor real; rama in-process en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Causalidad; Delta Descuento; Delta Ingreso; ARR snapshot general

### Fuente: Delta Descuento

- **Dominio:** M9
- **Cobertura actual:** COMPLETA (consulta canónica read-only; no es weekly LD ni venta)
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaDescuentoForChat` → `getPeriodosDeltaDescuento` / `getDeltaDescuentoClientes` / `buildDeltaDescuentoDatosPayload`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-descuento-datos` (sin HTTP interno)
- **Tablas consultadas:** `arr.descuentos_diarios_cliente` + kg de `arr.ventas_diarias_cliente`
- **Evidencia de integración actual:** Intent `delta_discount`; tool `get_delta_discount` con executor real; rama in-process en `askDirectorIa`
- **Información que no puede concluirse con esta fuente:** Weekly LD (M10); causalidad; Delta Venta; Delta Ingreso

### Fuente: Delta Ingreso

- **Dominio:** M9 (periodos reales; forecast y M19 fuera)
- **Cobertura actual:** COMPLETA para el modal de periodos reales. Forecast con `DELETE`/`INSERT` y M19 permanecen NO INTEGRADOS.
- **Archivo de acceso:** `lib/director-ia-m9-deltas.js`
- **Función de acceso:** `loadDeltaIngresoForChat` → `getPeriodosDeltaVenta` / `getDeltaIngresoDatosInternal` (margen IGF solo como insumo de fórmula)
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; semántica de `POST /api/dashboard/delta-ingreso-datos` (sin HTTP interno)
- **Tablas consultadas:** ventas + descuentos ARR; `igf.versions` / `igf.compromiso_lines` como insumo de margen. No `arr.delta_ingreso_forecast_cliente`.
- **Evidencia de integración actual:** Intent `delta_income`; tool `get_delta_income` con executor real; no importa `delta-ingreso-forecast` ni `delta-ingreso-ai*`
- **Información que no puede concluirse con esta fuente:** Forecast de ingreso; M19; causalidad; anexo IGF/ARR como sustituto; Delta Venta; Delta Descuento

### Fuente: Duplicados

- **Dominio:** M16 (+ hoja Taller M5, no cableada)
- **Cobertura actual:** COMPLETA para el análisis de **posibles** pares de folios (M16). La hoja de duplicados Excel Taller (M5) permanece NO INTEGRADA.
- **Archivo de acceso:** `lib/folio-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/director-ia-duplicados.js`
- **Función de acceso:** `loadDuplicateFoliosForChat` → `loadFoliosParaDuplicados` → `findDuplicatePairs`
- **Endpoint relacionado:** Chat `POST /api/director-ia/chat`; dashboard `GET /api/folios/duplicados/analisis` (misma lógica de carga; el tool no hace HTTP interno)
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** Intent `duplicate_folios`; tool `get_duplicate_folios` con executor real; `SOURCE_NOT_INTEGRATED` retirado solo para este dominio
- **Información que no puede concluirse con esta fuente:** Duplicado confirmado, fraude, obligación de cancelar, pares fuera de ventana/`LIMIT`, duplicados Excel Taller, alarma `findSimilarTo` al crear

### Fuente: Usuarios y permisos

- **Dominio:** M0/M14
- **Cobertura actual:** INDIRECTA / NO INTEGRADA como dominio de respuesta
- **Archivo de acceso:** `lib/usuario-permisos.js`, `lib/dashboard-auth.js`
- **Función de acceso:** `authHasPermiso`, gates; `loadUsuarioRolesByIds` (roles de responsables)
- **Endpoint relacionado:** `/api/usuarios-admin*` (no IA)
- **Tablas consultadas:** `public.usuarios`, `public.roles`
- **Evidencia de integración actual:** Auth gate + roles en AR; no consulta admin
- **Información que no puede concluirse con esta fuente:** Matriz completa de permisos de un usuario arbitrario

### Fuente: WhatsApp

- **Dominio:** M17
- **Cobertura actual:** PARCIAL (canal de acceso, no fuente de datos del chat)
- **Archivo de acceso:** `server.js` Twilio handler
- **Función de acceso:** comando `DirectorIA` → URL firmada
- **Endpoint relacionado:** `POST /twilio/whatsapp`
- **Tablas consultadas:** usuarios / notificaciones según comando
- **Evidencia de integración actual:** Generación de link si `ENABLE_DIRECTOR_IA`
- **Información que no puede concluirse con esta fuente:** Contenido de chats WhatsApp previos como contexto Director IA

### Fuente: Mejora Continua (complemento AR)

- **Dominio:** Vista MC sobre Action Register (M12/M13)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-mejora-continua.js`
- **Función de acceso:** `buildMejoraContinuaPayload`, `loadMejoraContinuaForChat`
- **Endpoint relacionado:** `GET /api/director-ia/mejora-continua`
- **Tablas consultadas:** Action Register (vía board)
- **Filtros:** planta, year, month
- **Evidencia de integración actual:** Preguntas MC en chat (`isMejoraContinuaQuestion`)
- **Información que no puede concluirse con esta fuente:** Folios operativos; Excel Taller

---

## Parte 4 — Capacidades de negocio (preguntas)

| # | Pregunta | ¿Puede responderla hoy? | Cobertura | Fuente necesaria | Función/endpoint existente | Información faltante | Riesgo de respuesta incorrecta |
|---|----------|-------------------------|-----------|------------------|----------------------------|----------------------|--------------------------------|
| 1 | ¿Cómo va una planta? | Parcialmente | PARCIAL | AR + (opcional) IGF/ARR/MC según wording | `buildDirectorIaContextPayload`; `buildPlantSummaryBlock`; `loadIgfArrAnnexForChat` si regex financiero | Presupuestos; Export GASTOS. Listado M6 y KPIs/proyectos M3 existen on-demand con wording propio (no se activan solo con «cómo va la planta») | Alto si se interpreta como KPI financiero IGF/ARR o como KPI de folios sin el intent `dashboard_kpis` |
| 2 | ¿Qué acciones están vencidas? | Sí (limitado) | PARCIAL | Action Register | `summarizeTopOverdueActions` / context | Acciones fuera del top 10; notas de revisión son otro intent (no se mezclan con vencidas) | Medio (omisión por límite) |
| 3 | ¿Quién es responsable de una acción? | Sí (limitado) | PARCIAL | Action Register | `summarizeActionRegisterResponsables`, narrativa chat | Responsables fuera del top 10 | Medio |
| 4 | ¿Por qué cayó el ingreso? | Parcialmente | PARCIAL / INDIRECTA | commercial_state + DICF + bitácora + IGF/ARR | `loadCommercialStateForChat`, `summarizeDicfContext`, anexo IGF/ARR | Causalidad no estructurada (M9 compara periodos reales; no afirma por qué cayó el ingreso) | Alto (hipótesis narrativa) |
| 5 | ¿La caída proviene de venta o descuento? | Parcialmente | PARCIAL | ARR/IGF annex + commercial_state; familias M9 solo si el intent es `delta_*` | `loadIgfArrAnnexForChat`; loaders M9 si wording es «cómo cambió venta/descuento» | Esta pregunta causal no es el intent M9; no atribución automática venta vs descuento | Medio-Alto |
| 6 | ¿Cómo va ARR contra la meta? | Parcialmente | PARCIAL | ARR annex | `loadArrProyForPlant` | Meta/UI completa ARR; depende de wording regex | Medio |
| 7 | ¿Cómo va IGF contra el compromiso? | Parcialmente | PARCIAL | IGF annex + composición de 1 fila | `loadIgfCommitSnapshot` / `extractIgfComposition` / `get_igf_snapshot` | Versiones/HG UI; `sources.igf` no en GET; no es tendencia (M9) ni causa | Medio |
| 8 | ¿Qué clientes explican la desviación? | Parcialmente | PARCIAL | commercial_state / top clientes IGF-ARR / DICF | `loadCommercialStateForChat` (20 clientes), `loadTopClientesDescBrief` (8) | Universo completo de clientes | Medio (top-N) |
| 9 | ¿En qué etapa está un folio? | Sí (estatus observado + etapa derivada; no es historial ni tablero HTTP) | PARCIAL | Folios (`public.folios.estatus`) | `loadFolioStatusForChat` / `get_folio_status` (SELECT-only; **no** `GET /kanban` ni `GET /folios/:id`) | Contenido PDF/S3, cheque/póliza, autoavance, tablero HTTP | Alto si se lee como columna DB `etapa` o como kanban mutante |
| 10 | ¿Por qué está detenido un folio? | No de forma fiable | INDIRECTA máx. | Comentarios folio | `loadFolioComentariosForDirectorIa` | Estatus, timeline, permisos de avance | Alto |
| 11 | ¿Cuál fue el último movimiento del folio? | Sí (eventos observados de `public.folio_historial`; no es GET `/timeline` ni tablero HTTP) | PARCIAL | Historial (`public.folio_historial`) | `loadFolioHistoryForChat` / `get_folio_history` (SELECT-only; **no** `GET /timeline`; **no** `dedupeHistorialByStage`) | Contenido PDF/S3, cheque/póliza, transiciones inventadas, actor sistema, tablero HTTP | Alto si se lee como transición, como GET `/timeline` o como historial deduplicado |
| 12 | ¿Qué documentos le faltan? | No | NO INTEGRADA | Documentos/medios (faltantes / set esperado) | Guardrail `UNSUPPORTED_RULES.documentos` (`SOURCE_NOT_INTEGRATED`) | Set esperado canónico; cumplimiento; contenido | Alto si se lee la metadata M2 como «faltan documentos» |
| 13 | ¿Tiene cheque, depósito o póliza? | No | NO INTEGRADA | Folios/pólizas | Campos folio + endpoints póliza/cheque | Toda la fuente | Alto |
| 14 | ¿Existen posibles folios duplicados? | Sí (heurístico; candidatos, no confirmación) | COMPLETA | Duplicados | `loadDuplicateFoliosForChat` / `findDuplicatePairs` | Confirmación humana; cancelación; `/check` al crear; pares fuera de ventana o `LIMIT 1500` | Alto si se lee como duplicado confirmado o fraude |
| 15 | ¿Qué gastos existen por planta? | Parcialmente (listado folios GASTOS si wording es categoría/folios + `YYYY-MM`; no Excel) | PARCIAL | Folios categoría GASTOS (`public.folios` + `expandCategoriaRows`) | `loadGastosInversionesForChat("GASTOS")` / `get_expense_analysis` | Export/xlsx; «cómo van los gastos» / margen / rentabilidad siguen IGF (M7) | Alto si se lee como IGF o como Export |
| 16 | ¿Qué inversiones están pendientes? | Parcialmente (listado folios INVERSIONES no cancelados si hay `YYYY-MM`; «pendiente» no es etapa almacenada) | PARCIAL | Folios categoría INVERSIONES | `loadGastosInversionesForChat("INVERSIONES")` / `get_investment_analysis` | Export/xlsx; etapa «pendiente»; mes inventado | Alto si se afirma pendiente como estatus |
| 17 | ¿Cómo va el presupuesto semanal? | Sí (carro read-only por planta/semana; no writes ni cheques) | PARCIAL | Presupuestos (`presupuestos_semanales` + `presupuesto_folios`) | `loadPresupuestoSemanalForChat` / `get_budget_status` (SELECT-only; no solo `ABIERTO`) | Asignar/seleccionar; cheques; WhatsApp; `presupuesto_asignacion_detalle`; semana inventada | Alto si se lee como pagado, cheque o asignación mensual |
| 18 | ¿Qué proyectos están retrasados? | Sí (listado EN_CURSO; «retrasado» no es estatus almacenado) | COMPLETA (consulta del módulo; el retraso solo puede declararse como derivado de `fecha_cierre_estimada`) | Proyectos | `loadProyectosForChat` / `get_project_status` | Estatus oficial de retraso; crear/editar/eliminar | Alto si se lee como estatus almacenado o como Action Register |
| 19 | ¿Qué usuario realizó un movimiento? | Parcialmente (folios: `actor_telefono`/`actor_rol` observados si existen; null ≠ sistema); parcial en AR/DICF | PARCIAL | Historial folio vs historial DICF/AR | `loadFolioHistoryForChat` (actor observado) vs detalles DICF/AR summarizers | Responsabilidad inferida; actor sistema; usuario canónico si actor es null | Alto si se atribuye mal |
| 20 | ¿Qué información no puede consultar Director IA? | Sí (meta) | COMPLETA (esta pregunta de catálogo) | Este documento + `EMPTY_SOURCES` | N/A | — | Bajo si se responde con catálogo |

### Preguntas adicionales respaldadas por el sistema

| Pregunta | ¿Hoy? | Cobertura | Fuente | Función/endpoint | Faltante | Riesgo |
|----------|-------|-----------|--------|------------------|----------|--------|
| ¿Qué hay en bitácora de un cliente? | Parcial | PARCIAL | Bitácora + entidades | `filterBitacoraByQuestion`, `resolveCommercialEntitiesForQuestion` | Fuera de 3 meses / 30 sesiones | Medio |
| ¿Cómo va Mejora Continua del mes? | Parcial | PARCIAL | MC | `loadMejoraContinuaForChat` / `GET /api/director-ia/mejora-continua` | Áreas no enfocadas por regex | Medio |
| ¿Qué clientes dejaron de comprar? | Parcial | PARCIAL | commercial_state | `loadCommercialStateForChat` | >20 clientes; GA bloqueado; **no** es expediente_comercial | Medio |
| ¿Qué sabemos comercialmente / expediente de Cliente X? | Sí (factual; un cliente; no causa) | PARCIAL | Expediente comercial | `loadCommercialDossierForChat` / `get_commercial_dossier` (SELECT-only) | Cliente ambiguo (clarifica); comentarios sin `cliente_key`; overflow 8/500/8/8; bitácora; causalidad | Alto si se lee como causa, solución, bitácora o lista de clientes |
| ¿Qué alias tiene una entidad? | Sí (API/UI) | PARCIAL | Entidades | `/api/director-ia/comercial-entidades*` | Si no está en catálogo | Bajo-Medio |
| ¿Qué documentos tiene / listar registros documentales de un folio? | Sí (solo metadata DB; no PDF/S3; no faltantes) | PARCIAL | Metadata `public.folio_archivos` | `loadFolioDocumentsMetadataForChat` / `get_folio_documents` (SELECT-only; **no** `/media`; **no** S3) | Contenido, URLs, documentos faltantes, cumplimiento | Alto si se lee como documentación completa o como «faltan documentos» |
| ¿Cómo cambió la clasificación de apoyos entre mes_a y mes_b? | Sí (matriz agregada; no Excel; no COMPARAR) | PARCIAL | Folios + `buildClasificacionMatrix` | `loadClasificacionApoyosForChat` / `get_clasificacion_apoyos_query` | COMPARAR; Excel; causa del delta; igualdad con totales M6 | Alto si se lee como desviación presupuestal o como M6/M5 |
| ¿Qué dicen las notas de la última revisión / de una revisión? | Sí (texto/autor/`created_at` de una revisión; no ítem) | PARCIAL | `arr.action_register_revision_notes` | `loadActionRegisterRevisionNotesForChat` / `get_action_register_revision_notes` | Revisión no identificada (clarifica); overflow >8; body >500 truncado; attachments | Alto si se lee como nota de ítem, acuerdo formal, Plaud, history M2 o comentario de folio |
| ¿De qué se compone la utilidad / resultado / compromiso IGF? | Sí (snapshot de 1 fila; hechos observados; no causa) | PARCIAL | `igf.compromiso_lines` | `extractIgfComposition` / `get_igf_snapshot` / `loadIgfCommitSnapshot` | UI/PATCH/versiones; recálculo; overlay; «cómo cambió venta/descuento/ingreso» es M9 | Alto si se lee como causa, problema, responsable, prioridad o tendencia |
| ¿Cuánto hay de Taller en AT-15 / PT-03 en YYYY-MM? | Sí (detalle por unidad; no Excel; no duplicados) | PARCIAL | `public.folios.unidad` + categoría TALLER | `loadTallerAtForChat` / `get_taller_at` (SELECT-only) | Periodo ausente (clarifica); Excel; duplicados; «cómo va Taller» es AR; familia M4 | Alto si se lee como GASTOS, M4, Action Register, causa o responsable |

---

## Parte 5 — Matriz de veracidad

| # | Caso | Estado interno sugerido | Texto de respuesta permitido | Texto de respuesta prohibido | Acción siguiente recomendada |
|---|------|-------------------------|------------------------------|------------------------------|------------------------------|
| 1 | Fuente integrada y dato encontrado | `OK_CON_EVIDENCIA` | Citar hechos del contexto (tema, responsable, cliente, mes) y la fuente usada (AR/DICF/bitácora/IGF…). | Afirmar cobertura de módulos no presentes en `sources`/anexos. | Ofrecer detalle del mismo dominio. |
| 2 | Fuente integrada y dato no encontrado | `OK_SIN_DATOS` | «No encuentro [X] en [fuente] para esta planta/periodo.» | «No existe en la empresa» / inventar valores. | Pedir otro identificador o ampliar periodo. |
| 3 | Fuente parcialmente integrada | `PARCIAL` | «Puedo ver un resumen limitado (p. ej. top N / últimos 3 meses / on-demand).» | Presentar el resumen como inventario completo. | Indicar límite (10 overdue, 40 DICF, 80 comentarios, etc.). |
| 4 | Fuente no integrada | `NO_DISPONIBLE` | «Esa información está en el dashboard ([módulo]) pero no forma parte de las fuentes de Director IA.» | Contestar con conjeturas desde comentarios u otras fuentes. | Remitir a pantalla/endpoint humano. |
| 5 | Usuario sin permiso | `FORBIDDEN` | «No tienes acceso a esta planta/KPI.» (como ya hacen gates 403) | Filtrar datos de otra planta «por ayudar». | Usar token/planta autorizada. |
| 6 | Error de consulta | `ERROR_FUENTE` | «No pude cargar [fuente]: [error seguro].» | Inventar KPIs «aproximados». | Reintentar; revisar logs `[Director IA …]`. |
| 7 | Datos contradictorios | `CONFLICTO` | Exponer ambas evidencias (p. ej. bitácora más reciente vs DICF) y pedir criterio. | Elegir una sin declarar el conflicto. | Priorizar regla ya existente (`shouldPrioritizeBitacoraOverDicf`) y declararla. |
| 8 | Periodo no especificado | `PERIODO_IMPLICITO` | Declarar el periodo usado (mes CDMX / ventana 3 meses). | Hablar de «este año» sin anclar. | Confirmar mes con el usuario. |
| 9 | Planta no especificada | `PLANTA_REQUERIDA` | «Necesito la planta (`planta_id`).» | Responder con datos de otra planta. | Exigir planta (como context). |
| 10 | Entidad ambigua | `AMBIGUO` | Listar candidatos de `comercial_entidad` / alias y pedir desambiguación. | Asumir el primer match sin decirlo. | Usar `resolveCommercialEntity` / search alias. |
| 11 | Datos desactualizados | `STALE_POSIBLE` | Advertir que ARR/IGF dependen de última carga/versión. | Garantizar «tiempo real absoluto». | Indicar revisar `arr.upload_log` / versión IGF en UI. |
| 12 | Resultado calculado | `CALCULADO` | Marcar como cálculo (`computeDicf`, margen $/kg, deltas). | Presentarlo como campo crudo de tabla. | Mostrar insumos (venta vs descuento) si están en anexo. |
| 13 | Hipótesis sin evidencia suficiente | `HIPOTESIS` | «Con el contexto disponible no hay evidencia suficiente; hipótesis: …» | Afirmar causa raíz. | Pedir bitácora/DICF/periodo o abrir módulo no integrado. |

---

## Parte 6 — Lectura contra ejecución

Leyenda: **A** lectura inicial · **B** con confirmación humana · **C** no permitida para Director IA · **D** decisión de negocio pendiente

| Operación | Clase | Permiso(s) en `usuario-permisos.js` | Evidencia / nota |
|-----------|-------|-------------------------------------|------------------|
| Crear folio | C (hoy); B si algún día se expone | `acceso_crear_folios` | API `POST /api/folios` existe; no tool IA |
| Editar folio | C / B futuro | `acceso_editar_folio` | `PATCH /api/folios/:id` |
| Mover etapa | C / B futuro | `acceso_mover_folio_arrastre`, `acceso_avanzar_etapa` | mover/avanzar endpoints |
| Aprobar folio | C / B futuro | `acceso_aprobar_folios` | `POST .../aprobar` |
| Aprobar comprobaciones | C / B futuro | `acceso_aprobar_comprobaciones` | `POST .../aprobar-comprobaciones` |
| Cancelar folio | C / B futuro | `acceso_cancelar_folio_dashboard`, `acceso_solicitar_cancelacion`, `acceso_aprobar_cancelacion` | cancelar + duplicados UI |
| Marcar prioridad | C / B futuro | `acceso_marcar_urgente` | `PATCH .../prioridad` |
| Asignar mes de cargo | C / B futuro | `acceso_asignar_mes_cargo` | campos mes en folio |
| Subir póliza | C / B futuro | `acceso_subir_poliza` | `POST .../poliza` |
| Crear comentario | D (cliente/folio); B si vía IA | (dashboard comentarios; no clave específica listada como `acceso_comentario`) | `createClienteComentario` / comentarios folio API; chat hoy no crea |
| Crear proyecto | C / B futuro | (no hay clave dedicada en catálogo listado) | `POST /api/proyectos` |
| Modificar presupuesto | C / D | (roles GG / flujos bot) | tablas `presupuesto_*` |
| Enviar solicitud a cheques | C / D | `acceso_avanzar_etapa` (avance a cheque) | flujo etapas + WhatsApp |
| Cambiar permisos de usuario | C | unlock admin + `/api/usuarios-admin*` | Fuera de Director IA; riesgo ALTO |
| Descargar o mostrar documentos | A (lectura metadatos) futuro; B (exponer URL); C (exfiltrar masivo) | `acceso_ver_imprimir_folios` | Endpoints documento/media no cableados |
| Consultar Action Register / DICF / bitácora | A | `acceso_acciones_dicf` + planta | Ya existe |
| Consultar IGF/ARR on-demand | A | gates financieros / no GA en commercial_state | Ya existe en chat |
| Crear/editar bitácora o entidad | B (UI humana ya lo hace vía API); C desde chat autónomo sin confirmación | Flag Director IA + JWT | Endpoints `/api/director-ia/bitacora`, `/comercial-entidades` |
| Enviar WhatsApp masivo / test Delta AI | C | N/A (rutas test) | `/api/ai/delta-ingreso/test/*` |
| Cargar ARR / COMPARAR actualizar folios | C / D | Auth + claves privadas | Mutación masiva |

### Nunca debería ejecutar sin confirmación humana

Cualquier operación de clase **B** o **C** que cambie dinero, estatus de folio, presupuesto, permisos, envíos WhatsApp o documentos. El chat actual (`askDirectorIa`) es de **lectura/síntesis**; las escrituras del módulo se hacen por API UI explícita (bitácora/entidades), no como tool autónomo del LLM.

---

## Parte 7 — Prioridad de integración

Escala 1–5. Prioridad derivada de: valor ejecutivo × disponibilidad de funciones existentes ÷ (complejidad × riesgo), según auditoría.

### Integraciones de lectura

| Módulo / fuente | Valor ejecutivo | Calidad/disponibilidad datos | Complejidad técnica | Riesgo seguridad | Dependencias previas | Prioridad sugerida |
|-----------------|-----------------|------------------------------|---------------------|------------------|----------------------|--------------------|
| Folios/Kanban (lectura estatus) | 5 | 5 (API kanban/folios) | 3 (`server.js` monolítico) | 3 | Auth planta, permisos ver | **Alta** |
| Historial folio | 4 | 5 (timeline) | 2 | 3 | Folios | **Alta** |
| Documentos/medios (metadatos) | 4 | 4 | 3 (S3 URLs) | 4 | Folios, `acceso_ver_imprimir_folios` | **Media-Alta** |
| IGF/ARR en GET context (no solo regex) | 5 | 4 (ya hay annex) | 2 | 3 | Igualar sources chat/context | **Alta** |
| commercial_state en GET context | 5 | 4 | 2 | 3 | GA/GV gates | **Alta** |
| Delta Venta/Descuento/Ingreso | 4 | 4 (endpoints) | 3 | 3 | ARR | **Media** |
| GASTOS/INVERSIONES (query, no solo xlsx) | 4 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M6 | **Hecha (PARTIAL)**; Export/xlsx sigue fuera |
| Taller por AT (query JSON por unidad) | 3 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M5 | **Hecha (PARTIAL)**; Excel/workbook/duplicados siguen fuera |
| Duplicados (`folio-duplicados`) | 3 | 4 | 2 | 3 | Folios | **Media** |
| Presupuesto semanal | 4 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M18 | **Hecha (PARTIAL)**; writes/cheques/WhatsApp siguen fuera |
| Proyectos | 3 | 4 | 2 | 2 | Plantas | **Media-Baja** |
| Clasificación de apoyos (solo lectura matriz) | 3 | 4 | 3 | 3 | Folios; query JSON ya en PARCIAL M4 | **Hecha (PARTIAL)**; COMPARAR/Excel siguen fuera |
| Weekly discount LD | 2 | 3 | 2 | 2 | ARR, Twilio | **Baja** |
| Health | 1 | 5 | 1 | 1 | Ninguna | **Baja** |
| Usuarios admin (lectura) | 2 | 5 | 2 | 5 | Unlock/clave | **Baja** (riesgo alto) |
| Delta Ingreso AI test | 1 | 2 | 2 | 5 | Sistema paralelo | **No priorizar** (C) |
| Home KPI como página | 2 | 3 | 1 | 2 | Ya cubierto por M7/M11 | **Baja** (INDIRECTA) |

### Integraciones analíticas

| Capacidad analítica | Valor | Datos | Complejidad | Riesgo | Dependencias | Prioridad sugerida |
|---------------------|-------|-------|-------------|--------|--------------|--------------------|
| Unificar sources GET context = chat (IGF/ARR/commercial_state) | 5 | 4 | 2 | 2 | `EMPTY_SOURCES`, `askDirectorIa` | **Alta** |
| Diagnóstico planta multi-fuente con límites declarados | 5 | 4 | 3 | 3 | AR+DICF+IGF+ARR | **Alta** |
| Descomposición venta vs descuento vs ingreso | 5 | 4 | 3 | 3 | Reutilizar delta-* o annex | **Alta** |
| Detección duplicados on-demand en chat | 3 | 4 | 2 | 3 | `folio-duplicados.js` | **Media** |
| Narrativa weekly discount bajo demanda | 2 | 3 | 2 | 2 | weekly-discount-* | **Baja** |
| Cruzar bitácora + DICF + commercial_state (ya parcial) | 4 | 4 | 2 | 2 | Routing regex actual | **Media** (mejorar veracidad) |

### Integraciones transaccionales

| Operación | Valor | Datos | Complejidad | Riesgo | Dependencias | Prioridad sugerida |
|-----------|-------|-------|-------------|--------|--------------|--------------------|
| Crear comentario (con confirmación) | 3 | 4 | 2 | 3 | APIs comentarios | **Media** (solo B) |
| Mutar Action Register / DICF desde chat | 3 | 4 | 4 | 5 | Permisos + confirmación | **Baja** hasta marco B |
| Aprobar/mover/cancelar folio desde chat | 4 | 5 | 4 | 5 | Permisos folios | **No sin decisión D + B** |
| Modificar presupuesto / cheques | 4 | 3 | 5 | 5 | Bot + tablas | **No sin decisión D** |
| Cambiar permisos usuario | 1 | 5 | 2 | 5 | usuarios-admin | **C — no integrar** |
| Enviar WhatsApp / test Delta AI | 1 | 2 | 2 | 5 | Twilio | **C — no integrar a Director IA** |

**Nota:** No se genera calendario. La prioridad refleja reutilización de código existente y riesgo observado en la auditoría, no preferencias de producto nuevas.

---

## Parte 8 — Hallazgos críticos

### 1. `server.js` monolítico

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría: lógica de folios, kanban, ARR, IGF, WhatsApp y registro de ~100+ rutas Express en un solo archivo `server.js` (~20k líneas). |
| **Impacto posible** | Expansión de Director IA requiere tocar un archivo de alto acoplamiento; mayor riesgo de regresiones. |
| **Dominios afectados** | M2–M20 prácticamente todos. |
| **¿Bloquea expansión de Director IA?** | No bloquea lectura vía nuevos libs; sí encarece wrappers seguros. |
| **Información adicional para confirmar** | Mapa exacto de qué handlers ya exportan helpers inyectables vs lógica inline. |

### 2. Routing de Director IA por regex

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `lib/director-ia-chat.js`, `lib/director-ia-igf-arr.js` (`IGF_SIGNAL_RE`, `ARR_SIGNAL_RE`, `PLANT_FINANCIAL_KPI_RE`), `isCommercialStateListQuestion`, etc. |
| **Impacto posible** | Preguntas legítimas no activan la fuente correcta. El listado de folios GASTOS/INVERSIONES ya va a M6; «cómo van los gastos» / margen / rentabilidad siguen IGF (M7). Export/xlsx sigue fuera. |
| **Dominios afectados** | M6, M7, M8, M9, M11, M12, M13. |
| **¿Bloquea expansión?** | No; aumenta riesgo de veracidad al añadir fuentes. |
| **Información adicional** | Cobertura de tests de routing (no inventariados como suite dedicada en esta auditoría). |

### 3. Historial de chat no persistente

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M13; `askDirectorIa` usa `req.body.history` opcional; no hay tabla de historial de chat. |
| **Impacto posible** | No hay auditoría de respuestas; continuidad solo si el cliente reenvía history. |
| **Dominios afectados** | M13. |
| **¿Bloquea expansión?** | No para lectura de datos de negocio; sí para trazabilidad. |
| **Información adicional** | Si el frontend siempre envía `history` y con qué tamaño. |

### 4. Diferencia entre fuentes del GET context y del chat

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `EMPTY_SOURCES`: `igf`, `arr`, `commercial_state` inician y permanecen `false` en `buildDirectorIaContextPayload`; chat llama `loadIgfArrAnnexForChat` / `loadCommercialStateForChat` on-demand. |
| **Impacto posible** | UI/context reporta fuentes incompletas respecto a lo que el chat realmente usa. |
| **Dominios afectados** | M7, M8, M11, M13. |
| **¿Bloquea expansión?** | No; genera inconsistencia de contrato. |
| **Información adicional** | Consumidores FE de `sources.*` en `modules/director-ia`. |

### 5. DDL disperso entre `server.js`, `sql/` y `lib/`

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría Anexo A: CREATE en server, `sql/012+`, `lib/dicf-acciones.js`, `lib/cliente-comentarios.js`, `lib/delta-ingreso-ai-db.js`. |
| **Impacto posible** | Dificulta saber qué tablas existen en un entorno dado. |
| **Dominios afectados** | M11, M13, M19, ARR, IGF. |
| **¿Bloquea expansión?** | Parcialmente (ambigüedad de esquema). |
| **Información adicional** | Inventario runtime vs migraciones aplicadas en cada ambiente. |

### 6. Endpoints Delta Ingreso AI de prueba aparentemente sin middleware

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M19; rutas `/api/ai/delta-ingreso/test/*` registradas sin `dashboardAuthMiddleware` en el inventario. |
| **Impacto posible** | Envío de mensajes / exposición de estado sin auth dashboard. |
| **Dominios afectados** | M19; reputación del proceso Node compartido con Director IA. |
| **¿Bloquea expansión?** | No de lectura Director IA; sí es riesgo de seguridad del host. |
| **Información adicional** | Controles de red / secretos adicionales no visibles en repo. |

### 7. Claves privadas en query string

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M4/M5/M6/M14: `priv_clave`, `USUARIOS_ADMIN_CLAVE` / `Tomza-Priv` en flujos Excel/admin. |
| **Impacto posible** | Fuga en logs, historial de navegador, proxies. |
| **Dominios afectados** | Clasificación, Taller, GASTOS/INVERSIONES, usuarios admin. |
| **¿Bloquea expansión?** | No; condiciona cómo una herramienta IA podría pedir privados (no debería reenviar claves). |
| **Información adicional** | Si hay rotación/telemetría de query strings. |

### 8. Tokens JWT en URL

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | `dashboardAuthMiddleware` acepta `?t=`; WhatsApp genera links con token; `createDashboardToken`. |
| **Impacto posible** | Tokens compartibles / filtrables. |
| **Dominios afectados** | M0, M17, todo dashboard. |
| **¿Bloquea expansión?** | No. |
| **Información adicional** | TTL exacto y revocación (auditoría menciona ~20h en mensajes WhatsApp). |

### 9. Dos sistemas de IA paralelos

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Director IA (`lib/director-ia-*.js`) vs Delta Ingreso AI (`lib/delta-ingreso-ai*.js`) en el mismo proceso. |
| **Impacto posible** | Respuestas divergentes sobre ingreso; costos OpenAI duplicados; confusión operativa. |
| **Dominios afectados** | M13, M19, M9. |
| **¿Bloquea expansión?** | No técnicamente; sí conceptualmente si no se delimita. |
| **Información adicional** | Si Delta Ingreso AI está activo en producción (`AI_ENABLED` / schedulers). |

### 10. Presupuestos con modelo de datos amplio pero UI limitada

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Query read-only M18 integrada (`loadPresupuestoSemanalForChat` sobre `presupuestos_semanales` + `presupuesto_folios`). Siguen existiendo otras tablas `presupuesto_*` (asignación mensual, solicitudes) y el bot WhatsApp. |
| **Impacto posible** | Confundir el carro semanal con `presupuesto_asignacion_detalle`, cheques o el canal WhatsApp. |
| **Dominios afectados** | M18, M2 (carro). |
| **¿Bloquea expansión?** | No para la query del carro. Sí para writes, cheques y Twilio/WhatsApp (fuera de PARTIAL). |
| **Información adicional** | Flujos WhatsApp carrito y estados canónicos siguen fuera de Director IA. |

### 11. Tres mecanismos distintos para detectar duplicados

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M5/M16: check al crear, análisis modal (`folio-duplicados.js`), hoja Excel Taller. El chat M16 declara el detector del modal: `findDuplicatePairs` (umbral 0.72). |
| **Impacto posible** | Respuestas IA inconsistentes si se envolviera otro detector (check al crear o Excel Taller). |
| **Dominios afectados** | M5, M16, M2. |
| **¿Bloquea expansión?** | No; el detector de M16 chat ya está declarado. |
| **Información adicional** | Paridad de umbrales entre los tres (pendiente). |

### 12. Ausencia de hooks, providers o estado global compartido

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría Anexo D: sin `hooks/`, `context/`, `createContext`. |
| **Impacto posible** | FE Director IA y dashboard no comparten cache de fuentes; más llamadas repetidas. |
| **Dominios afectados** | Frontend M13 y resto. |
| **¿Bloquea expansión?** | No (backend-first). |
| **Información adicional** | N/A. |

### 13. Flags frontend y backend potencialmente desalineados

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | FE `modules/director-ia/lib/is-enabled.ts` (build) vs BE `isDirectorIaEnabled()` / `ENABLE_DIRECTOR_IA`; chat también `AI_ENABLED` + `OPENAI_API_KEY`. |
| **Impacto posible** | UI visible con API 200 `{enabled:false}` o chat fallido. |
| **Dominios afectados** | M13, M17. |
| **¿Bloquea expansión?** | Operativamente sí hasta alinear flags. |
| **Información adicional** | Valores reales de entorno por deployment (no están en repo). |

---

## Parte 9 — Resultado final

### 1. Resumen de cobertura real actual

Director IA hoy es un **asistente de lectura/síntesis** centrado en **Action Register**, **DICF**, **bitácora**, **comentarios** (cliente y folio) y **entidades comerciales**, con **anexos financieros on-demand** (IGF/ARR/margen/estado comercial) activados por **regex** en el chat, incluida la **composición observada de un snapshot IGF** (M7 slice: `get_igf_snapshot` / `loadIgfCommitSnapshot` / `extractIgfComposition`; 1 fila de `igf.compromiso_lines`; `*_kg` = $/kg; null ≠ 0; `hg_kg` no invertido; `gasto_kg` fuera de fórmula; no se ejecuta `recalcularUtilYResultado`; no overlay; no deltas — M9; composición ≠ causalidad), **análisis on-demand de posibles duplicados de folios** (M16: `findDuplicatePairs`, no confirmación), **consulta on-demand de KPIs de dashboard y proyectos por planta** (M3: `get_dashboard_kpis` / `get_project_status`; no catálogo global; no creación de proyectos), **consulta on-demand de Delta Venta / Descuento / Ingreso de periodos reales** (M9: `get_delta_sales` / `get_delta_discount` / `get_delta_income`; no forecast con escritura; no M19), **consulta on-demand de estatus/etapa de folio** (M2 slice `folio_status`: `get_folio_status` / `loadFolioStatusForChat`; SELECT-only; no GET kanban; no GET `/folios/:id`; no autoavance), **consulta on-demand del historial de folio** (M2 slice `folio_history`: `get_folio_history` / `loadFolioHistoryForChat`; SELECT-only de `public.folio_historial`; no GET `/timeline`; no `dedupeHistorialByStage`; no autoavance), **consulta on-demand de metadata documental de folio** (M2 slice `folio_documents`: `get_folio_documents` / `loadFolioDocumentsMetadataForChat`; SELECT-only de `public.folio_archivos` con proyección segura; no S3; no PDF; no `s3_key`; no «faltan documentos»), y **consulta on-demand de GASTOS e INVERSIONES de folios** (M6 slice query JSON: `get_expense_analysis` / `get_investment_analysis` / `loadGastosInversionesForChat`; SELECT `public.folios` + `expandCategoriaRows`; `YYYY-MM` obligatorio; no Excel; no Export; no IGF), y **consulta on-demand de Taller por AT** (M5 slice query JSON: `get_taller_at` / `loadTallerAtForChat`; SELECT `public.folios` con `categoria LIKE '%TALLER%'` + `expandTallerRows`; unidad = token de `public.folios.unidad` (`AT-15` / `PT-03`); **no** `at_id`; **no** catálogo; `YYYY-MM` obligatorio; no Excel; no workbook; no duplicados taller; no writes; «cómo va Taller» sigue Action Register; familia TALLER de M4 ≠ detalle por unidad), y **consulta on-demand de la matriz comparativa de clasificación de apoyos** (M4 slice query JSON: `get_clasificacion_apoyos_query` / `loadClasificacionApoyosForChat`; SELECT `public.folios` + `buildClasificacionMatrix`; `mes_a` vs `mes_b` obligatorios y distintos; GASTOS / INVERSIONES / TALLER separados; sin fallback a 6 plantas; no COMPARAR; no Excel), y **consulta on-demand del carro presupuestal semanal** (M18 slice query JSON: `get_budget_status` / `loadPresupuestoSemanalForChat`; SELECT `presupuestos_semanales` + `presupuesto_folios`; no inventa semana; no filtra solo `ABIERTO`; no writes; no cheques; no WhatsApp; no `presupuesto_asignacion_detalle`), y **consulta on-demand de notas de revisión del Action Register** (M12 slice: `get_action_register_revision_notes` / `loadActionRegisterRevisionNotesForChat`; SELECT `arr.action_register_revision_notes` por `revision_id`; 1 revisión / 8 notas / 500 caracteres; última = `revision_date DESC`; `includeNotes` del context sigue `false`; no ítem; no Plaud; no M2; no binarios), y **consulta on-demand del expediente comercial factual** (M11 slice: `get_commercial_dossier` / `loadCommercialDossierForChat`; authz planta antes de datos; cliente único; SELECT `arr.dicf_cliente_mes` sin `computeDicf`; comentarios solo con `cliente_key`; acciones por `planta_id` + `cliente_key`; historial/cierre por `accion_id`; 1/8/500/8/8; procedencia separada; sin causalidad; sin bitácora). **No** opera el kanban HTTP, **no** usa `/timeline` como transporte interno, **no** lee contenido PDF/S3/pólizas/cheques/COMPARAR-Excel de clasificación/taller/Export xlsx GASTOS-INVERSIONES ni el forecast mutante de ingreso. Las escrituras propias (bitácora/entidades) existen por **API UI**, no como tools autónomos del LLM. El GET `/api/director-ia/context` **subdeclara** IGF/ARR/commercial_state respecto al chat.

### 2. Dominios completos (COMPLETA)

- **M3 Plantas / KPIs / Proyectos** (consulta canónica de la planta del scope, KPIs de `GET /api/dashboard/kpis` y `public.proyectos` por planta. COMPLETE no implica catálogo global, estatus «retrasado» almacenado ni `POST /api/proyectos`).
- **M9 Delta Venta / Descuento / Ingreso** (consulta canónica read-only de las tres familias de periodos reales vía `get_delta_sales` / `get_delta_discount` / `get_delta_income`. COMPLETE no implica forecast con `DELETE`/`INSERT`, M19, weekly LD ni causalidad).
- **M13 Director IA** (respecto a su propio módulo: bitácora, entidades, chat, mejora continua como parte del producto).
- **M16 Duplicados** (consulta canónica de **posibles** pares vía `get_duplicate_folios` / `findDuplicatePairs`. COMPLETE significa integración de esa capacidad de análisis, no confirmación determinística de cada duplicado ni cancelación).

### 3. Dominios parciales (PARCIAL)

- M0 Auth (gates, no catálogo)
- M1 Health (readiness técnica `GET /health-director-ia` en header de DirectorIaShell; no `/health` `/health-db` `/health-proyectos`)
- M2 Folios (comentarios + slice `folio_status` estatus/etapa + slice `folio_history` eventos crudos + slice `folio_documents` metadata-only; no contenido PDF/S3, no faltantes, no cheque/póliza, no `kanban_flow` ni kanban HTTP)
- M4 Clasificación de apoyos (query JSON `mes_a` vs `mes_b` por planta y familia; no COMPARAR; no Excel/xlsx; no COMPLETE)
- M5 Taller por AT (query JSON de folios TALLER por token de `public.folios.unidad` y `YYYY-MM`; no `at_id`; no catálogo; no Excel/workbook; no duplicados; no COMPLETE)
- M6 GASTOS / INVERSIONES (query JSON de folios por planta y `YYYY-MM`; GASTOS ≠ INVERSIONES ≠ IGF; no Export/xlsx; no COMPLETE)
- M7 IGF (chat on-demand + slice de composición observada de 1 fila de `igf.compromiso_lines`; `*_kg` = $/kg; null ≠ 0; sin recálculo; sin overlay; sin deltas; sin causalidad; no COMPLETE)
- M8 ARR (chat on-demand / motor DICF)
- M11 DICF + comentarios cliente (+ slice expediente comercial factual on-demand; SELECT-only; sin `computeDicf`; sin causalidad; no COMPLETE)
- M12 Action Register (+ Mejora Continua; slice notas de revisión on-demand; `includeNotes` always-on sigue false; no COMPLETE)
- M17 WhatsApp (solo link de acceso)
- M18 Presupuestos semanales (query JSON del carro; no writes; no cheques; no WhatsApp; no COMPLETE)

### 4. Dominios indirectos (INDIRECTA)

- M20 Home KPI (comparte fuentes, no la página)
- Colisión lingüística: «cómo van los gastos» / margen / rentabilidad siguen el anexo IGF (M7). Eso **no** puntúa a M6; M6 es PARCIAL por el listado de folios.
- Colisión lingüística: «cómo va Taller» / acciones de AT-15 siguen Action Register (M12). Eso **no** puntúa a M5; M5 es PARCIAL por el detalle TALLER por unidad.

### 5. Dominios no integrados (NO INTEGRADA)

- M4 COMPARAR / Excel/xlsx (el query JSON ya está en PARCIAL M4; COMPLETE de M4 sigue fuera)
- M5 Excel / workbook / duplicados taller (el query JSON ya está en PARCIAL M5; COMPLETE de M5 sigue fuera)
- M6 Export/xlsx (el query JSON ya está en PARCIAL M6; COMPLETE de M6 sigue fuera)
- M7 UI / PATCH HG / meta Excel / versiones / overlay / recálculo (el slice de composición snapshot ya está en PARCIAL M7; COMPLETE de M7 sigue fuera)
- M10 Weekly discount LD  
- M14 Usuarios admin (como dominio)  
- M15 Documentos/medios  
- M11 attachments / Excel DICF / bitácora en el expediente / causalidad / writes (el slice de expediente factual ya está en PARCIAL M11; COMPLETE de M11 sigue fuera)
- M12 evidencias / CRUD / binarios (el slice de notas de revisión ya está en PARCIAL M12; COMPLETE de M12 sigue fuera)
- M18 writes / cheques / WhatsApp (el query JSON ya está en PARCIAL M18; COMPLETE de M18 sigue fuera)
- M19 Delta Ingreso AI test  
- Kanban HTTP / GET `/timeline` (excluido) / contenido PDF / S3 / documentos faltantes / cheque / póliza / `kanban_flow` (estatus/etapa, historial crudo y metadata documental ya están en PARCIAL M2; proyectos de `public.proyectos` ya están en COMPLETA M3)

### 6. Capacidades de lectura listas para reutilizar

| Capacidad | Respaldo |
|-----------|----------|
| RESUMIR Action Register / vencidas / responsables | `summarize*` en `director-ia-action-register.js` + `buildActionRegisterBoardPayload` |
| CONSULTAR notas de revisión Action Register (read-only) | `loadActionRegisterRevisionNotesForChat` → SELECT `arr.action_register_revision_notes` (`revision_id`; no ítem) |
| CONSULTAR/BUSCAR DICF | `summarizeDicfContext`, filtros chat |
| CONSULTAR expediente comercial factual (read-only, un cliente) | `loadCommercialDossierForChat` → SELECT `arr.dicf_cliente_mes` + comentarios con `cliente_key` + `arr.dicf_acciones` + historial por `accion_id` |
| CONSULTAR bitácora | `loadBitacoraForChat` |
| CONSULTAR comentarios | `loadClienteComentariosForDirectorIa`, `loadFolioComentariosForDirectorIa` |
| CONSULTAR estatus/etapa de folio (read-only) | `loadFolioStatusForChat` → `getFolioById` / `getFolioByNumero` / `listFoliosByPlanta` |
| CONSULTAR historial de folio (eventos crudos, read-only) | `loadFolioHistoryForChat` → resolver/autorizar → `listHistorialForFolio` (`public.folio_historial`) |
| CONSULTAR metadata documental de folio (read-only) | `loadFolioDocumentsMetadataForChat` → resolver/autorizar → `listDocumentsMetadataForFolio` → `projectDocument` (`public.folio_archivos`; sin `s3_key`) |
| RESOLVER entidad/alias | `resolveCommercialEntitiesForQuestion` |
| COMPARAR/CONSULTAR margen e IGF/ARR (on-demand) | `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo` |
| CONSULTAR composición IGF (snapshot de 1 fila; read-only; no causa; no tendencia) | `extractIgfComposition` → `formatIgfCompositionBlock` vía `get_igf_snapshot` / `loadIgfCommitSnapshot` (`igf.compromiso_lines`) |
| LISTAR estado comercial | `loadCommercialStateForChat` → `dicf.computeDicf` |
| RESUMIR Mejora Continua | `buildMejoraContinuaPayload` / `GET /api/director-ia/mejora-continua` |
| DETECTAR RIESGOS / CONSULTAR posibles duplicados de folios | `loadDuplicateFoliosForChat` → `findDuplicatePairs` |
| CONSULTAR KPIs de dashboard (folios) | `loadDashboardKpisForChat` → `queryDashboardKpis` |
| CONSULTAR proyectos por planta | `loadProyectosForChat` → `listarProyectosPorPlantaOEquivalentes` |
| COMPARAR Delta Venta / Descuento / Ingreso (periodos reales) | `loadDeltaVentaForChat` / `loadDeltaDescuentoForChat` / `loadDeltaIngresoForChat` |
| CONSULTAR GASTOS de folios (read-only, `YYYY-MM`) | `loadGastosInversionesForChat("GASTOS")` → SELECT + `expandCategoriaRows` |
| CONSULTAR INVERSIONES de folios (read-only, `YYYY-MM`) | `loadGastosInversionesForChat("INVERSIONES")` → SELECT + `expandCategoriaRows` |
| CONSULTAR Taller por AT (read-only, `YYYY-MM`, token `public.folios.unidad`) | `loadTallerAtForChat` → SELECT + `expandTallerRows` + `parseUnidadesList` |
| COMPARAR matriz de clasificación (`mes_a` vs `mes_b`, read-only) | `loadClasificacionApoyosForChat` → SELECT + `buildClasificacionMatrix` |
| CONSULTAR presupuesto semanal / carro (read-only) | `loadPresupuestoSemanalForChat` → SELECT `presupuestos_semanales` + `presupuesto_folios` |

### 7. Capacidades que requieren herramientas nuevas (aunque exista API/lib)

| Capacidad deseada | Existe en repo | Falta para Director IA |
|-------------------|----------------|------------------------|
| Etapa/estatus de folio / kanban HTTP | Slice `folio_status` ya integrado (SELECT-only). GET `/kanban` y GET `/folios/:id` siguen existiendo y **siguen excluidos** (autoavance) | Tablero HTTP, contenido PDF/S3, cheque/póliza, `kanban_flow`; no reutilizar handlers mutantes |
| Timeline / último movimiento | Slice `folio_history` ya integrado (SELECT-only de `public.folio_historial`). GET `/timeline` existe y **sigue excluido** (HTTP interno + `dedupeHistorialByStage`) | Transiciones inventadas, actor sistema, contenido/financial; no copiar dedupe |
| Metadatos documentos / póliza / cheque | Metadata de `folio_archivos` ya integrada (M2 SELECT-only, sin `s3_key`). Endpoints `/media` y póliza/cheque existen y **siguen excluidos** | Contenido PDF, S3, signed URLs, faltantes, póliza operativa, cheque |
| Duplicados (cancelar / `findSimilarTo` al crear / Excel Taller) | Sí (cancelar UI, `POST /check`, Excel M5) | Escritura y detectores ajenos al análisis M16 ya integrado |
| Excel/agregados Taller, GASTOS, INVERSIONES | Query JSON M6 ya integrado (SELECT + `expandCategoriaRows`). Query JSON M5 ya integrado (SELECT + `expandTallerRows`; token `public.folios.unidad`). Libs Excel Taller/GASTOS/INVERSIONES siguen existiendo | Export/xlsx M6; Excel/workbook/duplicados M5; no usar workbook como transporte |
| Clasificación COMPARAR / Excel | Query JSON M4 ya integrado (SELECT + `buildClasificacionMatrix`). POSTs COMPARAR y workbook siguen existiendo | COMPARAR writes (`insertFolio` / `UPDATE mes_cargo`); Excel/xlsx; no COMPLETE |
| Deltas UI (forecast con escritura / M19) | Sí (`delta-ingreso-forecast`, `/api/ai/delta-ingreso/test/*`) | La lectura de periodos reales ya está en COMPLETA M9; faltan forecast mutante y M19, a propósito fuera |
| Presupuesto semanal (writes / cheques / WhatsApp) | Query JSON M18 ya integrado (SELECT + `getPresupuestoResumen`). Writes y bot existen en `server.js` | Asignar/seleccionar; enviar a cheques; Twilio/WhatsApp; no COMPLETE |
| Action Register notas / evidencias / CRUD | Slice notas de revisión ya integrado (`loadActionRegisterRevisionNotesForChat`; `includeNotes` always-on sigue false) | Attachments/S3/PDF; CRUD ítems; no COMPLETE; no atribuir nota a ítem |
| DICF expediente / attachments / writes | Slice expediente factual ya integrado (`loadCommercialDossierForChat`; SELECT-only; sin `computeDicf`) | Attachments; Excel/UI; bitácora en el expediente; causalidad; CRUD acciones; no COMPLETE |
| IGF composición / UI / PATCH / recálculo | Slice composición snapshot ya integrado (`extractIgfComposition`; 1 fila; `*_kg` = $/kg; no se ejecuta `recalcularUtilYResultado`; no overlay) | UI IGF; PATCH HG; meta Excel; versiones UI; overlay de folios; deltas IGF; causalidad; no COMPLETE |
| Proyectos (crear/editar/eliminar) | Sí (`POST /api/proyectos`) | Escritura; la lectura M3 ya está integrada |
| KPIs dashboard (lectura) | Sí (integrado M3) | — |
| Weekly LD | Sí | Tool |
| Persistir/auditar chat | No | Nueva persistencia (fuera de «reutilizar») |
| Igualar `sources` GET vs chat | Parcial | Cambio de contrato context (no implementado aquí) |

### 8. Operaciones que requieren confirmación (B)

- Cualquier mutación de bitácora/entidad disparada desde el chat (hoy es UI explícita).
- Crear comentarios.
- Futuras mutaciones de Action Register / DICF desde IA.
- Exponer o descargar documentos con URL firmada.
- Cualquier avance de flujo de folio si algún día se expone.

### 9. Operaciones que Director IA no debería ejecutar (C)

- Aprobar / mover / cancelar / editar folios de forma autónoma.
- Subir póliza o borrar media.
- Modificar presupuestos o enviar a cheques sin marco humano.
- Cambiar permisos de usuario.
- Cargar ARR destructivo / COMPARAR que escribe folios.
- Disparar endpoints `/api/ai/delta-ingreso/test/*` o envíos WhatsApp masivos.
- Hablar en nombre de fuentes no integradas como si estuvieran conectadas.

### 10. Preguntas pendientes que el repositorio no permite contestar

1. ¿Qué flags (`ENABLE_DIRECTOR_IA`, `AI_ENABLED`, secretos) están activos en cada ambiente de producción?  
2. ¿El frontend siempre reenvía `history` al chat y con qué límite de tokens?  
3. ¿Qué consumidores FE leen `sources.igf|arr|commercial_state` esperando `true`?  
4. ¿Existe DDL de creación de `igf.compromiso_lines` / `igf.versions` fuera del repo?  
5. ¿Hay controles de red que mitiguen las rutas test sin `dashboardAuthMiddleware`?  
6. ¿Cuál es la definición operativa canónica de «presupuesto semanal» en los flujos WhatsApp?  
7. ¿Los tres detectores de duplicados están calibrados al mismo umbral en producción?  
8. ¿`acceso_consola_whatsapp_ar` se enforcea en todos los comandos Twilio o solo está catalogado?  
9. ¿Hay vistas/materializaciones ARR/IGF en la base real no versionadas en `sql/`?  
10. ¿Se debe unificar o aislar formalmente Director IA vs Delta Ingreso AI a nivel de producto?

---

## Apéndice — Índice rápido de evidencia de código

| Pieza | Ruta |
|-------|------|
| Documento base | `docs/ARQUITECTURA_DASHBOARD_FOLIOS.md` |
| Context | `lib/director-ia-context.js` |
| Chat | `lib/director-ia-chat.js` |
| Duplicados M16 | `lib/director-ia-duplicados.js`, `lib/folio-duplicados-load.js`, `lib/folio-duplicados.js` |
| M2 Folios / estatus-etapa | `lib/director-ia-m2-folio-status.js` |
| M2 Folios / historial | `lib/director-ia-m2-history.js` |
| M2 Folios / metadata documental | `lib/director-ia-m2-documents-metadata.js` |
| M3 Plantas / KPIs / Proyectos | `lib/director-ia-m3-plantas-kpis-proyectos.js` |
| M4 Clasificación (query JSON) | `lib/director-ia-m4-clasificacion-query.js` |
| M5 Taller por AT (query JSON) | `lib/director-ia-m5-taller-at.js` |
| M6 GASTOS / INVERSIONES (query JSON) | `lib/director-ia-m6-gastos-inversiones.js` |
| M9 Delta Venta / Descuento / Ingreso | `lib/director-ia-m9-deltas.js` |
| AR summarizers | `lib/director-ia-action-register.js` |
| IGF/ARR annex | `lib/director-ia-igf-arr.js` |
| Commercial state | `lib/director-ia-commercial-state.js` |
| Bitácora | `lib/director-ia-bitacora.js` |
| Mejora continua | `lib/director-ia-mejora-continua.js` |
| Comentarios | `lib/cliente-comentarios.js` |
| Entidades | `lib/comercial-entidad.js` |
| Permisos | `lib/usuario-permisos.js` |
| Flag | `lib/director-ia.js` |
| FE módulo | `frontend-dashboard/modules/director-ia/` |

---

*Fin del mapa de capacidades. No se modificó código de aplicación. No se propuso implementación.*
 