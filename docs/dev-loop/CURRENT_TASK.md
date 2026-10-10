task_id: "AUDIT-IGF-DIARIO-SAN-LUIS-0410-RUNTIME-073"

title: "Auditar runtime productivo de Venta KG San Luis 04/10/2026"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

production_main_sha: "5de98adc664185351afe0c69e29222903ba2b47e"

scope: "READ_ONLY_PRODUCTION_AUDIT"

objective: >
  Determinar por qué IGF Diario semanal San Luis continúa mostrando
  Venta en Kilos = null para 04/10/2026 después de desplegar 072.
  Trazar exclusivamente datos reales y ejecución del contrato existente.
  No implementar ninguna corrección.

observed_production:
  plant: "San Luis"
  date: "2026-10-04"
  week: "41"
  weekly_venta_kg: null
  precio: 21.13
  costo_kg: 11.61
  flete_kg: 1.11
  margen_bruto: 8.41
  hg: -2747.74
  weekly_total_kg: 128462

known_source_evidence:
  provincia_venta_diaria_total_tons: 2.000
  previous_visual_casa_tons: 1.701
  previous_visual_comisionista: "blank"
  note: >
    Estos valores visuales son evidencia previa y NO deben asumirse
    como valores canónicos hasta comprobarlos contra producción.

contract_072:
  before_cutoff: "comportamiento anterior"
  on_cutoff: "por canal: captura válida -> pronóstico válido -> null"
  after_cutoff: "pronóstico vigente"

audit_required:
  - "Confirmar SHA realmente live."
  - "Identificar planta_id/clave exactos de San Luis."
  - "Identificar fecha de corte usada por runtime."
  - "Consultar venta total planta 04/10."
  - "Consultar captura real Casa 04/10."
  - "Consultar captura real Comisionista 04/10."
  - "Consultar pronóstico Casa aplicable 04/10."
  - "Consultar pronóstico Comisionista aplicable 04/10."
  - "Consultar cualquier fuente auxiliar usada por resolveCanalTon."
  - "Reproducir resolveCanalTon para ambos canales."
  - "Reproducir ventaKg final."
  - "Trazar materializePlantMonth."
  - "Trazar endpoint semanal."
  - "Explicar por qué Precio/Costo/Flete/Margen/HG existen aunque Venta KG sea null."
  - "Reconciliar o explicar Provincia total 2.000 t vs canales."

critical_questions:
  - "¿Existe captura real Casa?"
  - "¿Existe captura real Comisionista?"
  - "¿Existe forecast Casa?"
  - "¿Existe forecast Comisionista?"
  - "¿Qué distingue blank/null de 0?"
  - "¿072 recibe realmente las capturas productivas?"
  - "¿La captura total planta proviene de una fuente diferente?"
  - "¿Un canal faltante provoca AND -> null?"
  - "¿El problema restante es datos, resolución por canal o contrato Venta KG?"

read_only_rules:
  - "SELECT únicamente."
  - "No INSERT."
  - "No UPDATE."
  - "No DELETE."
  - "No UPSERT."
  - "No DDL."
  - "No migrations."
  - "No modificar variables de entorno."
  - "No modificar producción."
  - "No crear datos temporales en DB."
  - "No disparar procesos que escriban datos."
  - "No modificar código de producto."
  - "No deploy."

required_output:
  - "Tabla de evidencia por canal."
  - "Valor bruto DB."
  - "Valor normalizado."
  - "Forecast aplicable."
  - "Resultado resolveCanalTon."
  - "Resultado ventaKg."
  - "Causa raíz exacta."
  - "Clasificación: DATA / CODE / CONTRACT / MIXED."
  - "Recomendación de siguiente tarea, sin implementarla."

report:
  path: "docs/dev-loop/reports/AUDIT-IGF-DIARIO-SAN-LUIS-0410-RUNTIME-073.md"

stop_conditions:
  - "Si para obtener evidencia se requiere escribir en producción, STOP."
  - "Si se requiere modificar código para observar los datos, STOP."
  - "Si se requiere deploy, STOP."
  - "Si no puede identificarse inequívocamente San Luis, STOP."
  - "Si existen fuentes contradictorias, documentarlas; no elegir arbitrariamente."
  - "No fix."
  - "No PR funcional."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"