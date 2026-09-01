# SPRINT1-DIRECTOR-IA-COMMERCIAL-KNOWLEDGE-CONSISTENCY-HUMAN-REVIEW-AUDIT-001

```yaml
audit_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-KNOWLEDGE-CONSISTENCY-HUMAN-REVIEW-AUDIT-001
tipo: DEEP READ-ONLY POST-DEPLOY AUDIT
outcome: INFORME
current_task_untouched: true
current_task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001
current_task_status: DONE_PENDING_REVIEW
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-KNOWLEDGE-CONSISTENCY-HUMAN-REVIEW-AUDIT-001.md
files_not_touched:
  - código
  - tests
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-AUDIT-001.md
  - docs/director-ia/
git_write: none
implementation: none
secrets_check: none
```

Clasificación: **PROVEN** | **PARTIALLY_PROVEN** | **NOT_PROVEN** | **NOT_APPLICABLE**.

Método: lectura de módulos de producción + `node -e` de detectores. Sin SQL a producción. Sin dump de sesión. Las cifras de Erick (julio 4713.12 kg / agosto 307.26 kg; comentario 2026-08-12) se toman como **evidencia humana de producción** ya validada; no se re-consultó la DB.

Un informe **no** autoriza implementación. **No** declara CLOSED ni APPROVED.

---

## 1. Executive verdict

COMMENTS-001 **cumplió su contrato** en «¿Cómo vamos?»: movers verbalizan `Comentario registrado` y no lo convierten en causa. Eso está **PROVEN** en producción humana y no se reabre aquí.

Los dos incidentes nuevos **no nacen** de esa obligación verbal.

**Incidente A.** Tras «¿Cómo vamos?», «¿Qué sabemos de TORTILLERIA ERICK?» entra a **`client_profile`**, no a Commercial Movers. Esa ruta **sí consulta** `arr.cliente_comentarios`, pero **solo por `cliente_key` no vacía**. Movers usa **nombre + planta**. El pack del perfil, si no hay hit de key, escribe «ninguno para estas keys; missing != inexistencia global». El LLM verbalizó «no se han registrado comentarios». Eso es **falsa ausencia**: no había evidencia de ABSENCE_CONFIRMED.

**Incidente B.** `ACTUAL_TO_DATE = 0` el 1-sep es compatible con la regla de Dashboard: TOTAL mes **solo suma días cerrados**; si el corte es el día 1 del mes, `lastClosedDay = 0` y la suma de un vector inicializado en ceros es **0**. El pack etiqueta eso como venta observada (`se han vendido 0 t`). La frase «falta de actividad comercial significativa» **no existe** en código. Es síntesis libre del LLM sobre un 0 que **no** significa «cero venta confirmada en el mes».

**Boundary:** COMMENTS-001 no debe corregir esto. Son gaps **preexistentes** de `client_profile` y de semántica de corte. Decisión recomendada: **B**.

---

## 2. Observed production evidence

Validación humana (no re-probada aquí):

| Hecho | Estado |
|---|---|
| «¿Cómo vamos?» conserva Forecast / IGF / tendencias / movers / riesgos / ejecución | PROVEN (humano) |
| Erick: disminuyó −4.406 t + `Comentario registrado [2026-08-12]: «POR FALTA DE PIPAS»` | PROVEN (humano) |
| Grupo Move: −33.87 t + `COMPRA DIARIAMENTE` sin causalidad | PROVEN (humano) |
| Lista + comentarios → `commercial_trend` | PROVEN (humano + detector) |
| Mismo hilo: «¿Qué sabemos de TORTILLERIA ERICK?» → julio 4713.12 kg, agosto 307.26 kg, septiembre incompleto, «no se han registrado comentarios ni acciones» | PROVEN (humano). Esas kg coinciden con el delta de movers (4.713 t → 0.307 t). **PARTIALLY_PROVEN** que el perfil resolvió la **misma** identidad comercial de ventas. |
| 1-sep-2026: ACTUAL_TO_DATE = 0 t + «falta de actividad comercial significativa» | PROVEN (humano el texto). Mecanismo de 0: **PROVEN** en código si corte ∈ mes y día=1. Cutoff exacto de aquella sesión: **NOT_PROVEN**. |

---

## 3. Exact routing trace — «¿Qué sabemos de TORTILLERIA ERICK?»

Ejecutado `node -e` 2026-09-01:

```
DETECTED_INTENT = client_profile
FINAL_INTENT    = client_profile   confidence=0.88
domains         = [arr, dicf, cliente_comentarios]
inherit plant_diagnosis → sigue client_profile (no se traga)
isExecutiveStatusQuestion = false
need_type = null
shouldHandleExecutiveStatus = false
extractEntityHint = "Tortillería Erick"
```

**PROVEN.**

