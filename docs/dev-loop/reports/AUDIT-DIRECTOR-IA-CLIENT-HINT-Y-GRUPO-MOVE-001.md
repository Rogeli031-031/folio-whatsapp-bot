# AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001

```yaml
task_id: AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001
mode: AUDIT_READ_ONLY_FIRST_DIVERGENCE
outcome: DONE
branch: audit/director-ia-client-hint-y-grupo-move-001
head_sha: b65b42d11d5a2e94d0d5206354a10eb2c9c54c4f
origin_main_sha: b65b42d11d5a2e94d0d5206354a10eb2c9c54c4f
implementation_authorized: NO
docs_director_ia_changed: NO
code_changed: NO
tests_changed: NO
golden_set_implemented: NO
git_add: NO
commit: NO
push: NO
merge: NO
deploy: NO
probe_clock: "2026-09-01T10:00:00-06:00"
physical_probe: "node sobre extractEntityHint / classifyTurnKind / detectDirectorIaIntent / isClientProfileQuestion / parseExplicitPeriod / resolveConversationTurn / resolveUniqueEntity / exactNorm / loadClientProfileForChat (inyección de filas, sin DB de producción)"
production_db_queried: NO
render_sha_equivalence: NOT_PROVEN
```

## A. Executive result

En el código vigente de `HEAD` = `origin/main` (`b65b42d1`) el recorte `Y GRUPO MOVE` → `GRUPO` **sí se reproduce**, pero **solo** cuando el texto crudo hace match de la rama `yMatch` de `extractEntityHint`: el enunciado empieza por espacios opcionales, `¿` opcional, y luego `Y`/`y` + espacio + un token capitalizado.

La primera transformación demostrable es:

```text
INPUT  = "Y GRUPO MOVE"
FUNCTION = extractEntityHint  (lib/director-ia-conversation-state.js)
TRANSFORM = raw.match(/^\s*¿?\s*[yY]\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’-]+)/)
OUTPUT = "GRUPO"
IDENTITY_INTACT = NO
```

`MOVE` no entra al grupo de captura: el patrón admite **un solo token**. `Y` dispara esa rama (marcador conversacional de arranque); no es un filtro que borre `MOVE`.

La pregunta `¿Qué sabemos de Y GRUPO MOVE?` **no** reproduce `GRUPO`: `yMatch` no aplica y la rama `sabemos` devuelve `Y GRUPO MOVE` íntegro. El resolver canónico de `client_profile` (`exactNorm` igualdad exacta en `loadClientProfileForChat`) no es el primer punto: cuando el incidente se reproduce ya recibe `GRUPO`.

No se implementó corrección. No se añadió golden test.

---

## B. Repository evidence

Registrado al inicio de la ejecución:

```text
git branch --show-current
audit/director-ia-client-hint-y-grupo-move-001

git rev-parse HEAD
b65b42d11d5a2e94d0d5206354a10eb2c9c54c4f

git rev-parse origin/main
b65b42d11d5a2e94d0d5206354a10eb2c9c54c4f

git status --short
 M docs/dev-loop/CURRENT_TASK.md
```

`HEAD` y `origin/main` son el mismo SHA. El working tree no estaba limpio: solo difería `CURRENT_TASK.md` (autorización de esta auditoría frente a `main` CLOSED de otra tarea). No se tocó código de runtime.

---

## C. Production observation inherited

Hallazgo residual heredado (auditoría de rangos históricos, ya CLOSED; no reescrito):

```text
«¿Y GRUPO MOVE desde enero?» → extractEntityHint = «GRUPO»
```

Esa observación **no** se reejecutó contra Render. Equivale a un relato + evidencia de código previa. Esta auditoría la trata como hipótesis a reproducir en el repositorio actual.

`RENDER_SHA_EQUIVALENCE = NOT_PROVEN`

---

## D. Physical call chain

Nombres reales, primer turno, sin historial:

```text
rawQuestion
  → detectDirectorIaIntent                 lib/director-ia-planner.js
  → isClientProfileQuestion                lib/director-ia-client-profile.js
  → resolveConversationTurn                lib/director-ia-conversation-state.js
       → classifyTurnKind                  (no emite hint)
       → extractEntityHint                 (única función que materializa entity_hint)
       → entity_hint = currentHint
  → director-ia-chat.js
       entity_hint: continuityTurn.entity_hint || active.display
  → loadClientProfileForChat               lib/director-ia-client-profile.js
       → exactNorm(entity_hint) === exactNorm(cliente_norm)
       → si 0 hits: identity.cliente_norm = currentHintEarly
  → resolveUniqueEntity                    lib/director-ia-conversation-state.js
       (ruta de continuidad / unique entity; no es el matcher de client_profile)
```

