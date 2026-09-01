# AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001

```yaml
task_id: AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001
mode: AUDIT_READ_ONLY_FIRST_DIVERGENCE
outcome: DONE
branch: audit/director-ia-compound-client-entity-extraction-001
head_sha: b0e6c8880166e63e7fec0e4b680ed0658378749d
origin_main_sha: b0e6c8880166e63e7fec0e4b680ed0658378749d
implementation_authorized: NO
merge_authorized: NO
source_code_changed: NO
test_code_changed: NO
golden_set_implemented: NO
probe_clock: "2026-09-01T10:00:00-06:00"
production_db_queried: NO
leading_y_impl_reopened: NO
historical_range_audit_reopened: NO
```

## 1. Executive result

No hay un único bug. Hay **dos clases primarias** demostradas, más un recorte secundario cuando aparece la palabra `cliente`.

**Clase 1 — B1–B4 (compound sin periodo):** el contrato semántico vigente **no** clasifica `Dame las compras/kg de X.` como `client_profile`. `namesMonthlyMetric` exige `mes`/`mensual` **y** métrica. Sin periodo explícito, `isClientProfileQuestion` = false → planner `unknown`. La extracción también es `null`, pero **no se llega** a client_profile. Primera frontera: reconocimiento semántico.

**Clase 2 — C1–C5, D1, E1 (compound + periodo):** `isClientProfileQuestion` = true, intent `client_profile` 0.88, periodo `explicit` enero→septiembre 2026. `extractEntityHint` = `null`. `extractLeadingYHintCandidates` = `null` (solo ancla `Y` al **inicio**). El loader recibe hint vacío → `needs_identity`. El resolver **sí** resuelve si se inyecta el hint completo.

**D2** es una variante de extracción: `cliente TORTILLERIA ERICK` captura **un token** (`TORTILLERIA`). El resolver fuerza esa identidad mutilada.

Leading-Y CLOSED **no participa** en el fallo compound. El parser `enero a la fecha` **no es causal**.

La hipótesis de trabajo se **confirma** (no se refuta): sin periodo falla el routing; con periodo el routing y el periodo son correctos y falla la identidad.

## 2. Repository / base evidence

```text
branch = audit/director-ia-compound-client-entity-extraction-001
HEAD   = b0e6c8880166e63e7fec0e4b680ed0658378749d
origin/main = b0e6c8880166e63e7fec0e4b680ed0658378749d
working_tree_inicial = M docs/dev-loop/CURRENT_TASK.md
```

`IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001` está CLOSED e integrada en este SHA. No se reabre.

Contratos leídos: `AGENTS.md`, `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`, Constitución (índice de autoridad), Architecture Index (índice; no redefine), auditorías/IMPL leading-Y.

## 3. Probe matrix

Reloj `2026-09-01`. Primer turno, sin historial. Funciones no exportadas (`hasNamedClientToken`, `namesMonthlyMetric`, `hasExplicitClientAnchor`): `NOT_DIRECTLY_PROBED`; se citan solo como lectura de source.

### Grupo A — baseline leading-Y / sabemos

| ID | INPUT | isCPQ | intent | hint | leadingY | period_source | clase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | `¿Qué sabemos de Y GRUPO MOVE?` | true | client_profile 0.88 | `Y GRUPO MOVE` | null | default 07–09 | NO_DIVERGENCE |
| A2 | `Y GRUPO MOVE` | false | unknown 0.35 | extract=`GRUPO`; candidates=`Y GRUPO MOVE`,`GRUPO`; `leading_y_requires_canonical=true` | parsed | default | NO_DIVERGENCE (contrato leading-Y) |
| A3 | `¿Y Arturo?` | false | unknown 0.35 | `Arturo`; candidates `Y Arturo`,`Arturo`; requires_canonical=false | parsed | default | NO_DIVERGENCE (follow-up) |

### Grupo B — compound sin periodo

| ID | INPUT | isCPQ | intent | extractEntityHint | leadingY | clase |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | `Dame las compras de Y GRUPO MOVE.` | false | unknown | null | null | CURRENT_CONTRACT_DOES_NOT_CLASSIFY_AS_CLIENT_PROFILE |
| B2 | `Dame los kg comprados de Y GRUPO MOVE.` | false | unknown | null | null | igual |
| B3 | `Dame las compras de TORTILLERIA ERICK.` | false | unknown | null | null | igual |
| B4 | `Dame los kg comprados de TORTILLERIA ERICK.` | false | unknown | null | null | igual |