| Salto | Qué ocurre | Cita |
|---|---|---|
| user text | «¿Qué sabemos de TORTILLERIA ERICK?» | evidencia humana |
| normalize | NFD, minúsculas, sin `¿?` | `director-ia-client-profile.js` `normalizeQuestion` ~53–61 |
| detector perfil | `namesProfileContext`: `\bsabemos\b`; `hasNamedClientToken` | `isClientProfileQuestion` ~268–299; `namesProfileContext` ~250–251 |
| planner | `isClientProfileQuestion` **antes** de commercial_state / client_analysis | `director-ia-planner.js` ~439–440 |
| CEL | `isSpecializedStandaloneQuestion` incluye perfil → no EE | CEL ~249–250, ~1813–1821; `CEL_OVERRIDABLE` solo `unknown` / `plant_diagnosis` / `daily_executive_brief` ~31–35 |
| continuity | Tras «cómo vamos», `parent_intent=plant_diagnosis`, `active_entities=[]` | `director-ia-chat.js` `conversationStateForIntent` ~3193–3200 |
| inherit | `forceIntent` solo si inherit era ya `client_profile`. Aquí no. Planner gana. | chat ~3630–3658 |
| handler | `directorIaPlan.intent === "client_profile"` | chat ~4460–4490 |
| tools | **in-process**. No Tool Orchestrator. | `loadClientProfileForChat` |
| TOOLS_EXECUTED | `queryMonthlySales`, `queryMonthlyDiscount`, `queryCommentsByKeys`, `queryActionsByKeys`, `queryHistorialForActions` | profile ~803–937 |
| SOURCES_REQUESTED | `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.cliente_comentarios` **por key**, `arr.dicf_acciones` **por key** | profile header ~4–6; `queryCommentsByKeys` ~585–599 |
| SOURCES_NOT_REQUESTED | `loadRecentCommentsByClienteNombres` (nombre+planta); commercial-trend-engine; Action Register; bitácora; IGF/Forecast; `get_cliente_comentarios` tool | **PROVEN** por ausencia de llamadas |
| ENTITY_RESOLUTION | `extractEntityHint` / `entity_hint` → `exactNorm` vs `cliente_norm` de ventas → `deriveClienteKeys` (4 grupos DICF × canal/subcanal) | conversation-state ~704–707; profile ~868–881, ~367–375 |
| PLANT_SCOPE | `planta_id` del chat / UI anchor | profile `assertClientProfileAccess` + `resolvePlantaRow` |
| PERIOD_SCOPE | 3 meses calendario CDMX; mes actual PARTIAL. **No** 30d trailing. | `defaultThreeMonths` ~100–110; prompt «grain=calendar_month» ~993 |
| CONVERSATIONAL_INHERIT | No reutiliza el pack COMMERCIAL_MOVERS del turno anterior. **PROVEN.** | `active_entities: []` en EE |
| FINAL_PACK | `assembleClientProfilePack`: monthly_rows + comments[] + dicf_actions[] + limitations `comments_none_for_cliente_key` si vacío | ~662–726 |
| PROMPT_FAMILY | `CLIENT_PROFILE_SYSTEM_ADDENDUM` + `formatClientProfileContext` | ~41–51, ~973–1042 |

```
ROUTED_INTENT = client_profile
FINAL_HANDLER = loadClientProfileForChat / handle client_profile in askDirectorIa
TOOLS_EXECUTED = in-process profile loaders (no orchestrator)
SOURCES_REQUESTED = ARR daily sales/discount + comments-by-key + DICF-by-key
SOURCES_NOT_REQUESTED = name-join comments, commercial_trend, AR, bitácora, Forecast/IGF
ENTITY_RESOLUTION = exactNorm(hint) vs ventas; keys derivadas
PLANT_SCOPE = planta del hilo/UI
PERIOD_SCOPE = 3 meses calendario (jul–sep el 1-sep-2026)
CONVERSATIONAL_INHERIT = plant_diagnosis frame; sin entidades activas
FINAL_PACK = client_profile longitudinal
PROMPT_FAMILY = CLIENT_PROFILE_SYSTEM_ADDENDUM
```

---

## 4. Pipeline comparison

| STAGE | COMO_VAMOS | QUE_SABEMOS_DE_ERICK | SAME_OR_DIFFERENT | CONSEQUENCE |
|---|---|---|---|---|
| routing | `isExecutiveStatusQuestion` + planner `unknown`/`plant_diagnosis` → EE | `isClientProfileQuestion` → planner `client_profile` | DIFFERENT | Primera divergencia de **capacidad** |
| intent | executive_status / plant_diagnosis pack | client_profile | DIFFERENT | |
| entity | no selecciona cliente; verbal 2+2 del Top 6 | hint «Tortillería Erick» | DIFFERENT | Perfil exige identidad |
| plant | UI/scope CEL | misma planta del chat | SAME (si UI ancla) | |
| commercial source | commercial-trend-engine 30d + ARR/IGF planta | `ventas_diarias_cliente` mensual | DIFFERENT | kg mes vs t trailing |
| monthly history | no (movers Δ 30d) | sí, 3 meses | DIFFERENT | julio/agosto/septiembre |
| commercial trend | sí | no | DIFFERENT | |
| cliente_comentarios | `loadRecentCommentsByClienteNombres` lower(trim nombre)+planta | `queryCommentsByKeys` key NOT NULL | **DIFFERENT** | **conocimiento de comentarios diverge aquí** |
| DICF | plant pack (acciones de planta, no por Erick) | `queryActionsByKeys` | DIFFERENT | |
| Action Register | sí (planta) | `supported: false` | DIFFERENT | perfil no puede afirmar AR |
| pack | COMMERCIAL_MOVERS + MAGNITUDE + … | PERFIL LONGITUDINAL | DIFFERENT | |
| prompt | «No la omitas» + no-causa | «missing != inexistencia global» | DIFFERENT | |
| absence | `Sin comentario reciente` si no hay match de **nombre** | «ninguno para estas **keys**» | DIFFERENT | LLM colapsó a «no se han registrado» |
| LLM | gpt-4o-mini EE | gpt-4o-mini profile | SAME motor, OTHER prompt | |

