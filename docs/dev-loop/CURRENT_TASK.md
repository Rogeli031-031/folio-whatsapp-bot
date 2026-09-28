task_id: "FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050"

title: "IGF Diario sigue hasta fin de mes y toma la venta total de la planta"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-27T21:49:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-27"

prior_task_review: "main está en 164310afb26466424c64c1a03139f11a94b93162. La 049 vaciaba IGF Diario después del corte. Esa regla queda sustituida: el corte es el primer día proyectado y la hoja se llena hasta el último día del mes."

objective: "IGF Diario se llena hasta fin de mes. Antes del corte usa datos reales y desde el corte, incluido ese día, usa la proyección que ya está en las hojas fuente. La venta en kilos sale de la columna total de la planta, no de CASA más COMISIONISTA."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "164310afb26466424c64c1a03139f11a94b93162"

branch: "fix/igf-diario-continuar-proyeccion-desde-corte-050"

in_scope:
  - "lib/igf-diario-puebla.js: quitar el corte que deja B:AF vacías; fecha < corte es real con el carry histórico; fecha >= corte es proyectado y lee las hojas fuente de ese día, sin carry adicional; VENTA KG referencia la columna total de la planta por 1000"
  - "test/igf-diario-continuar-proyeccion-desde-corte-050.test.js"
  - "pruebas 045 y 049: actualizar solo las aserciones que exigían B:AF vacías después del corte, documentando que ese contrato quedó sustituido"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "lib/compras-excel.js"
  - "server.js"
  - "frontend"
  - "motor de Pronóstico"
  - "Provincia Venta Diaria"
  - "Provincia Comisiones"
  - "PRECIO"
  - "fórmula de Compras"
  - "base de datos"
  - "Director IA"
  - "un segundo motor de pronóstico"
  - "frontend-dashboard/.next"
  - "PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "fecha < corte es real"
  - "fecha >= corte es proyectado"
  - "el día de corte entra en la proyección"
  - "IGF Diario se llena hasta el último día del mes"
  - "Semana y TOTAL MES incluyen reales y proyectados"
  - "VENTA KG proviene de la columna total de la planta en Provincia Venta Diaria multiplicada por 1000"
  - "VENTA KG no se reconstruye con CASA más COMISIONISTA"
  - "PRECIO proviene de PRECIO"
  - "COSTO KG, FLETE KG y HG provienen de CONTROL DE COMPRAS"
  - "C&D proviene de Provincia Comisiones"
  - "desde el corte no hay carry histórico adicional"
  - "el carry amarillo histórico se conserva solo cuando fecha < corte"

acceptance_criteria:
  - "Puebla, corte 2026-09-25: 25=42000 kg, 26=49500, 27=21500, 28=57000, 29=61500 y 30=45500"
  - "No hay filas vacías después del corte"
  - "PRECIO, COSTO KG, FLETE KG, C&D y HG del 25 al 30 referencian las hojas fuente"
  - "Si el total de Puebla es 49.500 y CASA más COMISIONISTA es otro número, IGF Diario usa 49500 kg"
  - "Acapulco usa su propia columna total"
  - "Queretaro/Querétaro o Tehuacan/Tehuacán usa su propia columna total mediante la equivalencia existente"
  - "Corte 2026-09-27: 1 al 26 real y 27 al 30 proyectado"
  - "Semana 4 incluye 21 al 27"
  - "Semana 5 incluye 28 al 30"
  - "TOTAL MES incluye 1 al 30"

validation:
  - "Probar Puebla con corte 25"
  - "Probar Puebla con corte 27"
  - "Probar caso donde CASA más COMISIONISTA no coincide con total planta"
  - "Probar Acapulco"
  - "Probar una planta con alias"
  - "Ejecutar 050, 049, 048, 047, 045 y 044 a 036"
  - "Ejecutar git diff --check"

allowed_actions:
  - "crear la rama 050 desde base_sha en un árbol aislado"
  - "editar solo archivos in_scope"
  - "ejecutar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a la rama 050"

forbidden_actions:
  - "modificar authorized_by"
  - "modificar authorized_at"
  - "modificar human_authorization"
  - "reutilizar una rama antigua"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "abrir PR"
  - "fusionar"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050.md"