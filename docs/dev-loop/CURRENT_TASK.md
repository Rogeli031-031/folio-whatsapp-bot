task_id: AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001

task_type: AUDIT
mode: READ_ONLY

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-11T13:13:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-11"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: ec3b7178e38c5bb1b273055d56d9cd442ddcf917
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001.md

objective: "Determinar por qué ¿Cómo cerramos agosto? no presenta las variables financieras visibles en la fila Agosto 2026 del dashboard, identificar la fuente y semántica exacta de cada variable, y definir cómo debe componerse un cierre ejecutivo sin presentar datos no-FINAL como cierre definitivo."

## Evidencia LIVE

Planta:
Acapulco

Pregunta:

¿Cómo cerramos agosto?

Respuesta LIVE después del FIX de codes:

- ACTUAL COMERCIAL: 1504.39 t
- TARGET COMMITMENT: TARGET_MISSING_FOR_PERIOD
- FORECAST: 1504.39 t
- ACTUAL FINANCIAL: FINANCIAL_ACTUAL_NOT_FINAL

También genera:

- movimientos de material no explicados
- fuentes de información no disponibles
- acciones no disponibles

El TypeError de resolvePlantCodes ya está corregido.
NO reabrir ese FIX.

## Evidencia visual dashboard

Fila:

Agosto 2026

Valores observados por el humano:

VENTA:
1504.39 t
(UI redondea visualmente a 1,504)

MARGEN:
7.24 MXN/kg

DESCUENTO:
-0.22 MXN/kg

OPERATIVOS:
$9,664,071

CORPORATIVOS:
$2,378,296

GASTO:
$12,042,367

HG:
12.87

HG$:
$12.45

IMPUESTOS:
0.90

CASA:
832.74 t

COMISIONISTA:
671.65 t

RENTAB.:
$1,073,657

Control aritmético observable:

832.74 + 671.65 = 1504.39 t

9,664,071 + 2,378,296 = 12,042,367

## Deseo humano

Para:

¿Cómo cerramos agosto?

se quiere una respuesta ejecutiva que, cuando la evidencia lo permita,
lea las variables financieras de ese periodo y termine con:

RENTABILIDAD OPERATIVA
RESULTADO FINAL

Conceptualmente:

Acapulco — Agosto 2026

Venta:
CASA:
COMISIONISTA:

Margen:
Descuento:
Impuestos:
HG:
HG$:

Gastos operativos:
Gastos corporativos:
Gasto total:

Rentabilidad operativa:
Resultado final:

PERO:

No implementar ese formato todavía.

Primero demostrar físicamente:

- qué significa cada valor;
- cuál es FINAL;
- cuál es FORECAST/commit/snapshot;
- cuál puede llamarse cierre real.

## Regla crítica de verdad

La presencia de un número en el dashboard NO prueba por sí sola:

FINAL
CIERRE REAL
ACTUAL CONTABLE DEFINITIVO

Debe trazarse su fuente y financial_state.

No cambiar FINANCIAL_ACTUAL_NOT_FINAL sin evidencia.

## Pregunta central 1

¿Qué representa físicamente la fila Agosto 2026 mostrada?

Determinar si proviene de:

- IGF commitment;
- forecast;
- latest version;
- financial actual;
- FINAL;
- mini;
- combinación de fuentes;
- otra.

No asumir.

## Pregunta central 2

¿Por qué el dashboard puede mostrar:

MARGEN
DESCUENTO
OPERATIVOS
CORPORATIVOS
GASTO
RENTAB

mientras month_close_result dice:

FINANCIAL_ACTUAL_NOT_FINAL?

Determinar si esto es:

A) comportamiento correcto porque el dashboard muestra una vista no FINAL;

B) source mismatch;

C) version mismatch;

D) period mismatch;

E) state bug;

F) presentation/composition gap;

G) combinación.

## Trace dashboard obligatorio

Localizar físicamente:

frontend component de la tabla mostrada
→ fetch
→ endpoint
→ handler
→ loader
→ row builder
→ source(s)
→ versión
→ financial_state si existe.

Entregar nombres reales.

