task_id: "IMPL-IGF-DIARIO-GASTOS-MANUALES-062"

title: "Captura manual mensual de Corporativos y Operativos para IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

objective: >
  Permitir modificar manualmente desde la tabla IGF Diario acumulado los importes
  OPERATIVOS y CORPORATIVOS de cada planta. Los valores manuales deben persistir
  por planta+año+mes, recalcular inmediatamente los importes derivados del mini
  acumulado y alimentar las celdas T3 (Gastos Operativos) y M3 (Gastos Corporativos)
  de cada hoja IGF Diario al descargar Excel.

base_sha: "eb6dd697d9a80fcc573dac62d8a59dfecf4bea08"

branch: "implementation/igf-diario-gastos-manuales-062"

current_contract:
  - "fillIgfDiarioPuebla ya escribe corporativos en M3 (columna 13, fila 3)."
  - "fillIgfDiarioPuebla ya escribe operativos en T3 (columna 20, fila 3)."
  - "IGF Diario Provincia suma M3/T3 de las hojas individuales."
  - "IGF Diario acumulado calcula gasto = operativos + corporativos."
  - "IGF Diario acumulado calcula utilOperImporte = ingreso - operativos."
  - "IGF Diario acumulado calcula resultadoFinalImporte = utilOperImporte - corporativos."
  - "Forecast está correcto y NO debe modificarse."

persistence_contract:
  key: "plant_code + year + month"
  cut_dependent: false
  rule: "manual ?? automatico"
  zero_is_valid_manual_value: true
  null_means: "usar valor automático"
  independent_fields:
    - "operativos"
    - "corporativos"

schema:
  table: "arr.igf_diario_gastos_manual"
  columns:
    - "plant_code VARCHAR(40) NOT NULL"
    - "year SMALLINT NOT NULL"
    - "month SMALLINT NOT NULL"
    - "operativos NUMERIC(18,2) NULL"
    - "corporativos NUMERIC(18,2) NULL"
    - "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
    - "updated_by TEXT NULL"
  primary_key:
    - "plant_code"
    - "year"
    - "month"
  requirements:
    - "Creación idempotente."
    - "No FK rígida si rompe equivalencias actuales de nombres/códigos."
    - "Si ambos campos quedan NULL, puede eliminarse la fila."
    - "Un valor 0 debe conservarse como override manual; no tratar 0 como ausencia."

api_contract:
  get:
    method: "GET"
    path: "/api/dashboard/igf-diario-gastos-manuales"
    params:
      - "year"
      - "month"
    response: >
      Mapa/lista de overrides manuales del periodo, sin ampliar el alcance
      de plantas permitido al usuario.
  patch:
    method: "PATCH"
    path: "/api/dashboard/igf-diario-gastos-manuales"
    body:
      - "year"
      - "month"
      - "plant_code"
      - "operativos opcional: número finito o null"
      - "corporativos opcional: número finito o null"
    semantics:
      - "Campo omitido = no modificar ese campo."
      - "Número incluyendo 0 = guardar override manual."
      - "null = restaurar automático únicamente para ese campo."
  security:
    - "dashboardAuthMiddleware."
    - "Mismos bloqueos financieros usados por IGF Forecast."
    - "Respetar alcance de planta existente."
    - "No ampliar permisos por implementar esta función."

ui_contract:
  mode: "IGF Diario acumulado únicamente"
  editable_columns:
    - "OPERATIVOS"
    - "CORPORATIVOS"
  rules:
    - "Forecast sigue totalmente read-only y usa los valores originales."
    - "Zona Provincia no es editable; se recalcula como suma de plantas."
    - "Cada planta permite captura manual independiente de OPERATIVOS y CORPORATIVOS."
    - "Mostrar claramente cuando un valor es Manual."
    - "Permitir Restaurar automático por campo."
    - "Guardar con acción explícita o interacción inequívoca; evitar guardados accidentales."
    - "Al guardar, actualizar la tabla sin recargar toda la página."
    - "Al refrescar navegador, el override persiste."
    - "Al cambiar el corte dentro del mismo mes, el override persiste."
    - "Al cambiar de mes, se cargan únicamente los overrides de ese nuevo mes."

