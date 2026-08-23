# Reporte — ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005"
outcome: "STOPPED"
determination: "NO_COMPLETE_READY_WINNER"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: >
  CURRENT_TASK exige un ganador con probabilidad razonable de COMPLETE
  y a la vez permite STOPPED si ningún candidato puede priorizarse sin
  decisión contractual. Se aplica STOPPED: no hay COMPLETE canónico
  cerrable en un slice sin reinterpretar un propósito (G2).
deviations_from_current_task: []
next_task_proposed: "none until human review (STOPPED; no autoriza G1 ni encadena)"
secrets_check: "none (se vio CLASIFICACION_PRIV_CLAVE / priv_clave en server.js; no se copia)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED de esta priorización."
  - "Decidir si se acepta el plateau 42.5%, se autoriza un slice PARTIAL (M6) a sabiendas, o se abre G2 para redefinir COMPLETE de algún módulo."
  - "No hay NEXT_TASK autorizable como path a COMPLETE."
```

## Resumen ejecutivo

Baseline recalculado desde las fichas vigentes: **8.5 / 20 = 42.5%**. El 42.5% de `CURRENT_TASK.md` **no se asumió**. M19 sigue N_A. M4 **sigue NO INTEGRADA** (0.0): la readiness no implementó nada.

La hipótesis de 004 (M4 lectura JSON = COMPLETE +5.0 pp → 47.5%) está **falseada**. No se vuelve a seleccionar M4 como COMPLETE read-only. No se otorga +5.0 pp a esa hipótesis.

Aprendizaje aplicable a todos los NOT_STARTED restantes: **no premiar +5.0 pp si el propósito canónico incluye Excel/export, COMPARAR/escritura, envío WhatsApp o carga**. 003 ya lo había dicho; 004 lo relajó; M4-READINESS lo confirmó.

Tras aplicar esa regla **no queda ningún módulo con path realista a COMPLETE** en un único slice sin reinterpretar el contrato. Eso no es un empate: es un plateau.

| Concepto | Valor |
|---|---|
| Baseline | **8.5 / 20 = 42.5%** |
| Ganancia de esta priorización | **0.0 pp** |
| Ganador COMPLETE | **Ninguno** |
| +5.0 / 47.5% | **Rechazado** para M4 y para cualquier gemelo (M5/M6/M10) |
| Residual más valioso si un humano acepta PARTIAL | M6 query de listados (**+2.5 pp → 45.0%**, etiqueta PARCIAL) |

**STOPPED.** No se elige un ganador falso. No se propone IMPL. No se propone una readiness que repita la hipótesis COMPLETE de 004.

---

## Ejecución

- Rama: `architecture/director-ia-next-module-prioritization-005` (≠ `main`).
- HEAD: `bdd4e6f4 Merge branch 'architecture/director-ia-m4-clasificacion-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T13:55:52-06:00`.
- G2/G3/G8: `N/A` (esta priorización no cambia contratos).
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `STOPPED`.
- `max_attempts: 1`. Sin implementación. Sin COMPARAR. Sin Excel. Sin commit/push/merge. Sin NEXT_TASK.

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

M0–M20 = 21 módulos. **M19 = N_A** (sistema paralelo; convención 002/003/DOCS-M9) → denominador **20**.

| Grupo | Módulos | Peso |
|---|---|---|
| COMPLETE | M3, M9, M13, M16 | 4.0 |
| PARTIAL | M0, M1, M2, M7, M8, M11, M12, M17 | 4.0 |
| INDIRECTA | M20 | 0.5 |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 | 0.0 |
| N_A | M19 | excluido |
| **Total** | | **8.5 / 20 = 42.5%** |

Ninguna ficha cambió de etiqueta desde 004/DOCS-M9. M4 no suma: no se implementó.

---

## 2. Impacto de M4 PARTIAL_ONLY

Fuente: `docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md`.

| Hecho | Consecuencia para 005 |
|---|---|
| Módulo vigente = «Clasificación de apoyos **+ COMPARAR**» | El nombre no es recortable |
| Propósito = comparativo mensual **y** reconciliación Excel | La lectura JSON cubre solo la primera cláusula |
| Parte 7 «solo lectura matriz» = subconjunto Baja-Media | No es COMPLETE del módulo |
| GET matriz es SELECT-only e in-process viable | Útil como PARTIAL (+2.5), no como COMPLETE (+5.0) |
| COMPARAR write = clase C | No entra a Director IA |
| M4 documentalmente NO INTEGRADA | Peso 0.0 |

