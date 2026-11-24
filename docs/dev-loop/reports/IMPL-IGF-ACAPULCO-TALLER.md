# IMPL-IGF-ACAPULCO-TALLER

- outcome: DONE, pendiente de revisión humana como borrador.
- Alcance: botón y archivo con revisión/huella, ACL dedicada y predeterminada denegada, E9/E10, exportación Acapulco. Sin código en otras plantas, estaciones, ventas, contratos o credenciales.
- Contratos consultados: Constitución, índice de arquitectura, AGENTS y LOOP. No modificados.
- Pruebas en aislamiento: tres pruebas Node con ExcelJS real; Express localhost con middleware sintético, archivos .xlsx E9/E10 reales sintéticos, PGlite y migración del candidato; vista previa no escribe, actor ajeno y bytes distintos denegados, dos empresas y reporte de cero pipas separados, reintento idempotente, XLSX generado y releído con ExcelJS. Aislamiento de coincidencias de folios restringidas, otra empresa y clave paraguas.
- Procedencia: cotejo de coordenadas de ambos formatos, sin datos de taller, usuarios ni archivos corporativos en Git. Al exportar, sólo quien tiene capacidad individual de carga visualiza candidatos de la empresa jurídica y eco, siempre «por validar» sin costo ni fecha de depósito. No existe vínculo determinista a la falla en estas plantillas. Con venta o jornada ambigua: ámbar, conservar litros y divisor. Sólo jornada hábil completa verificable y sin venta reduce divisor; los formatos no declaran jornada completa.
- Pendientes de revisión: probar navegador y configuración real antes de completar checklist; sin prueba nativa contra PostgreSQL Render, no se ejecutó ninguna migración, alta de ACL o carga real. HMAC temporal por instancia reinicia vista previa si cambia instancia; verificar topología de servicio. El operador humano aplica migración y da de alta exactamente las dos cuentas verificadas en ACL dedicada, luego decide el merge. No auto-merge, despliegue o alta de usuario por el implementador.
- contradictions: ninguna observada; evidencia de vínculo folio-falla ausente, no inferida. secrets_check: sin datos reales, secretos, claves ni transcripciones.
- next_task_proposed: ninguna.
- human_decision_needed: revisar PR; validar en navegador y luego primera carga controlada por operador autorizado bajo la tarea.
