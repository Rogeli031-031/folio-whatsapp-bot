# IMPL-IGF-DIARIO-PRONOSTICO-FILL-028

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-PRONOSTICO-FILL-028"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-pronostico-fill-028.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRONOSTICO-FILL-028.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "server.js"
  - "schema DB"
  - "UI del modal Pronóstico"
  - "algoritmo del modal"
  - "VBA"
  - "PRECIO"
  - "CONTROL DE COMPRAS"
  - "Director IA"
  - "frontend"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-IGF-DIARIO-PRONOSTICO-FILL-028 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 22f780d126e7488ef9ebbe5a741887d70162ff74 |
| branch | implementation/igf-diario-pronostico-fill-028 |
| schema_changes | false |
| data_mutation | false |

## Corte y setup

El Excel plant-scoped de IGFDiario arma un solo contexto antes de escribir hojas: `buildPronosticoProjectionContext`. Ese contexto llama a `buildPronosticoVentaDescMaps`, carga `arr.pronostico_dias_seleccion` con el mismo año, mes y `corte_day` del corte vigente, y arma los PROM con `computePromMesByDow` y `buildVentaPronosticoSheetLike`.

Si hay filas guardadas para ese corte, se usan tal cual. `selected=false` queda fuera del PROM. `selected=true` entra. Si no hay filas, queda el lookback que ya usa el modal. No se toma el setup de otro corte.

Un día de semana sin observaciones válidas deja el PROM vacío. No se escribe 0.

`server.js` no cambió. `fechaCorte` ya llega desde `upload_day` o `proyeccion_hasta`.

## Días reales y proyectados

Con proyección plant-scoped, la fecha manda:

- `fecha < corte`: valor real. Un cero real anterior al corte se conserva.
- `fecha >= corte`: PROM del día de semana. El día de corte entra como pronóstico.

El libro global de KPI no recibe proyección y conserva el camino anterior.

## Venta, comisiones y canales

Provincia Venta Diaria rellena los días desde el corte con el PROM weekday de venta. Su fila PROY usa `proy_total_ton` de la misma hoja Pronostico. El mapa IGF de proyección no sustituye ese total cuando hay contexto plant-scoped.

Provincia Comisiones rellena esos días con el PROM weekday de descuento en $/kg, con el signo contractual. El ACUM ponderado sigue calculándose solo con los días cerrados anteriores al corte.

CASA y COMISIONISTA calculan su propio PROM weekday con las mismas fechas seleccionadas. La venta de categoría solo entra si los kg son mayores que 0. El descuento de categoría es `ABS(monto) / kg` cuando kg es mayor que 0; si no, queda vacío. Un canal desconocido no se asigna a CASA. CASA más COMISIONISTA puede quedar por debajo del total de planta.

## Reconciliación

La hoja Pronostico y el modal leen el mismo paquete. En el caso de aceptación Puebla / corte 23/09/2026, el helper y la hoja dicen lo mismo:

- Mar PROM = 61.50
- PROY total = 1,474.00

Los días futuros de Provincia Venta Diaria se llenan con el PROM Lun–Dom de ese mismo paquete. El PROY de Provincia Venta es ese 1,474.00.

PRECIO sigue en tercera posición y CONTROL DE COMPRAS en cuarta. Su contenido no cambió. Pronostico sigue después.

## Pruebas

- `test/igf-diario-pronostico-fill-028.test.js`: pass (A–E, paridad modal/hoja, F–L, M–P, Q–Y, Z–AB).
- `test/igf-diario-precio-sheet-027.test.js`: pass.
- `test/igf-diario-ui-scoped-view-025.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/arr-forecast-excel-daily-category-023.test.js`: pass.
- `test/igf-open-pronostico.test.js`: pass.

No hubo cambios de frontend. No se corrió `npm run build`.