Regla que 005 aplica al resto: **si el propósito canónico nombra Excel/export, reconciliación, envío o carga, un slice JSON no es COMPLETE**. 004 usó el corte write de M9 (forecast fuera) para sacar COMPARAR de M4; M4-READINESS demostró que ese corte **no** aplica cuando el propósito ya incluye esa cláusula.

M4 **no reaparece** como candidato COMPLETE read-only. Una estrategia distinta (COMPARAR/Excel honestos) exigiría clase C o G2; no se evalúa como ganador.

---

## 3. Estado M0–M20 (matriz vigente)

| ID | Módulo | Estado matriz | Peso | Compite | ¿COMPLETE en un slice? |
|---|---|---|---|---|---|
| M0 | Auth / permisos | PARCIAL | 0.5 | sí | no (gates ≠ dominio de respuesta) |
| M1 | Health | PARCIAL | 0.5 | sí | dudoso (`/health-proyectos` global vs M3) |
| M2 | Kanban / Folios | PARCIAL | 0.5 | sí | no (un estatus deja PARTIAL; GET mutan) |
| M3 | Plantas / KPIs / Proyectos | COMPLETA | 1.0 | no | — |
| M4 | Clasificación + COMPARAR | NO INTEGRADA | 0.0 | no como COMPLETE read-only | no (PARTIAL_ONLY) |
| M5 | Taller AT | NO INTEGRADA | 0.0 | sí | no (propósito = Excel + hoja duplicados) |
| M6 | GASTOS / INVERSIONES Excel | NO INTEGRADA | 0.0 | sí | no (propósito = Export; query = PARTIAL) |
| M7 | IGF Forecast | PARCIAL | 0.5 | sí | no (annex ya existe; COMPLETE = UI/versiones/`sources`) |
| M8 | ARR | PARCIAL | 0.5 | sí | no (propósito incluye carga; `POST /arr/load` = C) |
| M9 | Deltas UI | COMPLETA | 1.0 | no | — |
| M10 | Weekly discount LD | NO INTEGRADA | 0.0 | sí | no (propósito incluye envío WhatsApp = C) |
| M11 | DICF + comentarios | PARCIAL | 0.5 | sí | no (ya primaria; COMPLETE = límites/attachments) |
| M12 | Action Register | PARCIAL | 0.5 | sí | no (ya primaria; propósito incluye notas/evidencias) |
| M13 | Director IA propio | COMPLETA | 1.0 | no | — |
| M14 | Usuarios admin | NO INTEGRADA | 0.0 | sí | no (administrar = write; C) |
| M15 | Documentos / media | NO INTEGRADA | 0.0 | sí | no (S3 + superficie documental) |
| M16 | Duplicados | COMPLETA | 1.0 | no | — |
| M17 | WhatsApp bridge | PARCIAL | 0.5 | sí | no (link ya existe; resto = Twilio) |
| M18 | Presupuestos semanales | NO INTEGRADA | 0.0 | sí | no (carro semanal sin API; `presupuesto-detalle` es otro uso) |
| M19 | Delta Ingreso AI test | N_A | — | no | no integrar |
| M20 | Home KPI | INDIRECTA | 0.5 | sí | no (página ≠ fuente) |

Ganancias teóricas: PARTIAL/INDIRECTA → COMPLETE = **+2.5 pp**. NOT_STARTED → COMPLETE = **+5.0 pp**. NOT_STARTED → PARTIAL = **+2.5 pp** (no se puntúa como COMPLETE).

---

## 4. Profundización M6 (segundo lugar de 004)

### Definición canónica

| Campo | Texto vigente |
|---|---|
| ID / nombre | M6 — **GASTOS / INVERSIONES (rango Excel)** |
| Propósito | **Export** por categoría y ventana de meses |
| Cobertura | NO INTEGRADA |
| Sí consulta | Ninguna de este Excel. «gasto(s)» en chat puede activar IGF (`PLANT_FINANCIAL_KPI_RE`) = INDIRECTA, no este módulo |
| No consulta | Listados GASTOS/INVERSIONES de folios del Excel |
| Lectura posible | CONSULTAR / RESUMIR / DESCARGAR DOCUMENTO (no cableadas) |
| Escritura | N/A en este módulo |
| Parte 7 | «GASTOS/INVERSIONES (**query, no solo xlsx**)» valor 4 / Media — integración *preferida*, no redefinición del propósito «Export» |
| Parte 3 | Fuente GASTOS: no puede concluirse el listado de folios GASTOS del Excel |

