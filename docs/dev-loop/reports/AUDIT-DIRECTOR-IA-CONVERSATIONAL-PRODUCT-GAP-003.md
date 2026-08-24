# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCT_IMPACT_AUDIT_ONLY"
north_star_met: false
compared_to: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
prior_bottleneck_status: "FIXED for daily sales (canonical 7-turn). NOT a general conversational fix."
single_bottleneck: "closed_followup_phrasebook_blocks_natural_turns"
failure_class: "OVERPROGRAMMING"
next_task_proposed: "ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
sql_017_executed: false
discount_kg_implemented: false
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-m9-deltas.js"
  - "sql/arr_forecast_schema.sql"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **no** se cumple todavía.

**GAP-002 vs ahora:** el cuello «venta ayer interceptada por el pack mensual» **sí se corrigió**. «¿Por qué bajó la venta ayer?» ya no va a `financial_diagnosis` ni a `delta_sales`. Monta pack diario, HILO y GPT. Eso es una mejora **material**, no cosmética.

**Qué no arregló** `daily_sales_deviation`: el Director IA **sigue sin conversar** fuera de un phrasebook cerrado. Tras un pack correcto (planta o venta ayer), «¿Y eso?», «¿Cómo así?», «¿Qué más?» y «¿Entonces qué falta?» no llegan a GPT con evidencia. O clarifican, o tratan «eso» como cliente.

**Cuello de botella único:** el detector de follow-ups enumerados + el early-return `unknown → clarificación` + las respuestas enlatadas de hueco. Infraestructura de pack/HILO/GPT **ya existe**. La regla impide usarla. Clase: **OVERPROGRAMMING**.

No se eligió descuento/kg por similitud con el cuello anterior. Sigue siendo un hueco de pack diario **real** y el siguiente candidato de datos. No es lo que más rompe «conversar naturalmente» sobre datos **ya cargados**.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-003` (≠ `main`).
- HEAD de partida: `4791d70e Merge branch 'docs/director-ia-daily-deviation-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Trazas estáticas: planner, `classifyTurnKind`, `resolveConversationTurn`, `askDirectorIa`, loader diario, memoria persistente, M9 descuento, DDL ARR.

---

## GAP-002 vs runtime actual

| Dimensión | GAP-002 | Ahora | ¿Mejoró la conversación? |
|---|---|---|---|
| Naturalidad | C1 canónico sí; el resto phrasebook | C1 canónico igual; **C2 canónico nuevo sí**; libres siguen rotos | Parcial. El guion diario funciona. El habla libre no. |
| Routing correcto | Venta ayer → `financial_diagnosis` mensual | Venta + ayer → `daily_sales_deviation` **antes** de financial/delta | **Sí**, en C2. |
| Daily awareness | Tablas diarias sin corte de día | Ayer CDMX, kg, same-weekday 14 días, N, delta | **Sí**, venta. **No**, descuento/kg. |
| Data grounding | GPT razonaba el mes como si fuera ayer | Pack del día + contribución + DICF/`cliente_key` + gaps | **Sí** en C2 canónico. |
| Follow-up continuity | Inherit solo kinds enumerados | Inherit ampliado **solo** para kinds diarios añadidos (`reference_probe`, `contributors`, …) | Solo si el usuario recita esas frases. |
| Identificar unknowns | Gap estructurado; C2 no podía decir «falta el corte de ayer» | Pack diario marca contribuidores sin evidencia | **Sí** en C2 si la pregunta de hueco coincide el regex. |
| Decir qué información falta | Early return enlatado en planta | Planta: **sigue enlatado**. Diario: GPT **si** `gap_what`/`gap_who` | Mixto. Variantes naturales (`entonces qué falta`) mueren. |
| Cross-session | Repo sí; SQL 017 pendiente | Igual. Esta auditoría **no** ejecutó SQL 017. | No medible en entorno. |
| Overprogramming | Phrasebook no era el cuello (C2 era peor) | Phrasebook **es** el cuello: los packs buenos no se usan en el habla libre | Empeoró en visibilidad: ahora se nota porque C2 ya funciona. |

`daily_sales_deviation` **arregló:** routing diario de venta, grano de día, referencia declarada, contribución cliente/canal, evidencia por `cliente_key`, herencia de los 6 follow-ups del guion, una llamada OpenAI, no causalidad programada.

`daily_sales_deviation` **no arregló:** descuento/kg; lookup «acción de Julio»; phrasebook genérico; early-return de huecos en planta; SQL 017; trade-off económico; N5.

---

## Trazas — seis conversaciones

### A — planta / Arturo (guion canónico)

