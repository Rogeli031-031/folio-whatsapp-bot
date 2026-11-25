# FIX-IGF-ACAPULCO-DESCARGA

Resultado: DONE_PENDING_REVIEW. Base revisada: `911812ff0ab1b5a67f4b453b1bef70811e45ee54`.

## Alcance

- `server.js`: la adquisición de la conexión queda dentro del manejo de errores. El export individual de Acapulco envía el XLSX antes de los cálculos del snapshot. Se conserva el snapshot, se registra su error por separado y se libera la conexión al terminar. No cambia el orden del snapshot de otras descargas.
- `lib/igf-acapulco-taller-upload.js`: la misma consulta de autorización de taller puede usar el cliente que ya tiene la exportación. La carga conserva su método original.
- `test/igf-acapulco-descarga.test.js`: cinco pruebas HTTP aisladas que ejecutan el handler de la ruta con dependencias sintéticas.
- Este reporte. Sin cambios en CURRENT_TASK, contratos, frontend, formato, cifras, colores, asociación de folios, permisos, esquema ni Tehuacán.

## Verificación y límites

39 pruebas aprobadas: descarga, productividad/taller de Acapulco, alcance global, hojas y exportación de Puebla. Con un único cliente disponible se recibe y abre un XLSX sintético mientras la etapa de snapshot permanece detenida; las verificaciones de permiso y el snapshot conservado también se comprueban. Fallos simulados de conexión o de generación devuelven JSON con error claro y el fallo posterior del snapshot no reemplaza la descarga. Sintaxis validada en ambos archivos de aplicación y `git diff --check` limpio.

El agotamiento del pool por la segunda conexión es reproducible en el entorno aislado, no una atribución definitiva de la solicitud reportada. El snapshot sigue ocupando el cliente hasta terminar aunque el archivo ya se haya enviado. No hubo prueba autenticada ni cambios directos en producción.

Contratos consultados: AGENTS.md, LOOP_PROTOCOL, CURRENT_TASK de la base, Constitución e Índice de Arquitectura Director IA. Sin cambios de contrato, desviaciones ni secretos. Pendiente: revisión humana del PR y verificación de una descarga real después de la publicación automática, si se integra.

## owner_chat_attestation

- method: verified_owner_chat
- approved_at: 2026-11-25T06:30:32.596233+00:00
- receipt_id: e5c23a05-4a06-4819-a45b-acb8cd2d90d3
- scope_sha256: ae84229cf3cdd4084c31fbe3b47d573c18e680ca3a511b3ff8eb7c9acee37488