Aplicar M4: el propósito **es** el export. Parte 7 nombra un subconjunto (query). Una consulta JSON de listados es **PARTIAL**, no COMPLETE. Premiar +5.0 sería la misma hipótesis falseada.

### Superficie física

| Pieza | Evidencia |
|---|---|
| Único contrato HTTP | `GET /api/dashboard/categoria-rango-excel` (`server.js` 5908–6017) |
| Respuesta | **xlsx** (`Content-Type` spreadsheet; `res.send(buf)`). **No hay** GET JSON de producto |
| Método | GET; side effects: ninguno en DB (solo genera archivo) |
| Query | `categoria=GASTOS\|INVERSIONES`, `mes_desde`/`mes_hasta` YYYY-MM obligatorios, `planta_id` opcional |
| Authz | JWT + `dashboardBlockGVForbidden`; `priv_clave` vía `clasificacionIncluyePrivados` |
| SQL | `buildDashboardWhere` (infra M3) + filtro categoría + no CANCELADO; GASTOS excluye TALLER e INVERSION |
| Helper estructurado | `expandCategoriaRows` (`lib/categoria-rango-excel.js` 98–154): explota `detalle_lineas` o cae a `importe`/`concepto` |
| Workbook | `buildCategoriaRangoWorkbook`: hojas Resumen (subcategoría × meses), detalle por mes, **Duplicados** |
| Fuente primaria | `public.folios` (no hay tablas `gastos_*`) |

`expandCategoriaRows` **sí** es una fuente estructurada reutilizable. El xlsx es empaquetado de esas filas. Eso habilita un loader in-process (patrón M3/M9). **No** convierte el propósito «Export» en COMPLETE.

### Planner / tools / IGF

| Pieza | Estado |
|---|---|
| Intent `expense_analysis` | Existe (`director-ia-planner.js`); label «Gastos de folios» |
| Intent `investment_analysis` | Existe |
| Tools `get_expense_analysis` / `get_investment_analysis` | Declaradas; `executor: null`; sourceFiles apuntan al Excel |
| Capabilities `gastos` / `inversiones` | `coverage: none`, `canRead: false` |
| `UNSUPPORTED_RULES` | Bloquea «gastos»+folio/excel y «inversiones»+listado/export |
| Colisión IGF | `PLANT_FINANCIAL_KPI_RE` incluye `gasto(s)` (`director-ia-igf-arr.js` 50–51). Una pregunta «gastos» sin «folio/excel» cae al anexo IGF, no a M6 |

M9 enseñó a interceptar intents **antes** de IGF. Eso mitiga la colisión si el intent es `expense_analysis`. **No** elimina el riesgo: el regex IGF es más ancho que `UNSUPPORTED_RULES.gastos`.

### ¿Las dos familias caben en un slice?

Técnicamente **sí** para un PARTIAL: el mismo GET/helper ya parametriza `categoria`. Un loader podría exponer GASTOS e INVERSIONES (como M9 hizo tres familias). Contractualmente eso sigue siendo **PARTIAL del módulo Excel**, no COMPLETE.

Taller AT **no** cabe en M6 (es M5; el SQL de GASTOS lo excluye). `get_expense_analysis` hoy lista también `taller-at-excel` — mezclar M5+M6 en un tool sería semánticamente peor.

### Determinación M6

| Pregunta | Respuesta |
|---|---|
| ¿Excel inseparable de COMPLETE? | **Sí** (el propósito es Export; el módulo se llama Excel) |
| ¿Query JSON = COMPLETE? | **No** (lección M4) |
| ¿Ganancia real si se implementara la query? | **+2.5 pp → 45.0%**, etiqueta PARCIAL |
| ¿+5.0 / 47.5%? | **No** |
| ¿DOCS COMPLETE? | **No** |
| ¿Elegir M6 como ganador COMPLETE? | **No** |

---

## 5. Rechecks especiales

### M1 Health

Propósito: monitoreo de servicio y DB. Ya consulta `/health-director-ia` (PARTIAL). Ficha: no se declara COMPLETA porque faltan `/health`, `/health-db`, `/health-proyectos`.