```
FIRST_DIVERGENCE_POINT = HANDLER/LOADER
  «¿Cómo vamos?» → enrichMoversWithRegisteredComments → loadRecentCommentsByClienteNombres
  «¿Qué sabemos?» → loadClientProfileForChat → queryCommentsByKeys
```

El planner ya diverge (`client_profile` vs EE). El **conocimiento de comentarios** diverge en el **join**, no en la existencia de la tabla.

---

## 5. First divergence point

**FIRST_DIVERGENCE_POINT = `queryCommentsByKeys` vs `loadRecentCommentsByClienteNombres`.**

Clasificación de hipótesis A:

| ID | Veredicto |
|---|---|
| H-A1 SOURCE_NOT_LOADED | **REFUTADO.** `commentsQueried: true` (~963). |
| H-A2 SOURCE_LOADED_BUT_FILTERED | **PROVEN.** SQL exige `cliente_key IS NOT NULL AND TRIM <> '' AND key = ANY($2)` (~591–595). |
| H-A3 IDENTITY_RESOLUTION_MISMATCH | **PROVEN.** Keys sintéticas `planta\|grupo DICF\|canal\|subcanal\|nombre` (`deriveClienteKeys` + `buildClienteKey`). Movers no usan esa key para comments. |
| H-A4 CLIENT_NAME_MATCH_MISMATCH | **PROVEN como no-uso.** El perfil **no** hace join por nombre para comments (header: «Sin join por nombre»). Ventas sí matchean por `exactNorm`. |
| H-A5 CHANNEL_MISMATCH | **PARTIALLY_PROVEN** posible (key incluye canal; comments name-join no). No se probaron keys de Erick. |
| H-A6 PLANT_MISMATCH | **NOT_PROVEN** (producción mostró kg de la planta del hilo). |
| H-A7 PERIOD_MISMATCH | **NOT_APPLICABLE** a comments (ningún loader filtra ventana). |
| H-A8 PACK_OMISSION | **REFUTADO.** Pack incluye bloque COMMENTS. |
| H-A9 PROMPT_OMISSION | **REFUTADO** como omisión de dato. El prompt **sí** dice missing != global. |
| H-A10 LLM_DISCRETION | **PROVEN** para la frase «no se han registrado». |
| H-A11 FALSE_ABSENCE_ASSERTION | **PROVEN.** |
| H-A12 DIFFERENT_CAPABILITY_COVERAGE | **PROVEN.** |
| H-A13 CONVERSATIONAL_INHERIT | **PROVEN** que **no** hay obligación de no contradecir. No es la causa del empty set; sí de no reutilizar el hecho ya verbalizado. |
| H-A14 CLIENT_DOSSIER_LIMITATION | **PROVEN.** Contrato del perfil: comments solo por key. |
| H-A15 TOOL_ORCHESTRATION_LIMITATION | **PROVEN.** `get_cliente_comentarios` (nombre) existe y **no** se llama. |
| H-A16 OTHER | — |

Causa raíz A (compuesta, **PROVEN**):

1. Cobertura distinta (nombre vs key).
2. Empty-for-keys ≠ absence global.
3. LLM colapsa la limitación a «no se han registrado».
4. Sin memoria estructurada del comentario del turno EE.

---

## 6. Comment provenance trace

Caso: TORTILLERIA ERICK / 2026-08-12 / POR FALTA DE PIPAS.

### En Commercial Movers (**PROVEN** en código + producción)

1. Loader: `loadRecentCommentsByClienteNombres` (`lib/cliente-comentarios.js` ~252–298).
2. Parámetros: `plantaIds` equivalentes, `nombres` del Top 6, `limitPerCliente` ≤ 2.
3. Nombre: `lower(trim(cliente_nombre)) = ANY($2)`.
4. Planta: `planta_id = ANY($1)`.
5. Canal: **no**.
6. `cliente_key`: **no**.
7. Periodo: **no**.
8. Shape: `{ body, author_name, created_at: YYYY-MM-DD }`.
9. Pack: `enrichMoversWithRegisteredComments` → `registered_comments` → `formatOneMoverLine`.
10. Prompt EE: `Comentario registrado [2026-08-12]: «POR FALTA DE PIPAS». El comentario no es la causa.`

### En «¿Qué sabemos?» — qué **no** ocurre

| Paso movers | ¿En perfil? |
|---|---|
| Join por nombre | **NO** |
| Equivalentes de planta en comments | SQL comments usa **un** `planta_id` (~591), no `ANY(equivalentes)` |
| Canal ignorado | Key **incluye** canal |
| Sin filtro de key | **Filtro de key obligatorio** |
| `formatOneMoverLine` | **NO**; lista `created_at \| author \| body` o «ninguno para estas keys» |

Si el comentario de Erick tiene `cliente_key` NULL (permitido en esquema, auditoría COMMENTS previa **PROVEN**), el perfil **no puede** verlo. Filas de producción: **NOT_PROVEN** (sin SQL).

---

## 7. False absence analysis

Estados físicos en arquitectura actual:

