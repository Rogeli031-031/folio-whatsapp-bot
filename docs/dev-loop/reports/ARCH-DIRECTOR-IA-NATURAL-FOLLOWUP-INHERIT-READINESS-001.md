# Reporte — ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
selected_strategy: "B"
first_slice: "unknown_with_valid_state_inherit"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Natural follow-up inherit is not module coverage."
julio_action: "deferred (not this slice)"
daily_discount: "deferred"
sql_017: "not executed; environment activation remains operational"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    EKE §15 prohíbe «sustitución del routing actual del chat hasta que se decida
    gobernarlo explícitamente». Esta readiness no sustituye el chat por el Motor.
    Solo relaja la puerta de inherit en el chat legado. Si HUMAN_APPROVER lee §15
    como «no tocar el routing del chat en absoluto», REJECTED en G5. No obliga STOPPED:
    Constitución + índice tratan el chat legado como distinto de N1–N5.
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** Estrategia seleccionada: **B — unknown + estado válido → inherit → GPT**.

No A (más phrasebook). No C (score/anaphoras = phrasebook disfrazado). No D (segunda llamada LLM para ruteo).

Regla general (no catálogo):

```text
planner aislado = unknown
  AND parent_intent ∈ INHERITABLE_INTENTS
  AND misma planta (request)
  AND last_evidence_bundle_type presente
  AND no intent standalone (≥ 0.55)
  AND no topic/period/plant switch
  AND no smalltalk/thanks/help
→ heredar parent_intent
→ REQUERY pack fresco + authz
→ HILO (conversación, no evidencia)
→ una llamada OpenAI
→ GPT interpreta el follow-up
```

«¿Y eso?» no es cliente. Demostrativos no disparan resolución de entidad. «¿Y él?» reusa `active_entity` solo si sigue válida.

Standalone gana: presupuesto, Taller AT-15, «¿Cómo va Querétaro?», «¿Por qué bajó la venta ayer?».

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001`.

---

## Ejecución

- Rama: `architecture/director-ia-natural-followup-inherit-readiness-001` (≠ `main`).
- HEAD: `0acc80f3 Merge branch 'audit/director-ia-conversational-product-gap-003'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- Sin código, tests, matriz, contratos, SQL, commit, push, merge.

---

## Dónde se corta el turno (físico)

1. `classifyTurnKind` (`lib/director-ia-conversation-state.js` ~96–180): lista cerrada de kinds. `other` no hereda.
2. `isDefensibleFollowUpKind` / `isDailyFollowUpKind`: puerta del inherit actual. Es el phrasebook.
3. `^y [a-z0-9]` → `entity_intro`. «¿Y eso?» hereda **mal** y `continuityNeedsUniqueEntity` exige cliente (`askDirectorIa` ~2490, ~2955, ~3104).
4. `extractEntityHint` ya excluye `eso` en el nombre, pero el **kind** sigue siendo `entity_intro`. Hint null + unique-entity = clarificación.
5. `askDirectorIa` ~2726: `unknown && !inherit` → `buildUnknownClarificationResult` y **vacía** estado.
6. Planta: `gap_what` / `gap_who` / `gap_why_need` early-return `buildGap*Answer` (~3191–3238). Programa el wording. Diario ya deja GPT.

Señales **ya existentes** para herencia (KEEP, reutilizar):

- `parent_intent` en `INHERITABLE_INTENTS` (`plant_diagnosis`, `expediente_comercial`, `daily_sales_deviation`)
- `last_evidence_bundle_type`, `pending_information_gap`, `active_date`, `active_entities`
- `isStandaloneDetected` (confianza ≥ 0.55)
- `plant_switch` / `topic_return` / `period_switch`
- `classifyConversationalIntent` (hola/gracias/ayuda) **antes** del planner
- `inheritParentIntent` en el planner **solo si** detected = `unknown`
- requery en cada rama de pack

Lo que **falta** no es otra lista de frases: es dejar de exigir `kind ∈ phrasebook` para inherit.

---

## A / B / C / D

### A — ampliar phrasebook

Rechazado. Repite OVERPROGRAMMING. Cada «¿o sea?» nuevo vuelve a fallar. La tarea lo prohíbe. Los hold-out lo invalidan: si el test solo pasa porque la frase está en código, no generaliza.

### B — unknown + estado válido → inherit

Seleccionado.

