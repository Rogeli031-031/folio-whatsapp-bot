task_id: "IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC"

title: "Comentario diario y clientes nuevos por fecha en IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "053A + R1 + R2 están integradas en main c224dbc97d69d7fad699902d38e20869aca8638d. La comparación visual real confirmó que IGF Diario Puebla individual coincide con IGF Diario Puebla dentro de Todas. AH existe como COMENTARIO DEL DIA pero está vacío. AI/AJ son actualmente auxiliares técnicos ocultos."

objective: "Poblar AH con un resumen ejecutivo diario objetivo basado en el mismo motor matemático de 'cómo nos fue ayer', agregar AI visible VENTAS con los clientes nuevos obtenidos en cada fecha, y mover los auxiliares técnicos actuales a AJ/AK. Aplicar tanto a cada IGF Diario de planta como a IGF Diario Provincia."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "c224dbc97d69d7fad699902d38e20869aca8638d"

branch: "impl/igf-diario-comentario-ventas-053bc"

in_scope:
  - "nuevo helper lib/igf-diario-daily-insights.js o equivalente"
  - "lib/igf-diario-puebla.js"
  - "lib/dashboard-arr-forecast.js si es necesario para transportar payloads"
  - "server.js"
  - "reutilización read-only de lib/director-ia-daily-deviation.js"
  - "reutilización read-only de lib/director-ia-daily-discount.js"
  - "reutilización read-only de normalización de lib/cliente-contacto.js"
  - "pruebas nuevas 053BC"
  - "ajustes mínimos de regresión por desplazamiento AI/AJ -> AJ/AK"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar la matemática financiera de IGF"
  - "cambiar 053A/R1/R2"
  - "cambiar la respuesta conversacional de Director IA"
  - "cambiar clasificación DICF"
  - "hacer llamadas OpenAI durante export Excel"
  - "crear acciones DICF"
  - "modificar contactos"
  - "crear contactos"
  - "DB/schema/migrations"
  - "PR, merge o deploy"

contracts_in_force:
  - "AH debe llamarse COMENTARIO DEL DIA."
  - "AI debe llamarse VENTAS."
  - "AI deja de ser columna auxiliar."
  - "Los auxiliares técnicos de carry pasan a AJ y AK."
  - "AJ y AK deben permanecer ocultas."
  - "AH y AI deben permanecer visibles."
  - "La información se escribe en la fecha a la que pertenece, no en la fecha de generación."
  - "Si el resumen corresponde al 27/09, va en la fila 27/09."
  - "No escribir comentario ejecutivo ni cliente nuevo en filas proyectadas."
  - "No usar OpenAI para llenar el Excel."
  - "No almacenar respuestas conversacionales."
  - "No realizar writes en BD durante la exportación."
  - "No ejecutar CREATE TABLE/ALTER/INSERT/UPDATE para resolver contactos."
  - "No hacer una consulta SQL por cada día."
  - "Los cálculos diarios deben reutilizar computeDailySalesDeviationFromRows y computeDailyDiscountDeviationFromRows."
  - "Provincia debe calcularse como una sola empresa para métricas diarias, pero conservar identidad planta+cliente para evitar mezclar clientes homónimos entre plantas."
  - "Los contactos se buscan estrictamente por planta."
  - "Todas conserva el gate global ZP/AD/CF_CDMX de 053A-R2."

closed_date_contract:
  - "En mes actual, nunca analizar hoy como día cerrado."
  - "Si existe fecha de corte, solo fechas < corte son elegibles."
  - "Fecha máxima elegible = mínimo entre ayer calendario CDMX y corte-1 cuando haya corte."
  - "En meses históricos completamente cerrados, pueden analizarse todas las fechas reales del mes."
  - "Fechas proyectadas quedan AH/AI vacías."

comment_column:
  column: "AH"
  header: "COMENTARIO DEL DIA"
  source_sales: "arr.ventas_diarias_cliente"
  source_discount: "arr.descuentos_diarios_cliente"
  source_contacts: "arr.cliente_contactos"
  format: "deterministic"
  openai: false

