# AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001

DISJUNCTION_CLASSIFICATION:
A. MISSING_CONCEPT_ALTERNATIVE_MODEL

DISJUNCTION_FIRST_BAD_BOUNDARY:
`rowMatchesConcept` / `fieldHasQuerySequence`: `concept_query="bonos o bono"` se tokeniza como `[bonos, o, bono]` y exige esa secuencia contigua. No hay modelo ANY. `bono` tiene 4 letras: la morfología vocal+s vigente exige singular ≥5, así que no se resuelve relajando morfología.

BOUNDARY_CONNECTOR_CLASSIFICATION:
A. POST_FRAME_BOUNDARY_CONNECTOR_LEAK

BOUNDARY_FIRST_BAD_BOUNDARY:
`extractConceptQuery` + `stripRelationalFrame` en B. Tras retirar `agosto` queda `son de de bonos`. El frame `^(son|fueron|eran) de` consume un solo `de`. Sobran `de bonos`. `de` no es stopword global (correcto para `aceite de motor`).

SCOPE_PHRASE_CLASSIFICATION:
A. REDUNDANT_SCOPE_PHRASE_LEAK

SCOPE_FIRST_BAD_BOUNDARY:
`extractConceptQuery` tras el span de RANGE. En G, remainder=`que apoyos o inversiones fueron de mayan palace`. STRUCTURAL retira `que`/`apoyos` y deja `o inversiones fueron de mayan palace`. El frame ya no es prefijo. `inversiones` no es estructural. SUPPORT_FAMILIES ya incluye INVERSIONES: no hace falta facet de categoría.

EXISTING_COMPOSITION_HELPER_REUSABLE:
NO

SAFE_DISJUNCTION_STRATEGY:
`concept_mode: SINGLE | ANY`. Partir el span de concepto solo en ` o ` (espacio-o-espacio) en frases ya limpias. Cada alternativa reusa el matcher de secuencia vigente. No `\bo\b` sobre guion. No bag-of-words. No parser booleano. No relajar morfología. No hardcode de bono.

SAFE_BOUNDARY_STRATEGY:
Tras `stripRelationalFrame`, recortar un `de`/`con` inicial residual una vez. No añadir `de` a `STRUCTURAL_TOKENS`. El `de` medial de `aceite de motor` no se toca.

SAFE_SCOPE_PHRASE_STRATEGY:
Antes del concepto, retirar frases cerradas de sujeto: `apoyos o inversiones`, `apoyos o folios`, `folios o apoyos`. Scope sigue la regla vigente (`folios` → ALL_PUBLIC_FOLIOS; solo `apoyos` → SUPPORT_FAMILIES). No stopword global `inversiones`. No facet. No nuevo intent standalone de inversiones.

BONOS_OR_BONO_EXPECTED:
period_month=2026-08; scope=ALL_PUBLIC_FOLIOS; concept_mode=ANY; alternativas `bonos` | `bono`.

DE_BONOS_EXPECTED:
period_month=2026-08; scope=ALL_PUBLIC_FOLIOS; concept_query=bonos.

MAYAN_PALACE_EXPECTED:
period_mode=RANGE; 2026-01..2026-08; scope=SUPPORT_FAMILIES; concept_query=mayan palace. `inversiones` no entra al concepto.

O_RING_SAFE:
YES

ACEITE_DE_MOTOR_SAFE:
YES

RANGE_UNCHANGED:
YES

MORPHOLOGY_UNCHANGED:
YES

SCOPE_CONTRACT_UNCHANGED:
YES

ONE_FIX_CAN_HANDLE_COMPOSITION:
YES

FIX CONTRACT:
Un FIX en `lib/director-ia-folio-search.js`: (1) retirar frases cerradas de scope/sujeto antes del concepto; (2) recortar un conector de frontera residual post-frame; (3) si el concepto restante contiene ` o ` espacial, ANY de frases y match si alguna secuencia pega. No SQL. No RANGE. No morfología. No SUPPORT_FAMILIES. No `o`/`de`/`inversiones` globales. No parser booleano. No hardcode BONO/MAYAN. No intent nuevo de inversiones. Planner: G ya es `folio_search`; `investment_analysis` sigue ganando en `que inversiones` / listados de categoría — no reordenar.

