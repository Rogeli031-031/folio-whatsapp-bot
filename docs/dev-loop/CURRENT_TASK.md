task_id: AUDIT-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001

task_type: AUDIT
mode: READ_ONLY

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-09T11:31:26-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Zaragoza 2026-09-09"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: f5f150f28b30f2cdd12b8caacea4be1c51d899dd
result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001.md

objective: "Localizar por qué la pregunta ejecutiva ¿Qué rentabilidad tenemos? termina en tendencia comercial CASA/COMISIONISTA/OLS en lugar de responder utilidad operativa y resultado final desde IGF."

## Evidencia LIVE

Planta:
Acapulco.

Pregunta exacta:

¿Qué rentabilidad tenemos?

Respuesta incorrecta actual:

- rango de 30 días
- CASA
- toneladas vendidas
- pendiente OLS
- dirección UP
- COMISIONISTA
- toneladas vendidas
- pendiente OLS
- dirección UP
- tendencia al alza

Esto NO corresponde a rentabilidad financiera.

## Semántica humana objetivo

"¿Qué rentabilidad tenemos?"

debe significar, por default ejecutivo:

1. Utilidad Operativa / Rentabilidad Operativa
2. Resultado Final / Rentabilidad Final
3. Variables principales que construyen ambos

Fuente esperada:

IGF de la planta seleccionada.

NO:

commercial trend
CASA/COMISIONISTA
OLS
30-day sales trend

## Variables a auditar

Determinar físicamente cuáles campos del IGF disponible representan:

- venta / volumen forecast
- margen
- descuento / comisiones
- ingreso
- gasto operativo
- utilidad operativa
- gasto corporativo
- gasto total
- resultado final
- impuestos
- HG

No asumir nombres.

Trazar los nombres físicos reales y sus unidades.

## Fórmulas

Auditar si los datos físicos permiten afirmar:

UTILIDAD OPERATIVA
=
INGRESO - GASTO OPERATIVO

RESULTADO FINAL
=
UTILIDAD OPERATIVA - GASTO CORPORATIVO

Si el runtime usa otra fórmula o columnas distintas:

documentarlo.

NO redefinir fórmula durante la auditoría.

## Preguntas North Star

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

## Distinciones obligatorias

Auditar y preservar:

rentabilidad
!= ventas
!= toneladas
!= tendencia comercial
!= pendiente OLS

utilidad operativa
!= gasto operativo

resultado final
!= utilidad operativa

margen
!= rentabilidad

descuento/kg
!= margen

## Temporalidad

Determinar qué periodo debe usar hoy la pregunta genérica:

¿Qué rentabilidad tenemos?

Auditar si debe usar:

- IGF vigente/actual de la planta;
- último snapshot disponible;
- forecast vigente del mes;
- FINAL si mes cerrado.

NO inventar regla nueva.

Documentar la resolución física actual.

## Routing

Trazar exactamente:

question
→ pre-routing
→ planner
→ intent
→ mode
→ tool
→ source
→ answer builder

Encontrar el FIRST_DIVERGENCE que provoca la ruta comercial.

Determinar si el fallo está en:

- intent detection
- precedence
- planner
- pre-route
- inheritance
- tool selection
- answer builder
- source mapping

## Fuentes

Auditar:

- get_igf_snapshot
- igf_status
- financial_diagnosis
- plant_diagnosis
- commercial trend / commercial state
- dashboard KPI path si interviene

Determinar cuál ya contiene los datos necesarios.

## Respuesta objetivo futura

Formato aproximado, NO implementar:

"Acapulco — IGF vigente de septiembre 2026.

Utilidad operativa: $X

Se forma con:
- Ingreso: $A
- Gastos operativos: $B

Resultado final: $Y

Después de:
- Gastos corporativos: $C
- Gasto total: $D

Variables:
- Venta forecast: X t
- Margen: $X/kg
- Descuento/comisiones: $X/kg
- Impuestos: $X/kg
- HG: $X/kg"

No afirmar causalidad.

## Ausencia

Si algún dato no existe:

DATA_NOT_FOUND / n.d.

No reconstruir o inventar números.

## No implementar

SOLO AUDITORÍA.

NO código.
NO SQL.
NO schema.
NO dependencies.
NO LIVE_DB.
NO Render.
NO deploy.
NO merge.
NO push main.

## Entrega obligatoria

AUDIT_RESULT:

S1_CURRENT_INTENT:
S1_CURRENT_ROUTE:
S1_CURRENT_TOOL:
S1_CURRENT_SOURCE:
S1_CURRENT_PERIOD:
S1_FIRST_DIVERGENCE:

WHY_COMMERCIAL_TREND_WINS:

EXPECTED_EXECUTIVE_INTENT:
EXPECTED_TOOL:
EXPECTED_SOURCE:

IGF_CURRENT_PERIOD_RULE:
IGF_CURRENT_VERSION_RULE:
IGF_FINAL_VS_FORECAST_RULE:

OPERATING_PROFIT_FIELD:
OPERATING_EXPENSE_FIELD:
INCOME_FIELD:
CORPORATE_EXPENSE_FIELD:
TOTAL_EXPENSE_FIELD:
FINAL_RESULT_FIELD:

SALES_VOLUME_FIELD:
MARGIN_FIELD:
DISCOUNT_FIELD:
TAX_FIELD:
HG_FIELD:

OPERATING_PROFIT_FORMULA_PROVABLE:
FINAL_RESULT_FORMULA_PROVABLE:

ALL_REQUIRED_FIELDS_AVAILABLE:
CAN_FIX_WITHOUT_NEW_SQL:
CAN_FIX_WITHOUT_NEW_TOOL:
CAN_FIX_WITHOUT_PLANNER_CHANGE:
CAN_FIX_WITHOUT_SERVER_CHANGE:

S1_EXPECTED_SHAPE:
S5_EXPECTED_SHAPE:
S6_EXPECTED_SHAPE:

ROUTING_BUG:
PRECEDENCE_BUG:
SOURCE_BUG:
DATA_BUG:
PRESENTATION_BUG:

FILES_INSPECTED:
TESTS_RUN:
RISKS:

RECOMMENDED_NEXT_SLICE:

## Completion

Al terminar:

CURRENT_TASK -> DONE_PENDING_REVIEW
crear reporte append-only
commit auditoría
STOP

No implementación.
No siguiente tarea.