| Estado | Dónde existe |
|---|---|
| AVAILABLE | `DIRECTOR_IA_VERACITY.SOURCE_AVAILABLE`; CEL `AVAILABILITY` |
| EMPTY / none for key | limitation `comments_none_for_cliente_key` |
| NULL | monthly `DATA_NOT_FOUND` vs `ZERO_OBSERVED` (perfil **sí** distingue kg) |
| NOT_LOADED | `comments_not_queried` |
| NOT_REQUESTED | no hay enum; se infiere por no llamar loader |
| SOURCE_UNAVAILABLE / TOOL_ERROR | `SOURCE_ERROR`, abort |
| NOT_FOUND | `DATA_NOT_FOUND` (identidad) |

Reglas: Constitución/capabilities «null no es 0»; addendum perfil «missing != 0»; plant_diagnosis «Ausencia no es cero».

**Estado real de COMMENTS en aquella respuesta:**

`DATA_NOT_FOUND_IN_CURRENT_SOURCE` (join por key) **más** `DATA_NOT_REQUESTED` (join por nombre).

**No** `ABSENCE_CONFIRMED`.

La frase «no se han registrado comentarios» afirma ABSENCE_CONFIRMED.

```
FALSE_ABSENCE_RISK = PROVEN
```

---

## 8. Action absence analysis

Independiente de comments.

| Fuente | En «qué sabemos» | Estado epistemológico |
|---|---|---|
| DICF | `queryActionsByKeys` | Si vacío: `dicf_actions_none_for_cliente_key` = **NOT_FOUND_IN_SOURCE** (esa key). Filas reales Erick: **NOT_PROVEN**. |
| Action Register | `action_register.supported = false` | **NOT_REQUESTED** / unsupported. Prompt: «action_register=unsupported». |
| Bitácora | no se carga | **NOT_REQUESTED** |

```
ACTION_REGISTER_STATUS = NOT_REQUESTED
DICF_STATUS = NOT_FOUND_IN_SOURCE (keys) | UNKNOWN (filas reales)
OTHER_ACTION_SOURCE_STATUS = NOT_REQUESTED
```

Afirmar «no se han registrado … acciones relacionadas con este cliente» de forma **global** no está autorizado por el contrato del perfil. **FALSE_ABSENCE_RISK** también para acciones. **PROVEN** como riesgo de wording; **NOT_PROVEN** si Erick tenía o no DICF/AR.

A8/A9 («acciones para Tortillería Erick») rutean a **`action_status`** (AR persona), no al perfil. `hasProperPersonSpan` trata «Tortillería Erick» como dos tokens nombre-like. **PROVEN** fragmentación.

---

## 9. Existing architecture / capabilities

¿Puede «¿Qué sabemos de CLIENTE?» componerse hoy con hechos + movimiento + comments + acciones + limitaciones **sin arquitectura nueva**?

| Componente | Clasificación |
|---|---|
| client_profile | AVAILABLE_AND_USED (historia mensual + comments/DICF por key) |
| commercial_trend / movers + comments nombre | AVAILABLE_NOT_USED |
| `loadRecentCommentsByClienteNombres` | AVAILABLE_NOT_USED en esta ruta |
| `get_cliente_comentarios` tool | AVAILABLE_NOT_USED |
| M11 expediente (`sabemos comercialmente`) | AVAILABLE_NOT_USED (A1 no lo dispara) |
| client_analysis | PARTIALLY_AVAILABLE (otra familia) |
| DICF por key | AVAILABLE_AND_USED |
| Action Register por cliente | NOT_AVAILABLE (sin `cliente_key`) |
| bitácora cliente | PARTIALLY_AVAILABLE (otra ruta) |
| entity resolution | PARTIALLY_AVAILABLE (`exactNorm` + keys sintéticas) |
| Evidence Builder / IES / Reasoning | OUT_OF_SCOPE / no usar |
| Tool Orchestrator | AVAILABLE_NOT_USED (handler in-process) |
| planner | AVAILABLE_AND_USED |
| CEL EE | AVAILABLE_NOT_USED (bloqueado por specialized) |

**EXISTING_ARCHITECTURE_REUSABLE = YES** para comments (reusar loader por nombre como complemento). **NEW_ARCHITECTURE_REQUIRED = NO**.

---

## 10. Client dossier / client_profile contract

El contrato físico (`director-ia-client-profile.js` cabecera + addendum + tool limitations):

- Pretende: perfil **longitudinal** 3 meses, kg y descuento/kg, identidad por `cliente_key`.
- Promete: ARR diario agregado a mes; comments/DICF **por key**; no-causa.
- **No** promete: join por nombre; commercial_trend OLS; AR; ingreso actual; 90d trailing.
- Comments: sí, **restringidos a key**.
- Actions: DICF por key; AR explícitamente no.
- Trend engine: no.
- Monthly history: sí.
- Discount: sí (ratio mes).
- Income: UNSUPPORTED.
- Materiality DICF mensual: no.
- Causalidad: prohibida.

| Gap | Tipo |
|---|---|
| Comments visibles en movers y no en perfil | IMPLEMENTATION_GAP + CONTRACTUAL_GAP (el contrato **elige** key-only) |
| «no se han registrado» vs missing≠global | PROMPT_GAP + LLM |
| A2/A4/A5 no entran a perfil | ROUTING_GAP |
| Filas key NULL | DATA_GAP (esquema permite NULL; no es bug de COMMENTS-001) |

M11 («qué sabemos **comercialmente**») es **otro** contrato. A1 no lo usa. **PROVEN.**

