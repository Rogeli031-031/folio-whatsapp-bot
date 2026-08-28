# AUDIT-DIRECTOR-IA-POST-DEPLOY-CONVERSATIONAL-FINDINGS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-POST-DEPLOY-CONVERSATIONAL-FINDINGS-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "FAIL"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
deployed_main: "de4513859a17e9bf15aed40cdb2362b018fc9c3d"
sql_020: "APLICADO; arr.executive_steering_events COUNT(*) = 0 (humano)"
steering_chat: "PENDING/DORMANT"
h1_severity: "MINOR"
h2_severity: "MINOR"
h3_severity: "MAJOR"
critical: 0
major: 1
minor: 2
observation: 0
manual_chat_validation: "NOT_GLOBAL_PASS (H3 abierto)"
production_pass_1_to_4: "VALIDOS"
matrix_increment: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**FAIL.**

Los cuatro PASS humanos de producción (CEL, daily brief, override de planta) se reproducen en el runtime de `de451385` y **permanecen válidos**. SQL 020 aplicado y Steering chat **PENDING/DORMANT** no se reabren.

H3 es un defecto **MAJOR** del ciclo ejecutivo: Director IA formula `DECISION_NEEDED`, el usuario responde en lenguaje natural, y el runtime **no trata esa respuesta como continuación** de PRE_CLOSE. El texto observado en producción es el fallback de `unknown` (`buildUnknownClarificationResult` + `clarification_reason` del planner). No hay leak, mutación ni escritura a DB. No es CRITICAL de veracidad/AUTHZ.

H1 y H2 son **MINOR**: el greeting nunca consume identidad de sesión; el token interno `reviewable` se filtra al usuario porque el `question_seed` lo lleva literal.

**MANUAL_CHAT_VALIDATION no es PASS global** mientras H3 siga abierto.

La matriz Director IA **no se incrementa**: 10.5 / 20 = 52.5%; delta 0.0 pp.

---

## 2. Evidencia física H1 — greeting sin nombre

**Observed (producción):** `Hola. Estoy en Acapulco. ¿Qué quieres revisar?`

**Ruta física (main `de451385`):**

1. `POST /api/director-ia/chat` (`server.js`) → `dashboardAuthMiddleware` → `handlePostChat`.
2. `handlePostChat` (`lib/director-ia-chat.js` ~4965) pasa `_user = req.dashboardUser || req.user || null` a `askDirectorIa`.
3. `dashboardAuthMiddleware` (`lib/dashboard-auth.js` ~115–137) **solo** asigna `req.dashboardAuth = payload`. **No** asigna `req.dashboardUser` ni `req.user`.
4. Early-return de saludo **antes** del planner (`askDirectorIa` ~3072–3093): `classifyConversationalIntent("hola")` → `{ mode: "smalltalk" }` → `buildConversationalAnswer("smalltalk", plantLabel)` → `buildNeutralGreeting(plantLabel)`.
5. `buildNeutralGreeting` (`lib/director-ia-conversational-executive-layer.js` ~872–875) acepta **solo** `plantLabel`. No hay parámetro de nombre, display_name ni actor.

```872:875:lib/director-ia-conversational-executive-layer.js
function buildNeutralGreeting(plantLabel) {
  const plant = plantLabel && String(plantLabel).trim();
  if (plant) return `Hola. Estoy en ${plant}. ¿Qué quieres revisar?`;
  return "Hola. ¿Qué quieres revisar?";
}
```

**Identidad que recibe el chat:**

| Superficie | Qué llega | Uso en greeting |
|---|---|---|
| `req.dashboardAuth` | JWT: `role`, `actor_id`, `plantas_permitidas`, `permisos`. `actor_nombre` **solo** si el token se emitió con `scope=seh` o `includeActorProfile` (`server.js` ~8256–8258). Los JWT de dashboard/folios/KPI (`server.js` ~5058, ~17080) **no** embeben `actor_nombre`. | No se lee |
| `_user` / `req.dashboardUser` | Típicamente `null` en esta ruta | No se lee |
| `req.dashboardAuth.actor_nombre` | Puede existir en tokens SEH/perfil; el composer PRE_CLOSE lo usa **solo** para AUTHZ ZP (`portfolioAuthzScope`, composer ~160), no para UX | No se lee |
| Persistent memory | `resolveUserScopeKey` usa `actor_id` / `usuario_id` / `id` — **scope**, no display name | No se lee |

