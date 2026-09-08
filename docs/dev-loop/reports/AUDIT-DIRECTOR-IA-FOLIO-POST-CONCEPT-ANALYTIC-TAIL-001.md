# AUDIT-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001

status: READ_ONLY
mode: NO_IMPLEMENTATION
now_used: 2026-09-07
product_file: lib/director-ia-folio-search.js
probe: extractFolioSearchFilters + normalizeQuestion (exportados) + réplica local de locateConceptSpan para índices; sin DB; sin SQL; sin planner; sin routing.

## Evidencia LIVE (no reejecutada)

Planta: Acapulco.

Caso 1 / H: `concepto liquidaciones dame el monto por mes y acumulado` → 0 hits.
Caso 2 / A: `concepto liquidaciones suma los montos en un acumulado por mes` → 0 hits.
North Star / B: `concepto=remodelacion de taller` RANGE 2026-01..2026-08 AGGREGATE SUM MONTH cumulative=YES.

## Pipeline auditado (orden físico)

1. `normalizeQuestion` L70-79: NFD, minúsculas, `¿?¡!.,;:` → espacio.
2. `stripClosedScopePhrases` L235-241: identidad en A–H (no hay `apoyos o folios`).
3. `extractPeriodRange` L154-232: `\bde enero a agosto\b` → RANGE 2026-01..2026-08 en A–H.
4. `locateConceptSpan` L363-403.
5. `controlLanguageView` L405-407: máscara del span.
6. `extractAnalyticModelFromControl` L410-427: solo ve el control.
7. `conceptModelFromProtectedSpan` L433-445: no recorta cola analítica (inmutabilidad léxica).

## FIRST_DIVERGENCE A vs B

No diverge en normalize, period extraction, controlLanguageView, extractAnalyticModelFromControl ni conceptModelFromProtectedSpan.

PRIMER punto: `locateConceptSpan` L376-380.

Tras el period span, `skipControlLeftovers` deja el cursor en el primer no-leftover.

- A: texto siguiente = `"de liquidaciones suma los montos..."` → `text.slice(afterControl, afterControl+3) === "de "` → `boundConceptSpan(text, afterControl+3, text.length)` → END = `text.length`.
- B: texto siguiente = `"suma los montos en un acumulado por mes"` → no entra a L378-380 → `LAST_EN_BEFORE_PERIOD` L382-388 → END = `periodSpan.start`.

Regla física exacta A: `POST_PERIOD_DE_TO_TEXT_END`.
Regla física exacta B: `LAST_EN_BEFORE_PERIOD`.

## ROOT_CAUSE_CLASS

CONCEPT_END_BOUNDARY

La detección analítica (`ANALYTIC_FRAME_PHRASES`) existe y es correcta, pero solo corre sobre `controlLanguageView` después de que el locator ya tragó la cola. Efecto secundario: GROUP_BY/CUMULATIVE no se ven. Causa primera: END = `text.length` en el `de` post-periodo.

## Por qué B no padece el defecto

Construcción: `en CONCEPT` ANTES del RANGE; cola analítica DESPUÉS del RANGE.
El locator no usa `de` post-periodo. El span termina en el inicio del periodo. La cola queda en control → `por mes` + `acumulado por mes` → MONTH + YES.

## Por qué A/D–H sí

Construcción: RANGE luego `de CONCEPT` luego cola.
`POST_PERIOD_DE_TO_TEXT_END` no tiene frontera derecha distinta de EOF.
`conceptModelFromProtectedSpan` no recorta (correcto; no reabrir immutability).
`normalizeQuestion` aplana `?` a espacio: la cola posterior al signo queda en la misma cadena. Eso no es la divergencia A vs B (ambos tienen `?` antes de la cola).

## CASE_A

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones suma los montos en un acumulado por mes
PERIOD_MODE: RANGE
PERIOD_START: 2026-01
PERIOD_END: 2026-08
PERIOD_SPAN: [24, 41] raw=`de enero a agosto`
CONCEPT_SPAN_START: 45
CONCEPT_SPAN_END: 98
CONCEPT_SPAN_RAW: liquidaciones suma los montos en un acumulado por mes
CONCEPT_QUERY: liquidaciones suma los montos en un acumulado por mes
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END (`locateConceptSpan` L376-380)
WHY_TAIL_ENTERED_CONCEPT: tras el RANGE el texto es `de liquidaciones...`; la regla toma start=después de `de ` y end=EOF.

## CASE_B

NORMALIZED: cuanto hemos gastado en apoyos en remodelacion de taller de enero a agosto suma los montos en un acumulado por mes
PERIOD_MODE: RANGE
PERIOD_START: 2026-01
PERIOD_END: 2026-08
PERIOD_SPAN: [57, 74] raw=`de enero a agosto`
CONCEPT_SPAN_START: 34
CONCEPT_SPAN_END: 56
CONCEPT_SPAN_RAW: remodelacion de taller
CONCEPT_QUERY: remodelacion de taller
CONTROL_LANGUAGE_VIEW: cuanto hemos gastado en apoyos en de enero a agosto suma los montos en un acumulado por mes
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: MONTH
CUMULATIVE: YES
LOCATOR_RULE_USED: LAST_EN_BEFORE_PERIOD (`locateConceptSpan` L382-388)
WHY_TAIL_ENTERED_CONCEPT: no entra. Tras el RANGE el texto es `suma los montos...` (no `de `). Concepto = último `en` antes del periodo, END=periodSpan.start.

