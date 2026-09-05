task_id: FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T15:54:56-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - IMPLEMENTATION ONLY; NO MERGE; NO DEPLOY; NO LIVE_DB"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

objective: Hacer que Director IA use exactamente el mismo venta_ton efectivo / PROY / overlay que Clientes por mes usa para targetKg del periodo B cuando B es mes abierto forecast.

in_scope:
  - lib/delta-ingreso-clientes-por-mes.js (target efectivo del periodo B; no convertir defaultLoadIgfPlantMetrics en cambio global si otros consumidores requieren compromiso crudo)
  - resolver canónico mínimo del target IGF efectivo (PROY/overlay/upload_day) si hace falta extraerlo de la implementación física ya usada por Clientes por mes
  - lib/director-ia-chat.js solo si hay que inyectar ese resolver en computeDeltaIngresoClientesPorMes
  - R-DELTA-CUT-001..010 (crear ANTES de producto, solo tras G1)
  - fixtures determinísticos de TARGET_PROY_SOURCE (nombres sintéticos; no hardcodear clientes LIVE)
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001.md

out_of_scope:
  - fórmula nueva / ingresoClienteMarginal
  - HG
  - descuento persistido
  - ranking / comentarios
  - React simulations remotas
  - localStorage
  - cambio visual de Clientes por mes / Export Excel / IGF Forecast ARR
  - HTTP interno
  - computeDeltaIngresoForecast OLS
  - M9 historical Delta Ingreso
  - commercial_trend
  - movement
  - client_profile
  - DICF
  - historical_margin
  - financial diagnosis
  - Delta Gastos
  - alertas
  - notificaciones
  - nuevos/reactivados
  - commitment fulfillment
  - causal inference
  - DB/schema
  - migrations
  - docs/director-ia/
  - contracts
  - LIVE_DB
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md (CLOSED; evidencia; FIRST_BAD_BOUNDARY físico = TARGET_PROY_SOURCE)
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md (CLOSED; no reabre fórmula)
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md (CLOSED; no reabre el FIX de fórmula)
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) regression-first: crear R-DELTA-CUT-001..010 ANTES de producto
  - (solo tras G1 y BEFORE rojo en CUT mismatch) alinear target B de computeDeltaIngresoClientesPorMes con el PROY efectivo de Clientes por mes
  - extraer helper canónico mínimo si la lógica PROY está atrapada; no segunda implementación aproximada
  - ejecutar TIER1 / RUNTIME / MOVEMENT / DELTA-INCOME / DELTA-PARITY / PRE-DEPLOY --gate
  - redactar el reporte en result_report_path
  - dejar DONE_PENDING_REVIEW, STOPPED o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar o escribir tests mientras status sea DRAFT
  - consultar LIVE_DB
  - hardcodear valores LIVE en producto o fixtures
  - cambiar fórmula / HG / descuento / ranking / comentarios
  - leer o enviar React state / localStorage a Director IA
  - convertir defaultLoadIgfPlantMetrics en cambio global si otros consumidores requieren compromiso crudo
  - reproyectar el periodo A real/cerrado
  - inventar reglas de upload_day por día
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001.md

## Estado

Implementación completa en rama. Pendiente revisión humana. No merge. No deploy. No next task.

## North Star

Director IA debe priorizar a los clientes que más deterioran Delta Ingreso usando la misma realidad económica que:

IGF Forecast ARR
→ Clientes por mes
→ Exportar Excel.

No basta tener la misma fórmula.

Debe usar el mismo target económico efectivo del mes abierto.

## Auditoría CLOSED

Usar como evidencia contractual:

AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001

Hallazgo:

Ambas rutas ya comparten:

computeClientesDescuentoMes
+
ingresoClienteMarginal

y NO requieren otra fórmula.

FIRST_BAD_BOUNDARY conceptual exacto para este FIX:

TARGET_PROY_SOURCE

El reporte utilizó TARGET_VERSION_SELECTION, pero la diferencia física NO consiste en elegir otro version_number.

Ambas rutas seleccionan latest.

La divergencia consiste en:

Clientes por mes / Excel:
usa venta_ton efectiva PROY / overlay del IGF de mes abierto,
incluyendo la semántica upload_day demostrada.

Director IA:
defaultLoadIgfPlantMetrics
usa igf.compromiso_lines.venta_ton crudo de latest GLOBAL.

Por tanto:

misma versión
≠
mismo target efectivo.

## Evidencia LIVE

Acapulco
Agosto 2026 real vs Septiembre 2026 forecast.

Excel:

SERVICIOS ADMINISTRATIVOS
-227423

