# Reporte — ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
first_slice: "structured_conversation_state"
first_slice_id: "C"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Conversational continuity is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001.md"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx"
  - "frontend-dashboard/modules/director-ia/lib/api.ts"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/director-ia-commercial-state.js"
  - "server.js (POST /api/director-ia/chat)"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    EKE §15 prohíbe «sustitución del routing actual del chat hasta que se decida
    gobernarlo explícitamente». Esta readiness no sustituye el chat por el Motor.
    Heredar parent_intent en el chat legado usa el hook ya existente
    forceIntent y el historial efímero ya nombrado en EKE §2. Si HUMAN_APPROVER
    lee §15 como «no tocar el routing del chat en absoluto», debe REJECTED en G5.
    No es contradicción que obligue STOPPED: Constitución + EKE tratan el chat
    legado como distinto de N1–N5.
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

El first slice mínimo, seguro y compatible con la arquitectura vigente es **C — `structured_conversation_state`**.

No basta con mandar `history` a OpenAI. El planner corre **antes** del modelo, sobre la frase aislada. Por eso 24/26 (auditoría previa) y **17/22** de las conversaciones maestras de esta tarea caen en `unknown`: el frontend sí envía historial; el runtime no lo usa como hilo.

El estado conversacional debe ser **efímero por request** (reconstruido y/o eco en `context_meta`; **sin tablas, sin memoria long-term, sin cross-session**). OpenAI recibe el turno actual + evidencia **requery** + un bloque compacto de estado etiquetado como **conversación, no evidencia**. No recibe el historial crudo.

Continuidad **no** es cobertura de módulo. Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-conversational-continuity-readiness-001` (≠ `main`).
- HEAD de partida: `d4fae49a Merge branch 'audit/director-ia-conversational-intelligence-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En la transición `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, tests, matriz, contratos, commit, push, merge.
- G2/G3 determinados: **N/A** (runtime-only del chat legado). Detalle en § Contratos.

---

## 1. Hallazgo 24/26 — verificación física

La auditoría previa (`AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001`) afirmó: 24 de 26 follow-ups de sus conversaciones maestras terminan `unknown` porque el frontend envía `history`, el runtime/modelo no lo usa y el planner reclasifica cada turno desde cero.

**Mecanismo reconfirmado en código (esta ejecución):**

| Paso | Hecho físico |
|---|---|
| Frontend construye history | `DirectorIaChatPanel.tsx`: `historyForApi = [...messages, userMsg]` → `{role, content}`. Sin `id`, sin `context_meta`, sin `conversation_state`, sin `planta_id` por mensaje. |
| Recorte | `api.ts` `fetchDirectorIaChat`: `history.slice(-8)`. Sin conversation id. |
| POST /chat | `server.js` L9959: `dashboardAuthMiddleware` + `handlePostChat`. El handler lee `planta_id` y `question`; **no lee `history`**. Pasa `req` entero a `askDirectorIa`. |
| Punto de descarte hacia OpenAI | `openaiDirectorIaChat` (`lib/director-ia-chat.js` ~2235): `messages: [{role:system},{role:user}]`. History **nunca** entra al modelo. |
| Único uso de history | `askDirectorIa` L2480–2481: `expandQuestionFromChatHistory`. Regex `CHAT_PRONOUN_FOLLOWUP_RE` (`ese cliente`, `de él`, etc.). **No** cubre `¿Y Arturo?`, `¿Por qué?`, `¿Qué te llama la atención?`. Solo mira `role === "user"`. Extractor de nombres: ≥3 tokens Title Case y **≥10 chars**. «Arturo» no califica. |
| Planner | `planDirectorIaQuestion(q)` **sin** history ni parent intent. Existe `options.forceIntent`; el chat **no** lo usa. |
| Clarification | `requires_clarification` solo se honra en `project_status`. `unknown` cae al dump AR + OpenAI. |

Prueba física del expander (historial con Puebla / Arturo):

