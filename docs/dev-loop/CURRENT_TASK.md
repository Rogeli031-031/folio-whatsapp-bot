task_id: AUDIT-IGF-DIARIO-1010-RESULTADO-DELTA-078-R3
title: "Auditar cambio de RESULTADO (Importe) San Luis 10/10"
status: DONE_PENDING_REVIEW
phase: AUDIT_READ_ONLY

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

main_sha: "d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c"

candidate_branch: "fix/igf-diario-comdesc-last-real-fallback-078-r2"
candidate_product_sha: "eb03de9206508da33b7fcf3fc55d665508bdd37f"
candidate_final_sha: "25d64b8e803bf97ac3ab6e0f8f83e859ac941e82"

case:
  plant: "San Luis"
  date: "2026-10-10"
  cutoff: "2026-10-09"

outcome: A
regression: NO
last_real_fallback_on_1010: NOT_EXECUTED
recommendation: SAFE_FOR_PR

known:
  validation_077_resultado_mxn: -12529.461765140528
  current_both_shas_resultado_mxn: -29997.146805829616
  intermediate_after_hg_insert_resultado_mxn: -30568.656805829625
  venta_kg: 29730
  com_desc_kg: -4.3
  first_difference: HG
  hg_cause: "arr.compras_hg San Luis 2026-10-10 creado 2026-10-12T14:22:29.556Z con hg_kilos -382"

objective: >
  Determinar si -30,568.656805829625 ya lo produce main con los datos
  actuales, o si el cambio fue introducido por 078-R2.

restrictions:
  - READ ONLY
  - NO PRODUCT CHANGE
  - NO DB WRITE
  - NO PR
  - NO MERGE
  - NO DEPLOY

report:
  path: "docs/dev-loop/reports/AUDIT-IGF-DIARIO-1010-RESULTADO-DELTA-078-R3.md"