comment_content:
  - "Primera línea: venta real del día vs referencia same-weekday 14d del motor actual."
  - "Segunda señal, en la misma línea o inmediatamente después: descuento/kg real vs referencia pooled same-weekday 14d."
  - "Después: clientes materiales con contribución negativa."
  - "kg_target=0 y kg_reference>0 => texto 'dejó de comprar'."
  - "kg_target>0 y contribution_kg<0 => texto 'bajó'."
  - "Para esos clientes agregar literalmente 'Llamar y recuperar.'."
  - "Agregar contacto comercial de arr.cliente_contactos."
  - "Si nombre, teléfono y correo están vacíos: 'Contacto: no capturado.'."
  - "Nunca inventar nombre, teléfono, correo ni causa."
  - "No afirmar que contribución matemática es causa."
  - "Ordenar clientes negativos por magnitud absoluta de contribution_kg."
  - "Usar solo contribuidores materiales/top del mismo motor diario; no llenar la celda con todos los clientes de la planta."

comment_example: |
  Venta: 25,025 kg vs ref 31,200 kg (-6,175 kg; -19.8%). Desc.: $0.71/kg vs ref $0.65/kg (+$0.06).
  TORTILLERIA ERICK: dejó de comprar (0 vs 1,800 kg ref). Llamar y recuperar. Contacto: Jesús Laynes Pérez | 2231126169 | rafaellaynes@hotmail...
  CLIENTE X: bajó 1,200 kg (800 vs 2,000 kg ref). Llamar y recuperar. Contacto: no capturado.

comment_missing_data:
  - "Si hay venta del día pero no referencia suficiente, reportar venta y 'referencia insuficiente'; no fabricar delta."
  - "Si descuento/kg no es calculable, omitir esa señal o indicar 'descuento/kg no calculable'; nunca usar 0 artificial."
  - "Si no existen datos suficientes del día, usar una indicación corta o dejar vacío según el renderer, pero nunca afirmar 0."

new_clients_column:
  column: "AI"
  header: "VENTAS"
  source: "arr.ventas_diarias_cliente"
  forecast: false

new_client_operational_definition:
  - "Se evalúa por planta."
  - "cliente_norm debe tener SUM(kg) <= 0 o ausencia de compra positiva en el mes calendario inmediatamente anterior."
  - "Debe tener SUM(kg) > 0 real en el mes solicitado."
  - "La fecha del cliente nuevo es MIN(fecha) del mes solicitado donde la suma diaria real del cliente sea > 0."
  - "El cliente aparece una sola vez en el mes, en esa primera fecha."
  - "No usar forecast para determinar la fecha."
  - "No repetir al cliente en compras posteriores del mismo mes."
  - "Cruce enero/diciembre debe funcionar."
  - "Un cliente homónimo en dos plantas se considera por planta, no se fusiona."

new_client_cell_format:
  plant: |
    NUEVO: TORTILLERIA NUEVA — 1,850 kg
    NUEVO: CLIENTE B — 620 kg
  provincia: |
    Puebla · TORTILLERIA NUEVA — 1,850 kg
    Acapulco · CLIENTE B — 620 kg

new_client_kg_contract:
  - "El kg mostrado es la suma real comprada por ese cliente en su primera fecha positiva."
  - "No mostrar forecast mensual como kg del día."
  - "Si existen varias filas/canales del cliente ese día, sumar los kg de ese día."

province_contract:
  - "AH de Provincia usa venta y descuento agregados de todas las plantas como una sola empresa."
  - "La referencia de Provincia se calcula con el mismo motor diario sobre datos agregados."
  - "Para contribución por cliente en Provincia, usar identidad compuesta planta+cliente para evitar colisiones."
  - "Al presentar cliente negativo en Provincia incluir nombre de planta."
  - "El contacto debe buscarse en la planta correspondiente."
  - "AI de Provincia es la unión de eventos de clientes nuevos de todas las plantas, agrupados por fecha."
  - "Cada evento de AI Provincia debe incluir la planta."

plant_contract:
  - "Cada hoja IGF Diario <planta> solo contiene comentario, contactos y clientes nuevos de esa planta."
  - "Puebla individual y Puebla dentro de Todas deben producir el mismo AH y AI para la misma fecha/corte."