| Pregunta | Resultado |
|---|---|
| `¿Qué sabemos de él?` | sin cambio |
| `¿Y Arturo?` | sin cambio |
| `¿Por qué?` | sin cambio |
| `de él` | sin cambio (no hay nombre de ≥3 tokens en user history) |
| `ese cliente qué tiene` | sin cambio (misma razón) |

**Set maestro de ESTA tarea (22 turnos, planner literal):**

| Clasificables | Intent |
|---|---|
| `¿Cómo va Puebla?` (×3) | `plant_diagnosis` 0.84 |
| `¿Cómo va el presupuesto esta semana?` | `budget_status` 0.90 |
| `Cambiando de tema, ¿qué tiene Taller AT-15?` | `taller_at` 0.90 |
| **Las otras 17** | `unknown` 0.35 + `requires_clarification=true` **ignorada** |

El 24/26 de la auditoría previa y el 17/22 de este set tienen **la misma causa**: aislamiento de turno en planner + omisión de history hacia OpenAI. El FE no es el cuello; el cuello es que history no gobierna routing ni evidencia.

Hallazgo adicional (riesgo latente, hoy dormido porque OpenAI no ve history): **cambiar `plantaId` no limpia `messages`**. `DirectorIaChatPanel` no tiene `useEffect` de reset; `DirectorIaShell` renderiza el panel **sin** `key={plantaId}`. Un IMPL que empiece a usar history/estado **debe** resetear o etiquetar planta por mensaje. Si no, history de Puebla viaja con `planta_id` de Querétaro.

---

## 2. Traza runtime (campos auditados)

### Frontend history

- Shape: `{ role: "user" \| "assistant", content: string }`.
- Ventana: últimos **8** ítems del array construido (incluye el user actual).
- Metadata: ninguna. `context_meta` de la respuesta **no se reenvía**.
- Session id: no existe.
- Planta: `planta_id` del selector en el body, **no** en cada mensaje.

### POST /chat

- Authz: `dashboardAuthMiddleware` siempre, cada request.
- Body usado: `planta_id`, `question`.
- `history` viaja en `req.body` pero el handler no lo inspecciona; `askDirectorIa` sí lo lee para el expander.

### askDirectorIa

Orden real:

1. `expandQuestionFromChatHistory` (casi nunca dispara en elipsis naturales).
2. `classifyConversationalIntent` (help/thanks/greeting de frase **completa**; `¿Por qué?` **no** es smalltalk).
3. `detectUnsupportedDirectorIaDomain`.
4. `planDirectorIaQuestion(q)` — **aquí se pierde el hilo**.
5. Early returns in-process (`plant_diagnosis`, expediente, M9, presupuesto, etc.).
6. Si `unknown`: contexto AR/DICF/bitácora legado + **una** llamada OpenAI `{system, user}`.

`plant_diagnosis` carga pack fresco, 1 OpenAI, `openai_called: true`. `expediente_comercial` y `delta_*` arman texto **sin** OpenAI. Ninguna rama persiste estado para el turno siguiente.

### Planner

- Comentario de archivo: «No gobierna el routing del chat (solo planifica)». **Parcialmente obsoleto**: `askDirectorIa` **sí** ramifica por `directorIaPlan.intent`.
- No acepta parent_intent ni history.
- `unknown` + clarification no bloquea el chat legado (salvo `project_status`).
- Follow-up elíptico = `no_rule_matched`.

### OpenAI messages

Siempre dos mensajes. System = prompt de la rama (AR / planta / DICF…). User = pregunta actual + contexto/pack del **este** turno. Cero roles `assistant` previos. Cero history.

### context_meta

Varía por rama. `plant_diagnosis` ya expone `planta_id`, `limitations`, `commercial_materiality`, `assembly_status`. El FE **descarta** ese objeto. No hay `conversation_state`, `parent_intent`, `active_entities` ni `pending_information_gap`.

### Planta

