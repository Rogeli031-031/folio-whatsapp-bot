# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCT_EXPERIENCE_AUDIT_ONLY"
north_star_met: false
compared_to:
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
prior_bottleneck_gap002: "FIXED (daily sales no longer answered with monthly pack)"
prior_bottleneck_gap003: "FIXED (natural follow-up inheritance strategy B; not re-selected)"
single_bottleneck: "action_person_routing_does_not_load_existing_AR"
failure_class: "MISSING_INFRASTRUCTURE"
next_task_proposed: "ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
sql_017_executed: false
sql_017_environment: "UNCONFIRMED"
discount_kg_implemented: false
natural_followup_reselected: false
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-action-register.js"
  - "lib/director-ia-daily-deviation.js"
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

El north star **aún no** se cumple. Sí se cumplió, de forma material, lo que GAP-003 eligió como cuello.

**GAP-002:** venta ayer respondida con pack mensual → **arreglado**.  
**GAP-003:** follow-up natural cerrado por phrasebook → **arreglado** (estrategia B). **No se vuelve a elegir.**

Tras esas correcciones el ejecutivo **ya puede** hablar de planta y de venta de ayer sin recitar un guion: `¿Y eso?`, `No te seguí`, `¿O sea?`, `¿Qué falta?`, `¿Para qué?` heredan, hacen requery y llegan a GPT.

**Cuello único restante:** preguntar por **la acción de una persona** (Julio Pérez) **no carga el Action Register que ya existe**. En frío: memoria intercepta «qué pasó con» como resume de work item, el planner queda `unknown`, y el chat clarifica **sin abrir AR**. Los datos (revisiones, responsable vía `usuarios`, vencidas, board) **sí están**. El fallo es routing + ausencia de lookup persona/acción.

Clase: **MISSING_INFRASTRUCTURE**.