El planner aislado **debe** poder devolver `unknown`. Eso no es fallo: es elipsis. Si hay contexto seguro, el turno llega a GPT. No convierte *cualquier* unknown: exige parent inheritable, bundle, misma planta, no standalone, no switch, no smalltalk.

Generaliza a frases que **nunca** estarán en código («¿O sea?», «No te seguí», «¿En qué sentido?»).

Riesgo controlado: «Hablemos de presupuesto» sin trigger M18 heredaría planta. Mitigación KEEP: prefijos de **cambio de tema** ya parcialmente en `topic_return`/`plant_switch`; el IMPL debe tratar `hablemos de` / `cambiando de tema` / `ahora dime` como **topic switch**, no como follow-up. Eso no es catálogo de follow-ups; es invalidación de contexto.

Riesgo dump AR: `unknown` **sin** parent sigue clarificando. No se reabre el dump. Inherit solo a intents que ya tienen rama de pack (los tres INHERITABLE).

### C — gate estructural / score

Rechazado como first slice.

«Turno corto» falla: «Explícame un poco más el movimiento de kg» es follow-up largo. «Anáfora = eso/así/más/entonces» es phrasebook de pronombres. Un score opaco viola la tarea. C no generaliza mejor que B; es A con extra pasos.

Señales estructurales **sí** se conservan como KEEP (standalone, switch, no-entidad demostrativa). Eso no es C.

### D — clasificador LLM

Rechazado. Segunda llamada, latencia, ruteo no determinista, riesgo de clasificar scope/authz con el modelo. El ruteo de verdad (planta, entidad, standalone) debe seguir en código. Una llamada OpenAI **después** del pack, no antes para decidir si hereda.

---

## First slice — contrato de inherit (B)

**Hereda** si y solo si:

1. `parent_intent` ∈ `INHERITABLE_INTENTS`
2. `last_evidence_bundle_type` no nulo (pack previo defendible)
3. `planta_id` del **request** = estado (mismatch ya invalida)
4. planner aislado = `unknown` (o la excepción diaria **ya vigente**: follow-up diario vs `client_analysis`)
5. no `isStandaloneDetected` (presupuesto, Taller AT-15, Querétaro/`como va`, venta ayer, financial, M5/M6/M9/M11/M12/M18, etc.)
6. kind ∉ `{plant_switch, topic_return, period_switch}` (ampliar topic_return a `hablemos de` / `cambiando de tema` si aún no cubre el ejemplo de la tarea)
7. no early-return smalltalk/thanks/help

**Entonces:** `inherit = true` → misma rama de pack que el parent → **requery** → HILO + pack fresco + limitations + gap estructurado → GPT. **No** respuesta determinística por clase (explicación / qué más / consecuencia / wording de gap).

**No hereda** si falta cualquiera. `unknown` sin estado → clarificación (como hoy).

Daily: conservar `forceIntent` cuando el follow-up diario anula un standalone falso (`qué clientes explican` → no DICF). No regresionar C2.

Planta: **quitar** early-return `buildGapWhatAnswer` / Who / WhyNeed para que GPT redacte. KEEP: no nombrar persona sin vínculo físico (dato en el gap / prompt, no frase enlatada).

---

## Entity safety

| Frase | Hoy | Slice B |
|---|---|---|
| ¿Y eso? | `entity_intro` + unique-entity fail | Demostrativo ≠ entidad. Inherit + GPT. No resolver «eso». |
| ¿Y esto? / ¿Y aquello? | igual riesgo | Igual: no son `cliente_key`. |
| ¿Y él? / ¿Y ella? / ¿Y ese cliente? | puede pedir nombre «él»/«ese» | Reusar `active_entity` **solo** si unique y misma planta. Si no hay entidad activa → clarificar. No fuzzy. |
| ¿Y Arturo? | entity_intro + resolve físico | KEEP. Única → pack; ambigua → clarificar; ausente → clarificar. |

KEEP: lista **negativa** de no-identidad (`eso`, `esto`, `aquello`, `ello`, `él`, `ella`, `ese`, `esa`, `este`, `esta`, `el`, `la`, `los`, `las`, `ellos`, `ellas`). No es phrasebook de follow-ups; es la misma clase que `extractEntityHint` ya intenta y `classifyTurnKind` ignora.

Nueva entidad **nombrada** (mayúscula / nombre propio): resolver contra pack fresco. Ambiguo → clarificar. Nunca del history.

