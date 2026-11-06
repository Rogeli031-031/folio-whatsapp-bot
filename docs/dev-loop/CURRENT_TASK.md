# Presupuesto IGF · Calendario de gastos
task_id: "FIX-IGF-PRESUPUESTO-SOLO-DOMINGOS"
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-06T11:39:08-06:00"
human_authorization: "Sí, autorizo la corrección por este chat"
authorization_channel: "Respuesta explícita del responsable en el chat de IA en Tomza, que autoriza registrarla aquí, cierra #171 y aprueba el alcance para las seis plantas."
base_sha: "610611210ae7a814591d7cf2f220471403facab5"
branch: "fix/igf-presupuesto-solo-domingos"
objective: "Aplicar la regla de gastos del presupuesto IGF en las seis plantas: solo los domingos se exige cero; de lunes a sábado se permite gasto, incluso en festivos."
in_scope:
  - "lib/igf-presupuesto-import.js y lib/igf-diario-gastos-*.js: revisión, importación, distribución y edición diaria de los siete conceptos."
  - "lib/igf-diario-puebla.js, lib/igf-diario-expense-*.js, lib/igf-diario-grafica.js, lib/igf-diario-weekly-plant.js, lib/director-ia-013-snapshot.js y demás lectores IGF del presupuesto: aplicar el calendario únicamente al cálculo o presentación del gasto."
  - "frontend-dashboard/components/IgfPresupuestoUpload.tsx y vistas IGF que describen los días de gasto."
  - "Pruebas específicas en test/ para importación, distribución y paridad del gasto en dashboard y Excel."
  - "docs/dev-loop/CURRENT_TASK.md y docs/dev-loop/reports/FIX-IGF-PRESUPUESTO-SOLO-DOMINGOS.md."
out_of_scope:
  - "Calendario de ventas, nómina laboral, compras, permisos, configuración productiva, importación de datos reales o migraciones retroactivas."
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
allowed_actions:
  - "Implementar, probar con datos de prueba y generar reporte en la rama de la ficha. Subir solo esos cambios y abrir PR para revisión humana."
forbidden_actions:
  - "Autoaprobar gates, fusionar a main, cargar presupuestos productivos o modificar importes históricos en la base de datos."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-PRESUPUESTO-SOLO-DOMINGOS.md"
acceptance:
  - "Acapulco y las otras cinco plantas aceptan un importe el lunes festivo 16/11/2026 tanto en revisión como al confirmar. Un domingo con un concepto distinto de cero se rechaza indicando fecha y concepto."
  - "Para noviembre de 2026 hay 25 días para distribuir gasto y cinco domingos a cero (1, 8, 15, 22 y 29). Probar un sábado, un festivo distinto en otro mes y ceros explícitos en conceptos de lunes a sábado."
  - "Verificar cargas completas y parciales, sin duplicar ni perder centavos, respetar importes fijados fuera de la ventana, comprobar el efecto en semanas y meses con presupuesto previamente cargado."
  - "El importe aprobado del lunes se vuelve a leer en el tablero y el Excel. Mantener las reglas históricas de los formatos ajenos al presupuesto detallado y de los calendarios no financieros."
