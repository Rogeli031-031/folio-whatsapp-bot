# IGF-TALLER-ACAPULCO-FECHAS

- Resultado: DONE_PENDING_REVIEW. Base revisada: ca927d2d7dd513daf2d40b8bd30db0d514bd2e5c.
- Alcance: carga ordinaria E9/E10 de Acapulco. Reconoce fechas del nombre y encabezado de las pestañas, muestra la última disponible primero y permite elegir otra. Valida una sola empresa y fechas sin duplicados. Una confirmación corresponde al corte elegido y conserva las revisiones previas; no carga todo el historial. Mantiene compatibilidad con `REPORTE TALLER` y las restricciones existentes de XML, ZIP, celdas y permisos.
- Pruebas: 10 pasaron, 1 opcional (cruce de folios con PGlite, dependencia no disponible) omitida. Se probó la vista previa del backend con ambos XLSX privados sin publicarlos, incluida la selección de los dos cortes disponibles. La confirmación por fecha y el intento de cambiar la fecha se probaron con almacenamiento simulado. Se comprobó sintaxis del TS/TSX modificado. No se hizo recorrido completo de navegador ni escritura contra PostgreSQL real.
- Contratos consultados: Constitución e Índice de Arquitectura de Director IA, AGENTS y LOOP. Ninguno modificado. Sin cambios a CURRENT_TASK, servidor, otras plantas, exportaciones, folios, permisos, migraciones, datos de producción ni secretos. Sin merge ni despliegue.
- Decisión humana pendiente: revisión del cambio y, en su caso, G4 por el PR y el commit exactos.

## owner_chat_attestation

- method: verified_owner_chat
- approved_at: 2026-11-25T18:52:49.653881Z
- receipt_id: 50e06261-11a0-4096-8f07-2c525f045611
- scope_sha256: bcaded015a2fca7cbf40a3453d61101afbdd1bceaeb1aeded489d3c55ee50229