## Field parity matrix obligatoria

Para cada campo:

VENTA
MARGEN
DESCUENTO
OPERATIVOS
CORPORATIVOS
GASTO
HG
HG$
IMPUESTOS
CASA
COMISIONISTA
RENTAB.

documentar:

UI_LABEL:
FRONTEND_FIELD:
BACKEND_FIELD:
SOURCE_FUNCTION:
SOURCE_TABLE_OR_VIEW:
UNIT:
PERIOD_RULE:
VERSION_RULE:
FINANCIAL_STATE_DEPENDENCY:
MONTH_CLOSE_FIELD_IF_ANY:
AVAILABLE_TO_MONTH_CLOSE:
SEMANTIC_MEANING:

No inferir campos por nombre solamente.

## VENTA

Determinar:

- fuente exacta;
- si 1504.39 es ACTUAL COMERCIAL;
- si coincide por casualidad o contrato con FORECAST;
- si CASA + COMISIONISTA deben reconciliar siempre con VENTA;
- si CASA/COMISIONISTA representan toneladas.

## MARGEN

Determinar:

- campo físico;
- MXN/kg;
- si es FINAL, forecast, commitment o latest visible;
- si coincide con historical-margin contract.

No mezclar margen de planta con descuento cliente.

## DESCUENTO

Determinar:

- campo físico;
- unidad MXN/kg;
- signo;
- si -0.22 es descuento agregado de planta;
- universo temporal.

## OPERATIVOS

Determinar campo exacto.

Preservar semántica:

GASTO OPERATIVO

No llamarlo rentabilidad operativa.

## CORPORATIVOS

Determinar campo exacto y fuente.

## GASTO

Probar físicamente si:

GASTO =
OPERATIVOS + CORPORATIVOS

es contrato del row builder o solo coincide en agosto.

## HG y HG$

Determinar exactamente:

qué significa HG;
qué significa HG$;
unidad de cada uno;
campo físico;
si ambos pueden incluirse de forma defendible en respuesta ejecutiva.

No inferir significado por la etiqueta.

## IMPUESTOS

Determinar campo y unidad.

## CASA / COMISIONISTA

Determinar:

- campos;
- unidad;
- relación con venta total;
- si siempre forman una partición exhaustiva;
- qué ocurre con otros canales si existen.

## RENTAB.

Este punto es CRÍTICO.

Determinar exactamente qué significa la columna:

RENTAB.

No asumir que es:

rentabilidad operativa
ni
resultado final

hasta probarlo.

Entregar:

RENTAB_UI_FIELD:
RENTAB_BACKEND_FIELD:
RENTAB_SOURCE:
RENTAB_FORMULA:
RENTAB_SEMANTIC:
RENTAB_IS_OPERATING_PROFIT:
RENTAB_IS_FINAL_RESULT:

## Rentabilidad operativa

El humano quiere que aparezca explícitamente.

Determinar si existe físicamente un campo como:

utilOperImporte
rentabilidad_operativa
util_oper_importe
otro

o si se deriva.

Entregar:

OPERATING_PROFIT_SOURCE:
OPERATING_PROFIT_FIELD:
OPERATING_PROFIT_STORED_OR_DERIVED:
OPERATING_PROFIT_FORMULA:

Solo marcar fórmula PROVABLE si aparece físicamente en código/contrato.

Candidato NO autorizado hasta probar:

resultado final + corporativos

Para la evidencia visual:

1,073,657 + 2,378,296 = 3,451,953

NO declarar $3,451,953 como verdad en esta auditoría
salvo que el contrato físico lo pruebe.

## Resultado final

Determinar:

FINAL_RESULT_SOURCE:
FINAL_RESULT_FIELD:
FINAL_RESULT_STORED_OR_DERIVED:
FINAL_RESULT_FORMULA:

Probar si la columna RENTAB corresponde a este valor.

## Fórmulas

Auditar físicamente si para esta fuente histórica se cumple:

utilidad/rentabilidad operativa =
ingreso - gastos operativos

resultado final =
rentabilidad operativa - gastos corporativos