`/health` y `/health-db` son triviales y **sin JWT**. `/health-proyectos` (`server.js` 5165–5178) agrega `public.proyectos` **global, sin planta ni JWT**, incompatible con COMPLETE M3 (proyectos del scope). Incluirlo en M1 COMPLETE filtra o choca. Excluirlo para facilitar COMPLETE sería recortar la propia ficha («dominio Health de producto» lista los tres). Valor ejecutivo **1 / Baja**. Principio vigente: no elegir Health solo por esfuerzo bajo. **No gana.**

### M2 Kanban / Folios

Valor 5. Sigue PARTIAL (solo comentarios). Tools `get_folio_status` / history / documents / financial `executor: null`.

`GET /api/dashboard/kanban` (L5410–5423) y `GET /api/folios/:id` (L12672) llaman `maybeAdvanceFolioToComprobaciones`. Extraer SELECT, no reutilizar esos GET. Un slice de estatus no cierra kanban + historial + docs + cheque/póliza + evidencias. COMPLETE del propósito («flujo operativo por etapas») no es read-only de un folio. Dependencia M18 (carro). **No.**

### M7 IGF / M8 ARR

Annex on-demand ya consulta forecast/proyección. `EMPTY_SOURCES.igf` y `.arr` siempre `false` (`director-ia-context.js` 22–24). Igualar `sources` es hallazgo crítico Parte 8, **no** COMPLETE de módulo. M7 COMPLETE exigiría UI/versiones/meta/metahg/`igf-folios-detalle`. M8 propósito incluye **carga**; `POST /api/arr/load` = C. **No.**

### M11 DICF / M12 Action Register

Ya son fuente primaria. M11: límite 40 detalles / 80 comentarios; no attachments. M12: `includeNotes: false`; top-N; no evidencias binarias. El propósito de M12 nombra **notas y evidencias**. Quitar límites o añadir CRUD no es un slice read-only acotado; es redefinir COMPLETE. Siguen PARTIAL. **No.**

### M17 WhatsApp

El comando ya genera JWT + URL `/director-ia`. COMPLETE del propósito («comandos de negocio y URLs») choca con Twilio como fuente. Penalizado. **No.**

### M20 Home KPI

INDIRECTA: no llama `app/page.tsx`; comparte M7/M11. Cerrar la página no añade fuente. Valor 2. **No.**

### Restantes NOT_STARTED

| Módulo | Por qué no +5.0 |
|---|---|
| M5 | Propósito = «Excel de gasto taller… con hoja de duplicados». Peor que M6 (solo xlsx; «Taller» ≠ AR). |
| M10 | Propósito = narrativa **+ envío** WhatsApp. `weekly-discount-lectura` es JSON; el envío es C. Narrativa sola = PARTIAL. Solapa M9 descuento. |
| M14 | Administrar usuarios/permisos. Escritura C. |
| M15 | Cotización/facturas/póliza/S3. |
| M18 | Propósito = carro semanal. `GET /presupuesto-detalle` y `POST /presupuesto-comparar` (L15725–15773) son **otro uso** (asignación mensual categoría/subcategoría), no el carro. SQL del carro sigue embebido en `server.js` + WhatsApp. Blocker vigente. |

M19: sigue N_A. Rutas test sin `dashboardAuthMiddleware`. No se absorbe.

---

## 6. Tabla comparativa

