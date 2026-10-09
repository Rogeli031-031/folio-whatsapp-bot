task_id: "G4-PREP-FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2"

title: "Preparar integración de FIX 069-R2"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "ac8625cc8f3b81bd345c54a291219f7bf7b8e9ff"

branch: "fix/igf-diario-weekly-chart-values-compras-comment-069-r2"

product_sha: "5827f2c709cf847c029fee8e83b251c8ca293ce9"

implementation_final_sha: "b6a01c72cf437324119d0de35c171a321183a714"

objective: >
  Preparar G4 y Pull Request de FIX 069-R2 hacia main.
  Verificar integridad de la implementación ya aprobada para preparación.
  No modificar producto ni tests.
  No hacer merge ni deploy.
  El merge queda reservado al HUMAN_APPROVER.

verified_scope:
  weekly_chart:
    - "Etiquetas visibles en todos los puntos no-null."
    - "Resultado positivo distinguible en verde."
    - "Resultado negativo distinguible en rojo."
    - "Referencia horizontal de cero."
    - "Real continuo y proyectado punteado."
    - "Null permanece como hueco."
    - "summary_metric permanece."

  compras_comment:
    - "COMPRAS aparece al principio de COMENTARIO DEL DIA."
    - "Costo consolidado sale de CONTROL DE COMPRAS."
    - "Referencia usa los últimos dos días anteriores válidos."
    - "Puede cruzar semana y mes."
    - "Proveedor sale de compra real kg > 0."
    - "Tarifa no determina proveedor."
    - "Delta positivo usa rich text rojo."
    - "Delta negativo usa rich text verde."
    - "Solo el valor de la variación recibe color."
    - "Comentario existente de Venta/clientes permanece."

  puebla_acceptance:
    date: "2026-10-07"
    previous_costs:
      - 12.465
      - 12.465
    reference: 12.465
    current_cost: 12.918
    delta: 0.453
    supplier: "TOMZA TEPEJI"
    kg: 20220

validated_tests:
  - "109/109 PASS."
  - "node --check server.js PASS."
  - "frontend build exit 0."
  - "git diff --check limpio."

in_scope:
  - "git fetch origin."
  - "Verificar origin/main exacto."
  - "Verificar ancestry y ahead/behind."
  - "Verificar product SHA."
  - "Verificar que después de product_sha no existan cambios de producto/tests."
  - "Revisar diff completo contra main."
  - "Crear reporte G4."
  - "Actualizar CURRENT_TASK."
  - "Crear commit exclusivamente documental G4."
  - "Push únicamente a la rama 069-R2."
  - "Crear PR hacia main."
  - "Verificar head SHA del PR."
  - "Verificar mergeable/mergeable_state."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar fórmulas."
  - "Modificar DB."
  - "Modificar gráfica."
  - "Modificar comentarios."
  - "Modificar CONTROL DE COMPRAS."
  - "Rebase."
  - "Merge."
  - "Deploy."
  - "Auto-merge."

pr_contract:
  base: "main"
  head: "fix/igf-diario-weekly-chart-values-compras-comment-069-r2"
  title: "FIX 069-R2: valores de gráfica y comentario de compras"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

merge_contract:
  merge_authorized: false
  deploy_authorized: false
  auto_merge: false

stop_conditions:
  - "Si origin/main != ac8625cc8f3b81bd345c54a291219f7bf7b8e9ff, STOP."
  - "Si product_sha 5827f2c709cf847c029fee8e83b251c8ca293ce9 no pertenece a la rama, STOP."
  - "Si implementation_final_sha b6a01c72cf437324119d0de35c171a321183a714 no corresponde al estado reportado, STOP."
  - "Si después de product_sha existe modificación de producto o tests, STOP."
  - "Si aparece un diff inesperado contra main, STOP."
  - "Si el PR tiene conflictos o no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

result_report_path: "docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2.md"