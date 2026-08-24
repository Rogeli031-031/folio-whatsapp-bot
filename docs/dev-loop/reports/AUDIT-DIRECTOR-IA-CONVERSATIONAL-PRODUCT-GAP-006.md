# Reporte — AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006"
outcome: "DONE_PENDING_REVIEW"
mode: "EXECUTIVE_CONVERSATION_AUDIT_ONLY"
north_star_met: false
compared_to:
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004"
  - "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
prior_bottleneck_gap002: "FIXED (not re-selected)"
prior_bottleneck_gap003: "FIXED (not re-selected)"
prior_bottleneck_gap004: "FIXED (not re-selected)"
prior_bottleneck_gap005: "FIXED (daily_discount_deviation pack exists; not re-selected)"
single_bottleneck: "intra_session_topic_return_discards_recoverable_context"
failure_class: "OVERPROGRAMMING"
next_task_proposed: "ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
topic_stack_required: false
one_deep_prior_frame_sufficient_if_needed: true
persistent_memory_used_as_topic_return_patch: false
tradeoff_selected: false
sql_017_selected: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-action-person.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-discount.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-m18-presupuesto-semanal.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. Los packs aislados **sí** existen: planta, Arturo, venta ayer, descuento/kg ayer (si se pregunta con **ayer**), Action Register (si hay `acción` + nombre y apellido) y presupuesto semanal (si hay **semana/carro/mi presupuesto**).

Lo que **rompe** una conversación ejecutiva larga no es la ausencia de esas fuentes. Es que el runtime guarda **un solo** `parent_intent`, trata «ahora…» / «volvamos…» como conflicto, y **tira** una clasificación que ya era suficiente.

Hecho físico máximo: `detectDirectorIaIntent("Volvamos a la venta de ayer")` = **`daily_sales_deviation` 0.92**, `standalone=true`. Luego `askDirectorIa` ve `kind=topic_return` → `out_of_slice_clarify=true` y responde **sin GPT y sin pack**.

No se eligió topic stack. Un buffer de N temas **no** está demostrado. «Volvamos a la venta de ayer» se resuelve si el standalone gana. «Volvamos a Arturo» tras un wipe necesita, como máximo, **un** marco previo `{parent_intent, entity, date, gap}` — no una pila.

No se usó `pending_work_items_only` como parche de retorno intra-sesión. No se eligió trade-off (GPT ya puede decir qué dato económico falta). No se eligió SQL 017.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`.

---

## Ejecución

- Rama: `audit/director-ia-conversational-product-gap-006` (≠ `main`).
- HEAD: `4d1e2456 Merge branch 'docs/director-ia-daily-discount-kg-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Traza estática **más** invocación read-only de `detectDirectorIaIntent`, `classifyTurnKind`, `resolveConversationTurn`, `reconstructFromUserHistory`, `classifyPersistentMemoryTurn` sobre el guion de `CURRENT_TASK`.

Estado simulado tras cada turno: el que `askDirectorIa` realmente escribe (`buildConversationState` / `emptyConversationState` / clarify). FE que no reenvíe `conversation_state` cae a `reconstructFromUserHistory`, que **borra** parent/entidad al ver `plant_switch` o `topic_return`.

---

## Estado físico actual (no hay topic stack)

`emptyConversationState` / `buildConversationState` guardan exactamente:

| Campo | Cardinalidad |
|-------|----------------|
| `parent_intent` | 0 o 1, solo si está en `INHERITABLE_INTENTS` |
| `planta_id` | 1 (la del request) |
| `active_entities` | 0 o 1 |
| `last_evidence_bundle_type` | 0 o 1 |
| `pending_information_gap` | 0 o 1 |
| `active_date` | 0 o 1, efímero |

**No hay** `prior_intent`, `prior_entity`, `prior_date`, ni lista de temas.