No trasladar automáticamente la fórmula del mini forecast al universo histórico.

Debe probarse para esta fuente.

## INGRESO

Aunque la captura no lo muestra como columna,
determinar si existe en la misma fuente y si es necesario
para explicar la rentabilidad operativa.

No agregarlo a la respuesta futura salvo que sea defendible y útil.

## financial_state

Localizar:

- tabla/campo exacto;
- ámbito GLOBAL o por planta;
- relación versión/mes;
- cómo se decide FINAL;
- cómo month_close_result lo consulta;
- cómo dashboard lo usa o ignora.

Entregar:

FINANCIAL_STATE_SOURCE:
FINANCIAL_STATE_SCOPE:
FINANCIAL_STATE_FOR_DASHBOARD_ROW:
DASHBOARD_REQUIRES_FINAL:
MONTH_CLOSE_REQUIRES_FINAL:

Sin LIVE_DB:

si no puede demostrarse el estado concreto de agosto,
decir UNKNOWN_FROM_CODE_ONLY.

No inventar.

## Versiones

Comparar dashboard vs month-close:

DASHBOARD_VERSION_RULE
MONTH_CLOSE_VERSION_RULE

Determinar si están leyendo la misma versión física.

## Periodo

Confirmar:

Agosto 2026
→ 2026-08

Sin contaminación de septiembre mini.

Entregar:

CURRENT_MINI_USED_FOR_AUGUST:
NO esperado.

## month_close_result payload

Trazar qué campos financieros ya carga actualmente:

- target
- actual commercial
- forecast
- actual financial
- gaps
- limitations
- evidence

Determinar si los valores de la fila financiera:

ya existen en el payload pero el composer no los muestra

O:

ni siquiera son cargados.

Entregar:

MONTH_CLOSE_FINANCIAL_FIELDS_AVAILABLE:
MONTH_CLOSE_FINANCIAL_FIELDS_MISSING:
FIRST_PARITY_GAP:

## Composer

Auditar el composer que produce la respuesta final.

Determinar si frases como:

"movimientos de material no explicados"
"fuentes de información no disponibles"
"acciones no disponibles"

provienen de evidencia explícita del payload
o de composición genérica.

Entregar:

MATERIAL_MOVEMENT_GAP_SOURCE:
SOURCE_UNAVAILABLE_GAP_SOURCE:
ACTIONS_UNAVAILABLE_SOURCE:

COMPOSER_ADDS_UNSUPPORTED_GAPS:
YES/NO

No implementar corrección.

## Preguntas de control

C1:
¿Cómo cerramos agosto?

C2:
Dame el cierre financiero de agosto.

C3:
¿Cuál fue la rentabilidad operativa y el resultado final de agosto?

C4:
¿Qué margen y descuento tuvimos en agosto?

C5:
¿Qué rentabilidad tenemos?

C6:
¿Cómo cerramos julio?

Determinar intent/ruta/fuente para cada una.

C5 debe preservar current-month MINI_FORECAST_PROY.

## Output futuro recomendado

Sin implementar, definir el shape correcto para tres estados:

A) FINANCIAL FINAL disponible

Debe poder decir:

Acapulco — cierre de Agosto 2026

Venta
CASA
COMISIONISTA
Margen
Descuento
Impuestos
HG
HG$
Operativos
Corporativos
Gasto
Rentabilidad operativa
Resultado final

B) números financieros disponibles PERO NOT_FINAL

Debe presentar los valores con etiqueta inequívoca:

"vista financiera disponible / no final"

NO decir que son cierre financiero definitivo.

C) datos financieros no disponibles

Fail-close.

No inventar ceros ni fórmulas.

## No implementar

NO cambios de producto.
NO SQL nuevo.
NO schema.
NO migrations.
NO tool nueva.
NO endpoint nuevo.
NO frontend.
NO server change.
NO LIVE_DB.
NO Render.
NO deploy.
NO merge.
NO push main.

## Entrega exacta

AUDIT_RESULT:

C1_INTENT:
C1_ROUTE:
C1_SOURCE:

