# AUDIT-IGF-DIARIO-RESULTADO-DOMINGO-SINGLE-CHANNEL-075

Auditoría de solo lectura. Sin cambio de producto, sin tests, sin escritura en base de datos, sin PR funcional, sin merge y sin deploy.

## Base

- `origin/main`: `f6dbbe76021ce52f8f2559836239a95f415c2615`
- Título: `FIX 074: conservar venta cuando existe un solo canal (#120)`
- Padre: `5de98adc664185351afe0c69e29222903ba2b47e`
- Rama de esta auditoría: `audit/igf-diario-resultado-domingo-single-channel-075`
- El SHA de `origin/main` no se movió durante la auditoría.

## Evidencia de pantalla ya autenticada

San Luis, planta 5, semana 41, domingo 04/10/2026, después del deploy de 074:

| Concepto | Valor en pantalla |
| --- | --- |
| Venta en kilos | 1,701 |
| Precio | 21.13 |
| Ingreso generado | 35,937.02 |
| Costo del gas LP | 11.61 |
| Flete terrestre | 1.11 |
| Margen bruto | 8.41 |
| Gastos, inversiones, impuestos, nómina, IMSS, extraordinarios y provisiones | 0.00 |
| Margen neto | 8.41 |
| Sobrante antes del HG | 8.41 |
| HG | -2,747.74 |
| Sobrante con HG | 10.02 |
| Comisiones y descuentos | — |
| RESULTADO ($/kg) | — |
| RESULTADO (importe) | — |
| Faltantes | `com_desc_kg`, `resultado_kg`, `resultado_mxn` |

El ingreso 35,937.02 coincide con el precio almacenado 21.1269958848 por 1,701 kg. El HG -2,747.74 sobre 1,701 kg es aproximadamente -1.615 $/kg. 8.41 menos ese HG por kilo da el sobrante con HG 10.02. Esos tres conceptos ya numéricos no son el origen del guion.

## Consultas de solo lectura

Base `folios-db`. Transacción con `default_transaction_read_only = on`. Sin cadena de conexión en este reporte.

```sql
SELECT table_schema, table_name
  FROM information_schema.tables
 WHERE table_schema = 'arr'
   AND (table_name ILIKE '%descu%' OR table_name ILIKE '%comision%');
```

Tablas: `descuento_por_kilo_diario_provincia`, `descuentos_comision_extra`, `descuentos_diarias_cliente`, `descuentos_diarios_cliente`, `descuentos_factura`, `descuentos_notas`.

```sql
SELECT to_char(fecha, 'YYYY-MM') AS mes, COUNT(*)::int AS filas
  FROM arr.descuento_por_kilo_diario_provincia
 WHERE fecha BETWEEN DATE '2026-09-01' AND DATE '2026-10-31'
 GROUP BY 1;
```

Septiembre y octubre 2026: cero filas. La última fecha por planta, incluida San Luis, es 2026-02-28.

```sql
SELECT fecha::text, COUNT(*)::int AS filas, SUM(monto)::float8 AS monto,
       COUNT(*) FILTER (WHERE monto = 0)::int AS filas_monto_cero
  FROM arr.descuentos_diarios_cliente
 WHERE fecha BETWEEN DATE '2026-09-01' AND DATE '2026-10-10'
   AND (UPPER(TRIM(plant_code)) IN ('SAN LUIS', 'SANLUIS') OR plant_code ILIKE '%san%luis%')
 GROUP BY fecha
 ORDER BY fecha;
```

```sql
SELECT fecha::text, COUNT(*)::int AS filas, ROUND(SUM(kg)::numeric, 4) AS kg
  FROM arr.ventas_diarias_cliente
 WHERE fecha BETWEEN DATE '2026-09-01' AND DATE '2026-10-10'
   AND (UPPER(TRIM(plant_code)) IN ('SAN LUIS', 'SANLUIS') OR plant_code ILIKE '%san%luis%')
 GROUP BY fecha
 ORDER BY fecha;
```

La tasa de respaldo es `ROUND(SUM(monto) / SUM(kg), 2)` solo cuando el día tiene filas de descuento. Es el mismo cociente que arma el fallback del código.

## Qué hay en producción

El cargador semanal lee primero `arr.descuento_por_kilo_diario_provincia`. Si el mes trae alguna fila, no usa el respaldo. Septiembre y octubre no traen ninguna, así que el mes usa el respaldo: `SUM(monto)` de `arr.descuentos_diarios_cliente` dividido entre `SUM(kg)` de `arr.ventas_diarias_cliente`, con unión interna por planta y fecha.

San Luis, 2026-10-04:

- Ventas: canal Casa, 3 filas, 1,701.0000 kg. Comisionista: cero filas.
- `arr.descuentos_diarios_cliente`: 0 filas. El monto agregado es null.
- `arr.descuento_por_kilo_diario_provincia`: 0 filas en todo octubre, para todas las plantas.
- `descuentos_diarias_cliente`, `descuentos_factura`, `descuentos_notas` y `descuentos_comision_extra`: 0 filas de San Luis ese día. El semanal no lee esas cuatro tablas.

Días de comparación, misma planta:

| Fecha | Venta kg | Filas de descuento | Monto | Tasa de respaldo |
| --- | ---: | ---: | ---: | ---: |
| 2026-09-20 | 1,803.0600 | 1 | -2,500 | -1.39 |
| 2026-09-27 | 1,423.4400 | 0 | null | null |
| 2026-10-03 | 29,477.0200 | 23 | -127,732.68 | -4.33 |
| 2026-10-04 | 1,701.0000 | 0 | null | null |
| 2026-10-05 | 16,585.1000 | 24 | -64,058.79 | -3.86 |

