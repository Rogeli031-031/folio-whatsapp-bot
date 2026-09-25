# IMPL-IGF-DIARIO-PUEBLA-036

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-PUEBLA-036"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "lib/dashboard-arr-forecast.js"
  - "server.js"
  - "test/igf-diario-puebla-036.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PUEBLA-036.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/feriados-mx.js"
  - "frontend-dashboard/.next"
  - "cambios.xlsx"
contracts_consulted:
  - "AGENTS.md"
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
| task_id | IMPL-IGF-DIARIO-PUEBLA-036 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 1ed42aec58e3205defa2f871a9b9116abc2c59e0 |
| branch | feat/igf-diario-puebla-036 |
| schema_changes | false |
| data_mutation | false |

## Hoja

`IGF Diario Puebla` se reserva antes del resto y se llena después de Provincia Venta Diaria, Provincia Comisiones, PRECIO y CONTROL DE COMPRAS. Solo entra si la exportación es Puebla o GT Puebla.

B toma CASA y COMISIONISTA por encabezado de Puebla, multiplicados por 1000. C, F, G, X y AC buscan la fila de la misma fecha. El 6 de septiembre puede quedar en la fila 13 de CONTROL DE COMPRAS. X es el IMPORTE HG de la columna T. Y es X/B.

M3 y T3 salen de `computeIgfForecastMiniPayload` en la ruta del Excel, filtrados a Puebla, con el mismo year, month y uploadDay. No hay cifras fijas.

Los hábiles excluyen domingos y descansos LFT art. 74, con lunes móviles. Septiembre 2026 da 25. M y T quedan vacías y amarillas el 6, 13, 16, 20 y 27. El 16 conserva la venta. No hay lista empresarial de cierres; solo se aplican fechas si la exportación las recibe en `cierresEmpresariales`.

Las semanas van de lunes a domingo, con primera y última parciales, subtotal y TOTAL MES. B, D, X y AF se suman. Las métricas por kg se ponderan. Un faltante no se sustituye por cero ni por `IFERROR(...,0)`.

## Pruebas

- `test/igf-diario-puebla-036.test.js`: 4 pass.
- 024, 026, 027, 028, 029 y 030: pass en la corrida conjunta previa al ajuste final del assert de fecha.

## Límite

ExcelJS no recalcula el libro. La prueba compara el texto de las fórmulas. `lib/feriados-mx.js` sigue con fechas fijas y con el 2 de noviembre; esta hoja no lo usa.
