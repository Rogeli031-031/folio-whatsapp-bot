task_id: FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-09T13:22:29-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-09"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: ac055bd9945cce551851e2d608a4a91e7113fdbb
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001.md

objective: "Hacer que rentabilidad, utilidad operativa y resultado final se resuelvan por IGF y no por unknown, EXECUTIVE_STATUS, commercial_trend ni continuidad comercial."

## Evidencia

Pregunta LIVE:

¿Qué rentabilidad tenemos?

Respuesta incorrecta observada:

- CASA
- COMISIONISTA
- toneladas
- pendiente OLS
- UP
- rango 30 días

Auditoría:

S1 aislada:
planner = unknown

S4:
¿Cómo estamos de rentabilidad?
planner = unknown
CEL EXECUTIVE_STATUS gana
commercial trend 30d/both

También existe riesgo de heredar parent_intent=commercial_trend
cuando la nueva pregunta financiera queda unknown.

## Decisión humana

RENTABILIDAD genérica:

→ IGF de la planta seleccionada
→ Utilidad Operativa
→ Resultado Final
→ variables financieras disponibles del snapshot

Debe tener precedencia sobre:

- EXECUTIVE_STATUS
- commercial_trend
- commercial_state
- continuidad/herencia comercial

No significa:

- tendencia de venta
- toneladas 30d
- CASA / COMISIONISTA
- OLS
- UP / DOWN

## Intención

Mapear explícitamente a:

igf_status

estas familias:

rentabilidad
rentabilidad operativa
utilidad operativa
rentabilidad final
resultado final

No convertir preguntas explícitas de margen en rentabilidad.

Preservar:

margen != rentabilidad

## North Stars

S1:
¿Qué rentabilidad tenemos?

S2:
¿Qué rentabilidad tenemos en Acapulco?

S3:
¿Cuál es nuestra rentabilidad?

S4:
¿Cómo estamos de rentabilidad?

S5:
¿Qué utilidad operativa tenemos?

S6:
¿Cuál es el resultado final?

S7:
¿Cuál es la rentabilidad operativa?

S8:
¿Cuál es la rentabilidad final?

Todos deben usar IGF.

## Precedencia

Una señal explícita de:

rentabilidad
utilidad operativa
resultado final

debe ganar sobre cue genérico:

cómo estamos
cómo vamos
estado
situación

Ejemplo:

¿Cómo estamos de rentabilidad?

NO:
EXECUTIVE_STATUS comercial

SÍ:
igf_status

## Continuidad

Caso obligatorio:

Turno previo:
¿Cómo vamos en CASA en los últimos 30 días?

parent_intent:
commercial_trend

Nuevo turno:
¿Qué rentabilidad tenemos?

La nueva señal financiera explícita debe ganar.

NO heredar commercial_trend.

## Periodo

Sin mes explícito:

usar la regla IGF existente:

currentYearMonthCdmx()

Con fecha de pruebas:
2026-09-09

→ 2026-09

NO:

trailing 30 días

NO cambiar la resolución existente de meses explícitos.

## Tool / source

Usar capacidad existente:

get_igf_snapshot
loadIgfArrAnnexForChat

Fuente existente:

igf.compromiso_lines

NO nueva tool.
NO SQL nuevo.
NO server.js.

## Datos obligatorios de headline

Para pregunta genérica de rentabilidad, si existen:

Utilidad Operativa:
util_oper_importe
util_oper_kg

Resultado Final:
resultado_final_importe
resultado_final_kg

Estos son métricas distintas.

NO igualarlas.

## Variables financieras disponibles

Mostrar, cuando existan:

venta_ton
margen_kg
com_desc_kg
impuesto_kg
hg_kg
gtos_apoyos_corp_kg

Unidades:

venta_ton = toneladas
margen_kg = MXN/kg
com_desc_kg = MXN/kg
impuesto_kg = MXN/kg
hg_kg = MXN/kg
gtos_apoyos_corp_kg = MXN/kg

## Datos NO disponibles en este snapshot

La auditoría determinó que el snapshot actual NO expone de forma defendible:

ingreso MXN
gasto operativo MXN nombrado
gasto total MXN

NO reconstruirlos.

NO inferirlos.

NO usar gasto_kg como si fuera gasto operativo,
porque el runtime actual indica que no representa esa fórmula.

Si se necesitan en la respuesta:

n.d.

o se omiten con una nota breve.

## Fórmulas

NO afirmar como fórmula probada:

Utilidad Operativa = Ingreso - Gasto Operativo

NO afirmar como fórmula probada:

Resultado Final = Utilidad Operativa - Gasto Corporativo

La auditoría las marcó:

NOT_PROVABLE

Este slice usa los valores almacenados.

## Shape S1

Respuesta esperada aproximada:

Acapulco — IGF vigente de septiembre 2026.

Utilidad operativa:
$X
$Y/kg

Resultado final:
$Z
$W/kg

Variables disponibles:
- Venta: X t
- Margen: X MXN/kg
- Comisiones y descuentos: X MXN/kg
- Impuestos: X MXN/kg
- HG: X MXN/kg
- Gastos/apoyos corporativos: X MXN/kg

No incluir:

CASA
COMISIONISTA
OLS
UP/DOWN
últimos 30 días

No causalidad.

## Shape S5

¿Qué utilidad operativa tenemos?

Abrir con:

util_oper_importe
util_oper_kg

