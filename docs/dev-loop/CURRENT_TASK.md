task_id: IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001

task_type: IMPLEMENTATION
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-11T13:44:53-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 63fc66f0d74863b0ee825f7444a95308d1e9ee3e
result_report_path: docs/dev-loop/reports/IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001.md

objective: "Enriquecer month_close_result con una composición financiera A/B/C: FINAL defendible, vista financiera histórica disponible pero NO FINAL, o datos financieros ausentes; presentar las variables ejecutivas del dashboard sin convertir una vista runtime en cierre contable FINAL."

## North Star

Planta:
Acapulco

Pregunta:

¿Cómo cerramos agosto?

Hoy:

- ACTUAL COMERCIAL 1504.39 t
- TARGET missing
- FORECAST 1504.39 t
- FINANCIAL_ACTUAL_NOT_FINAL
- no presenta P&L visible del dashboard

Deseado cuando el periodo no tiene FINAL pero sí existe vista financiera:

Acapulco — Agosto 2026

VISTA FINANCIERA DISPONIBLE — NO FINAL

Venta comercial:
1,504.39 t

CASA:
832.74 t

COMISIONISTA:
671.65 t

Margen:
7.24 MXN/kg

Descuento:
-0.22 MXN/kg

Impuestos:
0.90 MXN/kg

HG:
12.87 %

HG$:
12.45 MXN/kg

Gastos operativos:
$9,664,071

Gastos corporativos:
$2,378,296

Gasto total:
$12,042,367

Rentabilidad operativa de esta vista:
$3,451,953

Resultado final de esta vista:
$1,073,657

Advertencia obligatoria:

Esta vista financiera no está marcada como FINAL.
No debe presentarse como cierre financiero definitivo.

Las cifras son evidencia LIVE humana de referencia.
NO hardcodearlas.

## Principio de verdad

No alterar:

igf.versions.financial_state

No convertir:

NOT_FINAL
→ FINAL

por existir números visibles.

La presentación debe distinguir tres estados.

## Estado A — FINAL

Si:

financial.actual

tiene un cierre FINAL defendible y campos financieros disponibles:

presentation_state =
FINAL

Fuente primaria financiera:

financial.actual / stored FINAL

No reemplazarlo con mini/latest.

Usar los campos FINAL realmente disponibles.

Puede combinarse con ACTUAL comercial ARR para volumen/categoría
solo si la semántica queda claramente separada y ya existe en month_close.

No rellenar un campo financiero FINAL ausente usando mini
sin etiquetarlo como fuente distinta.

## Estado B — VISIBLE_NOT_FINAL

Si NO hay FINAL pero existe una vista financiera histórica
equivalente a la fila visible del dashboard para ese MISMO mes:

presentation_state =
VISIBLE_NOT_FINAL

Usar la misma semántica física auditada:

- latest IGF para variables stored;
- mini runtime del MISMO periodo histórico;
- ARR del MISMO mes para venta/categoría.

Nunca usar mini del mes actual para contestar otro mes.

La etiqueta visible debe ser inequívoca:

VISTA FINANCIERA DISPONIBLE — NO FINAL

No usar:

cierre financiero definitivo
resultado contable final
cerramos financieramente en

## Estado C — DATA_MISSING

Si no hay FINAL
y tampoco puede construirse la vista financiera histórica:

presentation_state =
DATA_MISSING

Puede mostrar ACTUAL comercial si existe.

Debe decir:

datos financieros no disponibles

No inventar ceros.
No derivar métricas sin fuente.
No fallback silencioso a commitment.

## Fuente histórica de la vista

Reusar las funciones/loaders en proceso que alimentan el dashboard.

NO hacer HTTP interno.

NO crear endpoint.

NO crear SQL.

NO copiar datos del frontend.

Si hace falta extraer/reutilizar un helper puro ya existente,
hacerlo con mínima superficie.

La auditoría probó que el dashboard histórico usa:

latest IGF
+
computeIgfForecastMiniPayload
+
ARR clientes/categoría

Debe preservarse esa semántica.

## Periodo

Para:

¿Cómo cerramos agosto?

target period:

2026-08

Toda la vista B debe ser:

2026-08

Prohibido mezclar:

2026-08 financiero
con
MINI_FORECAST_PROY 2026-09

## VENTA

Para mes histórico cerrado en vista B:

venta comercial =
venta real ARR del periodo

No llamarla forecast.

Ejemplo fixture:

1504.39 t

