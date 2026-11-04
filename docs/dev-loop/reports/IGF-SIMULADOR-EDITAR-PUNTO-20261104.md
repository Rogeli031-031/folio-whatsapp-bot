# Edición del mismo punto guardado

Solicitud directa: pulsar la tarjeta de una propuesta para abrirla, editarla y guardarla conservando nombre/número. Continuación del flujo de integración y publicación autorizado por el usuario. No se cambian CURRENT_TASK, aprobaciones ni contratos.

Base d9a9b7d0a10f1a64844ca554c08c75d56e4f3131. Rama feat/igf-editar-punto-guardado.

- Las tarjetas comparadas son botones accesibles, con acción Editar este punto. Abren Categorías del mes con el escenario, HG, mezcla y comentarios guardados.
- El botón superior identifica Guardar cambios del punto #N. La operación usa PUT; reemplaza la propuesta en la lista y actualiza su marcador sin duplicar el punto ni perder las demás propuestas comparadas.
- El servidor valida los mismos supuestos de las propuestas nuevas y actualiza únicamente venta, descuento y basis, filtrando por ID, planta, año y mes. Conserva nombre, ID y metadatos de creación. Un punto inexistente devuelve 404; nunca se convierte en un INSERT.
- Ante fallo conserva el editor y sus valores para reintentar. Restaurar actual sale del modo edición. Los puntos nuevos conservan su flujo POST.

Validación: 35 pruebas relacionadas, incluyendo actualización por la misma identidad/nombre, autorización por planta, alcance mensual, ausencia sin INSERT, reapertura de tarjeta, edición/guardado, comparación múltiple conservada y fallo/reintento sin pérdida de valores. Compilación de producción/TypeScript y sintaxis de módulos. Sin migraciones ni cambios a capturas financieras reales.
