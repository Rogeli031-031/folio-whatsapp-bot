# FIX-COMPRAS-NOTA-CARGO-VISIBLE-088-R3

STATUS: DONE_PENDING_REVIEW

BASE_SHA: 7779d1304624c6977999e1b024e795d1e885e565
BRANCH: fix/compras-nota-cargo-visible-088-r3
PRODUCT_SHA: a61bfdf3cab21e2ec0e17951d7b2f474d064146b
FINAL_SHA: commit de documentación de esta corrección

## Columna

NOTA DE CARGO queda inmediatamente antes de CONSOLIDADO en la pantalla y en el Excel. Ocupa una sola celda, IMPORTE. Sigue visible aunque el mes no tenga notas y aunque `arr.compras_proveedores` todavía no tenga ese origen.

No se agregó a `DEFAULT_PROVIDER_NAMES`. No se crea el proveedor al abrir la pantalla. Las notas importadas siguen guardadas con kg = 0 e importe = J.

El origen reservado no entra al bloque de tarifa, a VALOR DEL FLETE SEGÚN ORIGEN, a la proyección ni a la lista genérica de Proveedores. La celda no abre el detalle y no habilita captura manual.

## Consolidado y HG

consolidado.kg suma solo compras físicas. consolidado.importe suma esas compras más la nota. costo_kg = importe / kg cuando kg > 0. Con cero notas el consolidado queda igual que antes.

`arr.compras_hg` no se modifica. HG EN KILOS no cambia. El costo y el importe de HG pueden moverse porque el costo consolidado ya incluye la nota.

## Excel

CONSOLIDADO KG no referencia la columna de la nota. CONSOLIDADO IMPORTE sí la suma. El flete usa solo proveedores físicos. Un día futuro sin nota real deja la celda vacía.

## Pruebas

R3: 9/9. 088, R1 y R2 pasan salvo la lectura de la carpeta real: `~$DETALLE DE COMPRAS PUEBLA.xlsx` no es un libro y ExcelJS lo rechaza. Esa falla es del archivo de bloqueo, no de esta corrección. Leyendo los libros reales, sin versionarlos: Puebla octubre = 0 notas, Uribe octubre = 4, Tehuacán octubre = 1.

Regresiones 013, 014, 020, 021, 022, 026, 030, 048, 052, 059 y 059-R1: PASS. 016 sigue fallando en BASE y en HEAD con el mismo resultado: la celda de flete consolidado es la fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))` y el test espera el número 200. No se reparó.

`node --check`: correcto. `npx tsc --noEmit`: correcto. `npm run build`: correcto. El enlace `standalone/node_modules` sigue en EPERM.

La pantalla de Compras no se recorrió en el navegador: exige sesión y base de datos.

## Fuera de esta entrega

No hubo migración, escrituras productivas, PR, merge ni deploy.
