# FIX-IGF-CRUCE-FOLIOS-Y-FORMATO

Resultado: DONE_PENDING_REVIEW. Base revisada: `28df4527593339cdb0399da6fbb0375aed5b475a`, con #193 integrado.

## Alcance

- Acapulco: cruza candidatos por un único número económico explícito AT/T, sin que el relleno con ceros impida la coincidencia. Conserva empresa, categoría, ventana, restricciones y autorización. No asocia candidatos como reparaciones comprobadas ni atribuye costo, depósito o cierre.
- Acapulco, Puebla y Querétaro: en hojas de detalle de pipas con información de taller, inserta el bloque de folios en las filas 4 a 9, ocultas al abrir. Conserva títulos y logo Grupo TOMZA; corte, encabezados y datos visibles bajan sin cambiar orden, anclas, colores ni cifras. Las fórmulas apuntan a las filas nuevas; las hojas sin datos de taller no se desplazan.
- Solo se cambian la lectura de candidatos de Acapulco, el renderizador de productividad, tres archivos de pruebas y este reporte. Sin cambios en permisos, datos, contratos, cortes, migraciones ni configuración de producción.

## Pruebas

45 pruebas aprobadas sobre el main posterior al #193, con sintaxis/diff validado. Se escribe y reabre XLSX fuera de producción para comprobar filas ocultas incluso con campos vacíos, títulos, logo, estilos visibles, marcas de taller, fórmulas entre hojas y totales sin cambios. PostgreSQL aislado verifica equivalencia AT/T, y exclusión de otra empresa, formatos ambiguos, categorías y folios restringidos o fuera de fecha. Pendiente verificación con descarga autenticada después de una publicación autorizada. No se ejecutó una exportación ni se modificaron datos de producción.

## owner_chat_attestation

- method: verified_owner_chat
- approved_at: 2026-11-25T06:56:27.504806+00:00
- receipt_id: 35b442a0-b451-4364-9a89-594374d9fd72
- scope_sha256: d72274d1e3757e901588ac41950f3468a81eb7e047391e729e735a5d843d7d1d
