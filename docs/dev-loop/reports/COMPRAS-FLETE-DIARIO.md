# Compras: flete editable por proveedor y fecha

outcome: DONE_PENDING_REVIEW

Solicitud directa del usuario: conservar la tarifa de flete como valor por defecto y permitir excepciones manuales por día desde las letras FLETE de cada proveedor.

Base: 8f8178b59841524d13d3919a3977b2663bdfb8a7.
Rama: feature/compras-flete-diario.

## Comportamiento

FLETE abre una lista de todas las fechas del mes para la planta/proveedor elegidos. Cada fila muestra valor efectivo, origen Manual/Predeterminado, Guardar y Usar predeterminado. Se admite cero explícito; null restaura la base, sin convertir ausencia en cero. La entrada Base conserva la edición mensual anterior y los días manuales prevalecen sobre ella.

Los cálculos diarios, HG, los históricos y el Excel utilizan la excepción del día. Las semanas y el mes suman los importes diarios y ponderan por kg. El Excel también aplica la tarifa de cada día al agregar cantidades estimadas; no aplica una única tarifa mensual al volumen agregado. Se conserva cero en el loader financiero y se invalida la caché histórica al cambiar fletes.

## Persistencia y autorización

Nueva tabla vacía arr.compras_flete_diario, clave planta/proveedor/fecha, tarifa no negativa con seis decimales y actor/fecha de actualización. SQL 026 documenta el mismo DDL idempotente incorporado a ensureComprasTables, siguiendo el mecanismo existente de Compras. No hay backfill ni modificación de compras/HG capturados. No se ejecutó el DDL contra producción.

POST /api/compras/flete-diario conserva middleware de sesión, permiso acceso_compras, alcance de planta y pertenencia del proveedor. Valida fecha completa y tarifa finita, no negativa y dentro de límites. El loader de solo lectura consulta to_regclass y devuelve sin excepciones si falta la tabla; no crea esquema desde el Chat ni desde lectores de solo lectura.

## Validación

- 7/7 pruebas nuevas: día/proveedor, cero, restauración, ponderación, histórico/HG, validación, lecturas sin tabla, parámetros de escritura por planta/fecha, Excel/loader financiero y permisos de API.
- Regresión focal: 154 pruebas, 153 pasan y un fallo preexistente de 016 espera un valor numérico donde el Excel productivo ya emite fórmula.
- Regresión amplia inicial: 136 pruebas, 133 pasan y tres fallos. Se ejecutaron las implementaciones exactas de compras-dashboard.js y compras-excel.js de la base 8f8178b para 016/024: los mismos tres fallos ya están en base (42/45). Dos son expectativas antiguas sobre nombre/estructura de descarga 024. Sin fallos nuevos en la regresión focal. Se mantienen intactas esas expectativas.
- Regresiones incluidas: Compras 013, HG 014/020, flete 016/021, IGF tarifa 059-R1, conciliación R4/R4-R1/R4-R2/R5 y Chat lectura estricta R3.
- Build frontend y verificación de tipos correctos; prepare-standalone completado.
- Navegador Edge local con API simulada: lista diaria, base, edición, cero, restauración y doble clic con una sola petición. Revisión visual correcta. La ruta temporal se eliminó.
- git diff --check correcto.

Los mocks legados reconocen únicamente el nuevo sondeo de tabla ausente, conservando sus escenarios previos.

Contratos consultados en esta sesión: AGENTS.md, LOOP_PROTOCOL.md y DIRECTOR_IA_CONSTITUTION.md. Sin modificaciones ni registros de aprobación humana inventados. Esta tarea responde a la petición directa del chat.

Sin DB productiva consultada o modificada. Sin secretos, cambios de conciliación, importadores o capturas. Sin merge ni deploy de esta funcionalidad.

human_decision_needed: revisar integración, incluyendo la nueva tabla vacía y los fallos preexistentes documentados; main activa Auto-Deploy de backend y frontend.