| Turno | kind | Intent detectado | parent / inherit | Routing | Fuentes | GPT vs det. | Fallo |
|---|---|---|---|---|---|---|---|
| ¿Cómo va Puebla? | other | `plant_diagnosis` 0.84 | crea parent | pack 6 fuentes | AR DICF bitácora ARR IGF CS | **GPT** + HILO | Ninguno de routing. Periodo = mes comercial, no «hoy». |
| ¿Qué te llama la atención? | attention | unknown → hereda | `plant_diagnosis` | requery | mismo pack fresco | **GPT** | — |
| ¿Por qué? | why | unknown → hereda | idem | requery | idem | **GPT** (se le pide no afirmar causa) | — |
| ¿Y Arturo? | entity_intro | unknown → hereda | idem | entidad única o clarifica | pack fresco | GPT si única | Ambiguo → clarificación (KEEP) |
| ¿Qué sabemos de él? | pronoun | hereda | Arturo activo | requery | idem | **GPT** | — |
| ¿Tiene acción? | action | hereda | Arturo | requery | DICF por `cliente_key` | **GPT** | «¿Tiene acción?» sin «alguna» igual matchea |
| ¿Qué falta saber? | gap_what | hereda | | **early return** `buildGapWhatAnswer` | gap fresco; **no OpenAI** | **Determinístico** | OVERPROGRAMMING de redacción |
| ¿Quién puede darnos esa información? | gap_who | hereda | | early return | persona **solo** vínculo físico | **Determinístico** | KEEP persona; LET_GPT la prosa |
| ¿Para qué la necesitas? | gap_why_need | hereda | | early return | `why_blocks` | **Determinístico** | Idem |

**vs GAP-002:** C1 **no mejoró**. Sigue siendo el mejor hilo *si* se recita el guion. Los tres huecos siguen enlatados.

Variante que **sigue rota:** «¿Qué información falta?» → no es `gap_what` (`te falta` es obligatorio) → `other` → unknown → clarificación. `conversation_state` se vacía.

---

### B — venta de ayer (debe estar materialmente mejor)

| Turno | kind | Intent | parent / inherit | Fuentes / evidencia | GPT vs det. | vs GAP-002 |
|---|---|---|---|---|---|---|
| ¿Por qué bajó la venta ayer? | other | `daily_sales_deviation` 0.92 (`venta_ayer`) **antes** de financial | crea parent + `active_date` | `arr.ventas_diarias_cliente`; detección CDMX; ref same-weekday 14d + N; delta kg/%; contrib cliente/canal; DICF+comments `cliente_key`; gaps | **GPT** 1 llamada. Addendum: contribución ≠ causa | **ARREGLADO.** Ya no IGF/ARR/M9 mensual. |
| ¿Contra qué la comparas? | reference_probe | forceIntent daily | hereda; `active_date` efímero | requery mismo día | **GPT** | GAP-002: `other` → clarificación |
| ¿Qué clientes explican más? | contributors | planner podría ser `client_analysis` 0.8; `dailyFollowUp` anula standalone | forceIntent daily | contribución del pack fresco | **GPT** | GAP-002: se iba a DICF/listas |
| ¿Y por canal? | channel_probe | forceIntent daily | hereda | canal del pack | **GPT** | No existía |
| ¿Sabemos por qué? | why_know | forceIntent daily | hereda | gaps + evidencia; **no** causa programada | **GPT** (no early return en rama diaria) | Nuevo |
| ¿Qué falta investigar? | gap_what | forceIntent daily | hereda | `information_gaps` en el prompt | **GPT** (diario **no** usa `buildGapWhatAnswer`) | Mejor que planta |
| ¿Quién puede aclararlo? | gap_who | forceIntent daily | hereda | responsable solo si acción ligada | **GPT** | Mejor que planta |

Limitaciones del pack (KEEP): hoy ≠ día cerrado; día sin filas ≠ 0; referencia ausente no inventa ceros; GA/GV `SOURCE_RESTRICTED`; no descuento/kg.

**Qué sigue sin arreglar en B:** si el usuario se sale del guion («¿Y eso?», «¿Entonces qué falta?»), el hilo diario **también** cae. `active_date` no se persiste (correcto). `daily_not_persisted: true`.

Punto de fallo residual de B: **no es el pack**. Es el phrasebook (ver F).

---

### C — descuento/kg ayer (auditoría desde cero; no por similitud)

Pregunta: «¿Por qué subió el descuento/kg ayer?»

