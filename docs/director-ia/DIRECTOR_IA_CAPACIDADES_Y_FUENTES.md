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
| Fuentes solo en chat | Anexo IGF/ARR (`loadIgfArrAnnexForChat`), estado comercial (`loadCommercialStateForChat`), Mejora Continua (`loadMejoraContinuaForChat`) |
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
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna. |
| **Información que no consulta** | `/health`, `/health-db`, `/health-proyectos`. |
| **Archivos actuales relacionados** | `server.js`, `frontend-dashboard/app/health/route.ts` |
| **Endpoints actuales relacionados** | `GET /health`, `GET /health-db`, `GET /health-proyectos` |
| **Tablas o vistas relacionadas** | Ninguna propia. |
| **Funciones existentes reutilizables** | Handlers health en `server.js` |
| **Capacidades de lectura posibles** | CONSULTAR estado servicio — requeriría herramienta nueva que llame health (hoy no existe en Director IA). |
| **Capacidades de escritura posibles** | N/A |
| **Permisos aplicables** | Sin auth en health. |
| **Nivel de riesgo** | BAJO |
| **Dependencias** | Ninguna de negocio. |
| **Observaciones verificadas** | Auditoría §M1: no referenciado por Director IA. |

### M2 — Kanban / Folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M2 |
| **Módulo** | Kanban / Folios |
| **Propósito empresarial** | Flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias). |
| **Cobertura actual de Director IA** | PARCIAL (solo comentarios de folio); el kanban y el CRUD de folios están NO INTEGRADOS. |
| **Información exacta que sí consulta** | Últimos comentarios de folio por planta: `loadFolioComentariosForDirectorIa` (límite 80) → `public.comentarios` ⋈ `public.folios`. |
| **Información que no consulta** | Kanban (`/api/dashboard/kanban`), estatus/etapa visual, timeline, medios, finanzas de folio, aprobaciones, mes_cargo, cheque, póliza, prioridad, cancelaciones. |
| **Archivos actuales relacionados** | `lib/cliente-comentarios.js`, `lib/director-ia-context.js`, `lib/director-ia-chat.js` (`buildComentariosAnnexText`); dominio folio: `server.js` rutas `/api/folios*` |
| **Endpoints actuales relacionados** | Director IA: context/chat. Folios (no usados por IA): `/api/dashboard/kanban`, `/api/folios*` |
| **Tablas o vistas relacionadas** | `public.folios`, `public.folio_historial`, `public.folio_archivos`, `public.comentarios` |
| **Funciones existentes reutilizables** | `loadFolioComentariosForDirectorIa`; para ampliar lectura: handlers kanban/folios en `server.js` (sin wrapper Director IA hoy). |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR comentarios; CONSULTAR etapa/historial/docs requeriría reutilizar `/api/folios/:id`, `/timeline`, `/media` vía herramienta nueva. |
| **Capacidades de escritura posibles** | CREAR/EDITAR/APROBAR/CANCELAR folio existen en API folios; **no** conectadas a Director IA. |
| **Permisos aplicables** | `acceso_crear_folios`, `acceso_aprobar_folios`, `acceso_editar_folio`, `acceso_mover_folio_arrastre`, `acceso_avanzar_etapa`, `acceso_cancelar_folio_dashboard`, `acceso_subir_poliza`, `acceso_asignar_mes_cargo`, `acceso_marcar_urgente`, `acceso_ver_imprimir_folios`, etc. |
| **Nivel de riesgo** | Lectura comentarios: MEDIO. Mutaciones folio: ALTO. |
| **Dependencias** | Plantas, presupuestos (carro), proyectos opcional. |
| **Observaciones verificadas** | `sources.folio_comentarios` puede ser true; no hay fuente `folios` ni `kanban` en `EMPTY_SOURCES`. |

### M3 — Plantas / KPIs / Proyectos

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M3 |
| **Módulo** | Plantas / KPIs / Proyectos |
| **Propósito empresarial** | Catálogo de plantas, KPIs de dashboard, proyectos por planta. |
| **Cobertura actual de Director IA** | PARCIAL (planta como filtro); KPIs de `/api/dashboard/kpis` y proyectos: NO INTEGRADA. |
| **Información exacta que sí consulta** | `planta_id` obligatorio; nombre/clave planta en anexos IGF/ARR y commercial_state (`SELECT nombre, clave FROM public.plantas`). |
| **Información que no consulta** | `GET /api/dashboard/kpis`, listado proyectos, crear proyecto, KPIs agregados del kanban header. |
| **Archivos actuales relacionados** | `public.plantas` vía varios libs; UI `CrearProyectoModal`, `KPIHeader` |
| **Endpoints actuales relacionados** | `/api/dashboard/plantas`, `/kpis`, `/proyectos`, `POST /api/proyectos` |
| **Tablas o vistas relacionadas** | `public.plantas`, `public.proyectos`, `proyecto_*` |
| **Funciones existentes reutilizables** | Queries de planta en `director-ia-igf-arr.js` / `director-ia-commercial-state.js`; board Action Register ya filtra por planta. |
| **Capacidades de lectura posibles** | CONSULTAR nombre planta; CONSULTAR proyectos vía endpoint existente (no cableado). |
| **Capacidades de escritura posibles** | CREAR proyecto (`POST /api/proyectos`) — no en Director IA. |
| **Permisos aplicables** | Acceso por planta en token; KPIs con bloqueos GA/GV. |
| **Nivel de riesgo** | Lectura planta: BAJO. KPIs financieros: MEDIO. |
| **Dependencias** | Base de casi todos los módulos. |
| **Observaciones verificadas** | Sin `planta_id` el context responde `action_register.ok: false`. |