Puede incluir resultado final como contexto secundario,
pero NO confundirlos.

## Shape S6

¿Cuál es el resultado final?

Abrir con:

resultado_final_importe
resultado_final_kg

Puede incluir utilidad operativa como contexto secundario.

## Ausencia

Si no existe snapshot o campo:

DATA_NOT_FOUND / n.d.

No hacer fallback a commercial trend.

No inventar.

## Surface autorizado

En scope:

lib/director-ia-planner.js
lib/director-ia-chat.js
tests focales Director IA
CURRENT_TASK
reporte

Modificar chat solo si es necesario para:

- precedencia CEL
- herencia de intent
- shape de respuesta IGF

No tocar server.js.

## Prohibido

NO SQL.
NO schema.
NO tool nueva.
NO endpoint nuevo.
NO dependencies.
NO server.js.
NO LIVE_DB.
NO deploy.
NO merge.
NO push main.

## Regresiones obligatorias

001 S1 planner = igf_status
002 S2 planner = igf_status
003 S3 planner = igf_status
004 S4 planner/ruta final = igf_status
005 S5 = igf_status
006 S6 = igf_status
007 S7 = igf_status
008 S8 = igf_status

009 S1 current period = 2026-09 con now 2026-09-09
010 S1 no trailing 30d
011 S1 usa get_igf_snapshot
012 S1 usa fuente IGF existente

013 S1 incluye util_oper_importe
014 S1 incluye resultado_final_importe
015 S1 distingue utilidad operativa de resultado final

016 S1 puede mostrar venta_ton
017 S1 puede mostrar margen_kg
018 S1 puede mostrar com_desc_kg
019 S1 puede mostrar impuesto_kg
020 S1 puede mostrar hg_kg
021 S1 puede mostrar gtos_apoyos_corp_kg

022 S1 no inventa ingreso
023 S1 no inventa gasto operativo MXN
024 S1 no inventa gasto total MXN
025 S1 no afirma fórmula no probada
026 S1 no usa gasto_kg como gasto operativo

027 S1 no CASA
028 S1 no COMISIONISTA
029 S1 no OLS
030 S1 no UP/DOWN
031 S1 no commercial_trend

032 S4 "cómo estamos" no activa EXECUTIVE_STATUS comercial
033 financial cue tiene precedencia sobre generic status cue

034 parent commercial_trend + S1 => igf_status
035 financial explicit cue rompe herencia comercial

036 "¿Cómo vamos?" genérico conserva comportamiento existente
037 "¿Cómo vamos en CASA últimos 30 días?" conserva commercial_trend
038 pregunta explícita de margen conserva semántica de margen
039 margen != rentabilidad
040 descuento != margen

041 S5 abre con utilidad operativa
042 S6 abre con resultado final
043 S7 abre con utilidad operativa
044 S8 abre con resultado final

045 falta util_oper => DATA_NOT_FOUND/n.d.
046 falta resultado_final => DATA_NOT_FOUND/n.d.
047 falta snapshot => no commercial fallback

048 no SQL nuevo
049 no tool nueva
050 no server.js
051 no schema
052 no deps
053 no LIVE_DB
054 no OpenAI inventando métricas

055 planner focal PASS
056 IGF focal PASS
057 CEL focal PASS
058 continuity/inheritance focal PASS
059 Tier1 PASS
060 pre-deploy --gate PASS
061 NEW FAILURE = 0

## Entrega

IMPLEMENTATION_SHA:
BASE_MAIN_SHA:

S1_INTENT:
S1_ROUTE:
S1_TOOL:
S1_SOURCE:
S1_PERIOD:

S4_INTENT:
S4_EXECUTIVE_STATUS_INTERCEPTED:

COMMERCIAL_PARENT_PLUS_S1:
COMMERCIAL_INHERIT_BLOCKED:

OPERATING_PROFIT_FIELD:
FINAL_RESULT_FIELD:

VARIABLES_PRESENTED:

INCOME_RECONSTRUCTED:
OPERATING_EXPENSE_RECONSTRUCTED:
TOTAL_EXPENSE_RECONSTRUCTED:
UNPROVABLE_FORMULA_STATED:

CASA_PRESENT:
COMISIONISTA_PRESENT:
OLS_PRESENT:
TRAILING_30D_PRESENT:

001..061:
SUITES:
FILES:
RISKS:

PLANNER_CHANGED:
CHAT_CHANGED:
CEL_PRECEDENCE_CHANGED:
INHERITANCE_CHANGED:
SQL_CHANGED:
TOOL_ADDED:
SERVER_CHANGED:
SCHEMA_CHANGED:
DEPS_CHANGED:
LIVE_DB_USED:

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW
commit implementación
reporte append-only

STOP.

No merge.
No push main.
No deploy.
No siguiente tarea.
closure_reason: "HUMAN REVIEW PASS. Rentabilidad, utilidad operativa y resultado final se resuelven por IGF. Las señales financieras explícitas tienen precedencia sobre EXECUTIVE_STATUS comercial y sobre herencia commercial_trend."

human_acceptance: "PASS. 001..061 PASS. S1-S8 -> igf_status según semántica autorizada. S4 no es interceptado por CEL. Parent commercial_trend + rentabilidad -> igf_status. Utilidad operativa y resultado final usan campos almacenados; no se reconstruyen ingreso, gasto operativo MXN ni gasto total; no se afirman fórmulas no probadas."