Fuente de verdad del request: `planta_id` del body (selector). «¿Cómo va Puebla?» **no** cambia de planta; si el selector no es Puebla, el pack es de otra planta. Authz se revalida porque cada POST pasa de nuevo por middleware + loaders.

### Periodo

No hay hilo. `plant_diagnosis` usa el periodo que el loader elige hoy (mes comercial, no «ayer»). `budget_status` es semanal por wording canónico. «¿Y la anterior?» es `unknown`. M9 es YYYY-MM.

### Entidades

Resolución comercial existe en el turno actual (tokens / expediente). No hay entidad activa entre turnos. `isExpedienteComercialQuestion` exige «expediente» / «qué sabemos comercialmente» / etc. `¿Y Arturo?` y `¿Qué sabemos de él?` **no** entran a expediente.

### Evidence packs

| Pack | OpenAI | Writes | Reuso hoy |
|---|---|---|---|
| `plant_diagnosis` | 1 | SELECT-only (CS sin `computeDicf`) | Ninguno; se vuelve a armar si el intent vuelve a clasificar |
| `expediente_comercial` | 0 | SELECT-only | Ninguno |
| `delta_*` | 0 | SELECT | Ninguno |
| Fallback `unknown` → `commercial_state` | 1 | **`dicf.computeDicf`** (caché) | N/A |
| AR legado | 1 | lectura AR | N/A |

History **no** es pack. Un mensaje assistant no es fila de DB.

---

## 3. Comparación A / B / C / D — una sola ganadora

| ID | Nombre | ¿Arregla 17/22 y 24/26? | ¿Natural? | ¿Seguro frente a injection / evidence leak? | ¿Simple? |
|---|---|---|---|---|---|
| **A** | `parent_intent_plus_entity_continuity` | Parcial: routing de elipsis sí; brecha y topic-switch quedan ad hoc | Media | Alta si no se manda history | Alta |
| **B** | `filtered_history_to_llm` | **No.** El planner clasifica **antes** de OpenAI. History al modelo no evita `unknown` → dump AR | Alta aparente | Baja: injection, claims como hechos, tokens, mezcla de plantas en FE | Media |
| **C** | `structured_conversation_state` | **Sí**, si el chat aplica el estado **antes** del planner (`forceIntent` / inherit) | Alta en el hilo 1–3 si el pack se requery | Alta: history no es evidence; estado etiquetado | Media |
| **D** | `conversation_state_plus_selective_history` | Sí, pero el extra (ventana de turnos al LLM) no es necesario para el first slice | Máxima | Media: reintroduce claims de assistant/user como texto de modelo | Baja |

**Seleccionado: C — `structured_conversation_state`.**

Por qué no B: el prompt de esta tarea prohíbe el atajo «mandar todo history a OpenAI». Además B **no** arregla el planner.

Por qué no A sola: «¿Qué te falta?» / «¿Quién puede darnos eso?» / «¿Para qué?» necesitan un objeto de brecha derivado del pack, no solo `parent_intent` + una entidad. El topic switch («Ahora Querétaro») necesita invalidación explícita de entidad/brecha, no un par de campos sueltos.

Por qué no D en el first slice: una ventana de turnos al LLM mejora anáfora hacia **lo que dijo el assistant**. Eso viola `assistant prior claim != fact`. El producto necesita anáfora hacia **intent + entidad resuelta + pack fresco**. Eso es estado estructurado, no history selectivo. D queda **diferido** si C no basta para elipsis que no sean follow-up de intent/entidad/brecha.

OpenAI en C **sí** puede recibir un bloque compacto `HILO (estado conversacional, NO evidencia de DB)`. Eso no es history filtrado (B/D); es serialización del estado.

History del request **sí** se usa, pero de forma **determinística**: reconstruir `parent_intent` desde el último turno user clasificable y menciones de entidad en turnos **user** (nunca identity desde texto assistant).

---

## 4. Estado mínimo — campos