**Conclusión H1:** el nombre **puede** existir upstream (fila `usuarios.nombre` / `nombre_persona` al emitir JWT SEH/perfil). En el token de dashboard típico **no viaja**. Aun si viajara, el greeting **nunca fue cableado** para consumirlo. No se “pierde” en un mapper: **no hay cable**.

**AUTHZ / privacy:** no inventar nombre. No usar `actor_nombre` para elevar rol (contrato Steering: `actor_nombre never elevates`). Un greeting futuro solo puede usar identidad **ya autorizada en la sesión**, y debe omitirla si está ausente.

**Sonda in-process (solo lectura):** `classifyConversationalIntent("hola")` + `buildConversationalAnswer(..., "Acapulco")` reproduce exactamente el texto de producción.

---

## 3. Evidencia física H2 — leak de “reviewable” en PRE_CLOSE

**Observed (producción), mismas dos preguntas:**

1. `¿Contra qué meta se conduce este mes en esta planta?`
2. `¿Qué apoyo reviewable sigue sin validar?`

**Origen físico exacto:** `collectPlantSignals` en `lib/director-ia-executive-cycle-composer.js`.

Pregunta 1 — seed ejecutivo, **sin** token interno de clase:

```321:334:lib/director-ia-executive-cycle-composer.js
  if (target && target.status === "TARGET_MISSING_FOR_PERIOD") {
    gaps.push({
      kind: "TARGET_MISSING_FOR_PERIOD",
      ...
    });
    decisions.push({
      decision_kind: "TARGET_ABSENT",
      ...
      question_seed: "¿Contra qué meta se conduce este mes en esta planta?",
    });
  }
```

Pregunta 2 — seed **mezcla wording de UI + constraint interno**:

```480:487:lib/director-ia-executive-cycle-composer.js
  if (reviewable && reviewable.status === "OK" && reviewable.has_reviewable) {
    decisions.push({
      decision_kind: "EXPENSE_STILL_OPEN",
      ...
      question_seed: "¿Qué apoyo reviewable sigue sin validar? reviewable != ahorro.",
    });
  }
```

**Cadena hasta UI:**

1. `reviewable` es clase de verdad / estado de `igf_reviewable_supports` (`has_reviewable`, `REVIEWABLE`, `reviewable != ahorro != cancelación`).
2. `SYSTEM_ADDENDUM` (~51–62) ordena a GPT: `DECISION_NEEDED: solo redacta preguntas a partir de los kinds tipados` y conserva `reviewable != ahorro != cancelación aprobada` como **regla de veracidad del prompt**, no como copy de usuario.
3. `formatPreCloseContext` (~1176–1183) inyecta `seed=${d.question_seed}` al user content.
4. No existe presentation mapping (token interno → frase ejecutiva). GPT copia el lexema del seed.

**¿Es token/estado/contrato interno?** Sí. `reviewable` nombra una clase de Folios IGF; no es etiqueta de junta.

**¿Corregir wording altera semántica contractual?** **No**, si se conserva `decision_kind: EXPENSE_STILL_OPEN` y la regla `reviewable != ahorro != cancelación`. El cambio sería de presentación, no de verdad.

No se corrige en este AUDIT.

---

## 4. Evidencia física H3 — follow-up PRE_CLOSE → unknown

**Conversación observada:**

| Turno | Texto |
|---|---|
| User | `Prepárame para el pre-cierre` |
| Director IA | las dos preguntas de H2 |
| User (mismo chat) | `La meta de Acapulco para agosto es de 1656 toneladas.` |
| Director IA | `No se pudo determinar una intención clara con las reglas actuales Indica si quieres el diagnóstico de la planta actual, un cliente concreto u otro tema. No asumo el hilo ni consulto Action Register a ciegas.` |

