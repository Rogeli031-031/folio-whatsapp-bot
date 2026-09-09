task_id: AUDIT-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001

task_type: AUDIT
mode: READ_ONLY

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-09T16:20:11-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-09"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 2b67affe4ac3d95639a7809ac839e28a9ecce16a
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001.md

objective: "Localizar la fuente física de la proyección financiera vigente del IGF Forecast recalculado por ARR y explicar por qué Director IA usa hoy el snapshot IGF base para preguntas de rentabilidad del mes abierto."

## Evidencia LIVE

Planta seleccionada:
Acapulco

Mes:
septiembre 2026

Pregunta:

¿Qué rentabilidad tenemos?

Director IA responde actualmente desde IGF snapshot:

Venta:
1506.4 t

Utilidad operativa:
3373573 MXN

Resultado final:
955783 MXN

La pantalla IGF Forecast, después de:

Recalcular venta forecast (ARR)

muestra:

Venta:
1466.01 t

Utilidad operación - importe:
2921806 MXN

Resultado final - importe:
360106 MXN

Corte visual observado:
07/09/2026

Versión visual:
Sep 2026 · v2

## Semántica humana deseada

Para MES ABIERTO y pregunta ejecutiva actual:

¿Qué rentabilidad tenemos?
¿Cómo vamos de rentabilidad?
¿Qué utilidad operativa tenemos?
¿Cuál es el resultado final?

debe auditarse la posibilidad de usar:

FORECAST VIGENTE RECALCULADO

y no automáticamente el IGF/compromiso original.

No implementar esta regla todavía.

## Distinción temporal

Auditar físicamente la separación entre:

A) IGF / compromiso original

B) forecast ARR recalculado vigente del mes abierto

C) FINAL / cierre histórico

No asumir que son la misma tabla, versión, handler ni cálculo.

## North Star físico

Trazar exactamente cómo la pantalla llega a:

Acapulco
Venta = 1466.01
Util Operación Importe = 2921806
Resultado Final Importe = 360106

Determinar:

- endpoint
- handler
- loader
- funciones
- tablas
- cálculos
- joins
- cutoff
- versión
- campos físicos

No reconstruirlos por intuición.

## Dashboard trace obligatorio

Trazar:

botón "Recalcular venta forecast (ARR)"
→ handler frontend
→ request
→ endpoint backend
→ función de recálculo
→ persistencia o cálculo en memoria
→ refresh de tabla IGF Forecast
→ fila Acapulco

Determinar si al pulsar recalcular:

- se modifica una tabla;
- se genera una proyección temporal;
- se persiste una versión;
- solo se recalcula la venta;
- se recalculan también ingreso/utilidad/resultado;
- o la tabla final combina varias fuentes.

## Director IA trace obligatorio

Trazar:

¿Qué rentabilidad tenemos?
→ planner igf_status
→ get_igf_snapshot
→ loadIgfArrAnnexForChat / equivalente
→ fuente
→ versión
→ fila Acapulco

Explicar físicamente por qué obtiene:

1506.4
3373573
955783

en vez de:

1466.01
2921806
360106

## Fuentes a inspeccionar

Inspeccionar, si existen físicamente:

- rutas IGF Forecast
- recálculo ARR
- director-ia-igf-arr
- get_igf_snapshot
- loadIgfCommitSnapshot
- loadIgfArrAnnexForChat
- forecast projection
- igf-financial-final
- endpoints usados por la tabla IGF visual
- handlers relacionados con "Recalcular venta forecast (ARR)"

No asumir nombres no existentes.

## Cutoff

Auditar qué representa:

Fecha de carga (corte): 07/09/2026

Determinar si el forecast mostrado:

- usa datos ARR observados hasta ese corte;
- usa el último upload_day;
- usa la fecha del navegador;
- usa la última versión disponible;
- o alguna otra regla.

No inventar.

## Versiones

Auditar:

Sep 2026 · v2

Determinar:

- tabla/campo físico de version_number;
- si la proyección recalculada pertenece a v2;
- si get_igf_snapshot selecciona la misma versión;
- si una versión puede tener múltiples cortes/proyecciones.

## Venta

Determinar cómo se obtiene físicamente:

1466.01 t

Separar, si existen:

VENTA OBSERVADA AL CORTE
POR COMPRAR
PROYECCIÓN VENTA DEL MES
COMPROMISO / META IGF

No confundirlas.

Preservar invariante:

VENTA REAL / TOTAL MES AL CORTE
!= PROY VENTA DEL MES
!= COMPROMISO / META IGF

## Rentabilidad

Determinar cómo la tabla calcula o carga:

2921806
360106

Auditar si son:

- valores persistidos;
- derivados al vuelo;
- función existente;
- recomputación a partir de venta ARR;
- otro snapshot.

No afirmar fórmula hasta demostrarla.

## Variables visuales de Acapulco

La pantalla muestra además aproximadamente:

Margen:
7.12

Comisiones y descuentos:
-0.16

Impuestos:
0.93

HG:
-1.81

Ingreso:
12860573

Operativos:
9938767

Corporativos:
2561700

Gasto:
12500467

Auditar nombres físicos reales y cómo se relacionan con la proyección.

NO asumir que el snapshot de Director IA contiene las mismas columnas.

## Regla futura a evaluar