| module | canonical_purpose | canonical_complete_requirement | current_state | potential_gain_pp | executive_value | existing_backend | existing_intent_or_tool | primary_source | authz_ready | plant_scope | dependencies | external_dependency | mutation_risk | db_change | estimated_effort | testability | semantic_risk | can_reach_complete_in_one_slice | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 | Auth/planta | Catálogo de permisos como respuesta | PARTIAL | +2.5 teórico | bajo | `dashboard-auth.js` | `get_user_permissions` es M14 | `usuarios`/`roles` | gates sí | sí | todo el dashboard | no | no (si solo lee) | no | alto | media | alto | no | Ficha: no es dominio de respuesta |
| M1 | Servicio y DB | `/health` + `/health-db` + `/health-proyectos` (ficha) | PARTIAL | +2.5 dudoso | 1 / Baja | 4 GET health | no tool chat | process + `pool` + `proyectos` global | `/health*` sin JWT | **no** en proyectos | ninguna de negocio | no | no | no | bajo | alta | medio (`ready` ≠ saludable; vs M3) | dudoso | L5150–5178; ficha M1 |
| M2 | Flujo por etapas | Kanban+estatus+historial+docs | PARTIAL | +2.5 teórico | 5 / Alta | kanban, `/folios/:id`, timeline | `folio_status` `executor:null` | `public.folios` | JWT+GV | sí | M18 | no | **GET kanban y `:id` mutan** | no | alto | media | alto | no | L5410–5423; L12672 |
| M4 | Comparativo + reconciliación Excel | Matriz **y** COMPARAR/Excel | NOT_STARTED | +5.0 **rechazado**; +2.5 si PARTIAL | 3 / Baja-Media | GET matriz JSON; POSTs write | unsupported; sin tool | `public.folios` | GV; `priv_clave` | `planta_id` + fallback | Folios | archivo solo COMPARAR | COMPARAR write | no | medio | alta (JSON) | medio | **no** (PARTIAL_ONLY) | Readiness 001 |
| M5 | Excel taller + duplicados | El Excel (y hoja duplicados) | NOT_STARTED | +5.0 teórico / +2.5 real | 3 / Media | `GET /taller-at-excel` xlsx | `taller_at` → `expense_analysis` | `public.folios` | GV; `priv_clave` | sí | homologación AT | no | no | no | medio-alto | baja | alto («Taller»=AR) | no | L5807–5901; ficha M5 |
| M6 | Export categoría × meses | El export Excel | NOT_STARTED | +5.0 **rechazado**; +2.5 si query PARTIAL | 4 / Media | GET xlsx; `expandCategoriaRows` | intents+tools `executor:null` | `public.folios` | GV; `priv_clave` | `planta_id` opcional | Folios | no (xlsx es respuesta) | no en GET | no | medio | media si se extrae JSON | **alto** (IGF «gasto») | **no** (lección M4) | L5908–6017; ficha M6 |
| M7 | Forecast IGF | UI/versiones/meta + `sources.igf` | PARTIAL | +2.5 teórico | 5 annex | annex + `/igf-*` | `get_igf_snapshot` | `igf.*` | `acceso_igf_forecast_kpis` | sí | ARR | no | PATCH existe | no | alto | media | medio | no | `EMPTY_SOURCES.igf` |
| M8 | Carga + forecast ARR | Incluye carga | PARTIAL | +2.5 teórico | 5 | annex + `/api/arr/*` | `get_arr_snapshot` | `arr.*` | GA commercial_state | sí | upload ARR | no | `POST /arr/load` | no | alto | media | medio | no | propósito «Carga»; C |
| M10 | Narrativa + envío WA | Incluye envío | NOT_STARTED | +5.0 teórico / +2.5 narrativa | 2 / Baja | `POST /weekly-discount-lectura` | no tool | ARR | GA/GV | nombre planta | ARR, Twilio | **Twilio** | scheduler envía | no | bajo (narrativa) | alta | medio (solapa M9) | no | ficha M10; scheduler |
| M11 | DICF + comentarios | Sin top-N + attachments | PARTIAL | +2.5 teórico | 5 | summarizers | tools already | `arr.dicf_*` | `acceso_acciones_dicf` | sí | ARR | no | CRUD dashboard | no | alto | media | medio | no | límites 40/80 |
| M12 | Tablero + notas + evidencias | Notas y evidencias | PARTIAL | +2.5 teórico | 5 | board + summarizers | tools already | `arr.action_register_*` | `acceso_acciones_dicf` | sí | Plantas | no | CRUD | no | alto | media | medio | no | `includeNotes: false` |
| M14 | Administrar usuarios | Write permisos | NOT_STARTED | +5.0 teórico | 2 / Baja | `/usuarios-admin*` | `user_permissions` | `usuarios` | clave admin | global | Auth | no | **C** | no | medio | media | alto | no | Parte 9 C |
| M15 | Docs/media folio | Superficie documental | NOT_STARTED | +5.0 teórico / +2.5 real | 4 | `/media`, documentos | `folio_documents` | `folio_archivos`, S3 | GV | sí | Folios, S3 | **S3** | subir póliza | no | alto | baja | medio | no | ficha M15 |
| M17 | Comandos + URLs WA | Canal Twilio | PARTIAL | +2.5 teórico | — | comando + Twilio | capability `whatsapp` | Twilio | tokens query | — | Twilio | **Twilio** | bot | no | alto | baja | medio | no | link ya existe |
| M18 | Carro semanal | Solicitudes/asignación semanal | NOT_STARTED | +5.0 teórico | 4 / Media-Baja | SQL embebido; detalle/comparar = otro uso | `budget_status` `executor:null` | `presupuesto_*` | GG / GA block | nombre planta | Folios, WhatsApp | WhatsApp | ALTO si envía cheques | no | alto | baja | alto | no | L15725–15773 ≠ carro |
| M20 | Página Home | Composición de `/` | INDIRECTA | +2.5 teórico | 2 / Baja | comparte M7/M11 | no | mismas M7/M11 | igual | — | M7/M11 | no | no | no | medio | media | medio | no | ficha M20 |