**Origen exacto del texto:** `detectDirectorIaIntent` → `unknown` / `no_rule_matched` / `clarification_reason` (`lib/director-ia-planner.js` ~619–621) concatenado por `buildUnknownClarificationResult` (`lib/director-ia-conversation-state.js` ~1184–1194). Gate en `askDirectorIa` ~3168:

`if (directorIaPlan.intent === "unknown" && !continuityTurn.inherit)`.

**Sonda in-process (main actual, solo lectura):**

| Utterance | `detectIntent` | `isPreCloseQuestion` | `isPreMeetingFollowUp` | `classifyTurnKind` | `resolveExecutiveNeed` |
|---|---|---|---|---|---|
| `Prepárame para el pre-cierre` | `pre_meeting_brief` 0.9 | true | true | other | specialized_standalone |
| `La meta de Acapulco para agosto es de 1656 toneladas.` | `unknown` 0.35 | false | false | other | no_need |
| `1656 toneladas.` | `unknown` 0.35 | false | false | other | no_need |
| `¿Cómo va Puebla?` | `plant_diagnosis` 0.84 | false | false | other | EXECUTIVE_STATUS (CEL) |

**Continuidad (misma sonda):**

| Contexto del 2.º turno | `inherit` | `usePreClose` | `unknown_gate` | Destino físico |
|---|---|---|---|---|
| Sin history y sin `conversation_state` | false | false | **true** | Exactamente el texto de producción |
| History de user PRE_CLOSE, sin echo | true → `pre_meeting_brief` | **false** | false | Junta **clásica**, no PRE_CLOSE |
| Echo `cycle_mode=PRE_CLOSE` | true | **true** | false | Composer PRE_CLOSE (requery oficial; 1656 no entra) |

**Frontend de producción (repo):**

`frontend-dashboard/modules/director-ia/lib/api.ts` `fetchDirectorIaChat` envía `planta_id`, `question` y `history` (últimos 8). **No envía `conversation_state`.**

`DirectorIaChatPanel.tsx` acumula `{role, content}` y llama ese fetch. **No reenvía `context_meta.conversation_state`.**

Greeting early-return (~3076–3092) **tampoco** adjunta `conversation_state` en `context_meta`.

**Tests PRE_CLOSE** inyectan `body.conversation_state` a mano y usan `¿Qué me preocupa más?` / `qué me preocupa más` (sí `isPreMeetingFollowUp`). Ninguno cubre una **respuesta** a `DECISION_NEEDED` ni el path real del FE.

---

## 5. Root cause por hallazgo

### H1

El greeting es una plantilla de planta. La identidad de sesión no está en la firma de `buildNeutralGreeting`. `_user` no llega poblado por el middleware. `actor_nombre` no está en el JWT de dashboard típico. No hay pérdida en tránsito: **no hay consumo**.

### H2

`question_seed` de `EXPENSE_STILL_OPEN` incluye el lexema interno `reviewable` y la constraint `reviewable != ahorro`. GPT tiene orden de redactar desde seeds tipados y **no** hay capa de presentation. El leak es de copy, no de semántica.

### H3 (primario)

Tres huecos encadenados; ninguno es un phrase-book de “La meta de…”.

1. **No hay pending-clarification tipado.** Tras PRE_CLOSE se guarda `cycle_mode`, `parent_intent` y `pending_information_gap.missing_fields` = **kinds de gaps** (`TARGET_MISSING_FOR_PERIOD`, …), no slots de pregunta (`TARGET_ABSENT` / meta venta_ton YYYY-MM planta) ni “el assistant acaba de preguntar X”.
2. **El FE no echoa `conversation_state`.** `usePreClose` exige `isPreCloseQuestion(q)` **o** `echoedState.cycle_mode === "PRE_CLOSE"` (`chat.js` ~3521–3524). Una respuesta natural no es `isPreCloseQuestion`. Sin echo, PRE_CLOSE se pierde aunque el planner herede `pre_meeting_brief` por history.
3. **El planner no clasifica una respuesta ejecutiva.** `isPreMeetingFollowUp` solo acepta kinds `attention|gap_*|confirm|why` o cues (`preocup`, `huecos`, re-pregunta de junta). Un statement de meta es `unknown`. El gate `unknown && !inherit` produce el texto de producción cuando **tampoco** hay parent reconstruible.