Regla: solo lo necesario. El resto de `candidate_fields` queda fuera del first slice.

### Incluir

| Campo | ¿Por qué es necesario? | Origen | Duración |
|---|---|---|---|
| `parent_intent` | Único ancla de routing para frases no clasificables | Último intent **clasificado con confianza** del hilo, si el turno actual es follow-up defendible | Hasta topic switch, plant switch o intent nuevo de alta confianza |
| `planta_id` | Detectar mismatch request vs hilo; nunca heredar planta desde el texto | **Siempre** el `planta_id` del request actual (authz). El estado guarda el del turno padre para comparar | Un request |
| `active_entities` | 0 o 1. Permite `¿él?` / `¿tiene acción?` sin fuzzy | Solo si resolución **única** en la planta **actual** (`cliente_key` u homólogo físico). Display name no basta como identidad | Invalidar en plant switch, topic switch, o ambigüedad |
| `last_evidence_bundle_type` | Saber **qué** requery (planta vs expediente), no el payload | Rama que respondió el turno padre | Invalidar con parent_intent |
| `pending_information_gap` | Hilo «qué falta / quién / para qué» | **Derivado del pack fresco** (`limitations`, coverage_unknown, responsables de **acción** si existen). No del prosa del assistant | Invalidar en switch; refrescar en cada requery |

### No incluir en el first slice

| Campo | Razón |
|---|---|
| `active_topic` | Redundante con `parent_intent`. |
| `period`, `period_a`, `period_b` | Heredar periodo a ciegas es el fallo de conv. 4. El loader del intent vigente elige periodo **hoy**. |
| `active_folio_id`, `active_action_id`, `active_revision_id` | Fuera del hilo 1–3; no hay tests maestros que lo exijan. |
| `last_evidence_refs` como caché de payload | Ver § evidencia: requery, no bundle crudo. |
| `pending_question` | Cubierto por gap + parent_intent. |
| `turn_id`, `timestamp` | No hacen continuidad; no hay sesión persistente. |

Transporte: eco opcional en `context_meta.conversation_state` **y** reconstrucción desde `history` user-only si el FE aún no reenvía estado. Sin tablas. El FE, si reenvía estado, no puede usarlo para saltarse authz.

Intents heredables en el first slice: **`plant_diagnosis`** y **`expediente_comercial`**. No heredar hacia el path `commercial_state` que llama `computeDicf` (writes de caché). No heredar `financial_diagnosis` / `budget_status` / `taller_at` como hilo de periodo o stack (se preservan como **standalone** si el wording actual los clasifica solo).

---

## 5. Herencia y revalidación

### Qué heredar (condicionado)

- **parent_intent** si el turno actual es follow-up defendible: `unknown` / clarification, o elipsis corta (`¿por qué?`, `¿y …?`, `¿qué falta?`, pronombre), **y** no hay señal de topic switch ni intent nuevo de alta confianza.
- **entidad** solo si (a) el usuario la nombra o usa pronombre, (b) hay resolución **única** en la planta del request, (c) no hubo plant/topic switch desde que se resolvió.
- **brecha** como recálculo del pack del intent heredado, no como cita del assistant.
- **planta**: no se «hereda» del chat. Se usa la del request. Si el usuario dice una planta distinta al selector → **clarificar**, no cambiar `planta_id` por NLP.

### Qué no heredar nunca

planta desde texto; periodo; payload de evidencia; resultado de authz anterior; `SOURCE_RESTRICTED` convertido en missing; entidad ambigua; Arturo de Puebla después de Querétaro; claims de user/assistant como hecho DB.

### Cuándo revalidar (siempre)

Cada POST: middleware + loaders con `planta_id` actual. Identidad de entidad se **re-resuelve** en la planta actual (no reutilizar `cliente_key` de otra planta). Freshness = requery. `SOURCE_RESTRICTED` / abort 403 se preservan como restricted, no como «no hay datos».