DASHBOARD_COMPONENT:
DASHBOARD_FETCH:
DASHBOARD_ENDPOINT:
DASHBOARD_HANDLER:
DASHBOARD_ROW_BUILDER:
DASHBOARD_SOURCE:

DASHBOARD_PERIOD_RULE:
DASHBOARD_VERSION_RULE:
MONTH_CLOSE_VERSION_RULE:

FINANCIAL_STATE_SOURCE:
FINANCIAL_STATE_SCOPE:
FINANCIAL_STATE_FOR_DASHBOARD_ROW:
DASHBOARD_REQUIRES_FINAL:
MONTH_CLOSE_REQUIRES_FINAL:

FIELD_MATRIX:

VENTA_SOURCE:
VENTA_FIELD:
VENTA_SEMANTIC:

MARGEN_SOURCE:
MARGEN_FIELD:
MARGEN_SEMANTIC:

DESCUENTO_SOURCE:
DESCUENTO_FIELD:
DESCUENTO_SEMANTIC:

OPERATIVOS_SOURCE:
OPERATIVOS_FIELD:

CORPORATIVOS_SOURCE:
CORPORATIVOS_FIELD:

GASTO_SOURCE:
GASTO_FIELD:
GASTO_FORMULA_PROVABLE:

HG_SOURCE:
HG_FIELD:
HG_UNIT:
HG_SEMANTIC:

HG_DOLLAR_SOURCE:
HG_DOLLAR_FIELD:
HG_DOLLAR_UNIT:
HG_DOLLAR_SEMANTIC:

IMPUESTOS_SOURCE:
IMPUESTOS_FIELD:
IMPUESTOS_UNIT:

CASA_SOURCE:
CASA_FIELD:
CASA_UNIT:

COMISIONISTA_SOURCE:
COMISIONISTA_FIELD:
COMISIONISTA_UNIT:

CASA_PLUS_COMISIONISTA_EQUALS_VENTA_CONTRACT:

RENTAB_UI_FIELD:
RENTAB_BACKEND_FIELD:
RENTAB_SOURCE:
RENTAB_FORMULA:
RENTAB_SEMANTIC:
RENTAB_IS_OPERATING_PROFIT:
RENTAB_IS_FINAL_RESULT:

OPERATING_PROFIT_SOURCE:
OPERATING_PROFIT_FIELD:
OPERATING_PROFIT_STORED_OR_DERIVED:
OPERATING_PROFIT_FORMULA:
OPERATING_PROFIT_FORMULA_PROVABLE:

FINAL_RESULT_SOURCE:
FINAL_RESULT_FIELD:
FINAL_RESULT_STORED_OR_DERIVED:
FINAL_RESULT_FORMULA:
FINAL_RESULT_FORMULA_PROVABLE:

AUGUST_CANDIDATE_OPERATING_PROFIT_3451953_PROVABLE:
YES/NO

MONTH_CLOSE_FINANCIAL_FIELDS_AVAILABLE:
MONTH_CLOSE_FINANCIAL_FIELDS_MISSING:
FIRST_PARITY_GAP:

CURRENT_MINI_USED_FOR_AUGUST:

MATERIAL_MOVEMENT_GAP_SOURCE:
SOURCE_UNAVAILABLE_GAP_SOURCE:
ACTIONS_UNAVAILABLE_SOURCE:
COMPOSER_ADDS_UNSUPPORTED_GAPS:

C1_RESULT:
C2_RESULT:
C3_RESULT:
C4_RESULT:
C5_RESULT:
C6_RESULT:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

ROUTING_BUG:
SOURCE_BUG:
VERSION_BUG:
FINANCIAL_STATE_BUG:
PAYLOAD_GAP:
COMPOSER_GAP:
PRESENTATION_GAP:
DATA_BUG:

RECOMMENDED_FINAL_SHAPE_FINAL:
RECOMMENDED_FINAL_SHAPE_NOT_FINAL:
RECOMMENDED_FINAL_SHAPE_DATA_MISSING:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte append-only:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001.md

Commit auditoría.

STOP.

No implementación.
No siguiente tarea.
No merge.
No push main.
No deploy.
No LIVE_DB.