Aunque inherit por history evitara el unknown, el composer **reconsulta** `igf_meta` y **no consume** 1656 como evidencia de sesión. El usuario volvería a ver `TARGET_MISSING_FOR_PERIOD`. Ese segundo hueco es independiente del fallback.

El unknown observado implica, en ese request, `inherit === false`: sin echo y sin parent reconstruido (history ausente, recortada, o invalidada). El panel del repo sí manda history; el contrato de continuidad de PRE_CLOSE **no** depende de history — depende de `cycle_mode` echoado, que el FE no envía.

---

## 6. Severidad

| ID | Severidad | Por qué |
|---|---|---|
| H1 | **MINOR** | UX de saludo. No rompe routing, AUTHZ ni evidencia. |
| H2 | **MINOR** | Leak de lenguaje interno. No altera `EXPENSE_STILL_OPEN` ni `reviewable != ahorro`. |
| H3 | **MAJOR** | Ciclo ejecutivo: el sistema pregunta y descarta la respuesta. No es CRITICAL: no hay leak cross-plant, mutación, ni persistencia indebida. |

CRITICAL = 0.

---

## 7. Arquitectura actual del follow-up PRE_CLOSE

```
User: "Prepárame para el pre-cierre"
  → isPreCloseQuestion = true
  → planner intent pre_meeting_brief / pre_close_compose
  → composeExecutiveCycle (requery oficial)
  → DECISION_NEEDED seeds → GPT redacta preguntas
  → context_meta.conversation_state:
       parent_intent=pre_meeting_brief
       cycle_mode=PRE_CLOSE
       pending_information_gap.missing_fields = gap kinds
       meeting_pack_not_persisted=true

FE: guarda solo role/content. NO reenvía conversation_state.

User: statement natural (meta / toneladas / …)
  → detectIntent = unknown
  → isPreMeetingFollowUp = false
  → isPreCloseQuestion = false
  → resolveExecutiveNeed = no_need (no CEL)
  → inherit:
       sí  si hay echo parent o history reconstruye standalone inheritable
       no  si no hay echo ni parent
  → unknown && !inherit → clarificación "no asumo el hilo"
  → inherit && !echo cycle_mode → pre_meeting_brief CLÁSICO (no PRE_CLOSE)
  → inherit && echo PRE_CLOSE → composer PRE_CLOSE, requery oficial, 1656 ignorado
```

No existe: “assistant asked slot S → user answered S → overlay de sesión → reanudar PRE_CLOSE”.

---

## 8. Qué estado existe y qué estado falta

**Existe (si el cliente lo reenvía):**

- `parent_intent`, `planta_id`, `cycle_mode=PRE_CLOSE`, `portfolio_scope`, `active_period_months`, `meeting_type`, `last_evidence_bundle_type`
- `pending_information_gap`: `{ missing_fields: [gap.kind…], why_blocks, physical_source: null, physical_person: null }`
- Continuidad B: inherit de intents inheritable + follow-ups de **pregunta** (`preocup`, huecos, `isPreMeetingQuestion`)
- History de `{role, content}` (FE); `reconstructFromUserHistory` solo recupera **intent standalone**, no slots

**Falta:**

- Pending clarification: lista de preguntas emitidas / `decision_kind` / slot esperado
- Binding “esta utterance es respuesta al slot S”
- Overlay session-only de TARGET/otros slots (no oficial)
- Conservar slots no respondidos cuando el usuario contesta uno de dos
- Echo FE de `conversation_state`
- `usePreClose` que no dependa de re-matchear la frase de apertura

**Respuestas A–J:**