## CASE_C

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones
PERIOD_MODE: RANGE
PERIOD_START: 2026-01
PERIOD_END: 2026-08
CONCEPT_SPAN_START: 45
CONCEPT_SPAN_END: 58
CONCEPT_SPAN_RAW: liquidaciones
CONCEPT_QUERY: liquidaciones
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
WHY_TAIL_ENTERED_CONCEPT: no hay cola. Coincide con el esperado LIVE `concept=liquidaciones` AGGREGATE.

## CASE_D

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones por mes
PERIOD_MODE: RANGE
PERIOD_START: 2026-01
PERIOD_END: 2026-08
CONCEPT_SPAN_START: 45
CONCEPT_SPAN_END: 66
CONCEPT_SPAN_RAW: liquidaciones por mes
CONCEPT_QUERY: liquidaciones por mes
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
WHY_TAIL_ENTERED_CONCEPT: `por mes` entra al concepto. No queda en control. Por eso GROUP_BY=NONE aunque `por mes` está en ANALYTIC_FRAME_PHRASES.

## CASE_E

Idéntico a D tras normalize (`?` → espacio).
CONCEPT_QUERY: liquidaciones por mes
GROUP_BY: NONE
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
`por mes` entra al concepto.

## CASE_F

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones acumulado por mes
CONCEPT_SPAN_RAW / CONCEPT_QUERY: liquidaciones acumulado por mes
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
Cola `acumulado por mes` entra al concepto.

## CASE_G

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones suma los montos
CONCEPT_SPAN_RAW / CONCEPT_QUERY: liquidaciones suma los montos
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
`suma los montos` entra al concepto. AGGREGATE sobrevive solo por `cuanto suman` residual en control.

## CASE_H

NORMALIZED: cuanto suman los folios de enero a agosto de liquidaciones dame el monto por mes y acumulado
CONCEPT_SPAN_START: 45
CONCEPT_SPAN_END: 92
CONCEPT_SPAN_RAW / CONCEPT_QUERY: liquidaciones dame el monto por mes y acumulado
CONTROL_LANGUAGE_VIEW: cuanto suman los folios de enero a agosto de
ANALYSIS_MODE: AGGREGATE
AGGREGATION: SUM
GROUP_BY: NONE
CUMULATIVE: NO
LOCATOR_RULE_USED: POST_PERIOD_DE_TO_TEXT_END
`dame` no es leftover de borde aquí: CONTROL_LEFTOVER_* solo recorta prefijo/sufijo del span, no un `dame` medial. `dame el monto` no está en ANALYTIC_FRAME_PHRASES (sí `dame el total`).

## Confirmación: NO reabre contratos congelados

| Superficie | ¿Reabre? | Por qué |
|---|---|---|
| ESTAN period bridge | NO | `shrinkEstanPeriodBridge` no dispara: A/H el span está DESPUÉS del periodo; B no termina en `estan`. |
| Protected lexical immutability | NO | `conceptModelFromProtectedSpan` no hace `STRUCTURAL_TOKENS.pop()`. El fallo es END del locator, no recorte del span ya protegido. |
| TOTAL PLAY | NO | No hay cue global `\btotal\b` / `\bsuma\b` sobre la pregunta completa. AGGREGATE sale de frases cerradas en control. |
| NULL != 0 | NO | No toca `Number(null)`. |
| CANCELADO | NO | Fuera de eligible; no auditado ni implicado. |
| full-set | NO | No toca cap 40 / full set. |
| RANGE semantics | NO | RANGE 2026-01..2026-08 correcto en A–H. |
| ANY | NO | No hay ` o `. |
| morphology | NO | No entra al matcher; el 0-hit LIVE es secuencia de tokens del concepto contaminado. |
| authz | NO | Fuera de alcance. |

## Alcance de un FIX futuro (no implementado)

CAN_FIX_INSIDE_FOLIO_SEARCH: YES
REQUIRES_PLANNER: NO
REQUIRES_ROUTING: NO
REQUIRES_SQL: NO
REQUIRES_SCHEMA: NO
REQUIRES_LIVE_DB: NO
WOULD_FIX_REQUIRE_REOPENING_ESTAN: NO
WOULD_FIX_REQUIRE_REOPENING_NULL_MODEL: NO

RECOMMENDED_MINIMAL_BOUNDARY:
En `locateConceptSpan` L378-380 (`POST_PERIOD_DE_TO_TEXT_END`), no usar `text.length` como END incondicional. Acotar el END del concepto post-`de` antes de una frase analítica cerrada posterior (las ya listadas en `ANALYTIC_FRAME_PHRASES`: `suma los montos`, `acumulado por mes`, `por mes`, y equivalentes de instrucción). Esas frases deben permanecer en `controlLanguageView`. No aplicar esas frases sobre la pregunta completa (rechazado históricamente en 488a3faf). No stopwords globales. No `STRUCTURAL_TOKENS.pop()`. No tocar `shrinkEstanPeriodBridge`. No tocar Option B NULL. La misma frontera derecha aplica a `LAST_DE_TO_TEXT_END` L397-400 si el `de` queda después del periodo.

FINAL_RECOMMENDATION: FIX_POST_CONCEPT_ANALYTIC_TAIL

STOP. Sin implementación.
