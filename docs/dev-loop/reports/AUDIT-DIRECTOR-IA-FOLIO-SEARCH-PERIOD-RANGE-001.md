# AUDIT-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001

RANGE_CLASSIFICATION:
SINGLE_MONTH_PERIOD_MODEL

RANGE_FIRST_BAD_BOUNDARY:
`extractPeriodMonth` (`lib/director-ia-folio-search.js`): un solo `YYYY-MM`. El mes es el primer nombre presente en el orden de `MONTHS_ES`, no el primer extremo de la frase. El año es el primer `\b(20\d{2})\b` de la cadena, no el año del extremo elegido. No existe span `de X a Y` / `desde X hasta Y` / `X-Y`.

CONCEPT_RANGE_CLASSIFICATION:
RANGE_CONNECTOR_LEAKS_INTO_CONCEPT

CONCEPT_FIRST_BAD_BOUNDARY:
`extractConceptQuery` borra cada nombre de mes por separado. Quedan `a`, `desde`, `hasta` o `-` delante del frame. `stripRelationalFrame` exige prefijo `^(fueron|son|eran) de` o `relacionad[oa]s? con` y ya no aplica. El North Star termina en `concept_query="a fueron de impresora"`. Añadir `"a"` a `STRUCTURAL_TOKENS` no es el arreglo: no cubre `desde`/`hasta`/`-`, y el token `a` no es stopword de concepto.

SOURCE_RANGE_CLASSIFICATION:
SINGLE_MONTH_SOURCE_INVOCATION

SOURCE_FIRST_BAD_BOUNDARY:
`loadFolioSearchForChat` llama `queryReviewableSupportFolios` (o `queryPublicFolios`) una vez con `shaped.period_month`. La fuente vigente es `WHERE f.mes_cargo = $1`. El North Star inyectado llamó solo `{ mesCargo: "2026-01" }` y respondió `Filtros: mes_cargo 2026-01, concepto a fueron de impresora`.

EXISTING_RANGE_HELPER_REUSABLE:
NO

SAFE_PERIOD_MODEL:
`period_mode: SINGLE | RANGE`. SINGLE conserva `period_month`. RANGE añade `period_start` y `period_end` (YYYY-MM). No reutilizar `period_month` como si fuera todo el rango. Sin año explícito: ambos extremos usan el año de `deps.now`. Un año explícito único: ambos extremos. Años por extremo: respetarlos. No hardcode 2026.

SAFE_CONCEPT_STRATEGY:
Reconocer y retirar el span temporal completo como unidad ANTES de extraer concepto (`de <mes> [año] a <mes> [año]`, `desde <mes> [año] hasta <mes> [año]`, `<mes>-<mes>`). Después reutilizar el frame + token sequence + morfología vigentes. No añadir `"a"` a `STRUCTURAL_TOKENS`. No catálogo. No regex de IMPRESORA.

SAFE_FETCH_STRATEGY:
B. Reusar `queryReviewableSupportFolios` una vez por mes, en orden cronológico, mismo client, N ≤ 12. Fusionar, deduplicar por `folio id`, filtrar concepto, aplicar `RECORD_LIMIT` global. No SQL nuevo. No BETWEEN. No tocar la query IGF.

SQL_CHANGE_REQUIRED:
NO

MULTI_YEAR_SUPPORTED_SAFELY:
YES

INVERTED_RANGE_BEHAVIOR:
fail-closed si `period_start > period_end` tras resolver años. No intercambiar extremos (M5/M6 lo hace; no copiar). No envolver al año anterior (client-profile lo hace en `agosto a julio`). `diciembre 2025 a febrero 2026` no es invertido.

PARTIAL_MONTH_FAILURE_BEHAVIOR:
fail-closed de todo el rango ante `SOURCE_ERROR` de cualquier mes. Prohibido listar meses parciales en silencio.

GLOBAL_LIMIT_SEMANTICS:
`RECORD_LIMIT = 40` sobre el conjunto ya fusionado y filtrado. `count` = tamaño completo del match. `truncated` si `count > 40`. No 40 por mes.

A-J MATRIX:

| Caso | Pregunta | period_month actual | concept_query actual | Esperado |
|---|---|---|---|---|
| NS | que apoyos de enero a agosto fueron de IMPRESORA? | 2026-01 | a fueron de impresora | start 2026-01 end 2026-08 concept impresora. 1 fetch (enero). 0 hits vs IMPRESORA LASER. Answer declara solo 2026-01. |
| A | apoyos de enero a agosto de impresora | 2026-01 | a de impresora | start 2026-01 end 2026-08 concept impresora. scope SUPPORT_FAMILIES. |
| B | apoyos de enero a agosto fueron de impresora | 2026-01 | a fueron de impresora | igual que NS. Frame bloqueado por `a`. |
| C | folios de enero a agosto de llantas | 2026-01 | a de llantas | start 2026-01 end 2026-08 concept llantas. scope ALL_PUBLIC_FOLIOS. |
| D | folios desde enero hasta agosto de llantas | 2026-01 | desde hasta de llantas | start 2026-01 end 2026-08 concept llantas. `desde`/`hasta` no son estructurales. |
| E | folios enero-agosto de llantas | 2026-01 | - de llantas | start 2026-01 end 2026-08 concept llantas. El `-` sobrevive a normalize (no se parte el hyphen). |
| F | folios de julio a agosto de isuzu | 2026-07 | a de isuzu | start 2026-07 end 2026-08 concept isuzu. |
| G | folios de agosto a agosto de isuzu | 2026-08 | a de isuzu | start=end 2026-08 (rango degenerado válido) concept isuzu. |
| H | folios de diciembre 2025 a febrero 2026 de llantas | 2025-02 | a de llantas | start 2025-12 end 2026-02 concept llantas. Actual: febrero gana por orden de `MONTHS_ES`; año = primer `2025` de la frase → 2025-02. |
| I | folios de agosto a julio de llantas | 2026-07 | a de llantas | fail-closed invertido. Actual: julio gana por orden de `MONTHS_ES` → 2026-07. |
| J | folios de enero a agosto | 2026-01 | a | start 2026-01 end 2026-08 concept null. Listar el scope del rango. Actual: token `a` hace match de cualquier concepto que contenga `a` (demostrado: `SIN A TOKEN` → count 1). |