| Capa | ¿Existe físicamente? | ¿El chat la usa? |
|---|---|---|
| Tabla diaria | **Sí.** `arr.descuentos_diarios_cliente` (`plant_code`, `fecha`, `cliente_norm`, `monto`). Sin `canal`. | **No** en Director IA diario. |
| Kg del día | **Sí.** `arr.ventas_diarias_cliente.kg` (sí tiene canal). | Solo el path de **venta** diaria. |
| Fórmula ponderada | Readiness + M9 mensual: join monto↔kg. M9 agrupa `DATE_PART year/month`. Por cliente usa `monto/kg` (ratio); el indicador de planta debe ser `SUM(monto)/SUM(kg)`, no average-of-averages. | Mensual M9 / `delta_discount`. **No** corte `fecha = ayer`. |
| Routing | `isDailySalesDeviationQuestion` **excluye** descuento sin venta. `delta_discount` exige `cambio\|variacion\|delta`, no «subió». `financial_diagnosis` exige caída de ingreso/venta/margen. | **unknown** → clarificación. Ni pack financiero. |
| Descomposición cliente | Factible: mismo `cliente_norm` + día, monto y kg. | No implementado. |
| Mix vs tasa | Factible en principio (cambio de kg vs cambio de $/kg). No está en runtime diario. | No. |
| Canal | **No** en la tabla de descuento. Join a ventas o a `cliente_categoria_mes` sería inferencia. Readiness: `channel_available: false`. | Correcto no afirmar canal. |
| Evidencia DICF/comments | Mismo `cliente_key` que venta, **si** hubiera pack. | No hay pack. |
| Follow-ups C | «¿Fue general?» / «¿Quién movió más el promedio?» / «¿Sabemos por qué?» / «¿Qué falta?» | Tras unknown, `conversation_state` vacío. «¿Sabemos por qué?» no hereda. |

**¿Puede responder descuento/kg ayer?** No. Peor que C2 actual: **no monta evidencia**. Igual que C3 de GAP-002.

Clase de C: **MISSING_INFRASTRUCTURE** (intent + loader diario + routing). **No** MODEL_REASONING_LIMIT. **No** se elige como cuello único: es un tema; el phrasebook rompe **todos** los temas que ya tienen pack.

---

### D — acción de Julio Pérez

| Turno | Qué ocurre | Routing vs datos |
|---|---|---|
| ¿Qué pasó con la acción de Julio Pérez? | `classifyPersistentMemoryTurn` = **`resume`** (`que paso con`) **antes** del planner. Hint «Julio Pérez». Si no hay work item cuyo `entity_display` coincida → `resumeItem=null`. Planner: tiene `accion` pero **no** `vencid\|abiert\|pendient\|estado\|tema\|register` ni token AT → **no** `action_status`. Tampoco `responsible_lookup` (eso es «quién es el responsable»). → **unknown** + `!inherit` → clarificación. OpenAI **no**. AR **no se carga**. | **ROUTING.** El board AR (`top_overdue`, responsables) **sí** puede contener a Julio. El dump legado lo habría citado. Hoy ni se consulta. |
| ¿Está vencida? | Sin parent. `overdue_actions` exige `acciones` + `vencid`. Esta frase sola → unknown → clarificación. | Routing / phrasebook. |
| ¿Por qué no la ha cerrado? | `other`. unknown. Clarificación. | No hay loader de cierre/historial de ítem AR por persona. |
| ¿Lo sabemos? / ¿Qué necesitas para saberlo? | Sin hilo. unknown / no `gap_what`. | Phrasebook. |

**Determinación:** el problema **principal es routing** (memoria se apropia de «qué pasó con»; el planner no liga «acción de \<persona\>» al Action Register). Hay un segundo hueco de **lookup** (no hay tool «acciones de responsable X»). No es que falten tablas de AR.

Clase de D: **MISSING_INFRASTRUCTURE** (lookup acción/persona) **con** intercept de memoria. **No** es el cuello único.

---

### E — cross-session Arturo

| Sesión | Turno | Runtime |
|---|---|---|
| 1 | ¿Por qué dejó de comprar Arturo? | `plant_diagnosis` (`dejo_de_comprar` singular). GPT + pack. Puede crear work item si entidad única + gap + store + `actor_id`. |
| 1 | ¿Qué falta? | **No** es `gap_what` (`^que te falta` / `^que falta saber`). kind=`other` → unknown → clarificación. Riesgo de **no** persistir si el gap no se formuló en un turno que hereda. |
| 2 | ¿Qué pasó con Arturo? | `resume`. **Repo:** retrieve + authz + requery. Tests persistentes 19/19. **Entorno:** hace falta SQL 017 aplicado. Sin tabla: retrieve vacío → unknown → clarificación. |
| 2 | ¿Ya sabemos por qué? | `why_know` (sí matchea `^ya sabemos por que`). Solo hereda si hay `parent_intent` daily **o** si es defensible con parent planta. `why_know` **no** está en `isDefensibleFollowUpKind` (solo en `isDailyFollowUpKind`). Con parent `plant_diagnosis` → **no hereda** → unknown → clarificación. |