### M4 — Clasificación de apoyos + COMPARAR

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M4 |
| **Módulo** | Clasificación de apoyos + COMPARAR |
| **Propósito empresarial** | Comparativo mensual por planta/categoría; reconciliación Excel. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna. |
| **Información que no consulta** | Matrices clasificación, Excel, inspección/comparar/agregar/rechazar. |
| **Archivos actuales relacionados** | `lib/clasificacion-apoyos-excel.js`, `lib/clasificacion-comparar.js` |
| **Endpoints actuales relacionados** | `/api/dashboard/clasificacion-apoyos*`, `/clasificacion-comparar*` |
| **Tablas o vistas relacionadas** | Lectura/escritura `public.folios` (sin tablas `clasificacion_*`). |
| **Funciones existentes reutilizables** | Generadores Excel/comparar en libs citadas — reutilizables solo si se envuelve herramienta interna nueva. |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR (vía libs existentes; hoy no cableadas). |
| **Capacidades de escritura posibles** | Actualizar/agregar folios vía comparar — ALTO; no en Director IA. |
| **Permisos aplicables** | Auth dashboard + bloqueo GV; `priv_clave` para privados. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (actualizar). |
| **Dependencias** | Folios, plantas. |
| **Observaciones verificadas** | Auditoría §M4 §7: No lo usa. |

### M5 — Taller por AT

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M5 |
| **Módulo** | Taller por AT |
| **Propósito empresarial** | Excel de gasto taller por unidad AT, con hoja de duplicados. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna del Excel Taller. (Mejora Continua puede tener tema/área «Taller» en Action Register — dominio distinto.) |
| **Información que no consulta** | `GET /api/dashboard/taller-at-excel`, homologación AT, duplicados de taller. |
| **Archivos actuales relacionados** | `lib/taller-at-excel.js`, `lib/unidad-taller.js` |
| **Endpoints actuales relacionados** | `/api/dashboard/taller-at-excel` |
| **Tablas o vistas relacionadas** | `public.folios`, `public.plantas` |
| **Funciones existentes reutilizables** | `buildTallerAtWorkbook` / parsers en `unidad-taller.js` |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR/DETECTAR RIESGOS (duplicados taller) — no cableado. |
| **Capacidades de escritura posibles** | DESCARGAR DOCUMENTO (xlsx) en API; no vía chat. |
| **Permisos aplicables** | Auth + `priv_clave`. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | Folios. |
| **Observaciones verificadas** | Tres detectores de duplicados distintos (auditoría); este no es el de Director IA. |

### M6 — GASTOS / INVERSIONES (rango Excel)

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M6 |
| **Módulo** | GASTOS / INVERSIONES Excel |
| **Propósito empresarial** | Export por categoría y ventana de meses. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna de este Excel. Nota: la palabra «gasto(s)» en chat puede activar anexo IGF/ARR (`PLANT_FINANCIAL_KPI_RE` en `director-ia-igf-arr.js`) — eso es **INDIRECTA** respecto a este módulo, no consulta `categoria-rango-excel`. |
| **Información que no consulta** | Listados GASTOS/INVERSIONES de folios del Excel. |
| **Archivos actuales relacionados** | `lib/categoria-rango-excel.js` |
| **Endpoints actuales relacionados** | `/api/dashboard/categoria-rango-excel` |
| **Tablas o vistas relacionadas** | `public.folios` |
| **Funciones existentes reutilizables** | `buildCategoriaRangoWorkbook` (nombre según lib) |
| **Capacidades de lectura posibles** | CONSULTAR/RESUMIR/DESCARGAR DOCUMENTO — no cableadas a IA. |
| **Capacidades de escritura posibles** | N/A en este módulo. |
| **Permisos aplicables** | Auth + `priv_clave`. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | Folios. |
| **Observaciones verificadas** | Riesgo de confusión: «gastos» en chat ≠ Excel GASTOS. |