---

## 11. Conversational continuity

TURN N «¿Cómo vamos?» → state: `parent_intent=plant_diagnosis`, `active_entities=[]`, forecast_run sí, **sin** cliente ni comments estructurados.

TURN N+1 «¿Qué sabemos de Erick?» → hint fresco; **no** lee el pack EE.

¿Hay obligación de no contradecir un hecho emitido? **NO. PROVEN** (no hay comparador de hechos).

| Modelo | Compatible hoy | Epistemología |
|---|---|---|
| A Reconsultar evidencia autoritativa | SÍ (así funciona) | Preferido, si el **mismo** loader/join |
| B Reutilizar evidencia estructurada del turno | NO hay evidence-id de comments en `conversation_state` | Deseable; no existe |
| C Reutilizar texto LLM | NO hay mecanismo; no se debe | Rechazado |

El fallo no es «olvidó el texto». Es «reconsultó otra semántica de join».

---

## 12. Phrase routing matrix A1–A15

`node -e` 2026-09-01. Inherit = `inheritParentIntent: plant_diagnosis`.

| ID | DETECTED / FINAL | HANDLER | ENTITY hint | INHERIT PD | COMMENTS | ACTIONS | HISTORY | TREND | CAUSAL | FALSE_ABSENCE |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 sabemos Erick | client_profile | profile | Tortillería Erick | profile | by key | DICF by key | 3m | no | bajo | **HIGH** |
| A2 Háblame de Erick | unknown | inherit EE/planta | null | plant_diagnosis | no | AR planta | no | no | medio | HIGH |
| A3 Cómo va Erick | plant_diagnosis | **EE planta** | null | EE | movers 2+2 si Top6 | AR planta | no | sí | bajo | bajo en movers |
| A4 Qué ha pasado | unknown | inherit planta | null | plant_diagnosis | no | AR/DICF planta | no | no | alto | HIGH |
| A5 Cuánto compra | unknown | inherit planta | null | plant_diagnosis | no | no | no | no | medio | HIGH |
| A6 cambiado su compra | unknown | inherit planta | null | plant_diagnosis | no | no | no | no | medio | HIGH |
| A7 comentarios Erick | client_profile | profile | null* | profile | by key | DICF by key | 3m | no | bajo | **HIGH** |
| A8 Hay acciones Erick | action_status | AR persona | null | action_status | no | **AR board** | no | no | bajo | HIGH (AR≠cliente) |
| A9 Qué acciones Erick | action_status | AR persona | null | action_status | no | AR board | no | no | bajo | HIGH |
| A10 Por qué bajó | unknown + CAUSE | inherit planta | null | plant_diagnosis | no | pack planta | no | no | **HIGH** | medio |
| A11 sabemos Grupo Move | client_profile | profile | «Grupo Move» ≠ nombre completo | profile | by key | DICF key | 3m | no | bajo | HIGH + identity |
| A12 comentarios Move | client_profile | profile | null* | profile | by key | DICF key | 3m | no | bajo | HIGH |
| A13 acciones Move | action_status | AR persona | null | action_status | no | AR | no | no | bajo | HIGH |
| A14 Por qué cayó Move | unknown + CAUSE | inherit planta | null | plant_diagnosis | no | pack planta | no | no | **HIGH** | medio |
| A15 sabemos este cliente | client_profile | profile | **null** | profile | by key si hay entity | DICF | 3m | no | bajo | HIGH; tras EE **sin** active client → `needs_identity` |

\* A7/A12: `extractEntityHint` no pega «comentarios tiene X»; el perfil aún puede usar tokens / hint de chat. Resolución exacta: **PARTIALLY_PROVEN**.

Familia **fragmentada**. No phrasebook: el hueco es semántico (perfil vs EE vs AR vs causa).

---

## 13. ACTUAL_TO_DATE trace

```
currentYearMonthCdmx() → year/month de «¿Cómo vamos?» (sin mes nombrado)
  director-ia-igf-arr.js resolveYearMonthFromQuestion ~160, 681
  → loadPlantDiagnosisForChat year/month ~1171–1172
  → parseYearMonth(assembled.requested_period.igf_arr_yyyy_mm)
  → loadDashboardForecastParity
  → getPronosticoPlantDetail(year, month, plant, fechaCorte)
  → buildVentaPronosticoSheetLike
  → total_mes_sum = sum(totalMesVenta)
  → actual_to_date.venta_ton
  → emptyActual / finiteOrNull(0) = 0
  → CEL MAGNITUDE «se han vendido 0 t (ACTUAL_TO_DATE)»
  → LLM
```

| Campo | Valor | Evidencia |
|---|---|---|
| PERIOD_START | día 1 del mes de `year/month` (si «cómo vamos» el 1-sep-2026: **2026-09-01**) | `currentYearMonthCdmx` |
| PERIOD_END / ANCHOR | corte = upload_day / `getPronosticoCorteYmdStr` | chat ~3076–3142; dashboard ~3485 |
| SOURCE_MAX_DATE | **NOT_PROVEN** (sesión) | |
| QUERY_WINDOW | días 1..`lastClosedDay` del mes | sheet ~3551–3558 |
| RAW_ROWS | **NOT_PROVEN** | |
| AGGREGATION | suma por DOW de días **cerrados** | ~3551–3558, ~3634 |
| NULL_BEHAVIOR | `vm.get(key)` null → **no suma** (día omitido) | ~3557–3558 |
| EMPTY_SET_BEHAVIOR | vector `[0,0,0,0,0,0,0]` + `sum` → **0** | ~3386, ~3551 |
| ZERO_BEHAVIOR | `finiteOrNull(0)=0`; availability no UNAVAILABLE | pack ~30–33; CEL ~1067–1110 |
| FRESHNESS / WATERMARK | last upload si no hay cutoff en body | chat ~3081–3098 **NOT_PROVEN** valor |
| PARTIAL_PERIOD_SIGNAL | en **perfil** mes actual=PARTIAL; en **ACTUAL_TO_DATE** el 0 **no** se etiqueta PARTIAL | **PROVEN** asimetría |

