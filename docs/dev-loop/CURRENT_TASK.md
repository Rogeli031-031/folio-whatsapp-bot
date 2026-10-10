task_id: "AUDIT-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-076"

title: "Auditar si un día financiero incompleto debe anular la semana"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

main_reference_sha: "f6dbbe76021ce52f8f2559836239a95f415c2615"

branch: "audit/igf-diario-weekly-financial-coverage-076"

phase: "AUDIT_READ_ONLY"

objective: >
  Determinar si un día con venta positiva e información financiera
  incompleta debe anular com_desc_kg, resultado_kg y resultado_mxn
  de toda la semana. No implementar.

classification: "EXPECTED_BY_CONTRACT"

decision: "B"

report: "docs/dev-loop/reports/AUDIT-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-076.md"

protections:
  - "sin cambios de producto"
  - "sin tests"
  - "sin escritura en base de datos"
  - "sin PR funcional"
  - "sin merge"
  - "sin deploy"
  - "el 04/10 diario permanece null"
  - "sin imputar la comisión desconocida"
