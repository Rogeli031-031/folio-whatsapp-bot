task_id: "G4-PREP-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065"

title: "Preparar PR del margen diario editable por Costo KG y Flete KG 065"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de
  IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065
  hacia main. No modificar producto ni tests. El merge a main queda
  reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "e14185996626b22cf170c40c5cbcd2010cd4e8bc"

branch: "implementation/igf-diario-margen-diario-editable-065"

product_sha: "76e667bc5ea824564a47a7432d41fc0d206328ea"

validated_source_sha: "8103e73ef68064de449f3fc7772d1e39242a5ff6"

target_branch: "main"

validated_scope:
  - "Margen de cada planta es clickeable únicamente en IGF Diario acumulado."
  - "Zona Provincia no es editable."
  - "Modal horizontal con FECHA, COSTO KG, FLETE KG y MARGEN BRUTO."
  - "No existe fila Precio en el modal."
  - "Precio sigue siendo fuente automática."
  - "Fecha anterior al corte es solo lectura."
  - "Fecha igual al corte es editable."
  - "Fecha posterior al corte es editable."
  - "Costo KG y Flete KG se editan independientemente."
  - "Margen Bruto nunca se captura directamente."
  - "Margen Bruto = Precio - Costo KG - Flete KG."
  - "null/vacío no se convierte en 0."
  - "0 es override válido."
  - "null restaura el automático del campo."
  - "Campo omitido conserva el otro campo existente."
  - "Si ambos campos quedan NULL, la fila manual se elimina."
  - "Overrides detrás de un corte nuevo permanecen guardados pero dejan de aplicarse."
  - "No se escribe en CONTROL DE COMPRAS."
  - "Acumulado sigue ponderado por Venta KG."
  - "HG permanece intacto."
  - "Zona Provincia se recalcula a partir de plantas."
  - "Excel F usa Costo efectivo."
  - "Excel G usa Flete efectivo."
  - "Excel H conserva fórmula C-F-G."
  - "Todas mantiene aislamiento por planta."
  - "Provincia deriva de hojas planta."
  - "Tehuacan/Tehuacán sigue equivalente."
  - "GTM Queretaro/Querétaro sigue equivalente."
  - "Carga de overrides del acumulado ocurre una vez antes del loop."
  - "Forecast permanece intacto."
  - "064-R1 permanece intacto."
  - "063-R1 permanece intacto."

schema:
  table: "arr.igf_diario_margen_manual"
  primary_key:
    - "plant_code"
    - "year"
    - "month"
    - "fecha"
  columns:
    - "costo_kg NUMERIC(18,6) NULL"
    - "flete_kg NUMERIC(18,6) NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"
  safety:
    - "CREATE TABLE IF NOT EXISTS."
    - "Sin seed."
    - "Sin migración."
    - "Sin copia de datos desde Compras."
    - "No modifica CONTROL DE COMPRAS."

validated_api:
  get: "GET /api/dashboard/igf-diario-margen-diario"
  patch: "PATCH /api/dashboard/igf-diario-margen-diario"
  patch_behavior:
    - "Acepta lote multi-día."
    - "Valida antes de escribir."
    - "BEGIN / writes / COMMIT."
    - "ROLLBACK completo ante error."
    - "Rechaza fecha anterior al corte."
    - "Rechaza periodos anteriores a octubre 2026."

validated_cutoff_example:
  corte: "2026-10-05"
  "2026-10-04": "read-only"
  "2026-10-05": "editable"
  "2026-10-06": "editable"
  later_cutoff_rule: >
    Si el corte cambia a 2026-10-06, un override almacenado del
    2026-10-05 deja de aplicarse.

validated_formula:
  daily_margin: "precio - costo_kg_efectivo - flete_kg_efectivo"
  example: "20.06 - 12.60 - 1.23 = 6.23"
  accumulated: >
    SUM(MargenBrutoDia * VentaKgDia) /
    SUM(VentaKgDia)
  excel_h: >
    IF(
      AND(ISNUMBER(Cfila),ISNUMBER(Ffila),ISNUMBER(Gfila)),
      Cfila-Ffila-Gfila,
      ""
    )

validated_performance:
  - "No existe carga de overrides dentro del loop de plantas."
  - "listMonthOverrides se ejecuta una vez para el acumulado del mes."
  - "Conteo esperado de la ruta acumulada pasa de 2 a 3 fuentes principales por planta/mes según el contrato de 065."
  - "Solo un SELECT de arr.igf_diario_margen_manual para la carga mensual del acumulado."

validated_tests:
  - "065 PASS 8/8."
  - "Regresiones 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054, 054-R1, 054-R2, 054-R3 PASS."
  - "Excel 036-044 PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-margen-diario-editable-065"
  title: "IMPL 065: margen diario editable por Costo KG y Flete KG"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

production_validation_required_after_deploy:
  - "Abrir IGF Diario acumulado."
  - "Confirmar que el Margen de cada planta es clickeable."
  - "Confirmar que Zona Provincia no es clickeable."
  - "Abrir Margen diario de una planta."
  - "Confirmar filas FECHA, COSTO KG, FLETE KG y MARGEN BRUTO."
  - "Confirmar ausencia de fila Precio."
  - "Confirmar fechas anteriores al corte en solo lectura."
  - "Confirmar fecha de corte editable."
  - "Editar únicamente Costo KG."
  - "Confirmar recálculo inmediato del Margen Bruto."
  - "Editar únicamente Flete KG."
  - "Confirmar recálculo inmediato del Margen Bruto."
  - "Restaurar automático de Costo."
  - "Restaurar automático de Flete."
  - "Guardar varios días en una sola operación."
  - "Confirmar cambio del Margen acumulado de la planta."
  - "Confirmar recálculo de Zona Provincia."
  - "Confirmar HG sin cambio."
  - "Descargar Excel de la planta."
  - "Confirmar F/G efectivos."
  - "Confirmar H como fórmula C-F-G."
  - "Confirmar Excel Todas sin contaminación entre plantas."
  - "Confirmar Provincia derivada de hojas planta."
  - "Confirmar Forecast intacto."
  - "Confirmar 064-R1 intacto."

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA."
  - "Verificar delivery/docs SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar schema."
  - "Modificar CONTROL DE COMPRAS."
  - "Writes productivos."
  - "Merge a main."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

acceptance_criteria:
  - "origin/main sigue exactamente en e14185996626b22cf170c40c5cbcd2010cd4e8bc."
  - "No aparecen cambios nuevos de producto ni tests."
  - "PR base main / head implementation/igf-diario-margen-diario-editable-065."
  - "PR queda abierto y mergeable."
  - "No merge."
  - "No deploy."
  - "Reporte contiene número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065.md"