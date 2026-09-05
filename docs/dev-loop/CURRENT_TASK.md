task_id: FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T15:00:59-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05"
objective: Hacer que Director IA use la misma base de Delta Ingreso que IGF Forecast ARR → Clientes por mes (kg B por target IGF de planta + ingresoClienteMarginal/HG), no OLS de computeDeltaIngresoForecast.

in_scope:
  - lib/director-ia-chat.js (ruta ejecutiva delta ingreso / Clientes por mes)
  - lib/director-ia-planner.js solo si el routing ejecutivo debe declararse sin reinterpretar contratos
  - lib/dashboard-arr-forecast.js (reutilizar computeClientesDescuentoMes; no tercera fórmula)
  - extracción/reutilización de ingresoClienteMarginal o helper canónico compartido
  - lib/delta-ingreso-forecast.js solo para no convertirlo globalmente / no usarlo como source-of-truth de esta pregunta
  - lib/cliente-comentarios.js (enrichment posterior; no altera delta)
  - test/fixtures/director-ia-golden-cases.js (R-DELTA-PARITY-001..010; corregir R-DELTA-INCOME-010 a fuente ejecutiva, no debilitar)
  - test/helpers/director-ia-runtime-golden-harness.js
  - tests determinísticos físicamente afectados
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md

out_of_scope:
  - nueva fórmula rentabilidad
  - Delta Gastos
  - alertas/notificaciones
  - nuevos vs reactivados
  - causal inference
  - cumplimiento de compromisos
  - DB/schema/migrations
  - LIVE_DB
  - cambio visual frontend
  - docs/director-ia/
  - contratos congelados
  - merge
  - deploy
  - next task
  - convertir computeDeltaIngresoForecast globalmente

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md (evidencia CLOSED; no reabre la auditoría)
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) endurecer primero PRE-DEPLOY Runtime Gate R-DELTA-PARITY-001..010
  - BEFORE: TIER 1 / R-RUNTIME / R-MOVEMENT PASS y R-DELTA-PARITY rojo; STOP si no reproduce
  - actualizar R-DELTA-INCOME-010 a la fuente ejecutiva correcta, sin debilitar
  - reutilizar computeClientesDescuentoMes + lógica ingresoClienteMarginal
  - extraer helper canónico compartido si hace falta paridad sin tercera fórmula
  - respuesta determinista/grounded; comments después del ranking
  - reporte y commit en rama de tarea
  - dejar DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar antes de G1
  - implementar producto antes del Runtime Gate y BEFORE rojo
  - usar OLS / projectKgToMonthEnd como kg B de esta capacidad
  - hardcodear WAL MART u otros clientes LIVE
  - leer estado React del navegador
  - consultar LIVE_DB
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## North Star

Director IA debe ayudar a incrementar mes con mes:

- rentabilidad operativa;
- rentabilidad final;

y evitar retrocesos.

Para ello, la métrica ejecutiva de Delta Ingreso por cliente utilizada por Director IA debe ser la misma que utiliza:

IGF Forecast ARR
→ Clientes por mes
→ Delta Ingreso

No una métrica forecast paralela.

## Auditoría CLOSED de origen

Usar:

AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001

Hallazgo principal:

FIRST_BAD_BOUNDARY = FORECAST_PROJECTION / kg B

La diferencia aparece antes de Delta Ingreso:

Clientes por mes:
kg B = MTD del cliente × (target IGF planta / Σ MTD planta)

Director IA actual:
kg B = MTD + OLS individual por cliente / projectKgToMonthEnd

Además:

Clientes por mes:
ingresoClienteMarginal incluye HG.

computeDeltaIngresoForecast:
no incluye HG.

Por tanto las dos superficies NO representan el mismo contrato ejecutivo.

## Source of truth

Para preguntas ejecutivas sobre:

- Delta Ingreso por cliente;
- mayor impacto negativo;
- clientes que más deterioran ingreso;
- Top N de impacto;

la fuente debe tener paridad con:

computeClientesDescuentoMes
+
la misma lógica de ingresoClienteMarginal usada por Clientes por mes.

No copiar esa fórmula a una tercera implementación.

Reutilizar/refactorizar una función común si técnicamente es necesario y seguro.

La UI no puede continuar siendo el único lugar donde vive una parte esencial del cálculo ejecutivo si Director IA necesita consumir el mismo contrato.

