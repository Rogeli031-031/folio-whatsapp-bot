# Reporte — ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta priorización: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

Baseline vigente recalculado desde las fichas: **8.5 / 20 = 42.5%**. El 42.5% de `CURRENT_TASK.md` **no se asumió**. M3, M9, M13 y M16 son COMPLETA y **no compiten**. M19 sigue N_A (excluido del denominador).

Tras M9 no queda ningún INDIRECTA de negocio. M20 es solo la página Home. Los NOT_STARTED +5.0 teóricos (M5/M10/M14/M15/M18) siguen sin poder entregar COMPLETE en un slice realista.

El siguiente módulo que **sí puede** llegar a COMPLETE, reutilizando el patrón M3/M9 (`intent → tool → executor → helper/fuente → respuesta`) y un GET JSON ya SELECT-only, es **M4 — Clasificación de apoyos**, limitado a la **lectura de la matriz comparativa** (no COMPARAR/Excel). Ganancia **+5.0 pp** → **9.5 / 20 = 47.5%** si la readiness confirma ese COMPLETE.

No se eligió M4 por ser el número siguiente a M3. Se eligió porque:

- `GET /api/dashboard/clasificacion-apoyos` ya devuelve JSON (`buildClasificacionMatrix`) con `planta_id` + `mes_a`/`mes_b` YYYY-MM A≠B;
- el GET es SELECT-only (no se asume read-only por ser GET: se leyó el handler);
- M3 aporta `planta_id` / equivalentes; M9 aporta el contrato de par de periodos;
- COMPARAR POST escribe y exige archivo — queda fuera, igual que el forecast mutante quedó fuera de M9;
- Parte 7 ya nombra «Clasificación de apoyos (solo lectura matriz)» como integración válida.

No se eligió M1 (valor 1; `/health-proyectos` global vs scope M3). No se eligió M6 pese a intents/tools ya declarados: el contrato HTTP sigue siendo xlsx y «gastos» colisiona con IGF.

