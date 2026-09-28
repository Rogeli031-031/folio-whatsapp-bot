# FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1

## Identidad

```yaml
task_id: "FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-provincia-missing-no-cero-053a-r1.test.js"
  - "test/igf-diario-provincia-multiplanta-053a.test.js"
  - "docs/dev-loop/reports/FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "server.js"
  - "frontend-dashboard/"
  - "lib/compras-excel.js"
  - "lib/dashboard-arr-forecast.js"
  - "hojas IGF Diario individuales"
  - "PostgreSQL / schema"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "En domingo, M y T siguen vacíos por inhabil aunque haya venta. Semana y TOTAL MES no tratan ese vacío como dato faltante."
  - "X, Y, AF y AE no cambiaron."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 31cd8b6a2fa0b71100700bbd6ae6522078ef222c |
| branch | fix/igf-provincia-missing-no-cero-053a-r1 |
| schema_changes | false |
| data_mutation | false |

## Lectura

`weightedAcross` ahora exige cobertura. Si una planta tiene venta mayor que cero y la métrica no es numérica, la celda provincial queda vacía. Una venta en cero o vacía no bloquea. Con cobertura completa, el ratio sigue siendo la suma de métrica por kilos positivos dividida entre la venta de Provincia.

La misma cobertura aplica a F, G, M, T y AC. D usa la misma regla de hueco: si hay venta positiva sin ingreso, D y por tanto C quedan vacíos. B sigue siendo la suma de ventas. X y AF siguen sumándose. AE sigue siendo AF/B.

Semana y TOTAL MES de Provincia, con `strictCoverage`, quedan vacíos en el ratio si algún día del periodo tiene venta positiva y esa métrica vacía. Las hojas individuales siguen llamando `writeWeek` y `writeTotal` sin ese modo.

## Pruebas

Puebla 10,000 kg y Acapulco 30,000 kg sin costo: F Provincia vacío, no 3.00. Igual G, M, T, AC, D y C. B queda en 40,000. X suma −4,000 y AF suma 140,000; AE queda en 3.50.

Acapulco con venta 0 y métrica vacía: F Provincia = 12, y el resto de ratios toma solo Puebla.

Datos completos: precio 21.50, costo 13.50, flete 1.75, corporativo 1.75, operativo 1.25, C&D 0.25.

Día incompleto más día con F = 13: F de Semana 1 y F de TOTAL MES quedan vacíos. Lo mismo para precio, ingreso, flete, corporativo, operativo y C&D. Tras guardar y reabrir el XLSX, el costo diario y el de la semana siguen vacíos.

- `test/igf-diario-provincia-missing-no-cero-053a-r1.test.js`: pass.
- `test/igf-diario-provincia-multiplanta-053a.test.js`: pass, incluidos orden, soportes, export individual, alias y corte.
- Regresión IGF Diario 027, 025, 036–044, 047 y 050: pass.
- Conjunto: 51 pass, 0 fail.
- `git diff --check`: limpio.

## Desviaciones

El vacío de M y T en domingo no bloquea la semana ni el total. Ese vacío es el día inhábil, no un faltante de una planta con venta. X, Y, AF y AE conservan el contrato 053A.
