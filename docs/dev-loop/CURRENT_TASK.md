task_id: "FIX-IGF-DIARIO-COMDESC-NO-DISCOUNTS-ZERO-078-R3"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
approver_name: "Luis rogelio Zaragoza alvarez"
authorized_at: "2026-10-28T13:26:18.9896096-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-28"

base_sha: "2a6c4a20044f3d0b0158a00600dbabe73645ff2a"
branch: "fix/igf-diario-comdesc-no-discounts-zero-078-r3"

objective: "Cuando exista venta positiva y no haya ningún descuento registrado para la planta/fecha, Comisiones y Descuentos debe ser cero real y no LAST_REAL_FALLBACK. Verificar todas las fórmulas y reportes dependientes."

business_rule: "venta > 0 AND zero discount rows => com_desc = 0"

protected:
  - "LAST_REAL_FALLBACK para casos realmente desconocidos"
  - "Forecast"
  - "IGF Diario semanal"
  - "IGF Diario acumulado"
  - "Provincia Comisiones"
  - "Compras"
  - "HG"
  - "gastos"
  - "margen bruto"

forbidden:
  - "hardcode San Luis"
  - "hardcode fechas"
  - "DB writes"
  - "migration"
  - "PR"
  - "merge"
  - "deploy"

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-COMDESC-NO-DISCOUNTS-ZERO-078-R3.md"
