# Flete Excel: todos los proveedores

Solicitud directa del usuario: una sola carga debe actualizar todos los proveedores presentes en DatosPlanta, no solo el proveedor del modal abierto.

Base: 88cfeccc10f75d8b555ccef0c6c2f7a9d7144182. Rama: feature/compras-flete-excel-todos.

- La API obtiene los proveedores de la planta autorizada y vincula las tres columnas por nombre: PEMEX TUXPAN, TOMZA TUXPAN y TOMZA TEPEJI. Rechaza nombres ausentes o duplicados y cualquier celda invalida antes del guardado.
- La vista previa identifica proveedor, fecha y tarifas actual/nueva. El usuario guarda los tres juntos para el rango seleccionado.
- Una transaccion incluye todas las filas. Bloqueos por proveedor en orden estable y token conjunto detectan cambios posteriores a la vista previa. Cualquier fallo revierte toda la carga.
- Conserva fechas externas, tarifas predeterminadas, ceros explicitos y precision de seis decimales. Mantiene permisos y aislamiento de planta. Sin DDL ni migraciones.
- El modal actual refresca solo sus propios valores; la pantalla completa recarga los tres proveedores.

Validacion: 16/16 pruebas de importacion, API y flete diario. Incluye guardado de todos desde el segundo proveedor, rollback por fallo en el ultimo proveedor, conflicto en otro proveedor, nombres ambiguos y fechas externas. Compilacion y TypeScript correctos.

Sin merge, despliegue ni escrituras en produccion en esta tarea.
