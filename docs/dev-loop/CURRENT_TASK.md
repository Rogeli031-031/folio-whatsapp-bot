task_id: IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001

task_type: IMPLEMENTATION
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-10T16:50:53-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-10"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 9f42c47f342341f3d943564aeee1afe7d71fc99e
result_report_path: docs/dev-loop/reports/IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001.md

objective: "Agregar una hoja 2027 al Excel de KPI Financieros /api/dashboard/dicf-excel, proyectada por CASA/COMISIONISTA x AUTOTANQUE/PORTATIL/CARBURACION, reutilizando la receta PROM del modal Pronóstico."

## Alcance

Producto:

KPI Financieros
→ Descargar Excel (Cliente Forecast)
→ GET /api/dashboard/dicf-excel

Agregar UNA hoja nueva:

2027

Las cuatro hojas existentes deben permanecer funcionalmente intactas:

Venta (Ton)
Descuento ($ por kg)
Margen ($ por kg)
Ingreso por cliente

La nueva hoja NO es por cliente.

Es agregada por:

CANAL × SUBCANAL

para la misma planta/scope que recibe actualmente el export dicf-excel.

## Fuera de alcance

NO Director IA.
NO planner.
NO director-ia-chat.
NO docs/director-ia.
NO schema SQL.
NO migraciones.
NO tool nueva.
NO endpoint nuevo.
NO cambio de permisos.
NO LIVE_DB.
NO frontend salvo que sea estrictamente necesario para conservar la descarga existente; preferencia = cero frontend.

## Preflight obligatorio

Antes de modificar producto:

1. localizar GET /api/dashboard/dicf-excel;
2. localizar builder actual del workbook;
3. localizar lib/dashboard-arr-forecast.js;
4. localizar la implementación física de:
   PROM mes (por día de semana);
5. localizar:
   - ventana lookback;
   - cutoff;
   - arr.pronostico_dias_seleccion;
   - inclusión/exclusión de fechas;
   - orden weekday;
6. demostrar cómo mapear venta/descuento diario a:
   canal
   subcanal;
7. verificar las categorías físicas equivalentes a:
   CASA
   COMISIONISTA
   AUTOTANQUE
   PORTATIL
   CARBURACION.

Si para producir los 6 pares se requiere:
- schema nuevo;
- tabla nueva;
- fuente inexistente;
- inventar clasificación;
- modificar las 4 hojas actuales de manera sustancial;

STOP.

No improvisar.

## Fuente PROM obligatoria

Usar la MISMA receta que el modal:

Pronóstico (como hoja Pronostico)

fila:

PROM mes (por día de semana)

para ESA planta.

Misma:

- ventana;
- cutoff;
- fechas;
- días marcados/desmarcados;
- lógica de selección.

Reusar la semántica física de:

lib/dashboard-arr-forecast.js

No crear una segunda definición incompatible de PROM.

## Días seleccionados

Respetar:

arr.pronostico_dias_seleccion

Un día desmarcado:

NO entra al PROM.

Un día seleccionado que físicamente participa según la receta actual:
se trata exactamente como el modal.

No cambiar la semántica del Pronóstico actual.

## Orden weekday

Usar:

LUNES
MARTES
MIERCOLES
JUEVES
VIERNES
SABADO
DOMINGO

Semántica ISO lunes→domingo.

NO confundir con JavaScript getDay():

domingo = 0

Si se usa Date/getDay internamente, normalizar explícitamente.

## Pares fijos

Exactamente seis:

CASA × AUTOTANQUE
CASA × PORTATIL
CASA × CARBURACION

COMISIONISTA × AUTOTANQUE
COMISIONISTA × PORTATIL
COMISIONISTA × CARBURACION

No agregar:

subcanal vacío
OTRO
SIN CLASIFICAR

Si una fila de origen no pertenece de manera defendible a uno de los seis:
no inventar su asignación.

## Unidades

PROM_v_ton[d]:
toneladas por día

PROM_ratio[d]:
MXN/kg

Venta hoja 2027:
toneladas

Descuento hoja 2027:
MXN/kg

Porcentaje:
ratio Excel 0..1 con formato %

## Layout hoja 2027

Nombre exacto:

2027

Columna A:

MES

Filas:

ENERO
FEBRERO
MARZO
ABRIL
MAYO
JUNIO
JULIO
AGOSTO
SEPTIEMBRE
OCTUBRE
NOVIEMBRE
DICIEMBRE
TOTAL

Encabezado de dos niveles.

Bloque 1:
VENTA PROYECTADA 2027 (TON)

6 columnas:

CASA
  AUTOTANQUE
  PORTATIL
  CARBURACION

COMISIONISTA
  AUTOTANQUE
  PORTATIL
  CARBURACION

Bloque 2:
% PARTICIPACION

