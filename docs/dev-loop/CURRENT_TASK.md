task_id: "G4-PREP-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1"

title: "Preparar PR del margen vertical con Precio y rangos independientes 065-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de
  IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1
  hacia main. No modificar producto ni tests. El merge a main queda
  reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "7d102e95bd2aad2428800e0e0935bac5692ab81e"

branch: "implementation/igf-margen-vertical-precio-rangos-065-r1"

product_sha: "73d1b716044f600ed60e9ad0285ef385038ecb25"

validated_source_sha: "f7c374099a89453856639b6fff253e3fa0112591"

target_branch: "main"

validated_scope:
  - "Modal Margen diario usa listado vertical."
  - "Una fecha por renglón."
  - "Columnas FECHA, PRECIO, COSTO KG, FLETE KG, MARGEN BRUTO."
  - "Precio corresponde a columna C del Excel."
  - "Costo corresponde a F."
  - "Flete corresponde a G."
  - "Margen Bruto corresponde a H."
  - "H no es editable ni persistido."
  - "H = C-F-G."
  - "Precio, Costo y Flete son editables únicamente desde el corte."
  - "Fecha anterior al corte permanece solo lectura."
  - "PRECIO tiene rango Desde/Hasta/Valor independiente."
  - "COSTO KG tiene rango Desde/Hasta/Valor independiente."
  - "FLETE KG tiene rango Desde/Hasta/Valor independiente."
  - "Los tres rangos pueden coexistir con fechas distintas."
  - "Aplicar rango modifica borrador, no DB inmediatamente."
  - "Guardar cambios envía un solo PATCH bulk."
  - "Restaurar rango afecta únicamente su variable."
  - "Última acción gana dentro de la misma variable."
  - "Variables distintas no se pisan."
  - "Edición individual posterior a rango gana para ese día."
  - "Rango posterior vuelve a ganar si incluye ese día."
  - "Rangos incluyen todos los días calendario."
  - "Rango anterior al corte se rechaza, no se recorta."
  - "0 es override válido."
  - "null restaura automático."
  - "Campo omitido preserva valor existente."
  - "Fila manual se elimina solo cuando Precio/Costo/Flete quedan NULL."
  - "Acumulado sigue ponderado por Venta KG."
  - "Precio manual modifica Margen acumulado."
  - "HG permanece intacto."
  - "Zona Provincia se recalcula."
  - "Excel C usa Precio efectivo."
  - "Excel F/G conservan lógica 065."
  - "Excel H conserva fórmula C-F-G."
  - "Todas mantiene aislamiento por planta."
  - "Provincia deriva C/F/G de hojas planta."
  - "Una sola carga mensual de overrides antes del loop."
  - "Forecast permanece intacto."
  - "065 permanece intacto."
  - "064-R1 permanece intacto."
  - "063-R1 permanece intacto."

schema:
  table: "arr.igf_diario_margen_manual"
  existing_primary_key:
    - "plant_code"
    - "year"
    - "month"
    - "fecha"
  new_column:
    name: "precio"
    type: "NUMERIC(18,6) NULL"
  ddl:
    - "CREATE TABLE IF NOT EXISTS incluye precio para instalación nueva."
    - "ALTER TABLE ... ADD COLUMN IF NOT EXISTS precio para tabla existente."
    - "DDL idempotente."
    - "Sin seed."
    - "Sin UPDATE de filas existentes."
    - "Sin migración automática de Precio."
  delete_rule: >
    Eliminar fila únicamente cuando precio, costo_kg y flete_kg
    sean los tres NULL.

validated_api:
  get: "GET /api/dashboard/igf-diario-margen-diario"
  patch: "PATCH /api/dashboard/igf-diario-margen-diario"
  get_fields:
    - "precio"
    - "precio_automatico"
    - "precio_manual"
    - "costo_kg"
    - "costo_automatico"
    - "costo_manual"
    - "flete_kg"
    - "flete_automatico"
    - "flete_manual"
    - "margen_bruto"
    - "editable"
  patch_fields:
    - "precio?"
    - "costo_kg?"
    - "flete_kg?"
  transaction:
    - "Validación completa antes de BEGIN."
    - "Bulk multi-día."
    - "COMMIT único."
    - "ROLLBACK completo ante error."

validated_ranges:
  price_example: "05/10 -> 10/10 = 20.10"
  cost_example: "08/10 -> 15/10 = 12.55"
  freight_example: "05/10 -> 31/10 = 1.27"
  expected_08_10: "C=20.10; F=12.55; G=1.27; H=6.28"
  expected_11_10: "C=automático; F=12.55; G=1.27"
  note: "Los importes son fixtures de prueba, no hardcode de producto."

validated_excel:
  A: "FECHA"
  C: "PRECIO efectivo"
  F: "COSTO KG efectivo"
  G: "FLETE KG efectivo"
  H: "fórmula C-F-G"
  h_formula: >
    IF(
      AND(ISNUMBER(Cfila),ISNUMBER(Ffila),ISNUMBER(Gfila)),
      Cfila-Ffila-Gfila,
      ""
    )

validated_performance:
  - "SELECT mensual existente incluye precio,costo_kg,flete_kg."
  - "listMonthOverrides sigue ejecutándose una vez antes del loop."
  - "No existe query adicional específica para Precio."
  - "No N+1 nuevo."

validated_tests:
  - "065-R1 PASS 6/6."
  - "065 PASS 8/8."
  - "064-R1 PASS."
  - "064 PASS."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "Excel 036-044 y regresiones relevantes PASS."
  - "100/100 en corrida de regresión reportada."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

pr_contract:
  base: "main"
  head: "implementation/igf-margen-vertical-precio-rangos-065-r1"
  title: "IMPL 065-R1: margen vertical con Precio y rangos C/F/G"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

production_validation_required_after_deploy:
  - "Abrir IGF Diario acumulado."
  - "Abrir Margen diario de una planta."
  - "Confirmar listado vertical."
  - "Confirmar columnas FECHA/PRECIO/COSTO/FLETE/MARGEN."
  - "Confirmar orden A/C/F/G/H."
  - "Confirmar fechas anteriores al corte solo lectura."
  - "Confirmar Precio editable desde el corte."
  - "Confirmar Costo editable desde el corte."
  - "Confirmar Flete editable desde el corte."
  - "Confirmar Margen Bruto no editable."
  - "Aplicar rango de Precio."
  - "Aplicar rango diferente de Costo."
  - "Aplicar rango diferente de Flete."
  - "Confirmar que los tres coexisten."
  - "Confirmar H recalculado inmediatamente."
  - "Confirmar Restaurar automático por rango."
  - "Confirmar Restaurar individual."
  - "Guardar cambios y confirmar un solo lote."
  - "Confirmar Margen acumulado actualizado."
  - "Confirmar Zona Provincia actualizada."
  - "Confirmar HG sin cambio."
  - "Descargar Excel planta y validar C/F/G/H."
  - "Validar Todas sin contaminación entre plantas."
  - "Validar Provincia C/F/G derivada de hojas planta."
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
  - "Modificar schema adicional."
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
  - "origin/main sigue exactamente en 7d102e95bd2aad2428800e0e0935bac5692ab81e."
  - "No aparecen cambios nuevos de producto ni tests."
  - "PR base main / head implementation/igf-margen-vertical-precio-rangos-065-r1."
  - "PR queda abierto y mergeable."
  - "No merge."
  - "No deploy."
  - "Reporte contiene número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1.md"