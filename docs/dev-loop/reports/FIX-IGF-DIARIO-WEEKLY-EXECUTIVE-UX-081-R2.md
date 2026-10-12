# FIX 081-R2 — UX de la gráfica ejecutiva semanal

task_id: FIX-IGF-DIARIO-WEEKLY-EXECUTIVE-UX-081-R2
outcome: DONE

La fila agregada GASTO ($/kg) sale del visor. En su lugar hay Gasto Corporativo ($) y Gasto Operativo ($).

El importe diario ya existía en `day.expenses`. El grupo corporativo es `CORP_KEYS` (gasto corporativo, inversiones, impuestos federales). El grupo operativo es `OPER_KEYS` (nómina/gastos, IMSS/SUA, extraordinarios, provisiones de planta). El día suma esos importes. Si falta uno, el día queda null. El acumulado semanal suma solo los días válidos. No multiplica la tasa $/kg por los kilos. La tabla semanal sigue publicando cada componente en $/kg.

Cinco marcos navy envuelven indicador, semanas y deltas: Resultado; Gastos; Margen / Precio / Costos; HG / Volumen; Ventas por canal.

El selector abre con el botón, cierra con el segundo click, con click fuera y con Escape. La casilla no cierra la lista. La selección múltiple se conserva.

Cada punto lleva fecha, nombre, valor y unidad. El tooltip visible es el de ese punto y esa semana.

HG más negativo sigue verde y menos negativo sigue rojo. Descuento Compra sigue Pendiente. Planta y TODAS, PNG y Cerrar no cambian de contrato.

## Archivos

- `lib/igf-diario-weekly-plant.js` — hermanos `gasto_corporativo_mxn` y `gasto_operativo_mxn`, también en TODAS.
- `frontend-dashboard/lib/igf-diario-weekly-executive-chart.js` — filas, marcos y tooltip.
- `frontend-dashboard/components/IgfDiarioWeeklyExecutiveModal.tsx` — cierre del selector y tooltip HTML.
- Tests 081-R2 y el ajuste de conteo/orden en 081 y 081-R1.

No se tocó DB, migraciones, Excel ni el cálculo de la tabla.

## Evidencia

`docs/dev-loop/reports/evidence-081-r2/san-luis-grid.svg` renderiza San Luis, tres semanas, los cinco marcos, las dos filas de gasto y un tooltip abierto sobre Costo Gas LP del 12/10/2026. `todas-grid.svg` renderiza TODAS con los mismos marcos. Son salida del renderer, no un extracto de producción.

## Pruebas

081-R2 5/5. Regresiones 067, 077, 078-R2, 079, 080, 081 y 081-R1: 49/49. Frontend: compile y types PASS. El EPERM del symlink standalone es el de la unión de `node_modules`. `git diff --check` limpio.

secrets_check: sin secretos
human_decision_needed: revisión de fase 1. Sin PR, sin merge y sin deploy.
next_task_proposed: ninguna