PUBLICO EN GENERAL
-221564

20 CUMBRES
-169708

CARBURACION PALMA SOLA
-102639

GRUPO MOVE EMPRESARIAL
-99074

ASOCIACION DE PROPIETARIOS
-96983

Top5:
-820408

Director IA:

SERVICIOS ADMINISTRATIVOS
-227423

PUBLICO
-210363

20 CUMBRES
-169708

PALMA SOLA
-102200

ASOCIACION
-96983

Top5:
-806677

Los casos con B = 0 coinciden exactamente.

Los casos con B > 0 divergen según una escala común compatible con targetKg distinto.

No hardcodear estos valores.

## Objetivo único

Para la capacidad ejecutiva de Delta Ingreso por cliente, hacer que Director IA use EXACTAMENTE el mismo:

venta_ton efectivo / PROY / overlay

que Clientes por mes usa para construir targetKg del periodo B cuando B es un mes abierto forecast.

No cambiar:

- fórmula de ingreso;
- HG;
- descuento;
- ranking;
- comentarios.

Solo corregir la frontera causal demostrada.

## Source of truth

Localizar y reutilizar la implementación física que resuelve el target PROY efectivo para Clientes por mes.

Debe incluir exactamente la misma semántica relevante de:

- year/month;
- plant;
- latest version;
- version_number;
- financial state si participa;
- upload_day;
- overlay;
- PROY;
- venta_ton efectivo.

NO copiar la regla desde este prompt si ya existe físicamente.

NO construir una segunda implementación aproximada.

## Arquitectura

Preferir:

canonical effective IGF target resolver
        ↓
Clientes por mes
        ↓
Director IA executive Delta Ingreso

y no:

frontend PROY logic
+
backend approximation distinta.

Si la lógica canónica está atrapada en frontend, extraer el mínimo helper reutilizable de forma segura.

No cambiar comportamiento visual.

No hacer HTTP interno.

## Periodo B

Para la consulta:

`... para septiembre`

con septiembre abierto:

A = agosto real
B = septiembre forecast

B debe consumir el mismo target PROY efectivo de septiembre que Clientes por mes.

No usar:

compromiso_lines.venta_ton crudo

si no representa el target efectivo que muestra la superficie.

## Periodo A

No romper la semántica del mes A real/cerrado.

El FIX está dirigido al target forecast del periodo B.

No transformar agosto real en forecast.

## upload_day

Es parte de scope porque la auditoría demostró que participa en la resolución PROY/overlay.

Rastrear y reutilizar su semántica exacta.

No inventar reglas por día.

## React simulations

FUERA DEL FIX.

La auditoría demostró que el Excel puede incorporar simulaciones locales React.

Director IA independiente NO tiene que reproducir estado local no persistido del navegador en esta tarea.

La paridad requerida es contra:

estado económico base/canónico disponible al backend.

No intentar leer localStorage o React state desde Director IA.

No mandar simulaciones al servidor.

## Margen / HG

NO cambiar.

Auditoría:
misma fuente si misma versión.

Mantener ingresoClienteMarginal canónico.

## Descuento

NO cambiar.

Usar descuento persistido/base ya establecido.

No incorporar simulaciones React.

## Client identity

NO cambiar salvo evidencia de regresión.

La auditoría rechazó client identity como FIRST_BAD_BOUNDARY.

## Ranking

NO cambiar algoritmo.

Después del Delta correcto:

delta < 0
→ más negativo a menos negativo
→ Top N.

MOVE-like debe recuperarse naturalmente por corregir el target, no por reglas especiales.

## Negative count

Debe derivarse del mismo dataset corregido.

No hardcodear 297/298.

## Regression-first obligatorio

Crear:

R-DELTA-CUT-001..010

ANTES de producto.

### R-DELTA-CUT-001 — effective target source

Fixture donde:

raw compromiso venta_ton
!=
PROY efectivo.

Expected:

Director IA usa PROY efectivo.

Debe fallar con producto actual.

### R-DELTA-CUT-002 — upload_day / overlay

Fixture determinístico donde upload_day altera el target efectivo.

Expected:

misma resolución que Clientes por mes.

### R-DELTA-CUT-003 — raw compromiso rejection

Demostrar explícitamente que la capacidad ejecutiva NO toma compromiso crudo cuando PROY efectivo difiere.

### R-DELTA-CUT-004 — kg B parity

Mismo MTD + mismo target efectivo.

Expected:
kg B idéntico a Clientes por mes.

### R-DELTA-CUT-005 — ingreso B parity

Con ingresoClienteMarginal compartido.