FILES FUTUROS:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-compositional-query-grammar.test.js`
- no IGF SQL
- no planner salvo regresión demostrada
- no M6

A-M MATRIX:

| Caso | Actual | Esperado |
|---|---|---|
| A | SINGLE 2026-08 ALL; concept=`bonos o bono`; intent folio_search | ANY `bonos`\|`bono` |
| B | concept=`de bonos` | `bonos` |
| C | concept=`bonos` | igual (ya PASS) |
| D | concept=`bono` | `bono` (sin ampliar morfología a BONOS) |
| E | concept=`bonos o vales` | ANY `bonos`\|`vales` |
| F | concept=`aceite de motor o filtros de aire` | ANY `aceite de motor`\|`filtros de aire` |
| G | RANGE 2026-01..08 SUPPORT; concept=`o inversiones fueron de mayan palace` | `mayan palace`; scope SUPPORT_FAMILIES |
| H | RANGE SUPPORT; concept=`mayan palace` | igual (ya PASS) |
| I | RANGE ALL; concept=`mayan palace` | igual |
| J | RANGE SUPPORT; concept=`gas` | igual; gas≠gasolina |
| K | concept=`o-ring` | frase única; no partir O-RING |
| L | concept=`sello o-ring` | frase única; no SELLO OR RING |
| M | RANGE ALL; concept=`o fueron de impresora` | `impresora`; scope ALL_PUBLIC_FOLIOS |

Guardrails LIVE (no reabrir):

- NS impresora RANGE 2026-01..08 concept=impresora
- julio llantas SINGLE 2026-07
- aceite de motor secuencia
- gas token-safe

## Evidencia física

HEAD / base: `5184e98665b7a6993043fd0e7e518f558c7bc917`
now: `2026-09-07T12:00:00-06:00`
LIVE_DB: no
Product code: no modificado

### Disyunción

`tokenizeConcept` parte por `/[^a-z0-9]+/`. `o` es un token. `isControlledPluralPair("bono","bonos")` es false (`bono`.length=4 < 5).

### Boundary

Frame vigente: `/^(?:(?:fueron|son|eran)\s+de|relacionad[oa]s?\s+con)\s+/` — una sola vez, prefijo.

### Scope

`STRUCTURAL_TOKENS` incluye `apoyo(s)`/`folio(s)`, no `inversiones` ni `o`.
`resolveFolioSearchScope`: `folios?` gana ALL; si no, `apoyos?` → SUPPORT_FAMILIES.
G y M ya resuelven el scope correcto; el daño es solo el leak al concepto.

### Planner / colisión inversiones

`investment_analysis` (antes de `folio_search`) exige `inversiones` + (`pendient|folio|categoria|listad|hay|existen|estan` o `que inversiones`).
G no dispara esa ruta: intent observado `folio_search`.
Standalone `que inversiones` sigue siendo M6. No ampliar.

### Helpers

| Candidato | Por qué no |
|---|---|
| folio-search | un solo `concept_query` + secuencia |
| M6 `parsePartidaFilter` | keyword partida/concepto; SQL propio |
| Excel BONOS | catálogo; fuera de alcance |
| planner `investment_analysis` | otro intent |

O-RING: `normalizeQuestion` no sustituye `-`. K/L conservan `o-ring`. Split seguro = ` o `, no `\bo\b` ni `-`.

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001"
outcome: "DONE"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
range_reopened: false
morphology_reopened: false
scope_contract_changed: false
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - lib/director-ia-folio-search.js
  - lib/director-ia-planner.js
  - lib/director-ia-m6-gastos-inversiones.js
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No SQL. No merge. No deploy. No next task."
```
