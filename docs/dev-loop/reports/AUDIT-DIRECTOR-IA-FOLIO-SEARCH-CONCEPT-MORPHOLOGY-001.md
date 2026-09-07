# AUDIT-DIRECTOR-IA-FOLIO-SEARCH-CONCEPT-MORPHOLOGY-001

FRAME_CLASSIFICATION: A. CLOSED_RELATIONAL_FRAME_SUFFICIENT

FRAME_FIRST_BAD_BOUNDARY: extractConceptQuery / STRUCTURAL_TOKENS

MORPHOLOGY_CLASSIFICATION: A. CONTROLLED_TOKEN_VARIANTS_SUFFICIENT

MORPHOLOGY_FIRST_BAD_BOUNDARY: rowMatchesConcept / includes(substring)

EXISTING_HELPER_REUSABLE: NO

SAFE_FRAME_STRATEGY: Tras el extractor actual, recortar **una vez y solo al inicio** del span de concepto un marco cerrado: `fueron|son|eran` + `de`, o `relacionado(s)/relacionada(s)` + `con`. No meter `de` en stopwords. No catálogo.

SAFE_MORPHOLOGY_STRATEGY: Tokenizar `concepto` y `subcategoria` (ya coalescido en `row.concepto`). Comparar la **secuencia** de tokens del query con ventanas del haystack. Cada token coincide si comparte una variante controlada: `vocal+s`, `consonante+es`, `z↔ces`. No strip-final-s. Invariantes: `gas`, `mes`, `analisis`, `parabrisas` (no reducir). Longitud mínima 4 para reducir. No bag-of-words.

MULTIWORD_PREPOSITION_PRESERVED: YES

LLANTAS_LLANTA: YES (con variantes controladas; NO con substring)

MOTORES_MOTOR: YES (con variantes controladas; NO con substring)

LUCES_LUZ: YES (con `z↔ces`; NO con substring)

GAS_SAFE: YES (token + no reducir `gas`; substring actual NO es seguro: `gas` ⊂ `gasto`)

PARABRISAS_SAFE: YES (invariante / igualdad de token; strip-final-s la mutilaría a `parabrisa`)

ACEITE_DE_MOTOR_SAFE: YES (frame prefijo + conservar `de` medial)

ONE_FIX_CAN_SAFELY_HANDLE_FRAME_AND_MORPHOLOGY: YES