`hasNamedClientToken` (misma unidad, no exportada) solo decide routing de `isClientProfileQuestion`. No construye `entity_hint`.

`parseExplicitPeriod` / `resolveClientProfileSlots` construyen meses. No tocan el nombre.

---

## E. Probe matrix

Sonda read-only, reloj `2026-09-01T10:00:00-06:00`, `plantaId=1`, sin historial, sin `echoedState`.

### E.1 Sondas obligatorias

#### `¿Qué sabemos de Y GRUPO MOVE?`

| Frontera | Función real | Entrada | Salida | IDENTITY_INTACT |
| --- | --- | --- | --- | --- |
| raw text | (entrada de usuario) | `¿Qué sabemos de Y GRUPO MOVE?` | mismo string | YES |
| yMatch aislado | `String.prototype.match` + regex de `extractEntityHint` | mismo | `null` | YES |
| sabemos aislado | regex `sabemos(?:\s+comercialmente)?\s+de\s+(.+?)(?:\s*[?¿!.]*)$` | mismo | `Y GRUPO MOVE` | YES |
| extraction | `extractEntityHint` | mismo | `Y GRUPO MOVE` | YES |
| routing | `classifyTurnKind` | mismo | `other` | YES |
| planner | `detectDirectorIaIntent` / `isClientProfileQuestion` | mismo | `client_profile` / `true` | YES |
| slots/hint | `resolveConversationTurn` | mismo | `entity_hint=Y GRUPO MOVE` | YES |
| canonical | `loadClientProfileForChat` + hint inyectado `Y GRUPO MOVE` + fila ARR `Y GRUPO MOVE` | hint íntegro | `identity.cliente_norm=Y GRUPO MOVE` | YES |

Este caso **no** produce `GRUPO`.

#### `Y GRUPO MOVE` (extracción más baja)

| Frontera | Función real | Entrada | Salida | IDENTITY_INTACT |
| --- | --- | --- | --- | --- |
| raw text | (entrada de usuario) | `Y GRUPO MOVE` | mismo string | YES |
| planner | `detectDirectorIaIntent` | mismo | `unknown` (0.35) | YES (no altera el texto) |
| routing | `classifyTurnKind` | mismo | `entity_intro` | YES (no emite hint) |
| yMatch aislado | regex citada | mismo | full=`Y GRUPO` group1=`GRUPO` | **NO** |
| extraction | `extractEntityHint` | mismo | `GRUPO` | **NO** |
| slots/hint | `resolveConversationTurn` | `currentHint` ya mutilado | `entity_hint=GRUPO`, `unknown_needs_clarification=true` | **NO** |
| canonical | `loadClientProfileForChat` | `entity_hint=GRUPO` | `identity.cliente_norm=GRUPO` (0 hits exactos) | **NO** |

**Primera fila YES→NO:** `extractEntityHint` / `yMatch`.

#### `Dame las compras de Y GRUPO MOVE.`

| Frontera | Función real | Entrada | Salida | IDENTITY_INTACT |
| --- | --- | --- | --- | --- |
| raw text | (entrada) | `Dame las compras de Y GRUPO MOVE.` | mismo | YES |
| yMatch | regex | mismo | `null` (no empieza por `Y`) | YES |
| extraction | `extractEntityHint` | mismo | `null` | **NO** (pérdida total, no recorte a `GRUPO`) |
| planner | `detectDirectorIaIntent` | mismo | `unknown` | n/a |
| `isClientProfileQuestion` | misma | mismo | `false` (`namesMonthlyMetric` exige `mes`/`mensual`) | n/a |
| hint | `resolveConversationTurn` | mismo | `entity_hint=null` | **NO** |
| canonical | `loadClientProfileForChat` hint `null` | — | `needs_identity=true` / `cliente_key es obligatorio` | **NO** |

**No reproduce `GRUPO`.** Distinta falla de extracción.

#### `Dame los kg comprados de Y GRUPO MOVE.`

Misma frontera que la anterior: `extractEntityHint=null`, intent `unknown`, `entity_hint=null`. **No reproduce `GRUPO`.**

