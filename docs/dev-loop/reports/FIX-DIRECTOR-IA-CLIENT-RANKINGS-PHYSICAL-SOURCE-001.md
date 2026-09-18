# FIX-DIRECTOR-IA-CLIENT-RANKINGS-PHYSICAL-SOURCE-001

```yaml
task_id: "FIX-DIRECTOR-IA-CLIENT-RANKINGS-PHYSICAL-SOURCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "ac5e555e6165f91005f1e5d1f048570345189c37"
branch: "fix/director-ia-client-rankings-physical-source-001"
g1_human: "AUTHORIZED + HUMAN + AUTHORIZED_BY_HUMAN intactos; implementer no los escribió"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `origin/main` verificado: `ac5e555e6165f91005f1e5d1f048570345189c37` (incluye PR #40 folio navigation / open-month ranking)
- Rama: `fix/director-ia-client-rankings-physical-source-001`
- No PR. No merge. No deploy. No next task.

## DB access status

`NOT_EXECUTED_NO_DATABASE_URL`

Evidencia del bloqueo en este entorno:

| Check | Resultado |
|---|---|
| `process` / shell `DATABASE_URL` | unset |
| `PGHOST` | unset |
| `.env` en el workspace | absent |
| `frontend-dashboard/.env` | absent |

No se ejecutó ningún `SELECT` vivo. **No se afirman conteos físicos** de `arr.ventas_diarias_cliente` ni de `arr.descuentos_diarios_cliente` para Acapulco 2026-07/08/09.

## Queries físicas planeadas (no ejecutadas)

Planta Acapulco (resolver `planta_id` + códigos ARR):

```sql
SELECT id, nombre, clave
  FROM public.plantas
 WHERE UPPER(TRIM(nombre)) = 'ACAPULCO'
    OR UPPER(TRIM(clave)) = 'ACAPULCO';

-- resolvePlantCodes: public.plantas ⋈ arr.provincia_plants + DISTINCT plant_code
-- de arr.ventas_diarias_cliente. Códigos reales: NOT_EXECUTED.
```

Observado por mes (`2026-07`, `2026-08`, `2026-09`):

```sql
SELECT COUNT(*) AS rows,
       COUNT(DISTINCT TRIM(cliente_norm)) AS clientes,
       SUM(kg) AS kg,
       MIN(fecha) AS min_fecha,
       MAX(fecha) AS max_fecha
  FROM arr.ventas_diarias_cliente
 WHERE UPPER(TRIM(plant_code)) = ANY($codes)
   AND fecha >= $start::date
   AND fecha <= $end::date;
```

Query exacta de CLIENT_RANKING (`queryMonthlySales`):

```sql
SELECT to_char(v.fecha::date, 'YYYY-MM') AS month,
       TRIM(v.cliente_norm) AS cliente_norm,
       TRIM(COALESCE(cat.canal, v.canal, 'Casa')) AS canal,
       TRIM(COALESCE(cat.subcanal, v.subcanal, '')) AS subcanal,
       SUM(v.kg) AS kg
  FROM arr.ventas_diarias_cliente v
  LEFT JOIN arr.cliente_categoria_mes cat
    ON UPPER(TRIM(cat.plant_code)) = UPPER(TRIM(v.plant_code))
   AND cat.year = EXTRACT(YEAR FROM v.fecha)::int
   AND cat.month = EXTRACT(MONTH FROM v.fecha)::int
   AND cat.cliente_norm = v.cliente_norm
 WHERE UPPER(TRIM(v.plant_code)) = ANY($1::text[])
   AND v.fecha >= $2::date
   AND v.fecha <= $3::date
   /* canalSqlFor */
 GROUP BY 1, 2, 3, 4;