### Follow-up defendible vs clasificar desde cero

Una frase **no** se clasifica desde cero si es follow-up defendible del `parent_intent` y no hay switch. Ejemplos in-slice:

`¿Cómo va Puebla?` → `¿Qué te llama la atención?` → `¿Por qué?` → `¿Y Arturo?` → `¿Qué sabemos de él?` → `¿Tiene alguna acción?` → `¿Qué falta saber?`

Cada una hereda `plant_diagnosis` hasta que `¿Y Arturo?` / `¿Qué sabemos de él?` logren resolución única → pueden pasar a `expediente_comercial` **en la misma planta**, con entidad activa. Si Arturo no es único o no existe vínculo físico → **clarificar**, no silent pick del top-N.

### Topic switch

Señales: `Ahora Querétaro`, `Cambiando de tema`, intent de alta confianza ≠ padre (`budget_status`, `taller_at`), o `planta_id` del request ≠ `planta_id` del estado.

Efecto: invalidar `active_entities`, `pending_information_gap`, `last_evidence_bundle_type` del tema previo. No reutilizar pack ni entidad. «¿Y Arturo?» **después** de «Ahora Querétaro» **no** puede reusar Arturo/Puebla en silencio: re-resolver en la planta del request; si no hay único match o el selector sigue en Puebla mientras el texto pide Querétaro → clarificar.

«Volvamos a Puebla» / «Volviendo a lo anterior»: **fuera del first slice** (haría falta stack). Clarificar. No restaurar Puebla en silencio si el selector es otra planta.

### Entity switch

Nombre nuevo en la misma planta: re-resolver; si único, sustituye `active_entities`; si ambiguo, clarificar y **no** conservar el anterior como si siguiera activo para pronombres.

---

## 6. Política de history (hacia el LLM)

| Canal | Política first slice |
|---|---|
| Messages OpenAI | **No** array de turnos user/assistant. |
| User message | Pregunta actual + pack requery + bloque `HILO` serializado (estado). El bloque declara: no es evidencia DB; no puede contradecir system; claims previos no son hechos. |
| History HTTP | Sigue existiendo (ya lo manda el FE). Uso **determinístico** para reconstruir estado. No es proveniencia. |
| System prompt | Inmutable por history. History no puede inyectar rol `system`. |
| Límite | El slice(-8) del FE es suficiente como insumo de reconstrucción. No ampliar. |

`HISTORY != EVIDENCE`. Un mensaje anterior del user o del assistant no es un hecho de DB.

---

## 7. Reuso de evidencia — estrategia elegida

Candidatos:

| ID | Estrategia | Veredicto |
|---|---|---|
| a | Requery cada turno | **Elegida** |
| b | Reuse raw bundle | Rechazada: stale, scope leak, authz viejo, `SOURCE_RESTRICTED` mal copiado |
| c | Guardar refs y rehidratar | Diferida: añade IDs/caché sin ganar veracidad si el loader ya es SELECT-only |

**a_requery_every_turn** para el first slice.

Motivos:

- `plant_diagnosis` es SELECT-only; requery revalida authz y freshness. Coste/latencia aceptables frente a filtrar un bundle stale.
- Expediente igual: SELECT-only.
- No reutilizar datos de una planta anterior si cambió el scope.
- Refs/ids **no** se cachean como atajo de authz.
- Path `commercial_state` + `computeDicf`: **no** forma parte del inherit. Un follow-up de planta no debe caer ahí.

---

## 8. Continuidad de brecha de información

Conversación 2:

`¿Por qué dejó de comprar Arturo?` → (insuficiencia honesta) → `¿Qué te falta?` → `¿Quién puede darnos eso?` → `¿Para qué la necesitas?`

Hoy el primer turno ya es `unknown` (no entra a expediente ni a `client_analysis`). El first slice debe:

1. Tratar la pregunta inicial como follow-up de entidad si hay resolución única, o como `plant_diagnosis`/`expediente_comercial` con hint de nombre **re-resuelto**, no como AR dump.
2. Mantener `pending_information_gap` **derivado del pack**: qué campo falta (p. ej. coverage_unknown, kg null), por qué bloquea causa, fuente física si el pack la nombra, persona **solo** si hay responsable de **acción** u otro vínculo físico en el pack.
3. «¿Qué te falta?» no recalcula un intent nuevo: hereda, requery, lee limitations.
4. «¿Quién?» sin vínculo físico: decir que no hay persona nombrable. **No inventar.**
5. «¿Para qué?» usa el `why_blocks` del gap (p. ej. no se puede atribuir causa de caída), no una especulación del modelo.

El first slice **sí** cubre esta brecha a nivel de estado + pack. **No** implementa los 7 campos retóricos de la auditoría de inteligencia como contrato IES. Eso sigue fuera (IES runtime PENDIENTE).

---

## 9. Conversaciones maestras

### 1 — Puebla → atención → por qué → Arturo → él → acción → qué falta

**In slice.** Turno 1 ya entra a `plant_diagnosis`. El resto no debe clasificarse desde cero. Requery del pack (o expediente si entidad única). No heredar Arturo del top-N en silencio. No heredar periodo.

### 2 — Arturo dejó de comprar → seguro → qué falta → quién → para qué

**In slice** como gap + entidad. Arranque hoy `unknown`: IMPL debe poder anclar entidad+pack sin wording «expediente». Persona solo con vínculo físico.

### 3 — Puebla → Ahora Querétaro → ¿Y Arturo?

**In slice** como topic/plant switch. Arturo/Puebla se invalida. Re-resolver en planta del request o clarificar. Prohibido reutilizar pack de Puebla.

### 4 — Presupuesto esta semana → ¿Y la anterior? → Volvamos a Puebla

**Fuera del first slice** (periodo + stack). Turno 1 standalone `budget_status` se **preserva**. Follow-ups: clarificar; no heredar semana; no restaurar Puebla por texto.

### 5 — Puebla → qué falta → Taller AT-15 → volviendo, ¿quién debe responder?

**Fuera** (stack de temas). `taller_at` canónico se preserva como standalone. «Volviendo a lo anterior» no restaura brecha de Puebla.

---

## 10. Seguridad y veracidad

| Regla | Cómo la cubre C |
|---|---|
| raw history cannot override system | History no entra como `system` ni como messages; solo reconstrucción determinística |
| assistant prior claim != fact | No se parsea identity/hechos desde assistant; pack requery |
| user prior claim != DB fact | Mención de «Arturo» es hint de resolución, no fila |
| SOURCE_RESTRICTED preserved | Abort 403/restricted del loader actual; no traducir a missing |
| cross-plant leakage forbidden | Estado invalidado si `planta_id` cambia; FE debe resetear messages; no reusar pack/entidad |
| authz always revalidated | Cada POST + cada loader |
| no long-term / cross-session / new tables | Estado efímero del request |
| prompt injection | No concatenar history al system; HILO no es instrucción |

---

## 11. Contratos — G2 / G3

Consultados: Constitución, EKE §2 y §15, 04 IES, 05 RE. **No modificados.**

| Pregunta | Determinación |
|---|---|
| ¿Esto es runtime-only? | **Sí.** Chat legado (`askDirectorIa`). No IES. No RE. No Fases 1–3 como N1–N5. |
| ¿G2 (cambio de arquitectura)? | **N/A.** No se crea subsistema de memoria ni se sustituye el chat por el Motor. EKE §2 ya admite `question` expandida por historial **efímero de la solicitud**, sin memoria persistente. EKE §15 prohíbe memoria persistente y prohíbe sustituir el routing del chat **por el Motor** hasta decisión explícita. Continuidad = usar ese historial efímero **dentro** del chat, no instalar N5. |
| ¿G3 (contrato nuevo)? | **N/A.** No hay documento nuevo en `docs/director-ia/`. `conversation_state` en `context_meta` es campo de respuesta del chat legado, no contrato de arquitectura. |
| ¿History afecta boundaries 04/05? | No. 04/05 no gobiernan este path (runtime IES/RE **PENDIENTE**). |