## Pregunta objetivo

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para septiembre, y ponme sus comentarios.`

Para Acapulco debe usar exactamente la misma base de Delta Ingreso que Clientes por mes.

## Paridad obligatoria

Para un mismo:

- planta;
- periodo A;
- periodo B;
- version/cut;
- cliente;

deben coincidir:

- kg A;
- kg B;
- descuento A;
- descuento B;
- margen;
- HG si forma parte del contrato;
- ingreso A;
- ingreso B;
- Delta Ingreso;
- signo.

No basta que coincida únicamente Delta.

## Forecast de kg B

No usar OLS individual para esta capacidad si Clientes por mes no lo usa.

La lógica ejecutiva demostrada es:

targetKgPlanta =
venta_ton IGF × 1000

factor =
targetKgPlanta / SUM(kgRealMTDPlanta)

kgForecastCliente =
kgRealMTDCliente × factor

Debe reutilizar el cálculo canónico existente.

NO reimplementar aritmética desde este texto si ya existe físicamente en computeClientesDescuentoMes/helper relacionado.

## Ingreso

La auditoría demostró que Clientes por mes usa una lógica equivalente a:

ingresoClienteMarginal

que contempla:

kg × (margen − |descuento|)
+
componente HG

No implementar desde el contrato textual.

Reutilizar la función física existente o extraer un helper backend/shared canónico si hoy está atrapada exclusivamente en frontend.

El objetivo es una única semántica ejecutiva.

## HG

Esta tarea SÍ incluye HG porque la auditoría demostró que forma parte del ingreso mostrado por Clientes por mes.

No tratar HG como comentario/driver opcional si altera el valor de Delta Ingreso.

Determinar físicamente:

- fuente de HG;
- unidad;
- signo;
- periodo;
- cómo entra en ingreso A/B.

Mantener exactamente la semántica de Clientes por mes.

## Descuento

Usar la misma base de descuento que Clientes por mes para el cálculo canónico.

No asumir que simulaciones manuales del frontend deban llegar a Director IA.

Distinguir:

1. valor persistido/base que alimenta el cálculo normal;
2. simulación React no persistida.

La paridad obligatoria es contra el estado real de negocio disponible al backend.

No intentar leer estado local del navegador desde Director IA.

## Periodo

La pregunta explícita:

`septiembre`

debe resolver:

A = agosto 2026
B = septiembre 2026

con la misma semántica temporal que Clientes por mes.

No usar MAX(fecha) para sustituir silenciosamente el periodo solicitado.

## Version / target IGF

Debe resolverse con la misma regla que la superficie Clientes por mes.

No inventar FINAL.

Si la UI utiliza latest forecast vigente para septiembre, Director IA debe usar el mismo contrato.

## Ranking

Una vez obtenidos los Delta correctos:

filter:
delta_ingreso < 0

sort:
más negativo → menos negativo

Top N:
N solicitado.

El ranking debe ocurrir DESPUÉS de la paridad de fuente.

## Comentarios

Mantener el enrichment ya implementado:

arr.cliente_comentarios

por identidad segura/nombre normalizado + planta.

Comentarios se agregan DESPUÉS del ranking.

No deben alterar:

- kg;
- ingreso;
- delta;
- ranking.

Comentario ≠ causa.

## Aggregate Top N

SUM(delta_ingreso) de los clientes mostrados.

Debe coincidir con los Delta fuente.

No usar el agregado anterior basado en computeDeltaIngresoForecast.

## Regression-first obligatorio

ANTES de producto, endurecer PRE-DEPLOY.

Agregar:

R-DELTA-PARITY-001..010

### R-DELTA-PARITY-001 — kg A parity

Mismo fixture compartido por superficie ejecutiva y Director IA.

Expected:
kg A idéntico.

### R-DELTA-PARITY-002 — kg B forecast parity

Fixture donde:

target planta
/
SUM MTD

produce un factor conocido.

Expected:
kg B Director IA = kg B Clientes por mes.

Debe fallar con OLS individual.

### R-DELTA-PARITY-003 — ingreso A parity

Mismos inputs:
kg
margen
descuento
HG

Expected:
Ingreso A idéntico.

### R-DELTA-PARITY-004 — ingreso B parity

Expected:
Ingreso B idéntico.

### R-DELTA-PARITY-005 — Delta arithmetic parity

Expected:

Delta = B − A

idéntico en ambas superficies.

### R-DELTA-PARITY-006 — SIGN parity

Crear fixture equivalente conceptual a WAL MART:

la lógica Clientes por mes produce Delta positivo.

La antigua OLS produciría negativo.

Expected:
Director IA debe conservar el signo de Clientes por mes.

No hardcodear WAL MART en producto.

### R-DELTA-PARITY-007 — HG parity

Fixture donde retirar HG cambie materialmente ingreso.

Expected:
Director IA incorpora exactamente el mismo HG que source-of-truth.

### R-DELTA-PARITY-008 — discount parity

Misma tasa/base de descuento en ambas rutas.

No confundir simulación React con dato persistido.

### R-DELTA-PARITY-009 — target/version parity

Mismo target IGF / versión / periodo.

Expected:
misma venta objetivo de planta para construir kg B.

### R-DELTA-PARITY-010 — Top N only after parity

Fixture con varios clientes.

Primero construir Delta mediante source-of-truth.

Después:
filtrar negativos
→ sort
→ Top N.

Debe fallar si se rankean deltas de computeDeltaIngresoForecast.

## Protección de Runtime anterior

R-DELTA-INCOME-001..010 deben actualizarse únicamente donde su expectation de source-of-truth quedó invalidada por la auditoría.

NO debilitarlos.

Especial atención:

R-DELTA-INCOME-010 hoy certifica computeDeltaIngresoForecast.

Eso es un false-green demostrado.

El cambio debe convertirlo en protección de la fuente ejecutiva correcta, no borrarlo ni hacerlo menos específico.

## BEFORE obligatorio

Antes de modificar producto:

TIER 1:
PASS

R-RUNTIME:
PASS

R-MOVEMENT:
PASS

R-DELTA-INCOME existentes:
estado actual documentado

R-DELTA-PARITY-001..010:
deben quedar rojos donde computeDeltaIngresoForecast diverge.

Como mínimo deben demostrar FAIL de:

002 kg B forecast parity
004 ingreso B
005 delta
006 sign parity
007 HG
009 target/version/source
010 ranking-after-parity

PRE-DEPLOY:
FAIL

Si los nuevos casos quedan verdes con producto actual:
STOP.

## FIRST_BAD_BOUNDARY esperado antes del FIX

FORECAST_PROJECTION

No asumirlo sin reproducirlo en fixture.

## Product change

El cambio debe corregir la frontera causal.

Cadena futura deseada:

pregunta
→ delta income executive intent
→ periodo explícito
→ source-of-truth Clientes por mes
→ target IGF planta
→ proyección kg cliente
→ margen/descuento/HG
→ ingreso A/B
→ Delta
→ negativos
→ ranking
→ Top N
→ comments
→ response

## Arquitectura

Evitar:

frontend formula
+
backend formula #1
+
backend formula #2

Preferir extraer/reutilizar un helper canónico compartido si ésa es la forma más segura de lograr paridad.

No hacer HTTP interno.

No duplicar SQL innecesariamente.

No cambiar el frontend visible salvo que una extracción interna/shared exija importar el mismo helper sin cambiar comportamiento.

## Evidencia LIVE posterior

Después del deploy se validará contra Clientes por mes.

Casos de referencia humanos:

PUBLICO EN GENERAL
Dashboard -$221,564

GRUPO MOVE EMPRESARIAL
Dashboard -$99,074

NUEVA WAL MART DE MEXICO
Dashboard +$511,219

21 DURANGO
Dashboard -$37,048

62 CALZADA
Dashboard -$35,728

Estos importes son evidencia humana de un corte LIVE.

NO hardcodear en producto ni tests como verdad eterna.

Los fixtures deben ser determinísticos y conceptualmente equivalentes.

## Protecciones

No romper:

- commercial_trend;
- movement calendar;
- M9 historical delta income;
- client_profile;
- comments enrichment;
- historical_margin;
- IGF frontend;
- DICF.

No convertir computeDeltaIngresoForecast globalmente si otras superficies lo usan con su semántica propia.

La corrección puede crear una ruta ejecutiva específica basada en Clientes por mes.

## Out of scope

- nueva fórmula rentabilidad;
- Delta Gastos;
- alertas/notificaciones;
- nuevos vs reactivados;
- causal inference;
- cumplimiento de compromisos;
- DB/schema/migrations;
- LIVE_DB;
- cambio visual frontend;
- contracts;
- merge;
- deploy;
- next task.

## AFTER

TIER 1:
PASS

R-RUNTIME:
PASS

R-MOVEMENT:
PASS

R-DELTA-INCOME:
PASS con expectations corregidas a source-of-truth ejecutivo

R-DELTA-PARITY-001..010:
PASS

HTTP 5xx:
0

HARNESS FAILURE:
0

PRE-DEPLOY:
PASS

Ejecutar suites relacionadas con:

- Clientes por mes;
- ARR;
- IGF forecast;
- delta income;
- planner;
- period resolution;
- HG;
- discount;
- margin/version;
- client identity;
- comments;
- routing.

## LIVE_DB

live_db_authorized: NO

No consultar producción.

No es necesaria para el regression-first.

Validación exacta LIVE será post-deploy.

## Completion

DRAFT.

Esperar G1 humano.

No implementar.
No tests todavía.
No LIVE_DB.
No merge.
No deploy.

STOP.