Memoria: **repo IMPLEMENTED ≠ entorno activo**. Esta auditoría **no** confirma SQL 017 en ningún ambiente. **DEPLOYMENT_GAP** separado. No es el cuello del north star: aunque 017 esté aplicado, F y D siguen rotos.

---

### F — follow-ups libres (¿conversa o recita?)

Partiendo de «¿Cómo va Puebla?» (`plant_diagnosis`, pack fresco, GPT).

| Turno | kind | inherit | Qué hace el runtime | GPT? | Fallo |
|---|---|---|---|---|---|
| ¿Y eso? | **`entity_intro`** (`^y [a-z0-9]` + ≤6 palabras) | Sí (kind defensible) | `extractEntityHint` **excluye** `eso` → hint null. `continuityNeedsUniqueEntity` = true. `resolveEntity` status `none` → **`buildEntityClarificationResult`**: «No encontré un cliente único para …». Pack **ni siquiera se usa para responder**. | **No** | Phrasebook **falso positivo**. «Eso» no es Arturo. |
| ¿Cómo así? | `other` | **No** | unknown + `!inherit` → clarificación genérica. `conversation_state` **vacío**. | **No** | El pack de Puebla se descarta. |
| ¿Qué más? | `other` | **No** | Igual. | **No** | Igual. |
| ¿Entonces qué falta? | `other` (no ancla en `^que falta…`) | **No** | Igual. El gap **ya está** en `pending_information_gap` del turno previo, pero este turno no lo lee. | **No** | El sistema **tiene** el hueco y no lo formula. |

El mismo patrón aplica **después de venta ayer**: `isDailyFollowUpKind` no incluye `other`. «¿Y eso?» como `entity_intro` **sí** heredaría daily y luego exigiría entidad → clarificación de cliente. «¿Cómo así?» no hereda.

**Veredicto F:** Director IA **reconoce follow-ups enumerados**. No conversa. GAP-002 ya lo vio y no era el cuello porque C2 mentía el mes. Ahora C2 dice la verdad en el guion, y F demuestra que el ejecutivo no puede salirse del guion.

---

## Information gap — ¿natural o enlatado?

Objetivo: qué sabe / no sabe / qué dato falta / para qué / quién **solo** con vínculo físico.

| Superficie | ¿El pack trae estructura? | ¿GPT formula? | ¿Phrasebook bloquea variantes? |
|---|---|---|---|
| `plant_diagnosis` | `derivePendingInformationGap`: limitations, `SOURCE_RESTRICTED`, `hecho_que_explique…`, `why_blocks`, `physical_person` | **No** en gap_what/who/why_need: `buildGapWhatAnswer` = `Me falta: {fields}. {why}` | Sí. «Qué información falta», «entonces qué falta», «qué más necesitamos» no entran. |
| `daily_sales_deviation` | `information_gaps` por contribuidor material; acción sí/no; comentario sí/no | **Sí** en las frases canónicas (requery + prompt; no early return) | Sí para variantes. |
| C / D / F | A menudo **no hay pack** en el turno | No hay nada que formular | Clarificación vacía |

Persona: KEEP_DETERMINISTIC el vínculo físico. LET_GPT_REASON la prosa («quién puede aclararlo» en diario ya va a GPT; en planta está enlatada).

**No** basta con «no hay suficiente información». En planta el texto es una lista. En diario GPT *puede* redactar el hueco **si** el turno entra a la rama. El habla libre no entra.

---

## Sobreprogramación vs KEEP

