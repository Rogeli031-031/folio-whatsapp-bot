# IMPL-IGF-ACAPULCO-PRODUCTIVIDAD

- task_id: IMPL-IGF-ACAPULCO-PRODUCTIVIDAD
- outcome: DONE
- Archivos: `lib/dashboard-arr-forecast.js`, `lib/igf-acapulco-productividad*.js`, `test/igf-acapulco-productividad.test.js`, estado de tarea y este reporte. No se tocaron otras descargas, hojas existentes, permisos, migraciones, contratos ni datos.
- Contratos consultados: AGENTS, LOOP, Constitución e Índice de Arquitectura. Contratos modificados: ninguno.
- Implementación: la descarga autenticada existente agrega primero RESUMEN / TIPO A / B / C de pipas y estaciones Casa, solo cuando IGF Diario pertenece a Acapulco. Respeta el límite exclusivo de carga y el día local cerrado, no la semana visual. Conciliación exacta ARR/PDV por fecha, cliente, canal y subcanal en una consulta de solo lectura. Si falta evidencia, conserva las hojas financieras y deja las nuevas hojas como no disponibles, sin ceros ficticios.
- Regla: todos los días cerrados aportan venta, incluso domingo; el promedio usa días lunes a sábado transcurridos. Pipas redondean antes de A ≥ 2000 L/día, B ≥ 1500, C restante. Estaciones usan promedio sin redondeo contra 100% y 80% de la meta diaria. Metas fijas de referencia del cuadro de noviembre 2026: 32 estaciones, 16,620 L/día y 415,500 L para los 25 días hábiles de ese mes. El factor de visualización es 0.54 kg/L. Nombres ambiguos y metas sin punto homologado quedan señalados; no se reasignan.
- Evidencia: `node --check lib/dashboard-arr-forecast.js` y 6/6 `node --test test/igf-acapulco-productividad.test.js` en Windows, incluido XLSX serializado y vuelto a abrir, orden de tabs, logotipo, fórmulas de la hoja preexistente, corte, domingo y ramas excluidas. SQL de solo lectura para Acapulco Nov 1–22 devuelve 2,780 claves legadas, 22 días, cero diferencias y 937 agregados Casa por día/PDV. La descarga HTTP no se probó en producción; no hubo despliegue.
- Ambigüedades y desvíos: ninguno que cambie la regla aprobada. No se excluyen feriados adicionales no confirmados por calendario operativo. La homologación no arbitra sucursales de numeración distinta.
- secrets_check: sin secretos ni exportación de datos fuente al repositorio; el único recurso incrustado es el PNG del logotipo del formato aprobado.
- human_decision_needed: revisar PR, autorizar/realizar merge si procede y verificar el botón ya desplegado.
- next_task_proposed: ninguna autorizada.
