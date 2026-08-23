# Reporte — ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
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
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta priorización: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

Baseline vigente recalculado desde la matriz: **8.0 / 20 = 40.0%**. M3, M13 y M16 son COMPLETE y **no compiten**.

Ningún NOT_STARTED restante tiene probabilidad alta de COMPLETE en un slice: M4 exige reconciliación Excel / COMPARAR escritura; M5/M6 son xlsx; M10 incluye envío WhatsApp (clase C); M14/M15/M18 tienen mutación, S3 o API ausente.

El siguiente módulo que **sí puede** llegar a COMPLETE, con endpoints JSON, helpers, intents y tools ya declarados, sin mutación y con valor ejecutivo real, es **M9 — Delta Venta / Descuento / Ingreso** (hoy INDIRECTA). Ganancia **+2.5 pp** → **8.5 / 20 = 42.5%**.

No se eligió M9 por número de módulo. Se eligió porque:

- las tres familias delta ya tienen fuente JSON y authz GA/GV;
- el planner ya detecta `delta_sales` / `delta_discount` / `delta_income`;
- las tools `get_delta_*` existen con `executor: null`;
- M3 demostró que un módulo de tres familias consultables puede cerrar COMPLETE en un slice read-only;
- Parte 7 marca la descomposición venta/descuento/ingreso como **Alta**.

No se eligió M1 (COMPLETE más barato, valor ejecutivo 1, y `/health-proyectos` ahora choca con el scope por planta de M3). No se eligió M4/M10 pese a +5.0 teórico: un slice realista solo llega a PARTIAL.

NEXT_TASK (no autorizado): `ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-next-module-prioritization-003` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T12:40:00-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin cambio de matriz. Sin commit/push/merge. Sin siguiente tarea.

---

## 1. Baseline formal recalculado