mismas 6 columnas.

Bloque 3:
DESCUENTO PROYECTADO (MXN/KG)

mismas 6 columnas.

No agregar bloque de porcentaje de descuento.

## Calendario 2027

Calendario civil fijo del año 2027.

No bisiesto.

No descontar festivos.

No usar Date.now para construir el calendario.

Para cada mes calcular:

n[d] = cantidad de lunes/martes/.../domingo.

Control obligatorio:

ENERO 2027, lunes→domingo:

4, 4, 4, 4, 5, 5, 5

FEBRERO 2027:

4, 4, 4, 4, 4, 4, 4

El helper puede calcularlo determinísticamente;
no hace falta hardcodear los 12 meses.

## PROM por canal/subcanal

Para cada uno de los 6 pares y cada weekday d:

PROM_v_ton[d]

debe usar la misma receta de promedio del Pronóstico,
pero filtrando exclusivamente ese canal/subcanal.

También calcular:

PROM_ratio[d]

en MXN/kg,
con la misma ventana y selección de días.

## Reconciliación

Para cada weekday:

SUMA de PROM_v_ton[d] de los seis pares

debe reconciliar con el PROM total de planta del modal
para la misma:

- planta;
- ventana;
- cutoff;
- selección de días;

dentro de tolerancia de redondeo.

Si existen ventas de planta físicamente fuera de los seis pares,
NO falsear esta reconciliación.

En ese caso:

- documentar el residual;
- determinar su causa;
- STOP si impide cumplir el criterio autorizado.

No repartir el residual artificialmente.

## Fórmula venta mensual

Para mes M y par P:

venta_M_P =
SUM_d(
  PROM_v_ton_P[d]
  *
  cantidad_weekday_d_en_mes_M_2027
)

PROM vacío:
0 para esa contribución.

TOTAL anual de venta por par:

SUM de los 12 venta_M_P.

## Porcentaje mensual

Para mes M:

total_M =
SUM de las 6 ventas_M_P

Si total_M > 0:

pct_M_P =
venta_M_P / total_M

Las 6 participaciones deben sumar:

1.0

dentro de tolerancia numérica.

Si total_M = 0:

las 6 participaciones = 0

No dividir.

## Porcentaje TOTAL

Para cada par:

venta_anual_P =
SUM de sus 12 meses.

venta_anual_total =
SUM de los seis pares.

Si venta_anual_total > 0:

pct_TOTAL_P =
venta_anual_P / venta_anual_total

Las seis participaciones TOTAL suman 1.0.

Si venta_anual_total = 0:

seis participaciones = 0.

## Descuento mensual

NO sumar tasas.

NO hacer:

PROM_ratio[d] * n[d]

y llamarlo descuento mensual.

Usar promedio ponderado por volumen:

descuento_M_P =
SUM_d(
  PROM_ratio_P[d]
  *
  PROM_v_ton_P[d]
  *
  n_d_M
)
/
SUM_d(
  PROM_v_ton_P[d]
  *
  n_d_M
)

La unidad resultante:

MXN/kg.

Es equivalente a calcular pesos explícitamente:

pesos_desc =
PROM_ratio
*
PROM_v_ton
*
1000
*
n

y dividir entre kg proyectados.

El factor 1000 se cancela en la fórmula ponderada.

Si venta_M_P = 0:

usar 0 o vacío según convención del workbook existente.

No NaN.
No Infinity.
No inventar tasa.

## Descuento TOTAL anual

NO sumar los 12 descuentos mensuales.

Para cada par:

descuento_TOTAL_P =
SUM_M(
  descuento_M_P
  *
  venta_M_P
)
/
SUM_M(
  venta_M_P
)

Si venta anual = 0:

0 o vacío según formato existente.

## Signo

Preservar el signo físico de descuento existente.

No aplicar abs().
No invertirlo por presentación.

## Formato Excel

Reutilizar estilos del workbook actual donde sea razonable.

Venta:
formato numérico consistente con Venta (Ton).

Porcentaje:
formato porcentaje.

Descuento:
2 a 4 decimales consistente con hoja actual
Descuento ($ por kg).

Congelar encabezados si el workbook ya usa esa convención.

No agregar macros.

No reemplazar las hojas existentes.

## Integridad de las cuatro hojas anteriores

Antes y después generar workbook con fixture idéntico.

Verificar para las 4 hojas existentes:

- mismos nombres;
- mismo orden;
- mismas filas;
- mismas columnas;
- mismos valores de negocio;
- mismas fórmulas si existen.

Se aceptan únicamente cambios técnicos inevitables de metadata del xlsx,
no cambios de contenido funcional.

## Tests obligatorios

001 endpoint sigue generando workbook válido
002 sheetNames contiene las 4 hojas anteriores
003 sheetNames contiene 2027
004 2027 es adicional, no reemplazo