### M7 — IGF Forecast

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M7 |
| **Módulo** | IGF Forecast |
| **Propósito empresarial** | Forecast financiero por planta/empresa, compromiso, HG, pronóstico. |
| **Cobertura actual de Director IA** | PARCIAL (solo chat on-demand; `sources.igf` siempre false en GET context) |
| **Información exacta que sí consulta** | Anexo IGF: `loadIgfCommitSnapshot` sobre `igf.versions` / `igf.compromiso_lines`; margen vía `getMargenKgPorPeriodo` (inyectado); activado por `shouldAttachIgfArrAnnex` / `isPlantFinancialKpiQuestion`. |
| **Información que no consulta** | UI completa IGF, PATCH HG, meta Excel, metahg completo, `igf-folios-detalle`, presupuesto-detalle UI, versiones UI. |
| **Archivos actuales relacionados** | `lib/director-ia-igf-arr.js`, `igf-handler.js`, `lib/dashboard-arr-forecast.js` |
| **Endpoints actuales relacionados** | Chat: `POST /api/director-ia/chat`. Dashboard (no usados por IA): `/api/dashboard/igf-*` |
| **Tablas o vistas relacionadas** | `igf.versions`, `igf.compromiso_lines`, schemas `igf_meta` / `igf_metahg` (UI; no confirmado en anexo chat completo) |
| **Funciones existentes reutilizables** | `loadIgfArrAnnexForChat`, `loadIgfCommitSnapshot`, `buildIgfForecastPayload` (handler/server) |
| **Capacidades de lectura posibles** | CONSULTAR/COMPARAR/RESUMIR/EXPLICAR KPIs bajo demanda. |
| **Capacidades de escritura posibles** | PATCH IGF existe en dashboard; no en Director IA. |
| **Permisos aplicables** | `acceso_igf_forecast_kpis`; bloqueos GA/GV en handlers financieros. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | ARR, folios KPI, plantas. |
| **Observaciones verificadas** | Diferencia GET context vs chat es hallazgo crítico (Parte 8). |

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
| **Cobertura actual de Director IA** | NO INTEGRADA (endpoints `delta-*`); respuestas afines pueden ser **INDIRECTAS** vía commercial_state / anexo IGF-ARR. |
| **Información exacta que sí consulta** | No llama `/api/dashboard/delta-venta-*`, `delta-descuento-*`, `delta-ingreso-*`. |
| **Información que no consulta** | Periodos y matrices de los modales Delta*. |
| **Archivos actuales relacionados** | `lib/delta-ingreso-forecast.js`; UI `Delta*Modal.tsx` |
| **Endpoints actuales relacionados** | `/api/dashboard/delta-*` |
| **Tablas o vistas relacionadas** | ARR + `arr.delta_ingreso_forecast_cliente` |
| **Funciones existentes reutilizables** | Handlers delta en `server.js` / `delta-ingreso-forecast.js`; commercial_state y IGF annex como aproximación parcial. |
| **Capacidades de lectura posibles** | COMPARAR/CONSULTAR — no cableadas a endpoints delta. |
| **Capacidades de escritura posibles** | N/A típico (lectura). |
| **Permisos aplicables** | Auth + bloqueos financieros. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | ARR. |
| **Observaciones verificadas** | Auditoría §M9 §7: «No lo usa»; chat usa `dicf.js` / commercial_state, no endpoints `delta-*`. |

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
| **Cobertura actual de Director IA** | PARCIAL |
| **Información exacta que sí consulta** | `summarizeDicfContext` (máx. 40 detalles) en context; chat enfocado DICF; `loadClienteComentariosForDirectorIa` (80); commercial_state vía `dicf.computeDicf` on-demand. |
| **Información que no consulta** | Attachments DICF binarios, UI completa dicf-accion, todos los clientes sin límite, Excel DICF UI. |
| **Archivos actuales relacionados** | `lib/dicf.js`, `lib/dicf-acciones.js`, `lib/cliente-comentarios.js`, `lib/director-ia-action-register.js`, `lib/director-ia-commercial-state.js`, `lib/director-ia-chat.js` |
| **Endpoints actuales relacionados** | Director IA context/chat; dashboard `/api/dashboard/dicf-*`, `/api/dicf-*` |
| **Tablas o vistas relacionadas** | `arr.dicf_config`, `arr.dicf_cliente_mes`, `arr.dicf_acciones`, `arr.dicf_accion_historial`, `arr.dicf_acciones_attachments`, `arr.cliente_comentarios` |
| **Funciones existentes reutilizables** | `summarizeDicfContext`, `dicf.computeDicf`, `loadCommercialStateForChat`, `buildFocusedDicfContext`, `buildComentariosAnnexText` |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/COMPARAR/EXPLICAR/DETECTAR RIESGOS (acciones abiertas). |
| **Capacidades de escritura posibles** | CRUD DICF acciones en dashboard API — no vía chat Director IA. Comentario cliente: `createClienteComentario` existe en lib; no confirmado como tool de chat. |
| **Permisos aplicables** | `acceso_acciones_dicf`; `dashboardBlockDicfAccionesRole`; GA restringido en KPIs. |
| **Nivel de riesgo** | MEDIO |
| **Dependencias** | ARR, plantas. |
| **Observaciones verificadas** | `sources.dicf` true solo si hay filas; `sources.commercial_state` nunca true en GET. |

### M12 — Action Register

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M12 |
| **Módulo** | Action Register |
| **Propósito empresarial** | Tablero de temas, ítems, revisiones, notas y evidencias por planta. |
| **Cobertura actual de Director IA** | PARCIAL (alta: fuente primaria, pero resumen con límites) |
| **Información exacta que sí consulta** | Board vía `buildActionRegisterBoardPayload` → summarizers: summary, responsables (10), temas, top_overdue (10), invalid_overdue, tema_details (5 temas × 10 acciones), executive_summary; Mejora Continua (`buildMejoraContinuaPayload`). |
| **Información que no consulta** | Notas de revisión (`includeNotes: false` en context), attachments/binarios, export Excel/PDF evidencias como tool de chat, CRUD completo de ítems. |
| **Archivos actuales relacionados** | `lib/action-register-board.js`, `lib/director-ia-action-register.js`, `lib/director-ia-mejora-continua.js`, `lib/director-ia-chat.js` |
| **Endpoints actuales relacionados** | `GET /api/director-ia/context`, `GET /api/director-ia/mejora-continua`, `POST /api/director-ia/chat`; CRUD `/api/action-register/*` (UI Acciones, no chat tools) |
| **Tablas o vistas relacionadas** | `arr.action_register_*` |
| **Funciones existentes reutilizables** | `summarizeTopOverdueActions`, `buildExecutiveSummary`, `buildMejoraContinuaPayload`, `buildFocusedNarrativeContext` |
| **Capacidades de lectura posibles** | CONSULTAR/BUSCAR/RESUMIR/EXPLICAR/DETECTAR RIESGOS/RECOMENDAR (narrativo). |
| **Capacidades de escritura posibles** | CRUD Action Register en `/api/action-register/*` — no expuesto como tool de chat. |
| **Permisos aplicables** | `acceso_acciones_dicf`; acceso planta. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (mutar ítems/evidencias). |
| **Dependencias** | Plantas, usuarios responsables, DICF inyectado en board. |
| **Observaciones verificadas** | `sources.action_register = true` tras carga exitosa. |

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
| **Información exacta que sí consulta** | Ninguna (no lista media ni genera PDF). |
| **Información que no consulta** | `/api/folios/:id/documento*`, `/media`, póliza, etc. |
| **Archivos actuales relacionados** | Handlers en `server.js`; `ImprimirGastosModal.tsx` |
| **Endpoints actuales relacionados** | Documentales y media bajo `/api/folios/:id/...` |
| **Tablas o vistas relacionadas** | `public.folio_archivos`, campos en `public.folios` |
| **Funciones existentes reutilizables** | Endpoints documento/media existentes. |
| **Capacidades de lectura posibles** | CONSULTAR existencia / DESCARGAR DOCUMENTO — requeriría herramienta nueva. |
| **Capacidades de escritura posibles** | Subir póliza/media — ALTO. |
| **Permisos aplicables** | `acceso_ver_imprimir_folios`, `acceso_subir_poliza` |
| **Nivel de riesgo** | MEDIO (lectura docs); ALTO (subir). |
| **Dependencias** | Folios, S3. |
| **Observaciones verificadas** | Auditoría §M15 §7. |