Fuente primaria: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` (fichas M0–M20 + Parte 9) y la fórmula del loop.

El 40.0% de `CURRENT_TASK.md` **no se asumió**: se recontó cada ficha.

| Etiqueta | Peso |
|---|---|
| COMPLETE / COMPLETA | 1.0 |
| PARTIAL / PARCIAL | 0.5 |
| INDIRECTA | 0.5 |
| NOT_STARTED / NO INTEGRADA | 0.0 |
| N_A | excluido del denominador |

M0–M20 = 21 módulos. **M19 = N_A** para este scoring (sistema paralelo; no se absorbe en Director IA; convención ya usada en 002, DOCS-M3 y el baseline de esta tarea) → denominador **20**.

| Grupo | Módulos | Peso |
|---|---|---|
| COMPLETE | M3, M13, M16 | 3.0 |
| PARTIAL | M0, M1, M2, M7, M8, M11, M12, M17 | 4.0 |
| INDIRECTA | M9, M20 | 1.0 |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 | 0.0 |
| N_A | M19 | excluido |
| **Total** | | **8.0 / 20 = 40.0%** |

Cambio desde 002: solo M3 PARCIAL → COMPLETA (+0.5 al numerador; 7.5 → 8.0). Ningún otro módulo cambió de etiqueta formal.

INDIRECTA se cuenta 0.5. Completar M9 o M20 vale **+2.5 pp**, no +5.0.

M6 aparece en Parte 9 como nota de colisión lingüística («gastos» → anexo IGF). Su ficha formal sigue **NO INTEGRADA** (0.0).

---

## 2. Estado M0–M20 (matriz vigente)

| ID | Módulo | Estado matriz | Peso | Compite |
|---|---|---|---|---|
| M0 | Auth / permisos | PARCIAL | 0.5 | sí |
| M1 | Health | PARCIAL | 0.5 | sí |
| M2 | Kanban / Folios | PARCIAL | 0.5 | sí |
| M3 | Plantas / KPIs / Proyectos | COMPLETA | 1.0 | no |
| M4 | Clasificación + COMPARAR | NO INTEGRADA | 0.0 | sí |
| M5 | Taller AT | NO INTEGRADA | 0.0 | sí |
| M6 | GASTOS / INVERSIONES Excel | NO INTEGRADA | 0.0 | sí |
| M7 | IGF Forecast | PARCIAL | 0.5 | sí |
| M8 | ARR | PARCIAL | 0.5 | sí |
| M9 | Deltas UI | INDIRECTA / endpoints NO INTEGRADA | 0.5 | sí |
| M10 | Weekly discount LD | NO INTEGRADA | 0.0 | sí |
| M11 | DICF + comentarios | PARCIAL | 0.5 | sí |
| M12 | Action Register | PARCIAL | 0.5 | sí |
| M13 | Director IA propio | COMPLETA | 1.0 | no |
| M14 | Usuarios admin | NO INTEGRADA | 0.0 | sí |
| M15 | Documentos / media | NO INTEGRADA | 0.0 | sí |
| M16 | Duplicados | COMPLETA | 1.0 | no |
| M17 | WhatsApp bridge | PARCIAL | 0.5 | sí |
| M18 | Presupuestos semanales | NO INTEGRADA | 0.0 | sí |
| M19 | Delta Ingreso AI test | N_A / no integrar | — | no (revalidar blocker) |
| M20 | Home KPI | INDIRECTA | 0.5 | sí |

---

## 3. Candidatos (derivados de la matriz)

**Incluidos — PARTIAL:** M0, M1, M2, M7, M8, M11, M12, M17  
**Incluidos — INDIRECTA:** M9, M20  
**Incluidos — NOT_STARTED:** M4, M5, M6, M10, M14, M15, M18  
**Incluido — revalidar blocker:** M19 (N_A / no integrar)

**Excluidos del ranking de ganador:** M3 COMPLETE, M13 COMPLETE, M16 COMPLETE, M19 N_A.

Ganancias:

- PARTIAL/INDIRECTA → COMPLETE = **+2.5 pp**
- NOT_STARTED → COMPLETE = **+5.0 pp**
- NOT_STARTED → PARTIAL = **+2.5 pp** (no se puntúa como COMPLETE)

---

## 4. Infraestructura añadida durante M3 (revalidación)

M3 no se reabre. Sí se pregunta si su infraestructura **reduce costo o riesgo** de otros candidatos.

| Pieza M3 | ¿Ayuda a otro módulo? |
|---|---|
| Patrón in-process `intent → tool → executor → fuente → respuesta` (igual que M16) | Sí. Reutilizable por cualquier módulo con JSON/helpers. |
| Tres familias en un slice (planta + KPIs + proyectos) | Sí. Reduce el argumento de 002 de que «tres familias = dudoso». |
| `parseDashboardFilters` / `buildDashboardWhere` / `queryDashboardKpis` | Ayuda a M2/M6 **solo** si el candidato usa filtros de folios. No sirve para deltas ARR. |
| `assertM3KpisAccess` / `assertM3ProyectosAccess` (GA/GV/`plantas_permitidas`) | El **patrón** de reaplicar authz sí. Las funciones concretas no cubren deltas. |
| `planta_id` como input canónico | No elimina el identificador `planta` (nombre) de M9/M10. |
| `listarProyectosPorPlantaOEquivalentes` | No abre M1. Al contrario: `GET /health-proyectos` cuenta `public.proyectos` **sin planta** y ahora choca con el scope M3. |
| Cycle constitucional | M3 no entra al cycle. Ningún candidato debe entrar. |

Conclusión: M3 **no** desbloquea M4/M5/M6/M10/M18. **Sí** reduce el riesgo de amplitud de M9 (tres familias hermanas, más homogéneas que las de M3). **Empeora** la inocencia de M1 (`/health-proyectos` es global).

---

## 5. Tabla comparativa

| MODULE | CANONICAL_PURPOSE | CURRENT_STATE | POTENTIAL_GAIN_PP | EXISTING_BACKEND | EXISTING_FRONTEND | EXISTING_TOOL_OR_INTENT | DATA_SOURCE | AUTHZ_READY | DEPENDENCIES | DB_OR_MIGRATION | EXTERNAL | ESTIMATED_EFFORT | TESTABILITY | SEMANTIC_RISK | PRODUCTION_RISK | CAN_REACH_COMPLETE_IN_ONE_SLICE | EVIDENCE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 Auth | Autenticar y aplicar permisos/planta | PARTIAL | +2.5 | `dashboard-auth.js`, `usuario-permisos.js` | `auth.ts` | `get_user_permissions` es M14 | `usuarios`, `roles` | Gates sí; catálogo no | Todo el dashboard | no | no | alto | media | alto | alto | no | Ficha: gates, no catálogo |
| M1 Health | Monitoreo servicio y DB | PARTIAL | +2.5 | `GET /health`, `/health-db`, `/health-proyectos`, `/health-director-ia` | header Shell | no tool chat | process + `pool` + `public.proyectos` global | `/health*` sin JWT | ninguna de negocio | no | no | bajo-medio | alta | medio (`ready` ≠ saludable; `/health-proyectos` global vs M3) | bajo-medio (fuga de conteo global) | dudoso sin fijar COMPLETE | Ficha M1; `server.js` 5452–5480 |
| M2 Folios/Kanban | Flujo por etapas | PARTIAL (solo comentarios) | +2.5 | `GET /folios/:id`, `/timeline`, `/kanban` | Kanban, FolioDrawer | `folio_status` `executor:null`; `UNSUPPORTED_RULES.kanban` | `public.folios` | JWT + GV + planta | M18 | no | no | alto | media | alto | **alto**: `GET /folios/:id` llama `maybeAdvanceFolioToComprobaciones` (L12974) | no | Ficha M2; mutación vigente |
| M4 Clasificación+COMPARAR | Comparativo mensual + reconciliación Excel | NOT_STARTED | +5.0 teórico / +2.5 realista | `GET /clasificacion-apoyos` JSON + `buildClasificacionMatrix`; COMPARAR POST escribe | 2 modales | capability `clasificacion_apoyos`; sin tool; `UNSUPPORTED_RULES` | `public.folios` | GV; `priv_clave` | Folios | no | archivo Excel para reconciliar | alto | media | medio | alto si se toca COMPARAR write | no (sin archivo no hay reconciliación; write = C) | `server.js` 6822; Parte 9 clase C |
| M5 Taller AT | Excel taller AT + duplicados | NOT_STARTED | +5.0 teórico | `GET /taller-at-excel` xlsx | `TallerAtExportModal` | `taller_at` → `get_expense_analysis` | `public.folios` | GV; `priv_clave` | Folios, homologación AT | no | no | medio-alto | baja (xlsx) | alto («Taller» = AR) | medio | no | Ficha M5 |
| M6 GASTOS/INV | Export categoría × meses | NOT_STARTED | +5.0 teórico | `GET /categoria-rango-excel` xlsx; `expandCategoriaRows` | `CategoriaRangoExportModal` | `expense_analysis` / `investment_analysis` | `public.folios` | GV; `priv_clave` | Folios | no | no | medio-alto | media si se extrae JSON | **alto** (IGF «gasto» ≠ Excel) | medio | no (2 categorías + colisión) | Ficha M6; Parte 9 nota IGF |
| M7 IGF | Forecast / compromiso / HG | PARTIAL | +2.5 | annex `loadIgfCommitSnapshot`; `/api/dashboard/igf-*` | UI IGF | `get_igf_snapshot` on-demand | `igf.*` | `acceso_igf_forecast_kpis` | ARR | no | no | alto (UI/versiones/GET sources) | media | medio | medio | no | Ficha: chat sí, GET context `sources.igf=false` |
| M8 ARR | Forecast ventas/descuento | PARTIAL | +2.5 | annex + `loadArrProyForPlant`; `/api/arr/*` | `/arr` | `get_arr_snapshot` on-demand | `arr.*` | GA en commercial_state | upload ARR | no | no | alto | media | medio | alto si se toca load | no | Ficha: `sources.arr=false` fijo |
| M9 Deltas | Comparar periodos venta/desc/ingreso | INDIRECTA | +2.5 | `delta-*-periodos` GET + `delta-*-datos` POST JSON; helpers `getDeltaVentaClientes` / `getDeltaDescuentoClientes` | `DeltaVentaModal`, `DeltaDescuentoModal`, `DeltaIngresoModal`, `DeltaIngresoClienteForecastModal` | 3 intents + 3 tools `executor:null`; `DOMAIN_TO_TOOLS` ya mapea | ARR + `arr.delta_ingreso_forecast_cliente` | GA 403; GV | ARR | no | no | medio | alta (JSON/helpers) | medio (solapa IGF/ARR/commercial_state/M19) | medio (solo lectura) | **sí**, si COMPLETE = consultar las tres familias delta ya existentes (no M19, no envío) | Ver §10 |
| M10 Weekly LD | Narrativa semanal **+ envío WhatsApp** | NOT_STARTED | +5.0 teórico / +2.5 realista | `POST /weekly-discount-lectura` JSON; `buildWeeklyDiscountNarrative` | pestaña Delta Descuento | no tool / no intent | ARR | GA 403; GV | ARR, Twilio | no | **Twilio** para el envío | bajo (solo narrativa) | alta (JSON) | medio (solapa M8/M9) | alto si se envía | no (propósito incluye envío = C) | `server.js` 16260; Parte 9 C |
| M11 DICF | Oportunidades / acciones / comentarios | PARTIAL | +2.5 | summarizers + commercial_state | UI DICF | tools already | `arr.dicf_*` | `acceso_acciones_dicf` | ARR | no | no | alto | media | medio | medio | no | Ya fuente primaria; COMPLETE = quitar límites |
| M12 Action Register | Tablero temas/ítems | PARTIAL | +2.5 | board + summarizers | UI Acciones | tools already | `arr.action_register_*` | `acceso_acciones_dicf` | Plantas | no | no | alto | media | medio | alto si muta | no | `includeNotes: false`; CRUD fuera |
| M14 Usuarios admin | Admin usuarios/roles | NOT_STARTED | +5.0 teórico | `/api/usuarios-admin*` | `UsuariosAdminModal` | `user_permissions` | `usuarios`, `roles` | `USUARIOS_ADMIN_CLAVE` | Auth global | no | no | medio | media | alto | **alto / C** | no | Parte 9 C |
| M15 Docs/media | Cotización, facturas, póliza | NOT_STARTED | +5.0 teórico | `/folios/:id/media`, documentos | FolioDrawer, PDF | `folio_documents` | `folio_archivos`, S3 | GV; `acceso_ver_imprimir_folios` | Folios, **S3** | no | **S3** | alto | baja | medio | alto | no | Ficha M15 |
| M17 WhatsApp | Comandos y URLs firmadas | PARTIAL | +2.5 | comando `DirectorIA`; Twilio | n/a | capability `whatsapp` | Twilio, usuarios | tokens en query | **Twilio** | no | **Twilio** | alto | baja | medio | alto | no | Ya hay link |
| M18 Presupuesto | Solicitudes/carro semanal | NOT_STARTED | +5.0 teórico | SQL embebido; `presupuesto-detalle` (otro uso) | UI limitada | `budget_status` `executor:null` | `presupuesto_*` | GG / etapas | Folios, WhatsApp | no | WhatsApp | alto | baja | alto | **alto** | no | Blocker de API vigente |
| M20 Home KPI | Vista inicio IGF/DICF | INDIRECTA | +2.5 | comparte annex/DICF | `app/page.tsx` | no | mismas que M7/M11 | igual | M7/M11 | no | no | medio | media | medio | bajo | no (página ≠ fuente nueva) | Ficha M20 |

---

## 6. PARTIAL/INDIRECTA vs NOT_STARTED

Terminar un INDIRECTA/PARTIAL por **+2.5** gana si P(COMPLETE) es alta y el NOT_STARTED +5.0 solo puede entregar PARTIAL.

Eso ocurre aquí:

| Candidato +5.0 | Destino realista de un slice | Motivo |
|---|---|---|
| M4 | PARTIAL (+2.5) | El JSON comparativo existe; la reconciliación exige archivo; COMPARAR escribe (C) |
| M5 | PARTIAL | Solo xlsx; «Taller» colisiona con AR |
| M6 | PARTIAL | Solo xlsx; «gastos» colisiona con IGF |
| M10 | PARTIAL | Narrativa JSON lista; COMPLETE del módulo incluye envío WhatsApp (C) |
| M14 | no | Mutación de permisos (C) |
| M15 | PARTIAL como mucho | S3 + superficie documental |
| M18 | no | Sin API REST del carro semanal |

M9 (INDIRECTA → COMPLETE, +2.5) y M1 (PARTIAL → COMPLETE, +2.5) son los únicos con P(COMPLETE) alta o media-alta. M9 gana por valor y por el precedente M3.

---

## 7. Blockers revalidados

### M18 Presupuesto

**Sigue presente.** No hay API REST de presupuesto semanal para Director IA. Las tablas `presupuesto_*` se tocan desde helpers embebidos en `server.js` y el carrito WhatsApp. Existen `POST /presupuesto-comparar` y `GET /presupuesto-detalle` (otro uso, no el carro semanal). No hay archivos en `sql/` que expongan un contrato de consulta. Escritura ALTO. M3 no lo tocó.

### M19 Delta Ingreso AI

**Sigue N_A / no integrar.** Stack paralelo (`lib/delta-ingreso-ai*.js`, `/api/ai/delta-ingreso/test/*` sin `dashboardAuthMiddleware` según la matriz). Parte 9 clase C: «Disparar endpoints `/api/ai/delta-ingreso/test/*` o envíos WhatsApp masivos». No se absorbe en Director IA. M9 debe usar `delta-ingreso-*` del dashboard, **no** este stack.

### M2 mutación en GET

**Sigue presente.** `GET /api/folios/:id` (`server.js` ~12957–12974) sigue llamando `maybeAdvanceFolioToComprobaciones`. Un loader M2 que reutilice ese handler puede mutar. M3 no lo corrigió.

### M10 envío WhatsApp

**Sigue presente como blocker de COMPLETE.** `POST /weekly-discount-lectura` es JSON de lectura (`buildWeeklyDiscountNarrative`). El propósito del módulo incluye envío programado. Parte 9 clase C cubre envíos WhatsApp masivos. Un slice de narrativa dejaría el módulo en PARTIAL, no COMPLETE.

### M4 COMPARAR / archivo

**Sigue presente.** `GET /clasificacion-apoyos` es JSON. Los POST `clasificacion-comparar*` escriben. Sin archivo no hay reconciliación. M3 (`planta_id`, equivalentes) abarata la mitad lectora, **no** elimina el archivo ni la escritura.

No se intentó resolver ninguno.

---

## 8–9. Ranking total

Criterios en orden: P(COMPLETE), ganancia real (no teórica), valor ejecutivo, reutilización, dependencias, riesgo productivo, riesgo semántico, testabilidad. Sin score opaco. Sin elegir por número.

| # | Módulo | Ganancia | Esfuerzo | Dependencias | Riesgo | Por qué esa posición |
|---:|---|---|---|---|---|---|
| 1 | **M9** | +2.5 real | medio | ARR; `planta` nombre ≠ `planta_id` | medio | Único INDIRECTA de negocio con **tres** fuentes JSON hermanas, 3 intents, 3 tools, authz GA/GV, sin mutación, y P(COMPLETE) alta tras el precedente M3. Parte 7: descomposición venta/descuento/ingreso = **Alta**. |
| 2 | M1 | +2.5 real | bajo | ninguna de negocio | medio (nuevo) | COMPLETE casi mecánico, pero valor 1 / prioridad Baja. `/health-proyectos` es conteo global y ahora contradice el scope M3. |
| 3 | M10 | +2.5 realista | bajo | ARR, Twilio | alto si envía | Narrativa JSON lista; COMPLETE bloqueado por WhatsApp (C). Valor 2. Solapa M9. |
| 4 | M4 | +2.5 realista | medio-alto | `priv_clave`, Excel | alto write | Comparativo JSON existe y M3 ayuda `planta_id`; reconciliación exige archivo. |
| 5 | M6 | +2.5 realista | medio-alto | `priv_clave` | semántico alto | `expandCategoriaRows` existe; IGF vs GASTOS sigue siendo hallazgo crítico. |
| 6 | M5 | +2.5 realista | medio-alto | homologación AT | semántico alto | Solo xlsx; «Taller» ≠ Excel AT |
| 7 | M7/M8 | +2.5 teórico | alto | ARR/IGF UI | medio | Ya on-demand; COMPLETE = UI/versiones/GET sources |
| 8 | M11/M12 | +2.5 teórico | alto | — | medio | Ya fuente primaria; COMPLETE = quitar límites/notas/CRUD |
| 9 | M2 | +2.5 teórico | alto | — | **mutación en GET :id** | Kanban completo; no un slice seguro |
| 10 | M15 | +2.5 | alto | S3 | alto | Superficie documental grande |
| 11 | M14 | +2.5 | medio | clave admin | C | No integrar mutación de permisos |
| 12 | M17 | +2.5 | alto | Twilio | alto | Ya hay link; el resto es canal externo |
| 13 | M20 | +2.5 | medio | M7/M11 | bajo | No es fuente nueva |
| 14 | M0 | +2.5 | alto | — | alto | Gates ≠ dominio de respuesta |
| 15 | M18 | +5.0 teórico | alto | WhatsApp | alto | Blocker de API vigente |

No se eligió por número de módulo. M4 no ganó por ser «el siguiente».

---

## 10. Ganador

**M9 — Delta Venta / Descuento / Ingreso**

| Campo | Valor |
|---|---|
| Estado actual | INDIRECTA (aproximación vía commercial_state / IGF-ARR; endpoints `delta-*` no cableados) |
| Estado objetivo | COMPLETE |
| Ganancia | **+2.5 pp** (8.0 → 8.5 / 20 = **42.5%**) |
| Por qué primero | Único candidato de negocio con P(COMPLETE) alta, tres fuentes JSON ya existentes, planner/tools declarados, authz determinable, sin mutación, sin S3/Twilio, y valor ejecutivo claramente superior a Health. El precedente M3 (tres familias consultables en un slice) aplica aquí con familias **más homogéneas**. |
| Delta físico faltante | Extraer/reutilizar `getPeriodosDeltaVenta`, `getDeltaVentaClientes`, `getDeltaDescuentoClientes` y los handlers `delta-ingreso-*` a un lib in-process; completar executors de `get_delta_sales` / `get_delta_discount` / `get_delta_income`; ramas chat (patrón M3/M16); resolver `planta` nombre → scope `planta_id`; reaplicar GA/GV; semántica «esto es el modal Delta, no IGF/ARR/commercial_state ni M19»; tests; **no** HTTP interno; **no** cycle. |
| Path | intents `delta_sales` / `delta_discount` / `delta_income` → tools `get_delta_*` → executor in-process → helpers/SQL ARR existentes → evidencia → respuesta. |
| Riesgos | `planta` nombre vs `planta_id`; alias `ALIAS_PLANTA_NOMBRE`; solape con anexo IGF/ARR y `financial_diagnosis`; no absorber M19; tres familias en un slice (mitigado por homogeneidad y por M3); GA/GV. |
| Blockers | Ninguno que impida un IMPL read-only. Sí hace falta fijar COMPLETE (¿las tres familias en el mismo slice? ¿periodos default? ¿forecast de ingreso aparte del delta ingreso?). |
| Gates NEXT_TASK | G1 humano; G2 N/A; G3 N/A; G8 N/A |
| Por qué antes que #2 (M1) | Misma ganancia porcentual, pero M9 es el hueco de negocio que Parte 7 nombra (descomposición venta/descuento/ingreso = Alta). M1 es COMPLETE más barato, prioridad Baja, y `/health-proyectos` ahora tiene riesgo de conteo global frente al scope M3. La regla «no elegir Health solo por facilidad si hay módulo de negocio con cierre similar y mayor valor» aplica: el cierre de M9 es similar (tres GETs/POSTs JSON + wiring chat) y el valor es mayor. |

### Evidencia física del ganador

- Ficha M9: no llama `/api/dashboard/delta-venta-*`, `delta-descuento-*`, `delta-ingreso-*`; respuestas afines son **INDIRECTAS**.
- Parte 9: M9 listado en dominios indirectos; «no lee … los endpoints Delta UI».
- Parte 7: módulo Delta valor 4 / prioridad Media; capacidad analítica «Descomposición venta vs descuento vs ingreso» valor 5 / **Alta**.
- `server.js` 16078–16157: `GET /delta-venta-periodos`, `POST /delta-venta-datos` — JSON `dejaron` / `mas` / `disminuyeron`; GA 403; GV bloqueado; input `planta` (nombre).
- `server.js` 16169+ / 16320+ / 17251: misma familia para descuento e ingreso.
- Helpers `getPeriodosDeltaVenta` / `getDeltaVentaClientes` (~1928, ~1955) leen `arr.ventas_diarias_cliente` + `arr.provincia_plants`.
- `getDeltaDescuentoClientes` (~2066) lee `arr.descuentos_diarios_cliente` + ventas.
- Planner (`director-ia-planner.js` 344–361): intents `delta_sales` / `delta_discount` / `delta_income` ya detectan «cambio/variación/delta + venta|descuento|ingreso».
- Tools (`director-ia-tools.js` 314–347): `get_delta_sales` / `get_delta_discount` / `get_delta_income`, `declared_not_integrated`, `executor: null`, `readOnly: true`.
- `DOMAIN_TO_TOOLS` ya mapea las tres familias.
- Capabilities: `delta_venta` / `delta_descuento` / `delta_ingreso` con `coverage: none`, `canRead: false`.
- `director-ia-chat.js`: **cero** ramas `delta_*`. No hay wiring.
- `director-ia-real-cycle.js`: no referencia deltas. M9 no entra al cycle.
- FE: `DeltaVentaModal.tsx`, `DeltaDescuentoModal.tsx`, `DeltaIngresoModal.tsx`, `DeltaIngresoClienteForecastModal.tsx`.
- Authz dashboard ya escrita: GA «Sin permiso para Delta»; `dashboardBlockGVForbidden`.
- M19 permanece ajeno: no usar `/api/ai/delta-ingreso/test/*`.

---

## 11. Segundo lugar y por qué pierde

**M1 — Health**

| Campo | Valor |
|---|---|
| Ganancia | +2.5 pp (igual que M9) |
| P(COMPLETE) | Alta para `/health` y `/health-db`; **baja o ambigua** para `/health-proyectos` tras M3 |
| Por qué pierde | Valor ejecutivo 1 / prioridad Baja. El hueco restante es producto, no negocio. `/health-proyectos` (`server.js` 5467–5479) agrega `public.proyectos` **sin planta ni JWT**, ahora semánticamente incompatible con M3 (proyectos solo del scope). Elegirlo sería elegir Health por facilidad frente a un módulo de negocio con cierre comparable. |

M10 no es segundo: su +5.0 es teórico. El slice creíble (narrativa JSON sin envío) deja PARTIAL. Twilio sigue en el propósito. Valor 2. Solapa el delta de descuento de M9.

---

## 12. COMPLETE feasibility

**Sí**, M9 puede alcanzar COMPLETE en un único slice razonable **si** COMPLETE se fija como:

- consulta autorizada, read-only, in-process, de las tres familias del dashboard (`delta-venta`, `delta-descuento`, `delta-ingreso`);
- misma semántica que los modales (periodos, `dejaron`/`mas`/`disminuyeron`, no inventar causalidad);
- sin M19, sin WhatsApp, sin mutación, sin cycle, sin HTTP interno.

COMPLETE **no** exigiría: unificar GET context `sources.*`, absorción de Delta Ingreso AI, ni narrativa weekly LD.

Queda abierto (por eso **readiness**, no IMPL):

1. ¿Un slice cubre las tres familias, o solo una?
2. ¿`planta` nombre se resuelve desde `planta_id` del scope sin rediseñar authz?
3. ¿El forecast de ingreso (`delta-ingreso-forecast-*`) entra en la familia ingreso o queda fuera?
4. ¿Cómo se declara la frontera frente a IGF/ARR/commercial_state ya on-demand?

Esas preguntas caben en una auditoría. No requieren contrato nuevo (G3) ni cambio constitucional (G2).

---

## 13. Dependencias y riesgos del ganador

**Dependencias**

- ARR cargado (`arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.provincia_plants`; ingreso también `arr.delta_ingreso_forecast_cliente` si se incluye forecast).
- JWT dashboard + `planta_id` de scope + mapeo a nombre de planta.
- Helpers hoy embebidos en `server.js` (mismo tipo de extracción que M3).
- Authz GA/GV ya existente en los handlers delta.

**No depende de:** S3, Twilio, migrations, schema nuevo, cycle constitucional, M19.

**Riesgos**

- Semántico: presentar el modal Delta como diagnóstico IGF o como M19.
- Identidad de planta: nombre vs id; alias `ALIAS_PLANTA_NOMBRE` / `LD_ALIAS_TO_CANONICAL`.
- Amplitud: tres familias (mitigado; son hermanas, no tres dominios distintos como M3).
- Productivo: bajo si se mantiene read-only; medio si alguien reutiliza un GET de folio por error (fuera de este módulo).

---

## 14. ¿Readiness o IMPL?

**Readiness.**

El gap no está completamente determinado: tres familias vs una, identificador de planta, frontera IGF/ARR/M19, y si el forecast de ingreso forma parte de COMPLETE.

No IMPL directo.

---

## 15. NEXT_TASK y gates

Exactamente uno, **no autorizado, no ejecutado**:

**`ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001`**

| Gate | Valor | Motivo |
|---|---|---|
| G1 | requerido | Autorizar la auditoría M9 |
| G2 | N/A | Cabe en arquitectura existente (capability + tool + loader chat) |
| G3 | N/A | Contratos actuales bastan; no D1–D9 |
| G8 | N/A | Sin calibración material |

---

## Acciones no realizadas

- No implementación.
- No runtime, frontend, backend, tests, SQL, matriz, contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó el NEXT_TASK.

## secrets_check

none

## git

`git diff --check`: limpio (exit 0, sin output).

`git status`:

```
On branch architecture/director-ia-next-module-prioritization-003
Changes not staged for commit:
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md
```

Solo `CURRENT_TASK.md` y este reporte. Sin cambios de código, matriz ni contratos.

STOP.
