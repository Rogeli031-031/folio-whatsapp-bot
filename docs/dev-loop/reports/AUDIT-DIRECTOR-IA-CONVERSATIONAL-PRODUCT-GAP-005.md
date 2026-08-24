# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCT_GAP_AUDIT_ONLY"
north_star_met: false
compared_to:
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
prior_bottleneck_gap002: "FIXED (daily sales no longer answered with monthly pack)"
prior_bottleneck_gap003: "FIXED (natural follow-up inheritance strategy B; not re-selected)"
prior_bottleneck_gap004: "FIXED (action_status person/action routing strategy C; not re-selected)"
single_bottleneck: "daily_discount_kg_not_loaded_for_yesterday"
failure_class: "MISSING_INFRASTRUCTURE"
next_task_proposed: "ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
sql_017_executed: false
sql_017_environment: "UNCONFIRMED"
discount_kg_implemented: false
topic_return_real: true
topic_return_selected: false
natural_followup_reselected: false
action_person_reselected: false
daily_sales_monthly_reselected: false
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-action-person.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/dicf.js"
  - "sql/arr_forecast_schema.sql"
  - "sql/017_director_ia_pending_work_items.sql"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. Sí se cumplieron, de forma material, los tres cuellos anteriores.

**GAP-002:** venta ayer respondida con pack mensual → **arreglado**.  
**GAP-003:** follow-up natural cerrado por phrasebook → **arreglado**. **No se vuelve a elegir.**  
**GAP-004:** Action Register por persona/acción no se cargaba → **arreglado** (estrategia C, `action_status`). **No se vuelve a elegir.**

Tras esas correcciones el ejecutivo **ya puede** hablar de planta, de venta de ayer y de la acción de un responsable registrado, con evidencia fresca y GPT.

**Cuello único restante:** preguntar **«¿Por qué subió el descuento/kg ayer?»** no carga las tablas diarias que ya existen. El planner excluye descuento del path diario; no hay pack `SUM(monto)/SUM(kg)` a grano de día; GPT no se invoca. Los datos (`arr.descuentos_diarios_cliente.fecha` + kg en `arr.ventas_diarias_cliente`) **sí están**. El fallo es ausencia de infraestructura de consulta diaria, no del modelo.

Clase: **MISSING_INFRASTRUCTURE**.

