task_id: "FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1"

title: "Mejorar detalle diario de folios y completar precio inicial de IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Aplicar dos correcciones delimitadas sobre la base productiva de 068:

  A) Mejorar la ventana de detalle diario de folios de la matriz 068 para
  que los registros sean legibles y permitan abrir directamente el folio
  existente mediante FolioDrawer.

  B) Corregir el precio inicial de IGF Diario cuando los primeros días del
  mes no tienen un precio propio en arr.precio_diario. En esos días debe
  usarse el último precio válido anterior al inicio del mes para la misma
  planta, hasta que aparezca el primer precio válido propio del mes.

  El caso visible es Morelos octubre 2026, donde los días 01–06 tienen
  Venta, Costo y Flete pero carecen de Precio e Ingreso.

base_sha: "4adab4643e91e10c97d6f492044398f710d0608d"

branch: "fix/igf-diario-detail-ux-opening-price-068-r1"

###############################################################################
# A. DETALLE DE FOLIOS 068-R1
###############################################################################

folio_detail_scope:
  source_component: "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"

  problem: >
    El detalle actual usa una tabla Folio/Estado/Monto/Descripción.
    Las columnas quedan demasiado juntas y las descripciones largas hacen
    difícil distinguir un folio de otro, especialmente en resoluciones
    pequeñas.

  replace_table_with_cards: true

folio_detail_header:
  display:
    - "Planta · fecha"
    - "Importe total de la celda"
    - "Número de folios"

  example:
    - "GT - Puebla · 04/09/2026"
    - "$104,635"
    - "6 folios"

folio_card_contract:
  each_folio:
    line_1:
      left: "Número/código de folio"
      right: "Monto"

    line_2:
      left: "Badge de estado"
      right: "Abrir folio →"

    body:
      - "Descripción ocupando el ancho disponible."
      - "Texto legible y separado del siguiente folio."

  example:
    folio: "F-202609-228"
    estado: "Depósito y cierre"
    importe: "$34,000"
    descripcion: "EMPLACAMIENTO DE UNIDADES DE TLAXCALA..."
    action: "Abrir folio →"

visual_contract:
  - "Cada folio debe ser visualmente independiente."
  - "Usar borde o separación clara entre tarjetas."
  - "Monto alineado y destacado."
  - "Folio claramente identificable."
  - "Estado como badge compacto."
  - "Descripción debajo, no comprimida en una columna angosta."
  - "Descripción puede ocupar 2–3 líneas."
  - "No crear horizontal overflow por la descripción."
  - "Mismo dark mode del dashboard."
  - "Responsive en celular."
  - "Targets táctiles adecuados."

status_labels:
  DEPOSITO_CIERRE: "Depósito y cierre"
  COMPROBACIONES: "Comprobaciones"
  EVIDENCIAS: "Evidencias"

open_folio_contract:
  component: "frontend-dashboard/components/FolioDrawer.tsx"

  rule: >
    Reutilizar FolioDrawer existente. No crear una segunda ficha del folio
    y no navegar a una pantalla paralela.

  source_id: >
    Usar folio.id que ya viene en cada detalle de la matriz 068.

  triggers:
    - "Click/tap en el número de folio."
    - "Click/tap en Abrir folio →."

  behavior:
    - "La lista diaria permanece abierta debajo."
    - "FolioDrawer se abre por encima."
    - "Cerrar FolioDrawer regresa a la misma lista diaria."
    - "Cerrar FolioDrawer no debe cerrar la celda seleccionada."
    - "No perder scroll/selección de la lista."

  auth:
    - "Usar el mismo token actual."
    - "Resolver role con getRoleFromDashboardToken."
    - "No asumir GG si no puede determinarse el rol."
    - "Backend sigue siendo autoridad final."
    - "No ampliar permisos de edición."

  layering:
    rule: >
      El FolioDrawer debe tener prioridad visual sobre el modal/lista de la
      celda. Ajustar z-index/orden de render si es necesario sin modificar
      FolioDrawer global de forma riesgosa.

folio_detail_out_of_scope:
  - "Cambiar monto de folio."
  - "Cambiar estado."
  - "Cambiar fecha threshold."
  - "Cambiar agregación 068."
  - "Cambiar permisos backend."
  - "Duplicar FolioDrawer."

###############################################################################
# B. PRECIO INICIAL IGF DIARIO / MORELOS
###############################################################################

