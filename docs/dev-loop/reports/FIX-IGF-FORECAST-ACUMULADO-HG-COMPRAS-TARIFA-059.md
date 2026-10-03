# FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059

status: DONE_PENDING_REVIEW

base_sha: c907696506594860e286db432cb07cbf3f3f5c72

branch: fix/igf-forecast-acumulado-hg-compras-tarifa-059

## Revisión previa

La fila TOTAL MES de IGF Diario no está en una fila fija. `writeTotal` escribe la etiqueta y pondera H y Y con venta (columna B): suma(métrica × B) / suma(B) solo donde ambos son numéricos.

H diario es C − F − G (precio − costo kg − flete kg). Y diario es X / B (importe HG / venta kg).

El mini-resumen de IGF Forecast calcula INGRESO como (Margen + Com. y Desc. − HG) × venta ton × 1000. OPERATIVOS y CORPORATIVOS no dependen de Margen ni de HG. Zona Provincia pondera $/kg por venta y suma los importes.

La TARIFA consolidada de compras es importe de flete / kilos, y queda vacía si algún proveedor con kilos no tiene tarifa. El día 1 sin compra no arma ese cociente. O y R ya heredan costo; la tarifa consolidada no.

## Margen y HG

El modo Forecast deja el mini tal como llega del servidor.

IGF Diario acumulado lee, por planta, el acumulado del mes completo (no una celda H48/Y48):

- Margen = H ponderado de TOTAL MES.
- HG = −Y ponderado de TOTAL MES.

Con eso se recalculan INGRESO, Util. Operación − Importe y Resultado Final − Importe. OPERATIVOS y CORPORATIVOS se conservan porque no dependen de esas dos variables; GASTO sigue siendo su suma. Zona Provincia se vuelve a armar con las plantas resultantes. Volver a Forecast usa otra vez el mini original. No hay escritura en DB.

## TARIFA día 1

Si el día 1 no tiene kilos y tarifa consolidada propia, se usa la última TARIFA consolidada anterior al día 1: el último día con compras y tarifas suficientes para el mismo flete consolidado ponderado. Se escribe en `fleteTarifaCol`, no en una columna fija. El dato propio del día 1 gana. Sin histórico la celda sigue vacía. No se usa 0 ni el día 2. No se insertan tarifas.

## Desviación

`lib/igf-diario-grafica.js` no estaba en `in_scope`. Ahí ya se materializa el día de IGF Diario, y la respuesta existente de la gráfica es la que el selector lee. Se agregó `acumulado` a esa respuesta. No se editó `server.js` ni se creó otra ruta.

## Pruebas

059, 052, 036, 037, 054, 054-R1, 054-R3, 055, 024 y el orden de hooks de Forecast: PASS.

`frontend-dashboard` `npm run build`: PASS.

`git diff --check`: limpio.

No se volvió a correr el baseline histórico de 014 y 016.
