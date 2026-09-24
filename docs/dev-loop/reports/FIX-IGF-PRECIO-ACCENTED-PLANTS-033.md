# FIX-IGF-PRECIO-ACCENTED-PLANTS-033

## Identidad

```yaml
task_id: "FIX-IGF-PRECIO-ACCENTED-PLANTS-033"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-precio-plant-aliases-033.test.js"
  - "docs/dev-loop/reports/FIX-IGF-PRECIO-ACCENTED-PLANTS-033.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "PostgreSQL"
  - "server.js"
  - "CONTROL DE COMPRAS"
  - "HG EN KILOS"
  - "frontend-dashboard/.next (no commiteado)"
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
| task_id | FIX-IGF-PRECIO-ACCENTED-PLANTS-033 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 08f2d37dc9e8a00d89709f76e69760b43d3bc502 |
| branch | fix/igf-precio-accented-plants-033 |
| schema_changes | false |
| data_mutation | false |

## Lectura

`loadPrecioDiario` sigue consultando `arr.precio_diario` con el filtro de mes. Puebla y el resto de las plantas conservan `plant_code = $1`.

Solo estos pares leen los dos códigos:

| Código recibido | También lee |
|---|---|
| Queretaro | Querétaro |
| Querétaro | Queretaro |
| Tehuacan | Tehuacán |
| Tehuacán | Tehuacan |

Por fecha queda un solo precio. Si los dos códigos tienen precio válido, gana el código exacto recibido. Si el exacto no es válido, se usa el válido del otro código del mismo par. No se mezclan plantas ni se usa `unaccent`.

El arrastre, la precisión y el formato `0.00000000` de la hoja PRECIO no cambiaron.

## Pruebas

- `test/igf-diario-precio-plant-aliases-033.test.js`: pass.
- `test/igf-diario-precio-sheet-027.test.js`: pass.
- `test/igf-diario-precio-carry-forward-029.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.

41 pruebas, 0 fallos.

## Límite

La prueba usa un cliente sintético. No se leyó ni se escribió PostgreSQL en esta ejecución. Los 23 precios de septiembre de 2026 quedan como diagnóstico ya comprobado en pgAdmin, no como consulta de esta corrida.