NEXT_TASK (no autorizado): `ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-next-module-prioritization-004` (≠ `main`).
- HEAD: `2efb3c29 Merge branch 'docs/director-ia-m9-capability-matrix-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T13:41:00-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin cambio de matriz. Sin commit/push/merge. Sin siguiente tarea.

---

## 1. Baseline formal recalculado

Fuente: fichas M0–M20 + Parte 9 de `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`.

| Etiqueta | Peso |
|---|---|
| COMPLETE / COMPLETA | 1.0 |
| PARTIAL / PARCIAL | 0.5 |
| INDIRECTA | 0.5 |
| NOT_STARTED / NO INTEGRADA | 0.0 |
| N_A | excluido del denominador |

M0–M20 = 21 módulos. **M19 = N_A** (sistema paralelo; convención 002/003/DOCS-M3/DOCS-M9) → denominador **20**.

| Grupo | Módulos | Peso |
|---|---|---|
| COMPLETE | M3, M9, M13, M16 | 4.0 |
| PARTIAL | M0, M1, M2, M7, M8, M11, M12, M17 | 4.0 |
| INDIRECTA | M20 | 0.5 |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 | 0.0 |
| N_A | M19 | excluido |
| **Total** | | **8.5 / 20 = 42.5%** |

Cambio desde 003: solo M9 INDIRECTA → COMPLETA (+0.5; 8.0 → 8.5). Ninguna otra ficha cambió de etiqueta.

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
| M9 | Deltas UI | COMPLETA | 1.0 | no |
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

Ganancias: PARTIAL/INDIRECTA → COMPLETE = **+2.5 pp**. NOT_STARTED → COMPLETE = **+5.0 pp**. NOT_STARTED → PARTIAL = **+2.5 pp** (no se puntúa como COMPLETE).

---

## 3. Infraestructura M3 / M9 (impacto en candidatos)

M3 y M9 no se reabren. Sí se pregunta si su patrón **reduce el delta** de otros.

| Pieza | ¿Ayuda a otro módulo? |
|---|---|
| `intent → tool → executor → helper → respuesta` in-process | Sí. Cualquier JSON/helper SELECT-only. |
| Tres familias en un slice (M3, M9) | Sí. Homogeneidad importa más que el conteo. |
| `parseDashboardFilters` / `buildDashboardWhere` | **M6 ya las usa** en `GET /categoria-rango-excel`. También kanban. No sirven para M4 (query propia). |
| `planta_id` + `plantas_permitidas` / equivalentes | M4 GET ya recibe `planta_id`. M6 también. |
| Par YYYY-MM A≠B + no inventar periodos (M9) | **M4 GET ya exige `mes_a`/`mes_b` distintos.** Reduce el diseño de periodos. |
| Interceptar intent **antes** de anexo IGF (M9) | Crítico para **M6** («gastos» → `PLANT_FINANCIAL_KPI_RE`). M4 no comparte ese vocabulario. |
| No reutilizar handlers con side effects | **M2 empeora:** `GET /kanban` (L5410–5423) y `GET /folios/:id` (L12672) llaman `maybeAdvanceFolioToComprobaciones`. Extraer SELECT, no el GET. |
| Cycle | Ni M3 ni M9 entran. Ningún candidato debe entrar. |

Conclusión: M3/M9 **no** desbloquean M10/M14/M15/M18/M19. **Sí** abaratan M4 (periodos + planta) y M6 (filtros + anti-IGF). **Empeoran** M1 (`/health-proyectos` global vs proyectos por planta) y **confirman** que M2 no puede reutilizar sus GET.

---

## 4. Tabla comparativa

| module | canonical_purpose | current_state | potential_gain_pp | executive_value | existing_backend | existing_frontend | existing_intent_or_tool | source | authz_ready | plant_scope | dependencies | db_or_migration | external_dependency | estimated_effort | testability | semantic_risk | production_risk | can_reach_complete_in_one_slice | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 | Gates auth/planta | PARTIAL | +2.5 | bajo | `dashboard-auth.js` | `auth.ts` | `get_user_permissions` es M14 | `usuarios`/`roles` | gates sí | sí | todo el dashboard | no | no | alto | media | alto | alto | no | Ficha: no es dominio de respuesta |
| M1 | Health servicio/DB | PARTIAL | +2.5 | 1 / Baja | `/health`, `/health-db`, `/health-proyectos`, `/health-director-ia` | header Shell | no tool | process + `pool` + `proyectos` **global** | `/health*` sin JWT | **no** (`/health-proyectos` sin planta) | ninguna de negocio | no | no | bajo | alta | medio (`ready` ≠ saludable; choca M3) | bajo-medio | dudoso | `server.js` 5150–5178 |
| M2 | Kanban/folios | PARTIAL (comentarios) | +2.5 | 5 / Alta | kanban, `/folios/:id`, timeline | Kanban, FolioDrawer | `folio_status` `executor:null` | `public.folios` | JWT+GV | sí | M18 | no | no | alto | media | alto | **alto**: GET kanban y GET `:id` mutan | no (un slice de estatus deja PARTIAL; GET no es read-only) | L5368–5423; L12655–12672 |
| M4 | Comparativo mensual + reconciliación Excel | NOT_STARTED | +5.0 si COMPLETE=lectura matriz; +2.5 si solo PARTIAL | 3 / Baja-Media (Parte 7 «solo lectura matriz») | `GET /clasificacion-apoyos` JSON; `GET /detalle`; POSTs COMPARAR escriben | 2 modales | capability `clasificacion_apoyos` `canRead:false`; `UNSUPPORTED_RULES`; **sin tool** | `public.folios` + `buildClasificacionMatrix` | GV; `priv_clave` | `planta_id` + equivalentes | Folios | no | archivo Excel **solo** para COMPARAR | medio | alta (JSON) | medio | alto si se toca COMPARAR | **sí**, si COMPLETE = matriz JSON read-only | L6520–6551 SELECT; L6055+ write+file |
| M5 | Excel taller AT | NOT_STARTED | +5.0 teórico / +2.5 real | 3 / Media | `GET /taller-at-excel` xlsx | modal | `taller_at` → `expense_analysis` | `public.folios` | GV; `priv_clave` | sí | homologación AT | no | no | medio-alto | baja (xlsx) | alto («Taller»=AR) | medio | no | Ficha M5 |
| M6 | Export GASTOS/INV | NOT_STARTED | +5.0 teórico / +2.5 realista | 4 / Media (query, no xlsx) | GET xlsx; query usa `buildDashboardWhere` (M3); `expandCategoriaRows` | modal | `expense_analysis` / `investment_analysis`; tools `executor:null` | `public.folios` | GV; `priv_clave` | `planta_id` | Folios | no | no (xlsx es respuesta) | medio | media si se extrae JSON | **alto** (IGF «gasto») | medio | no sin fijar COMPLETE y routing | L5908–6010 |
| M7 | IGF forecast | PARTIAL | +2.5 | 5 annex / Alta sources GET | annex + `/igf-*` | UI IGF | `get_igf_snapshot` on-demand | `igf.*` | `acceso_igf_forecast_kpis` | sí | ARR | no | no | alto | media | medio | medio (PATCH existe) | no | `sources.igf` fijo false; UI/versiones fuera |
| M8 | ARR | PARTIAL | +2.5 | 5 | annex + `/api/arr/*` | `/arr` | `get_arr_snapshot` | `arr.*` | GA commercial_state | sí | upload ARR | no | no | alto | media | medio | alto si `POST /arr/load` | no | `sources.arr=false`; carga = C |
| M10 | Narrativa semanal + envío WA | NOT_STARTED | +5.0 teórico / +2.5 real | 2 / Baja | `POST /weekly-discount-lectura` JSON (SELECT-ish) | pestaña Delta Descuento | no tool | ARR | GA/GV | nombre planta | ARR, **Twilio** | no | **Twilio** (scheduler L19–20) | bajo (narrativa) | alta | medio (solapa M9 descuento) | alto si envía | no (propósito incluye envío = C) | L15958; `weekly-discount-ld-scheduler.js` |
| M11 | DICF | PARTIAL | +2.5 | 5 | summarizers + commercial_state | UI DICF | tools already | `arr.dicf_*` | `acceso_acciones_dicf` | sí | ARR | no | no | alto | media | medio | medio | no | COMPLETE = quitar límites / attachments |
| M12 | Action Register | PARTIAL | +2.5 | 5 | board + summarizers | UI Acciones | tools already | `arr.action_register_*` | `acceso_acciones_dicf` | sí | Plantas | no | no | alto | media | medio | alto si muta | no | `includeNotes: false`; CRUD fuera |
| M14 | Usuarios admin | NOT_STARTED | +5.0 teórico | 2 / Baja | `/usuarios-admin*` | modal | `user_permissions` | `usuarios` | clave admin | global | Auth | no | no | medio | media | alto | **C** | no | Parte 9 C |
| M15 | Docs/media | NOT_STARTED | +5.0 teórico | 4 | `/media`, documentos | FolioDrawer | `folio_documents` | `folio_archivos`, S3 | GV | sí | Folios, **S3** | no | **S3** | alto | baja | medio | alto | no | Ficha M15 |
| M17 | WhatsApp bridge | PARTIAL | +2.5 | — | comando + Twilio | n/a | capability `whatsapp` | Twilio | tokens query | — | **Twilio** | no | **Twilio** | alto | baja | medio | alto | no | Ya hay link |
| M18 | Presupuesto semanal | NOT_STARTED | +5.0 teórico | 4 / Media-Baja | SQL embebido; `presupuesto-detalle` otro uso | UI limitada | `budget_status` `executor:null` | `presupuesto_*` | GG | sí | Folios, WhatsApp | no | WhatsApp | alto | baja | alto | alto | no | Blocker de API del carro |
| M20 | Home KPI | INDIRECTA | +2.5 | 2 / Baja | comparte M7/M11 | `app/page.tsx` | no | mismas M7/M11 | igual | — | M7/M11 | no | no | medio | media | medio | bajo | no | No es fuente nueva |

---

## 5. PARTIAL/INDIRECTA vs NOT_STARTED

Terminar un PARTIAL +2.5 solo gana si P(COMPLETE) es alta. Aquí no:

| Candidato +2.5 | Destino realista | Motivo |
|---|---|---|
| M1 | dudoso | `/health-proyectos` global vs M3; valor 1 |
| M2 | PARTIAL | GET kanban y GET `:id` mutan; un estatus no cierra kanban+historial+docs |
| M7/M8 | PARTIAL | Annex ya existe; COMPLETE = UI/versiones/`sources.*` (contrato GET) |
| M11/M12 | PARTIAL | Ya fuente primaria; COMPLETE = límites/notas/CRUD |
| M17 | PARTIAL | Link ya existe; el resto es Twilio |
| M20 | PARTIAL | Página ≠ fuente |
| M0 | no | Gates ≠ catálogo |

| Candidato +5.0 | Destino realista | Motivo |
|---|---|---|
| **M4** | **COMPLETE si se fija lectura de matriz** | JSON SELECT-only ya existe; write/archivo = COMPARAR (fuera, patrón M9) |
| M6 | PARTIAL salvo readiness | HTTP es xlsx; colisión IGF; 2 categorías |
| M5 | PARTIAL | Solo xlsx; «Taller» ≠ AR |
| M10 | PARTIAL | Narrativa lista; COMPLETE incluye envío WhatsApp (C) |
| M14 | no | Mutación permisos (C) |
| M15 | PARTIAL | S3 + superficie documental |
| M18 | no | Sin API del carro semanal |

M4 (+5.0 **si** COMPLETE = lectura) es el único NOT_STARTED con P(COMPLETE) alta y valor de negocio. M6 es el único rival cercano.

---

## 6. Blockers revalidados (003)

### M18 Presupuesto

**Sigue presente.** No hay API REST del carro semanal para Director IA. `POST /presupuesto-comparar` y `GET /presupuesto-detalle` son otro uso. Escritura ALTO. M3/M9 no lo tocan.

### M19 Delta Ingreso AI

**Sigue N_A / no integrar.** `/api/ai/delta-ingreso/test/*` (L16912+) **sin** `dashboardAuthMiddleware`. Parte 9 clase C. M9 usó el modal dashboard, no este stack. No se absorbe.

### M2 mutación en GET — **reforzado**

**Sigue y es peor que en 003.** Además de `GET /api/folios/:id` (L12672), **`GET /api/dashboard/kanban`** (L5410–5423) recorre filas PAGADO/CERRADO y llama `maybeAdvanceFolioToComprobaciones`. Un GET no es read-only por el método HTTP. M3/M9 obligan a extraer SELECT, no a reutilizar esos handlers. Aun así, un slice de estatus no completa M2.

### M10 envío WhatsApp

**Sigue blocker de COMPLETE.** `POST /weekly-discount-lectura` es JSON de lectura. El propósito incluye envío: `scheduleWeeklyLDDispatch` inyecta `sendWhatsApp` (`lib/weekly-discount-ld-scheduler.js`). Parte 9: envíos WhatsApp = C. M9 (descuento mensual) no sustituye la narrativa semanal ni el envío.

### M4 COMPARAR / archivo

**Sigue para la mitad escritora.** Los POST `clasificacion-comparar*` (L6055+) exigen `fileBase64` y escriben folios. **No bloquea** un COMPLETE de solo lectura de `GET /clasificacion-apoyos` (L6520–6551: `SELECT` + `buildClasificacionMatrix`, sin INSERT/UPDATE/DELETE). Esa frontera es exactamente la de M9 vs forecast.

No se intentó resolver ninguno.

---

## 7. Rechecks especiales

### M1 Health

`/health` y `/health-db` son triviales. `/health-director-ia` ya está (PARTIAL). `/health-proyectos` agrega `public.proyectos` **sin JWT ni planta** (L5165–5174), incompatible con el COMPLETE M3 (proyectos del scope). COMPLETE de producto Health no puede tragarse ese conteo global sin fuga. Valor ejecutivo 1. No gana.

### M2 Folios/Kanban

Valor 5, pero: comentarios ya PARTIAL; tools `executor:null`; `UNSUPPORTED_RULES.kanban`; **dos GET con side effects**. Extraer `getFolioById` SELECT-only no cierra historial, documentos, cheque/póliza ni tablero. Un slice deja PARTIAL.

### M4 Clasificación

Ver ganador.

### M7 IGF / M8 ARR

Chat on-demand ya consulta. Falta UI/versiones y `EMPTY_SOURCES.igf/arr` siempre `false` en GET context (`lib/director-ia-context.js` L22–31). Igualar `sources` es hallazgo crítico / posible contrato de GET, no un COMPLETE de módulo. PATCH IGF y `POST /api/arr/load` son escritura. Un slice no pasa a COMPLETA.

### M11 DICF / M12 Action Register

Ya son fuente primaria. COMPLETE exigiría quitar top-N, notas, attachments o CRUD. Eso no es un slice read-only acotado; es redefinir el módulo. Siguen PARTIAL.

### M17 WhatsApp

El link `/director-ia` ya existe. COMPLETE del canal exige Twilio. Penalizado.

### M20 Home KPI

INDIRECTA porque no es fuente: reusa M7/M11. Cerrar la página no añade consulta nueva.

### NOT_STARTED y M3/M9

Solo M4 y M6 **ganaron** infraestructura reutilizable. M5 sigue xlsx. M10 sigue atado a Twilio. M14/M15/M18 sin cambio.

---

## 8. Ranking

Criterios: P(COMPLETE), ganancia **real**, valor ejecutivo, reutilización M3/M9, dependencias, riesgo productivo, riesgo semántico, testabilidad. Sin score opaco. Sin elegir por número.

| # | Módulo | Ganancia | Esfuerzo | Dependencias | Riesgo | Por qué esa posición |
|---:|---|---|---|---|---|---|
| 1 | **M4** | +5.0 si COMPLETE=matriz | medio | Folios; `priv_clave` | medio (write fuera) | Único NOT_STARTED con JSON SELECT-only, periodos A≠B y `planta_id` ya en el GET. El patrón M9 (excluir write) aplica a COMPARAR. Parte 7 ya describe la lectura de matriz. |
| 2 | M6 | +5.0 teórico / +2.5 realista | medio | Folios; IGF routing | semántico alto | Intents/tools y query M3 existen, pero el contrato HTTP es xlsx y «gastos» cae a IGF. |
| 3 | M1 | +2.5 dudoso | bajo | ninguna | medio (global vs M3) | Barato; valor 1; `/health-proyectos` contradice M3. |
| 4 | M10 | +2.5 realista | bajo | ARR, Twilio | C si envía | Narrativa lista; COMPLETE bloqueado por WhatsApp. Solapa M9 descuento. |
| 5 | M5 | +2.5 realista | medio-alto | AT | semántico alto | Solo xlsx; «Taller» ≠ AR |
| 6 | M7/M8 | +2.5 teórico | alto | ARR/IGF UI | medio | Ya on-demand; COMPLETE = UI/`sources` |
| 7 | M11/M12 | +2.5 teórico | alto | — | medio | Ya primaria; COMPLETE = límites/CRUD |
| 8 | M2 | +2.5 teórico | alto | — | **GET muta (kanban y :id)** | Valor 5 no basta: un slice no es COMPLETE |
| 9 | M15 | +2.5 | alto | S3 | alto | Superficie documental |
| 10 | M14 | +2.5 | medio | admin | C | No mutar permisos |
| 11 | M17 | +2.5 | alto | Twilio | alto | Ya hay link |
| 12 | M20 | +2.5 | medio | M7/M11 | bajo | No es fuente |
| 13 | M0 | +2.5 | alto | — | alto | Gates ≠ respuesta |
| 14 | M18 | +5.0 teórico | alto | WhatsApp | alto | Blocker de API vigente |

No se eligió M4 por ser «el siguiente número». M6 no ganó pese a tools ya declaradas.

---

## 9. Ganador

**M4 — Clasificación de apoyos (lectura de matriz comparativa)**

| Campo | Valor |
|---|---|
| Estado actual | NO INTEGRADA |
| Estado objetivo | COMPLETE de la consulta canónica read-only de la matriz (`GET /clasificacion-apoyos` / `buildClasificacionMatrix`) |
| Ganancia | **+5.0 pp** (8.5 → 9.5 / 20 = **47.5%**) si COMPLETE = esa lectura |
| Por qué primero | Único NOT_STARTED con fuente JSON SELECT-only, authz GV/`priv_clave` ya en el handler, `planta_id` + dos YYYY-MM (infra M3/M9), sin Twilio/S3/migration, y P(COMPLETE) alta si se aplica el mismo corte write que M9 aplicó al forecast. |
| Valor ejecutivo | Parte 7: 3 / Baja-Media para «solo lectura matriz». Inferior a Kanban/IGF, pero esos no cierran COMPLETE en un slice. Superior a Health (1) y Weekly LD (2). |
| Delta físico | Extraer query + `buildClasificacionMatrix` a lib in-process; capability `clasificacion_apoyos` → readable; tool nueva o mapping; intent/planner (hoy solo `UNSUPPORTED_RULES`); rama chat **antes** de OpenAI; reaplicar GV/`priv_clave`/`plantas_permitidas`; periodos A≠B sin inventar; evidencia de matriz; tests; **no** POSTs COMPARAR; **no** Excel file; **no** HTTP interno; **no** cycle. |
| Path | pregunta de clasificación/comparativo mensual → intent (a crear o mapear) → tool → executor → `buildClasificacionMatrix` / SELECT folios → respuesta. |
| Riesgos | Definir COMPLETE ≠ reconciliación Excel; `priv_clave` / privados; no afirmar causalidad de celdas; no ejecutar COMPARAR. |
| Blockers | Ninguno para un IMPL read-only **después** de fijar COMPLETE. La pregunta abierta es exactamente esa frontera. |
| Gates NEXT_TASK | G1 humano; G2 N/A; G3 N/A; G8 N/A |

### Evidencia física del ganador

- Ficha M4: no consulta matrices ni Excel; COMPARAR es escritura ALTO.
- Parte 7: «Clasificación de apoyos (solo lectura matriz)» es integración de lectura explícita.
- `GET /api/dashboard/clasificacion-apoyos` (L6520–6551): `dashboardBlockGVForbidden`; `mes_a`/`mes_b` YYYY-MM distintos; `planta_id`; `SELECT` `public.folios`; `buildClasificacionMatrix`; JSON `{ ok, ...matrix }`.
- `GET /clasificacion-apoyos/detalle` (L6564): desglose de celda, misma familia lectora.
- POSTs COMPARAR (L6055+): `fileBase64` obligatorio; GA 403; escriben. Fuera de COMPLETE, como `delta-ingreso-forecast` en M9.
- Capability `clasificacion_apoyos`: `canRead: false`; `UNSUPPORTED_RULES` bloquea «clasificación de apoyos» / «comparar clasificación».
- Registry: **no** hay tool `get_clasificacion*`.
- `director-ia-m9-deltas.js` / M3: patrón de loader + periodos + `planta_id` reutilizable; no se toca código en esta tarea.
- `director-ia-real-cycle.js`: no debe entrar M4.

---

## 10. Segundo lugar y por qué pierde

**M6 — GASTOS / INVERSIONES**

| Campo | Valor |
|---|---|
| Ganancia | +5.0 teórico; **+2.5 realista** (un slice creíble deja PARTIAL si COMPLETE se lee como «export Excel») |
| P(COMPLETE) | Media-baja hasta fijar query-vs-xlsx y las dos categorías |
| Por qué pierde | El único contrato HTTP es `GET /categoria-rango-excel` que **escribe un .xlsx** (L5998–6010). La query SELECT + `buildDashboardWhere` (M3) existe, pero no hay JSON de producto. `expense_analysis` / `investment_analysis` y tools con `executor: null` son un plus (más «M9-like» en wiring), pero Parte 8 documenta que «gastos» activa IGF. M9 enseñó a interceptar intents; no elimina esa colisión. Valor 4 > M4 (3), insuficiente frente a menor P(COMPLETE) y penalización Excel. |

M1 no es segundo: misma ganancia dudosa, valor 1, y la regla «no elegir Health por facilidad» sigue vigente.

---

## 11. COMPLETE feasibility

**Sí**, M4 puede alcanzar COMPLETE en un único slice **si** COMPLETE se fija como:

- consulta autorizada, read-only, in-process, de la matriz comparativa de dos YYYY-MM por planta;
- misma semántica que `GET /clasificacion-apoyos` (+ detalle de celda si cabe);
- sin COMPARAR, sin archivo Excel, sin mutar folios, sin cycle, sin HTTP interno.

COMPLETE **no** exigiría: reconciliación Excel, POSTs COMPARAR, xlsx de clasificación, ni igualar `sources` GET.

Queda abierto (por eso **readiness**, no IMPL):

1. ¿COMPLETE es solo la matriz, o también el detalle de celda?
2. ¿Default de `mes_a`/`mes_b` (¿dos más recientes con `mes_cargo`, patrón M9)?
3. ¿`priv_clave` / folios `solo_zp_ad` en chat?
4. ¿Hace falta tool nueva o basta capability + loader?
5. ¿«comparar clasificación» en `UNSUPPORTED_RULES` se retira solo para lectura?

Esas preguntas caben en una auditoría. No requieren G2/G3.

---

## 12. Dependencias y riesgos del ganador

**Dependencias**

- `public.folios` + `mes_cargo` + categoría.
- JWT + `planta_id` + `buildClasificacionMatrix` / `resolvePlantasComparativo`.
- Authz GV + `priv_clave` ya en el GET.
- Helpers hoy en `lib/clasificacion-apoyos-excel.js` + handler en `server.js`.

**No depende de:** S3, Twilio, ARR upload, migrations, schema nuevo, cycle, M19.

**Riesgos**

- Semántico: presentar la matriz como reconciliación Excel o como COMPARAR ejecutado.
- `priv_clave` / privados mal expuestos.
- Amplitud si la readiness mete COMPARAR.
- Productivo: bajo si se mantiene read-only; alto si se reutiliza un POST COMPARAR.

---

## 13. ¿Readiness o IMPL?

**Readiness.**

El gap no está completamente determinado: frontera lectura vs COMPARAR/Excel, defaults de periodos, `priv_clave`, y si el detalle de celda entra en el mismo slice.

No IMPL directo.

---

## 14. NEXT_TASK y gates

Exactamente uno, **no autorizado, no ejecutado**:

**`ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001`**

| Gate | Valor | Motivo |
|---|---|---|
| G1 | requerido | Autorizar la auditoría M4 |
| G2 | N/A | Cabe en arquitectura existente (capability + loader chat) |
| G3 | N/A | Contratos actuales bastan |
| G8 | N/A | Sin calibración material |

---

## Acciones no realizadas

- No implementación.
- No runtime, frontend, backend, tests, SQL, matriz, contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó el NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

```text
On branch architecture/director-ia-next-module-prioritization-004
Changes not staged for commit:
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md
```

Solo `CURRENT_TASK.md` y este reporte. Sin cambios de código, matriz ni contratos.

## STOP