calculation_contract:
  automatic_operativos: "valor actual de row.operativos"
  automatic_corporativos: "valor actual de row.corporativos"
  effective_operativos: "manual.operativos !== null ? manual.operativos : automatic_operativos"
  effective_corporativos: "manual.corporativos !== null ? manual.corporativos : automatic_corporativos"
  formulas:
    - "gasto = effective_operativos + effective_corporativos"
    - "utilOperImporte = ingreso - effective_operativos"
    - "resultadoFinalImporte = utilOperImporte - effective_corporativos"
  invariants:
    - "Venta no cambia."
    - "Margen no cambia."
    - "Com. y Desc. no cambia."
    - "Impuestos no cambian."
    - "HG no cambia."
    - "INGRESO no cambia por editar Operativos/Corporativos."
    - "Solo GASTO, Util. Operación y Resultado Final cambian naturalmente."
    - "Zona Provincia se reconstruye desde los valores efectivos de las plantas."

excel_contract:
  individual:
    - "Override manual corporativos -> IGF Diario {Planta}!M3."
    - "Override manual operativos -> IGF Diario {Planta}!T3."
    - "Sin override -> conservar valor automático actual."
    - "Override 0 -> escribir 0, no sustituirlo por automático."
  todas:
    - "Cada hoja IGF Diario {Planta} usa sus propios overrides."
    - "Plantas sin override conservan automático."
    - "IGF Diario Provincia sigue sumando las hojas individuales como actualmente."
  must_not:
    - "No duplicar las fórmulas del IGF Diario."
    - "No cambiar la semántica existente de M3/T3 en lib/igf-diario-puebla.js."

recommended_files:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "server.js"
  - "lib/dashboard-arr-forecast.js si se requiere centralizar resolución efectiva"
  - "lib/igf-diario-gastos-manuales.js nuevo, si simplifica persistencia/resolución"
  - "test/igf-diario-gastos-manuales-062.test.js"
  - "tests Excel IGF Diario existentes que deban ampliarse"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-GASTOS-MANUALES-062.md"

acceptance_criteria:
  - "En IGF Diario acumulado OPERATIVOS y CORPORATIVOS son editables por planta."
  - "Forecast queda idéntico antes/después."
  - "Puedo guardar 0 como valor manual."
  - "Puedo cambiar solo Operativos sin alterar Corporativos y viceversa."
  - "Restaurar automático de un campo no borra el override del otro."
  - "Refresh conserva valores manuales."
  - "Cambiar fecha de corte dentro del mismo mes conserva valores manuales."
  - "Cambio de mes no arrastra overrides del mes anterior."
  - "La tabla recalcula GASTO, Util. Operación, Resultado Final y Zona inmediatamente."
  - "INGRESO permanece idéntico al editar gastos."
  - "Descarga individual escribe Corporativos manual en M3."
  - "Descarga individual escribe Operativos manual en T3."
  - "Descarga Todas aplica el valor correcto en cada hoja."
  - "IGF Diario Provincia conserva suma de hojas."
  - "Sin overrides, comportamiento y Excel son idénticos al main actual."
  - "No hay hardcode por Puebla ni por importes de las capturas."

validation:
  - "test específico 062."
  - "regresiones 059."
  - "regresiones 059-R1."
  - "regresiones 061."
  - "regresiones IGF Diario 053A/054-R3 relevantes."
  - "prueba Excel individual M3/T3."
  - "prueba Excel Todas M3/T3 por planta y Provincia."
  - "frontend npm run build."
  - "git diff --check."

out_of_scope:
  - "Modificar Forecast."
  - "Modificar Margen/HG."
  - "Modificar lógica de Compras."
  - "Modificar tarifa día 1."
  - "Modificar venta/pronóstico."
  - "Modificar Action Register."
  - "Migrar datos existentes a overrides."
  - "Crear valores manuales iniciales en producción."
  - "Hardcodear Puebla."
  - "Hardcodear M3/T3 con valores concretos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

forbidden_actions:
  - "git push origin main"
  - "git merge a main"
  - "deploy"
  - "modificar datos de producción"
  - "autoautorizar G4"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-GASTOS-MANUALES-062.md"