No se eligió descuento/kg por analogía. No se eligió SQL 017 (deployment ≠ arquitectura). No se eligió trade-off (faltan datos económicos; GPT no debe inventar margen por cliente).

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-004` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Trazas estáticas contra runtime actual: `detectDirectorIaIntent`, `classifyTurnKind`, `resolveConversationTurn` (estrategia B), `classifyPersistentMemoryTurn`, `askDirectorIa`, loaders AR/planta/diario/M9, DDL `arr.descuentos_diarios_cliente`.

---

## GAP-002 → GAP-003 → ahora

| Dimensión | GAP-002 | GAP-003 | Ahora |
|---|---|---|---|
| Venta ayer | `financial_diagnosis` / M9 mensual | `daily_sales_deviation` + GPT en guion | **Igual de correcto** + follow-ups libres (`¿O sea?`) heredan |
| Follow-up libre planta | Phrasebook; «¿Y eso?» era cliente | Phrasebook = cuello único | **Hereda** `plant_diagnosis`; GPT; no es entidad |
| Huecos planta | Early return `Me falta:` | Sigue enlatado | **GPT** (early returns de hueco quitados en chat) |
| Memoria repo | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED. Entorno SQL 017 **UNCONFIRMED** |
| Descuento/kg diario | Tablas sí, chat no | Igual; no elegido | Igual; **no elegido** |
| Acción de Julio | Routing; dump legado a veces citaba overdue | Routing + intercept memoria; no cuello porque F era peor | **Sigue roto en frío.** Ahora **es** el cuello: A/B ya conversan |
| Trade-off | MISSING_DATA | Fuera | Pack de planta puede hablar; **no** hay margen/costo de igualar oferta |
| Topic switch | Fuera de slice | Fuera de slice | `Volvamos a la venta de ayer` es standalone diario **y** se aclara por `topic_return`. Residual. **No** el único |

**Qué ya NO debe tratarse como cuello:** herencia de follow-up natural / phrasebook genérico.

**Qué sigue roto:** lookup AR por persona; descuento/kg diario; topic stack; SQL 017 en entorno; datos de trade-off económico.

---

## A — conversación libre de planta

Propósito: verificar que B eliminó el phrasebook como cuello.

Estado inicial: vacío. Tras el primer turno: `parent_intent=plant_diagnosis`, bundle `plant_diagnosis`.

| Turno | planner | parent | inherit | standalone | entidad/fecha | sources | requery | evidence | limitations | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ¿Cómo va Puebla? | `plant_diagnosis` 0.84 | crea | no | **sí** | — | AR DICF bitácora ARR IGF CS | n/a (1er pack) | pack 6 bloques | limitations del pack | **sí** | no | Ninguno de routing. Periodo = mes comercial, no «hoy». |
| ¿Y eso? | unknown 0.35 | plant | **sí** | no | no es cliente (`eso`) | mismo loader | **sí** | pack fresco | sí | **sí** | no | **Ninguno.** GAP-003: clarificación de entidad. |
| No te seguí. | unknown | plant | **sí** | no | — | idem | **sí** | fresco | sí | **sí** | no | Hold-out. No está en `lib/`. |
| ¿Qué otra cosa ves? | unknown | plant | **sí** | no | — | idem | **sí** | fresco | sí | **sí** | no | Hold-out. |
| ¿Entonces? | unknown | plant | **sí** | no | — | idem | **sí** | fresco | sí | **sí** | no | — |
| ¿Qué falta? | unknown (kind `other`, no `gap_what`) | plant | **sí** | no | gap en HILO si el pack lo derivó | idem | **sí** | fresco + `pending_information_gap` | sí | **sí** | no | GAP-003 clarificaba. Ahora GPT redacta. |
| ¿Quién puede aclararlo? | unknown (`gap_who`) | plant | **sí** | no | persona solo si vínculo físico en pack | idem | **sí** | fresco | sí | **sí** | no | Early return `buildGapWhoAnswer` **ya no** intercepta el chat. |
| ¿Para qué? | unknown (no matchea `para que la necesitas`) | plant | **sí** | no | — | idem | **sí** | fresco | sí | **sí** | no | — |

**Veredicto A:** el follow-up natural **funciona**. No es el cuello.

---

## B — venta diaria

| Turno | planner | parent | inherit | standalone | fecha | sources | requery | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|---|---|---|
| ¿Por qué bajó la venta ayer? | `daily_sales_deviation` 0.92 | crea | no | **sí** | `active_date` ayer CDMX | `arr.ventas_diarias_cliente` + DICF/comments `cliente_key` | 1er pack | **sí** | no | Ninguno. Contribución ≠ causa. |
| ¿O sea? | unknown | daily | **sí** | no | se preserva | forceIntent daily | **sí** | **sí** | no | Hold-out. |
| ¿Quién explica más? | unknown (no `client_analysis`; no dice «clientes») | daily | **sí** | no | sí | contribuciones del pack | **sí** | **sí** | no | GAP-003 temía DICF; B lo evita. |
| ¿Y por canal? | unknown (`channel_probe`) | daily | **sí** | no | sí | canal del pack | **sí** | **sí** | no | — |
| ¿Sabemos por qué? | unknown (`why_know`) | daily | **sí** | no | sí | gaps | **sí** | **sí** | no | No programa causa. |
| ¿Qué falta? | unknown | daily | **sí** | no | sí | `information_gaps` | **sí** | **sí** | no | — |
| ¿Quién puede decirnos? | unknown | daily | **sí** | no | sí | responsable solo si acción ligada | **sí** | **sí** | no | — |

**Veredicto B:** conversación diaria natural **sí**. No es el cuello. Descuento/kg **no** entra aquí (excluido a propósito).

---

## C — acción de Julio Pérez (cuello)

Datos AR **existen:** `buildActionRegisterBoardPayload` lee revisiones/acciones; `responsable` via `LEFT JOIN public.usuarios`; `summarizeTopOverdueActions`; `summarizeActionRegisterResponsables`. El dump legado de `askDirectorIa` (rama final, si el intent cayera a AR) **sí** cargaría el board. `action_status` / `overdue_actions` **no** tienen rama in-process propia: caerían a ese dump **si** el planner los detectara.

El planner **no** detecta «acción de \<persona\>».

| Turno | planner | mem | inherit (frío) | inherit (si ya hay plant) | sources frío | GPT frío | det. frío | Fallo |
|---|---|---|---|---|---|---|---|---|
| ¿Qué pasó con la acción de Julio Pérez? | **unknown** 0.35. No `action_status` (falta abiert/pendient/estado/tema/register). No `overdue_actions`. No `responsible_lookup`. | **resume**; hint = `la acción de Julio Pérez` (no es cliente) | no | **sí** → `plant_diagnosis` | **ninguna** (clarifica) | **no** | **sí** clarificación | **ROUTING.** Memoria se apropia de «qué pasó con». Sin work item matching, `resumeItem=null`. Unknown + !inherit → `buildUnknownClarificationResult`. AR **no se consulta**. |
| ¿Está vencida? | unknown (`overdue_actions` exige `acciones`+`vencid`) | none | no | sí (plant) | ninguna | no | sí | Sin parent no hay hilo. |
| ¿Por qué no la cerró? | unknown | none | no | sí | ninguna | no | sí | No hay loader de cierre/historial de ítem por persona. |
| ¿Lo sabemos? | unknown | none | no | sí | ninguna | no | sí | — |
| ¿Qué información falta? | unknown | none | no | sí | ninguna | no | sí | — |

Si el usuario **ya** está en `plant_diagnosis`, estrategia B **sí** heredaría y GPT vería como mucho **5** vencidas y **5** responsables (`AR_OVERDUE_LIMIT` / `AR_RESPONSABLES_LIMIT`). Julio puede no estar. No hay historial de cierre ni motivo de no-cierre. Eso no es «conocer la acción de Julio»; es un recorte.

**Determinación:** el problema **principal es routing** (y no hay lookup persona→acciones). **No** es que falten tablas de AR. **No** es el modelo: el modelo no recibe el board.

---

## D — descuento/kg ayer (auditoría propia; no analogía)

| Capa | ¿Existe? | ¿Chat diario? |
|---|---|---|
| Fecha | **Sí.** `arr.descuentos_diarios_cliente.fecha` | **No** corte `fecha = ayer`. M9 agrupa `DATE_PART year/month`. |
| Fórmula | Readiness + M9: join monto↔kg. Planta: **`SUM(monto)/SUM(kg)`**, no average-of-averages. | Mensual `delta_discount`. No día. |
| Cliente | **Sí.** `cliente_norm` PK con planta+fecha | No en path diario. |
| Canal | **No** en la tabla de descuento. Ventas sí tienen canal. Inferir canal = no hecho. `channel_available: false` | Correcto no afirmar canal. |
| Ponderación cliente-día | Factible: mismo `cliente_norm`+día, monto y kg | No implementado. |
| Join evidencia DICF/comments | Factible por `cliente_key` como venta diaria | No hay pack. |
| Routing turno 1 | `isDailySalesDeviationQuestion` **excluye** descuento sin venta. `delta_discount` exige cambio/variación/delta, no «subió». `financial_diagnosis` exige caída ingreso/venta/margen. | **unknown → clarificar.** OpenAI no. |

Follow-ups D: sin parent, todos clarifican.

**¿Puede responder descuento/kg ayer?** No. Clase: **MISSING_INFRASTRUCTURE**. Importante. **No** es el cuello único: no explica C, ni el north star de «conocer a la gente y las acciones».

---

## E — memoria cross-session

| Sesión | Turno | Runtime |
|---|---|---|
| 1 | ¿Por qué dejó de comprar Arturo? | `plant_diagnosis` 0.84 standalone. Hint `Arturo`. GPT + pack. Puede crear work item si entidad única + gap + store + `actor_id`. |
| 1 | ¿Qué falta? | unknown → **inherit** plant → GPT. GAP-003 clarificaba. |
| 2 | ¿Qué pasó con Arturo? | `resume` + hint `Arturo`. **Repo:** retrieve + authz + requery. **Entorno:** hace falta SQL 017 aplicado. Sin tabla: retrieve vacío. Con parent plant en el **mismo** request heredaría; chat **nuevo** sin eco ni SQL → unknown → clarifica. |
| 2 | ¿Ya sabemos por qué? | `why_know`. Con parent plant: **inherit sí** (GAP-003: no). |
| 2 | ¿Qué sigue faltando? | inherit si hay parent. |

Memoria: **repo IMPLEMENTED ≠ entorno activo.** SQL 017 **UNCONFIRMED**. **DEPLOYMENT_GAP** separado. No se presenta como fallo arquitectónico de memoria. No es el cuello: con 017 aplicado, C sigue sin lookup AR.

---

## F — trade-off económico

Planner: `plant_diagnosis` 0.84 (`dejo_de_comprar`). Standalone. GPT **sí** recibe pack de planta + la pregunta larga.

El pack puede traer: materialidad de Arturo, comentario almacenado («competencia»), acción DICF, limitations. Prompt de planta: comentario de competencia = **declaración, no causa**.

**Qué dato falta realmente (no inventar):**

- No hay margen / contribución / costo-de-servir **por cliente** en el pack de planta ni en daily.
- IGF/ARR margen es **planta $/kg**, no P&L de Arturo.
- No hay términos estructurados de la oferta competidora (solo texto de comentario).
- No hay «costo de igualar» ni trade-off recuperable vs no recuperable.

GPT **puede** decir qué sabe (comentario, kg, cobertura) y qué faltaría para decidir. **No** puede calcular si igualar pierde dinero. Clase: **MISSING_DATA** (+ no N5). No es el cuello cotidiano: es un techo de decisión económica, no de «conocer AR/venta/planta».

---

## G — cambio de tema

| Turno | planner | kind | inherit | out_of_slice | GPT | Fallo |
|---|---|---|---|---|---|---|
| ¿Cómo va Puebla? | plant 0.84 | other | no (standalone) | no | sí | — |
| ¿Qué más? | unknown | other | **sí** plant | no | sí | GAP-003 moría. |
| Ahora dime el presupuesto. | **unknown** (presupuesto sin semana/semanal/carro) | **`plant_switch`** (`^ahora dime`) | no | no | **no** | No entra a M18. `unknown && !inherit` → clarifica. |
| ¿Y eso? | unknown | other | no (estado vacío tras clarificar) | no | no | — |
| Volvamos a la venta de ayer. | **`daily_sales_deviation` 0.92 standalone** | **`topic_return`** | no | **sí** | **no** | Clarificación enlatada *antes* de honorar el standalone diario. Pack diario **existe** y no se carga. |

Residual **OVERPROGRAMMING** de `topic_return` vs standalone. Topic stack sigue diferido. **No** elegido: A/B ya conversan dentro del tema; G es cambio de estantería. C es «no encuentra a Julio en la empresa».

---

## Information gaps

Objetivo: qué sabe / no sabe / qué falta / para qué / quién **solo** con vínculo físico.

| Superficie | Pack trae estructura | GPT formula ahora | Enlatado en chat |
|---|---|---|---|
| `plant_diagnosis` | `derivePendingInformationGap` | **Sí** (A: `¿Qué falta?`, `¿Para qué?`, `¿Quién puede aclararlo?`) | `buildGapWhat/Who/WhyNeed` **siguen en** `conversation-state.js` pero **el chat ya no los llama** |
| `daily_sales_deviation` | `information_gaps` | **Sí** | no early return diario |
| C frío | no hay pack | no | clarificación |
| D | no hay pack | no | clarificación |

Persona: **KEEP_DETERMINISTIC** el vínculo físico en el pack. **LET_GPT_REASON** la prosa. Ya no es el cuello.

---

## Overprogramming residual

| Área | Clase | Nota |
|---|---|---|
| Authz, planta, `cliente_key`, null≠0, SOURCE_RESTRICTED, fechas CDMX, matemáticas, no causa/N5 | **KEEP_DETERMINISTIC** | Verdad |
| Entidad única si el usuario **nombra** un cliente; demostrativos ≠ cliente | **KEEP_DETERMINISTIC** | Identidad |
| Estrategia B inherit unknown | **LET_GPT_REASON** | Ya integrado |
| Huecos planta via GPT | **LET_GPT_REASON** | Ya integrado |
| `classifyTurnKind` listas (attention/why/gap_*) | **MIXED** | Ya no son puerta de inherit; aún sirven dailyFollowUp vs `client_analysis` |
| `^ahora dime` → `plant_switch`; `^volvamos` → `topic_return` que pisa standalone diario | **OVERPROGRAMMING** | G. Residual, no el único |
| `qué pasó con` → resume memoria antes de AR | **MIXED** | Correcto para work items; **rompe** acciones de persona |
| Smalltalk/help | **KEEP_DETERMINISTIC** | — |
| Clarificación unknown **sin** estado | **KEEP_DETERMINISTIC** | Evita dump AR ciego |

---

## Candidatos descartados

1. **Natural follow-up / phrasebook** — **ARREGLADO.** Prohibido reelegirlo.
2. **Descuento/kg diario** — MISSING_INFRASTRUCTURE real. No por analogía con GAP-002. No único.
3. **SQL 017** — DEPLOYMENT_GAP. Repo IMPLEMENTED.
4. **Trade-off margen cliente** — MISSING_DATA. No inventar.
5. **Topic stack / «volvamos»** — OVERPROGRAMMING residual. Menor que no hallar a Julio.
6. **MODEL_REASONING_LIMIT** — no. En A/B GPT razona cuando recibe pack.

---

## Cuello de botella — exactamente uno

**Nombre:** El Action Register por persona/acción no se rutea: «¿Qué pasó con la acción de Julio Pérez?» no carga los datos AR que ya existen.

**Clase:** `MISSING_INFRASTRUCTURE`

**Dónde (físico):**

1. `lib/director-ia-planner.js`: no hay intent «acción de \<persona\>»; `action_status` / `overdue_actions` / `responsible_lookup` no cubren esa frase.
2. `lib/director-ia-persistent-memory.js` `classifyPersistentMemoryTurn`: `\bque paso con\b` → `resume` con hint `la acción de Julio Pérez`.
3. `lib/director-ia-chat.js`: `unknown && !inherit` clarifica **sin** board AR; no hay rama de lookup por responsable; `action_status` ni siquiera tiene `if (intent === ...)`.
4. `lib/director-ia-plant-diagnosis.js`: aunque se herede planta, AR llega recortado a 5+5. No es expediente de la acción de Julio (cierre, vencida, historial).

**Conversaciones que rompe:** **C** completa en frío; cualquier «qué pasó con la acción de \<nombre\>» / «está vencida» / «por qué no la cerró» sin hilo de planta previo. Debilita «conoce la empresa»: AR es el dominio original de Director IA.

**Por qué es ahora el mayor bloqueo:** el north star pide hablar con alguien que **conoce los datos disponibles**. Planta, venta ayer, follow-ups y huecos **ya** llegan a GPT. El siguiente acto cotidiano de gerencia —preguntar por **una acción y un responsable que ya están en AR**— ni siquiera abre la fuente. No es recencia. No es 52.5%. No es simetría con daily discount.

**Qué desbloquearía arreglarlo:** C con evidencia AR de esa persona/ítem (vencida sí/no, estado, responsable con join físico, historial/cierre si existe); distinguir resume de work item vs lookup AR; KEEP authz/planta; no dump ciego de todo el board como «la respuesta».

**Qué NO resolvería:** pack de descuento/kg ayer; SQL 017 en entorno; trade-off económico por cliente; topic stack; N5; causalidad.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una, contra ese cuello:

`ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001`

Readiness (no IMPL todavía): cómo rutar «acción de \<persona\>» al Action Register existente **sin** romper resume de `pending_work_items_only`; qué evidencia de ítem/responsable/cierre es SELECT-only y suficiente; cómo no reabrir el dump AR como respuesta final; no relajar authz; no mezclar Julio-cliente con Julio-responsable.

STOP.