Auditar si el siguiente contrato es físicamente implementable SIN nueva fuente:

MES ABIERTO + lenguaje actual
→ forecast ARR vigente

MES CERRADO + cierre/tuvimos
→ FINAL defendible

presupuesto / compromiso / IGF original
→ snapshot IGF original

No implementar.

## Preguntas futuras que deben distinguirse

S1:
¿Qué rentabilidad tenemos?

S2:
¿Qué utilidad operativa tenemos?

S3:
¿Cuál es el resultado final?

S4:
¿Qué rentabilidad proyectamos para cerrar septiembre?

S5:
¿Cuál era la rentabilidad presupuestada de septiembre?

S6:
¿Cómo cerramos agosto?

Solo auditar la disponibilidad y fuente correcta.

## Ausencia

Si la fuente de forecast no contiene alguna variable:

DATA_NOT_FOUND

No reconstruir.

No usar la columna parecida más cercana.

## No implementar

SOLO LECTURA.

NO código de producto.
NO SQL nuevo.
NO schema.
NO migrations.
NO tool nueva.
NO endpoint.
NO dependencies.
NO LIVE_DB.
NO Render.
NO deploy.
NO merge.
NO push main.

## Entrega exacta

AUDIT_RESULT:

DASHBOARD_RECALCULATE_BUTTON_FILE:
DASHBOARD_RECALCULATE_HANDLER:
DASHBOARD_RECALCULATE_ENDPOINT:

DASHBOARD_TABLE_FETCH_FUNCTION:
DASHBOARD_TABLE_ENDPOINT:
DASHBOARD_TABLE_SOURCE:

FORECAST_RECALC_FUNCTION:
FORECAST_RECALC_SOURCE:
FORECAST_RECALC_PERSISTS:
FORECAST_RECALC_PERSISTENCE_TARGET:

FORECAST_CUTOFF_FIELD:
FORECAST_CUTOFF_RULE:
FORECAST_VERSION_FIELD:
FORECAST_VERSION_RULE:

ACAPULCO_FORECAST_SALES_VALUE:
ACAPULCO_FORECAST_SALES_FIELD:
ACAPULCO_FORECAST_SALES_SOURCE:

ACAPULCO_OPERATING_PROFIT_VALUE:
ACAPULCO_OPERATING_PROFIT_FIELD:
ACAPULCO_OPERATING_PROFIT_SOURCE:

ACAPULCO_FINAL_RESULT_VALUE:
ACAPULCO_FINAL_RESULT_FIELD:
ACAPULCO_FINAL_RESULT_SOURCE:

ACAPULCO_INCOME_VALUE:
ACAPULCO_OPERATING_EXPENSE_VALUE:
ACAPULCO_CORPORATE_EXPENSE_VALUE:
ACAPULCO_TOTAL_EXPENSE_VALUE:

CURRENT_DIRECTOR_TOOL:
CURRENT_DIRECTOR_SOURCE:
CURRENT_DIRECTOR_VERSION_RULE:
CURRENT_DIRECTOR_CUTOFF_RULE:

CURRENT_DIRECTOR_SALES_VALUE:
CURRENT_DIRECTOR_OPERATING_PROFIT_VALUE:
CURRENT_DIRECTOR_FINAL_RESULT_VALUE:

FIRST_DIVERGENCE:

DIRECTOR_SOURCE_IS_BUDGET_OR_COMMIT:
DASHBOARD_SOURCE_IS_ARR_FORECAST:

OBSERVED_SALES_FIELD:
TO_BUY_FIELD:
PROJECTED_SALES_FIELD:
COMMITMENT_SALES_FIELD:

OBSERVED_PLUS_TO_BUY_EQUALS_PROJECTED:
PROJECTED_DIFFERS_FROM_COMMITMENT:

OPERATING_PROFIT_RECALCULATED_WITH_ARR:
FINAL_RESULT_RECALCULATED_WITH_ARR:

FORMULA_OPERATING_PROFIT_PROVABLE:
FORMULA_FINAL_RESULT_PROVABLE:

EXISTING_DIRECTOR_LOADER_CAN_READ_FORECAST:
EXISTING_TOOL_CAN_READ_FORECAST:
EXISTING_SOURCE_ALREADY_AVAILABLE_TO_DIRECTOR:

CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_SERVER_CHANGE:
CAN_FIX_WITHOUT_FRONTEND_CHANGE:

OPEN_MONTH_FORECAST_RULE_PHYSICALLY_POSSIBLE:
CLOSED_MONTH_FINAL_RULE_PHYSICALLY_POSSIBLE:
ORIGINAL_IGF_RULE_PHYSICALLY_POSSIBLE:

S1_RECOMMENDED_SOURCE:
S2_RECOMMENDED_SOURCE:
S3_RECOMMENDED_SOURCE:
S4_RECOMMENDED_SOURCE:
S5_RECOMMENDED_SOURCE:
S6_RECOMMENDED_SOURCE:

SOURCE_BUG:
VERSION_BUG:
CUTOFF_BUG:
TOOL_GAP:
ROUTING_BUG:
PRESENTATION_BUG:
DATA_BUG:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear reporte append-only.

Commit auditoría.

STOP.

No implementación.
No siguiente tarea.
No merge.
No push main.
No deploy.
No LIVE_DB.
