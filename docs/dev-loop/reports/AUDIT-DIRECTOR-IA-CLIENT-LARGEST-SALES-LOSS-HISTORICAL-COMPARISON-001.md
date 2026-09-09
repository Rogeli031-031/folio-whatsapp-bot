# AUDIT-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-HISTORICAL-COMPARISON-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-HISTORICAL-COMPARISON-001"
outcome: "DONE"
mode: "READ_ONLY"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "22f505ea7907192e1efe7e820b4e532105e1e13a"
head_sha_at_start: "c74f841de6b95dbbfc63e432ac818f122ee84327"
branch: "audit/director-ia-client-largest-sales-loss-historical-comparison-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No implementación en esta tarea. El FIX propuesto no está autorizado. Semántica de si «dejó de comprar» entra en «mayor pérdida» queda al humano."
```

## Hallazgo

La pregunta de producción (`que cliente tiene la perdida mayor de venta entre mayo vs junio?`) **no entra** a ranking planta ni a M9 ni a `financial_diagnosis`.

Entra a **`client_profile`**: perfil longitudinal de **un** cliente.

Causa física: `isCommercialMoversQuestion` no reconoce «pérdida» / «perdió». `isClientProfileQuestion` sí dispara porque `hasExplicitClientAnchor` trata cualquier `cliente(s)` como ancla **y** `parseExplicitPeriod` ve dos meses.

Los periodos **sí** son mayo 2026 y junio 2026 (meses cerrados). El fallo no es el parser.

«Cero observaciones en kg» no está hardcodeado. El literal físico es `ZERO_OBSERVED` en `alignMonthlyRows`: mes con ventas de planta y **sin fila de ese cliente** → `kg=0`, `kg_status=ZERO_OBSERVED`. El addendum del perfil autoriza verbalizar `ZERO_OBSERVED`. Eso **no** prueba que Acapulco no tuvo kg en mayo/junio.

Primer turno aislado de S1, sin identidad heredada y sin hint embebido: `needs_identity` → clarificación canónica. **No** dice «cero observaciones». El wording de producción implica pack ensamblado (identidad heredada/continuidad) o parafraseo LLM. Identidad exacta de producción = NOT_PROVEN (no logs / no LIVE_DB).

La capacidad de ranking cliente-a-cliente **ya existe** en `commercial_trend` `calendar_compare` sobre `arr.ventas_diarias_cliente`. S1 no la usa. S3–S6 sí. No hace falta SQL nuevo.

---

AUDIT_RESULT:

QUESTION_S1_INTENT:
client_profile
(reason client_profile_semantic, confidence 0.88)
isCommercialTrend=false; isCommercialMovers=false

QUESTION_S2_INTENT:
client_profile
(reason client_profile_semantic, confidence 0.88)
isCommercialTrend=false; isCommercialMovers=false

QUESTION_S3_INTENT:
commercial_trend
(reason commercial_trend_range_channel, confidence 0.9)
isCommercialMovers=true
(isClientProfileQuestion también true por «cliente»+meses; el planner evalúa commercial_trend primero)

QUESTION_S4_INTENT:
commercial_trend
(isCommercialMovers=true; isClientProfile=false: exclusión `disminuyeron`)

QUESTION_S5_INTENT:
commercial_trend
(isCommercialMovers=true; isClientProfile=false: exclusión `dejaron de comprar`)

QUESTION_S6_INTENT:
commercial_trend
(isCommercialMovers=true)
(isClientProfileQuestion también true; gana commercial_trend)

S1_ROUTE:
POST /api/director-ia/chat
→ server.js handlePostChat
→ askDirectorIa
→ planDirectorIaQuestion intent=client_profile
→ loadClientProfileForChat
→ (si no hay identidad) needs_identity → buildUnknownClarificationResult; OpenAI NO
→ (si hay identidad) queryMonthlySales(arr.ventas_diarias_cliente) → alignMonthlyRows → buildClientProfilePrompt → OpenAI
No entra commercial_trend. No entra delta_sales. No entra M9. No entra financial_diagnosis. No toca temporal safety.

S1_PERIOD_OBJECT:
client_profile (ruta real):
{ period_source: "explicit", months: ["2026-05","2026-06"], requested_range: {start:"2026-05", end:"2026-06"}, query_start: "2026-05-01", query_end: "2026-06-30" }
No hay period_a/period_b ni operación de compare. Es lista alineada de un cliente.
Si se forzara commercial_trend (S1 no lo hace):
{ period_kind: "calendar_compare", month_a: {year:2026,month:5,first:"2026-05-01",last:"2026-05-31"}, month_b: {year:2026,month:6,first:"2026-06-01",last:"2026-06-30"} }
M9 resolvePeriodPair(S1) NO parsea nombres de mes → default_latest_two (probe: 2026-08 vs 2026-09). S1 no usa M9.

S1_PERIOD_A:
2026-05 (2026-05-01..2026-05-31)
Año implícito = now.getFullYear()/CDMX (probe now=2026-09-08). Mes cerrado. No MTD. No default M9. No mes actual.

S1_PERIOD_B:
2026-06 (2026-06-01..2026-06-30)
Igual: cerrado. No se mezcla con septiembre MTD.

SOURCE_MODULE:
lib/director-ia-client-profile.js (ruta S1 real)
Capacidad de ranking no usada: lib/director-ia-commercial-trend.js (loadCalendarCompare)
M9 no usada: lib/director-ia-m9-deltas.js

SOURCE_TABLE:
arr.ventas_diarias_cliente
(client_profile: queryMonthlySales; calendar_compare: defaultQueryCalendarClientKg; M9: getDeltaVentaClientes)
client_profile también lee arr.descuentos_diarios_cliente / comentarios / DICF; irrelevantes al ranking de kg.

QUERY_FUNCTION:
S1: queryMonthlySales
Ranking no usado: defaultQueryCalendarClientKg
M9 no usado: getDeltaVentaClientes

PLANT_MAPPING:
S1/calendar_compare: resolvePlantCodes(planta.nombre) → uniqueCodes; WHERE UPPER(TRIM(v.plant_code)) = ANY($1::text[])
M9 (no usado): SQL_PROV_MAP por prov_name
LIVE Acapulco→códigos = NOT_PROVEN

KG_FIELD:
SUM(v.kg) AS kg
client_profile: Number(sales.kg) || 0 si hay fila; si no hay fila y el mes está cubierto por planta → 0 ZERO_OBSERVED
calendar_compare: Number(row.kg || 0); cliente ausente en un mes → 0 vía Map.get || 0

FULL_CLIENT_UNIVERSE_AVAILABLE:
PARTIAL
YES en calendar_compare (unión keys A∪B) y en M9 (FULL OUTER JOIN)
NO en la ruta S1 (un solo cliente_key)

CLIENT_DELTA_KG_AVAILABLE:
PARTIAL
YES en calendar_compare (delta_kg = kg_b - kg_a) y en M9 (delta_kg = COALESCE(B,0)-COALESCE(A,0))
NO en la ruta S1 (no calcula delta cliente-a-cliente)

NEGATIVE_RANKING_AVAILABLE:
PARTIAL
calendar_compare ordena por |delta_kg|, no por el más negativo
M9 rankea dentro de buckets (disminuyeron por delta más negativo; dejaron por kgA)
No existe operación «mayor pérdida» unificada usada por S1

TOP_LOSS_CLIENT_AVAILABLE:
PARTIAL
S1 real: NO (no rankea)
S3 (disminuyó más): YES solo dentro de tipo disminucion; first_mover = CLIENTE_A en fixture
S1 forzado a calendar_compare: first_mover = mayor |delta| (puede ser un aumento)
M9: top del bucket disminuyeron ≠ top unificado

DECREASED_BUCKET_SEMANTICS:
commercial_trend: kgA>0 && kgB>0 && kgB<kgA → tipo disminucion / DISMINUYÓ
M9: kgA>0 && kgB>0 && deltaKg<0
Cliente que sigue comprando y baja. Separado de «dejó de comprar».

STOPPED_BUYING_BUCKET_SEMANTICS:
commercial_trend: kgA>0 && kgB===0 → tipo perdido / DEJÓ DE COMPRAR
M9: kgA>0 && kgB<=0
Ausente en B se trata como 0 (Number/COALESCE). No hay status DATA_NOT_FOUND por cliente en este path.

TOP_LOSS_INCLUDES_STOPPED_BUYING:
NOT_DEFINED
S1 no rankea. No hay semántica de «mayor pérdida» implementada.
S3/S4 filtran solo disminucion → NO incluyen dejaron.
S5 solo perdido.
S1 forzado sin tipo: lista los tres grupos; first_mover es |delta| (incluye perdido si gana magnitud).
Esta auditoría no decide si deben unirse.

BUCKET_TOTALS_BEFORE_TRUNCATION:
NOT_APPLICABLE en calendar_compare (list_truncated=false; no 80/20)
YES en M9 (totalDeltaKg sobre todos los candidatos del bucket; lista = slice 20%)

RANKING_BEFORE_TRUNCATION:
NOT_APPLICABLE en calendar_compare (no recorta)
YES en M9: sort del bucket completo, luego slice 20%. El #1 del bucket no puede cambiar por 80/20; sí se ocultan el resto.

ZERO_OBSERVATIONS_ORIGIN:
No hay string «cero observaciones» en producto.
Origen físico: client_profile alignMonthlyRows
  plantSalesMonths.has(yyyymm) && clientSalesByMonth.get(yyyymm)==null
  → kg=0, kg_status="ZERO_OBSERVED"
Addendum L54: «ZERO_OBSERVED solo si el pack lo marca».
formatClientProfileContext: `kg=0 kg_status=ZERO_OBSERVED` para 2026-05 y 2026-06
cuando la planta tiene filas de otros clientes y el perfilado no.
Primer turno S1 sin hint/keys: needs_identity; no se llega a ZERO_OBSERVED.
calendar_compare vacío: «DISMINUYÓ (0): (sin clientes)» — no es esa frase.
M9 no participa.

ZERO_IS_PHYSICAL_COUNT:
NO
No es COUNT(*)=0 de observaciones de planta. Es ausencia de fila del cliente en un mes cubierto.

ZERO_IS_PHYSICAL_SUM:
NO
No es SUM(kg)=0 de filas de ese cliente. No hubo fila. Inferencia de cobertura de planta.

MISSING_COLLAPSES_TO_ZERO:
YES
client_profile: sales==null + mes cubierto → 0 / ZERO_OBSERVED
client_profile con fila: Number(sales.kg)||0
calendar_compare: Number(kgA)||0 y Number(kgB)||0; Map.get||0
M9: COALESCE(a.kg,0), COALESCE(b.kg,0)
DATA_NOT_FOUND (planta sin mes) en perfil sí se conserva null. Ese caso no es el wording de producción.

PERIOD_A_CORRECT:
YES
Parser de S1 (y de calendar_compare si se usara) = 2026-05. No default M9. No mes actual.

PERIOD_B_CORRECT:
YES
Parser = 2026-06. Cerrado en septiembre 2026. No MTD.

PLANT_CORRECT:
NOT_PROVEN
Código usa la planta del request (probe: Acapulco). Mapeo LIVE plant_code no inspeccionado.

FIRST_DIVERGENCE:
lib/director-ia-planner.js L579-583
isCommercialTrendQuestion(S1)=false
  porque isCommercialMoversQuestion no matchea perdida/perdió
  (solo disminuy / dejaron de comprar / aumentaron / …)
luego isClientProfileQuestion(S1)=true
  hasExplicitClientAnchor: /\bclientes?\b/
  + parseExplicitPeriod.months.length>0 (mayo, junio)
FIRST_DIVERGENCE no es el period parser.

FIRST_FALSE_ZERO_SITE:
lib/director-ia-client-profile.js alignMonthlyRows L857-859
else if (sales == null) { kg = 0; kg_status = "ZERO_OBSERVED"; }
Solo si salesCovered (L848). Si la planta no cubre el mes: null / DATA_NOT_FOUND (L854-856).
Verbalización: buildClientProfilePrompt + OpenAI sobre kg_status=ZERO_OBSERVED.

OPENAI_CALLED:
NOT_PROVEN en el turno de producción (no logs).
S1 primer turno aislado sin identidad: NO
S1 con pack (identidad heredada): YES
S3–S6 calendar_compare: NO (deterministic_answer)

M9_TEMPORAL_SAFETY_RELEVANT:
NO
S1 no entra a financial_diagnosis. Mayo y junio son históricos cerrados. El gate MTD de septiembre no se invoca.

PARSER_BUG:
NO
mayo vs junio / mayo y junio → 2026-05 y 2026-06. twoMonthConnector("vs")=compare.

ROUTING_BUG:
YES
Pregunta de ranking planta → perfil de un cliente.

PERIOD_BUG:
NO
en la ruta S1 y en calendar_compare. (M9, si se usara, sí elegiría default_latest_two; S1 no lo usa.)

SOURCE_BUG:
NO
La tabla correcta existe y se usaría en calendar_compare/M9. S1 consulta la misma tabla pero filtrada a una identidad.

PLANT_MAPPING_BUG:
NOT_PROVEN

NULL_ZERO_BUG:
YES
missing fila cliente + mes cubierto → 0 ZERO_OBSERVED
Number(x)||0 / COALESCE en calendar_compare y M9

RANKING_BUG:
YES
S1 no rankea. La capacidad de ranking vive en otra ruta.
«disminuyó» excluye «dejó de comprar». No hay top-1 unificado de «mayor pérdida».

PRESENTATION_BUG:
YES
ZERO_OBSERVED de un cliente (o de una identidad heredada) puede verbalizarse como «ambos meses tienen cero observaciones en kg». Eso no es verdad de planta.

DATA_BUG:
NOT_PROVEN
No se consultó LIVE_DB. No se afirma que Acapulco tenga o no kg en mayo/junio.

CAN_FIX_WITHOUT_NEW_SQL:
YES
Reusar loadCalendarCompare / defaultQueryCalendarClientKg. Sin SQL nuevo. Sin tocar M9. Sin tocar temporal safety. Sin planner/routing changes en esta auditoría; el FIX sería routing/clasificador (isCommercialMoversQuestion o no tratar «cliente» genérico + dos meses como perfil).

RECOMMENDED_NEXT_SLICE:
FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001
Hacer que «qué cliente / pérdida mayor / perdió más venta / entre mes vs mes» no dispare client_profile por el ancla genérica cliente(s)+dos meses.
Reusar commercial_trend calendar_compare.
El humano decide en el FIX si top-loss une disminucion+perdido o no.
No SQL. No LIVE_DB. No M9. No temporal safety.

FILES_INSPECTED:
- lib/director-ia-planner.js (orden commercial_trend → client_profile → delta_sales; explicitClientScopeSpan; hasExplicitClientAnchor vía client_profile)
- lib/director-ia-client-profile.js (isClientProfileQuestion L664-702; extractEmbeddedClientHintCandidates; parseExplicitPeriod; twoMonthConnector; alignMonthlyRows; queryMonthlySales; loadClientProfileForChat; CLIENT_PROFILE_SYSTEM_ADDENDUM)
- lib/director-ia-commercial-trend.js (isCommercialMoversQuestion; isCommercialTrendQuestion; classifyPurchaseDelta; requestedMoverTipo; defaultQueryCalendarClientKg; buildCalendarMovers; loadCalendarCompare; buildCalendarCompareAnswer)
- lib/director-ia-chat.js (commercial_trend L4901-5026; client_profile L5028-5183)
- lib/director-ia-m9-deltas.js (resolvePeriodPair; getDeltaVentaClientes; buildDeltaVentaDatosPayload)
- lib/director-ia-financial-diagnosis.js (gate temporal: no alcanzado)
- server.js (POST /api/director-ia/chat)
- test/director-ia-client-profile.test.js
- test/director-ia-commercial-trend.test.js

TESTS_RUN:
- test/director-ia-client-profile.test.js + test/director-ia-commercial-trend.test.js: 46/46 PASS (existentes; ZERO_OBSERVED y calendar_compare ya cubiertos)
- probe read-only in-process (now=2026-09-08, stubs, sin LIVE_DB):
  S1–S6 planner/period/M9 resolvePeriodPair
  S1 first-turn loadClientProfileForChat → needs_identity
  S1 identidad heredada + planta con filas de OTRO en 2026-05/06 → ambos meses ZERO_OBSERVED kg=0
  alignMonthlyRows covered vs uncovered
  S1/S3–S6 loadCommercialTrendForChat forzado con fixture A/B/C
  S3 vacío → «DISMINUYÓ (0): (sin clientes)»
  classifyPurchaseDelta null/undefined/""
  buildDeltaVentaDatosPayload 80/20

RISKS:
- Producción puede haber tenido un cliente activo en conversation_state; el cero sería de ESE cliente, no de la planta.
- Un FIX que una disminucion+perdido cambia semántica; no está autorizada aquí.
- Un FIX que use M9 con «mayo vs junio» tomaría default_latest_two (ago–sep), no mayo–junio.
- first_mover de calendar_compare es mayor |delta|, no mayor pérdida. No usarlo como top-loss sin filtro.
- extractEmbeddedClientHintCandidates(S1)=null (tokens tras «cliente»/«de» no son nombre capitalizado). No extrae basura tipo «perdida».

STOP.

---

## Traza física S1

```
POST /api/director-ia/chat
  server.js → handlePostChat
    askDirectorIa
      planDirectorIaQuestion
        isHistoricalMarginQuestion → false
        isCommercialTrendQuestion → false
        isClientProfileQuestion → true   // FIRST_DIVERGENCE
        intent = client_profile
      loadClientProfileForChat
        parseExplicitPeriod → 2026-05, 2026-06
        extractEmbeddedClientHintCandidates → null
        sin keys/hint → needs_identity (400 DATA_NOT_FOUND)
        con keys heredadas → queryMonthlySales(arr.ventas_diarias_cliente)
          alignMonthlyRows → ZERO_OBSERVED si planta cubierta y sin fila
        buildClientProfilePrompt → OpenAI