FIX CONTRACT:
1. No tocar periodo, SQL, scope, IGF, fuentes.
2. Frame: prefijo cerrado únicamente; `aceite de motor` y `filtros de aire` conservan `de`.
3. Matcher: tokens + variantes controladas sobre `row.concepto` y `row.subcategoria`; secuencia, no bolsa.
4. Prohibido: regex de `llantas`, catálogo, stemming, strip-final-s, dependencia nueva, helper de duplicados (borra `de`).
5. Guardrails de prueba: A–J + `gas`≠`ga`/`gasto` + `parabrisas` + `mes` + `analisis`.

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-SEARCH-CONCEPT-MORPHOLOGY-001"
outcome: "DONE"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
period_reopened: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-NATURAL-CONCEPT-PERIOD-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No merge. No deploy. No next task."
```

## 1. Periodo (no reabierto)

`CURRENT TURN EXPLICIT MONTH WINS LOCALLY = YES` se conserva. Este reporte no toca `extractPeriodMonth`.

C–J del CURRENT_TASK no nombran mes: aquí solo se traza concepto/matcher. El loader sigue exigiendo `mes_cargo`; eso es otro corte, fuera de esta auditoría.

## 2. Helpers existentes

| Sitio | Qué hace | ¿Reutilizable? |
|---|---|---|
| `lib/director-ia-folio-search.js` `normalizeNeedle` | lower + NFD | Solo normalización; no variantes |
| `lib/folio-duplicados.js` `tokenizeConcepto` | quita stopwords **incluyendo `de`** + Jaccard | **NO.** Rompe `aceite de motor` |
| `lib/categoria-rango-excel.js` `normalizeConceptoKey` | lower + NFD + espacios | No morfología |
| `lib/director-ia-action-register.js` `pluralAccion` | “1 acción / N acciones” | UI de conteo, no lexemas |
| `package.json` | sin stemmer/nlp | no hay librería |

No hay helper de singular/plural de tokens. No hay stemming. **EXISTING_HELPER_REUSABLE = NO.**

## 3. Frame

Hoy A/B/C… dejan `fueron de …` porque `fueron` no es estructural y el `de` medial no se recorta.

Marco cerrado **prefijo** (no stopword bag):

| leftover | tras un prefijo |
|---|---|
| fueron de llantas | llantas |
| fueron de aceite de motor | aceite de motor |
| son de llantas | llantas |
| eran de llantas | llantas |
| relacionados con llantas | llantas |
| fueron de filtros de aire | filtros de aire |

Meter `de` en STRUCTURAL/STOPWORDS (como duplicados) → `aceite motor`. Insuficiente e inseguro.

`CLOSED_RELATIONAL_FRAME_SUFFICIENT`.

## 4. Comparación de matchers

Haystack A: `LLANTA`. Fuente física: `row.concepto` = COALESCE(descripcion,concepto) y `row.subcategoria`. Matcher actual: `includes` tras `normalizeNeedle`.

| Estrategia | A llantas/LLANTA | E motores/MOTOR | G luces/LUZ | H gas vs GAS | H gas vs GASTO | I parabrisas | B aceite de motor | J filtros de aire / FILTRO DE AIRE |
|---|---|---|---|---|---|---|---|---|
| substring actual | NO | NO | NO | YES | **YES (falso +)** | YES | YES si el needle ya es la frase | NO (`filtros` ⊄ `filtro`) |
| token exacto | NO | NO | NO | YES | NO | YES | YES si se conserva `de` | NO |
| variantes controladas + secuencia | YES | YES | YES | YES | NO | YES | YES | YES |
| helper duplicados | n/a | n/a | n/a | n/a | n/a | n/a | **NO** (borra `de`) | **NO** |

Strip-final-s global: `gas`→`ga`, `parabrisas`→`parabrisa`. Prohibido.

Variantes controladas (por token, no por catálogo):

1. igualdad;
2. vocal+s (`llanta`↔`llantas`, `bomba`↔`bombas`, `filtro`↔`filtros`) solo si el token tiene longitud ≥ 5 al **reducir**;
3. consonante+es (`motor`↔`motores`);
4. `z`↔`ces` (`luz`↔`luces`);
5. invariantes no se reducen: `gas`, `mes`, `analisis`, `parabrisas`.

Frase: la secuencia `[aceite, de, motor]` debe alinearse contigua. No bolsa `{aceite, motor}` (falso +).

## 5. Matriz A–J

Needle = leftover **después** del frame propuesto. Match = variante+secuencia vs candidate.

| # | utterance | needle hoy | needle post-frame | candidate | substring | token exacto | variantes |
|---|---|---|---|---|---|---|---|
| A | …julio fueron de llantas? | fueron de llantas | llantas | LLANTA | NO | NO | YES |
| B | …agosto fueron de aceite de motor? | fueron de aceite de motor | aceite de motor | aceite de motor | YES* | YES | YES |
| C | …fueron de bombas? | fueron de bombas | bombas | BOMBA | NO | NO | YES |
| D | …fueron de bomba? | fueron de bomba | bomba | BOMBAS | YES | NO | YES |
| E | …fueron de motores? | fueron de motores | motores | MOTOR | NO | NO | YES |
| F | …fueron de motor? | fueron de motor | motor | MOTORES | YES | NO | YES |
| G | …fueron de luces? | fueron de luces | luces | LUZ | NO | NO | YES |
| H | …fueron de gas? | fueron de gas | gas | GAS | YES | YES | YES |
| H′ | (guardrail) | gas | gas | GASTO / GASOLINA | **YES** | NO | NO |
| I | …fueron de parabrisas? | fueron de parabrisas | parabrisas | PARABRISAS | YES | YES | YES |
| J | …fueron de filtros de aire? | fueron de filtros de aire | filtros de aire | FILTRO DE AIRE | NO | NO | YES |

\*B substring solo si el frame ya corrió; hoy `includes("fueron de aceite de motor")` sobre `aceite de motor` es NO.

## 6. Un FIX, dos pasos

Sí: un solo slice de producto puede (1) recortar el marco en `extractConceptQuery` y (2) cambiar `rowMatchesConcept` a tokens+variantes. Independientes. Sin periodo. Sin SQL.

No es un solo truco: el frame no arregla `llantas`/`LLANTA`; la morfología no arregla `fueron de`.

## 7. FILES FUTUROS

- `lib/director-ia-folio-search.js` (`extractConceptQuery`, `rowMatchesConcept`)
- tests A–J + H′ + invariantes
- no `folio-duplicados.js`
- no `docs/director-ia/`
- no SQL / frontend / LIVE_DB

## 8. Fuera de alcance

Sin implementación, SQL, LIVE_DB, merge, push main, deploy, next task, periodo, scope.