### M16 — Análisis duplicados de folios

| Campo | Contenido verificado |
|-------|----------------------|
| **ID** | M16 |
| **Módulo** | Análisis duplicados |
| **Propósito empresarial** | Detectar parejas de folios similares y opcionalmente cancelar. |
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna. |
| **Información que no consulta** | `/api/folios/duplicados/check`, `/analisis`. |
| **Archivos actuales relacionados** | `lib/folio-duplicados.js` |
| **Endpoints actuales relacionados** | `/api/folios/duplicados/*` |
| **Tablas o vistas relacionadas** | `public.folios` |
| **Funciones existentes reutilizables** | `findDuplicatePairs`, `findSimilarTo` |
| **Capacidades de lectura posibles** | DETECTAR RIESGOS/CONSULTAR — reutilizable con herramienta nueva. |
| **Capacidades de escritura posibles** | CANCELAR folio desde UI análisis — ALTO. |
| **Permisos aplicables** | Auth + bloqueo GV folios. |
| **Nivel de riesgo** | MEDIO (lectura); ALTO (cancelar). |
| **Dependencias** | Folios. |
| **Observaciones verificadas** | Independiente de duplicados Excel Taller. |

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
| **Cobertura actual de Director IA** | NO INTEGRADA |
| **Información exacta que sí consulta** | Ninguna de tablas `presupuesto_*`. |
| **Información que no consulta** | Estado semanal, solicitudes, archivos presupuesto. |
| **Archivos actuales relacionados** | DDL/lógica en `server.js`; WhatsApp carrito |
| **Endpoints actuales relacionados** | Sin grupo REST `/api/presupuesto*` inventariado como API dashboard dedicada; operación mayormente bot. |
| **Tablas o vistas relacionadas** | `public.presupuestos_semanales`, `presupuesto_folios`, `presupuesto_catalogo`, `presupuesto_asignacion_detalle`, `presupuesto_linea_detalle`, `presupuesto_counters`, `presupuesto_solicitudes`, `presupuesto_archivos`, `presupuesto_historial` |
| **Funciones existentes reutilizables** | Lógica embebida en `server.js` (sin lib Director IA). |
| **Capacidades de lectura posibles** | CONSULTAR — requeriría herramienta nueva sobre tablas existentes. |
| **Capacidades de escritura posibles** | Modificar presupuesto / enviar a cheques — ALTO. |
| **Permisos aplicables** | Roles GG / avance etapa. |
| **Nivel de riesgo** | ALTO |
| **Dependencias** | Folios, WhatsApp. |
| **Observaciones verificadas** | Modelo de datos amplio, UI app limitada (auditoría). |

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

