# Piloto de taller Acapulco | Gas Uribe e HidroGas

- task_id: IGF-TALLER-ACAPULCO-APP-SERGIO
- outcome: DONE
- base aprobada: `f7c941447703bd5f5670c157b56c1b702aa6254a`
- rama: `feat/igf-taller-acapulco-app-sergio`
- contratos consultados: Constitución, índice de arquitectura y protocolo del repositorio.
- contratos modificados: ninguno.

## Qué se probó

El movimiento de entrada o salida se envía con el ID estable de la instalación y de la unidad, folio técnico de evento y número de secuencia. El padrón de prueba determina la empresa por tipo: Pipa → Gas Uribe (E9); Cilindrera → HidroGas (E10). Un mismo número económico no mezcla las flotas. Una asignación inexistente, ambigua o contradictoria se conserva retenida y no pasa al IGF. Los reenvíos idénticos no duplican movimientos; un identificador reutilizado con otro contenido se rechaza.

El lector del IGF de Acapulco combina movimientos válidos de pipas con sus cortes Excel existentes, sin reemplazar folios ni cambiar ventas ni días hábiles. Una entrada o salida es evidencia de actividad parcial: no se presume el día completo, no se certifica cobertura por la falta de un movimiento y no se publican cilindreras como pipas. Los cortes previos y el Excel manual siguen disponibles. Este piloto operativo no modifica ni alimenta directamente los contratos, observaciones o IES de Director IA.

## Evidencia reproducible

- `node --check server.js`.
- `node --test test/igf-acapulco-taller-app.test.js`: PostgreSQL aislado en PGlite, HTTP real en loopback, idempotencia concurrente, secuencia incompleta, identidades distintas, rechazo de fechas inválidas, reportes manuales preservados y Excel reabierto con ventas, colores y filas de folios ocultas. Requiere `@electric-sql/pglite` en entorno temporal de pruebas; no es dependencia de producción.
- Recorrido complementario en copia de la app Flask: cuatro eventos generados por entradas/cierres del taller, persistencia al reiniciar y cuatro filas exactas en PGlite tras enviar cada movimiento dos veces al endpoint v1 usando un adaptador de prueba. No se probó el envío automático de una instalación real, ni se instaló el adaptador en el equipo de Sergio.
- La ruta no se registra en producción, ni se ejecuta SQL automáticamente. Pruebas con datos ficticios; sin consulta de inventario real, escrituras en producción, credenciales productivas ni despliegue.

## Activación y reversión

1. Para reproducir en laboratorio: usar una base separada con el esquema `arr` existente, aplicar manualmente esta migración, configurar el dispositivo y su clave exclusivamente de prueba (variables `IGF_ACAPULCO_TALLER_DEVICE` y `IGF_ACAPULCO_TALLER_SECRET`), y activar `IGF_ACAPULCO_TALLER_PILOT=1` solo con `NODE_ENV=test` o `development`. Poblar únicamente el padrón sintético; enviar JSON v1 con bearer y hora local de Acapulco con segundos y desfase. Mantener las claves fuera de código, archivos compartidos y logs.
2. Para una futura prueba con la instalación real hace falta otra autorización y revisar el adaptador sobre el último código de Sergio, validar sus IDs con el padrón vigente, confirmar corte inicial y secuencia, respaldar la app y usar credenciales exclusivas de alcance mínimo. Antes de permitir uso en producción se necesita control explícito por entorno, usuario de base de privilegio mínimo, servicio HTTPS, confirmación de un envío real y conciliación contra ambos reportes. El histórico ya archivado queda fuera de este piloto; no reprocesar ni migrar por inferencia de eco.
3. Para detener este piloto: apagar `IGF_ACAPULCO_TALLER_PILOT` y reiniciar solo el servicio de laboratorio. El lector vuelve al Excel; conservar la cola y el diario para diagnóstico. No se requiere borrar ni revertir registros de taller, folios o ventas.