No se eligió topic-return (problema real de OVERPROGRAMMING residual; workaround: repetir la pregunta de venta sin «volvamos»). No se eligió SQL 017 (deployment ≠ arquitectura). No se eligió trade-off (faltan datos económicos; GPT no debe inventar margen por cliente). No se propusieron reglas nuevas donde GPT ya recibe pack.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-005` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Trazas estáticas contra runtime actual: planner, `classifyTurnKind`, `resolveConversationTurn`, `classifyPersistentMemoryTurn`, `askDirectorIa` (`out_of_slice_clarify`), loaders diario/AR-persona/planta/M9, DDL `arr.descuentos_diarios_cliente`, `DAILY_DISCOUNT_READINESS`.

---

## GAP-002 → GAP-003 → GAP-004 → ahora

| Dimensión | GAP-002 | GAP-003 | GAP-004 | Ahora |
|---|---|---|---|---|
| Venta ayer | pack mensual | `daily_sales_deviation` + GPT en guion | + follow-ups libres | **Igual de correcto.** No reelegir. |
| Follow-up libre | phrasebook | cuello único | **hereda** | **Hereda.** No reelegir. |
| Acción de Julio | routing | no elegido | **cuello:** no cargaba AR | **`action_status` carga board; 0/1/N; inheritable.** No reelegir. |
| Descuento/kg diario | tablas sí, chat no | igual; no elegido | igual; no elegido | **Sigue sin pack diario. Ahora es el cuello:** A/B/C ya conversan. |
| Trade-off Arturo | MISSING_DATA | fuera | pack planta; sin margen cliente | Igual. GPT puede decir qué falta. No inventar. |
| Memoria repo | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED. SQL 017 **UNCONFIRMED**. |
| Topic return | fuera | fuera | residual OVERPROGRAMMING | **Sigue real.** No elegido: hay workaround; D no tiene ninguno. |

**Qué ya NO debe tratarse como cuello:** routing mensual de venta diaria; phrasebook de follow-up; lookup AR por persona/acción.

**Qué sigue roto:** pack descuento/kg ayer; «volvamos a…» pisa standalone diario; SQL 017 en entorno; datos de trade-off económico.

---

## A — planta

Estado inicial: vacío. Tras el primer turno: `parent_intent=plant_diagnosis`.

| Turno | planner | parent | inherit | entidad/fecha | sources | requery | evidence | limitations | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ¿Cómo va Puebla? | `plant_diagnosis` 0.84 | crea | no | — | AR DICF bitácora ARR IGF CS | 1er pack | 6 bloques | del pack | **sí** | no | Ninguno de routing. Periodo = mes comercial. |
| ¿Qué más? | unknown | plant | **sí** | — | mismo loader | **sí** | fresco | sí | **sí** | no | — |
| ¿Qué te preocupa? | unknown | plant | **sí** | — | idem | **sí** | fresco | sí | **sí** | no | GPT formula; no phrasebook. |
| ¿Qué falta saber? | unknown (`gap_what`) | plant | **sí** | gap en HILO si el pack lo derivó | idem | **sí** | fresco + `pending_information_gap` | sí | **sí** | no | `buildGapWhatAnswer` **no** intercepta el chat. |
| ¿Para qué necesitas ese dato? | unknown (`gap_why_need`) | plant | **sí** | — | idem | **sí** | fresco | sí | **sí** | no | GPT; no enlatado. |

**Veredicto A:** conversación natural **sí**. No es el cuello.

---

## B — venta diaria

| Turno | planner | parent | inherit | fecha | sources | requery | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|---|---|
| ¿Por qué bajó la venta ayer? | `daily_sales_deviation` 0.92 | crea | no | `active_date` ayer CDMX | `arr.ventas_diarias_cliente` + DICF/comments `cliente_key` | 1er pack | **sí** | no | Ninguno. Contribución ≠ causa. Descuento/kg **excluido** a propósito. |
| ¿Quién explica más? | unknown (no `contributors` exacto) | daily | **sí** | sí | contribuciones | **sí** | **sí** | no | — |
| ¿Sabemos por qué? | unknown (`why_know`) | daily | **sí** | sí | gaps | **sí** | **sí** | no | No programa causa. |
| ¿Qué falta? | unknown | daily | **sí** | sí | `information_gaps` | **sí** | **sí** | no | — |
| ¿Quién podría aclararlo? | unknown | daily | **sí** | sí | persona solo si acción ligada | **sí** | **sí** | no | — |

**Veredicto B:** venta diaria **sí**. No es el cuello. No reelegir GAP-002.

---

## C — acción de Julio Pérez (ya no es cuello)

| Turno | planner | mem | inherit | sources | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|
| ¿Qué pasó con la acción de Julio Pérez? | **`action_status`** 0.86 (`accion` + span de nombre) | resume de «qué pasó con» **no gana** | no (standalone) | board AR planta; 0/1/N | **sí** si 1 acción o listado N | clarifica si 0/ambiguo | **Ninguno de routing.** AR > memory. |
| ¿Está vencida? | unknown | none | **sí** `action_status` | requery board | **sí** | no | Vencida = hecho del registro, no culpa. |
| ¿Por qué no la cerró? | unknown | none | **sí** | pack + limitation `sin_explicacion_registrada_del_retraso` si no hay historial/resultado | **sí** | no | GPT puede decir que no hay motivo registrado. No inventa. |
| ¿Qué información falta? | unknown | none | **sí** | limitations | **sí** | no | — |
| ¿Qué necesitas de Julio? | unknown | none | **sí** | Julio = responsable **registrado** | **sí** | no | Fuente de actualización, no culpable. |

**Veredicto C:** GAP-004 **arreglado**. No se reelige.

---

## D — descuento/kg ayer (auditoría propia; cuello)

### Fuente física

| Pieza | ¿Existe? | ¿Chat diario? |
|---|---|---|
| Source | **Sí.** `arr.descuentos_diarios_cliente` (`plant_code`, `fecha`, `cliente_norm`, `monto`). Kg en `arr.ventas_diarias_cliente` (mismo `plant_code`+`fecha`+`cliente_norm`; ventas **sí** tienen `canal`). | **No.** `DAILY_DISCOUNT_READINESS.implemented = false`. El loader diario **no** lee `descuentos_diarios_cliente` (test lo afirma). |
| Fecha | **Sí.** `fecha` DATE. Semántica diaria = mismo «ayer» CDMX que venta. | M9 agrupa `DATE_PART year/month`. No hay corte `fecha = ayer` en chat. |
| Fórmula planta | Readiness + DICF: **`SUM(monto)/SUM(kg)`**. **No** average-of-averages. | No implementado. |
| Trampa M9 | `buildDeltaDescuentoDatosPayload` hace `totalDeltaRatio = suma(ratios cliente) / N`. Eso **promedia ratios**. Copiarlo al diario sería incorrecto. | No usar como plantilla del pack diario. |
| Cliente | **Sí.** PK con planta+fecha+`cliente_norm`. | No en path diario. |
| Canal | **No** en la tabla de descuento. `channel_available: false`. Inferir canal desde ventas = no hecho físico del descuento. | Correcto no afirmar canal. |
| Contribución ponderada | Factible: join `cliente_norm`+día de monto y kg; peso = kg; mover del promedio planta ≠ mayor ratio individual. | No implementado. |
| Mix | Mix **por cliente** factible (cambio de shares kg × rates). Mix **por canal** no es físico en la fila de descuento. | No implementado. |
| Evidencia de negocio | Factible por `cliente_key` como venta diaria (DICF + comments). Comentario ≠ causa. | No hay pack. |
| Ausencia/error | Día sin filas ≠ descuento 0. `null` ≠ 0. `SOURCE_RESTRICTED` ≠ missing. | No hay semántica de chat. |

### Routing del turno 1

`isDailySalesDeviationQuestion`: si hay `descuento` y no hay `venta`/`vendimos`/`vendio` → **false**.  
`delta_discount` exige `cambio|variacion|delta`, **no** «subió».  
`financial_diagnosis` exige caída de ingreso/venta/margen.  

**«¿Por qué subió el descuento/kg ayer?» → `unknown` 0.35 → clarificación. OpenAI no. Fuentes no.**

| Turno | planner | parent | inherit | sources | GPT | det. | Fallo |
|---|---|---|---|---|---|---|---|
| ¿Por qué subió el descuento/kg ayer? | **unknown** | — | no | **ninguna** | **no** | **sí** clarifica | **NO HAY PACK DIARIO.** Tablas sí. |
| ¿Contra qué lo comparas? | unknown (`reference_probe`) | no hay daily | no | ninguna | no | sí | Sin parent. |
| ¿Quién movió más el promedio? | unknown | — | no | ninguna | no | sí | Highest ratio ≠ biggest mover: ni siquiera se calcula. |
| ¿Fue general? | unknown | — | no | ninguna | no | sí | — |
| ¿Sabemos por qué? | unknown | — | no | ninguna | no | sí | — |
| ¿Qué falta? | unknown | — | no | ninguna | no | sí | — |

Si el wording cayera a `delta_discount` («cómo cambió el descuento»), respondería **meses**, no ayer: el mismo tipo de error que GAP-002, ahora en descuento.

**Determinación:** el problema **principal es infraestructura de consulta diaria**. **No** es que falten tablas. **No** es el modelo: el modelo no recibe monto/kg del día.

---

## E — trade-off Arturo (MISSING_DATA; no el cuello)

Planner turno 1: `plant_diagnosis` 0.84 (`dejo_de_comprar`). Standalone. GPT **sí** recibe pack de planta + la pregunta.

| Qué recibe GPT | Qué existe físicamente | Qué falta |
|---|---|---|
| kg observado, estado comercial, comentario almacenado, acción DICF si hay `cliente_key`, limitations | Comentario de texto (p. ej. «competencia»); flag `es_recuperable`; margen **de planta** IGF (`getMargenKg`) aplicado a todos los clientes en `computeDicf` | Oferta competidora **estructurada** (precio, plazo, volumen). Margen / costo-de-servir **validado por cliente**. Costo de igualar la oferta. P&L de recuperar vs no recuperar. |

**Verdad (no inventar):**

- Comentario de competencia ≠ oferta verificada.
- Margen de planta ≠ margen de Arturo.
- `es_recuperable` no es un cálculo de si igualar pierde dinero.
- La decisión **no es calculable** con el pack actual.

Turnos 2–4: unknown + inherit `plant_diagnosis` → GPT. El prompt ya dice: no recomendar recuperar por volumen; no autorizar descuento; comentario de competencia = declaración.

GPT **puede** decir qué sabe y qué dato económico falta. Añadir reglas determinísticas de «conviene / no conviene» sería **OVERPROGRAMMING**. Clase: **MISSING_DATA**. No es el cuello cotidiano: A/B/C ya conocen planta/venta/acciones; E es un techo de decisión, no de «consultar lo que ya está cargado».

---

## F — memoria cross-session

| Sesión | Turno | Runtime |
|---|---|---|
| 1 | ¿Por qué dejó de comprar Arturo? | `plant_diagnosis` 0.84. GPT + pack. Puede crear work item si entidad única + gap + store + `actor_id`. |
| 1 | ¿Qué falta? | unknown → inherit plant → GPT. |
| 2 | ¿Qué pasó con Arturo? | planner **unknown** (no hay `accion`+nombre). `classifyPersistentMemoryTurn` = **resume**. **Repo:** retrieve + authz + requery. **Entorno:** hace falta SQL 017 aplicado. Sin tabla: retrieve vacío → unknown sin inherit → clarifica. |
| 2 | ¿Ya sabemos por qué? | `why_know`. Con parent rehidratado: inherit. Sin 017 ni eco: clarifica. |

Memoria: **repo IMPLEMENTED ≠ entorno activo.** SQL 017 **UNCONFIRMED** (no hay evidencia física de aplicación en este entorno). **DEPLOYMENT_GAP** separado. No es el cuello: con 017 aplicado, D sigue sin pack de descuento.

---

## G — topic return

| Turno | planner | kind | inherit | out_of_slice | GPT | Fallo |
|---|---|---|---|---|---|---|
| ¿Cómo va Puebla? | plant 0.84 | other | no | no | sí | — |
| Ahora dime el presupuesto. | **unknown** (falta semana/semanal/carro) | **`plant_switch`** | no | no | **no** | No entra a M18. `unknown && !inherit` clarifica. |
| Volvamos a lo de la venta de ayer. | **`daily_sales_deviation` 0.92** (venta+ayer) | **`topic_return`** (`^volvamos`) | no | **sí** | **no** | `askDirectorIa` clarifica **después** del planner y **no carga** el pack diario que ya existe. |
| ¿Quién explicó más? | unknown | other | no (estado vacío tras clarificar) | no | no | — |

**El problema es real.** No es un follow-up ordinario (eso ya hereda dentro del mismo tema). Es un return de estantería: el planner **sí sabe** que es venta ayer; una regla de `topic_return` tira la respuesta. Incluso en frío, una pregunta que empieza por «Volvamos a lo de la venta de ayer» queda bloqueada.

**Impacto:** rompe G. Workaround: repetir «¿Por qué bajó la venta ayer?» (standalone diario funciona). Frecuencia menor que la pregunta diaria de descuento, que **no tiene** phrasing que cargue el dato correcto.

Clase residual: **OVERPROGRAMMING**. **No elegido:** el north star pide datos reales; D no tiene dato que mostrar. G sí lo tiene, mal bloqueado, pero con alternativa inmediata. No se elige por facilidad de arreglo.

---

## Information gaps

¿Puede decir qué sabe / no / qué dato falta / por qué / quién si hay vínculo / qué desbloquea?

| Superficie | Pack trae estructura | GPT formula | Enlatado en chat |
|---|---|---|---|
| `plant_diagnosis` | `derivePendingInformationGap` | **Sí** (A) | `buildGapWhat/Who` existen en conversation-state; **el chat no los llama** |
| `daily_sales_deviation` | `information_gaps` | **Sí** (B) | no early return |
| `action_status` | limitations (`sin_explicacion_registrada_del_retraso`, etc.) | **Sí** (C) | prompt prohíbe inventar motivo |
| D descuento | **no hay pack** | no | clarificación |
| E trade-off | pack planta **sin** dato económico de igualar | **Sí** puede listar el hueco | no debe calcular «conviene» |

Cuando hay pack, el runtime **ya no está** ahogando a GPT con prosa de hueco. Persona: **KEEP_DETERMINISTIC** el vínculo físico. **LET_GPT_REASON** la redacción. D es el caso donde GPT ni siquiera recibe limitations de descuento/kg.

---

## Overprogramming residual

| Área | Clase | Nota |
|---|---|---|
| Authz, planta, `cliente_key`, null≠0, SOURCE_RESTRICTED, fechas CDMX, `SUM(monto)/SUM(kg)`, no causa/N5 | **KEEP_DETERMINISTIC** | Verdad |
| Estrategia B inherit; huecos planta/diario/AR via GPT | **LET_GPT_REASON** | Ya integrado |
| `^volvamos` → `topic_return` que pisa standalone diario | **OVERPROGRAMMING** | G. Real. No el único. |
| Trade-off «conviene recuperarlo» como regla | **LET_GPT_REASON** | Faltan datos; no programar la decisión |
| Clarificación unknown sin estado | **KEEP_DETERMINISTIC** | Evita dump AR ciego |
| Smalltalk/help | **KEEP_DETERMINISTIC** | — |

No se proponen reglas nuevas donde GPT ya tiene evidencia (A/B/C).

---

## Candidatos descartados

1. **Daily sales monthly-routing** — **ARREGLADO.** Prohibido reelegirlo.
2. **Follow-up phrasebook** — **ARREGLADO.** Prohibido reelegirlo.
3. **AR person routing** — **ARREGLADO.** Prohibido reelegirlo.
4. **Topic return / «volvamos»** — OVERPROGRAMMING real. Workaround existe. No único.
5. **SQL 017** — DEPLOYMENT_GAP. Repo IMPLEMENTED. UNCONFIRMED en entorno.
6. **Trade-off margen cliente** — MISSING_DATA. No inventar. GPT ya puede pedir el dato.
7. **MODEL_REASONING_LIMIT** — no. En A/B/C GPT razona cuando recibe pack. En D no recibe pack.
8. **CONTRACT_OR_AUTHZ_LIMIT** — no es el bloqueo de D (las tablas diarias ya se leen en M9 mensual con el mismo gate de planta).

---

## Cuello de botella — exactamente uno

**Nombre:** El descuento/kg de ayer no se consulta: «¿Por qué subió el descuento/kg ayer?» no carga `arr.descuentos_diarios_cliente` + kg del día.

**Clase:** `MISSING_INFRASTRUCTURE`

**Dónde (físico):**

1. `lib/director-ia-planner.js` `isDailySalesDeviationQuestion`: excluye `descuento` sin token de venta.
2. `lib/director-ia-daily-deviation.js`: `DAILY_DISCOUNT_READINESS.implemented = false`; el SELECT diario no toca descuentos.
3. `lib/director-ia-chat.js`: `unknown && !inherit` clarifica **sin** monto/kg del día. No hay rama de descuento diario.
4. `lib/director-ia-m9-deltas.js`: existe comparación **mensual**; su total de ratios **promedia** ratios de cliente — no es el grano ni la fórmula planta del diario.

**Conversaciones que rompe:** **D** completa. Cualquier «descuento/kg ayer / quién movió el promedio / ¿fue general?». Debilita el north star justo donde la venta diaria **ya** funciona: el ejecutivo pregunta el gemelo comercial del día y no obtiene datos.

**Por qué es ahora el mayor bloqueo:** planta, venta ayer, follow-ups y acciones de persona **ya** llegan a GPT. El siguiente acto cotidiano de gerencia —entender **el descuento/kg de ayer** con tablas que ya están cargadas— ni siquiera abre la fuente. No es recencia. No es 52.5%. No es simetría con topic-return. No hay phrasing de trabajo que entregue el día correcto.

**Qué desbloquearía arreglarlo:** D con evidencia diaria (ayer CDMX; `SUM(monto)/SUM(kg)`; referencia declarada; contribución ponderada por cliente; mix de cliente si se calcula; evidencia DICF/comments por `cliente_key`; limitations; GPT). Distinguir mayor ratio ≠ mayor mover. Sin canal físico en descuento. Sin copiar el promedio-de-promedios de M9. Sin degradar `daily_sales_deviation`.

**Qué NO resolvería:** SQL 017 en entorno; trade-off económico por cliente; topic stack / «volvamos»; N5; causalidad; COMPLETE de M9/M8.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una, contra ese cuello:

`ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001`

Readiness (no IMPL todavía): cómo consultar descuento/kg **ayer** sobre tablas existentes **sin** degradar venta diaria; fórmula planta `SUM(monto)/SUM(kg)`; referencia comparable; contribución ponderada; mix de cliente vs canal no físico; join de evidencia por `cliente_key`; ausencia/error; no average-of-averages; no copiar el total M9; no inventar canal; no IES/N5.

STOP.