#### `Dame las compras de Y GRUPO MOVE desde enero a la fecha.`

| Frontera | Función real | Entrada | Salida | IDENTITY_INTACT |
| --- | --- | --- | --- | --- |
| raw text | (entrada) | frase completa | mismo | YES |
| period | `parseExplicitPeriod` | mismo | `2026-01` … `2026-09`, `error=null` | YES (periodo; no es identidad) |
| slots | `resolveClientProfileSlots` | mismo | `period_source=explicit`, `requested_range=2026-01..2026-09` | YES (periodo) |
| extraction | `extractEntityHint` | mismo | `null` | **NO** (otra vez pérdida total) |
| planner | `detectDirectorIaIntent` | mismo | `client_profile` (periodo + `hasNamedClientToken`) | n/a |
| hint | `resolveConversationTurn` | mismo | `entity_hint=null` | **NO** |

El parser temporal **no** mutila el cliente. El periodo se construye. El nombre no entra a `entity_hint` porque ninguna rama de `extractEntityHint` aplica.

### E.2 Controles del mecanismo

| Entrada | `yMatch` group1 | `extractEntityHint` | Lectura |
| --- | --- | --- | --- |
| `¿Y GRUPO MOVE desde enero?` | `GRUPO` | `GRUPO` | Reproduce el residual histórico. Periodo enero→sep **independiente**. |
| `¿Y GRUPO MOVE?` | `GRUPO` | `GRUPO` | Mismo recorte. |
| `y GRUPO MOVE` | `GRUPO` | `GRUPO` | Case de `Y` irrelevante (`[yY]`). |
| `Y GRUPO MOVE EMPRESARIAL` | `GRUPO` | `GRUPO` | El recorte no depende de que el nombre tenga 3 tokens. |
| `Y ACME SUR` | `ACME` | `ACME` | Regla genérica de un token. No es especial de MOVE. |
| `Y MOVE` | `MOVE` | `MOVE` | Si `MOVE` es el primer token post-`Y`, se conserva. |
| `Y GRUPO` | `GRUPO` | `GRUPO` | Sin `MOVE` de origen, la salida es la misma. |
| `GRUPO MOVE` | `null` | `null` | Sin `Y` inicial no hay recorte a `GRUPO`; tampoco hay extracción. |
| `X GRUPO MOVE` | `null` | `null` | Sustituir `Y` por `X` apaga `yMatch`. |
| `¿Qué sabemos de GRUPO MOVE EMPRESARIAL?` | `null` | `GRUPO MOVE EMPRESARIAL` | Control intacto de la rama `sabemos`. |
| `¿Qué sabemos de Y ACME SUR?` | `null` | `Y ACME SUR` | `Y` **dentro** de `sabemos de …` se conserva. |
| `¿Y Arturo?` | `Arturo` | `Arturo` | Contrato actual de follow-up de un token. |

### E.3 Filtros de token (no son la causa de `MOVE`)

| Token | `isNonIdentityToken` | `isPronounToken` |
| --- | --- | --- |
| `Y` | false | false |
| `GRUPO` | false | false |
| `MOVE` | false | false |
| `Arturo` | false | false |
| `eso` | true | false |

`GRUPO` no está en `NON_IDENTITY_TOKENS` ni en `PRONOUN_TOKENS`. Tras capturar `GRUPO`, `extractEntityHint` **retorna**. `MOVE` nunca se evalúa.

---

## F. First divergence

```text
FIRST_DIVERGENCE_POINT =
lib/director-ia-conversation-state.js
→ extractEntityHint
→ raw.match(/^\s*¿?\s*[yY]\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.'’-]+)/)
   + return temprano de yMatch[1]
```

Caller → función divergente → consumidor:

```text
resolveConversationTurn
  → extractEntityHint(question)     // currentHint
  → entity_hint = currentHint
  → director-ia-chat.js  continuityTurn.entity_hint
  → loadClientProfileForChat({ entity_hint })
```

Cadena mínima demostrada:

```text
"Y GRUPO MOVE"
        ↓
raw text / detectDirectorIaIntent / classifyTurnKind: todavía correcto (el string no se reescribe)
        ↓
extractEntityHint / yMatch: captura un token
        ↓
"GRUPO"
```

`classifyTurnKind` también mira el primer token post-`Y` para decidir `entity_intro`, pero **no escribe** `entity_hint`. No es el primer punto de divergencia de la identidad.

---

## G. Root cause

Mecanismo, no síntoma:

1. `extractEntityHint` trata un enunciado que **empieza** por `Y`/`y` (con `¿` opcional) como follow-up conversacional del tipo `¿Y Arturo?`.
2. El grupo 1 de `yMatch` es un único token capitalizado. El espacio termina la captura.
3. Sobre `Y GRUPO MOVE`, ese token es `GRUPO`.
4. `GRUPO` pasa `isNonIdentityToken` / `isPronounToken` y se retorna.
5. Las ramas posteriores (`sabemos`, `pasó con`, `cliente X`, …) no se evalúan.
6. `MOVE` queda fuera del grupo. No hay stopword ni normalizador que lo borre.

`Y` es **disparador de rama**, no operador que elimine `MOVE`.

---

## H. Downstream behavior

Cuando `yMatch` ya devolvió `GRUPO`:

- `resolveConversationTurn.entity_hint` = `GRUPO` (copia, no recorta más).
- Primer turno aislado `Y GRUPO MOVE`: intent `unknown`, `unknown_needs_clarification=true`. Puede ni entrar a `loadClientProfileForChat`.
- `¿Y GRUPO MOVE desde enero?`: intent `client_profile`, hint ya `GRUPO`, periodo explícito enero→fecha. El loader recibe el hint mutilado.
- `loadClientProfileForChat`: `exactNorm("grupo")` no iguala `grupo move empresarial` ni `y grupo move`. 0 hits → **fuerza** `identity.cliente_norm = "GRUPO"`.
- `resolveUniqueEntity("GRUPO", [GRUPO MOVE EMPRESARIAL, GRUPO ALFA, Y GRUPO MOVE])` = `ambiguous` (match de palabra completa de un solo token). Ruta distinta; no es el matcher de `client_profile`.

Preguntas compuestas sin `Y` inicial: `entity_hint=null`. El executor de perfil no recibe identidad. Eso **no** es el recorte a `GRUPO`.

---

## I. Canonical resolver control

Matcher de `client_profile` (`loadClientProfileForChat`, filas inyectadas; sin DB de producción):

| Hint inyectado | ¿Match exacto en catálogo inyectado? | Identidad resultante |
| --- | --- | --- |
| `Y GRUPO MOVE` | sí, fila `Y GRUPO MOVE` | `Y GRUPO MOVE` / Casa |
| `GRUPO MOVE EMPRESARIAL` | sí, fila `GRUPO MOVE EMPRESARIAL` | `GRUPO MOVE EMPRESARIAL` / Comisionista |
| `GRUPO` | no | forzada a `GRUPO` |
| `null` | n/a | `needs_identity=true` |

`exactNorm`:

```text
"y grupo move" !== "grupo"
"y grupo move" !== "grupo move"
"y grupo move" !== "grupo move empresarial"
```

Conclusión: con identidad completa el matcher exacto **puede** resolver si el catálogo tiene esa norma. El incidente `GRUPO` ocurre **antes**. No se atribuye al resolver.

Existencia de `Y GRUPO MOVE` en ARR de producción: **NOT_PROVEN** (no se consultó DB).

---

## J. Test coverage

`Y GRUPO MOVE` **no** aparece en `test/`.

Cobertura estructural actual:

- `test/director-ia-natural-followup.test.js` y `test/director-ia-conversational-continuity.test.js` fijan `extractEntityHint("¿Y Arturo?") === "Arturo"`. Eso **codifica** el recorte a un token tras `Y` como comportamiento correcto.
- Los mismos tests exigen que `¿Y eso?` / `¿Y él?` no inventen cliente (`isNonIdentityToken` / `isPronounToken`).
- `test/director-ia-client-profile.test.js` usa `GRUPO MOVE EMPRESARIAL` por la rama `sabemos de` / hint completo. No cubre `Y` inicial ni el recorte a `GRUPO`.
- `test/director-ia-persistent-memory.test.js`: `¿Qué pasó con Arturo?` (otra rama).

Un test existente **permitiría** el hint mutilado: cualquier `¿Y <TOKEN> …?` de más de un token capitalizado pasaría si solo se aserta el primer token.

`GOLDEN_SET_IMPLEMENTED = NO` (no se agregó el caso).

---

## K. Secondary findings

Marcados `OUT_OF_SCOPE`. No se corrigieron.

