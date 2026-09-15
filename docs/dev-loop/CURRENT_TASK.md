```yaml
task_id: "IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-15"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Extender el Excel generado por el botón Exportar Excel de ARR agregando dos
  hojas nuevas, CASA ANUAL y COMISIONISTA ANUAL, con análisis YTD de movimiento
  por planta y subcategoría, más detalle de clientes que explican movimientos
  negativos y positivos y sus comentarios registrados.

report_period_contract:
  rule: >
    Utilizar desde enero hasta el mes seleccionado en ARR.
  comparison: >
    Comparar contra el mismo rango del año anterior.
  example: >
    Mes seleccionado septiembre 2026:
    enero-septiembre 2026 vs enero-septiembre 2025.

new_sheets:
  - "CASA ANUAL"
  - "COMISIONISTA ANUAL"

existing_sheets:
  rule: >
    No modificar estructura ni celdas contractuales de CASA, COMISIONISTA,
    EVALUACION u otras hojas existentes.

plant_matrix:
  rows:
    - "Puebla"
    - "Tehuacán"
    - "Acapulco"
    - "Querétaro"
    - "San Luis"
    - "Morelos"
    - "TOTAL"

  columns:
    A: "PLANTA"
    B: "AUTOTANQUE Δ TON"
    C: "PORTÁTIL Δ TON"
    D: "CARBURACIÓN Δ TON"
    E: "TOTAL Δ TON"

  calculation:
    B: "Venta YTD actual Autotanque - venta mismo YTD año anterior"
    C: "Venta YTD actual Portátil - venta mismo YTD año anterior"
    D: "Venta YTD actual Carburación - venta mismo YTD año anterior"
    E: "B + C + D"

client_detail:
  negative_section:
    title: "CLIENTES CON IMPACTO NEGATIVO"
    movement_types:
      - "DISMINUYERON"
      - "DEJARON DE COMPRAR"

  positive_section:
    title: "CLIENTES CON IMPACTO POSITIVO"
    movement_types:
      - "AUMENTARON"
      - "NUEVOS"

  columns:
    - "PLANTA"
    - "SUBCATEGORÍA"
    - "CLIENTE"
    - "VENTA YTD AÑO ANTERIOR (TON)"
    - "VENTA YTD AÑO ACTUAL (TON)"
    - "DELTA VENTA (TON)"
    - "TIPO DE MOVIMIENTO"
    - "CONTRIBUCIÓN AL MOVIMIENTO (%)"
    - "COMENTARIO / EVIDENCIA REGISTRADA"

comments_contract:
  source: >
    Reutilizar la fuente física vigente de comentarios de clientes/DICF que ya
    utilice ARR.
  rule: >
    Mostrar literalmente o resumir fielmente el comentario registrado.
    No convertir comentario en causa confirmada.
  missing_comment: >
    Mostrar "Sin comentario registrado" o equivalente neutro.

subcategory_contract:
  values:
    - "Autotanque"
    - "Portátil"
    - "Carburación"

  rule: >
    Los clientes deben aparecer dentro de la hoja CASA o COMISIONISTA según su
    categoría y conservar su subcategoría física correspondiente.

all_plants_rule: >
  El reporte anual debe incluir todas las plantas autorizadas necesarias para
  el análisis consolidado, no únicamente la empresa seleccionada en el dropdown,
  respetando los contratos de autorización existentes.

formatting:
  - "Mantener estilo profesional consistente con el Excel ARR actual."
  - "Diferenciar visualmente impactos positivos y negativos."
  - "Congelar encabezados cuando sea útil."
  - "Formatear toneladas y porcentajes consistentemente."
  - "Aplicar autofilter en tablas de clientes si la librería actual lo soporta."
  - "No usar celdas combinadas que dificulten filtros salvo encabezados visuales."

must_preserve:
  - "Exportar Excel actual sigue funcionando."
  - "CASA actual sigue funcionando."
  - "COMISIONISTA actual sigue funcionando."
  - "EVALUACION sigue apuntando a sus celdas actuales."
  - "No modificar cálculos del dashboard."
  - "No modificar ARR runtime salvo lo mínimo necesario para obtener datos del export."

tests_required:
  - "CASA ANUAL existe."
  - "COMISIONISTA ANUAL existe."
  - "las seis plantas aparecen."
  - "columnas B/C/D corresponden a Autotanque/Portátil/Carburación."
  - "columna E = B + C + D."
  - "periodo YTD no cruza meses."
  - "comparación usa mismo periodo del año anterior."
  - "clientes negativos aparecen en su hoja/categoría/subcategoría correctas."
  - "clientes positivos aparecen en su hoja/categoría/subcategoría correctas."
  - "delta cliente es consistente con los datos fuente."
  - "comentario corresponde al cliente correcto."
  - "sin comentario no inventa causa."
  - "EVALUACION no se rompe."
  - "hojas CASA/COMISIONISTA existentes no se sustituyen."
  - "Excel abre sin corrupción."

out_of_scope:
  - "modificar Director IA"
  - "inferir causalidad"
  - "crear comentarios nuevos"
  - "editar clientes"
  - "modificar SQL/schema"
  - "cambiar lógica del dashboard ARR"
  - "reemplazar hojas CASA o COMISIONISTA existentes"
  - "merge a main"
  - "deploy"

allowed_actions:
  - "crear rama implementation/arr-annual-category-analysis-export-001"
  - "modificar exportador Excel ARR"
  - "reutilizar helpers/fuentes ARR existentes"
  - "agregar tests"
  - "generar Excel de prueba"
  - "documentar evidencia"
  - "commit/push solo a rama autorizada si el protocolo lo permite"

forbidden_actions:
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "inferir causas desde comentarios"
  - "romper EVALUACION"
  - "siguiente tarea"

result_report_path: "docs/dev-loop/reports/IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001.md"

final_state: "DONE_PENDING_REVIEW"
```