Y y no-Y se comportan **igual**. No es específico de `Y`.

`inherit=false`, `entity_hint_candidates=[]`, `unknown_needs_clarification=true`. Slots: `period_source=default` (no hay periodo explícito; no es fallo del parser histórico).

### Grupo C — compound + periodo

| ID | isCPQ | intent | hint | candidates | period | query | clase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 Y compras enero→fecha | true | client_profile 0.88 | null | [] | explicit 01–09 | 2026-01-01..09-30 | ENTITY_EXTRACTION_DIVERGENCE |
| C2 Y kg enero→fecha | true | client_profile | null | [] | explicit 01–09 | igual | igual |
| C3 Y kg+descuento por mes | true | client_profile | null | [] | explicit 01–09 | igual | igual |
| C4 Erick compras | true | client_profile | null | [] | explicit 01–09 | igual | igual |
| C5 Erick kg+descuento | true | client_profile | null | [] | explicit 01–09 | igual | igual |

`PERIOD_PARSER_CAUSAL = NO` en C1–C5.

### Grupo D — anchor `cliente`

| ID | isCPQ | intent | extractEntityHint | period | clase |
| --- | --- | --- | --- | --- | --- |
| D1 `…del cliente Y GRUPO MOVE desde enero…` | true | client_profile | **null** | explicit 01–09 | ENTITY_EXTRACTION_DIVERGENCE |
| D2 `…del cliente TORTILLERIA ERICK desde enero…` | true | client_profile | **TORTILLERIA** | explicit 01–09 | ENTITY_EXTRACTION_DIVERGENCE (recorte un token) |

`cliente` **no** produce identidad íntegra. En D2 habilita `clienteNamed` de un token. En D1 `Y` no entra al grupo (`[A-Z…][\w…]+` exige ≥2 caracteres).

### Grupo E — multi-token no-Y

| ID | isCPQ | intent | hint | period | clase |
| --- | --- | --- | --- | --- | --- |
| E1 `…de GRUPO MOVE EMPRESARIAL desde enero…` | true | client_profile | null | explicit 01–09 | ENTITY_EXTRACTION_DIVERGENCE |

El fallo de identidad embebida es **genérico**, no específico de leading-Y.

## 4. Physical call chain

```text
rawQuestion
  → isClientProfileQuestion          lib/director-ia-client-profile.js
       namesMonthlyMetric = (mes|mensual) AND (compr|kg|descuento|…)
       OR parseExplicitPeriod.months + hasNamedClientToken / hasExplicitClientAnchor
       OR namesProfileContext (sabemos, …)
  → detectDirectorIaIntent           lib/director-ia-planner.js:439
       if isClientProfileQuestion → client_profile
  → resolveConversationTurn          lib/director-ia-conversation-state.js
       classifyTurnKind
       extractEntityHint             (patrones: yMatch inicio, sabemos, cliente + 1 token, …)
       extractLeadingYHintCandidates (solo ^¿? Y/y)
       entity_hint / candidates
  → director-ia-chat.js client_profile
       entity_hint: continuityTurn.entity_hint || active.display
       entity_hint_candidates: continuityTurn.entity_hint_candidates
  → loadClientProfileForChat
       exactNorm(hint) vs cliente_norm
       sin hint y sin inherit → needs_identity
```

`hasNamedClientToken` / `namesMonthlyMetric` / `hasExplicitClientAnchor`: `NOT_DIRECTLY_PROBED` (no exportados). Lectura de source.

## 5. First divergence por probe