1. `Dame las compras de Y GRUPO MOVE.` / `Dame los kg…` / `Dame las compras … desde enero a la fecha.`: `extractEntityHint` = `null`. Pérdida total de identidad, no recorte a `GRUPO`. `namesMonthlyMetric` exige `mes`/`mensual`; sin periodo la frase de compras no entra a `client_profile`.
2. `Ahora dime lo mismo…` → `plant_switch`: no auditado a fondo. Sigue fuera.
3. `parseExplicitPeriod("…desde enero a la fecha")` construye enero→septiembre 2026 en esta sonda. No es causa de la mutilación del cliente. No se reabre el incidente histórico de rango.
4. `resolveUniqueEntity` con hint de un token hace match de palabra completa y puede quedar `ambiguous` entre varios `GRUPO*`. Solo aplica si esa ruta se usa **después** del hint ya recortado.
5. Equivalencia SHA Render vs `b65b42d1`: no reintentada.

---

## L. Implementation assessment

Frontera que una tarea futura (G1 humano independiente) tendría que revisar:

`lib/director-ia-conversation-state.js` → `extractEntityHint` → rama `yMatch` de un token, y su contrato de tests `¿Y Arturo?`.

No se diseña el fix. No se propone hardcode de `Y GRUPO MOVE`. No se abre rama de implementación.

Historia Git (procedencia, no autoría causal de negocio):

```text
INTRODUCING_COMMIT (patrón yMatch vigente, git blame L692) =
3be98560a34b762b7fad2a7f6d2a5ac672476223
feat(director-ia): support natural conversational followups
```

El `if (yMatch) return` inmediato está en `92b706945` (día anterior). La captura de un token en el regex actual está en `3be98560a`.

---

## Contratos / protocolo

- Contratos consultados: `AGENTS.md`, `docs/dev-loop/LOOP_PROTOCOL.md`, `docs/dev-loop/CURRENT_TASK.md`. No se reabrió `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md`.
- Contratos `docs/director-ia/` no modificados.
- Desvíos respecto a `CURRENT_TASK`: ninguno de implementación. El informe es el único artefacto de código/docs de runtime; `CURRENT_TASK.md` solo cambia de estado al cierre.
- `next_task_proposed`: no autorizado. Una implementación futura, si el humano la abre, tendría que acotar la rama `yMatch` sin hardcodear este cliente.
- `secrets_check`: sin secretos.
- `human_decision_needed`: revisión de este informe; autorización G1 aparte si se implementa.

---

## Campos de cierre

```text
AUDIT_STATUS = DONE_PENDING_REVIEW
INCIDENT_REPRODUCED = YES
CURRENT_MAIN_CODE_BEHAVIOR = REPRODUCED_WHEN_LEADING_Y_YMATCH; NOT_REPRODUCED_FOR_SABEMOS_QUESTION
FIRST_DIVERGENCE_POINT = lib/director-ia-conversation-state.js → extractEntityHint → yMatch one-token capture + early return
ROOT_CAUSE = yMatch treats leading Y/y as conversational follow-up and captures a single capitalized token; MOVE never enters the capture group
CLIENT_NAME_RAW_PRESERVED = YES
CLIENT_NAME_EXTRACTION_PRESERVED = NO_WHEN_YMATCH; YES_WHEN_SABEMOS
CLIENT_HINT_PRESERVED = NO_WHEN_YMATCH; YES_WHEN_SABEMOS
CANONICAL_RESOLVER_RECEIVES_FULL_IDENTITY = NO_WHEN_YMATCH; YES_WHEN_SABEMOS
CANONICAL_RESOLUTION_WITH_FULL_IDENTITY = YES_ON_EXACT_NORM_CATALOG_HIT
TOKEN_Y_CAUSAL = TRIGGER_ONLY
TOKEN_MOVE_LOSS_EXPLAINED = YES
SECOND_DIVERGENCE_FOUND = NO_FURTHER_TOKEN_CUT
CURRENT_TEST_COVERAGE = NO_CASE_Y_GRUPO_MOVE; ONE_TOKEN_Y_FOLLOWUP_ENCODED_AS_CORRECT
GOLDEN_SET_IMPLEMENTED = NO
IMPLEMENTATION_AUTHORIZED = NO
CURRENT_TASK_CHANGED = YES_STATUS_ONLY
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
OUT_OF_SCOPE_FINDINGS = compound_questions_extract_null; plant_switch_untouched; historical_range_not_reopened
INTRODUCING_COMMIT = 3be98560a34b762b7fad2a7f6d2a5ac672476223
```