---

## 7. Blockers revalidados

| Blocker | Estado 005 |
|---|---|
| M4 COMPARAR/Excel para COMPLETE | **Confirmado y ampliado:** también bloquea la hipótesis JSON=COMPLETE. No bloquea un PARTIAL de matriz (no seleccionado). |
| M2 GET con side effects | **Sigue.** Kanban L5410–5423 y `:id` L12672. |
| M10 envío WhatsApp | **Sigue.** Propósito bicláusula; envío = C. |
| M18 API del carro | **Sigue.** `presupuesto-detalle` / `presupuesto-comparar` no son el carro. |
| M19 N_A | **Sigue.** No integrar. |
| M6 xlsx = único HTTP | **Sigue** y ahora **cierra COMPLETE** (lección M4). No cierra un PARTIAL de query. |
| M1 `/health-proyectos` vs M3 | **Sigue.** |

No se intentó resolver ninguno.

---

## 8. Ranking

Criterios: P(COMPLETE canónico), ganancia **real**, valor ejecutivo, lección M4, reutilización M3/M9, dependencias, mutación, Excel/externos, semántica. Sin score opaco. Sin reutilizar el ranking 004.

| # | Módulo | Ganancia real | P(COMPLETE) | Por qué esa posición |
|---:|---|---|---|---|
| — | **Ninguno COMPLETE** | 0.0 | — | No hay slice que cierre un propósito vigente |
| 1 residual | M6 query | +2.5 PARTIAL | baja para COMPLETE | Mayor valor (4) e intents/tools/helper; COMPLETE exige Export |
| 2 residual | M4 matriz | +2.5 PARTIAL | nula para COMPLETE | Ya auditado; no repetir |
| 3 residual | M5 | +2.5 PARTIAL | nula | Excel + «Taller»≠AR |
| 4 residual | M10 narrativa | +2.5 PARTIAL | nula | Envío en el propósito; solapa M9 |
| 5 | M1 | +2.5 dudoso | dudosa | Valor 1; health-proyectos vs M3 |
| 6 | M7/M8 | +2.5 teórico | baja | Ya on-demand |
| 7 | M11/M12 | +2.5 teórico | baja | Ya primaria |
| 8 | M2 | +2.5 teórico | nula en un slice | GET muta; propósito amplio |
| 9 | M15 | +2.5 | nula | S3 |
| 10 | M18 | +5.0 teórico | nula | Carro sin API |
| 11 | M14 | +2.5 | nula | C |
| 12 | M17 | +2.5 | nula | Link existe |
| 13 | M20 | +2.5 | nula | No es fuente |
| 14 | M0 | +2.5 | nula | Gates |

No se eligió M6 por ser el número siguiente ni por los intents ya declarados. Los intents no cambian el propósito «Export».

---

## 9. Ganador

**Ninguno.**

No hay módulo restante cuya definición canónica de COMPLETE pueda cubrirse en un slice razonable sin reinterpretar el contrato (G2) o ejecutar clase C.

| Campo | Valor |
|---|---|
| Estado objetivo COMPLETE | Inalcanzable en un slice actual |
| Ganancia real de 005 | **0.0 pp** (baseline permanece **42.5%**) |
| Por qué no hay ganador | Lección M4 + revalidación física: todo NOT_STARTED con +5.0 teórico tiene Excel/export, envío, carga, S3, write o API ausente. Todo PARTIAL con +2.5 teórico ya consulta su fuente o exige UI/límites/CRUD/Twilio/health-proyectos. |
| Valor ejecutivo de no elegir | Evita otro ciclo 004→readiness→PARTIAL_ONLY que no mueve COMPLETE |
| Feasibility COMPLETE | **No** para ningún candidato actual |
| Gates | G2 solo si un humano redefine COMPLETE de algún módulo. Esta tarea no lo pide. |