| | Determinación |
|---|---|
| A | Se guarda modo PRE_CLOSE + gap kinds. **No** “clarificación pendiente” tipada. |
| B | Guarda kinds (`TARGET_MISSING_FOR_PERIOD`). **No** “meta venta_ton YYYY-MM planta”. |
| C | Hoy **no** se clasifica como respuesta a una pregunta emitida. |
| D | El planner no recibe slot pending. Solo inherit genérico si hay parent. |
| E | `cycle_mode` / `parent_intent` se conservan **si el cliente los reenvía**. El FE no lo hace. |
| F | Continuidad B + `pending_information_gap` existen para packs/requery. **No** hay arquitectura “assistant asked → user answered”. |
| G | Combinación: conversation-state (pending questions/slots) + chat orchestration (no caer a unknown; `usePreClose` por pending) + composer (overlay session-only, requery oficial) + planner **sin** phrasebook. No Steering persist. |
| H | 1656 = **session-only / ephemeral**. No `EXECUTIVE_STEERING_EVENT`. No meta oficial. |
| I | Confirmado: respuesta conversacional **≠** dato oficial de DB. |
| J | Independiente de POST_CAPTURE_READ / Steering. No persistir. |

---

## 9. Ownership físico de una futura corrección

| Capa | Qué le corresponde | Qué no |
|---|---|---|
| `conversation-state` | Pending questions/slots; inherit si la respuesta encaja en un slot abierto; no forzar PRE_CLOSE si hay standalone CEL/otro tema | Phrase list de “La meta de…” |
| `director-ia-chat` | No gatear `unknown` cuando hay pending slot; `usePreClose` por `cycle_mode` pending, no solo por `isPreCloseQuestion`; no persistir | Inventar evidencia |
| composer PRE_CLOSE | Overlay session-only sobre TARGET ausente; requery oficial intacto; `null != 0` | Escribir `igf_meta` / SQL 020 |
| planner | No phrasebook. Como máximo, ceder a inherit/pending ya resuelto | Convertir cualquier número en meta |
| FE `DirectorIaChatPanel` / `api.ts` | Echo de `conversation_state` (sin evidence pack) | Persistir meta |
| Steering capture | **Fuera** de esta corrección | INSERT 020 |

H1 futuro (otro slice): greeting + identidad de sesión autorizada. No mezclar con H3.

H2 futuro (otro slice o el mismo ARCH si toca seeds): presentation mapping del seed. No mezclar persistencia.

---

## 10. Riesgos de regresión

Preservar:

- CEL REAUDIT PASS (1141/0/0, LOCAL_E2E_HARNESS)
- Daily brief: `Dame el resumen diario` / `isUnequivocalDailyBriefQuestion`
- `¿Cómo vamos?` / `¿Cómo vamos hoy?` → CEL, no daily
- `¿Cómo va Puebla?` → planta explícita gana sobre UI (CEL standalone; **no** forzar PRE_CLOSE)
- Specialized modes, AUTHZ, `null != 0`, no fabricated evidence
- Steering DORMANT; SQL 020 aplicado sin runtime de captura
- No-Orphan (PRE_CLOSE + CEL activas; store DORMANT)

Riesgos de una corrección mal acotada:

- Phrase-patch de “La meta de…” / agosto / Acapulco / 1656 → frágil y no general
- Tratar cualquier número como TARGET
- Forzar PRE_CLOSE cuando el usuario cambia de tema
- Persistir 1656 en `igf_meta` o `executive_steering_events`
- Inventar el segundo slot si el usuario solo responde uno
- Romper inherit de `¿Qué me preocupa más?` (tests actuales)

---

## 11. Persistencia: qué NO debe ocurrir

- No `INSERT` en `arr.executive_steering_events` (SQL 020 ya aplicado; COUNT 0 debe seguir pudiendo ser 0).
- No mutar `igf_meta` / TARGET_COMMITMENT.
- No tratar RECORDED / Steering como TARGET.
- No promover overlay de sesión a hecho oficial.
- No persistir work-item memory como evidencia (`meeting_pack_not_persisted` ya lo declara).
- Una respuesta conversacional a una pregunta del sistema **no** es dato oficial de DB.

---

## 12. Relación con Steering / POST_CAPTURE_READ

**Este bug se resuelve de forma independiente.**