Intents inheritable: `plant_diagnosis`, `expediente_comercial`, `daily_sales_deviation`, `daily_discount_deviation`, `action_status`. **`budget_status` no es inheritable.** Si M18 llega a cargar, `askDirectorIa` escribe `emptyConversationState` — borra el hilo a propósito.

`history`: `expandQuestionFromChatHistory` solo expande pronombres de cliente. `reconstructFromUserHistory` lee **solo** mensajes `user`. El texto del assistant **no** se usa (correcto como evidencia; inútil para recuperar un tema). Al ver `plant_switch` / `topic_return` / `period_switch` pone `parent_intent=null` y `lastEntityHint=null`.

---

## Conversación larga (20 turnos)

Planta del request = Puebla. «¿Cómo va Puebla?» no cambia de planta; el scope sigue siendo `planta_id` autorizado.

| # | Turno | planner | kind | inherit | parent→ | entity | date | sources | requery | evidence | lim. | GPT | det. | ¿Tema previo recuperable? | Fallo |
|---|-------|---------|------|---------|---------|--------|------|---------|---------|----------|------|-----|-----|---------------------------|-------|
| 1 | ¿Cómo va Puebla? | `plant_diagnosis` 0.84 | other | no | crea plant | — | — | 6 bloques planta | 1º | sí | pack | **sí** | no | n/a | Ninguno |
| 2 | ¿Qué te preocupa? | unknown 0.35 | other | **sí** plant | plant | — | — | planta | **sí** | fresco | sí | **sí** | no | plant sí | Ninguno. Estrategia B. |
| 3 | ¿Y Arturo? | unknown | entity_intro | **sí** plant | plant | Arturo | — | planta + resolución | **sí** | fresco | sí | **sí** si único | clarifica si 0/N | plant sí | Ninguno si Arturo es único en el pack |
| 4 | ¿Sabemos por qué dejó de comprar? | `plant_diagnosis` 0.84 | why_know | no (standalone) | plant | Arturo se conserva | — | planta | **sí** | sí | sí | **sí** | no | sí | Ninguno. No programa causa. |
| 5 | ¿Qué necesitarías para saberlo? | unknown | other | **sí** plant | plant | Arturo | — | planta | **sí** | fresco + gap | sí | **sí** | no | sí | GPT formula el hueco. `buildGapWhatAnswer` **no** se llama en chat. |
| 6 | ¿Cómo estuvo la venta ayer? | `daily_sales_deviation` 0.92 | other | no | **pisa** plant→daily | Arturo **se arrastra** | ayer CDMX | venta diaria + DICF/comments `cliente_key` | 1º daily | sí | gaps | **sí** | no | **plant queda fuera del slot** | Standalone correcto. El marco planta/Arturo **deja de ser parent**. |
| 7 | ¿Qué fue lo que más la movió? | unknown | other | **sí** daily | daily | Arturo | ayer | venta | **sí** | contribuciones | sí | **sí** | no | daily sí; plant no | Ninguno de venta. |
| 8 | ¿Y el descuento? | unknown 0.35 | **pronoun** (`el`) | **sí** daily | daily | Arturo | ayer | **venta, no descuento** | **sí** venta | pack de kg | de venta | **sí** | no | daily sí | **No cambia a `daily_discount_deviation`.** `isDailyDiscount` exige `ayer`. `dailyFollowUp` bloquea standalone. GPT habla de descuento **sin** `SUM(monto)/SUM(kg)`. |
| 9 | ¿Quién lo movió más? | unknown | other | **sí** daily | daily | Arturo | ayer | venta | **sí** | contrib. venta | sí | **sí** | no | daily | Sigue venta, no descuento. |
| 10 | ¿Tiene alguna acción? | unknown | action | **sí** daily | daily | Arturo | ayer | **venta** | **sí** | daily + AR incidental del join | sí | **sí** | no | daily | **No entra a `action_status`.** `kind=action` es follow-up diario. |
| 11 | ¿Está vencida? | unknown | other | **sí** daily | daily | Arturo | ayer | venta | **sí** | daily | sí | **sí** | no | daily | Pregunta de AR contestada con pack de kg. |
| 12 | Bueno, volviendo a Arturo, ¿qué sabemos realmente? | unknown | **other** (no `^volviendo`) | **sí** daily | daily | Arturo (ya estaba; **no** se extrae de la frase) | ayer | **venta** | **sí** | daily | sí | **sí** | no | **No restaura plant** | `extractEntityHint` no entiende «volviendo a Arturo». El usuario cree volver; el parent sigue siendo venta. |
| 13 | ¿Qué te falta… si vale la pena recuperarlo? | unknown | gap_what | **sí** daily | daily | Arturo | ayer | venta | **sí** | gaps de **venta** | sí | **sí** | no | daily | Trade-off económico **no** está en el pack diario. GPT puede decir que falta margen/oferta; no calcular «conviene». |
| 14 | Ahora dime el presupuesto. | unknown 0.35 | **plant_switch** | no | **wipe** | **wipe** | **null** | **ninguna** | no | no | no | **no** | **sí** unknown | **Se pierde todo** | No es `budget_status` (falta semana/carro). `^ahora dime` invalida entidad/fecha. Clarify + `emptyConversationState`. |
| 15 | ¿Y eso? | unknown | other | no | vacío | — | — | no | no | no | no | **no** | **sí** | no | Sin parent. |
| 16 | Volvamos a la venta de ayer. | **`daily_sales_deviation` 0.92** | **topic_return** | no | vacío | — | null | **ninguna** | **no** | **no** | no | **no** | **sí out_of_slice** | **planner sí; runtime no** | `out_of_slice_clarify` gana al standalone. History ya fue wipeada por T14. |
| 17 | ¿Quién explicó más? | unknown | other | no | vacío | — | — | no | no | no | no | **no** | **sí** | no | Cadena rota. |
| 18 | ¿Qué sigue sin explicación? | unknown | other | no | vacío | — | — | no | no | no | no | **no** | **sí** | no | — |
| 19 | ¿Quién podría aclararlo? | unknown | gap_who | no | vacío | — | — | no | no | no | no | **no** | **sí** | no | — |
| 20 | ¿Para qué necesitamos esa información? | unknown | gap_why_need | no | vacío | — | — | no | no | no | no | **no** | **sí** | no | — |

