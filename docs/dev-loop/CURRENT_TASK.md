task_id: "G4-PREP-IGF-DIARIO-DESGLOSE-GASTOS-064"

title: "Preparar PR del desglose Corporativos/Operativos IGF Diario 064"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064
  hacia main. No modificar producto ni tests. El merge a main queda
  reservado exclusivamente al HUMAN_APPROVER.

main_reference_sha: "7da3851c7bee0a629a2348478b3a1408985e5945"

branch: "implementation/igf-diario-desglose-gastos-064"

product_sha: "8335d52c16ed0aa361e34f7cfe6c7895cb34823b"

validated_source_sha: "a4356094c9c36c84401a01e57a165fb6411c7a18"

target_branch: "main"

validated_scope:
  - "Nuevo desglose activo únicamente desde 2026-10."
  - "2026-09 y anteriores mantienen layout y fórmulas legacy."
  - "Corporativos: Gasto Corporativo + Inversiones + Impuestos Federales."
  - "Operativos: Nómina/Gastos + IMSS/SUA + Extraordinarios + Provisiones Planta."
  - "Dashboard muestra únicamente total CORPORATIVOS y OPERATIVOS."
  - "Octubre+ abre modal para editar componentes."
  - "Zona Provincia no es editable."
  - "Manual/Auto deja de mostrarse octubre+."
  - "Manual/Auto legacy permanece antes de octubre."
  - "0 es valor válido."
  - "Guardado del grupo es completo y atómico."
  - "Desglose sincroniza total con tabla 062."
  - "No se reclasifican valores existentes."
  - "Sin desglose se conserva total agregado 062."
  - "J/K/L/M implementado para Corporativos."
  - "Q/R/S/T/U implementado para Operativos."
  - "Nueva columna R desplaza columnas posteriores."
  - "Día inhábil escribe 0 en los siete conceptos."
  - "Semana usa dinero asignado por hábiles / Venta KG semanal."
  - "TOTAL MES usa monto mensual / Venta KG total."
  - "Provincia usa nuevo layout desde octubre."
  - "Individual y Todas respetan gate histórico."
  - "Forecast permanece intacto."
  - "063-R1 permanece intacto."

schema:
  table: "arr.igf_diario_gastos_desglose"
  primary_key:
    - "plant_code"
    - "year"
    - "month"
  concepts:
    - "gasto_corporativo"
    - "inversiones"
    - "impuestos_federales"
    - "presupuesto_nomina_gastos"
    - "presupuesto_imss_sua"
    - "extraordinarios"
    - "provisiones_planta"
  safety:
    - "CREATE TABLE IF NOT EXISTS."
    - "Sin migración."
    - "Sin datos iniciales."
    - "No modifica históricos."

validated_excel_contract:
  legacy_2026_09:
    corporativos_total: "M"
    operativos_total: "T"
    hg: "X/Y"
    sobrante_post_hg: "AA"
    cd: "AC"
    resultado: "AE/AF"
    comentario: "AH"
    ventas: "AI"
    carry: "AJ/AK"
  detailed_2026_10_plus:
    corporate_components: "J/K/L"
    corporate_total: "M"
    margin_net: "O"
    operative_components: "Q/R/S/T"
    operative_total: "U"
    sobra_operacion: "W"
    hg: "Y/Z"
    sobrante_post_hg: "AB"
    cd: "AD"
    resultado: "AF/AG"
    comentario: "AI"
    ventas: "AJ"
    carry: "AK/AL"

validated_tests:
  - "064 PASS 21/21."
  - "Regresiones 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036-041 PASS."
  - "75/75 en corrida conjunta."
  - "059-R1 5/5 al repetir."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-desglose-gastos-064"
  title: "IMPL 064: desglose Corporativos y Operativos en IGF Diario"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

production_validation_required_after_deploy:
  - "Octubre abre modal al hacer clic en CORPORATIVOS."
  - "Modal Corporativos contiene 3 conceptos."
  - "Octubre abre modal al hacer clic en OPERATIVOS."
  - "Modal Operativos contiene 4 conceptos."
  - "No aparecen Manual/Auto en octubre."
  - "Guardar recalcula los totales del dashboard."
  - "Excel octubre usa J/K/L/M y Q/R/S/T/U."
  - "Días inhábiles tienen 0 en los conceptos."
  - "Cierres semanales usan fórmula dinero semanal / venta semanal."
  - "Excel Todas conserva el layout nuevo en cada planta y Provincia."
  - "Descargar septiembre conserva layout histórico."
  - "Forecast sigue intacto."

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA y delivery SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar DB productiva."
  - "Insertar datos."
  - "Reclasificar valores actuales."
  - "Merge a main."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

acceptance_criteria:
  - "origin/main sigue exactamente en 7da3851c7bee0a629a2348478b3a1408985e5945."
  - "No aparecen cambios nuevos de producto ni tests."
  - "PR base main / head implementation/igf-diario-desglose-gastos-064."
  - "PR queda abierto y mergeable."
  - "No merge."
  - "No deploy."
  - "Reporte contiene número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-DESGLOSE-GASTOS-064.md"