excel_layout:
  - "AH = COMENTARIO DEL DIA visible."
  - "AI = VENTAS visible."
  - "AJ = auxiliar carry COSTO, hidden."
  - "AK = auxiliar carry FLETE, hidden."
  - "Actualizar markCarry y cualquier referencia auxiliar 35/36 a 36/37."
  - "No dejar flags 0/1 visibles."
  - "AH y AI con wrapText=true y alineación vertical top."
  - "AI debe tener ancho suficiente para varios clientes."
  - "Ajustar altura de fila según máximo de líneas AH/AI con un límite razonable para no deformar el workbook."
  - "Filas Semana y TOTAL MES no deben contener comentario ni clientes nuevos."

performance_contract:
  - "No hacer N consultas por N días."
  - "Precargar ventas del rango necesario por planta y calcular cada fecha en memoria."
  - "Precargar descuentos del rango necesario por planta."
  - "Precargar contactos una sola vez por planta."
  - "Para Provincia reutilizar los datasets precargados de las plantas; no volver a consultar seis veces."
  - "La ventana de datos debe cubrir al menos previous-calendar-month y los 28 días necesarios para referencias same-weekday antes del inicio del mes."

security_contract:
  - "Export individual: cargar datos solo después de validar assertPlantaPermitidaDashboard."
  - "Export Todas: cargar insights multi-planta solo después del gate global 053A-R2."
  - "No mezclar contactos entre plantas."
  - "Un usuario local no debe obtener contactos de otras plantas manipulando query params."

acceptance_criteria:
  - "AH del 27/09 contiene exclusivamente el análisis del 27/09."
  - "28/09 proyectado no recibe el análisis del 27."
  - "Venta y referencia AH coinciden con computeDailySalesDeviationFromRows para la misma fecha."
  - "Descuento y referencia AH coinciden con computeDailyDiscountDeviationFromRows."
  - "Cliente con target 0 y reference >0 se muestra como 'dejó de comprar'."
  - "Cliente con target menor a reference se muestra como 'bajó'."
  - "Ambos incluyen 'Llamar y recuperar'."
  - "Contacto existente muestra nombre/teléfono/correo disponibles."
  - "Contacto inexistente muestra 'Contacto: no capturado.'."
  - "AI lista un cliente en su primera fecha positiva y solo una vez."
  - "Cliente con compra positiva en mes anterior no aparece como nuevo."
  - "Cruce enero/diciembre funciona."
  - "AI Provincia agrega clientes nuevos de todas las plantas y muestra planta."
  - "AH Provincia agrega empresa completa sin fusionar homónimos."
  - "Puebla individual coincide con Puebla dentro de Todas en AH y AI."
  - "AJ/AK permanecen hidden."
  - "AI es visible y ya no contiene 0/1 técnicos."
  - "053A/R1/R2 y 052 no cambian."
  - "No hay llamadas OpenAI durante export."
  - "No hay writes/DDL de BD durante export."

validation:
  - "Caso fecha 27 con venta debajo de referencia."
  - "Caso cliente dejó de comprar."
  - "Caso cliente bajó."
  - "Caso contacto completo."
  - "Caso contacto parcial."
  - "Caso sin contacto."
  - "Caso primer cliente nuevo del mes."
  - "Caso cliente que compra varias veces: aparece solo en primera compra."
  - "Caso cliente que compró mes anterior: no aparece."
  - "Caso enero con diciembre anterior."
  - "Caso mismo cliente_norm en Puebla y Acapulco: Provincia no los fusiona."
  - "Caso corte 28: AH/AI hasta 27; 28+ vacíos."
  - "Guardar/reabrir XLSX y revisar texto, wrap, columnas hidden."
  - "Comparar Puebla individual vs Puebla dentro de Todas."
  - "Ejecutar regresión 025, 050, 051, 052, 053A, R1, R2."
  - "git diff --check."

allowed_actions:
  - "crear rama desde base_sha"
  - "crear helper read-only de insights"
  - "reutilizar funciones compute existentes"
  - "agregar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a la rama 053BC"

forbidden_actions:
  - "usar OpenAI para generar celdas"
  - "llamar Director IA vía HTTP desde el export"
  - "crear una consulta SQL por día"
  - "inventar causas"
  - "inventar contactos"
  - "crear/modificar contactos"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "hacer migraciones"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-COMENTARIO-VENTAS-053BC.md"