```

Descuento (`queryMonthlyDiscount`):

```sql
SELECT to_char(d.fecha::date, 'YYYY-MM') AS month,
       TRIM(d.cliente_norm) AS cliente_norm,
       TRIM(COALESCE(cat.canal, 'Casa')) AS canal,
       TRIM(COALESCE(cat.subcanal, '')) AS subcanal,
       SUM(d.monto) AS monto
  FROM arr.descuentos_diarios_cliente d
  LEFT JOIN arr.cliente_categoria_mes cat
    ON UPPER(TRIM(cat.plant_code)) = UPPER(TRIM(d.plant_code))
   AND cat.year = EXTRACT(YEAR FROM d.fecha)::int
   AND cat.month = EXTRACT(MONTH FROM d.fecha)::int
   AND cat.cliente_norm = d.cliente_norm
 WHERE UPPER(TRIM(d.plant_code)) = ANY($1::text[])
   AND d.fecha >= $2::date
   AND d.fecha <= $3::date
 GROUP BY 1, 2, 3, 4;
```

Row counts reales: **no verificados**. Códigos planta ARR: **no verificados**. El fixture de tests usa `E3` solo como inyección; no se afirma que sea el código productivo de Acapulco.

## Source map ARR UI vs ranking

| Pregunta | Evidencia de código (no de DB viva) |
|---|---|
| Fuente ARR UI observado | `arr.ventas_diarias_cliente` (`lib/dashboard-arr-forecast.js`) |
| Forecast planta | `arr.forecast_mensual` (planta/canal/subcanal, no cliente) |
| Factor de proyección | Uniforme por planta: `targetKg / Σ kg observado`. Si Σ=0, factor 0. |
| ¿Hay observado parcial por cliente? | Sí, si la tabla diaria tiene filas del mes. Sin filas no hay kg proyectado por cliente. |
| ¿Hay forecast por cliente? | No hay tabla contractual por cliente. |
| ¿Solo forecast de planta? | Sí. |
| ¿El factor es uniforme? | Sí. El orden observado se conserva bajo la proyección. |
| ¿La UI usa la misma tabla que ranking? | Observado: sí (`ventas_diarias_cliente`). La UI añade `forecast_mensual` para proyectar. Ranking no cambia esa fuente. |
| ¿Otro source path? | `venta-proyeccion-mes` es proyección de planta por DOW, no ranking por cliente. |
| Descuento UI | Hoja clientes: `descKg = monto / kg` (derivado). Ranking: solo `SUM(monto)`. |

No se cambió la fuente de ranking. El root cause de “septiembre vacío vs ARR visible” no se demostró con filas físicas; la discrepancia defendible en código es **observado-only vs proyección de planta**.

## Root cause — compra

1. CLIENT_RANKING lee solo `arr.ventas_diarias_cliente` (kg observado).
2. El ARR visible de mes abierto puede mostrar kg proyectado = observado × factor de planta. Si el mes no tiene filas observadas, el ranking no tiene clientes; la UI puede seguir mostrando un total de planta.
3. El last-safe-cut previo asumía `mes-1`. Si agosto también está vacío, no caminaba a julio.
4. La respuesta humana filtraba tokens internos (`NO_ROWS_OBSERVED`, `LAST_SAFE_CUT`).

## Root cause — descuento

1. “qué clientes tienen mayor descuento” es semántica agregada (`DOMAIN=ARR`, `OPERATION=RANK`, `ENTITY_TYPE=CLIENT`, `METRIC=DISCOUNT`, `DIRECTION=HIGH`).
2. `buildClientRankingAnswer` trataba `wants_discount` como lookup individual: “No tengo evidencia de descuento para ese cliente”.
3. El planner podía caer a `client_profile` / `unknown` si no ganaba `client_discount_ranking`.
4. Follow-up de periodo debía conservar `client_discount_ranking`, no pedir `cliente_key`.

## Métrica de descuento canónica

La query de ranking solo materializa `SUM(d.monto)` → **`DISCOUNT_TOTAL_MXN`**.

| Métrica | ¿Existe en ranking? | ¿Existe en ARR UI? |
|---|---|---|
| `DISCOUNT_TOTAL_MXN` | Sí (`SUM(monto)`) | Sí (importe) |
| `DISCOUNT_PER_KG` | No en la query de ranking | Sí, derivado `monto/kg` |
| `AVERAGE_DISCOUNT_PER_KG` | No | No como promedio de promedios |

No se preguntó “¿total o por kg?”: la ambigüedad no es real para esta ruta. La respuesta humana declara “descuento total observado (MXN, no $/kg)”.

## Last safe cut

`walkBackYearMonths(period, 12)` busca hacia atrás el primer mes con filas observadas. Ejemplo contractual:

septiembre vacío → agosto vacío → julio con datos → julio.

Código interno: `LAST_SAFE_CUT`. Respuesta visible:

> No tengo datos observados por cliente cargados para septiembre de 2026.
> El último ranking disponible es julio de 2026:
> 1. …

## Routing precedence

`CLIENT_DISCOUNT_RANKING` > `CLIENT_PROFILE` cuando hay señales agregadas (clientes / quiénes / top / ranking / mayor / más alto / ordenar / principales) + métrica descuento.

| Frase | Intent |
|---|---|
| qué clientes tienen mayor descuento | `client_discount_ranking` |
| quién tiene mayor descuento | `client_discount_ranking`, limit=1 |
| qué descuento tiene GRUPO MOVE | `client_profile` |
| cuánto descuento dimos en septiembre | no ranking / no profile individual |
| qué cliente compró más | `client_ranking` |

No se pide `cliente_key` en ranking agregado.

## Pending period

A. `top 10 clientes que mas compran` → “¿De qué mes o periodo quieres el ranking?” → `septiembre` conserva `limit=10`, `metric=VENTA_TON`, `direction=TOP`, `channel=ALL`, `period=2026-09`.

B. `top 10 clientes que mas compran en septiembre` produce la misma semántica.

C. `que clientes tienen mayor descuento?` → “¿De qué mes o periodo quieres comparar los descuentos?” → `septiembre` reconstruye `CLIENT_DISCOUNT_RANKING`.

D. `qué descuento tiene GRUPO MOVE` permanece individual.

## 50/50 + follow-ups + anti-collisions

Viven solo en `test/director-ia-client-rankings-physical-source.test.js`. Producción no es phrasebook.

- 50 ranking compra → `DOMAIN=ARR`, `OPERATION=RANK`, `ENTITY_TYPE=CLIENT`, `METRIC=VENTA_TON`
- 50 ranking descuento → misma semántica con `METRIC=DISCOUNT`, `DIRECTION=HIGH` (salvo menor explícito)
- 20 follow-ups compra / 20 descuento
- 25 anti-colisiones
- variantes Casa / Comisionista / ALL / Acapulco / Puebla / top 5/10/20 / septiembre / agosto

## Presentación

Tokens internos no se muestran al usuario: `NO_ROWS_OBSERVED`, `LAST_SAFE_CUT`, `CLIENT_FORECAST_UNAVAILABLE`, `OBSERVED_PARTIAL`, `PROJECTED_ESTIMATE`. Permanecen en payload / `data_semantics`.

## Tests

Nuevo `test/director-ia-client-rankings-physical-source.test.js` — 18/18.

Sustitución autorizada de wording en:

- `test/director-ia-pending-clarification-and-ui-actions.test.js`
- `test/director-ia-folio-navigation-and-client-ranking-open-month.test.js`

## Regresiones

Pasaron (0 fallos no explicados):

- client rankings physical source 18/18
- pending-clarification 7/7
- folio navigation / open-month 9/9
- executive conversational backlog 15/15
- client_profile (incluye “kg y descuento de Erick…”)
- new clients
- folio COUNT / LIST / EXISTENCE / truthful / period-range / morphology
- compound client / entity-set continuity
- ARR input
- IGF reviewable supports
- Expense analytics
- SEH
- greeting / smalltalk

## Limitaciones

- Sin SELECT vivo: no hay `COUNT(*)` / `SUM(kg)` / códigos ARR reales de Acapulco.
- No se cambió la fuente de ranking (sigue `arr.ventas_diarias_cliente` / `arr.descuentos_diarios_cliente`).
- La proyección uniforme por cliente no se consulta a `forecast_mensual` en este slice; solo se etiqueta si el caller inyecta factor.
- No se editó `docs/director-ia/`.

## Cierre

**DONE_PENDING_REVIEW.** Este reporte no autoriza la siguiente tarea.
