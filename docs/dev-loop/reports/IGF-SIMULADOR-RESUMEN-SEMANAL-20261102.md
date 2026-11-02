# Simulador: selección semanal emergente y resumen financiero

Solicitud directa del usuario: compactar los controles, mover la selección de semanas a una tabla emergente, mostrar margen y gastos, abrir detalles al pulsar cifras y conservar puntos/propuestas. Continuación del simulador y del flujo de integración/publicación autorizado en este chat. No se modifican CURRENT_TASK ni campos de aprobación.

Base: 5a6012c5993a9c71be2b0934f5b7be7d94bafb87. Rama: feature/igf-simulador-resumen-semanal.

La vista principal conserva gráfica, controles de escenario y una fila de base mensual. Semanas, categorías mensuales y propuestas se abren por botones. Se elimina la duplicación de tablas al pie. La tabla semanal combina visibilidad, fechas/estado, venta, margen bruto, descuento, operativos, corporativos, gasto, HG, impuestos y resultado del periodo. Cada cifra abre su detalle diario de solo lectura con planta, corte, versión y semana conservados; las solicitudes obsoletas se cancelan. Los gastos se reconstruyen con los grupos vigentes del IGF: corporativos incluye inversiones e impuestos federales, operativos incluye nómina, IMSS, extraordinarios y provisiones. La fuente histórica ofrece su total operativo específico, sin inventar desglose diario. Los desconocidos permanecen sin cifra.

El desglose ARR sigue identificado como mensual y separado del detalle semanal. El margen bruto se distingue de la contribución efectiva calibrada usada por la superficie. Propuestas conserva creación, consulta, uso y eliminación con los permisos existentes; la ventana permite ajustar venta/descuento y guardar el punto. No se alteran fórmulas de resultado, APIs, contratos Director IA ni datos reales.

Validación: 25 pruebas relacionadas, TypeScript y compilación de producción. La verificación final de Render y navegador se documenta en el PR. Se excluyen artefactos .next. Sin secretos ni cambios ajenos.