Guardrails SINGLE (no reabrir):

- julio fueron de llantas → 2026-07 / llantas
- agosto fueron de aceite → 2026-08 / aceite
- julio fueron de gas → 2026-07 / gas

Scope congelado (no reabrir):

- NS/A/B → SUPPORT_FAMILIES
- C–J → ALL_PUBLIC_FOLIOS

NORTH_STAR_EXPECTED:
period_start = 2026-01
period_end = 2026-08
concept_query = impresora

ONE_FIX_CAN_HANDLE_RANGE:
YES

FIX CONTRACT:
Un FIX puede: (1) detectar el span de rango y emitir `period_mode/start/end` sin romper SINGLE `period_month`; (2) retirar ese span como unidad antes del concepto, dejando frame+tokens+morfología intactos; (3) llamar la fuente mensual vigente N veces, merge/dedup/límite global, fail-closed parcial e invertido; (4) declarar el rango real en la respuesta. No SQL. No BETWEEN. No LIVE_DB. No `"a"` global. No reabrir frame/morfología/scope/intent. No tocar `queryReviewableSupportFolios`. No importar `parseExplicitPeriod` de client-profile. Cap 12 meses inclusivos; más → fail-closed. Año desde `deps.now` o extremos explícitos. Orden: meses cronológicos; dentro del mes conservar `importe DESC, id`. Dedup por id de folio. J sin concepto lista el scope del rango.

FILES FUTUROS:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-period-range.test.js`
- no `lib/director-ia-igf-reviewable-supports.js`
- no `lib/director-ia-client-profile.js`
- no M5/M6 SQL
- no `package.json`

## Evidencia física

HEAD / base: `4dc15ac1d9870efeb1796a45a3135e699c1ec5d5`
now de la traza: `2026-09-07T12:00:00-06:00`
LIVE_DB: no consultada
Product code: no modificado
Frame/morfología LIVE: no reabiertos

### Periodo

```91:113:lib/director-ia-folio-search.js
function extractPeriodMonth(q, now) {
  // ...
  for (const [name, mm] of Object.entries(MONTHS_ES)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      monthToken = mm;
      break;
    }
  }
  const yearM = q.match(/\b(20\d{2})\b/);
```

`MONTHS_ES` itera enero→diciembre. Dos meses en la pregunta: gana el que aparece antes en ese objeto. H empareja febrero con 2025.

### Concepto

`STRUCTURAL_TOKENS` no incluye `a`, `desde`, `hasta`. Tras borrar `enero` y `agosto` el North Star queda `a fueron de impresora`. El frame vigente no aplica.

J: `concept_query="a"` contra fila `SIN A TOKEN` → `count=1` (falso positivo del matcher de tokens, no del substring bruto).

### Fuente

`queryReviewableSupportFolios`: `WHERE f.mes_cargo = $1`.
Spy North Star: una llamada `mesCargo=2026-01`. Respuesta: solo `mes_cargo 2026-01`.

### Helpers existentes (no reutilizables)

| Helper | Por qué no |
|---|---|
| `queryReviewableSupportFolios` | Reusable como lectura mensual N veces. No es parser de rango. |
| M5/M6 `resolvePeriodRange` | Solo tokens `YYYY-MM`. Intercambia invertidos. SQL propio `mes_cargo >= / <=`. No parsea enero/agosto. |
| `parseExplicitPeriod` (client-profile) | North Star → `source=null` (agosto + `fueron` se descarta como mención tipo persona). `agosto a julio` envuelve 2025-08→2026-07. `assignYear` resta año si mes > mes de today. Recorta a today. Dominio distinto. |
| commercial-trend `resolveCalendarCompareMonths` | Compara dos meses; no expande inclusivo. |

Estrategia A (BETWEEN) existe en M5/M6 y rutas HTTP de `server.js`. Queda fuera: exigiría SQL nuevo en la fuente de folio_search.

## Completion

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001"
outcome: "DONE"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
frame_morphology_reopened: false
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - lib/director-ia-folio-search.js
  - lib/director-ia-igf-reviewable-supports.js
  - lib/director-ia-m5-taller-at.js
  - lib/director-ia-m6-gastos-inversiones.js
  - lib/director-ia-client-profile.js
  - lib/director-ia-commercial-trend.js
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No SQL. No merge. No deploy. No next task."
```
