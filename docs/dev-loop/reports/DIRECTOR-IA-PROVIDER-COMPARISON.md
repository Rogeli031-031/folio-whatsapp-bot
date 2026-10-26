# Comparación de proveedores en Chat Director IA

outcome: DONE_PENDING_REVIEW

Solicitud: implementar el desglose conjunto de Tuxpan y Tepeji y el porcentaje de cada proveedor, autorizado por el usuario con «adelante» en este chat. No se crean ni modifican registros de aprobación humana o contratos.

Base: b551137fc66fb885da74c469a6fb7c2b5ac9da2c.
Rama: fix/director-ia-provider-comparison.

El clasificador conserva todos los proveedores nombrados en la consulta y reconoce la petición de porcentajes como compras. La respuesta conjunta usa kilos efectivos de cada proveedor divididos entre los kilos efectivos de todos los proveedores en el periodo limitado al corte. Las notas de cargo no suman kilos. TOMZA TUXPAN y PEMEX TUXPAN permanecen separados. Sin kilos totales se declara que el porcentaje no está disponible.

Archivos de producto/tests: lib/director-ia-013-semantic.js; test/director-ia-provider-comparison.test.js; test/director-ia-013-server-source-routing-r1.test.js.

Validación: 64/64 pruebas de comparación, 013 y R1–R3. Incluye endpoint sin snapshot del navegador, SQL solo SELECT, precedencia Excel, otros proveedores en el denominador, rango al corte, duplicados de nombres, ausencia de compras y preservación del proveedor único. git diff --check correcto.

Contratos consultados: AGENTS.md, LOOP_PROTOCOL.md y DIRECTOR_IA_CONSTITUTION.md. Sin cambios de contratos, permisos, loaders, SQL, migraciones ni configuración de despliegue. CURRENT_TASK y sus autorizaciones anteriores permanecen intactos; la autorización de esta implementación proviene de la solicitud directa del chat.

secrets_check: sin secretos nuevos; fixtures sintéticos.
DB productiva: no consultada ni modificada.
human_decision_needed: revisión de la integración; main tiene Auto-Deploy en producción.
