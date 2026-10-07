task_id: "G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069"

title: "Preparar PR de IGF Diario semanal domingo-sábado y comparativo por plantas 069"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Preparar el Pull Request de
  IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069
  hacia main.

  No modificar producto ni tests.
  No hacer merge ni deploy.
  El merge queda reservado al HUMAN_APPROVER.

main_reference_sha: "8ceb0d4657256999746d09905ec1d43373c02faf"

branch: "implementation/igf-diario-weekly-sunsat-multiplant-069"

product_sha: "7b2fa3340a65bef44119b9583355ff33a73bbcd1"

validated_source_sha: "843423bd5b2f4364f1a4fdee83734abe28e9e9d0"

expected_branch_state:
  ahead: 2
  behind: 0
  merge_base: "8ceb0d4657256999746d09905ec1d43373c02faf"

validated_calendar:
  convention: "domingo-sábado"

  example:
    anchor: "2026-10-06"
    week_number: 41
    from: "2026-10-04"
    to: "2026-10-10"

  previous:
    from: "2026-09-27"
    to: "2026-10-03"

  next:
    from: "2026-10-11"
    to: "2026-10-17"

  confirmed:
    - "No usa SEMANA ISO."
    - "sundayOfWeekContainingDate define inicio."
    - "saturdayOfWeekContainingDate define fin."
    - "weekNumber/weekYear reemplazan semántica ISO."
    - "Semana puede cruzar mes."
    - "01/10/2026 pertenece a 27/09–03/10."
    - "Cruce de año cubierto."

validated_single_plant:
  columns:
    - "Concepto"
    - "Semana"
    - "Dom"
    - "Lun"
    - "Mar"
    - "Mié"
    - "Jue"
    - "Vie"
    - "Sáb"

  confirmed:
    - "Semana es la primera columna numérica."
    - "Semana usa agregado de los siete días."
    - "Cada día usa aggregateWeek([day])."
    - "Exactly 7 days."
    - "NULL permanece —."
    - "Días proyectados se distinguen visualmente."
    - "Gráfica permanece."
    - "Selección de renglón sigue controlando la métrica de gráfica."

validated_all_plants:
  condition: "IGF Diario + Planta Todas"

  placement:
    - "Tabla superior IGF Diario."
    - "IGF Diario semanal · Todas."
    - "Folios en Depósito y Cierre."

  columns:
    - "Concepto"
    - "GT Puebla"
    - "Tehuacan"
    - "Acapulco"
    - "GTM Queretaro"
    - "GTM San Luis"
    - "Morelos"

  confirmed:
    - "Zona Provincia no se agrega."
    - "Frontend realiza una sola request semanal."
    - "GET /api/dashboard/igf-diario-semanal?todas=1."
    - "Backend usa catálogo existente."
    - "No hardcode de IDs."
    - "Se filtran plantas por autorización existente."
    - "Se reutiliza comprasCache."
    - "No query por día."
    - "No query por concepto."
    - "Forecast no monta vista multi-planta."

validated_rows:
  highlighted:
    - "Venta en Kilos"
    - "Precio de Venta al Público"
    - "Ingreso Generado"
    - "Margen Bruto"
    - "Margen Neto"
    - "Sobrante de Operación antes del HG"
    - "Sobrante de Operación con el HG"
    - "RESULTADO ($/kg)"
    - "RESULTADO (Importe)"

  visual:
    - "Separadores gruesos entre bloques."
    - "Marcador ámbar."
    - "RESULTADO (Importe) tiene mayor jerarquía."
    - "Negativos rojos."
    - "Resultados positivos verdes."
    - "Concepto sticky."
    - "Scroll horizontal."
    - "No se insertan filas falsas."

validated_financial_contract:
  - "Venta semanal suma kg."
  - "Ingreso suma ingreso diario."
  - "Precio = Ingreso/Venta."
  - "Costo ponderado."
  - "Flete ponderado."
  - "Margen Bruto = Precio-Costo-Flete."
  - "064/064-R1 permanece."
  - "065/065-R1 permanece."
  - "Precio inicial 068-R1/R2 fluye al semanal."
  - "HG permanece."
  - "C&D conserva signo."
  - "Resultado $/kg permanece."
  - "Resultado Importe conserva precisión."
  - "No se calcula desde valores visualmente redondeados."
  - "Legacy pre-octubre no inventa gastos nuevos."

validated_security:
  - "dashboardAuthMiddleware permanece."
  - "GV permanece bloqueado por contrato existente."
  - "assertPlantaPermitidaDashboard se aplica a plantas."
  - "Planta individual conserva autorización existente."
  - "Todas no amplía el catálogo visible."

validated_performance:
  frontend_requests_all_plants: 1

  backend:
    - "Carga por planta/mes, no por día."
    - "No iteración de queries por métrica."
    - "comprasCache compartido."
    - "query_count reportado."

validated_tests:
  - "069 + regresiones reportadas PASS 89/89."
  - "067 actualizado PASS."
  - "068-R2 PASS."
  - "068-R1 PASS."
  - "068 PASS."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "065 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "node --check server.js PASS."
  - "frontend npm run build PASS."
  - "git diff --check limpio."

production_validation_required:
  calendar:
    - "Corte 06/10/2026 debe abrir 04/10–10/10."
    - "Confirmar domingo como primera columna."
    - "Confirmar sábado como última."
    - "Confirmar SEMANA 41 sin palabra ISO."
    - "Probar Semana anterior/siguiente."

  all_plants:
    - "Seleccionar IGF Diario + Todas."
    - "Confirmar tabla semanal entre acumulado y Folios."
    - "Confirmar seis columnas de plantas."
    - "Confirmar orden de plantas."
    - "Comparar al menos dos plantas contra sus vistas individuales."

  single_plant:
    - "Seleccionar Acapulco."
    - "Confirmar Concepto | Semana | Dom…Sáb."
    - "Confirmar Semana antes de días."
    - "Comparar suma/ponderación semanal contra los siete días."
    - "Confirmar filas resaltadas."
    - "Confirmar separaciones visuales."

  precision:
    - "Resultado Importe no debe provenir de números redondeados visibles."
    - "Resultado $/kg debe conservar identidad con Venta cuando exista evidencia."

  regression:
    - "Gráfica funciona."
    - "1D/5D/1M/3M/YTD/1A/5A/Todo permanecen."
    - "Forecast permanece sin cambios."
    - "Folios 068 permanece."
    - "Precio Morelos 068-R1/R2 permanece."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-weekly-sunsat-multiplant-069"
  title: "IMPL 069: IGF Diario semanal domingo-sábado y comparativo por plantas"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

in_scope:
  - "Verificar main exacto."
  - "Verificar ahead 2 / behind 0."
  - "Crear reporte G4-PREP."
  - "Crear PR."
  - "Hacer únicamente commit documental G4."
  - "Push a rama 069."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar semana."
  - "Modificar fórmulas."
  - "Modificar Forecast."
  - "Modificar Folios."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 8ceb0d4657256999746d09905ec1d43373c02faf, STOP."
  - "Si antes del commit G4 la rama no está ahead 2 / behind 0, STOP."
  - "Si aparece cambio de producto posterior a 843423bd5b2f4364f1a4fdee83734abe28e9e9d0, STOP."
  - "Si el PR no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md"