Steering v1.0: RUNTIME PENDING, AUTHZ_CONFIRMATION PENDING, chat no `require` el capture. `RECORDED` es atestación, no verdad del contenido. POST_CAPTURE_READ está PENDING.

H3 es continuidad de **clarificación de sesión** sobre un hueco `TARGET_MISSING_FOR_PERIOD`. Cerrar H3 **no** abre captura Steering ni lectura de store. Abrir Steering **no** arregla H3.

Una meta dicha en chat no es `COMMITMENT` RECORDED ni TARGET oficial.

---

## 13. Tests que hoy no cubrieron el fallo

| Área | Qué cubren | Hueco |
|---|---|---|
| `test/director-ia-conversational-executive-status.test.js` | Greeting = planta, sin lista STALE | No exige nombre de usuario; no prueba ausencia de cable de identidad |
| `test/director-ia-pre-close-steering.test.js` | Routing PRE_CLOSE; inherit con **echo inyectado** + `¿Qué me preocupa más?`; requery; AUTHZ | No hay respuesta a `DECISION_NEEDED`; no hay path FE (sin echo); no prohíbe `reviewable` en `answer` |
| Continuidad / natural-followup / intra-session | Inherit de diagnóstico, daily, cliente, taller | No PRE_CLOSE pending-clarification |
| Planner | `isPreCloseQuestion` sobre frases de apertura | Statement de meta → `unknown` (sin aserción de que deba heredar) |
| FE | Sin test de contrato de body | `conversation_state` no se envía |

La suite verde **no contradice** H3: premia fail-closed de `unknown` aislado y follow-ups de **pregunta**, no de **respuesta**.

---

## 14. Propuesta de test matrix futura (SIN escribir tests)

Arquitectura semántica general. **Prohibido** phrase-patch de “La meta de…” / agosto / Acapulco / 1656.

1. Assistant emitió slot TARGET; usuario responde cantidad+unidad en el mismo hilo pending inequívoco → resume PRE_CLOSE; overlay session-only; requery oficial intacto; **no** INSERT.
2. `1656 toneladas.` corto con un solo slot TARGET abierto → continuar; no inventar el otro slot (reviewable/EXPENSE sigue pending).
3. Dos `DECISION_NEEDED`; usuario responde uno → conservar el otro; no fabricar.
4. `¿Cómo va Puebla?` tras PRE_CLOSE → CEL / standalone; **no** forzar PRE_CLOSE.
5. `No, la meta es 1700.` en la misma sesión → corrección de **overlay de sesión**, no SUPERSEDE de store, no `igf_meta`.
6. Conversación nueva: `La meta es 1656.` sin pending → **no** asumir PRE_CLOSE; no persistir.
7. Sin echo FE y con history de apertura PRE_CLOSE: no unknown; `usePreClose` no debe depender solo de re-matchear la frase de apertura (tras ARCH).
8. Greeting: si hay `actor_nombre` autorizado, puede usarse; si no, el texto actual es correcto; no inventar.
9. H2: `answer` al usuario no contiene el token `reviewable`; `decision_kind` y la regla interna se conservan en pack/prompt.
10. Regresión: los cuatro PASS de producción + inherit `qué me preocupa más` + daily vs CEL + AUTHZ + `null != 0`.

---

## 15. Los cuatro PASS de producción permanecen válidos

| # | Input | Observed / contrato | ¿Sigue válido en `de451385`? |
|---|---|---|---|
| 1 | UI Acapulco + `¿Cómo vamos?` | CEL / Estado Ejecutivo | **Sí** — `resolveExecutiveNeed` EXECUTIVE_STATUS; specialized PRE_CLOSE no aplica |
| 2 | UI Acapulco + `¿Cómo vamos hoy?` | CEL, no daily | **Sí** — `hoy` no es daily unequivocal |
| 3 | `Dame el resumen diario` | daily executive brief | **Sí** — specialized standalone daily |
| 4 | UI Acapulco + `¿Cómo va Puebla?` | Puebla explícita gana | **Sí** — CEL + extractExplicitPlant; sonda: EXECUTIVE_STATUS + `plant_diagnosis` 0.84 |