| Área | Veredicto | Por qué |
|---|---|---|
| Authz, planta, `cliente_key`, null≠0, SOURCE_RESTRICTED | **KEEP_DETERMINISTIC** | Verdad / acceso |
| Fecha CDMX, referencia 14d, matemáticas, reconciliación, provenance | **KEEP_DETERMINISTIC** | Exactitud |
| Prohibir causa / N5 / «Arturo causó la caída» | **KEEP_DETERMINISTIC** | Contrato |
| Entidad única cuando el usuario **nombra** un cliente | **KEEP_DETERMINISTIC** | Evita fuzzy |
| `classifyTurnKind` lista cerrada | **OVERPROGRAMMING** | GPT + HILO + pack ya interpretan «¿cómo así?» |
| `unknown && !inherit` → clarificación (chat ~2726) | **OVERPROGRAMMING** | Mata el hilo que tiene evidencia |
| `^y …` → `entity_intro` incluyendo «¿Y eso?» | **OVERPROGRAMMING** (bug de regla) | Exige cliente que nadie pidió |
| `buildGapWhatAnswer` / Who / WhyNeed en planta | **LET_GPT** redacción; **KEEP** persona | Early return evita al modelo |
| Phrasebook de inherit (valor histórico) | **MIXED** | Evitó dump AR. Ahora ahoga C1/C2/F |
| Causalidad / Recommendation N5 | **KEEP** | No es sobreprogramación |

C2 demuestra otra vez: GPT sintetiza bien **cuando recibe el pack correcto**. El fallo de F no es el modelo.

---

## Memoria persistente (repo ≠ entorno)

- Repo: `pending_work_items_only` IMPLEMENTED.
- Entorno: **PENDING UNTIL SQL 017 APPLIED**. No se afirma activo. Esta tarea no ejecutó SQL.
- MEMORY ≠ EVIDENCE se conserva.
- Fecha diaria **no** se persiste (`daily_not_persisted`).
- **DEPLOYMENT_GAP** no gana: no es el mayor bloqueo del north star. Con 017 aplicado, F y D siguen.

---

## Candidatos descartados (no el único)

1. **Descuento/kg diario** — MISSING_INFRASTRUCTURE. Fuente y fórmula existen. Routing no. Importante. **No** único: no explica F ni A ni B-libre.
2. **Lookup acción/Julio** — ROUTING + lookup AR. Hilo distinto.
3. **SQL 017** — DEPLOYMENT_GAP. No confundir con arquitectura.
4. **Trade-off margen/competencia** — MISSING_DATA + CONTRACT (no N5). Fuera.
5. **MODEL_REASONING_LIMIT** — no. El modelo no llega a ver el pack en F.

---

## Cuello de botella — exactamente uno

**Nombre:** El follow-up natural está cerrado por phrasebook: kinds enumerados + `unknown→clarificación` + «¿Y eso?» como entidad + huecos enlatados en planta.

**Clase:** `OVERPROGRAMMING`

**Dónde (físico):**

1. `lib/director-ia-conversation-state.js` `classifyTurnKind` (~96–180): lista cerrada; `^y [a-z0-9]` marca `entity_intro`.
2. `isDefensibleFollowUpKind` / `isDailyFollowUpKind`: `other` nunca hereda.
3. `lib/director-ia-chat.js` ~2726: `intent === "unknown" && !inherit` → `buildUnknownClarificationResult` y **borra** estado.
4. `continuityNeedsUniqueEntity`: `entity_intro` exige cliente; «¿Y eso?» no es cliente.
5. `lib/director-ia-chat.js` ~3191–3238: early return `buildGapWhatAnswer` / Who / WhyNeed **solo** en `plant_diagnosis` (el diario ya deja GPT).

**Por qué es ahora el mayor bloqueo:** el north star es conversar con datos. Tras GAP-002 se construyó pack de planta y pack diario. El ejecutivo **ya tiene** evidencia en C1 y C2. El siguiente acto humano (elipsis, «¿y eso?», «¿cómo así?», «¿entonces qué falta?») **no usa esa evidencia**. GPT no falla: **no lo llaman**. Identificar qué falta también falla en variantes, aunque el gap esté calculado.

**Qué desbloquearía arreglarlo:** C1/C2/F con elipsis → requery + HILO + GPT; huecos redactados; «¿Y eso?» continúa el pack, no pide un cliente. KEEP intacto: authz, joins, fechas, matemáticas, provenance, entidad cuando hay **nombre**, persona solo con vínculo físico, no dump AR.

**Qué NO resolvería:** pack de descuento/kg ayer; lookup «acción de Julio»; SQL 017; trade-off económico; N5; causalidad.

No es recencia. No es el 52.5%. No es «falta un módulo». No se eligió descuento por analogía con GAP-002.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una, contra ese cuello:

`ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001`

Readiness (no IMPL todavía): qué `unknown`/elipsis puede heredar `parent_intent` con pack fresco **sin** reabrir el dump de Action Register; qué hacer con «¿Y eso?» vs `entity_intro`; si los early-return de hueco de planta se sustituyen por GPT con gap estructurado (persona KEEP); no relajar authz, `cliente_key`, fechas ni matemáticas.

STOP.