Entre el 2026-09-01 y el 2026-10-10, los únicos días de San Luis con venta y sin filas de descuento son el 27/09 y el 04/10. El 20/09 también es un día corto de Casa y sí tiene descuento: una fila de -2,500 y tasa -1.39. Un día de un solo canal no implica ausencia de comisión.

En otros días del mismo rango hay filas de cliente con `monto = 0`. Esas filas conviven con montos distintos de cero, y el día sigue teniendo una tasa negativa. No hay un día del rango cuya suma de descuentos sea 0. La tabla primaria tampoco tiene un `descuento_por_kg = 0` de San Luis en septiembre u octubre, porque no tiene filas de esos meses.

## Fórmulas exactas

`com_desc_kg` no sale de los canales Casa o Comisionista. Sale de `descuento_por_kg`.

1. `loadCdMonthIndex` arma el índice del mes. Con la primaria vacía, el respaldo deja fuera cualquier fecha que no tenga filas de descuento.
2. `resolveComisionCd`, con fecha anterior al corte, devuelve el número finito del índice. Si no hay número, devuelve null. No rellena con el forecast del domingo y no convierte la ausencia en 0. Un 0 explícito sí sería finito y se conservaría. El 04/10 es anterior al corte 08/10 o 09/10, así que entra en esta rama.
3. En el día, si la venta es mayor que 0, `com_desc_kg = cdKg`. Si `cdKg` no es finito, queda null.
4. `resultado_mxn` del día solo existe si venta, precio, costo, flete, HG, `cdKg` y todos los gastos son finitos:

   `(precio - costo - flete) * venta - suma(gastos) - hg + cdKg * venta`

   Con `cdKg` null, el importe queda null. Los gastos en 0.00 del domingo son ceros numéricos; no son el bloqueo.
5. `resultado_kg` del día es `resultado_mxn / venta` cuando el importe existe. Si el importe es null, el $/kg también es null. No se calcula como sobrante con HG más la comisión.
6. En la semana, el promedio ponderado de `com_desc_kg` recorre cada día con venta mayor que 0. Si uno de esos días trae null, la métrica semanal completa queda null. La suma de `resultado_mxn` hace lo mismo. `resultado_kg` semanal sale de ese importe dividido entre la venta de la semana, así que también queda null.
7. `missing_components` son las métricas semanales en null. La pantalla imprime ese arreglo como `Faltantes: ...`. El frontend no inventa los tres nombres.

Antes de 074, la venta del domingo era null. Un día sin venta positiva no entra al ponderado ni a la suma cubierta, así que no anulaba la semana. 074 dejó la venta en 1,701. El día ahora sí entra, su comisión sigue null y anula las tres métricas de la semana aunque el 03/10 y el 05/10 sí tengan tasa.

## Ausencia y cero

No son el mismo estado.

- Ausencia: no hay fila. El 04/10 y el 27/09 están así. El resolver devuelve null.
- Cero explícito: existe fila de cliente con `monto = 0` en otros días, junto con montos distintos de cero. El código trataría un `descuento_por_kg` 0 como número. Ese 0 de día no está almacenado para el 04/10.

Las tasas vecinas del 04/10 son -4.33 y -3.86 $/kg. Sustituir la ausencia por 0.00 inventaría un valor que las tablas no contienen.

## Alcance

La regla no está escrita para San Luis ni para el domingo. Cualquier planta y cualquier día con venta mayor que 0 y sin tasa finita antes del corte deja null el día y, por el ponderado, la semana. En la ventana consultada, San Luis solo tiene ese hueco el 27/09 y el 04/10.

## Clasificación

**MIXED.**

- **DATA:** el 04/10 tiene venta Casa de 1,701 kg y ninguna fila de descuento o comisión en las tablas consultadas. El 27/09 repite el hueco. La tabla diaria de provincia no cubre estos meses; su última fecha es 2026-02-28. El respaldo, que es la fuente viva, tampoco tiene tasa porque no hay filas.
- **CONTRACT:** una tasa ausente antes del corte permanece null. Ese null anula el resultado del día. Desde que la venta del día es positiva, también anula las tres métricas de la semana. 074 no cambió `resolveComisionCd`.
- **CODE:** el código no descarta una tasa capturada. El 05/10, con el mismo `plant_code` San Luis, sí produce -3.86. No hay fila del 04/10 que el filtro esté perdiendo.

## Decisión

**B. La ausencia es null / desconocido.**

La evidencia alcanza para B y no alcanza para A. El modelo guarda el cero de cliente como fila, y este día no tiene fila. El contrato vigente devuelve null y no usa el forecast antes del corte.

No se simulan los tres valores. Calcularlos como 0.00, como el sobrante con HG o como ese sobrante por 1,701 kg sería la opción A, y la evidencia no la sostiene.

Si el negocio quiere ver 0.00 en un día con venta y sin filas de descuento, esa es una regla nueva. No está en el contrato actual y no se implementa en esta auditoría.

## Siguiente tarea, solo si un humano la autoriza

Decidir si un día con venta y sin filas de descuento sigue en null, o si una tarea nueva debe tratar esa ausencia como 0.00 $/kg para cualquier planta y cualquier fecha. La segunda opción cambiaría también el agregado semanal, porque hoy un solo día null anula la semana. No hardcodear San Luis, domingo ni 1,701.
