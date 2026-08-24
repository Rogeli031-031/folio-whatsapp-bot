# Reporte — ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001

```yaml
task_id: "ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
determination: "READY_WITH_LIMITS"
selected_first_slice: "B_one_previous_frame"
includes_standalone_precedence: true
topic_stack: false
history_as_evidence: false
persistent_memory_for_navigation: false
destination: "chat legado (askDirectorIa + conversation_state), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Intra-session topic return is not module coverage."
sql_017: "out_of_scope / not used"
economic_tradeoff: "out_of_scope"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-action-person.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** First slice: **B — exactamente un marco previo**, e incluye de forma obligatoria la precedencia de standalone.

El caso crítico es OVERPROGRAMMING, no falta de pack:

`detectDirectorIaIntent("Volvamos a la venta de ayer")` = `daily_sales_deviation` **0.92**, `standalone=true`.  
`classifyTurnKind` = `topic_return`.  
`askDirectorIa` L2882 ve `out_of_slice_clarify` y **no carga** el pack.

**A sola no basta.** Arregla el retorno autocontenido. Deja rotos «Volvamos a Arturo», «Retomemos la acción», «Volvamos a Puebla».

**C no.** La conversación con más cambios (Puebla → Arturo → venta → «y el descuento» → Arturo → venta) no crea un tercer *standalone*. «¿Y el descuento?» hoy **hereda** venta. Un marco previo alcanza.

**D no.** `reconstructFromUserHistory` termina en el **último** standalone. Tras venta, el parent reconstruido es `daily_sales_deviation`, no planta. «Volvamos a Arturo» volvería a hablar de Arturo **con pack de venta**. History no restaura el `parent_intent` anterior.

No topic stack. No phrasebook de destinos. No memoria persistente. No evidencia cruda. **Requery siempre.**

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`.

---

## Ejecución

