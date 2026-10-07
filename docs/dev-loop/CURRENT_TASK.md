task_id: "G4-PREP-IGF-DIARIO-068-R1-R2"

title: "Preparar integración de detalle de folios y precio inicial IGF Diario 068-R1/R2"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Preparar el Pull Request hacia main de la cadena
  FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1
  y FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.

  No modificar producto ni tests.
  No hacer merge ni deploy.
  El merge queda reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "4adab4643e91e10c97d6f492044398f710d0608d"

branch: "fix/igf-diario-folio-drawer-role-guard-068-r2"

delivery_chain:
  r1_product: "2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58"
  r1_final: "577e7c59b4196192fcf875d93c9365835cb4b73b"
  r2_product: "f550670d279264f75a57743072efc0003fc09439"
  r2_final: "e87a4237bf76b081e562e2fe45f9f21fc670ca43"

expected_branch_state:
  ahead: 4
  behind: 0
  merge_base: "4adab4643e91e10c97d6f492044398f710d0608d"

validated_scope:
  folio_detail:
    - "Detalle diario de 068 ya no usa tabla comprimida."
    - "Cada folio aparece en tarjeta independiente."
    - "Código de folio visible."
    - "Monto destacado."
    - "Estado visible como badge."
    - "Descripción usa ancho completo."
    - "Abrir folio → disponible."
    - "Click en código abre el mismo folio."
    - "Se reutiliza FolioDrawer existente."
    - "Cerrar FolioDrawer conserva el modal diario."
    - "FolioDrawer queda visualmente encima del modal."
    - "FolioDrawer.tsx no fue modificado."

  security:
    - "El role sale de getRoleFromDashboardToken."
    - "No existe fallback GG/AD/ZP."
    - "No se pasa role vacío a FolioDrawer."
    - "Sin rol resuelto no se monta FolioDrawer."
    - "Se muestra aviso de rol no validado."
    - "Backend continúa siendo autoridad final."

  opening_price:
    - "loadPrecioDiario conserva precio mensual."
    - "Se consulta un último precio válido anterior al primer día del mes."
    - "precio debe ser numérico y > 0."
    - "No se restringe al mes inmediatamente anterior."
    - "No hay future backfill."
    - "Precio propio del día reemplaza al antecedente."
    - "Huecos posteriores arrastran último precio válido vigente."
    - "Sin antecedente válido, inicio permanece vacío."
    - "0/null previos no califican."
    - "Alias Querétaro/Queretaro y Tehuacán/Tehuacan se conservan."
    - "Código exacto mantiene precedencia en la fecha seleccionada."
    - "Morelos no está hardcodeado."
    - "Enero puede tomar antecedente del año anterior."
    - "Se conserva precisión completa."
    - "Override manual 065-R1 mantiene prioridad."

  morelos:
    example_fixture:
      prior: "2026-09-30 = 19.95"
      "01-06": "19.95"
      "07": "20.05"
      "08": "20.05"

    required_effect:
      - "PRECIO C deja de estar vacío cuando existe antecedente."
      - "INGRESO D = C × B."
      - "MARGEN H = C - F - G."
      - "La rentabilidad downstream vuelve a tener cobertura."
      - "No se modifican fórmulas financieras."

  database:
    - "No writes."
    - "arr.precio_diario no se modifica."
    - "Consulta mensual + una consulta constante de antecedente."
    - "Sin query por día."

validated_tests:
  - "068-R2 PASS 2/2."
  - "068-R1 PASS 6/6."
  - "068 PASS."
  - "067 PASS."
  - "066-R1 PASS."
  - "065 PASS."
  - "065-R1 PASS."
  - "node --check server.js PASS."
  - "frontend npm run build PASS."
  - "git diff --check limpio."

production_validation_required:
  folio_ui:
    - "Abrir IGF Diario acumulado con Planta=Todas."
    - "Seleccionar una celda diaria con varios folios."
    - "Confirmar tarjetas separadas y legibles."
    - "Confirmar importe, estado y descripción."
    - "Click en código."
    - "Confirmar apertura del folio correcto."
    - "Cerrar FolioDrawer y confirmar que vuelve a la lista diaria."
    - "Probar Abrir folio →."

  morelos:
    - "Descargar/abrir IGF Diario Morelos octubre 2026."
    - "Revisar 01/10 al 06/10."
    - "Confirmar que PRECIO ya está presente si existe antecedente histórico."
    - "Confirmar que no se utilizó hacia atrás el precio del 07/10."
    - "Confirmar INGRESO."
    - "Confirmar MARGEN."
    - "Confirmar rentabilidad downstream."
    - "Comparar el antecedente con arr.precio_diario si es necesario."

  regression:
    - "07/10 conserva su precio propio."
    - "Días posteriores sin precio arrastran el último válido."
    - "Overrides manuales siguen prevaleciendo."
    - "068 matriz mantiene importes/totales."
    - "067 semanal permanece."
    - "066 acumulado permanece."

pr_contract:
  base: "main"
  head: "fix/igf-diario-folio-drawer-role-guard-068-r2"
  title: "FIX 068-R1/R2: detalle de folios y precio inicial IGF Diario"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

in_scope:
  - "Verificar main exacto."
  - "Verificar rama ahead 4 / behind 0."
  - "Crear reporte G4-PREP."
  - "Crear Pull Request."
  - "Commit únicamente documental G4."
  - "Push a la rama."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar SQL."
  - "Modificar FolioDrawer."
  - "Modificar precio."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != 4adab4643e91e10c97d6f492044398f710d0608d, STOP."
  - "Si la rama deja de estar ahead 4 / behind 0 antes del commit G4, STOP."
  - "Si aparece cualquier cambio de producto posterior a e87a4237bf76b081e562e2fe45f9f21fc670ca43, STOP."
  - "Si el PR no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-068-R1-R2.md"