Regla crítica (**PROVEN**):

```
// TOTAL mes solo incluye días "cerrados".
// Si el corte está en el mes, el día de corte está "en curso" y NO se suma.
lastClosedDay = isCorteEnMes ? Math.max(0, corteDt.getDate() - 1) : corteDt.getDate()
```

`dashboard-arr-forecast.js` ~3552–3554.

Si corte = 2026-09-01 y mes = septiembre: `lastClosedDay = 0`. El `for` no itera. Suma = 0.

---

## 14. Zero semantics

Estados posibles (pueden coexistir por capa):

| Capa | Estado |
|---|---|
| Loop de días cerrados el día 1 | **NO_ROWS** del mes cerrado (0 días) **PROVEN** si corte∈mes día=1 |
| Días sin key en mapa | omitidos, no null en el total | EMPTY_SET_TO_ZERO **PROVEN** |
| `finiteOrNull(0)` | 0 es número | NULL_TO_ZERO no (null→null); **cero agregado se conserva** |
| Pack | ACTUAL_TO_DATE AVAILABLE con 0 | pierde «0 días cerrados» |
| LLM | «falta de actividad» | UNSUPPORTED |

```
ACTUAL_TO_DATE_ZERO_SEMANTICS = NO_ROWS_CLOSED_DAYS ⊕ EMPTY_VECTOR_SUM_ZERO
  (si corte=día 1 del mes). ZERO_CONFIRMED de venta diaria: NOT_PROVEN
```

---

## 15. First semantic loss point

```
FIRST_SEMANTIC_LOSS_POINT =
  buildVentaPronosticoSheetLike:
    lastClosedDay=0 → totalMesVenta=[0×7] → total_mes_sum=0
  THEN
  CEL MAGNITUDE:
    «se han vendido 0 t (ACTUAL_TO_DATE)»
    sin flag PARTIAL / NO_CLOSED_DAYS
```

Eso no es «DB SUM=0 sobre registros confirmados».

---

## 16. Unsupported inference

Búsqueda literal/semántica de «falta de actividad comercial significativa» y «actividad comercial»: **0 hits** en repo.

```
TEMPLATE_GENERATED = NO
PROMPT_INDUCED = PARTIAL (el pack afirma 0 t como venta)
LLM_FREE_SYNTHESIS = PROVEN
```

Ninguna evidencia autoriza el paso:

`0 t al corte del 1 de septiembre` → `falta de actividad comercial significativa en el periodo reciente`.

El 0 puede ser «aún no hay día cerrado». Tendencia 30d y movers de agosto pueden ser materialmente activos **en el mismo pack**.

```
UNSUPPORTED_INFERENCE_RISK = PROVEN
```

Hipótesis B:

| ID | Veredicto |
|---|---|
| H-B1 ZERO_CONFIRMED | **NOT_PROVEN** (venta diaria = 0) |
| H-B2 NULL_TO_ZERO_COLLAPSE | **PROVEN** a nivel total (null days no entran; total nace en ceros) |
| H-B3 EMPTY_ROWS_TO_ZERO | **PROVEN** |
| H-B4 MONTH_RESET | **PROVEN** (mes calendario nuevo) |
| H-B5 PARTIAL_DAY | **PROVEN** (día de corte excluido) |
| H-B6 DATA_NOT_YET_LOADED | **PARTIALLY_PROVEN** posible; no necesario si lastClosedDay=0 |
| H-B7 STALE_WATERMARK | **NOT_PROVEN** |
| H-B8 PACK_LOST_PROVENANCE | **PROVEN** (se pierde «0 días cerrados») |
| H-B9 PROMPT_ALLOWS_INTERPRETATION | **PROVEN** (no veda inferir actividad) |
| H-B10 LLM_FREE_INFERENCE | **PROVEN** |

---

## 17. Month-boundary matrix

| BLOCK | Ejemplo 1-sep | TIME_SEMANTICS | ANCHOR | WINDOW | SOURCE | FRESHNESS | ¿Comparable? |
|---|---|---|---|---|---|---|---|
| Venta Actual | 0 t | mes calendario hasta días **cerrados** | corte upload | 1..lastClosedDay | Pronóstico venta_sheet | corte | no vs 30d |
| Forecast | proyección mes | mismo year/month + corte | upload_day | mes abierto | mini IGF | corte | no es actual |
| Desc Forecast | $/kg proyección | igual | igual | mes | mini | corte | |
| IGF stored | versión almacenada | mes IGF | version | mes stored | igf.compromiso | stored | ≠ Forecast |
| IGF desc stored | igual | igual | igual | mes | IGF | stored | |
| CASA/COMI trend | UP/DOWN | trailing 30d | MAX(fecha) | 30d | engine | ancla serie | **puede incluir agosto** |
| Movers | Erick −4.406 | mismo 30d | igual | 30d | engine | igual | |
| Comments | 2026-08-12 | fecha registro | created_at | sin filtro | cliente_comentarios | — | ≠ ventana Δ |
| Action Register | snapshot | as_of | hoy | board | AR | snapshot | no |
| DICF/Ejecución | action_dates | distintas | — | — | dicf_acciones | — | no |

