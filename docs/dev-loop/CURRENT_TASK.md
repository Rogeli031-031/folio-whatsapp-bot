task_id: FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079

title: "Alinear semanas de IGF Diario Excel a domingo-sábado"

status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

base_sha: "0f96e3ed54df4b57c4ccba620e51205a23b22f9a"

branch: "fix/igf-diario-excel-sunday-saturday-weeks-079"

product_sha: "d8385a32e6930b47366002e325c02e4cb980166d"

problem:
  surface: "Excel exportado"
  sheet: "IGF Diario {planta}"
  example: "IGF Diario Morelos"

  observed: >
    La hoja RESUMEN agrupa correctamente la semana domingo-sábado,
    pero la hoja IGF Diario no coloca sus cortes/resúmenes semanales
    con el mismo calendario.

business_contract:
  week_start: SUNDAY
  week_end: SATURDAY

  rule: >
    Todos los agrupamientos semanales del IGF Diario deben usar
    domingo-sábado, igual que RESUMEN.

october_2026_expected_blocks:
  - "01/10/2026–03/10/2026 (bloque parcial inicial)"
  - "04/10/2026–10/10/2026"
  - "11/10/2026–17/10/2026"
  - "18/10/2026–24/10/2026"
  - "25/10/2026–31/10/2026"

critical_example:
  plant: Morelos
  expected:
    "04/10": SUNDAY
    "10/10": SATURDAY
    "11/10": SUNDAY
    "17/10": SATURDAY

design_goal: >
  Reutilizar la misma regla/helper semanal de RESUMEN cuando sea
  técnicamente apropiado, evitando dos definiciones distintas de semana.

protections:
  - "No modificar cálculos financieros."
  - "No modificar Venta."
  - "No modificar Precio."
  - "No modificar Costo/Flete."
  - "No modificar HG."
  - "No modificar Comisiones/Descuentos."
  - "No modificar RESULTADO."
  - "No modificar forecast."
  - "No modificar cutoff."
  - "No modificar 078-R2."
  - "No DB writes."
  - "No migrations."
  - "No hardcode Morelos."
  - "No hardcode octubre 2026."
  - "Debe funcionar para cualquier planta/mes/año."

required_surfaces:
  - "IGF Diario por planta"
  - "IGF Diario Provincia/Todas si comparte la misma estructura"
  - "RESUMEN debe conservar comportamiento actual correcto"

tests: "143/143"

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

report:
  path: "docs/dev-loop/reports/FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079.md"
