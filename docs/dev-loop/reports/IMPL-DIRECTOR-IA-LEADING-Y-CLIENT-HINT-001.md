# IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001

```yaml
task_id: IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001
outcome: DONE
task_type: IMPLEMENTATION
branch: implementation/director-ia-leading-y-client-hint-001
base_main_sha: 4f286af9266e72d26c67ae0fd37b3a2f93865a3c
implementation_authorized: YES
merge_authorized: NO
docs_director_ia_changed: NO
hardcode_used: NO
golden_set_implemented: NO
commit: pending_at_report_write
push: pending_at_report_write
```

## SHA base

`origin/main` = `HEAD` al iniciar = `4f286af9266e72d26c67ae0fd37b3a2f93865a3c`

Contrato de auditoría:

`docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001.md`

## Mecanismo implementado

No se “arregló la regex” como decisión de identidad. `extractEntityHint` conserva `¿Y Arturo? → Arturo` y sigue capturando un token en `yMatch`.

La decisión se movió a evidencia canónica exacta:

1. `extractLeadingYHintCandidates` genera candidatos, no identidad:
   * conversacional = primer token capitalizado tras `Y`/`y`;
   * canónico = `Y` + tokens de nombre capitalizados consecutivos (se detiene en minúsculas / stop / pronombre);
   * `requires_canonical_evidence = true` solo si hay **dos o más** tokens de nombre.
2. `resolveConversationTurn` transporta `entity_hint_candidates` y `leading_y_requires_canonical`.
3. `loadClientProfileForChat` prueba `exactNorm` contra el catálogo ARR, hint más largo primero.
4. `resolveUniqueEntityFromHints` hace lo mismo sobre evidencia ensamblada (igualdad de `normalizeText`, sin fuzzy).
5. Si hay 2+ tokens y no hay hit exacto del candidato canónico: `not_found` / `none`. No se fuerza `GRUPO`.
6. Si el candidato canónico tiene dos hits exactos distintos: `ambiguous`.
7. `¿Y Arturo?` (un token) sigue el matcher existente de palabra completa.

No hay literal `Y GRUPO MOVE` en runtime.

## Por qué distingue identidad canónica de follow-up

| Enunciado | Candidatos | Evidencia | Resultado |
| --- | --- | --- | --- |
| `¿Y Arturo?` | `Y Arturo`, `Arturo` | `Arturo Lopez` por palabra completa | `Arturo` / `Arturo Lopez` |
| `Y GRUPO MOVE` | `Y GRUPO MOVE`, `GRUPO` | fila exacta `Y GRUPO MOVE` | `Y GRUPO MOVE` |
| `¿Y GRUPO MOVE?` | igual | misma fila | `Y GRUPO MOVE` |
| `Y ACME SUR` / `Y DELTA NORTE` | mismo mecanismo | fila exacta del nombre usado | ese nombre |
| `Y GRUPO MOVE` sin fila canónica | igual | solo vecinos `GRUPO*` | `not_found`, no `GRUPO` |

La presencia de dos palabras **no** decide que `Y` sea parte del nombre. Solo impide el fallback al primer token. El nombre canónico se acepta únicamente con igualdad exacta.

## Archivos

Modificados:

* `lib/director-ia-conversation-state.js`
* `lib/director-ia-client-profile.js`
* `lib/director-ia-chat.js`
* `docs/dev-loop/CURRENT_TASK.md`
* `docs/dev-loop/reports/IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001.md`

Creados:

* `test/director-ia-leading-y-client-hint.test.js`

No tocados (alcance):

* parser temporal / `enero a la fecha`
* `plant_switch` / `Ahora dime lo mismo…`
* extracción de `Dame las compras de Y GRUPO MOVE.`
* `docs/director-ia/`
* auditoría CLOSED

## Before / after

| Entrada | Antes | Después (con evidencia canónica) |
| --- | --- | --- |
| `Y GRUPO MOVE` | hint `GRUPO` → identidad forzada `GRUPO` | candidatos → exact hit `Y GRUPO MOVE` |
| `¿Y GRUPO MOVE?` | hint `GRUPO` | exact hit `Y GRUPO MOVE` |
| `¿Y Arturo?` | `Arturo` | `Arturo` (regresión) |
| `¿Qué sabemos de Y GRUPO MOVE?` | `Y GRUPO MOVE` vía `sabemos` | igual |
| `Y GRUPO MOVE` sin fila canónica | identidad forzada `GRUPO` | `not_found` |
| `Dame las compras de Y GRUPO MOVE.` | `extractEntityHint=null` | **sin cambio** (OUT_OF_SCOPE) |

## Prueba de no-hardcode

* Control estructural `Y DELTA NORTE` / `Y ACME SUR` usa el mismo parser + `exactNorm`.
* Test lee `conversation-state`, `client-profile` y `chat` y exige que no contengan el literal `Y GRUPO MOVE`.

## Regresión `¿Y Arturo?`

