task_id: "G4-PREP-IGF-DIARIO-WEEKLY-PLANT-VIEW-067"

title: "Preparar PR de vista semanal vertical IGF Diario 067 + R1 + R2"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-06"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-06"

objective: >
  Preparar el Pull Request de la entrega completa 067,
  incluyendo FIX 067-R1 y FIX 067-R2, hacia main.
  No modificar producto ni tests.
  El merge queda reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "d58216dd128c459df6ac9aff4a05a75f9505d8a6"

branch: "fix/igf-diario-weekly-crossmonth-result-kg-067-r2"

delivery_chain:
  impl_067_product: "d04c01ebdcb3779da1eccfb4b5642568c392e509"
  impl_067_final: "940cc0907fc1aab6a23708cc49f192aa42f2b24a"

  fix_067_r1_product: "c4c806b19683a4153d2724b772cf4ce68807f82c"
  fix_067_r1_final: "0dd2bb5847ed328fe5b73dec0d25297fb275f568"

  fix_067_r2_product: "39b1236880a14a194ba41bfbaf330e79ff1aa8d2"
  validated_source_sha: "9328caef1f7c2a5e78b1a6988ed405a377a0317c"

target_branch: "main"

validated_scope:
  - "Planta seleccionada + IGF Diario muestra panel semanal vertical."
  - "Planta seleccionada + IGF Diario deja de mostrar comparación contra mes anterior."
  - "No se carga mes anterior cuando no se usa."
  - "Modo Forecast conserva comparación legacy."
  - "Planta Todas conserva vista actual."
  - "Semana ISO lunes-domingo."
  - "Número real de semana ISO."
  - "Semana puede cruzar meses."
  - "Corte 06/10/2026 abre 05/10–11/10."
  - "Anterior/Siguiente desplaza exactamente 7 días."
  - "Cambio de planta/mes/corte vuelve a semana del corte."
  - "Estados REAL/PARCIAL/PROYECTADA."
  - "Tabla vertical sin scroll horizontal."
  - "Venta = suma B."
  - "Ingreso = suma D."
  - "Precio = ingreso / venta."
  - "Costo/Flete ponderados."
  - "Margen = Precio - Costo - Flete."
  - "J/K/L/Q/R/S/T usan schedules diarios 064-R1."
  - "Overrides diarios 064-R1 fluyen a la semana."
  - "Overrides C/F/G 065-R1 fluyen a la semana."
  - "Margen Neto/Sobrantes siguen semántica Excel."
  - "HG importe suma días."
  - "C&D preserva signo."
  - "Resultado Importe suma resultado diario con precisión completa."
  - "Resultado $/kg de semana detallada conserva fórmula normal."
  - "Resultado histórico legacy pre-octubre se preserva cuando existe."
  - "No se inventa desglose J/K/L/Q/R/S/T pre-octubre."
  - "Semana mixta Sep/Oct conserva Resultado legacy + detallado."
  - "Semana mixta deriva Resultado $/kg = Resultado Importe / Venta cuando la cadena detallada no existe."
  - "resultado_kg * venta_kg = resultado_mxn en semana mixta."
  - "Sin Resultado Importe, Resultado $/kg queda null."
  - "Con Venta 0, Resultado $/kg queda null."
  - "Gráfica abre la métrica seleccionada."
  - "Venta usa eje kg."
  - "Ingreso/HG/Resultado importe usan eje MXN."
  - "Métricas por kilo usan eje $/kg."
  - "Título de serie es Gráfica · {métrica}."
  - "Modal legacy conserva título Rentabilidad IGF Diario."
  - "Ventanas 1D/5D/1M/3M/YTD/1A/5A/Todo permanecen."
  - "Real/proyectado/tendencia permanecen."
  - "Histórico detallado inexistente conserva gaps."
  - "Resultado histórico existente no se borra."
  - "No parsing XLSX."
  - "No hardcode de semanas/filas/importes."
  - "No query por día."
  - "No query por concepto."
  - "No N+1 por planta."