- **Dominio:** Acciones / temas / responsables / vencidas (M12)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-context.js`, `lib/director-ia-action-register.js`, `lib/action-register-board.js`
- **Función de acceso:** `buildActionRegisterBoardPayload` → `summarizeActionRegisterBoard`, `summarizeTopOverdueActions`, `summarizeActionRegisterResponsables`, `summarizeTemaDetails`, `buildExecutiveSummary`
- **Endpoint relacionado:** `GET /api/director-ia/context`; board UI `/api/action-register/*`
- **Tablas consultadas:** `arr.action_register_revisions`, `items`, `entries`, `attachments` (board); notas excluidas en context (`includeNotes: false`)
- **Filtros disponibles:** `planta_id`
- **Alcance por planta:** Sí (obligatorio)
- **Alcance por periodo:** Implícito vía fechas de ítems/overdue; no es selector libre de meses en context
- **Límites de filas:** responsables 10; top_overdue 10; findings 5; tema_details 5×10; narrativa chat máx. 10 acciones (`MAX_ACTIONS_FOR_NARRATIVE`)
- **Permisos:** JWT + acceso planta; `acceso_acciones_dicf`
- **Información sensible:** Responsables, títulos de acción, estatus
- **Estado de actualización:** En cada GET context / chat que reconstruye payload
- **Posibles errores:** `planta_id requerido`, `Sin acceso a esta planta`, error al cargar board
- **Evidencia de integración actual:** `sources.action_register = true` tras carga OK
- **Información que no puede concluirse con esta fuente:** Estado de kanban/folios, IGF completo, attachments binarios, notas de revisión

### Fuente: DICF

- **Dominio:** Acciones e historial DICF por cliente (M11)
- **Cobertura actual:** PARCIAL
- **Archivo de acceso:** `lib/director-ia-action-register.js` (`summarizeDicfContext`), `lib/director-ia-chat.js` (contextos enfocados)
- **Función de acceso:** `summarizeDicfContext`; filtros chat `filterDicfDetailsByQuestion`, `buildFocusedDicfContext`
- **Endpoint relacionado:** `GET /api/director-ia/context`; dashboard `/api/dashboard/dicf-*`
- **Tablas consultadas:** `arr.dicf_acciones` (+ historial en detalles según query del summarizer)
- **Filtros disponibles:** planta; chat: tokens comerciales / nombre cliente; ventana 3 meses en chat mensual
- **Alcance por planta:** Sí (+ equivalentes en commercial_state)
- **Alcance por periodo:** Ventana `BITACORA_CHAT_MONTH_WINDOW = 3` en modos mensuales de chat
- **Límites de filas:** `DEFAULT_DICF_DETAILS_LIMIT = 40`
- **Permisos:** JWT; bloqueos DICF role; GA sin KPIs financieros
- **Información sensible:** Clientes, compromisos, resultados de cierre
- **Estado de actualización:** Por request
- **Posibles errores:** Sin filas → `sources.dicf` false aunque AR cargue
- **Evidencia de integración actual:** `sources.dicf` si `dicf_details.length > 0`
- **Información que no puede concluirse con esta fuente:** Listas «dejaron/aumentaron» completas sin commercial_state; attachments

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
- **Archivo de acceso:** `lib/cliente-comentarios.js`
- **Función de acceso:** `loadClienteComentariosForDirectorIa`, `buildComentariosAnnexText`
- **Endpoint relacionado:** Context/chat; dashboard cliente-comentarios
- **Tablas consultadas:** `arr.cliente_comentarios`
- **Filtros disponibles:** `planta_id`
- **Alcance por planta:** Sí
- **Alcance por periodo:** Orden por fecha desc; sin selector de meses en loader IA
- **Límites de filas:** 80
- **Permisos:** JWT + planta
- **Información sensible:** Comentarios comerciales
- **Estado de actualización:** Por request
- **Posibles errores:** Fallos de query logueados
- **Evidencia de integración actual:** `sources.cliente_comentarios`
- **Información que no puede concluirse con esta fuente:** Historial DICF completo; ARR toneladas

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
- **Cobertura actual:** PARCIAL (chat on-demand; `sources.igf` siempre false en GET)
- **Archivo de acceso:** `lib/director-ia-igf-arr.js`
- **Función de acceso:** `loadIgfCommitSnapshot`, `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo` (inyectado desde server)
- **Endpoint relacionado:** `POST /api/director-ia/chat`
- **Tablas consultadas:** `igf.versions`, `igf.compromiso_lines` (y margen según implementación inyectada)
- **Filtros disponibles:** planta, year/month
- **Alcance por planta:** Sí
- **Alcance por periodo:** Mes de pregunta / actual
- **Límites de filas:** Snapshot de versión más reciente (`ORDER BY version_number DESC LIMIT 1`)
- **Permisos:** `acceso_igf_forecast_kpis` en UI; gates GA/GV en paths financieros
- **Información sensible:** Compromiso, margen, utilidad
- **Estado de actualización:** Según versiones IGF cargadas
- **Evidencia de integración actual:** Regex IGF/margen/rentabilidad en `director-ia-igf-arr.js`
- **Información que no puede concluirse con esta fuente:** Meta HG completa UI, folios detalle IGF, PATCH

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
- **Información que no puede concluirse con esta fuente:** Endpoints Delta UI; weekly LD

### Fuente: Folios

- **Dominio:** Entidad operativa folio (M2)
- **Cobertura actual:** NO INTEGRADA (salvo comentarios → fuente aparte)
- **Archivo de acceso:** Dominio en `server.js` `/api/folios*`
- **Función de acceso:** No hay loader Director IA de folio por id/estatus
- **Endpoint relacionado:** `/api/folios/:id`, kanban, etc. (no usados por IA)
- **Tablas consultadas:** `public.folios` (no por Director IA directamente)
- **Filtros disponibles:** En API folios (planta, mes, estatus…) — no en IA
- **Alcance por planta / periodo:** N/A para IA
- **Límites de filas:** N/A
- **Permisos:** Catálogo `acceso_*_folios*`
- **Información sensible:** Importes, proveedores, estatus
- **Estado de actualización:** N/A para IA
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Etapa, cheque, póliza, duplicados, documentos

### Fuente: Historial de folios

- **Dominio:** Timeline / `folio_historial` (M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers timeline en `server.js`
- **Función de acceso:** Endpoint `GET /api/folios/:id/timeline` (no cableado a IA)
- **Endpoint relacionado:** `/api/folios/:id/timeline`
- **Tablas consultadas:** `public.folio_historial`
- **Filtros / alcances / límites:** Según handler folio — no en IA
- **Permisos:** Auth folios
- **Información sensible:** Quién movió qué y cuándo
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Último movimiento fiable vía Director IA hoy

### Fuente: Kanban

- **Dominio:** Tablero por etapa visual (M2)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `server.js` `GET /api/dashboard/kanban`
- **Función de acceso:** Handler kanban + `estatusToEtapaVisual` (server)
- **Endpoint relacionado:** `/api/dashboard/kanban`
- **Tablas consultadas:** `public.folios` (+ joins)
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** «En qué etapa está un folio» de forma consistente vía IA

### Fuente: Documentos y medios

- **Dominio:** PDF/media (M15)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers documento/media en `server.js`
- **Función de acceso:** Endpoints documento/media (no IA)
- **Endpoint relacionado:** `/api/folios/:id/documento*`, `/media*`
- **Tablas consultadas:** `public.folio_archivos`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Documentos faltantes, URLs firmadas

### Fuente: Proyectos

- **Dominio:** Proyectos por planta (M3)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers proyectos en `server.js`
- **Función de acceso:** `GET /api/dashboard/proyectos`, `POST /api/proyectos`
- **Endpoint relacionado:** citados
- **Tablas consultadas:** `public.proyectos`, `proyecto_*`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Retrasos de proyecto

### Fuente: Presupuestos semanales

- **Dominio:** Presupuesto / carro (M18)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Lógica en `server.js` + tablas `presupuesto_*`
- **Función de acceso:** No hay función Director IA
- **Endpoint relacionado:** Sin API REST dashboard dedicada inventariada; WhatsApp carrito
- **Tablas consultadas:** `public.presupuesto_*` (listadas en auditoría)
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Cómo va el presupuesto semanal

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
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `lib/clasificacion-apoyos-excel.js`, `lib/clasificacion-comparar.js`
- **Función de acceso:** Handlers `/api/dashboard/clasificacion-*`
- **Endpoint relacionado:** citados
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Matrices mensuales de clasificación

### Fuente: Taller por AT

- **Dominio:** M5
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `lib/taller-at-excel.js`, `lib/unidad-taller.js`
- **Función de acceso:** Handler `taller-at-excel`
- **Endpoint relacionado:** `GET /api/dashboard/taller-at-excel`
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Gasto por AT / duplicados taller

### Fuente: Gastos

- **Dominio:** Categoría GASTOS en Excel rango (M6) y/o folios categoría GASTOS
- **Cobertura actual:** NO INTEGRADA (módulo Excel); posible confusión INDIRECTA con KPI «gasto» en anexo IGF
- **Archivo de acceso:** `lib/categoria-rango-excel.js`
- **Función de acceso:** Handler `categoria-rango-excel?categoria=GASTOS`
- **Endpoint relacionado:** citado
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** No integrada al Excel; regex «gasto(s)» puede adjuntar IGF/ARR
- **Información que no puede concluirse con esta fuente:** Listado de folios GASTOS del Excel vía Director IA

### Fuente: Inversiones

- **Dominio:** Categoría INVERSIONES (M6)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `lib/categoria-rango-excel.js`
- **Función de acceso:** Handler `categoria=INVERSIONES`
- **Endpoint relacionado:** `GET /api/dashboard/categoria-rango-excel`
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Inversiones pendientes

### Fuente: Delta Venta

- **Dominio:** M9
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers `delta-venta-*` en `server.js`
- **Función de acceso:** Endpoints delta-venta (no IA)
- **Endpoint relacionado:** `/api/dashboard/delta-venta-periodos`, `delta-venta-datos`
- **Tablas consultadas:** ARR
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Comparativo modal Delta Venta exacto

### Fuente: Delta Descuento

- **Dominio:** M9
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** Handlers `delta-descuento-*`
- **Función de acceso:** Endpoints citados
- **Endpoint relacionado:** `/api/dashboard/delta-descuento-*`
- **Tablas consultadas:** ARR
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Comparativo modal Delta Descuento

### Fuente: Delta Ingreso

- **Dominio:** M9 (+ forecast)
- **Cobertura actual:** NO INTEGRADA a endpoints; aproximación PARCIAL/INDIRECTA vía commercial_state / IGF-ARR si la pregunta activa esos regex
- **Archivo de acceso:** `lib/delta-ingreso-forecast.js`; commercial_state / igf-arr
- **Función de acceso:** Endpoints `delta-ingreso-*` (no IA); `loadCommercialStateForChat` / anexo IGF-ARR
- **Endpoint relacionado:** `/api/dashboard/delta-ingreso-*`
- **Tablas consultadas:** ARR, `arr.delta_ingreso_forecast_cliente`
- **Evidencia de integración actual:** Endpoints no cableados; señales «delta ingreso» en `ARR_SIGNAL_RE` / `DELTA_CLIENTES_SIGNAL_RE`
- **Información que no puede concluirse con esta fuente:** Paridad exacta con el modal Delta Ingreso

### Fuente: Duplicados

- **Dominio:** M16 (+ hoja Taller M5)
- **Cobertura actual:** NO INTEGRADA
- **Archivo de acceso:** `lib/folio-duplicados.js`; taller Excel duplicados
- **Función de acceso:** `findDuplicatePairs`, `findSimilarTo`
- **Endpoint relacionado:** `/api/folios/duplicados/*`
- **Tablas consultadas:** `public.folios`
- **Evidencia de integración actual:** No integrada
- **Información que no puede concluirse con esta fuente:** Existencia de duplicados vía chat

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
| 1 | ¿Cómo va una planta? | Parcialmente | PARCIAL | AR + (opcional) IGF/ARR/MC según wording | `buildDirectorIaContextPayload`; `buildPlantSummaryBlock`; `loadIgfArrAnnexForChat` si regex financiero | KPIs kanban, presupuestos, proyectos, Excel gastos | Alto si se interpreta como KPI financiero sin activar anexo IGF/ARR |
| 2 | ¿Qué acciones están vencidas? | Sí (limitado) | PARCIAL | Action Register | `summarizeTopOverdueActions` / context | Acciones fuera del top 10; notas excluidas | Medio (omisión por límite) |
| 3 | ¿Quién es responsable de una acción? | Sí (limitado) | PARCIAL | Action Register | `summarizeActionRegisterResponsables`, narrativa chat | Responsables fuera del top 10 | Medio |
| 4 | ¿Por qué cayó el ingreso? | Parcialmente | PARCIAL / INDIRECTA | commercial_state + DICF + bitácora + IGF/ARR | `loadCommercialStateForChat`, `summarizeDicfContext`, anexo IGF/ARR | Modal Delta Ingreso exacto; causalidad no estructurada | Alto (hipótesis narrativa) |
| 5 | ¿La caída proviene de venta o descuento? | Parcialmente | PARCIAL | ARR/IGF annex + commercial_state | `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo`, `dicf.computeDicf` | Endpoints `delta-venta` / `delta-descuento` no cableados | Medio-Alto |
| 6 | ¿Cómo va ARR contra la meta? | Parcialmente | PARCIAL | ARR annex | `loadArrProyForPlant` | Meta/UI completa ARR; depende de wording regex | Medio |
| 7 | ¿Cómo va IGF contra el compromiso? | Parcialmente | PARCIAL | IGF annex | `loadIgfCommitSnapshot` | Versiones/HG UI; `sources.igf` no en GET | Medio |
| 8 | ¿Qué clientes explican la desviación? | Parcialmente | PARCIAL | commercial_state / top clientes IGF-ARR / DICF | `loadCommercialStateForChat` (20 clientes), `loadTopClientesDescBrief` (8) | Universo completo de clientes | Medio (top-N) |
| 9 | ¿En qué etapa está un folio? | No | NO INTEGRADA | Kanban/Folios | `/api/dashboard/kanban`, `GET /api/folios/:id` | Toda la fuente | Alto si inventa desde comentarios |
| 10 | ¿Por qué está detenido un folio? | No de forma fiable | INDIRECTA máx. | Comentarios folio | `loadFolioComentariosForDirectorIa` | Estatus, timeline, permisos de avance | Alto |
| 11 | ¿Cuál fue el último movimiento del folio? | No | NO INTEGRADA | Historial | `GET /api/folios/:id/timeline` | Toda la fuente | Alto |
| 12 | ¿Qué documentos le faltan? | No | NO INTEGRADA | Documentos/medios | `/media`, documento-* | Toda la fuente | Alto |
| 13 | ¿Tiene cheque, depósito o póliza? | No | NO INTEGRADA | Folios/pólizas | Campos folio + endpoints póliza/cheque | Toda la fuente | Alto |
| 14 | ¿Existen posibles folios duplicados? | No | NO INTEGRADA | Duplicados | `findDuplicatePairs` / `/api/folios/duplicados/analisis` | Toda la fuente | Alto |
| 15 | ¿Qué gastos existen por planta? | No (Excel); confusión posible | NO INTEGRADA / INDIRECTA | Gastos Excel vs IGF «gasto» | `categoria-rango-excel` vs `PLANT_FINANCIAL_KPI_RE` | Listado folios GASTOS | Alto (ambigüedad semántica) |
| 16 | ¿Qué inversiones están pendientes? | No | NO INTEGRADA | Inversiones Excel / folios | `categoria-rango-excel?categoria=INVERSIONES` | Toda la fuente | Alto |
| 17 | ¿Cómo va el presupuesto semanal? | No | NO INTEGRADA | Presupuestos | Tablas `presupuesto_*` / bot carrito | Toda la fuente | Alto |
| 18 | ¿Qué proyectos están retrasados? | No | NO INTEGRADA | Proyectos | `/api/dashboard/proyectos` | Criterio de retraso + datos | Alto |
| 19 | ¿Qué usuario realizó un movimiento? | No (folios); parcial en AR/DICF | NO INTEGRADA / PARCIAL | Historial folio vs historial DICF/AR | `folio_historial` vs detalles DICF/AR summarizers | Movimientos de folio | Alto si se atribuye mal |
| 20 | ¿Qué información no puede consultar Director IA? | Sí (meta) | COMPLETA (esta pregunta de catálogo) | Este documento + `EMPTY_SOURCES` | N/A | — | Bajo si se responde con catálogo |

### Preguntas adicionales respaldadas por el sistema

| Pregunta | ¿Hoy? | Cobertura | Fuente | Función/endpoint | Faltante | Riesgo |
|----------|-------|-----------|--------|------------------|----------|--------|
| ¿Qué hay en bitácora de un cliente? | Parcial | PARCIAL | Bitácora + entidades | `filterBitacoraByQuestion`, `resolveCommercialEntitiesForQuestion` | Fuera de 3 meses / 30 sesiones | Medio |
| ¿Cómo va Mejora Continua del mes? | Parcial | PARCIAL | MC | `loadMejoraContinuaForChat` / `GET /api/director-ia/mejora-continua` | Áreas no enfocadas por regex | Medio |
| ¿Qué clientes dejaron de comprar? | Parcial | PARCIAL | commercial_state | `loadCommercialStateForChat` | >20 clientes; GA bloqueado | Medio |
| ¿Qué alias tiene una entidad? | Sí (API/UI) | PARCIAL | Entidades | `/api/director-ia/comercial-entidades*` | Si no está en catálogo | Bajo-Medio |

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
| GASTOS/INVERSIONES (query, no solo xlsx) | 4 | 4 | 3 | 3 | Folios, priv_clave | **Media** |
| Taller por AT (agregados) | 3 | 4 | 3 | 3 | `unidad-taller` | **Media** |
| Duplicados (`folio-duplicados`) | 3 | 4 | 2 | 3 | Folios | **Media** |
| Presupuesto semanal | 4 | 3 (UI limitada) | 4 (lógica en `server.js`) | 4 | Folios, bot | **Media-Baja** |
| Proyectos | 3 | 4 | 2 | 2 | Plantas | **Media-Baja** |
| Clasificación de apoyos (solo lectura matriz) | 3 | 4 | 3 | 3 | Folios, priv_clave | **Baja-Media** |
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
| **Impacto posible** | Preguntas legítimas no activan la fuente correcta; «gasto» puede ir a IGF en lugar de Excel GASTOS. |
| **Dominios afectados** | M7, M8, M9, M11, M12, M13. |
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
| **Evidencia** | Auditoría M18: muchas tablas `presupuesto_*`; sin página `app/presupuesto`. |
| **Impacto posible** | Integrar lectura IA requiere entender lógica bot en `server.js`. |
| **Dominios afectados** | M18, M2 (carro). |
| **¿Bloquea expansión?** | Sí para una respuesta fiable de «presupuesto semanal» hasta mapear queries. |
| **Información adicional** | Flujos WhatsApp carrito y estados canónicos. |

### 11. Tres mecanismos distintos para detectar duplicados

| Campo | Contenido |
|-------|-----------|
| **Evidencia** | Auditoría M5/M16: check al crear, análisis modal (`folio-duplicados.js`), hoja Excel Taller. |
| **Impacto posible** | Respuestas IA inconsistentes según qué detector se envuelva. |
| **Dominios afectados** | M5, M16, M2. |
| **¿Bloquea expansión?** | No; exige declarar cuál detector se usa. |
| **Información adicional** | Paridad de umbrales entre los tres. |

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

Director IA hoy es un **asistente de lectura/síntesis** centrado en **Action Register**, **DICF**, **bitácora**, **comentarios** (cliente y folio) y **entidades comerciales**, con **anexos financieros on-demand** (IGF/ARR/margen/estado comercial) activados por **regex** en el chat. **No** opera el kanban, **no** lee documentos/pólizas/cheques/presupuestos/proyectos/duplicados/clasificación/taller/Excel GASTOS-INVERSIONES ni los endpoints Delta UI. Las escrituras propias (bitácora/entidades) existen por **API UI**, no como tools autónomos del LLM. El GET `/api/director-ia/context` **subdeclara** IGF/ARR/commercial_state respecto al chat.

### 2. Dominios completos (COMPLETA)

- **M13 Director IA** (respecto a su propio módulo: bitácora, entidades, chat, mejora continua como parte del producto).

### 3. Dominios parciales (PARCIAL)

- M0 Auth (gates, no catálogo)
- M2 Folios (solo comentarios)
- M3 Plantas (filtro/nombre; no KPIs/proyectos)
- M7 IGF (chat on-demand)
- M8 ARR (chat on-demand / motor DICF)
- M11 DICF + comentarios cliente
- M12 Action Register (+ Mejora Continua)
- M17 WhatsApp (solo link de acceso)

### 4. Dominios indirectos (INDIRECTA)

- M9 Deltas (aproximación vía commercial_state / IGF-ARR, no endpoints delta-*)
- M20 Home KPI (comparte fuentes, no la página)
- M6 «gastos» en lenguaje natural → posible anexo IGF (no Excel GASTOS)

### 5. Dominios no integrados (NO INTEGRADA)

- M1 Health  
- M4 Clasificación  
- M5 Taller AT  
- M6 Excel GASTOS/INVERSIONES  
- M10 Weekly discount LD  
- M14 Usuarios admin (como dominio)  
- M15 Documentos/medios  
- M16 Duplicados  
- M18 Presupuestos semanales  
- M19 Delta Ingreso AI test  
- Kanban/estatus/timeline/cheque/póliza/proyectos (como fuentes de negocio)

### 6. Capacidades de lectura listas para reutilizar

| Capacidad | Respaldo |
|-----------|----------|
| RESUMIR Action Register / vencidas / responsables | `summarize*` en `director-ia-action-register.js` + `buildActionRegisterBoardPayload` |
| CONSULTAR/BUSCAR DICF | `summarizeDicfContext`, filtros chat |
| CONSULTAR bitácora | `loadBitacoraForChat` |
| CONSULTAR comentarios | `loadClienteComentariosForDirectorIa`, `loadFolioComentariosForDirectorIa` |
| RESOLVER entidad/alias | `resolveCommercialEntitiesForQuestion` |
| COMPARAR/CONSULTAR margen e IGF/ARR (on-demand) | `loadIgfArrAnnexForChat`, `getMargenKgPorPeriodo` |
| LISTAR estado comercial | `loadCommercialStateForChat` → `dicf.computeDicf` |
| RESUMIR Mejora Continua | `buildMejoraContinuaPayload` / `GET /api/director-ia/mejora-continua` |

### 7. Capacidades que requieren herramientas nuevas (aunque exista API/lib)

| Capacidad deseada | Existe en repo | Falta para Director IA |
|-------------------|----------------|------------------------|
| Etapa/estatus de folio / kanban | Sí (`/api/dashboard/kanban`, `/api/folios/:id`) | Loader + tool + permiso + prompt |
| Timeline / último movimiento | Sí (`/timeline`) | Tool |
| Metadatos documentos / póliza / cheque | Sí (endpoints folio) | Tool + política de URLs |
| Duplicados | Sí (`folio-duplicados.js`) | Tool + declaración de detector |
| Excel/agregados Taller, GASTOS, INVERSIONES | Sí (libs Excel) | Tool de consulta (idealmente sin solo xlsx) |
| Deltas UI | Sí (`delta-*`) | Tool o unificación con annex |
| Presupuesto semanal | Tablas sí; API UI limitada | Queries/tool + mapeo bot |
| Proyectos | Sí | Tool |
| Clasificación | Sí | Tool lectura |
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
 