* `extractEntityHint("¿Y Arturo?") === "Arturo"`
* `resolveUniqueEntityFromHints` cae al matcher de un token existente → `Arturo Lopez`
* Tests previos de continuity / natural-followup siguen verdes

## Evidencia de resolución canónica

`loadClientProfileForChat` con filas inyectadas:

* `Y GRUPO MOVE` / `¿Y GRUPO MOVE?` / `¿Qué sabemos de Y GRUPO MOVE?` → `identity.cliente_norm = Y GRUPO MOVE`
* no `GRUPO` ni `GRUPO MOVE`
* `Y DELTA NORTE` → `Y DELTA NORTE`

## Tests

Focalizados:

* `test/director-ia-leading-y-client-hint.test.js`
* `test/director-ia-conversational-continuity.test.js`
* `test/director-ia-client-profile.test.js`
* `test/director-ia-natural-followup.test.js`
* `test/director-ia-persistent-memory.test.js`

Resultado focalizado: **94 pass / 0 fail**

Suite `test/director-ia-*.test.js`:

```text
tests 1351
pass 1351
fail 0
duration_ms ~18660
```

## Diff summary

```text
docs/dev-loop/CURRENT_TASK.md
lib/director-ia-chat.js
lib/director-ia-client-profile.js
lib/director-ia-conversation-state.js
test/director-ia-leading-y-client-hint.test.js
docs/dev-loop/reports/IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001.md
```

`git diff --check`: limpio.

## OUT_OF_SCOPE

No corregidos (documentados, no implementados):

* `Dame las compras de Y GRUPO MOVE.` → `extractEntityHint=null`
* `Dame los kg comprados de Y GRUPO MOVE.` → `null`
* extracción general de preguntas compuestas
* `Ahora dime lo mismo…` → `plant_switch`
* `inherit=false` de ese hallazgo
* parser `enero a la fecha`
* Render SHA
* aliases / fuzzy general

## Revisión humana — gap de precedencia de un token

Observación antes del merge: `resolveUniqueEntityFromHints` / `resolveExactRankedByHints` ordenaban por longitud. Con catálogo simultáneo `Y Arturo` + `Arturo Lopez`, `¿Y Arturo?` elegía `Y Arturo` por exact hit más largo.

Reproducción (tests en rojo, código previo a este follow-up):

* `resolveUniqueEntityFromHints` → `Y Arturo`
* `loadClientProfileForChat("¿Y Arturo?")` → `identity.cliente_norm = Y Arturo`

Corrección mínima:

* Un token (`requires_canonical_evidence = false`): no se usa el orden por longitud. Se resuelve el hint conversacional. En `resolveUniqueEntityFromHints` se excluye el homónimo exacto `Y <token>` para que el whole-word de `Arturo` no tome `Y Arturo`. En `loadClientProfileForChat` el exact match usa solo `entity_hint` conversacional.
* Dos o más tokens: se conserva evidencia canónica exacta (más largo primero) y fail-closed sin hit.
* `¿Qué sabemos de Y Arturo?` sigue la rama `sabemos` y resuelve `Y Arturo` si existe en catálogo.

## Riesgos

* Identidades canónicas de un solo token (`Y Arturo`) no se alcanzan con `¿Y Arturo?`; requieren forma explícita (`¿Qué sabemos de Y Arturo?`). Es el contrato de esta revisión.
* `extractEntityHint` aislado de `Y GRUPO MOVE` sigue devolviendo `GRUPO`. La corrección vive en candidatos + resolver. Un caller que ignore `entity_hint_candidates` puede repetir el recorte.
* `not_found` cuando no existe la fila canónica multi-token es más estricto que forzar el hint. Es el fail-closed pedido.

## Protocolo

* contratos consultados: `AGENTS.md`, `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`, auditoría leading-Y
* contratos `docs/director-ia/` no modificados
* `next_task_proposed`: no autorizado
* `secrets_check`: none
* `human_decision_needed`: merge a `main` (no autorizado aquí)

---

```text
IMPLEMENTATION_STATUS = DONE_PENDING_REVIEW
ROOT_CAUSE_CONTRACT_PRESERVED = YES
Y_GRUPO_MOVE_FIXED = YES
QUESTION_Y_GRUPO_MOVE_FIXED = YES
Y_ARTURO_REGRESSION_PRESERVED = YES
Y_ARTURO_COLLISION_PRECEDENCE_PRESERVED = YES
SABEMOS_Y_ARTURO_ACCESSIBLE = YES
SABEMOS_REGRESSION_PRESERVED = YES
HARDCODE_USED = NO
CANONICAL_EVIDENCE_USED = YES
AMBIGUOUS_CASE_FAIL_CLOSED = YES
COMPOUND_QUESTION_NULL_FIXED = NO
PLANT_SWITCH_FIXED = NO
HISTORICAL_RANGE_CHANGED = NO
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
TESTS = 1354_PASS_0_FAIL
GIT_DIFF_CHECK = CLEAN
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
```
