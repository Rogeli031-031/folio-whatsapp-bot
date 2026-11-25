# IGF-EXCEL-TALLER-PUEBLA-QUERETARO

Resultado: DONE_PENDING_REVIEW. Base revisada: `6c939de966bbb1e954aaaceaae379abe7dfc3ed8`.

## Alcance
- Añade únicamente a la exportación individual con resumen semanal de Puebla y Querétaro las cuatro hojas de pipas y las cuatro de estaciones propias. Se conserva el libro base. Ventas cerradas reconciliadas contra ARR por fecha/cliente/canal/subcanal y comparadas en litros, con 0.54 kg/L y calendario de la plantilla, sin usar cifras de otra planta.
- Mantiene el volumen aun cuando una estación no tiene una meta verificable. Se muestra en el resumen como Sin meta, sin asignar tipo ni calcular variación contra una meta incompleta. No se encontró una fuente autorizada de metas de estas plantas; no se reutiliza la de Acapulco.
- Lee el último número de revisión por fecha del taller de la planta seleccionada, incluso el día seleccionado cuando la venta cierra la víspera; muestra ambos cortes. Una visita de taller se marca en amarillo si no consta jornada completa. No se descuenta el día con estos formatos, que no certifican jornada completa. Se conserva la venta y se incluyen pipas sin ventas; dos fallas en un eco pasan a la misma unidad con notas separadas.
- Los candidatos de folio son de la empresa seleccionada, categoría taller, económico único y ventana acotada; se usa la autorización vigente de operador activo. No se exponen folios restringidos. La coincidencia no prueba que ese folio pague esa reparación; no se atribuyen importes, depósitos ni cierres sin evidencia.
- Sin cambios al flujo existente de Acapulco ni a sus metas, a otras plantas, al libro global, a los datos registrados, a migraciones, al frontend o a permisos. Sin modificación de CURRENT_TASK, contratos ni configuración de producción.

## Verificación
55 pruebas aprobadas, 2 pruebas opcionales con archivos privados omitidas. Pruebas con PostgreSQL aislado y XLSX que se escribe y vuelve a abrir: secuencia de hojas, dos plantas sin cruce de unidades ni folios, taller con revisiones y fechas separadas, conservación de volumen incluso un domingo, pipas sin venta, folios reservados excluidos, falta de meta y ausencia de cobertura. Validación de sintaxis y diff. Consultada en solo lectura la conciliación disponible de ambas plantas al ejemplo de corte; no se escribió dato ni se disparó una exportación en producción.

Contratos consultados: AGENTS.md, LOOP_PROTOCOL, CURRENT_TASK de la base, Constitución e Índice de Arquitectura Director IA. Sin cambios de contrato ni secretos. Pendiente: revisión humana y comprobar la descarga autenticada después de publicación, si se integra.

## owner_chat_attestation

- method: verified_owner_chat
- approved_at: 2026-11-25T06:40:12.318772+00:00
- receipt_id: 1806d9a9-19c0-4cd7-b072-eba30f53a990
- scope_sha256: 70207cb7c432e22f4b8ece0995d46a0acdb0d5e43413d0ccbbec60559480adbc