- Rama: `architecture/director-ia-intra-session-topic-return-001` (≠ `main`).
- HEAD: `ee221bf8 Merge branch 'audit/director-ia-conversational-product-gap-006'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Invocación read-only de planner + `resolveConversationTurn` + `classifyPersistentMemoryTurn`.

---

## Fallo físico actual

| Pieza | Comportamiento |
|-------|----------------|
| Planner | Standalone válido si el texto trae el dominio (`venta`+`ayer`, `acción`+nombre y apellido). |
| `classifyTurnKind` | `^volvamos` / `^volviendo a` / `^hablemos de` → `topic_return`. `^ahora` / `^ahora dime` → `plant_switch`. **`^retomemos` no es `topic_return`.** |
| `resolveConversationTurn` | `topic_return` ⇒ `topicConflict` + `out_of_slice_clarify` + `active_date=null`, **aunque** `standalone=true`. |
| `askDirectorIa` L2882 | `out_of_slice_clarify` **después** del planner, **antes** de loaders. |
| `reconstructFromUserHistory` | Al ver `plant_switch` / `topic_return` / `period_switch` pone `parent_intent=null` y `lastEntityHint=null`. Sobreinvalidación. |
| Estado | Un slot: `parent_intent`, 0\|1 entidad, `active_date`, bundle, gap. **No hay prior.** |
| `budget_status` | Si carga, escribe `emptyConversationState`. |
| Memoria persistente | `qué pasó con` = resume **cross-session**. `volvamos` = `none`. No es navegación. |

Invalidación **correcta:** mismatch de planta; period_switch real (`¿Y ayer?` sin hilo diario).  
**Sobreinvalidación:** tirar un standalone 0.92; borrar history útil al leer la misma frase de retorno.

---

## Dos clases de retorno

### 1) Autocontenido — el turno ya nombra el dominio

| Texto | planner hoy | kind | ¿Basta el turno? |
|-------|-------------|------|------------------|
| Volvamos a la venta de ayer. | `daily_sales_deviation` 0.92 standalone | topic_return | **Sí.** `ayer` reconstruye la fecha. No hace falta prior. El runtime lo tira. |
| Retomemos la acción de Julio Pérez. | `action_status` 0.86 standalone | **other** | **Sí, y hoy ya entra.** `out_of_slice=false`. |

Regla: **standalone válido gana siempre**, también con «volvamos» / «retomemos». Requery. No copiar evidencia vieja.

### 2) Implícito — el turno no nombra un intent ejecutable

| Texto | planner | kind hoy | ¿Basta A? |
|-------|---------|----------|-----------|
| Volvamos a Arturo. | unknown | topic_return / out_of_slice | **No.** Hace falta el marco planta+Arturo. |
| Volvamos a Puebla. | unknown | topic_return / out_of_slice | **No.** No es `como va`. |
| Retomemos la acción. | unknown | other → **hereda el current** | **No.** Se queda en Puebla. |
| Retomemos lo anterior. | unknown | other → hereda current | **No.** «Anterior» ≠ current. |
| ¿Dónde nos quedamos? | unknown | other → hereda current | Ambiguo: si hay current, heredar; si current fue wipeado, restaurar prior. |
| Retomemos la venta. | unknown (sin `ayer`) | other → hereda current | **No.** Hace falta el marco daily. |
| Bueno, volviendo a Arturo… | unknown | other → hereda current (venta) | **No.** Parent equivocado. |

A no cubre la clase 2. B sí, si al **cambiar** de tema se estacionó el marco anterior.

---

## Comparación A / B / C / D

| | A solo precedence | **B un prior** | C stack | D history |
|---|-------------------|----------------|---------|-----------|
| Conv 1 venta→desc→volver venta | **Sí** (T3 es autocontenido) | Sí | Sobrado | Parcial: T3 no necesita history |
| Conv 2 Puebla/Arturo→venta→Arturo | No | **Sí** | Sobrado | **No:** last parent = daily; Arturo con pack de venta |
| Conv 3 acción→Puebla→retomar acción | No (`Retomemos la acción` hereda plant) | **Sí** si `retomemos` restaura prior | Sobrado | Last parent depende de si «Ahora dime Puebla» fue standalone (hoy no) |
| Conv 4 Puebla→presupuesto→eso→Puebla | No | **Sí** si el switch fallido **no wipea** y estaciona plant | Sobrado | Wipe de `ahora` borra el parent |
| Conv 5 Arturo→venta→descuento→Arturo→venta | No | **Sí** (descuento **hereda** venta; un prior alcanza) | Solo si un 3.er standalone real evicta Arturo | Mismo fallo que conv 2 |

**Seleccionado: B.**

- A es **necesaria** (va dentro de B) e **insuficiente**.
- C no se elige: conv 5 no demuestra un tercer marco. El stack sería sofisticación.
- D no restaura `parent_intent` previo; además `ahora`/`volvamos` lo vacían. History = señal, no evidencia.

**Límite de B (READY_WITH_LIMITS):** un **tercer standalone inheritable distinto** (p. ej. `daily_discount_deviation` con **ayer** entre venta y «Volvamos a Arturo») evicta el marco planta/Arturo. Eso queda diferido. No abre C en este slice.

---

## Trazas de producto (hoy vs B)

### 1 — autocontenido

| Turno | Hoy | Con B |
|-------|-----|-------|
| ¿Por qué bajó la venta ayer? | daily 0.92, GPT, `active_date` | igual; current=daily |
| Ahora dime el descuento/kg. | plant_switch + unknown → **wipe** | no wipe; current se **estaciona** en prior; clarify o, si más adelante hay standalone discount+ayer, switch |
| Volvamos a la venta de ayer. | planner 0.92 **tirado** | **standalone gana**; requery daily; `ayer` del turno |
| ¿Quién explicó más? | clarify (sin parent) | inherit daily |

A sola ya salvaría T3–T4 de esta conversación. B además evita el wipe de T2.

### 2 — entidad

| Turno | Hoy | Con B |
|-------|-----|-------|
| ¿Cómo va Puebla? | plant | current=plant |
| ¿Y Arturo? | inherit plant; resuelve Arturo | current=plant/Arturo (mismo tema; **no** se captura prior) |
| ¿Cómo estuvo la venta ayer? | pisa plant; Arturo se **arrastra** al daily | switch: prior=`plant+Arturo`, current=daily **sin** arrastrar evidencia; entidad daily solo si el pack la revalida |
| Volvamos a Arturo. | out_of_slice | restore prior; requery **plant**; revalidar Arturo; current daily pasa a prior |
| ¿Qué faltaba saber? | — | inherit plant + gap fresco |

### 3 — acción

Usar **Julio Pérez** (dos tokens). «Julio» solo sigue unknown (GAP-004 no se reabre).

| Turno | Hoy | Con B |
|-------|-----|-------|
| ¿Qué pasó con la acción de Julio Pérez? | `action_status` 0.86. Mem `resume` **no** gana al standalone | current=action (0/1/N; sin silent pick) |
| Ahora dime Puebla. | plant_switch + unknown → wipe | estacionar action en prior; «Puebla» no es `como va` → no inventar plant; no wipe total |
| Retomemos la acción. | inherit **Puebla** si hubiera parent | `retomemos` = mismo *kind* de retorno que `volvamos` (verbo, no destinos) + unknown → restore action; requery board; N acciones → clarificar |
| ¿Por qué seguía abierta? | — | inherit action; GPT; no inventar motivo |

«Retomemos la acción de Julio Pérez» **ya** es standalone hoy. No esperar al prior.

### 4 — presupuesto

| Turno | Hoy | Con B |
|-------|-----|-------|
| ¿Cómo va Puebla? | plant | current=plant |
| Ahora dime el presupuesto. | unknown (falta semana/carro) + wipe | estacionar plant; **no** abrir M18 inventando semana (fuera de este slice) |
| ¿Y eso? | clarify | inherit del current si quedó plant; o gap del clarify de presupuesto |
| Volvamos a Puebla. | out_of_slice | restore prior plant; requery |

No resolver wording de presupuesto semanal aquí.

### 5 — ¿basta un prior?

Hoy: «¿Y el descuento?» = `pronoun` + inherit **daily**. No hay tercer intent.

```
T1 plant
T2 Arturo          → current plant/Arturo     prior —
T3 venta ayer      → current daily            prior plant/Arturo
T4 y el descuento  → current daily (inherit)  prior plant/Arturo   ← no evicta
T5 volvamos Arturo → restore plant/Arturo     prior daily
T6 retomemos venta → restore daily            prior plant/Arturo
```

**Un marco basta.** C no está demostrado.

Si T4 fuera «¿Cómo estuvo el descuento/kg **ayer**?» (standalone discount), B perdería Arturo. Diferido; no se implementa stack.

---

## Contrato mínimo de B (para IMPL)

### Precedencia (KEEP_DETERMINISTIC)

1. Si el planner da standalone válido y seguro (`confidence ≥ 0.55`, intent conocido, no solo `unknown`): **ejecutar ese intent**. `topic_return` / `retomemos` / `ahora` **no** lo invalidan.
2. `out_of_slice_clarify` **no** corre cuando hay standalone.
3. Requery. Evidence del turno gana. No copiar pack anterior.

### Captura (un slot `prior_frame`)

Capturar **solo** al **cambiar** a un standalone inheritable **distinto** del current, o al *plant_switch*/*topic_return* que **no** ejecuta un standalone (estacionar en vez de wipe).

No capturar en inherit / follow-up (T2 Arturo, T4 descuento, «¿Y eso?»).

Campos (referencias, no hechos):

| Campo | Sí | No |
|-------|----|----|
| `parent_intent` | sí | — |
| entity ref (`kind`, `display`, `cliente_key` / `usuario_id` / `action_id` si ya era único) | sí | hechos DICF, kg, comentarios |
| `active_date` | sí si el intent diario lo tenía | persistir cross-session |
| `last_evidence_bundle_type` | sí | payload |
| `pending_information_gap` | sí (hueco estructural) | prosa del assistant |
| `planta_id` | scope del request | restaurar planta incompatible |

Al restaurar: si `prior.planta_id` ≠ request → invalidar frame. Authz cada turno.

### Restore

- `topic_return` o verbo de retorno equivalente (`retomemos`) + **sin** standalone + hay `prior_frame` → current ↔ prior (swap de un nivel) → requery del intent restaurado.
- Entidad: re-resolver / revalidar en el pack fresco. Referencia ≠ hechos.
- Acción: 0 → ausencia; 1 → esa; N → listar/clarificar. **No silent pick.**
- Fecha: si el turno trae `ayer`, usarla; si no, la del frame restaurado solo para requery del mismo intent diario, efímera.
- Tras restore, estrategia B intacta: unknown + estado válido hereda.

### History

Señal conversacional. **No** evidencia. Dejar de **borrar** parent/entity en `reconstructFromUserHistory` solo porque el turno actual dice «volvamos»/«ahora». No usar D como mecanismo de restore.

### Memoria persistente

`pending_work_items_only` sigue siendo **entre sesiones**. `qué pasó con Arturo` no se apaga. Un intent de negocio (acción, venta ayer) sigue ganando al resume. **No** crear work items al cambiar de tema.

### Qué no se toca

SQL 017. Trade-off económico. Nuevos módulos. M9. Packs daily/AR/planta. Phrasebook de follow-ups. IES/N5.

«Ahora dime el presupuesto/Puebla/descuento» **sin** standalone: no inventar intent; solo no wipear. Wording de M18 y «descuento» sin `ayer` quedan fuera.

---

## Reasoning boundary

| KEEP_DETERMINISTIC | LET_GPT_REASON |
|--------------------|----------------|
| Precedencia standalone | Qué discutir del tema restaurado |
| Captura/restore/swap de un frame | Explicación, síntesis, follow-up |
| Planta, authz, requery | Huecos en prosa |
| Identidad entidad; 0/1/N acciones | Motivo no registrado |
| Fecha `ayer` del turno | — |

No una respuesta enlatada por cada frase de retorno.

---

## Tests a diseñar en IMPL (no ejecutados aquí)

- Standalone «Volvamos a la venta de ayer» carga daily; no clarify.
- «Retomemos la acción de Julio Pérez» sigue `action_status`.
- Capture en switch venta; no capture en «¿Y Arturo?» / «¿Y el descuento?».
- Restore Arturo → plant requery; entidad revalidada.
- Restore acción con N → clarifica.
- Follow-up unknown tras restore hereda.
- Authz / cross-plant invalida frame.
- History no es evidencia.
- Memoria persistente no se usa para «volvamos».
- Regresión: daily sales, daily discount, action-person, plant, financial, memoria, suite.

---

## Contratos / gates

Constitución: el chat es **interfaz**; no reescribe IES. Este slice no toca Motor, IES ni Reasoning Engine.

| Gate | Valor |
|------|--------|
| G2 | **N/A** — no se edita `docs/director-ia/` |
| G3 | **N/A** — no hay contrato nuevo |
| G8 | **N/A** |

---

## Diferido

- Topic stack (C) si un 3.er standalone evicta un marco aún necesario.
- «¿Y el descuento?» → `daily_discount_deviation` sin `ayer`.
- Wording de presupuesto semanal / «Ahora dime Puebla» como plant standalone.
- «Bueno, volviendo a…» (no ancla `^volviendo`; hereda current).
- SQL 017. Trade-off. Módulos nuevos.

---

## NEXT_TASK (no autorizada, no ejecutada)

`IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001`

First slice B: standalone gana sobre `topic_return`; un `prior_frame` de referencias; requery; swap de un nivel; sin stack; sin memoria persistente; sin evidencia cruda.

STOP.