### Segundo lugar (por qué «pierde» el residual M6)

**M6** sería el residual más valioso si el humano aceptara trabajo PARTIAL. **Pierde como ganador COMPLETE** porque:

1. El propósito vigente es **Export**, el módulo se llama **Excel**, y el único HTTP escribe un **xlsx**.
2. `expandCategoriaRows` habilita consulta, no COMPLETE (simétrico a `buildClasificacionMatrix` en M4).
3. Colisión «gastos» → IGF.
4. Parte 7 «query, no solo xlsx» es subconjunto, no licencia para +5.0.
5. Elegirlo como COMPLETE repetiría 004.

M1 no es segundo residual: misma ganancia dudosa, valor 1.

---

## 10. Delta físico (solo si un humano pidiera PARTIAL M6; no se implementa)

```text
pregunta listado GASTOS o INVERSIONES de folios / rango de meses
  → intent expense_analysis | investment_analysis (ya existen)
  → retirar UNSUPPORTED solo para esos intents
  → interceptar ANTES de PLANT_FINANCIAL_KPI_RE
  → tool get_expense_analysis / get_investment_analysis
  → loader in-process
       → authz GV; planta_id del scope; no priv_clave de chat
       → mes_desde/mes_hasta o fail-closed (no inventar)
       → misma SELECT que categoria-rango-excel + expandCategoriaRows
       → JSON (resumen subcategoría × mes + listado); no xlsx
  → respuesta; openai_called false
```

In-process: sí. Sin HTTP interno. Sin cycle. Sin generar Excel. Sin COMPARAR. Resultado contractual: **PARCIAL**. Archivos probables: `lib/director-ia-m6-*.js` nuevo; planner/tools/capabilities/chat; tests. **No** se implementa. **No** se propone `IMPL-DIRECTOR-IA-M6-*-001` como COMPLETE.

---

## 11. Dependencias y riesgos (si hubiera residual M6)

**Dependencias:** `public.folios`, `buildDashboardWhere` / equivalentes de planta, `expandCategoriaRows`. Sin S3, Twilio, migration, ARR upload.

**Riesgos:** afirmar que el listado es el export reconciliado; confundir gasto IGF con folios GASTOS; mezclar Taller AT; `priv_clave`; `planta_id` omitido → más plantas de las del scope.

**Fit:** un PARTIAL cabe en arquitectura existente (G2/G3 N/A). Declarar COMPLETE de M6 con solo JSON **exigiría G2**.

---

## 12. COMPLETE feasibility

**No** hay feasibility COMPLETE para un ganador.

| Módulo tentado | ¿COMPLETE en un slice? |
|---|---|
| M4 JSON | No (ya auditado) |
| M6 query | No |
| M1 health | Dudoso / no sin resolver health-proyectos vs M3 |
| M2/M7/M8/M11/M12/M17/M20 | No |
| M5/M10/M14/M15/M18 | No |

---

## 13. NEXT_TASK

**Ninguna.**

No `ARCH-DIRECTOR-IA-M6-*-READINESS-001` (el gap COMPLETE de M6 **ya** está determinado en esta priorización: PARTIAL_ONLY).  
No `IMPL-DIRECTOR-IA-*-001`.  
No otra priorización 006 encadenada.  
No reabrir M4.

El humano, fuera de esta ejecución, puede: (a) aceptar 42.5%; (b) autorizar más adelante un PARTIAL M6 a sabiendas; (c) abrir G2 para redefinir COMPLETE de algún módulo. Eso no se autoriza ni se ejecuta aquí.

| Gate | Valor |
|---|---|
| G1 | requerido solo para *esta* auditoría (ya usado) |
| G2 | N/A en 005; G2 solo si un humano quisiera redefinir COMPLETE |
| G3 | N/A |
| G8 | N/A |

---

## Acciones no realizadas

- No código, tests, scripts, runtime, frontend, SQL, matriz, contratos.
- No COMPARAR. No Excel. No escrituras.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- No se eligió un ganador COMPLETE ficticio.

## secrets_check

none en el reporte.

## git diff --check

limpio (exit 0, sin output)

## git status

```text
On branch architecture/director-ia-next-module-prioritization-005
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md

no changes added to commit (use "git add" and/or "git commit -a")
```

HEAD: `bdd4e6f4 Merge branch 'architecture/director-ia-m4-clasificacion-readiness-001'`

## STOP