morelos_evidence:
  month: "2026-10"

  observed:
    - "01/10 tiene Venta pero Precio vacío."
    - "02/10 tiene Venta pero Precio vacío."
    - "03/10 tiene Venta pero Precio vacío."
    - "04/10 tiene Venta pero Precio vacío."
    - "05/10 tiene Venta pero Precio vacío."
    - "06/10 tiene Venta pero Precio vacío."
    - "Costo y Flete sí están disponibles."
    - "Precio visible aparece posteriormente en el mes."

  consequence:
    - "Ingreso D queda vacío porque depende de C × B."
    - "Margen H queda vacío porque depende de C - F - G."
    - "Margen Neto/Sobrantes/Resultado pierden cobertura."

root_cause:
  module: "lib/dashboard-arr-forecast.js"

  functions:
    - "loadPrecioDiario"
    - "resolvePrecioDailySeries"
    - "appendPrecioWorksheet"

  current_behavior: >
    loadPrecioDiario lee únicamente fechas dentro del mes solicitado.
    resolvePrecioDailySeries empieza lastValidPrecio=null.
    Por tanto, antes del primer precio válido del mes no existe fallback.

  legacy_contract: "IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029"

opening_price_contract:
  general_rule: >
    Para cada planta, resolver el último precio válido estrictamente anterior
    al primer día del mes solicitado.

  previous_valid_definition:
    source: "arr.precio_diario"
    condition:
      - "fecha < primer día del mes"
      - "precio numérico"
      - "precio > 0"
      - "misma identidad/equivalencia de planta"

    order: "fecha DESC"
    result: "el registro válido más reciente"

  important:
    - "No limitar necesariamente al mes calendario anterior."
    - "Usar el último precio válido histórico disponible anterior al mes."
    - "No usar un precio futuro para rellenar días anteriores."
    - "No inventar precio si no existe antecedente válido."

daily_resolution:
  initial_value: "previous_valid_price"

  for_each_day:
    own_valid_price:
      rule: >
        Si el día tiene precio propio numérico > 0, usarlo y convertirlo
        en el nuevo precio vigente.

    no_own_price:
      rule: >
        Usar el último precio válido vigente: inicialmente el antecedente
        previo al mes y después cualquier precio propio válido aparecido
        dentro del mes.

  example:
    prior_valid: 19.95
    current_month:
      "01": null
      "02": null
      "03": null
      "04": null
      "05": null
      "06": null
      "07": 20.05

    expected:
      "01": 19.95
      "02": 19.95
      "03": 19.95
      "04": 19.95
      "05": 19.95
      "06": 19.95
      "07": 20.05
      "08+": "20.05 hasta el siguiente precio propio"

  note: >
    19.95 es únicamente un ejemplo contractual. No usar ese número literal.
    El valor real debe venir de arr.precio_diario.

plant_identity_contract:
  - "No hardcodear Morelos."
  - "La corrección debe servir para todas las plantas."
  - "Respetar canonicalForecastPlantKey."
  - "Respetar precioLookupCodes."
  - "Respetar aliases Querétaro/Queretaro."
  - "Respetar aliases Tehuacán/Tehuacan."
  - "Morelos debe resolver Morelos."
  - "Si coexisten códigos equivalentes, conservar precedencia exacta vigente."

prior_alias_precedence:
  rule: >
    Para buscar el último precio previo, aplicar la misma identidad de
    planta y precedencia usada para el precio mensual. No tomar el precio
    de otra planta ni elegir arbitrariamente un alias.

  exact_code:
    preference: "preferido cuando existe precio válido en la fecha ganadora"

  equivalent_code:
    fallback: true

no_future_backfill:
  critical_rule: >
    Si el primer precio propio de octubre es 07/10, NO usar ese precio para
    rellenar 01–06. Esos días deben usar exclusivamente el último precio
    válido anterior al 01/10. Si ese antecedente no existe, permanecen vacíos.

manual_override_contract:
  rule: >
    Los overrides manuales de PRECIO de 065-R1 conservan prioridad sobre
    cualquier precio automático heredado.

  priority:
    - "override manual"
    - "precio propio del día"
    - "último precio válido vigente"
    - "vacío"

excel_contract:
  sheet: "IGF Diario {planta}"

  columns:
    B: "Venta KG"
    C: "Precio"
    D: "Ingreso"
    F: "Costo"
    G: "Flete"
    H: "Margen"

  formulas:
    D: "C × B"
    H: "C - F - G"

  required_effect: >
    Cuando B, F y G ya tienen valores y existe precio previo válido,
    C debe tener precio y por tanto D/H y la cadena de rentabilidad deben
    poder calcularse.