H1/H2/H3 no invalidan esos cuatro caminos.

---

## 16. MANUAL_CHAT_VALIDATION

**No se declara PASS global.**

H3 está abierto. La validación humana post-deploy es **parcial**: 4 PASS de routing + 3 hallazgos, de los cuales H3 es funcionalmente bloqueante para el hilo de pre-cierre.

`MANUAL_CHAT_VALIDATION = NOT_GLOBAL_PASS`.

---

## 17. Matriz Director IA

Auditoría. **No incrementa** cobertura.

- Antes: 10.5 / 20 = 52.5%
- Después: 10.5 / 20 = 52.5%
- Delta: 0.0 pp

---

## 18. NEXT_TASK (exactamente una; no autorizada; no ejecutada)

```yaml
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001"
next_task_authorized: false
next_task_executed: false
task_type: "ARCH"
intent: >
  Diseñar (sin implementar) pending clarification semántica para modos
  ejecutivos que emiten DECISION_NEEDED: assistant pregunta dato faltante
  → usuario responde en lenguaje natural → se reconoce como continuación
  del slot abierto cuando es inequívoco → se reanuda PRE_CLOSE con overlay
  session-only → slots no respondidos se conservan. Incluir topic-change
  (CEL/Puebla), corrección intra-sesión, conversación nueva sin pending,
  y frontera de no persistencia. No phrasebook. No SQL. No Steering.
  H2 presentation mapping puede listarse como follow-on, no como núcleo.
  H1 greeting identity queda fuera de esta ARCH.
```

Esta propuesta **no** autoriza trabajo. Un DONE no abre G5.

---

## Escenarios de regresión conceptual (diseño; no implementar)

1. Director: “¿Cuál es la meta de este mes?” / Usuario: “1656 toneladas.” → continuar si el pending slot es inequívoco.
2. Dos faltantes; usuario responde uno → conservar el otro; no inventarlo.
3. “¿Cómo va Puebla?” → no forzar PRE_CLOSE.
4. “No, la meta es 1700.” → corrección de overlay de sesión, no SUPERSEDE de store.
5. Conversación nueva: “La meta es 1656.” → no asumir PRE_CLOSE.
6. Usuario da una meta → no persistir como dato oficial salvo contrato/autorización explícita (hoy no existe).

---

## Confirmaciones de frontera

- Rama auditada = `main` = `de4513859a17e9bf15aed40cdb2362b018fc9c3d`.
- SQL 020 aplicado (humano); Steering chat DORMANT; no se tocó producción.
- Código, tests, SQL, `docs/director-ia/`, contratos, schema: **no modificados**.
- No commit. No push. No merge. No deploy. No SQL.
- `authorized_by` / `authorized_at` preservados desde G1 humano.
- `secrets_check: none`.

```yaml
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-POST-DEPLOY-CONVERSATIONAL-FINDINGS-001.md"
files_not_touched:
  - "lib/**"
  - "test/**"
  - "sql/**"
  - "docs/director-ia/**"
  - "frontend-dashboard/**"
  - "producción / Render"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001"
human_decision_needed:
  - "Revisar este AUDIT (G humano). No autoriza ARCH."
  - "No declarar PASS global de chat manual mientras H3 esté abierto."
```

---

## G5 CLOSE (humano 2026-08-27)

HUMAN_APPROVER cerró esta tarea: `DONE_PENDING_REVIEW` → `CLOSED`.

Hallazgos preservados, no reinterpretados:

- VERDICT = FAIL
- H1 MINOR: greeting no usa nombre del usuario
- H2 MINOR: "reviewable" filtra token interno
- H3 MAJOR: PRE_CLOSE pierde continuidad ante respuesta natural a clarification
- MANUAL_CHAT_VALIDATION no es PASS global
- 1656 no es meta oficial ni Steering

`next_task_proposed` de este reporte (`ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001`) **no** queda autorizada por este cierre.

G5 abre por separado, con G1 propio:
`AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001` (AUTHORIZED; no ejecutada en el turno de transición).
