# G4-PREP-IGF-DIARIO-REBALANCEO-GASTOS-064-R1

Estado: DONE_PENDING_REVIEW. El merge y el deploy quedan reservados al HUMAN_APPROVER.

## Referencias

- `origin/main`: `a3e546fccdf7e89b5e4c3b59b148079587106505`
- product SHA: `631d8cae393a509b378cc3a6e06a3165731c1cd4`
- delivery SHA: `0a94785e02745d31f39d76f99ec5e2085d74109f`
- Rama: `implementation/igf-diario-rebalanceo-diario-gastos-064-r1`
- Posición verificada antes de este prep: ahead 2, behind 0
- `git diff --check`: limpio

## Schema

Tabla `arr.igf_diario_gastos_distribucion_manual`.

Clave: `plant_code`, `year`, `month`, `concepto`, `fecha`.
`importe NUMERIC(18,2) NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_by TEXT NULL`.

`CREATE TABLE IF NOT EXISTS`. Solo guarda overrides. No guarda días automáticos. Sin migración y sin datos iniciales. No modifica `arr.igf_diario_gastos_desglose`.

Conceptos válidos: `gasto_corporativo`, `inversiones`, `impuestos_federales`, `presupuesto_nomina_gastos`, `presupuesto_imss_sua`, `extraordinarios`, `provisiones_planta`.

## Algoritmo

El monto mensual permanece fijo. El reparto es secuencial y opera en centavos.

Por cada día hábil, en orden cronológico: si el día es manual, se asigna su importe exacto; si es automático, se asigna `Math.round(saldo_centavos / hábiles_restantes)`. El último día automático recibe el residuo exacto.

Los días anteriores no cambian cuando aparece un override futuro. Un día manual no se recalcula para cuadrar. Los automáticos posteriores absorben la diferencia. No se permiten automáticos negativos. La suma final cierra exactamente al monto mensual.

Si el schedule es imposible, o el último hábil es manual y no absorbe el residuo, se rechaza con: «No hay días hábiles posteriores para redistribuir esta diferencia.»

Un cambio de monto mensual compatible conserva los overrides. Un cambio incompatible se rechaza antes de escribir y no borra los días fijos.

## API y UI

- `GET /api/dashboard/igf-diario-gastos-distribucion`
- `PATCH /api/dashboard/igf-diario-gastos-distribucion`

Un número, incluido 0, fija el día. `null` elimina el override y restaura el promedio. El día inhábil no es editable.

La UI abre Distribución diaria desde cada uno de los siete conceptos del modal de 064. Muestra monto mensual, promedio inicial, fijo acumulado, saldo pendiente, días restantes y promedio restante. Acciones: Editar importe y Restaurar promedio.

## Excel

Desde octubre 2026 el día hábil usa importe asignado / Venta KG. El inhábil queda en 0. Si B es 0 o está vacío, el $/kg del día queda en blanco y el importe monetario sigue en el cierre semanal.

El cierre semanal es la suma de los importes monetarios de esa semana / Venta KG semanal. TOTAL MES sigue siendo monto mensual / Venta KG mensual. La semana de Provincia usa las celdas reales de cada hoja de planta. Septiembre 2026 y los meses anteriores permanecen legacy.

## Fixture

Monto 953777.33, 27 hábiles, tres primeros días en 37412.69 cada uno.

- promedio inicial: 35325.09
- fijo acumulado: 112238.07
- saldo pendiente: 841539.26
- días restantes: 24
- promedio restante: 35064.14
- suma final: 953777.33

## Pruebas ya corridas en el delivery

- 064-R1: 11/11
- 064: 21/21
- 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036–041: 76/76
- `npm run build` del dashboard terminó en 0
- `node --check server.js` pasó
- `git diff --check` limpio

Este prep no modifica producto ni tests.

## Pull request

- Número: 106
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/106
- Base: `main`
- Head: `implementation/igf-diario-rebalanceo-diario-gastos-064-r1`
- Título: IMPL 064-R1: rebalanceo diario de gastos IGF Diario
- mergeable: true
- mergeable_state: clean
- merged: false

NO MERGE. NO DEPLOY.