## CASA / COMISIONISTA

Usar toneladas ARR del mismo periodo.

No asumir contractualmente que:

CASA + COMISIONISTA = VENTA

si el origen tiene otras categorías.

Si en el periodo sí reconcilia, puede mostrarse.

No alterar universo para forzar reconciliación.

## MARGEN

Vista B:

margen latest visible del mismo periodo.

Unidad:

MXN/kg

No llamarlo margen FINAL.

## DESCUENTO

Para paridad de la fila del dashboard,
usar la misma semántica visible auditada:

UI-visible =
-abs(com_desc_kg)

del IGF correspondiente.

No sustituirlo por el descuento ARR de month_close
si se presenta como "vista financiera del dashboard".

Preservar exactamente la semántica/signo visible.

## IMPUESTOS

Campo:

impuesto_kg

Unidad:

MXN/kg

## HG

Vista visible:

hg_pct * 100

Unidad:

%

No presentar el fraction crudo como porcentaje.

## HG$

Paridad auditada:

abs(hg_kg / hg_pct)

Unidad:

MXN/kg

Solo calcular cuando la división sea válida.

Si hg_pct es 0/null:
n/d

No Infinity.
No NaN.

No llamar HG$ al hg_kg crudo.

## OPERATIVOS

Fuente vista B:

mini runtime histórico.

Semántica:

GASTO OPERATIVO

No llamarlo rentabilidad operativa.

## CORPORATIVOS

Fuente vista B:

mini runtime histórico.

Semántica:

GASTO CORPORATIVO

## GASTO TOTAL

Vista B:

gasto =
operativos + corporativos

Usar el campo/contrato físico del mini.

No volver a sumar si el campo ya es autoritativo salvo control.

## RENTABILIDAD OPERATIVA

Vista B:

utilOperImporte

Semántica:

rentabilidad/utilidad operativa de la vista financiera

Fórmula auditada en este builder:

utilOperImporte =
ingreso - operativos

También:

utilOperImporte =
resultadoFinalImporte + corporativos

No generalizar a otros universos.

Ejemplo fixture esperado:

3,451,953 MXN

No hardcodear.

## RESULTADO FINAL

Vista B:

resultadoFinalImporte

Este es el valor mostrado por:

RENTAB.

en la tabla.

NO es rentabilidad operativa.

Fórmula del mini:

resultadoFinalImporte =
utilOperImporte - corporativos

Ejemplo fixture:

1,073,657 MXN

Debe llamarse:

Resultado final de esta vista

cuando presentation_state=VISIBLE_NOT_FINAL.

NO:

cierre final
resultado FINAL contable

## INGRESO

El mini puede contener ingreso.

No es obligatorio mostrarlo en North Star
porque el humano pidió el formato de la tabla + rentabilidades.

Puede mantenerse en evidencia/payload para explicar fórmula.

No añadir ruido innecesario.

## Payload normalizado

Crear una representación determinista para composición.

Nombre recomendado:

financial.presentation

Shape conceptual:

{
  state: "FINAL" | "VISIBLE_NOT_FINAL" | "DATA_MISSING",
  source: "...",
  period: "YYYY-MM",
  is_final: boolean,
  values: {
    venta_ton,
    casa_ton,
    comisionista_ton,
    margen_mxn_kg,
    descuento_mxn_kg,
    impuestos_mxn_kg,
    hg_pct,
    hg_mxn_kg,
    operativos_mxn,
    corporativos_mxn,
    gasto_mxn,
    ingreso_mxn,
    rentabilidad_operativa_mxn,
    resultado_final_mxn
  }
}

El nombre exacto puede variar SOLO si existe una convención física
mejor en el módulo.

Debe reportarse el shape final.

## Composer / respuesta

La respuesta por defecto de:

¿Cómo cerramos agosto?

debe priorizar el bloque financiero.

No iniciar con labels técnicos como:

ACTUAL COMERCIAL
TARGET COMMITMENT
FORECAST
ACTUAL FINANCIAL

si existe presentation A/B.

Esos estados pueden quedar como evidencia secundaria.

La salida visible debe ser ejecutiva y en español.

## Orden visible requerido

Periodo + planta

Estado financiero:
FINAL
o
VISTA FINANCIERA DISPONIBLE — NO FINAL

Venta
CASA
COMISIONISTA

Margen
Descuento
Impuestos
HG
HG$

Gastos operativos
Gastos corporativos
Gasto total

