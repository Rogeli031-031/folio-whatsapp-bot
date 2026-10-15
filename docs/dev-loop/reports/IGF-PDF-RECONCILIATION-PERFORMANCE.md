# Correccion de conceptos y descarga del PDF

Base: 05af784b49aaf3e065f31624b2e824c698cacae7.
Rama: fix/igf-pdf-reconciliation-performance.
Solicitud humana: conciliar gastos y HG con Excel, mostrar HG fisico,
quitar el detalle diario y agilizar la descarga conservando legibilidad.

El informe presentaba un componente corporativo con el mismo nombre que el
total de tres componentes de la grafica/Excel. Ahora tabla, cascada y aportes
agrupan corporativo (M: J+K+L) y operativo (U: Q+R+S+T). Las doce partidas
originales y la conciliacion de resultados conservan sus valores y signos.

Se agrega una tabla de importes anterior/actual y variacion real para gastos
y HG. La atribucion de tasas conserva su formula y recibe un titulo y
explicacion especificos: cambio firmado de tasa por volumen medio, con
efecto de volumen separado. No equivale al cambio del gasto pagado.

La fila KILOS estaba enlazada a venta_kg. Ahora muestra HG EN KILOS usando
hgKilos del resolvedor existente de Control de compras; se transporta como
hg_kilos en los dias de planta/TODAS. No se deriva del importe ni de ventas.
Ausencia permanece ausencia y cero permanece cero. No cambia hg_kg ($/kg),
hg_mxn ni las formulas financieras.

La descarga termina en Venta COMISIONISTA. Se elimina la solicitud XLSX,
su carga en ExcelJS y el render del detalle diario. Fuentes del informe se
cargan en paralelo y la precision geometrica baja a 0.001 pt. El PDF sigue
siendo vectorial con texto seleccionable. No se agregan dependencias.

Validacion: 104 pruebas (42 de reporte/series/Excel, cuatro regresiones
especificas, 57 de graficas/exportacion y una prueba de navegador); build
con validacion de tipos aprobado; diff --check limpio. La prueba de navegador
verifica cero solicitudes al Excel y errores de ARR incompleto. Composicion
local de la muestra en menos de 0.4 segundos; no es un benchmark productivo.

Se revisaron en privado el PDF y XLSX locales de Acapulco del usuario.
Las doce partidas y el resultado coinciden con las formulas de IGF Diario;
HG fisico coincide con las celdas diarias de Control de compras. La muestra
local corregida tiene cinco paginas, conserva los dos anexos ARR originales
y no incluye detalle diario. No se incorporan cifras ni clientes reales
como fixtures ni evidencias publicas del repositorio.

Hallazgo separado: los importes HG guardados como totales semanales en Control
de compras difieren ligeramente de la suma evaluada de sus formulas diarias.
IGF Diario y el PDF usan estas formulas diarias. Este cambio no modifica
el exportador Excel ni sustituye esas cifras para forzar concordancia.

Requiere backend actualizado para HG fisico; ante un backend anterior se
muestra ausencia, nunca kilos de venta. Sin merge, deploy manual, migraciones
ni escrituras en DB en esta revision.

## Revision tras observaciones de la muestra

La persona usuaria rechazo la segunda tabla de atribucion monetaria: necesita
las diferencias de importes que muestra la grafica. Esta revision sustituye
la presentacion descrita arriba: se elimina del PDF la tabla de aportes por
tasas, su efecto de volumen y su residual. Se conserva la cascada en $/kg.

La tabla monetaria usa los mismos datos que la grafica semanal: suma de los
importes diarios corporativos y operativos, y hg_mxn semanal. Ya no reconstruye
estos importes multiplicando tasas por venta total. Cada variacion es actual
menos anterior; ausencia y cero conservan su significado. El cambio oficial
del resultado se muestra separado, pues incluye todas las partidas.

Se compacta la nota de metodo para conservarla junto a su titulo y evitar una
pagina adicional casi vacia. La muestra privada de Acapulco queda en cuatro
paginas: analisis, grafica semanal, CASA y COMISIONISTA. Los dos anexos ARR
de esta muestra se conservan del PDF original del usuario; las primeras dos
paginas usan las semanas del Excel local. No se agregan datos reales al repo.

Validacion de esta revision: 27 pruebas especificas aprobadas, incluidas la
paridad entre importes del informe y de las graficas, ausencia/ceros y el
render del PDF sin atribucion monetaria. Build con tipos aprobado. PDF final
revisado por extraccion de texto y render: variaciones coincidentes, cifras
cuestionadas ausentes y cuatro paginas legibles. Sin merge ni publicacion.