Tensión documentada (no STOPPED): ver `ambiguities_or_contradictions` en el YAML. Si el humano exige un contrato de Conversation State en `docs/director-ia/`, eso sería **otra** tarea con G2/G3; esta readiness recomienda **no** crearlo.

Constitución: Director IA no es un chatbot genérico; el chat es **interfaz**. Este slice no convierte el chat en N5 ni en memoria de producto.

---

## 12. First slice — límites (READY_WITH_LIMITS)

Incluye:

- Herencia de `parent_intent` para follow-ups defendibles de `plant_diagnosis` / `expediente_comercial`.
- Entidad 0|1 con resolución única y revalidación de planta.
- `pending_information_gap` derivado de pack requery.
- Topic/plant switch con invalidación (conv. 3).
- Reset de hilo en FE cuando cambia `plantaId` (requisito de IMPL; no se implementa aquí).
- Queries standalone actuales (`financial_diagnosis`, `budget_status`, `taller_at`, Puebla canónico) **preservadas** si el wording del turno las clasifica solo.

Excluye (deferred):

- Stack de temas / «volviendo a lo anterior» (conv. 5).
- Herencia de periodo / «ayer» / «la semana anterior» (conv. 4; motor diario).
- History selectivo al LLM (candidato D).
- Memoria persistente, cross-session, tablas nuevas.
- Runtime IES / Reasoning Engine.
- Inherit hacia `commercial_state`+`computeDicf`.
- Folio/acción/revisión como entidades activas.
- Long-term memory.

---

## 13. Tests a diseñar en IMPL (no ejecutados)

- `¿Cómo va Puebla?` → `¿Por qué?` hereda `plant_diagnosis`, 1 requery, no `unknown` AR dump.
- `¿Qué te llama la atención?` igual.
- `¿Y Arturo?` / `¿Qué sabemos de él?`: único → expediente o pack filtrado; ambiguo → clarificar; no fuzzy silent.
- `¿Tiene alguna acción?` con entidad activa: requery, no inventar.
- `¿Qué falta saber?` lee gap del pack, no frase fija AR.
- Pronombre `él` sin nombre de ≥3 tokens.
- Plant switch: «Ahora Querétaro» + `¿Y Arturo?` no reusa Puebla.
- Cambio de `plantaId` en UI limpia history (o no mezcla).
- Period/topic «¿Y la anterior?» / «Volvamos a Puebla» / «Volviendo a lo anterior»: no herencia ciega (clarificar o standalone).
- History no es evidencia: assistant inventado no altera pack.
- Prior assistant claim ≠ fact.
- Authz revalidada; `SOURCE_RESTRICTED` se preserva; partial failure se preserva.
- Token: no growth de history hacia OpenAI (sigue 2 messages + HILO compacto).
- Conversation reset.
- Legacy standalone: `¿Cómo va Puebla?`, `¿Por qué bajó la venta ayer?` (`financial_diagnosis`) intactos.
- `plant_diagnosis` materialidad / null≠0 intactos.

---

## 14. Efecto porcentual

```
before: 10.5 / 20 = 52.5%
after_readiness: 10.5 / 20 = 52.5%
expected_impl_effect: 0.0 pp
```

Continuidad conversacional no es cobertura de módulo.

---

## 15. NEXT_TASK

Propuesta **exacta** (no autorizada, no ejecutada):

**`IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001`**

Alcance esperado (para el humano, no para este agente): runtime del chat legado según este slice C; tests focales de la lista §13; FE reset de hilo al cambiar planta; sin contratos `docs/director-ia/`; sin tablas; sin mandar history crudo a OpenAI.

---

STOP.