Rentabilidad operativa
Resultado final

Advertencia de no-final si aplica.

## Nulls

Si un campo individual no existe:

n/d

No cero inventado.

No omitir silenciosamente que la vista es NO FINAL.

## Gaps / limitations

En la respuesta ejecutiva por defecto NO introducir frases genéricas como:

"fuentes de información no disponibles"
"acciones no disponibles"
"movimientos de material no explicados"

solo por existir códigos genéricos de limitation/gap.

Solo mencionar una incidencia si existe evidencia específica
y es material para el cierre solicitado.

No convertir ausencia de Action Register en explicación financiera.

No inventar causalidad.

## TARGET / FORECAST

No eliminarlos del payload.

Pero para:

¿Cómo cerramos agosto?

no deben desplazar el resumen financiero principal.

TARGET_MISSING puede informarse al final si es útil,
pero no debe hacer que la respuesta parezca incompleta.

No afirmar que forecast=actual tiene significado causal.

## C1

¿Cómo cerramos agosto?

intent:
month_close_result

Debe presentar A/B/C.

Con fixture NO FINAL + vista disponible:
VISIBLE_NOT_FINAL.

Debe incluir todas las métricas disponibles del North Star.

## C2

Dame el cierre financiero de agosto.

Mismo month_close_result.

Debe obedecer A/B/C.

Si B:
decir explícitamente NO FINAL.

## C3

¿Cuál fue la rentabilidad operativa y el resultado final de agosto?

NO cambiar routing en este slice.

Preservar el comportamiento/ruta auditada actual.

## C4

¿Qué margen y descuento tuvimos en agosto?

NO cambiar routing historical_margin en este slice.

## C5

¿Qué rentabilidad tenemos?

Debe permanecer:

igf_status
+
MINI_FORECAST_PROY
del mes actual.

## C6

¿Cómo cerramos julio?

Misma composición A/B/C
para JULIO.

No usar agosto/septiembre accidentalmente.

## Regresiones obligatorias

001 C1 intent month_close_result
002 C1 period 2026-08
003 C1 no September mini
004 C1 codes shape fix preserved

005 presentation state enum exists
006 state FINAL supported
007 state VISIBLE_NOT_FINAL supported
008 state DATA_MISSING supported

009 FINAL requires financial actual FINAL
010 FINAL financial source has priority over mini
011 FINAL not silently replaced by latest
012 FINAL does not become nonfinal merely because mini exists

013 NOT_FINAL does not mutate financial_state
014 NOT_FINAL uses same target historical period
015 NOT_FINAL uses historical dashboard-view source
016 NOT_FINAL does not use current-month mini
017 NOT_FINAL clearly labelled no final

018 missing FINAL + missing view => DATA_MISSING
019 DATA_MISSING no invented financial values
020 DATA_MISSING may preserve actual commercial sale

021 venta field populated correctly in B
022 venta labelled commercial/real, not forecast
023 casa field same period
024 comisionista field same period
025 no forced casa+comisionista reconciliation

026 margen field same period/latest visible
027 margen unit MXN/kg
028 margen not labelled FINAL in B

029 descuento parity uses visible -abs(com_desc_kg)
030 descuento unit MXN/kg
031 discount ARR field not substituted for visible dashboard discount

032 impuestos field impuesto_kg
033 impuestos unit MXN/kg

034 HG uses hg_pct*100
035 HG unit %
036 HG$ uses abs(hg_kg/hg_pct)
037 HG$ unit MXN/kg
038 HG$ null/zero denominator safe
039 HG$ never NaN/Infinity

040 operativos = mini operativos
041 operativos labelled gasto operativo
042 corporativos = mini corporativos
043 gasto = mini gasto / proven contract
044 gasto reconciles operativos+corporativos in fixture

045 rentabilidad operativa = utilOperImporte
046 rentabilidad operativa not RENTAB UI
047 resultado final = resultadoFinalImporte
048 RENTAB UI semantic maps to resultado final
049 util formula ingreso-operativos preserved
050 final formula utilOper-corporativos preserved

051 August fixture utilOper = 3451953
052 August fixture resultadoFinal = 1073657
053 these fixture values not hardcoded into product
054 B labels both as "de esta vista"/NO FINAL

055 response includes Venta
056 response includes CASA
057 response includes COMISIONISTA
058 response includes Margen
059 response includes Descuento
060 response includes Impuestos
061 response includes HG
062 response includes HG$
063 response includes Operativos
064 response includes Corporativos
065 response includes Gasto
066 response includes Rentabilidad operativa
067 response includes Resultado final