```

S3–S6 (el camino que S1 debería usar, ya existente):

```
intent = commercial_trend
  loadCommercialTrendForChat
    period_kind = calendar_compare
    defaultQueryCalendarClientKg × 2 (mayo, junio)
    classifyPurchaseDelta / buildCalendarMovers
    requestedMoverTipo filtra disminucion | perdido | aumento
    deterministic_answer; openai_called=false
```

## Periodos

now probe = 2026-09-08.
«entre mayo vs junio» y «entre mayo y junio»: A=2026-05-01..31, B=2026-06-01..30.
Año implícito 2026. Meses cerrados. No current month. No temporal safety FD.
M9 no parsea nombres de mes.

## Ranking (capacidad no usada por S1)

Fixture: A 1000→100 (−900 disminucion); C 800→0 (−800 perdido); B 200→250 (+50 aumento).

| Pregunta | first_mover | incluye dejó de comprar |
|---|---|---|
| S1 forzado | CLIENTE_A (−900) | en la lista, no como único top-loss |
| S3/S4 | CLIENTE_A | NO |
| S5 | CLIENTE_C | solo ese bucket |
| S6 | CLIENTE_B | N/A |

calendar_compare no trunca. M9 80/20 corta la lista, no el total ni el #1 del bucket.

## Missing != zero

Violado en S1 cuando el mes existe en planta y el cliente no tiene fila: se emite 0 ZERO_OBSERVED.
DATA_NOT_FOUND se conserva solo si la planta no cubre el mes.
calendar_compare/M9 colapsan ausencia de cliente a 0 para clasificar «dejó de comprar». Esa semántica es de movers, no el wording de S1.

## Temporalidad

M9 temporal safety de financial_diagnosis: no relevante. No se tocó.

## Probe (sin LIVE_DB)

Auth stub ZP. Planta Acapulco inyectada. now=2026-09-08.

| Caso | Resultado |
| S1/S2 planner | client_profile 0.88; embedded=null |
| S3–S6 planner | commercial_trend 0.9 |
| S1 first-turn | needs_identity; no ZERO_OBSERVED |
| S1 + identidad heredada + OTRO en mayo/junio | kg=0 ZERO_OBSERVED ambos meses |
| S1 forzado calendar_compare | mayo/junio 2026; lista 3 buckets; no «cero observaciones» |
| S3 vacío | DISMINUYÓ (0): (sin clientes) |
| M9 S1 periodos | 2026-08 vs 2026-09 default_latest_two |
