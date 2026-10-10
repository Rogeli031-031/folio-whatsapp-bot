task_id: "G4-PREP-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072"

title: "Preparar integración del cambio de precedencia de venta en fecha de corte 072"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "ad8a8ba8e00557993a8da62f735f9fe6ee020ada"

branch: "change/igf-diario-cutoff-real-sales-precedence-072"

product_sha: "3f2e41cff5ede48449a952a5eb7b19db4374b8c2"

implementation_final_sha: "73156c80355c9cf862fd1bcdfd647c2570ab23ca"

objective: >
  Auditar CHANGE 072 y preparar su Pull Request hacia main.
  Verificar que el cambio funcional se limite a la fecha exacta de corte:
  cada canal Casa/Comisionista conserva captura real válida y usa pronóstico
  solo como fallback. Confirmar que antes del corte permanece el contrato
  existente y después del corte continúa prevaleciendo el pronóstico.
  No modificar producto ni tests.
  No merge.
  No deploy.

contract_072:
  before_cutoff:
    rule: "Sin cambio."

  on_cutoff:
    rule: "Por canal: captura real válida -> pronóstico válido -> null."

  after_cutoff:
    rule: "Contrato proyectado anterior permanece sin cambio."

  zero_semantics:
    rule: "0 explícito cuenta como captura válida en la fecha de corte."

  null_semantics:
    rule: "No convertir missing/null a 0 en la fecha de corte."

verified_case:
  plant: "San Luis"
  date: "2026-10-04"
  casa_tons: 1.2
  comisionista_tons: 0.8
  venta_kg: 2000
  price: 21.13
  expected_income: 42260
  note: >
    Los 2,000 kg deben originarse en Casa + Comisionista.
    No deben copiarse desde la columna total de Provincia Venta Diaria.

important_contract_change:
  task: "054-R2"
  previous_rule: "La fecha de corte entraba a forecast."
  new_rule: "La fecha de corte conserva captura real válida por canal."

important_regression_effect:
  task: "054-R3"
  previous_cutoff_value_kg: 30750
  new_cutoff_value_kg: 9000
  reason: >
    30,750 kg correspondían al pronóstico. Con 072, los 9,000 kg
    capturados realmente en la fecha de corte prevalecen.
  expected: true

g4_required_checks:
  - "git fetch origin."
  - "origin/main debe permanecer en main_reference_sha."
  - "Verificar ancestry."
  - "Verificar merge-base."
  - "Verificar ahead/behind."
  - "Verificar product_sha."
  - "Verificar implementation_final_sha."
  - "Auditar product_sha..implementation_final_sha."
  - "Después del SHA producto solo debe existir documentación."
  - "Auditar origin/main...HEAD completo."
  - "Confirmar que no existe lógica específica de domingo."
  - "Confirmar que no existe hardcode San Luis."
  - "Confirmar que no existe hardcode 04/10/2026."
  - "Confirmar que la resolución se realiza por canal."
  - "Confirmar semántica explícita de 0."
  - "Confirmar que después del corte no se introdujo fallback a real."
  - "Confirmar que RESUMEN no fue modificado para conseguir el resultado."
  - "Confirmar que 069-R1 permanece intacto."
  - "Confirmar que 070/070-R1 permanece intacto."

cutoff_matrix_to_audit:
  - "fecha < corte + real -> comportamiento anterior."
  - "fecha == corte + Casa real + Comisionista real -> ambos reales."
  - "fecha == corte + Casa real + Comisionista forecast -> real + forecast."
  - "fecha == corte + Casa forecast + Comisionista real -> forecast + real."
  - "fecha == corte + ambos sin real + forecast -> forecast."
  - "fecha == corte + canal irresoluble -> null según contrato."
  - "fecha == corte + real 0 -> 0 gana a forecast."
  - "fecha > corte + real + forecast -> forecast."
  - "fecha > corte + ausencia de forecast -> comportamiento posterior existente."
  - "domingo de corte no recibe tratamiento especial."

tests_expected:
  - "072: 12/12 PASS."
  - "054-R2: 20/20 PASS."
  - "Lote 054-R1, 054-R3, 069, 069-R1, 069-R2, 070, 070-R1: 44/44 PASS."
  - "node --check server.js PASS."
  - "git diff --check PASS."
  - "Frontend no modificado."

in_scope:
  - "Auditoría."
  - "Reporte G4."
  - "Actualización documental CURRENT_TASK."
  - "Commit documental G4."
  - "Push a rama 072."
  - "Crear Pull Request."
  - "Verificar Pull Request."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar resolveCanalTon."
  - "Modificar precedencia."
  - "Modificar RESUMEN."
  - "Modificar 069."
  - "Modificar 070."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."
  - "Auto-merge."

pr_contract:
  base: "main"
  head: "change/igf-diario-cutoff-real-sales-precedence-072"
  title: "CHANGE 072: priorizar venta real en la fecha de corte"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

merge_contract:
  merge_authorized: false
  deploy_authorized: false
  auto_merge: false

report:
  path: "docs/dev-loop/reports/G4-PREP-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md"

  must_include:
    - "Base exacta."
    - "Merge-base."
    - "Ahead/behind."
    - "SHA producto."
    - "SHA documental."
    - "Auditoría product..final."
    - "Archivos funcionales."
    - "Archivos tests."
    - "Archivos documentales."
    - "Contrato 054-R2 anterior."
    - "Contrato 072 nuevo."
    - "Matriz fecha < / == / > corte."
    - "Resolución por canal."
    - "0 vs null."
    - "San Luis 04/10."
    - "Reconciliación 1.2 + 0.8 = 2.0 t."
    - "Ingreso 21.13 * 2,000."
    - "Cambio esperado 054-R3 30,750 -> 9,000."
    - "Demostración de que días posteriores siguen forecast."
    - "Protección 069-R1."
    - "Protección 070-R1."
    - "Pruebas."
    - "Riesgos/hallazgos."
    - "NO MERGE."
    - "NO DEPLOY."

stop_conditions:
  - "Si origin/main != ad8a8ba8e00557993a8da62f735f9fe6ee020ada, STOP."
  - "Si product_sha no pertenece a la rama, STOP."
  - "Si implementation_final_sha no corresponde al cierre reportado, STOP."
  - "Si después del product SHA existen cambios funcionales o de tests, STOP."
  - "Si aparece hardcode de San Luis/04-10/domingo, STOP."
  - "Si fecha > corte comienza a preferir real, STOP."
  - "Si el cambio 054-R3 30,750 -> 9,000 no se explica por la captura real, STOP."
  - "Si RESUMEN fue modificado funcionalmente para forzar 2,000 kg, STOP."
  - "Si PR tiene conflictos o no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  merge: false
  deploy: false