downstream_contract:
  verify:
    - "Margen Neto."
    - "Sobrante antes HG."
    - "HG."
    - "Sobrante con HG."
    - "C&D."
    - "Resultado $/kg."
    - "Resultado importe."
    - "Acumulado mensual 066/066-R1."
    - "Vista semanal 067."

  rule: >
    No introducir una fórmula paralela. El nuevo precio inicial debe entrar
    en la fuente diaria que ya consumen los cálculos existentes.

support_price_sheet:
  rule: >
    La hoja PRECIO generada debe mostrar también el precio inicial heredado
    en los primeros días cuando exista antecedente válido.

  precision:
    - "Conservar precisión completa del valor almacenado."
    - "No redondear el dato fuente a 2 decimales."
    - "El formato visual puede seguir el contrato existente."

missing_prior:
  rule: >
    Si no existe ningún precio válido anterior y tampoco hay precio propio
    todavía, mantener vacío. No usar 0 y no inventar valor.

###############################################################################
# PERFORMANCE / DB
###############################################################################

price_query_contract:
  preferred:
    - "Carga mensual actual + una lectura constante del último precio previo."
    - "O una sola query capaz de traer periodo + antecedente."

  forbidden:
    - "Query por día."
    - "Query por fila."
    - "N+1."
    - "Buscar precio previo separadamente para cada fecha."

writes:
  - "No escribir arr.precio_diario."
  - "No corregir datos productivos manualmente."
  - "Solo lectura."

###############################################################################
# TESTS
###############################################################################

mandatory_tests:
  folio_ux:
    - "Detalle diario ya no usa tabla comprimida."
    - "Cada folio tiene bloque/tarjeta independiente."
    - "Monto visible y separado."
    - "Estado visible."
    - "Descripción ocupa ancho útil."
    - "Botón Abrir folio existe."
    - "Número de folio es clicable."
    - "Abre FolioDrawer con el id correcto."
    - "Cerrar drawer conserva lista diaria."
    - "Token/role se reutilizan."
    - "No modifica cálculo de celda 068."

  price:
    - "Precio previo válido alimenta días iniciales vacíos."
    - "Primer precio propio del mes reemplaza antecedente desde ese día."
    - "Huecos posteriores arrastran el último precio vigente."
    - "No future backfill."
    - "Sin antecedente válido deja vacío."
    - "Precio 0 no es antecedente válido."
    - "Precio null no es antecedente válido."
    - "Alias exactos conservan precedencia."
    - "Morelos no está hardcodeado."
    - "Enero resuelve antecedente de diciembre del año anterior."
    - "Cambio de año correcto."
    - "Precisión completa."
    - "Override manual gana."
    - "Ingreso se calcula si Venta+Precio existen."
    - "Margen se calcula si Precio+Costo+Flete existen."

  regression:
    - "068 PASS."
    - "067 PASS."
    - "066-R1 PASS."
    - "066 PASS."
    - "065-R1 PASS."
    - "065 PASS."
    - "064-R1 PASS."
    - "064 PASS."
    - "029 actualizado a nueva regla."
    - "027 PASS o actualizado justificadamente."
    - "033 aliases PASS."
    - "052 costo día 1 PASS."
    - "frontend npm run build PASS."
    - "node --check server.js PASS."
    - "git diff --check limpio."

recommended_files:
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "frontend-dashboard/components/FolioDrawer.tsx solo si fuera estrictamente necesario"
  - "frontend-dashboard/lib/auth.ts solo si fuera estrictamente necesario"
  - "lib/dashboard-arr-forecast.js"
  - "server.js si se requiere propagar precio anterior"
  - "test/igf-diario-folios-deposito-matrix-068.test.js"
  - "test/igf-diario-precio-carry-forward-029.test.js"
  - "test/igf-diario-precio-sheet-027.test.js"
  - "test/igf-diario-precio-plant-aliases-033.test.js"
  - "test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md"

out_of_scope:
  - "Cambiar ventas de Morelos."
  - "Cambiar costos."
  - "Cambiar fletes."
  - "Editar arr.precio_diario."
  - "Crear precios artificiales."
  - "Modificar fórmulas financieras 066."
  - "Modificar distribución 064."
  - "Modificar matriz/fechas/importe de folios 068."
  - "Cambiar estados de folios."
  - "Cambiar base de datos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 4adab4643e91e10c97d6f492044398f710d0608d, STOP."
  - "Si para Morelos no existe antecedente de precio válido y se pretende usar 07/10 hacia atrás, STOP."
  - "Si se necesita inventar un precio, STOP."
  - "Si abrir FolioDrawer requiere ampliar permisos, STOP."
  - "Si el cambio genera N+1, STOP."
  - "Si se modifica arr.precio_diario, STOP."
  - "Si 068 cambia sus agregaciones o threshold dates, STOP."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md"