005 seis pares exactos
006 no subcanal vacío
007 CASA AUTOTANQUE
008 CASA PORTATIL
009 CASA CARBURACION
010 COMISIONISTA AUTOTANQUE
011 COMISIONISTA PORTATIL
012 COMISIONISTA CARBURACION

013 weekdays lunes→domingo
014 enero counts = 4/4/4/4/5/5/5
015 febrero counts = 4/4/4/4/4/4/4
016 calendario 2027 determinista
017 no Date.now para calendario

018 usa misma ventana PROM
019 usa mismo cutoff
020 respeta arr.pronostico_dias_seleccion
021 desmarcado no entra PROM
022 PROM por par usa canal
023 PROM por par usa subcanal

024 suma seis PROM weekday reconcilia total planta en fixture cerrado
025 no reparto artificial de residual

026 venta enero fórmula correcta
027 venta febrero fórmula correcta
028 venta diciembre fórmula correcta
029 venta TOTAL suma 12 meses

030 pct mensual correcto
031 pct mensual seis columnas suman 1 cuando total>0
032 pct mensual seis columnas 0 cuando total=0
033 pct TOTAL correcto
034 pct TOTAL seis columnas suman 1 cuando anual>0

035 descuento mensual weighted correcto
036 descuento no se suma como tasa×días
037 conversión ton/kg dimensionalmente correcta
038 descuento mensual mantiene MXN/kg
039 descuento conserva signo
040 descuento mes venta=0 no NaN/Infinity
041 descuento TOTAL weighted anual correcto
042 descuento TOTAL no suma tasas mensuales

043 cambio de planta cambia PROM fixture
044 calendario no cambia por planta

045 hoja 2027 tiene ENERO..DICIEMBRE
046 hoja 2027 tiene TOTAL
047 bloque Venta presente
048 bloque % presente
049 bloque Descuento presente
050 encabezado CASA/COMISIONISTA presente
051 encabezados subcanal correctos
052 unidades rotuladas correctamente

053 hoja Venta (Ton) intacta
054 hoja Descuento ($ por kg) intacta
055 hoja Margen ($ por kg) intacta
056 hoja Ingreso por cliente intacta

057 no Director IA
058 no planner/chat
059 no docs/director-ia
060 no schema/migrations
061 no tool nueva
062 no endpoint nuevo
063 no hardcode Puebla/Acapulco
064 no stored IGF/compromiso como fuente

065 tests focales PASS
066 tests actuales dicf-excel PASS
067 tests dashboard-arr-forecast relevantes PASS
068 Tier/regresión aplicable PASS
069 diff --check PASS
070 NEW FAILURE = 0

## Evidencia a entregar

PROM_SOURCE_FUNCTION:
PROM_LOOKBACK_RULE:
PROM_CUTOFF_FIELD:
PROM_SELECTED_DAYS_SOURCE:

CHANNEL_FIELD:
SUBCHANNEL_FIELD:
SIX_PAIR_COVERAGE:

WORKBOOK_BUILDER:
NEW_SHEET_BUILDER:

JAN_2027_WEEKDAY_COUNTS:
FEB_2027_WEEKDAY_COUNTS:

SALE_MONTH_FORMULA:
PCT_MONTH_FORMULA:
DISCOUNT_MONTH_FORMULA:
DISCOUNT_TOTAL_FORMULA:

FOUR_EXISTING_SHEETS_UNCHANGED:
OLD_SHEET_PARITY_METHOD:

PROM_RECONCILIATION:
PROM_RECONCILIATION_TOLERANCE:
PROM_RESIDUAL:

001..070:
SUITES:
FILES:
RISKS:

SERVER_CHANGED:
DASHBOARD_ARR_FORECAST_CHANGED:
NEW_LIB_ADDED:
FRONTEND_CHANGED:
DIRECTOR_IA_CHANGED:
SQL_CHANGED:
SCHEMA_CHANGED:
TOOL_ADDED:
ENDPOINT_ADDED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit de implementación.

Crear reporte append-only:

docs/dev-loop/reports/IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
closure_reason: "HUMAN REVIEW PASS. El export Cliente Forecast conserva las cuatro hojas existentes y agrega hoja 2027 con venta, participación y descuento MXN/kg por seis pares canal/subcanal, usando la receta PROM del Pronóstico."

human_acceptance: "PASS técnico. R-DICF-2027 70/70. Calendario 2027 determinista; descuento mensual y anual ponderados por volumen; cuatro hojas anteriores con paridad AOA; sin Director IA, schema, tool ni endpoint nuevo."

live_validation_pending: "Validar tras deploy el workbook real de una planta: cobertura/residual de los seis pares, reconciliación PROM, porcentajes mensuales y TOTAL, y descuento MXN/kg. No repartir residual real."