068 B warning NO FINAL visible
069 response does not claim financial definitive close in B
070 generic source/actions unavailable prose absent by default
071 no unsupported material-movement prose by default
072 no causal claim invented

073 C2 obeys same A/B/C
074 C3 routing unchanged
075 C4 routing unchanged
076 C5 current MINI_FORECAST_PROY unchanged
077 C6 period July preserved

078 resolvePlantCodes shape fix regression PASS
079 month-close existing suite PASS
080 current-month profitability suite PASS
081 historical-margin focal PASS
082 client-profile resolution PASS
083 commercial-trend resolution PASS

084 no SQL
085 no schema
086 no migration
087 no new tool
088 no endpoint
089 no internal HTTP
090 no frontend
091 no server.js unless physically unavoidable; audit says not needed
092 no LIVE_DB
093 no hardcoded Acapulco/Puebla
094 no hardcoded August values
095 diff --check PASS
096 applicable gate PASS
097 NEW FAILURE = 0

## Expected delivery

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

PRESENTATION_SHAPE:
PRESENTATION_STATE_VALUES:

FINAL_SOURCE:
VISIBLE_NOT_FINAL_SOURCE:
DATA_MISSING_BEHAVIOR:

HISTORICAL_MINI_FUNCTION:
HISTORICAL_MINI_PERIOD_BINDING:

C1_INTENT:
C1_PERIOD:
C1_PRESENTATION_STATE:
C1_CURRENT_MONTH_MINI_BLOCKED:

VENTA_FIELD:
CASA_FIELD:
COMISIONISTA_FIELD:
MARGEN_FIELD:
DESCUENTO_FIELD:
IMPUESTOS_FIELD:
HG_FIELD:
HG_DOLLAR_FIELD:
OPERATIVOS_FIELD:
CORPORATIVOS_FIELD:
GASTO_FIELD:
OPERATING_PROFIT_FIELD:
FINAL_RESULT_FIELD:

DISCOUNT_PRESENTATION_RULE:
HG_PRESENTATION_RULE:
HG_DOLLAR_FORMULA:
OPERATING_PROFIT_FORMULA:
FINAL_RESULT_FORMULA:

NOT_FINAL_LABEL:
GENERIC_GAPS_SUPPRESSED:

C2_BEHAVIOR:
C3_UNCHANGED:
C4_UNCHANGED:
C5_MINI_FORECAST_PROY_UNCHANGED:
C6_PERIOD:

001..097:
SUITES:
FILES:
RISKS:

MONTH_CLOSE_CHANGED:
COMPOSER_CHANGED:
CHAT_CHANGED:
PLANNER_CHANGED:
HISTORICAL_MARGIN_CHANGED:
CURRENT_MONTH_SOURCE_SELECTOR_CHANGED:
SQL_CHANGED:
SERVER_CHANGED:
FRONTEND_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit implementación.

Crear reporte append-only:

docs/dev-loop/reports/IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
closure_reason: "HUMAN REVIEW PASS. month_close_result implementa composición financiera A/B/C: FINAL, VISIBLE_NOT_FINAL y DATA_MISSING, sin convertir una vista histórica runtime en cierre financiero FINAL."

human_acceptance: "PASS. La vista histórica NO FINAL usa el mismo periodo objetivo y puede presentar Venta, CASA, COMISIONISTA, Margen, Descuento, Impuestos, HG, HG$, Operativos, Corporativos, Gasto, Rentabilidad operativa y Resultado final, con advertencia explícita de que no constituye cierre financiero definitivo."

human_truth_decision: "financial.actual FINAL conserva prioridad. VISIBLE_NOT_FINAL nunca muta financial_state. DATA_MISSING no inventa ceros ni hace fallback silencioso. RENTAB UI corresponde a resultado final de la vista; rentabilidad operativa corresponde a utilOperImporte."

routing_acceptance: "Se acepta el ajuste focal en chat para que 'cierre financiero de <mes>' llegue a month_close_result en vez de PRE_CLOSE. Planner general, historical_margin, C3 y current-month MINI_FORECAST_PROY permanecen sin cambio."

known_limitation: "Un cierre FINAL almacenado puede no contener algunos importes que sí existen en la vista mini; esos campos deben permanecer n/d. No se autoriza rellenar un FINAL con mini sin etiquetar otra fuente."
