task_id: "G4-PREP-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068"

title: "Preparar PR de matriz diaria de folios en Depósito y Cierre 068"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Preparar el Pull Request de
  IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068
  hacia main. No modificar producto ni tests.
  El merge queda reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "c4f2db88784642433008b8b313ad2d60e17d896a"

branch: "implementation/igf-diario-folios-deposito-matrix-068"

product_sha: "3c31b205db5a800f06e5b2d62175a6c816074679"

validated_source_sha: "61c2fa899df6783142d19776c33c525b96c7a690"

target_branch: "main"

validated_scope:
  - "Todas + IGF Diario sustituye la tabla inferior legacy por matriz 068."
  - "Tabla superior IGF Diario acumulado permanece."
  - "Planta específica + IGF Diario conserva panel semanal 067."
  - "Forecast conserva comportamiento existente."
  - "Filas = plantas."
  - "Columnas = días calendario del mes del corte."
  - "Última columna = Total mes."
  - "Última fila = Total día."
  - "Esquina inferior = Total general."
  - "Cada celda muestra importe, número de folios y descripción corta."
  - "Click en celda muestra detalle de folios."
  - "Monto usa public.folios.importe."
  - "No usa facturas ni comprobado."
  - "NULL de importe cuenta folio pero no suma dinero."
  - "0 explícito es válido."
  - "Descripción usa descripcion/concepto y Sin descripción como fallback."
  - "Con varios folios usa descripción del mayor importe +N."
  - "Empate se resuelve de forma determinista."
  - "Primera transición calificante fija el día."
  - "No usa fecha de creación del folio."
  - "No usa mes_cargo como fecha del evento."
  - "Un folio se cuenta máximo una vez."
  - "PAGADO/CERRADO equivalen a DEPOSITO_CIERRE."
  - "COMPROBACIONES entra."
  - "EVIDENCIAS entra."
  - "CHEQUE_GENERADO y anteriores no entran."
  - "CANCELADO queda fuera."
  - "Evento posterior al corte no entra."
  - "Salto directo a etapa posterior usa esa primera transición."
  - "Estado efectivo se determina con historial hasta el corte."
  - "Zona horaria de fecha histórica = America/Mexico_City."
  - "No hardcode de IDs de planta."
  - "Equivalencias IGF existentes se reutilizan."
  - "dashboardAuthMiddleware permanece."
  - "GV permanece bloqueado."
  - "buildDashboardWhere conserva visibilidad por rol/planta/solo_zp_ad."
  - "No query por planta."
  - "No query por día."
  - "No query por folio."
  - "Detalle usa los datos ya cargados."
  - "query_count reportado = 3."

canonical_status_mapping:
  module: "lib/folio-etapa-visual.js"

  stages:
    - "PENDIENTE_APROB_PLANTA"
    - "APROB_DIRECTOR_ZP"
    - "CARRO_COMPRA"
    - "CUENTA_FONDOS"
    - "CHEQUE_GENERADO"
    - "DEPOSITO_CIERRE"
    - "COMPROBACIONES"
    - "EVIDENCIAS"
    - "CANCELADO"

  threshold:
    - "PAGADO -> DEPOSITO_CIERRE"
    - "CERRADO -> DEPOSITO_CIERRE"
    - "COMPROBACIONES -> COMPROBACIONES"
    - "EVIDENCIAS -> EVIDENCIAS"

  excluded:
    - "CANCELADO"

validated_date_contract:
  source: "public.folio_historial.creado_en"

  timezone: "America/Mexico_City"

  rule: >
    El día de la celda es la primera transición histórica, hasta el corte,
    cuyo estado ya cumple DEPOSITO_CIERRE o adelante.

  deduplication:
    - "Depósito -> Comprobaciones -> Evidencias permanece en el primer día."
    - "No vuelve a sumar importe."
    - "No vuelve a incrementar count."