**Veredicto del guion:** Puebla + Arturo + venta ayer **sí**. Pasar a descuento/acción **no** (se queda en venta). Volver a Arturo **no** (sigue venta). Presupuesto **para**. Volver a venta ayer **para** aunque el planner ya sabe el intent. Seguir sin perder contexto: **no, a partir de T14**.

---

## Conversaciones secundarias

### A — planta → presupuesto → Arturo

| Turno | planner | kind | outcome | Recuperable |
|-------|---------|------|---------|-------------|
| ¿Cómo va Puebla? | plant 0.84 | other | standalone plant, GPT | n/a |
| Ahora presupuesto. | unknown | plant_switch | **clarify + wipe** | plant existía; se borra |
| Volvamos a Arturo. | unknown | topic_return | **out_of_slice** | no. Ni entidad ni parent. `extractEntityHint` = null. Memoria persistente **no** clasifica «volvamos». |
| ¿Qué faltaba saber? | unknown | other | clarify | no |

### B — venta → descuento/kg → venta

| Turno | planner | kind | outcome |
|-------|---------|------|---------|
| ¿Por qué bajó la venta ayer? | daily_sales 0.92 | other | standalone. Pack diario **sí**. |
| Ahora dime el descuento/kg. | unknown | **plant_switch** | **clarify + wipe.** Sin `ayer` no es `daily_discount_deviation`. «Ahora dime» mata `active_date`. |
| Volvamos a la venta. | unknown (no dice **ayer**) | topic_return | **out_of_slice.** Ni siquiera hereda daily (ya wipeado). |
| ¿Qué cliente explicaba más? | unknown | other | clarify |