Expected:
Ingreso B idéntico.

### R-DELTA-CUT-006 — Delta/sign parity

Caso conceptual donde elegir compromiso crudo altera materialmente Delta/sign.

Expected:
signo del source-of-truth.

### R-DELTA-CUT-007 — ranking boundary

Fixture conceptual MOVE-like / ASOCIACION-like.

Con target equivocado:
cliente correcto cae debajo del corte.

Con PROY:
ocupa la posición correcta.

No hardcodear clientes reales.

### R-DELTA-CUT-008 — closed A protection

A real/cerrado permanece estable.

El cambio de target B no debe reproyectar A.

### R-DELTA-CUT-009 — no React simulation dependency

El cálculo backend debe ser determinístico sin localStorage/React state.

### R-DELTA-CUT-010 — single snapshot TopN/count/sum

Con un mismo dataset + target efectivo:

- Delta por fila;
- cantidad negativos;
- orden;
- Top N;
- suma Top N

deben derivar de una sola ejecución coherente.

## BEFORE obligatorio

Antes de modificar producto:

TIER 1 = PASS
R-RUNTIME = PASS
R-MOVEMENT = PASS
R-DELTA-INCOME = PASS
R-DELTA-PARITY = PASS

R-DELTA-CUT nuevos:

deben quedar rojos donde existe TARGET_PROY_SOURCE mismatch.

Como mínimo:

001 FAIL
002 FAIL
003 FAIL
004 FAIL
005 FAIL
006 FAIL
007 FAIL
010 FAIL

PRE-DEPLOY --gate = FAIL.

Si estos tests quedan verdes con producto actual:
STOP.

No implementar.

## FIRST_BAD_BOUNDARY en fixture

Reproducir:

TARGET_PROY_SOURCE

Debe quedar demostrada la cadena:

raw compromiso target
vs
effective PROY target
→ targetKg distinto
→ factor distinto
→ kg B distinto
→ ingreso B distinto
→ Delta/ranking distinto.

## Cambio de producto

Modificar únicamente lo necesario para que la ruta:

computeDeltaIngresoClientesPorMes

obtenga el target efectivo desde la misma semántica PROY que Clientes por mes.

No convertir globalmente otros consumidores de:

defaultLoadIgfPlantMetrics

si requieren compromiso crudo.

Preferir resolver el target específico de esta capacidad.

## Protección de otras superficies

No romper:

- Clientes por mes;
- Export Excel;
- IGF Forecast ARR;
- computeDeltaIngresoForecast OLS;
- M9 historical Delta Ingreso;
- commercial_trend;
- movement;
- client_profile;
- DICF;
- historical_margin;
- comments;
- financial diagnosis.

## R-DELTA-PARITY

Debe continuar PASS.

No debilitarlo.

Ahora R-DELTA-CUT debe cubrir la frontera que R-DELTA-PARITY no observaba:

target PROY real vs compromiso raw.

## LIVE_DB

NO.

live_db_authorized: NO.

No consultar producción.

Los fixtures deben reconstruir semántica de código de forma determinística.

## AFTER obligatorio

TIER 1 = PASS
R-RUNTIME = PASS
R-MOVEMENT = PASS
R-DELTA-INCOME = PASS
R-DELTA-PARITY = PASS
R-DELTA-CUT-001..010 = PASS

HTTP 5xx = 0
HARNESS FAILURE = 0

PRE-DEPLOY --gate = PASS

Ejecutar suites relacionadas con:

- ARR;
- Clientes por mes;
- IGF Forecast;
- PROY/overlay;
- upload_day;
- compromiso;
- Delta Ingreso;
- periodo;
- margin/HG;
- discount;
- comments;
- routing.

## Evidencia LIVE posterior

Después de deploy NO comparar contra números históricos a ciegas.

Generar/exportar un Excel fresco y lanzar la pregunta LIVE lo más cerca posible en el tiempo.

Comparar:

- universo de negativos;
- Top 5;
- cada Delta;
- suma Top 5.

Los valores:

-227423
-221564
-169708
-102639
-99074

son evidencia del corte observado, no fixtures eternos.

## Fuera de scope

- fórmula nueva;
- Delta Gastos;
- alertas;
- notificaciones;
- nuevos/reactivados;
- commitment fulfillment;
- causal inference;
- React simulations remotas;
- localStorage;
- DB/schema;
- migrations;
- contracts;
- LIVE_DB;
- cambio visual;
- merge;
- deploy;
- next task.

## Completion

DONE_PENDING_REVIEW.

NO merge.
NO deploy.
NO next task.

STOP.