validated_amount_contract:
  source: "public.folios.importe"

  missing:
    - "NULL no suma dinero."
    - "NULL sí cuenta como folio."
    - "missing_amount_count lo identifica."

  zero:
    - "0 explícito es importe válido."

validated_totals:
  - "Total mes planta = suma de sus celdas."
  - "Total día = suma de plantas."
  - "Grand total = suma de Totales mes."
  - "Grand total = suma de Totales día."
  - "Conteos cumplen las mismas identidades."

validated_ui:
  component: "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"

  cell_example:
    - "$250,000"
    - "4 folios"
    - "Mantenimiento tanque +3"

  detail:
    columns:
      - "Folio"
      - "Estado"
      - "Monto"
      - "Descripción"

  layout:
    - "Planta sticky izquierda."
    - "Días en scroll horizontal."
    - "Total mes sticky derecha."
    - "Celdas no vacías clicables."
    - "Sin folios se muestra —."
    - "Sin importe se muestra Sin importe."

validated_endpoint:
  path: "GET /api/dashboard/igf-diario-folios-deposito"

  middleware:
    - "dashboardAuthMiddleware"
    - "dashboardBlockGVForbidden"

  visibility:
    - "buildDashboardWhere"
    - "ventanaDefault=false"
    - "solo_zp_ad"
    - "plantas permitidas"

  queries:
    resolver_plantas: 2
    lote_historial: 1
    total: 3

validated_tests:
  - "068 PASS 8/8."
  - "067 PASS."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "Regresión reportada 61/61 PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

production_validation_required:
  render:
    - "Entrar a IGF Diario acumulado con Planta=Todas."
    - "Confirmar que desapareció tabla inferior legacy."
    - "Confirmar matriz Folios en Depósito y Cierre (o adelante)."
    - "Confirmar 6 plantas visibles."
    - "Confirmar días correctos del mes."
    - "Confirmar Total mes y Total día."

  known_folio:
    - "Elegir al menos un folio real que haya pasado a Depósito y Cierre."
    - "Verificar fecha contra timeline del folio."
    - "Confirmar que aparece exactamente en esa fecha."
    - "Confirmar importe contra Importe del FolioDrawer."
    - "Confirmar descripción."
    - "Confirmar que si avanzó a Comprobaciones/Evidencias no se duplica."

  canceled:
    - "Elegir un folio cancelado que hubiera alcanzado el umbral."
    - "Confirmar que no aparece."

  cutoff:
    - "Seleccionar un corte anterior."
    - "Confirmar que eventos posteriores al corte no aparecen."

  totals:
    - "Abrir una celda con múltiples folios."
    - "Sumar importes del detalle."
    - "Confirmar igualdad con importe de celda."
    - "Confirmar count."
    - "Confirmar Total mes."
    - "Confirmar Total día."
    - "Confirmar Total general."

  permissions:
    - "Validar con usuario de alcance restringido si está disponible."
    - "Confirmar que no aparecen plantas/folios fuera de alcance."

  regression:
    - "Seleccionar una planta y confirmar 067."
    - "Cambiar a Forecast y confirmar comportamiento anterior."
    - "Confirmar que tabla superior IGF no cambió."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-folios-deposito-matrix-068"
  title: "IMPL 068: matriz diaria de folios en Depósito y Cierre por planta"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA."
  - "Verificar source SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar folios."
  - "Modificar historial."
  - "Modificar estados."
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
  - "Si origin/main != c4f2db88784642433008b8b313ad2d60e17d896a, STOP."
  - "Si la rama deja de estar ahead 2 / behind 0 antes del commit G4, STOP."
  - "Si aparecen cambios nuevos de producto después de 61c2fa899df6783142d19776c33c525b96c7a690, STOP."
  - "Si PR no es mergeable, STOP."
  - "No rebase."
  - "No merge."

acceptance_criteria:
  - "main exacto."
  - "Solo commit documental G4 adicional."
  - "PR abierto."
  - "Base/head correctos."
  - "PR mergeable."
  - "No merge."
  - "No deploy."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068.md"