validated_week_40:
  range: "2026-09-28/2026-10-04"
  iso_week: 40
  behavior:
    - "No se parte el 01/10."
    - "Resultado de septiembre usa evidencia legacy existente."
    - "Resultado de octubre usa contrato detallado."
    - "Componentes nuevos de septiembre permanecen null."
    - "Resultado Importe combina ambos lados."
    - "Resultado $/kg puede derivarse directamente del Importe / Venta."

validated_chart:
  units:
    venta_kg: "kg"
    ingreso_mxn: "MXN"
    hg_mxn: "MXN"
    resultado_mxn: "MXN"
    precio_kg: "$/kg"
    costo_kg: "$/kg"
    flete_kg: "$/kg"
    margen_kg: "$/kg"
    com_desc_kg: "$/kg"
    resultado_kg: "$/kg"

  windows:
    - "1D"
    - "5D"
    - "1M"
    - "3M"
    - "YTD"
    - "1A"
    - "5A"
    - "Todo"

validated_performance:
  - "Una llamada frontend por cambio de semana."
  - "Una llamada por cambio de rango de gráfica."
  - "No query por concepto."
  - "No query por día."
  - "Schedules de gastos se arman en memoria."
  - "Desglose/distribución se cargan una vez por mes involucrado."
  - "No se degrada la vista Todas."

validated_tests:
  - "067 PASS 8/8."
  - "Regresión reportada PASS 184/184."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "065 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "Gráficas 054–056-R1 PASS."
  - "Excel 036-044 relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

production_validation_required:
  ui:
    - "Seleccionar una planta en IGF Diario."
    - "Confirmar desaparición de Comparación IGF Forecast vs última versión."
    - "Confirmar panel IGF Diario semanal vertical."
    - "Confirmar Concepto/Valor semana."
    - "Confirmar semana del corte."
    - "Probar anterior/siguiente."
    - "Confirmar número ISO."

  same_week_excel:
    - "Comparar Venta con fila Semana del Excel."
    - "Comparar Precio."
    - "Comparar Costo."
    - "Comparar Flete."
    - "Comparar Margen."
    - "Comparar J/K/L."
    - "Comparar Q/R/S/T."
    - "Comparar HG."
    - "Comparar C&D."
    - "Comparar Resultado $/kg."
    - "Comparar Resultado Importe."

  cross_month:
    - "Abrir semana 40 28/09–04/10."
    - "Confirmar que no se divide."
    - "Confirmar Resultado histórico cuando exista."
    - "Confirmar componentes nuevos pre-octubre como —."
    - "Confirmar Resultado $/kg = Resultado Importe / Venta."

  chart:
    - "Seleccionar Venta y confirmar eje kg."
    - "Seleccionar Margen y confirmar eje $/kg."
    - "Seleccionar Resultado Importe y confirmar eje $."
    - "Probar 1D/5D/1M/3M/YTD/1A/5A/Todo."
    - "Confirmar puntos históricos de Resultado."
    - "Confirmar gaps de componentes no existentes."

  forecast:
    - "Cambiar a Forecast con planta."
    - "Confirmar que comparación contra mes anterior continúa."

pr_contract:
  base: "main"
  head: "fix/igf-diario-weekly-crossmonth-result-kg-067-r2"
  title: "IMPL 067: vista semanal vertical IGF Diario por planta"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

in_scope:
  - "Verificar origin/main."
  - "Verificar rama ahead 6 / behind 0."
  - "Verificar todos los SHA de la cadena."
  - "Verificar que no existan cambios de producto posteriores a 9328caef."
  - "Crear reporte G4-PREP."
  - "Crear PR."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar Excel."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != d58216dd128c459df6ac9aff4a05a75f9505d8a6, STOP."
  - "Si la rama deja de estar ahead 6 / behind 0 antes del commit G4, STOP."
  - "Si aparecen cambios nuevos de producto después de 9328caef1f7c2a5e78b1a6988ed405a377a0317c, STOP."
  - "Si PR no es mergeable, STOP."
  - "No rebase."
  - "No merge."

acceptance_criteria:
  - "main exacto."
  - "Rama contiene 067 + R1 + R2 completos."
  - "Solo commit documental G4 adicional."
  - "PR abierto."
  - "Base/head correctos."
  - "PR mergeable."
  - "No merge."
  - "No deploy."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-WEEKLY-PLANT-VIEW-067.md"