Workaround que **sí** carga descuento: «¿Cómo estuvo el descuento/kg **ayer**?» (standalone 0.92). El ejecutivo no lo usó; el wording natural del guion no entra.

### C — acción Julio → Puebla → acción

`hasProperPersonSpan` exige **dos** tokens con forma de nombre. «Julio Pérez» → `action_status` 0.86. **«Julio» solo → unknown.**

| Turno | planner | mem | outcome |
|-------|---------|-----|---------|
| ¿Qué pasó con la acción de Julio? | **unknown** | **resume** (`qué pasó con`) | Sin apellido: no AR. Si SQL 017 + work item: resume de **memoria**, no board. Si no: clarify. **No reelige GAP-004** (el path canónico con apellido sigue vivo). |
| Ahora dime Puebla. | unknown | none | plant_switch + wipe. «¿Cómo va Puebla?» habría sido standalone. |
| Volvamos a la acción. | unknown | none (`retomar` exige pendiente/lo de) | out_of_slice |
| ¿Por qué seguía abierta? | unknown | none | clarify |

### D — trade-off Arturo

| Turno | planner | inherit | GPT | Dato |
|-------|---------|---------|-----|------|
| Arturo dejó de comprar y competencia ofrece más. | plant 0.84 | no | **sí** pack planta | Comentario/competencia si está en DICF/comments. **No** oferta estructurada. **No** margen por cliente. Residuo: `extractEntityHint` captura `y competencia ofrece más` (regex de «dejó de comprar» hasta el final). |
| ¿Conviene recuperarlo? | unknown | **sí** plant | **sí** | Prompt planta: no recomendar recuperar por volumen; no autorizar descuento. |
| ¿Qué dato económico falta? | unknown | **sí** plant | **sí** | GPT **puede** listar oferta/margen/costo-de-servir. |
| Si tuvieras ese dato, ¿qué calcularías? | unknown | **sí** plant | **sí** | LET_GPT_REASON. No programar «conviene». |

**MISSING_DATA** real. **No es el cuello:** la conversación D **sigue**; el ejecutivo obtiene un techo de decisión, no un corte. El guion largo se corta **antes** por retorno/switch.

### E — memoria cross-session

| Sesión | Turno | Runtime |
|--------|-------|---------|
| 1 | ¿Por qué dejó de comprar Arturo? | plant 0.84. Puede persistir work item si entidad única + gap + store + `actor_id`. |
| 1 | ¿Qué falta? | inherit plant, GPT. |
| 2 | ¿Qué pasó con Arturo? | planner unknown. `classifyPersistentMemoryTurn` = **resume**. Repo IMPLEMENTED. Entorno SQL 017 **UNCONFIRMED**. |
| 2 | ¿Qué quedó pendiente? | resume. |

`pending_work_items_only` es **entre sesiones**. «Volvamos a Arturo» / «Volvamos a la venta» **no** son resume. Usarla para topic return intra-sesión sería el parche que la tarea prohíbe. **DEPLOYMENT_GAP** no elegido.

---

## Auditoría de las frases de retorno

| Frase | kind | planner | mem | GPT | Qué pasa |
|-------|------|---------|-----|-----|----------|
| Volvamos a Arturo. | topic_return | unknown | none | no | out_of_slice. No extrae Arturo. |
| Volvamos a la venta de ayer. | topic_return | **daily_sales 0.92 standalone** | none | **no** | Pack existe. Se descarta. |
| Retomemos la acción. | other | unknown | none | no | No es topic_return. Clarify si no hay parent. |
| ¿Dónde nos quedamos? | other | unknown | none | no | Inherit si hay parent; si no, clarify. No resume. |

Lugar físico del corte:

```2881:2893:lib/director-ia-chat.js
  const directorIaPlan = planDirectorIaQuestion(q, planOptions);
  if (continuityTurn.out_of_slice_clarify) {
    return buildUnknownClarificationResult({
      reason:
        "Ese cambio de periodo o de tema anterior está fuera del hilo actual. No heredo semana, ayer ni un tema apilado.",
```

`out_of_slice_clarify` se enciende si `kind` es `topic_return` o `period_switch` (`resolveConversationTurn` L435–441), **después** del planner y **sin** mirar `standalone`.

`classifyTurnKind`: `^ahora|cambiando de tema|^ahora dime` → `plant_switch` (invalida entidad/fecha; **no** es out_of_slice). `^volvamos|^volviendo a|^hablemos de` → `topic_return`.

«Bueno, volviendo a Arturo…» **no** mata (no ancla al inicio). Peor: hereda el parent **equivocado** (venta).

---

## ¿Hace falta topic stack?

**No.** Demostrado:

1. «Volvamos a la venta de ayer» ya es standalone. No hace falta recordar el tema anterior. El runtime **impide** usar esa clasificación.
2. El guion solo vuelve **un** nivel (Arturo tras daily; venta tras presupuesto). No hay tercer tema apilado.
3. `reconstructFromUserHistory` **ya** recuerda el último parent inheritable y el último `entity_hint` **hasta que** las mismas reglas de switch/return lo borran.
4. History **sí** contiene las preguntas de venta/Arturo. El assistant no hace falta. El runtime **descarta** el user history al clasificar el retorno.

**Estado estructurado mínimo (1 marco previo), no pila:** serviría para «Volvamos a Arturo» / «Retomemos la acción» cuando el planner es unknown y el slot actual ya fue pisado. No se asume ni se elige implementar aquí.

**No** abusar de SQL 017 para esto.

---

## Information gaps

¿Puede decir qué sabe / no / qué falta / por qué / quién / qué desbloquea?

| Superficie | Pack | GPT | Enlatado en chat |
|------------|------|-----|------------------|
| plant T1–T5 | `derivePendingInformationGap` + HILO | **Sí** | `buildGapWhat/Who/WhyNeed` existen y **el chat no los llama** |
| daily sales T6–T7 | `information_gaps` | **Sí** | no |
| daily discount | pack **sí** si hay **ayer** | **Sí** en esa rama | no |
| T8–T13 | pack de **venta** | GPT habla; el hueco es del pack equivocado | no |
| T14–T20 | **sin pack** | **no** | clarify |
| D trade-off | pack planta sin economía de cliente | **Sí** puede pedir el dato | no debe calcular «conviene» |
| Persona | solo `physical_person` con acción ligada | LET_GPT_REASON redacción; KEEP vínculo físico | no se inventa |

Cuando hay pack, **ya no** termina en «información insuficiente» seco. El corte del north star es **perder el pack**, no la calidad del gap.

---

## Reasoning boundary

| Área | Clase | Nota |
|------|-------|------|
| Authz, planta, `cliente_key`, null≠0, fechas CDMX, `SUM(monto)/SUM(kg)`, no causa | KEEP_DETERMINISTIC | Verdad |
| Estrategia B, huecos con pack, trade-off «qué falta» | LET_GPT_REASON | Ya integrado |
| `topic_return` → out_of_slice **aunque** standalone 0.92 | **OVERPROGRAMMING** | Cuello |
| `plant_switch` en «ahora dime el presupuesto/descuento» | **OVERPROGRAMMING** | Wipe + unknown |
| `dailyFollowUp` pronoun/action que impide cambiar a descuento/AR | OVERPROGRAMMING residual | Degrada T8–T11; no es el corte duro |
| `budget_status` → `emptyConversationState` | OVERPROGRAMMING residual | Solo si M18 carga |
| Clarify unknown sin estado | KEEP_DETERMINISTIC | Evita dump AR |
| Memoria persistente para «volvamos» | no aplicar | Cross-session only |

