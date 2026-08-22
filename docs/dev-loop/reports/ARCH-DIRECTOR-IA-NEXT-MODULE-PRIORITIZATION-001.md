# Reporte — ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001.md"
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
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta auditoría: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Ejecución

- Rama: `architecture/director-ia-next-module-prioritization-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T20:25:00-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin cambio de matriz. Sin commit/push/merge. Sin siguiente tarea.

## Baseline 32.5%

Fórmula vigente (no alterada):

| Etiqueta | Peso |
|---|---|
| COMPLETE | 1.0 |
| PARTIAL | 0.5 |
| NOT_STARTED | 0.0 |
| N/A | excluido del denominador |

M1 = PARCIAL (ya sincronizado). M18 excluido de esta elección (bloqueo presupuesto). M19 excluido (N/A).

Reconstrucción coherente con 32.5% y M0–M20 menos M19 (denominador **20**):

- COMPLETA: M13 → 1.0
- PARCIAL: M0, M1, M2, M3, M7, M8, M11, M12, M17 → 4.5
- INDIRECTA (M9, M20) contada como 0.5 cada una en este baseline → 1.0
- Total 6.5 / 20 = **32.5%**

Ganancia si un candidato NOT_STARTED pasa a:

- **COMPLETE:** +1.0 → 7.5/20 = **37.5%** (**+5.0 pp**)
- **PARTIAL:** +0.5 → 7.0/20 = **35.0%** (**+2.5 pp**)

No se inventó otra fórmula. Un slice que solo llega a PARTIAL queda penalizado frente a uno que puede llegar a COMPLETE.

---

## 1. Matriz canónica (solo lectura)

| ID | Definición | Fuente declarada | Estado | Restricciones | COMPLETE físico mínimo |
|---|---|---|---|---|---|
| M4 | Comparativo mensual + reconciliación Excel COMPARAR | `clasificacion-apoyos-excel.js`, `clasificacion-comparar.js`; `/api/dashboard/clasificacion-apoyos*`, `/clasificacion-comparar*` | NO INTEGRADA | `priv_clave`; GV bloqueado; GA sin COMPARAR; COMPARAR escribe folios | Consultar matriz **y** el dominio COMPARAR de forma consistente; wiring Director IA; semántica lectura≠actualizar; tests. Un slice solo-lectura de la matriz = PARTIAL. |
| M5 | Excel gasto taller por unidad AT + hoja duplicados | `taller-at-excel.js`, `unidad-taller.js`; `GET /api/dashboard/taller-at-excel` | NO INTEGRADA | `priv_clave`; GV; «Taller» en chat es Action Register, no este Excel | Consultar agregados AT + duplicados de **este** detector; wiring; tests. Hoy solo xlsx. |
| M6 | Export GASTOS/INVERSIONES por categoría y meses | `categoria-rango-excel.js`; `GET /api/dashboard/categoria-rango-excel` | NO INTEGRADA | `priv_clave`; GV; «gastos» en chat activa IGF (INDIRECTA, no este Excel) | Consultar listados GASTOS e INVERSIONES (no IGF); wiring; tests. Hoy solo xlsx. |
| M10 | Narrativa semanal de descuento **+ envío WhatsApp** | `weekly-discount-narrative.js`, `weekly-discount-ld-config.js`, scheduler; `POST /api/dashboard/weekly-discount-lectura` | NO INTEGRADA | GA 403; Twilio; ARR; enviar WhatsApp es clase C | Consultar la narrativa **y** el envío programado. Sin WhatsApp = PARTIAL. Enviar = no integrar. |
| M14 | Administrar usuarios, roles, permisos, plantas | `usuario-permisos.js`; `/api/usuarios-admin*` | NO INTEGRADA (roles AR incidentales) | `USUARIOS_ADMIN_CLAVE` / Tomza-Priv; CRUD = ALTO / C | Dominio admin completo. Lectura de listado = PARTIAL. Mutar permisos = no integrar. |
| M15 | Cotización, facturas, gastos, póliza, paquete, adjuntos | handlers `server.js`; `folio_archivos`; S3 | NO INTEGRADA | S3; GV; URLs firmadas; upload/delete ALTO | Consultar existencia/metadatos de **todos** esos tipos de forma consistente. Un listado media = PARTIAL. |
| M16 | Detectar parejas similares; cancelar es **opcional** | `folio-duplicados.js` (`findDuplicatePairs`, `findSimilarTo`); `POST /check`, `GET /analisis` | NO INTEGRADA | GV folios; cancelar ALTO; tope 1500 folios / 200 pares | Consultar el análisis de pares de forma consistente; wiring Director IA; semántica similar≠confirmado; tests. Cancelar no es requisito de COMPLETE de lectura. |

---

## 2–3. Evidencia física y ficha por módulo

### M4 Clasificación

- **CURRENT_STATE:** NOT_STARTED en Director IA. Dashboard sí existe.
- **POTENTIAL_GAIN:** +5.0 pp solo si COMPLETE; realista en un slice: PARTIAL (+2.5).
- **EXISTING_BACKEND:** 8 rutas en `server.js` (~6093–7018). Libs: `lib/clasificacion-apoyos-excel.js` (`buildClasificacionMatrix`, `buildClasificacionApoyosWorkbook`); `lib/clasificacion-comparar.js` (`inspectClasificacionWorkbook`, `compareExcelVsDashboard`).
- **EXISTING_FRONTEND:** `ClasificacionApoyosModal.tsx`, `ClasificacionCompararModal.tsx`; helpers en `frontend-dashboard/lib/api.ts`.
- **EXISTING_TESTS:** ninguno en `test/`. Capabilities: `clasificacion_apoyos` = `not_integrated`.
- **DATA_SOURCE:** `public.folios` / `public.plantas`. Sin tablas `clasificacion_*`.
- **DEPENDENCIES:** M2 folios, plantas, `priv_clave`.
- **AUTH_REQUIREMENTS:** JWT; GV bloqueado; GA sin COMPARAR; `acceso_crear_folios` en agregar.
- **DB_OR_MIGRATION_REQUIRED:** no.
- **IMPLEMENTATION_EFFORT:** alto (matriz + Excel + COMPARAR mutador).
- **PRODUCTION_RISK:** alto si se toca COMPARAR (escribe folios).
- **SEMANTIC_RISK:** medio (privados ZP-AD).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no.

### M5 Taller AT

- **CURRENT_STATE:** NOT_STARTED. Capability `taller_at` / tool `get_expense_analysis` sin executor.
- **POTENTIAL_GAIN:** +5.0 teórico; un slice: PARTIAL (+2.5).
- **EXISTING_BACKEND:** `GET /api/dashboard/taller-at-excel`; `buildTallerAtWorkbook`, `expandTallerRows`; `lib/unidad-taller.js`.
- **EXISTING_FRONTEND:** `TallerAtExportModal.tsx`, `downloadTallerAtExcel`.
- **EXISTING_TESTS:** ninguno en `test/`. Planner distingue «taller por AT» vs «cómo va Taller» (AR).
- **DATA_SOURCE:** `public.folios` categoría TALLER; `scripts/homologar-unidad-taller.sql`.
- **DEPENDENCIES:** folios; homologación AT; `priv_clave`.
- **AUTH_REQUIREMENTS:** JWT; GV; `priv_clave` para `solo_zp_ad`.
- **DB_OR_MIGRATION_REQUIRED:** no (script homologación es dato, no slice IA).
- **IMPLEMENTATION_EFFORT:** medio-alto (solo xlsx; habría que extraer filas).
- **PRODUCTION_RISK:** medio (`priv_clave`).
- **SEMANTIC_RISK:** alto («Taller» ≠ Excel AT).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no.

### M6 Excel GASTOS/INVERSIONES

- **CURRENT_STATE:** NOT_STARTED como módulo Excel. Chat «gastos» puede ir a IGF (INDIRECTA, no M6).
- **POTENTIAL_GAIN:** +5.0 teórico; un slice: PARTIAL (+2.5).
- **EXISTING_BACKEND:** `GET /api/dashboard/categoria-rango-excel`; `buildCategoriaRangoWorkbook`, `expandCategoriaRows`.
- **EXISTING_FRONTEND:** `CategoriaRangoExportModal.tsx`.
- **EXISTING_TESTS:** ninguno en `test/`. Planner: `expense_analysis` / `investment_analysis` bloqueados.
- **DATA_SOURCE:** `public.folios` por categoría.
- **DEPENDENCIES:** folios; `priv_clave`.
- **AUTH_REQUIREMENTS:** JWT; GV; `priv_clave`.
- **DB_OR_MIGRATION_REQUIRED:** no.
- **IMPLEMENTATION_EFFORT:** medio-alto (xlsx, dos categorías).
- **PRODUCTION_RISK:** medio.
- **SEMANTIC_RISK:** **alto** (IGF «gasto» vs folios GASTOS). Hallazgo crítico Parte 8.
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no.

### M10 Weekly LD

- **CURRENT_STATE:** NOT_STARTED.
- **POTENTIAL_GAIN:** COMPLETE +5.0 **bloqueado** (envío WhatsApp = clase C). PARTIAL +2.5.
- **EXISTING_BACKEND:** `POST /api/dashboard/weekly-discount-lectura` (`server.js` ~16538); `buildWeeklyDiscountNarrative`; scheduler `scheduleWeeklyLDDispatch`; comando WhatsApp `LD <planta>`.
- **EXISTING_FRONTEND:** pestaña en `DeltaDescuentoModal.tsx`; `postWeeklyDiscountLectura`.
- **EXISTING_TESTS:** ninguno en `test/`.
- **DATA_SOURCE:** `arr.descuentos_diarios_cliente`, `arr.ventas_diarias_cliente`, `arr.provincia_plants`.
- **DEPENDENCIES:** ARR, Twilio, env `WEEKLY_LD_*`.
- **AUTH_REQUIREMENTS:** JWT; **GA 403**; GV bloqueado.
- **DB_OR_MIGRATION_REQUIRED:** no.
- **IMPLEMENTATION_EFFORT:** bajo para solo narrativa (función ya producto).
- **PRODUCTION_RISK:** medio-alto (Twilio/scheduler si se toca envío).
- **SEMANTIC_RISK:** medio (solapa M9 delta-descuento).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no (el propósito incluye WhatsApp).

### M14 Usuarios admin

- **CURRENT_STATE:** NOT_STARTED como dominio. Lectura incidental `loadUsuarioRolesByIds` en AR.
- **POTENTIAL_GAIN:** COMPLETE +5.0 irreal (CRUD admin). PARTIAL +2.5.
- **EXISTING_BACKEND:** 7 rutas `/api/usuarios-admin*`; `lib/usuario-permisos.js`.
- **EXISTING_FRONTEND:** `UsuariosAdminModal.tsx`.
- **EXISTING_TESTS:** ninguno en `test/`. Planner intent `user_permissions` bloqueado.
- **DATA_SOURCE:** `public.usuarios`, `public.roles`, `permisos_json`.
- **DEPENDENCIES:** auth de todo el sistema.
- **AUTH_REQUIREMENTS:** JWT + clave `USUARIOS_ADMIN_CLAVE` / Tomza-Priv.
- **DB_OR_MIGRATION_REQUIRED:** no (columna runtime ya existe).
- **IMPLEMENTATION_EFFORT:** medio (pero no debe hacerse).
- **PRODUCTION_RISK:** **alto**.
- **SEMANTIC_RISK:** alto (exponer permisos / fingir autoridad).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no. Matriz: cambiar permisos = **C — no integrar**.

### M15 Docs/media folio

- **CURRENT_STATE:** NOT_STARTED. Tools `get_folio_documents` / `get_folio_financial_status` sin executor.
- **POTENTIAL_GAIN:** +5.0 teórico; un slice: PARTIAL (+2.5).
- **EXISTING_BACKEND:** `/api/folios/:id/media`, `media/:id/url`, `documento-gastos`, `documento-folio`, `documento-completo`, `poliza/documento`, uploads POST. Helpers S3 en `server.js`.
- **EXISTING_FRONTEND:** `FolioDrawer.tsx`, `ImprimirGastosModal.tsx`.
- **EXISTING_TESTS:** ninguno en `test/`. Scripts planner/orchestrator confirman no integrado.
- **DATA_SOURCE:** `public.folio_archivos`, campos `public.folios`, S3.
- **DEPENDENCIES:** M2 folios, S3, plantilla `FOLIO_TEMPLATE_S3_KEY`.
- **AUTH_REQUIREMENTS:** JWT; GV folios; `acceso_ver_imprimir_folios`; `solo_zp_ad`; DELETE solo AD.
- **DB_OR_MIGRATION_REQUIRED:** no.
- **IMPLEMENTATION_EFFORT:** alto (superficie grande + binarios).
- **PRODUCTION_RISK:** alto (S3, URLs firmadas, uploads).
- **SEMANTIC_RISK:** medio (afirmar «faltan documentos» sin inventario completo).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** no.

### M16 Duplicados

- **CURRENT_STATE:** NOT_STARTED. Intent `duplicate_folios` y tool `get_duplicate_folios` ya declarados; `executor: null`.
- **POTENTIAL_GAIN:** **+5.0 pp** si COMPLETE de **lectura/análisis** (cancelar es opcional y no debe entrar).
- **EXISTING_BACKEND:** `POST /api/folios/duplicados/check`, `GET /api/folios/duplicados/analisis` (`server.js` ~11155–11195). Lib pura: `findDuplicatePairs`, `findSimilarTo`, `conceptoSimilarity` en `lib/folio-duplicados.js`. `loadFoliosParaDuplicados` (tope 1500).
- **EXISTING_FRONTEND:** `AnalisisDuplicadosModal.tsx`, `CrearFolioModal.tsx` (`postCheckDuplicadosFolio`).
- **EXISTING_TESTS:** ninguno de módulo en `test/`; scripts capabilities/planner/orchestrator cubren el **bloqueo**. La lib es determinista (similaridad/pares) y testeable sin I/O.
- **DATA_SOURCE:** `public.folios` (importe, concepto, estatus, planta).
- **DEPENDENCIES:** M2 folios (lectura). No S3, no Twilio, no `priv_clave`, no tabla nueva.
- **AUTH_REQUIREMENTS:** JWT + `dashboardBlockGVFoliosMiddleware`; `assertPlantaPermitidaDashboard`. Cancelar: `acceso_cancelar_folio_dashboard` — **fuera** del slice de lectura.
- **DB_OR_MIGRATION_REQUIRED:** no.
- **IMPLEMENTATION_EFFORT:** medio-bajo (executor sobre lib/API ya existentes + tests).
- **PRODUCTION_RISK:** bajo-medio (solo lectura; no cancelar).
- **SEMANTIC_RISK:** medio (par similar ≠ duplicado confirmado; no mezclar detectores M4/M5).
- **CAN_REACH_COMPLETE_IN_ONE_SLICE:** **sí**, si COMPLETE = consultar de forma consistente la fuente `folio-duplicados` / `/analisis`, con tests y sin cancelar.

---

## 4–6. Comparativa, ganancia y ranking

Componentes (no es un score opaco):

- **G:** ganancia si el *estado realista del slice* se alcanza (+5 COMPLETE / +2.5 PARTIAL).
- **P:** probabilidad de COMPLETE en un slice (alta / media / baja / nula).
- **R:** reutilización (lib + API JSON + intent/tool ya declarados).
- **D:** dependencias extra (priv_clave, S3, Twilio, COMPARAR write).
- **K:** riesgo productivo + semántico + cambio arquitectónico.

| Rank | Módulo | current | G realista | P(COMPLETE) | Backend | Frontend | Tests | Effort | Prod risk | COMPLETE 1 slice |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | M16 Duplicados | NOT_STARTED | **+5.0** | alta | JSON + lib pura | modal análisis | lib testeable; `test/` vacío | medio-bajo | bajo-medio | **sí** |
| 2 | M10 Weekly LD | NOT_STARTED | +2.5 | nula (WhatsApp) | narrativa JSON | modal delta | `test/` vacío | bajo | medio-alto | no |
| 3 | M5 Taller AT | NOT_STARTED | +2.5 | baja | solo xlsx | modal export | `test/` vacío | medio-alto | medio | no |
| 4 | M6 GASTOS/INV | NOT_STARTED | +2.5 | baja | solo xlsx | modal export | `test/` vacío | medio-alto | medio | no |
| 5 | M4 Clasificación | NOT_STARTED | +2.5 | nula | 8 rutas + writes | 2 modales | `test/` vacío | alto | alto | no |
| 6 | M15 Docs/media | NOT_STARTED | +2.5 | nula | 10+ rutas + S3 | drawer/PDF | `test/` vacío | alto | alto | no |
| 7 | M14 Usuarios admin | NOT_STARTED | +2.5 | nula (C) | CRUD + clave | modal admin | `test/` vacío | medio | alto | no |

### Por qué ese orden

1. **M16** — único con P(COMPLETE) alta, G +5, reutilización (lib + GET JSON + tool/planner), sin S3/Twilio/`priv_clave`/migración.
2. **M10** — mejor reuse de producto (narrativa lista) pero COMPLETE imposible sin WhatsApp (C).
3. **M5** — valor operativo de taller; COMPLETE bloqueado por Excel-only + semántica «Taller».
4. **M6** — misma forma que M5 y peor semántica (IGF vs folios).
5. **M4** — superficie grande y COMPARAR muta folios.
6. **M15** — S3, muchos tipos de documento; un slice no cubre el módulo.
7. **M14** — riesgo y política C; no es avance de criterio ejecutivo.

No se eligió por el orden M4→M5.

---

## 7. Ganador

**M16 — Análisis duplicados de folios.**

Maximiza avance funcional (+5.0 pp si COMPLETE) × probabilidad de COMPLETE × reutilización (`folio-duplicados.js`, `/analisis`, `get_duplicate_folios` ya declarado).

Minimiza dependencias (sin S3, Twilio, `priv_clave`, DDL), riesgo productivo (lectura) y cambio arquitectónico (no D1–D9; no contrato nuevo).

### Riesgos que quedan (no bloquean elegir M16)

- Similaridad 0.72 ≠ «duplicado confirmado».
- Tope 1500 folios / 200 pares: COMPLETE es sobre **esa** fuente, no sobre el universo infinito.
- No mezclar detectores de M4 COMPARAR ni hoja Taller M5.
- No cablear `POST /cancelar`.
- Rol GV sin folios.
- No hay tests de módulo hoy: el NEXT_TASK de readiness debe fijar tests mínimos.

---

## 8. NEXT_TASK (no autorizado, no ejecutado)

**`ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001`**

Hace falta readiness antes de IMPL: fijar COMPLETE vs cancelar opcional, superficie (tool chat vs context vs dashboard), fail-closed semántico, alcance de planta/límites, y tests. IMPL directo arriesgaría overclaim.

No se autoriza. No se ejecuta.

## 9. Gates del NEXT_TASK

| Gate | Valor | Motivo |
|---|---|---|
| G1 | requerido (humano) | Autorizar la auditoría M16 |
| G2 | N/A salvo que readiness quiera redefinir M16 | No preventivo |
| G3 | N/A | No hay contrato nuevo |
| G8 | N/A | No hay calibración |

---

## Acciones NO realizadas

- No implementación.
- No se modificó runtime, frontend, backend, tests, matriz ni contratos.
- No commit / push / merge.
- No se abrió ni ejecutó el NEXT_TASK.

## Cierre

- `status` = `DONE_PENDING_REVIEW`
- Ganador claro: **M16**
- STOP.