Coexistencia ACTUAL_TO_DATE septiembre=0 + movers agosto **no es bug**. Confundirlos verbalmente **sí** es riesgo. **PROVEN.**

---

## 18. Forecast / IGF protect

COMMENTS-001 y estos gaps **no** exigen tocar forecast engine, authoritative run, IGF stored, descuento stored ni fórmulas.

```
FORECAST_CHANGE_REQUIRED = NO
IGF_CHANGE_REQUIRED = NO
COMMERCIAL_TREND_ENGINE_CHANGE_REQUIRED = NO
DASHBOARD_CHANGE_REQUIRED = NO
```

(Un fix futuro de semántica de 0 puede etiquetar en **CEL/pack** sin recalcular Dashboard.)

---

## 19–20. Regression attribution

COMMENTS-001 tocó: CEL obligación verbal + fecha + stem `negativ[oa]s?` + addendum no-causa en trend. **No** tocó `director-ia-client-profile.js`, `queryCommentsByKeys`, `dashboard-arr-forecast.js`, ni `buildVentaPronosticoSheetLike`.

El perfil ya documentaba «Sin join por nombre» y «missing != inexistencia global» **antes**.

```
COMMENTS_001_REGRESSION = NO_PRE_EXISTING_GAP
PERIOD_START_REGRESSION = NO_PRE_EXISTING_BEHAVIOR
```

Descubrir el defecto **después** del deploy ≠ el deploy lo introdujo.

COMMENTS-001 **hizo visible** el comentario en EE; eso **reveló** la contradicción con el perfil. No la creó.

---

## 21. Systemic vs case-specific

Cualquier cliente con comentario **por nombre** y `cliente_key` NULL (o key ≠ derivada) produce:

Movers: COMMENT AVAILABLE
Perfil: comments [] → LLM «no hay comentarios».

```
SYSTEMIC_CONSISTENCY_RISK = PROVEN
```

No es solo Erick.

---

## 22. Minimal future fix (diseño, no código)

### FIX-A CLIENT KNOWLEDGE CONSISTENCY

Reusar `loadRecentCommentsByClienteNombres` **como complemento** cuando `queryCommentsByKeys` está vacío. No sustituir key (NULL-key perdería declaraciones). No cambiar Dashboard ni engine.

| | |
|---|---|
| FILES_EXPECTED | `lib/director-ia-client-profile.js`; tests `test/director-ia-client-profile.test.js`; quizás addendum prompt |
| FUNCTIONS_EXPECTED | `loadClientProfileForChat`; `formatClientProfileContext`; **no** inventar «no existen» |
| DATA_SOURCES | misma tabla; segundo join ya existente |
| CONTRACT_IMPACT | local al perfil; no Constitución |
| RISK | homónimos (ya existen en movers; no empeorar) |
| TESTS | Erick-like: key miss + name hit; key hit; empty both → «no encontrado en estas fuentes» no «no registrados»; no-causa; no regresiones EE/Forecast |

### FIX-B PERIOD-START SEMANTICS

Etiquetar ACTUAL_TO_DATE cuando `lastClosedDay===0` o mes abierto día 1: PARTIAL / NO_CLOSED_DAYS. Vedar inferencia de «falta de actividad». No cambiar 0 a null fingido. No usar agosto como actual.

| | |
|---|---|
| FILES_EXPECTED | CEL `buildExecutiveStatusPack` / prompt; opcionalmente adapter si expone `lastClosedDay`; tests EE |
| FUNCTIONS_EXPECTED | summary MAGNITUDE; `executiveQuestionFocusLines` |
| DATA_SOURCES | ninguna nueva |
| CONTRACT_IMPACT | semántica de pack, no fórmulas |
| RISK | no romper IGF «No las omitas» ni movers comments |
| TESTS | fixture corte día 1 → no «falta de actividad»; 0 con días cerrados se conserva; Forecast/IGF intactos |

---

## 23. Easy-wrong solutions (rechazadas)

Hardcode Erick; phrasebook; copiar texto del turno; comments en todos los prompts; ocultar «no hay»; 0→null; usar agosto como actual; tocar Forecast/IGF/engine/Top6/2+2; Reasoning; Constitución; IES; dos bubbles; Dashboard.

---

## 24. Non-regression envelope

Cualquier fix futuro conserva la lista 1–26 del pedido (Forecast NL, IGF, movers comments, created_at, no-causa, 2+2, Dashboard, `answer:string`, G1).

---

## 25. Task-boundary recommendation

**B.** COMMENTS-001 cumplió su contrato. Los hallazgos son PRE-EXISTING GAPS. Tras aprobación humana, **cerrar COMMENTS-001** y abrir tarea(s) separadas (Track A / Track B). **No ejecutar** ese cierre aquí.

Justificación: COMMENTS-001 solo obligó verbalizar el comentario **ya presente** en movers 2+2. El perfil y el TOTAL mes son módulos distintos, no `in_scope` de esa tarea.