```text
A1 NO_DIVERGENCE
A2 NO_DIVERGENCE (leading-Y CLOSED)
A3 NO_DIVERGENCE
B1–B4 CURRENT_CONTRACT_DOES_NOT_CLASSIFY_AS_CLIENT_PROFILE
     FIRST = isClientProfileQuestion → false
     (planner solo reexpone ese false)
C1–C5 ENTITY_EXTRACTION_DIVERGENCE
     FIRST = extractEntityHint → null
     (semantic/planner/period intactos)
D1 ENTITY_EXTRACTION_DIVERGENCE
     FIRST = extractEntityHint → null (anchor no extrae)
D2 ENTITY_EXTRACTION_DIVERGENCE
     FIRST = extractEntityHint clienteNamed un token → TORTILLERIA
E1 ENTITY_EXTRACTION_DIVERGENCE
     FIRST = extractEntityHint → null
```

No hay `CANDIDATE_TRANSPORT_DIVERGENCE`: no hay candidatos que transportar.
No hay `CANONICAL_RESOLUTION_DIVERGENCE` como first point.

## 6. Root-cause classes

1. **SEMANTIC / contrato de `isClientProfileQuestion`:** métrica sin `mes`/`mensual` y sin periodo explícito no es `client_profile`.
2. **ENTITY_EXTRACTION:** no existe extractor de nombre embebido tipo `de <NOMBRE>`. `hasNamedClientToken` solo enciende routing, no construye hint.
3. **`clienteNamed` un token (D2):** si hay `cliente` + nombre ≥2 letras, se corta al primer token.

## 7. Planner vs extractor

| Grupo | isClientProfileQuestion | detectDirectorIaIntent | extractEntityHint |
| --- | --- | --- | --- |
| B1–B4 | false | unknown | null |
| C1–C5 | true | client_profile | null |
| D1 | true | client_profile | null |
| D2 | true | client_profile | TORTILLERIA |
| E1 | true | client_profile | null |

**CASO 1** (B): intent ≠ client_profile **antes** de extracción útil.

**CASO 2** (C, D1, E1): intent = client_profile, period correcto, hint null.

`MULTIPLE_DIVERGENCE_CLASSES = YES`

El planner no tiene otra regla de compras/kg de cliente; solo llama a `isClientProfileQuestion`. No colapsar ambos en “el extractor falla”.

## 8. Period control

C1–C5, D1–D2, E1: `period_source=explicit`, `requested_range=2026-01..2026-09`, `query_start=2026-01-01`, `query_end=2026-09-30`.

`PERIOD_PARSER_CAUSAL = NO`

No se reabre la auditoría de rangos históricos.

## 9. Leading-Y interaction

`extractLeadingYHintCandidates` usa `LEADING_Y_REST_RE = /^\s*¿?\s*[yY]\s+(.+)$/`.

Solo si el raw **empieza** por `Y`/`y` (con `¿` opcional).

En `Dame … de Y GRUPO MOVE…`: no hay match. `entity_hint_candidates=[]`, `leading_y_requires_canonical=false`.

La implementación CLOSED no causa el fallo compound. `LEADING_Y_CANDIDATE_PATH_CAUSAL = NO`.

A2/A3 confirman el contrato aprobado intacto.

## 10. Canonical resolver control

Inyección read-only (sin DB):

| Hint inyectado | Pregunta compound | Resultado |
| --- | --- | --- |
| null | C1 | `needs_identity` / `cliente_key es obligatorio` |
| `Y GRUPO MOVE` | C1 | identity `Y GRUPO MOVE` |
| `TORTILLERIA ERICK` | C4 | identity `TORTILLERIA ERICK` |
| `GRUPO MOVE EMPRESARIAL` | E1 | identity `GRUPO MOVE EMPRESARIAL` |
| `TORTILLERIA` (D2 extract) | D2 | identity forzada `TORTILLERIA` (0 hits exactos) |

`CANONICAL_RESOLUTION_WITH_FULL_HINT = YES`  
`CANONICAL_RESOLVER_CAUSAL = NO` (first divergence)

## 11. Existing test coverage

Cubierto:

- `¿Qué sabemos de …?`, leading-Y, `¿Y Arturo?`
- Periodo `enero a la fecha` en slots (`test/director-ia-client-profile.test.js` acceptance Erick)

No cubierto:

- `Dame las compras de X.`
- extracción de nombre embebido en compound
- D1/D2 `cliente` + nombre multi-token

El test `Dame los kg y el descuento por cada mes de Erick desde enero a la fecha` afirma intent `client_profile` y periodo explícito, e **inyecta** `cliente_norm=ERICK`. Codifica periodo+intent como correctos y **omite** first-turn extraction. Un primer turno real de esa forma quedaría sin hint.