---

## Standalone y topic switch (precedencia)

Deben ganar **aunque** haya parent:

| Ejemplo | Intent esperado |
|---|---|
| ¿Cómo va el presupuesto esta semana? | M18 `budget_status` |
| ¿Qué tiene Taller AT-15? | M5 `taller_at` |
| ¿Cómo va Querétaro? | `plant_diagnosis` standalone; `planta_id` del **request**, nunca del texto |
| ¿Por qué bajó la venta ayer? | `daily_sales_deviation` |

Topic switch explícito invalida entidad, gap, `active_date`. No arrastrar evidencia vieja. Requery del **nuevo** intent si es standalone; si el switch no resuelve intent → clarificar, no heredar.

Julio / «qué pasó con la acción de…»: memoria `resume` sigue **antes**. **No** se diseña lookup AR aquí.

---

## Evidence y GPT

- Inherit contexto ≠ reusar payload. REQUERY cada turno. Authz actual. `SOURCE_RESTRICTED` actual. Provenance actual.
- HILO etiquetado: no es evidencia. Claims previos ≠ hechos.
- GPT recibe: HILO + parent_intent + entidad si válida + `active_date` si diario + gap estructurado + pack fresco + limitations.
- GPT decide cómo contestar «¿Cómo así?» / «¿Qué más?» / «¿Y eso qué implica?».
- Prohibido: plantilla por clase; promover prosa del assistant a hecho.

Una llamada OpenAI por turno de pack. Sin clasificador previo.

---

## Hold-out / generalización (obligatorio en IMPL)

Los ejemplos de la tarea (`¿Y eso?`, `¿Cómo así?`, `¿Qué más?`, …) sirven para **auditar intención**, no para copiarse a `classifyTurnKind`.

El IMPL **debe** incluir pruebas con frases que **no** aparezcan en `lib/` ni en los ejemplos de esta readiness. Si el suite solo pasa reconociendo el set del prompt, **REJECT** la solución.

Hold-out mínimo (no añadir como kinds):

- «¿O sea?»
- «No te seguí.»
- «¿En qué sentido?»
- «¿Y de ahí?»
- «¿Falta algún dato?»
- «¿El resto?»
- «A ver…»
- «¿Concretamente?»

También: puntuación distinta (`como asi` sin tildes/signos), coloquial corto (`¿y?` si se acepta; si `¿y?` solo es demasiado ambiguo → clarificar está permitido).

Negativos: standalone, topic switch, plant mismatch, entidad ambigua, unknown **sin** estado, smalltalk (`gracias` / `ok` no heredan pack).

Seguridad: authz revalidada; no evidencia stale; no cross-plant; history ≠ evidence.

Regresión: daily C2 canónico, plant C1 canónico, financial, persistent memory, M5/M6/M11/M12/M18, suite Director IA.

---

## KEEP vs LET_GPT

**KEEP_DETERMINISTIC:** authz, planta del request, identidad de entidad, standalone, topic/plant/period switch, requery, provenance, null≠0, SOURCE_RESTRICTED, no-identidad de demostrativos, persona solo con vínculo físico, no dump AR sin parent.

**LET_GPT_REASON:** interpretación del follow-up abierto; explicación; expansión; consecuencia; redacción del gap; tono.

No sistema experto de conversación. No score. No segunda LLM.

---

## Límites del READY_WITH_LIMITS

- Solo intents ya inheritable. **No** añadir `financial_diagnosis` en este slice.
- No lookup «acción de Julio».
- No descuento/kg diario.
- No SQL 017.
- «Cómo va Querétaro» no cambia de planta por el texto (invariante vigente).
- `INHERITABLE_INTENTS` no se convierte en topic stack.

---

## G2 / G3

**G2 = N/A.** Chat legado. No redefine Constitución, EKE, IES ni Reasoning Engine. No es pipeline N1–N5.

**G3 = N/A.** No hay contrato nuevo. El estado efímero ya existe.

**G8 = N/A.**

---

## Porcentaje

**10.5 / 20 = 52.5%**. Inherit no suma módulo. IMPL esperado: **0.0 pp**.

---

## NEXT_TASK (propuesta únicamente)

`IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001`

Implementar B + entity safety de demostrativos + topic-switch estructural `hablemos de` + quitar early-return de hueco en planta + tests hold-out.

No autorizado. No ejecutado. STOP.