---

## Candidatos descartados

1. GAP-002 venta mensual — **ARREGLADO.** T6 carga daily.
2. GAP-003 phrasebook — **ARREGLADO.** T2/T5/T7 heredan.
3. GAP-004 AR persona — **ARREGLADO** con nombre+apellido. No reelegir por «Julio» sin apellido.
4. GAP-005 descuento/kg — **ARREGLADO** el pack. T8 falla por wording/switch, no por falta de loader.
5. Trade-off margen cliente — MISSING_DATA. GPT ya puede pedir el dato. D conversa.
6. SQL 017 — DEPLOYMENT_GAP. No bloquea el guion intra-sesión más que el retorno.
7. Topic stack N — no demostrado.
8. MODEL_REASONING_LIMIT — GPT razona cuando recibe pack. Aquí no lo recibe en T14–T20.
9. CONTRACT_OR_AUTHZ_LIMIT — no.

---

## Cuello de botella — exactamente uno

**Nombre:** El retorno / cambio de tema intra-sesión descarta contexto que el planner o el history ya tenían.

**Clase:** `OVERPROGRAMMING`

**Dónde (físico):**

1. `lib/director-ia-conversation-state.js` `classifyTurnKind`: `^volvamos` / `^volviendo a` → `topic_return`; `^ahora dime` → `plant_switch`.
2. `resolveConversationTurn`: `topic_return` ⇒ `topicConflict` (no inherit) + `out_of_slice_clarify` + `active_date=null`. `plant_switch` ⇒ `invalidate_entity` / wipe de fecha.
3. `reconstructFromUserHistory`: al ver esos kinds, borra `parent_intent` y `lastEntityHint`.
4. `lib/director-ia-chat.js` L2882–2893: `out_of_slice_clarify` **después** del planner y **antes** de loaders; ignora `daily_sales_deviation` 0.92.
5. Slot único: standalone T6 pisa `plant_diagnosis`. No hay `prior_*`.
6. M18, si cargara: `conversation_state = emptyConversationState`.

**Conversaciones que rompe:** larga T8 (descuento no entra), T10–T12 (AR/Arturo no restauran), **T14–T20 (corte)**; A completa; B T2–T4; C T2–T4; frases frías «Volvamos a…».

**Por qué es ahora el mayor bloqueo:** venta diaria, descuento/kg, AR por persona, follow-ups y planta **ya** conversan en aislamiento. El ejecutivo **no** trabaja así: cambia de tema y vuelve. El north star pide exactamente eso. El dato de ayer **está**; la frase de retorno **ya clasifica**; el runtime la rechaza. No es recencia. No es 52.5%. No es simetría. Trade-off y SQL 017 no cortan este hilo.

**Qué desbloquearía arreglarlo:** T16 carga venta ayer; «ahora dime el descuento/kg **ayer**» o un switch no hostil entra al pack D; «volvamos a Arturo» puede reabrir plant+entidad con **un** marco previo o con history no wipeado; T15/T17–T20 heredan de nuevo. Conversación larga sostenida.

**Qué NO resolvería:** margen/oferta por cliente; SQL 017 en entorno; causalidad; N5; topic stack profundo; COMPLETE de módulos; phrasebook nuevo.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una, contra ese cuello:

`ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`

Readiness (no IMPL todavía): cómo dejar que un standalone ya detectado gane sobre `topic_return`; cómo no tratar «ahora dime X» como wipe de planta cuando X es un dominio conocido o recuperable; si hace falta **un** `prior_frame` `{parent_intent, entity, date, gap}` para «Volvamos a Arturo / la acción» cuando el planner es unknown; **no** pila de N; **no** `pending_work_items_only` como navegación intra-sesión; **no** phrasebook; preservar `daily_sales_deviation`, `daily_discount_deviation`, `action_status`, estrategia B.

STOP.