`GOLDEN_SET_IMPLEMENTED = NO`

## 12. Git history

No se atribuye commit introductor. El extractor mid-sentence nunca existió en las ramas de `extractEntityHint` actuales.

`INTRODUCING_COMMIT = NOT_PROVEN`

## 13. Secondary findings OUT_OF_SCOPE

- `plant_switch` / `Ahora dime lo mismo…` / `inherit=false`: no auditados.
- Render SHA / Exit 137 / PG pool: no tocados.
- D2 recorte `TORTILLERIA`: hallazgo residual de `clienteNamed`; no se corrige.
- Isolated A2 sigue siendo `unknown` en primer turno (contrato leading-Y, no compound).

## 14. Implementation assessment

Fronteras que una tarea futura (G1 aparte) tendría que tratar **por separado**:

1. Contrato semántico de `isClientProfileQuestion` / `namesMonthlyMetric` para métrica+cliente sin `mes` y sin periodo.
2. Extracción de identidad embebida (hoy `hasNamedClientToken` no produce hint).
3. `clienteNamed` de un token si se toca el anchor `cliente`.

No se diseña el fix. Leading-Y CLOSED no debe revertirse.

## 15. Final closure fields

```text
AUDIT_STATUS = DONE_PENDING_REVIEW
BASE_MAIN_SHA = b0e6c8880166e63e7fec0e4b680ed0658378749d
PRIMARY_COMPOUND_INCIDENT_REPRODUCED = YES
COMPOUND_NO_PERIOD_Y_BEHAVIOR = UNKNOWN_INTENT_HINT_NULL
COMPOUND_NO_PERIOD_NON_Y_BEHAVIOR = UNKNOWN_INTENT_HINT_NULL
COMPOUND_EXPLICIT_PERIOD_Y_BEHAVIOR = CLIENT_PROFILE_PERIOD_OK_HINT_NULL
COMPOUND_EXPLICIT_PERIOD_NON_Y_BEHAVIOR = CLIENT_PROFILE_PERIOD_OK_HINT_NULL
EXPLICIT_CLIENT_ANCHOR_EFFECT = ROUTING_UNCHANGED_EXTRACT_NULL_OR_ONE_TOKEN
MULTITOKEN_NON_Y_CONTROL = SAME_AS_Y_EMBEDDED_HINT_NULL
PRIMARY_FIRST_DIVERGENCE_POINT = NOT_SINGLE
FIRST_DIVERGENCE_BY_PROBE = B=SEMANTIC_CONTRACT; C/D1/E1=extractEntityHint_null; D2=clienteNamed_one_token
ROOT_CAUSE_CLASSES = SEMANTIC_ROUTING_CONTRACT; ENTITY_EXTRACTION_ABSENT_MID_SENTENCE; CLIENTE_NAMED_ONE_TOKEN
MULTIPLE_DIVERGENCE_CLASSES = YES
IS_CLIENT_PROFILE_QUESTION_CAUSAL = YES_FOR_NO_PERIOD; NO_FOR_EXPLICIT_PERIOD
PLANNER_CAUSAL = PASSTHROUGH_ONLY
ENTITY_EXTRACTION_CAUSAL = YES_FOR_CLIENT_PROFILE_COMPOUND
LEADING_Y_CANDIDATE_PATH_CAUSAL = NO
CANDIDATE_TRANSPORT_CAUSAL = NO
CANONICAL_RESOLVER_CAUSAL = NO
CANONICAL_RESOLUTION_WITH_FULL_HINT = YES
PERIOD_PARSER_CAUSAL = NO
CURRENT_TEST_COVERAGE = SABEMOS_AND_LEADING_Y_AND_PERIOD_SLOTS; NO_COMPOUND_EXTRACTION
INTRODUCING_COMMIT = NOT_PROVEN
GOLDEN_SET_IMPLEMENTED = NO
SOURCE_CODE_CHANGED = NO
TEST_CODE_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
MERGE_AUTHORIZED = NO
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
OUT_OF_SCOPE_FINDINGS = plant_switch; inherit_false; render_137; D2_one_token_residual
```
