# Compras: importar fletes diarios desde Excel

Solicitud directa: agregar un boton para leer DatosPlanta y reemplazar el flete del proveedor abierto en una ventana de fechas elegida. Base: 24ab4fe8170c0764c5d26d5786d9e477c5dee83c. Rama: feature/compras-importar-flete-excel.

## Comportamiento

- Subir Excel de fletes dentro del modal FLETE: archivo, fechas, vista previa actual/Excel y guardado explicito.
- DatosPlanta: Fecha y bloque FLETE (TARIFA). TUXPAN PEMEX corresponde a PEMEX TUXPAN; TUXPAN IMPOR. a TOMZA TUXPAN; TEPEJI PEMEX a TOMZA TEPEJI.
- Solo cambia planta, proveedor y fechas elegidos. Conserva tarifa predeterminada y fechas externas. Guarda seis decimales e incluye ceros explicitos.
- Rechaza fechas ausentes o duplicadas, blancos, negativos, errores y formulas sin resultado numerico guardado. No recalcula formulas.
- Vista previa de solo lectura; guardado atomico con verificacion de cambios concurrentes y bloqueo compartido con la edicion manual.
- Sesion, permiso de compras y planta validados; proveedor consultado en servidor para impedir cruce de plantas o columnas manipuladas.
- Sin migracion ni cambios de esquema. No se cargo informacion en produccion.

## Validacion

- Archivo real E7 Seguimiento semanal.xlsx leido sin modificar: tres proveedores y 31 fechas de octubre reconocidos, incluidos ceros.
- Pruebas de importacion y flete diario: 12/12.
- Regresion focal: 159 pruebas, 158 pasan y una falla preexistente en compras-flete-tarifa-016 (espera numero donde exportacion existente devuelve formula); sin nuevas fallas.
- Compilacion de frontend y TypeScript correctos; git diff --check correcto.
- Navegador local con API simulada y archivo real: vista previa, invalidacion al cambiar fechas, cero, conservacion fuera del rango y un solo guardado ante doble clic correctos. Ninguna peticion a produccion.

Estado: implementado para revision en PR; sin merge ni despliegue de esta funcionalidad.
