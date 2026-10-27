# Subir Presupuesto desde DatosCorpo

outcome: DONE_PENDING_REVIEW

Solicitud directa del usuario: analizar su Excel y agregar la carga de presupuesto por planta y ventana de fechas. Se implementa esa solicitud sin modificar registros históricos de autorización ni contratos.

Base: af7653992fd0057ea5162b8cec9a98bdd1cf39ff.
Rama: feature/igf-subir-presupuesto.

## Comportamiento

Botón «Subir Presupuesto» en IGF. Flujo: planta, archivo .xlsx, fechas, vista previa, guardar. Lee exclusivamente DatosCorpo, identifica los encabezados y exige los siete conceptos y todas las fechas elegidas. Las fórmulas se leen de sus resultados guardados; el usuario debe recalcular y guardar el archivo en Excel. No se evalúan fórmulas ni vínculos externos. Límite de archivo: 5 MB.

La ventana es inclusiva, admite varios meses desde octubre de 2026 y reemplaza los importes de los siete conceptos. Para cada mes conserva los importes asignados fuera de la ventana y recalcula totales de conceptos y grupos. Los días hábiles del mes quedan fijos para evitar redistribución implícita de los días preservados. Una carga de mes completo puede inicializar el desglose; una carga parcial exige un desglose y distribución válidos. Reimportar reemplaza valores, no acumula.

Los domingos/festivos del calendario existente deben tener importe cero. Vacíos, negativos, errores de Excel, fechas duplicadas, días faltantes o presupuesto parcial sin base bloquean el guardado. El formulario advierte que se debe comprobar que el archivo corresponde a la planta seleccionada; DatosCorpo no identifica la planta.

## Persistencia y permisos

Usa las tablas existentes de desglose, totales manuales y distribución; sin DDL ni migraciones. La vista previa ejecuta SELECT. El guardado revalida el archivo y el estado previo con una huella, aplica todos los meses en una transacción y revierte ante cualquier error. Un cambio desde la vista previa devuelve 409. Comparte un bloqueo por planta con la edición manual de desglose/distribución para evitar escrituras concurrentes durante la carga.

La ruta requiere dashboardAuthMiddleware, mantiene bloqueos GA/GV y verifica canAccessPlant con planta resuelta en servidor. Reutiliza un código de presupuesto existente equivalente; códigos duplicados para la misma planta bloquean la carga. Conserva updated_by con el actor del dashboard.

## Validación

- 100/100 pruebas: importador, API de lectura y guardado, permisos, transacción, vista previa caducada, reimportación, rangos entre meses, gastos 062/064, distribución 064-R1, navegación/guardado 083, acumulado 063/063-R1, contrato 066/066-R1 y lectura estricta del chat R3.
- TypeScript: tsc --noEmit -p frontend-dashboard, exit 0.
- Frontend: npm run build, exit 0; prepare-standalone completó la copia.
- Prueba de navegador local en Edge con API simulada: selección de planta antes de archivo, vista previa, invalidación por fechas, doble clic con un único guardado y mensaje final. Revisión visual de la captura correcta. La ruta temporal de prueba se eliminó.
- Archivo de referencia real: E7 Seguimiento semanal.xlsx, leído sin modificación. DatosCorpo contiene los siete encabezados; octubre tiene 31 fechas y el plan de mes completo se construyó correctamente sin DB.
- git diff --check correcto.

Contratos consultados: AGENTS.md, LOOP_PROTOCOL.md y DIRECTOR_IA_CONSTITUTION.md. No modificados. Sin cambios en fuentes sincronizadas, credenciales, importadores de compras, motor de margen o fórmulas financieras.

DB productiva: no consultada ni modificada. Sin merge ni deploy de esta funcionalidad. La prueba de navegador no envió el archivo a producción.

human_decision_needed: revisar la integración; main activa Auto-Deploy de backend y frontend. No cargar presupuestos reales antes de revisar la vista previa de la planta y fechas deseadas.
