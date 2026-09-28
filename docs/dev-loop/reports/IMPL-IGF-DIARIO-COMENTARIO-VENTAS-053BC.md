# IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC

task_id: IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC

outcome: DONE_PENDING_REVIEW

base_sha: c224dbc97d69d7fad699902d38e20869aca8638d

branch: impl/igf-diario-comentario-ventas-053bc

## Qué quedó

AH (COMENTARIO DEL DIA) y AI (VENTAS) se llenan en cada IGF Diario de planta y en IGF Diario Provincia. Los auxiliares de carry pasaron de AI/AJ a AJ/AK y siguen ocultos.

El comentario sale de `computeDailySalesDeviationFromRows` y `computeDailyDiscountDeviationFromRows`. No hay llamada a OpenAI ni a `/director-ia/chat`.

AI lista la primera compra real del mes, por planta, solo si el mes calendario anterior no tuvo kg positivo. El forecast no crea clientes nuevos.

## Archivos tocados

- lib/igf-diario-daily-insights.js
- lib/igf-diario-puebla.js
- lib/dashboard-arr-forecast.js
- server.js
- test/igf-diario-comentario-ventas-053bc.test.js
- test/igf-diario-puebla-042.test.js
- test/igf-diario-puebla-043.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC.md

## No tocados

- Matemática financiera de IGF, corte y proyección
- 053A, R1 y R2, salvo el transporte del payload de insights
- Respuesta conversacional de Director IA y clasificación DICF
- Contactos, schema y migraciones

## Contratos

Consultados: CURRENT_TASK, motores diarios de venta y descuento, `normNombre` de cliente-contacto, gate global de 053A-R2.

Modificados: ninguno en docs/director-ia/.

## Carga

Por planta, tres consultas: `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente` y `arr.cliente_contactos`. El rango va del día 1 del mes anterior hasta la última fecha elegible. Provincia reutiliza esos datasets y no consulta de nuevo. Si `cliente_contactos` falla, el contacto queda en "Contacto: no capturado." y el Excel sigue.

La fecha máxima es el mínimo entre ayer CDMX y corte-1. Un mes histórico completo puede analizarse hasta su último día real, siempre que la fecha sea anterior al corte.

El export individual carga insights después de `assertPlantaPermitidaDashboard`. Todas los carga después de `igfDiarioTodasRequestBlock`.

## Pruebas

053BC, 025, 050, 051, 051-R1, 052, 053A, 053A-R1, 053A-R2, 042 y 043: 68 pass, 0 fail.

git diff --check limpio.

## Desviaciones

Las pruebas 042 y 043 se actualizaron porque el flag 0/1 de carry ya no vive en AI/AJ. Ahora está en AJ/AK.

El ancho de AI es 48. La altura de la fila diaria se ajusta al texto y se corta en 140 puntos. Semana y TOTAL MES no cambian de altura y quedan vacíos en AH/AI.

Los clientes del comentario son los `top_customers` del motor con contribución negativa y participación de al menos 10 por ciento, la misma materialidad ya usada por el motor.

## next_task_proposed

Ninguna. Este reporte no autoriza otra tarea.

secrets_check: sin secretos, tokens ni credenciales.

human_decision_needed: revisión humana. No hay PR, merge ni deploy.