---

## 26. Prioritized recommendations

### MUST_BEFORE_CLOSE

Ninguno técnico sobre COMMENTS-001. Solo revisión humana ya pedida (hecha en el caso principal).

### MUST_NEXT_TASK

- **TRACK A** — consistencia comments perfil vs movers (complemento nombre; veda falsa ausencia).
- **TRACK B** — semántica día-1 / 0 días cerrados en ACTUAL_TO_DATE (separado).

### SHOULD

A15: conservar entidad del verbal EE o exigir hint. A3: «cómo va [cliente]» no es EE de planta. A8/A9: no tratar nombre de cliente como responsable AR.

### LATER

«Por qué bajó X» (CAUSE); A2/A4/A5 familia semántica; fallback `cliente_key` sin migrar esquema; M11 unificado.

### OUT_OF_SCOPE

IES, Reasoning, Constitución, Dashboard, Forecast, IGF, engine, dos bubbles, phrasebook.

---

## 27. Evidence appendix

- `lib/director-ia-planner.js` ~439–440
- `lib/director-ia-client-profile.js` ~4–6, 41–51, 250–299, 367–375, 585–599, 662–730, 742–967, 973–1042
- `lib/cliente-comentarios.js` ~252–298
- `lib/director-ia-commercial-trend.js` `enrichMoversWithRegisteredComments`
- `lib/dicf-acciones.js` `buildClienteKey` ~70–78
- `lib/director-ia-chat.js` ~3193–3200, 4460–4490, 5112–5121
- `lib/director-ia-conversation-state.js` `extractEntityHint` ~683–707
- `lib/director-ia-conversational-executive-layer.js` ~31–35, 249–250, 1067–1111, 1640–1646
- `lib/dashboard-arr-forecast.js` ~3380–3381, 3551–3558, 3634
- `lib/director-ia-dashboard-forecast-adapter.js` ~209–245
- `lib/director-ia-authoritative-forecast-run-pack.js` `finiteOrNull` / `emptyActual` ~30–55
- `lib/director-ia-igf-arr.js` `resolveYearMonthFromQuestion`
- `lib/director-ia-tools.js` `get_cliente_comentarios` ~145–155; `get_client_profile` ~448–458
- `lib/director-ia-m11-commercial-dossier.js` `isExpedienteComercialQuestion` ~132–143
- Detectores A1–A15: `node -e` 2026-09-01

---

## 28. TERMINAL VERDICT

```
AUDIT_STATUS = COMPLETE
EVIDENCE_LEVEL = PROVEN (código + detectores + evidencia humana de producción; DB sesión NOT_PROVEN)

COMMENTS_001_PRIMARY_BEHAVIOR = PASS_IN_PRODUCTION (humano)

COMMENTS_001_REGRESSION = NO_PRE_EXISTING_GAP
PERIOD_START_REGRESSION = NO_PRE_EXISTING_BEHAVIOR

CLIENT_QUERY_FINAL_INTENT = client_profile
CLIENT_QUERY_FINAL_HANDLER = loadClientProfileForChat

CLIENT_COMMENTS_STATE = NOT_FOUND_IN_CURRENT_SOURCE (cliente_key) + DATA_NOT_REQUESTED (nombre+planta)
CLIENT_ACTIONS_STATE = DICF NOT_FOUND_IN_SOURCE (keys) | AR NOT_REQUESTED | filas reales UNKNOWN

FIRST_DIVERGENCE_POINT = queryCommentsByKeys vs loadRecentCommentsByClienteNombres

CLIENT_CONSISTENCY_ROOT_CAUSE = "Perfil consulta comments por cliente_key; movers por nombre+planta. Empty-for-keys se verbalizó como ausencia global."
CLIENT_CONSISTENCY_RISK = HIGH
SYSTEMIC_CONSISTENCY_RISK = PROVEN

FALSE_ABSENCE_RISK = PROVEN

ACTUAL_TO_DATE_ZERO_SEMANTICS = NO_CLOSED_DAYS_SUM_ZERO (si corte=día 1 del mes) / EMPTY_VECTOR
FIRST_SEMANTIC_LOSS_POINT = buildVentaPronosticoSheetLike lastClosedDay=0 → CEL 'se han vendido 0 t'
PERIOD_START_ROOT_CAUSE = "TOTAL mes excluye el día de corte; el 1 del mes no hay días cerrados; 0 no prueba inactividad."
UNSUPPORTED_INFERENCE_RISK = PROVEN

EXISTING_ARCHITECTURE_REUSABLE = YES
NEW_ARCHITECTURE_REQUIRED = NO

FORECAST_CHANGE_REQUIRED = NO
IGF_CHANGE_REQUIRED = NO
COMMERCIAL_TREND_ENGINE_CHANGE_REQUIRED = NO
DASHBOARD_CHANGE_REQUIRED = NO

RECOMMENDED_TASK_BOUNDARY = B

MUST_BEFORE_CLOSE = NONE
MUST_NEXT_TASK = TRACK_A_CLIENT_KNOWLEDGE_CONSISTENCY + TRACK_B_PERIOD_START_SEMANTICS

DASHBOARD_BEHAVIOR_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
CURRENT_TASK_CHANGED = NO
```

STOP.

Este informe no autoriza implementación. Un DONE no autoriza otra tarea. COMMENTS-001 no se declara CLOSED ni APPROVED.
