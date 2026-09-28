# IMPL-IGF-DIARIO-GRAFICA-RENTABILIDAD-NUEVOS-054

status: DONE_PENDING_REVIEW

base_sha: fca7d35a47901d95f9bd2bcd6cb23d274ea8c259

branch: impl/igf-diario-grafica-rentabilidad-nuevos-054

## Qué cambió

IGFDiario ya no abre el Excel. Abre `IgfDiarioGraficaModal`. Dentro, la métrica arranca en `$` (AF) y puede pasar a `$/kg` (AE). Descargar Excel arma la misma URL de `getDashboardExcelDownloadUrl` y solo entonces hace `window.open`.

`GET /api/dashboard/igf-diario-grafica` es de solo lectura. El gate de Todas (`igfDiarioTodasRequestBlock`) corre antes de `pool.connect()`. La planta individual pasa por `assertPlantaPermitidaDashboard` antes de leer sus datos.

## Equivalencia con el Excel

No hay una fórmula nueva. El día de planta replica la cadena de `writeDay`: B, H, M, T, O, V, Y, AA, AE = AA + AC, AF = AE * B. La semana es `SUM(AF) / SUM(B)`, no el promedio de los AE diarios. Provincia suma AF y divide entre la venta; si una planta con venta no está completa, el punto conserva el AF parcial y marca `complete=false`.

Ejemplo evaluado contra la hoja, 1 sep 2026, venta 10,000 kg, precio 20, costo 12, flete 1, HG -1,000, C&D 0.40, corporativo 206,858.60, operativo 59,970.36:

- AF = 64,326.8416
- AE = 6.43268416
- estado = real

El mismo día con costo 30 y flete 2:

- AF = -125,673.1584
- AE = -12.56731584

La semana 1 de ese libro coincide con las columnas AF y AE de la fila `Semana 1`. Con dos días de venta distinta, AE semanal difiere del promedio simple de los AE diarios.

## Gráfica

El eje incluye negativos, cero y positivos. Hay una línea horizontal en cero. Real es línea sólida y proyectado es punteada. La tendencia solo usa puntos `real` y `complete`, y cambia de AF a AE con el toggle. Las semanas van en la misma gráfica; una semana con real y proyectado queda `Mixta`.

Clientes nuevos salen de `newClientEvents`. La mini gráfica ancla en la última fecha real elegible: SEM -2, SEM -1 y, en la semana actual, solo los días ya elegibles. El top 10 suma kg reales desde el ingreso. El descuento es `SUM(monto) / SUM(kg)`. Puebla · CLIENTE UNO y Acapulco · CLIENTE UNO no se fusionan.

## Pruebas

`node --test test/igf-diario-grafica-rentabilidad-nuevos-054.test.js`: 7/7 pass. Cubren los 35 casos pedidos, agrupados.

Regresión: 025, 052, 053A, 053A-R1, 053A-R2, 053BC, 018 y 019. 70 pass en el lote de regresión y 22 pass en 054+025. `git diff --check` limpio.

## Consultas

Por planta y por ventana, no por día: ventas, descuentos, precio, compras, proveedores, HG, tarifas y la semilla de costo anterior. Corporativo y operativo se piden una vez por mes incluido, con el payload de ese mes, y se reutilizan entre plantas. Provincia no vuelve a consultar las plantas ya cargadas.

## Desviaciones

- Un día proyectado sin kg de canal queda `proyectado`, valor nulo y `complete=false`. No se inventa el pronóstico.
- No se llama `loadMonth` ni se crean proveedores. El costo, el flete y el HG salen de las tablas ya existentes y de los helpers de compras. Si falta una tabla o una tarifa, el componente queda nulo y la cobertura incompleta.
- El carry de flete anterior a la ventana no tiene semilla propia. El costo anterior sí. El día 1 toma el costo del día 2 solo cuando no hay costo consolidado previo.
- `5A` y `Todo` recorren un payload IGF por mes. No rellenan meses sin fuente con ceros.
