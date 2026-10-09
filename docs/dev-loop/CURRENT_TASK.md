task_id: "IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070"

title: "Agregar DESCUENTOS por cliente y RESUMEN SEMANAL consolidado de Todas"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd"

branch: "implementation/igf-diario-descuentos-resumen-semanal-todas-070"

objective: >
  Implementar dos mejoras en IGF Diario:
  A) nueva columna AK DESCUENTOS con cambios de comisión/descuento por cliente
  contra su compra inmediatamente anterior;
  B) nueva columna RESUMEN SEMANAL en IGF Diario Semanal · Todas,
  consolidando todas las plantas según la unidad financiera de cada concepto.
  La misma consolidación debe alimentar tabla y gráfica de la hoja RESUMEN
  del Excel cuando la selección sea Todas.

principles:
  - "No inventar una nueva fuente de verdad."
  - "Reutilizar datos y lógica existentes de clientes, ventas, descuentos/comisiones e IGF Diario."
  - "Comparar contra la compra real inmediatamente anterior del mismo cliente."
  - "No confundir día anterior con compra anterior."
  - "La compra anterior puede cruzar semana o mes."
  - "No convertir missing/null a cero."
  - "Consolidar métricas según su unidad, no mediante promedio simple."
  - "No modificar las fórmulas financieras fuente existentes."

scope_a_descuentos:
  destination:
    sheet: "IGF Diario {planta}"
    column: "AK"
    title: "DESCUENTOS"

  behavior:
    - "Para cada fecha identificar clientes con compra real ese día."
    - "Para cada cliente buscar su compra real inmediatamente anterior."
    - "Comparar comisión/descuento $/kg actual contra comisión/descuento $/kg de esa compra anterior."
    - "La referencia puede cruzar semana y mes."
    - "Solo listar clientes cuyo valor realmente cambió."
    - "Sin compra anterior comparable, no listar al cliente."
    - "Sin cambio, no listar al cliente."
    - "No tratar null como 0."
    - "No inferir la compra anterior desde el renglón anterior del Excel."

  terminology:
    increase: "Subió su comisión"
    decrease: "Bajó su comisión"

  example:
    client: "JOSE ALBERTO LAYNES PEREZ"
    previous: 5.185
    current: 4.907
    delta: -0.278
    expected_text: >
      JOSE ALBERTO LAYNES PEREZ — Bajó su comisión respecto a su última compra
      de $5.185/kg a $4.907/kg = -$0.278/kg

  formatting:
    decimals: 3
    increase_delta_color: "red"
    decrease_delta_color: "green"
    unchanged: "not listed"
    - "Aplicar rich text."
    - "Colorear únicamente el delta final."
    - "No colorear el nombre ni el resto del texto."
    - "Conservar wrapText."
    - "Si hay varios clientes, uno por línea dentro de AK."
    - "Si no hay cambios ese día, dejar AK vacío."

  source_contract:
    - "Auditar primero la fuente usada por la gráfica individual de cliente para Descuento ($/kg) y movimiento."
    - "Reutilizar la fuente canónica disponible para compra/venta del cliente y descuento/comisión."
    - "No calcular desde texto del comentario."
    - "No usar el valor mostrado/redondeado en una gráfica como fuente."
    - "Calcular con precisión numérica fuente y redondear solo para presentación."
    - "Documentar exactamente qué campo/fórmula representa comisión/descuento $/kg."

scope_b_resumen_semanal_todas:
  context: "IGF Diario Semanal · Todas"

  destination:
    position: "Primera columna de datos después de Concepto y antes de las plantas."
    title: "RESUMEN SEMANAL"

  plant_columns:
    - "Mantener las columnas individuales de las plantas."
    - "No sustituirlas."
    - "RESUMEN SEMANAL consolida todas las plantas visibles/elegibles del alcance Todas."

  formulas:
    venta_kg:
      type: "sum"
      formula: "SUM(venta_kg_i)"

    weighted_metrics:
      type: "sales_weighted"
      formula: "SUM(metrica_i * venta_kg_i) / SUM(venta_kg_i)"
      eligibility:
        - "Incluir únicamente plantas con venta_kg numérica válida y > 0."
        - "La métrica de esa planta también debe ser numérica válida."
        - "Una métrica missing/null no se transforma en 0."
        - "El denominador debe corresponder únicamente a plantas elegibles para esa métrica."

    additive_mxn:
      type: "sum"
      eligibility:
        - "Sumar valores MXN numéricos válidos."
        - "No convertir missing/null a 0 para decidir disponibilidad."

  metric_contract:
    "Venta en Kilos": "sum"
    "Precio de Venta al Público": "sales_weighted"
    "Ingreso Generado": "sum"
    "Costo del Gas LP": "sales_weighted"
    "Flete Terrestre": "sales_weighted"
    "Margen Bruto": "sales_weighted"
    "Gasto Corporativo": "sales_weighted"
    "Inversiones": "sales_weighted"
    "Impuestos Federales": "sales_weighted"
    "Margen Neto": "sales_weighted"
    "Presupuesto Nómina/Gastos": "sales_weighted"
    "Presupuesto IMSS/SUA": "sales_weighted"
    "Extraordinarios": "sales_weighted"
    "Provisiones de la Planta": "sales_weighted"
    "Sobrante de Operación antes del HG": "sales_weighted"
    "HG": "sum"
    "Sobrante de Operación con el HG": "sales_weighted"
    "Comisiones y Descuentos": "sales_weighted"
    "RESULTADO ($/kg)": "sales_weighted"
    "RESULTADO (Importe)": "sum"

  important:
    - "No hacer promedio simple entre plantas."
    - "Precio de Venta al Público debe ponderarse por Venta en Kilos."
    - "La misma regla de ponderación aplica a las demás métricas $/kg."
    - "HG es MXN y se suma."
    - "Ingreso Generado es MXN y se suma."
    - "RESULTADO (Importe) es MXN y se suma."
    - "Venta en Kilos se suma."

  consistency:
    - >
      Para RESULTADO ($/kg), verificar además la consistencia contra
      SUM(RESULTADO Importe) / SUM(Venta kg).
    - >
      Si el contrato financiero existente demuestra que ambas expresiones
      no son equivalentes por una razón válida, NO cambiar silenciosamente
      la fórmula: documentar la diferencia y STOP antes de alterar el contrato.

scope_c_excel_resumen_todas:
  context: "Export Excel cuando selección = Todas"

  requirements:
    - "La hoja RESUMEN debe representar el consolidado de Todas."
    - "La tabla RESUMEN debe usar la misma lógica financiera del consolidado."
    - "La gráfica RESUMEN debe usar esa misma serie consolidada."
    - "No usar una planta arbitraria como representante de Todas."
    - "No hacer promedio simple entre plantas."
    - "Mantener Semana | Dom–Sáb."
    - "Mantener etiquetas numéricas introducidas en 069-R2."
    - "Mantener verde positivo, rojo negativo y línea de cero."
    - "Mantener real continuo / proyectado punteado."
    - "Mantener null como hueco."
    - "Mantener summary_metric."

  daily_consolidation:
    - >
      Para cada Dom–Sáb consolidar primero el día entre todas las plantas
      usando exactamente las mismas reglas por unidad:
      kg = suma; MXN = suma; $/kg = ponderado por venta kg.
    - >
      La columna Semana se obtiene del consolidado semanal correspondiente,
      no promediando los siete valores diarios.

non_regression:
  - "069-R2 permanece intacto."
  - "COMPRAS en COMENTARIO DEL DIA permanece intacto."
  - "Columnas AH/AI existentes permanecen."
  - "No desplazar referencias por letra de columna de manera frágil."
  - "Si insertar AK mueve columnas auxiliares actuales, actualizar referencias de forma segura y probarlas."
  - "No modificar CONTROL DE COMPRAS."
  - "No modificar cálculo base de ARR."
  - "No modificar Forecast."
  - "No modificar Folios."
  - "No modificar DB schema."
  - "No modificar permisos."
  - "No modificar fuentes financieras originales."

required_code_audit:
  - "Localizar quién genera actualmente columnas AH, AI, AJ, AK, AL, etc."
  - "Determinar si AK está libre o contiene una columna auxiliar."
  - "La captura muestra valores auxiliares 0 en AK/AL; no sobrescribirlos ciegamente."
  - >
    Si AK actualmente es auxiliar funcional, insertar físicamente DESCUENTOS
    en AK y desplazar auxiliares posteriores conservando fórmulas y comportamiento.
  - "Auditar fórmulas que referencien letras absolutas AK/AL/etc."
  - "Auditar la fuente exacta de Descuento ($/kg) por cliente."
  - "Auditar cómo se obtiene la compra inmediatamente anterior del cliente."
  - "Auditar el agregador actual de IGF Diario Semanal Todas."
  - "Auditar el generador de RESUMEN Excel y su gráfica."

tests_required:
  descuentos:
    - "5.185 -> 4.907 produce delta -0.278."
    - "Texto dice Bajó su comisión."
    - "Solo -$0.278/kg va verde."
    - "4.907 -> 5.185 produce delta +0.278."
    - "Texto dice Subió su comisión."
    - "Solo +$0.278/kg va rojo."
    - "Mismo valor no lista al cliente."
    - "Sin compra anterior no lista al cliente."
    - "Compra anterior puede estar en semana anterior."
    - "Compra anterior puede estar en mes anterior."
    - "Un día con varios clientes cambiando lista a todos."
    - "Cliente sin cambio no aparece mezclado con los que sí cambiaron."
    - "AK queda vacío si no existen cambios."
    - "Rich text sobrevive writeBuffer/load de Excel."
    - "Las columnas auxiliares desplazadas siguen funcionando."

  resumen_todas:
    - "Venta = suma de plantas."
    - "Precio = SUM(precio*venta)/SUM(venta)."
    - "Costo = ponderado por venta."
    - "Flete = ponderado por venta."
    - "Margen Bruto = ponderado por venta."
    - "Gastos $/kg = ponderados por venta."
    - "Margen Neto = ponderado por venta."
    - "Sobrantes $/kg = ponderados por venta."
    - "Comisiones y Descuentos = ponderado por venta."
    - "RESULTADO $/kg = consolidado correcto."
    - "Ingreso Generado = suma."
    - "HG = suma."
    - "RESULTADO Importe = suma."
    - "Planta con venta null no aporta denominador."
    - "Planta con métrica null no se convierte en cero."
    - "Planta con venta 0 no altera ponderado."
    - "RESUMEN SEMANAL aparece antes de la primera planta."
    - "Las columnas individuales conservan sus valores."

  excel_resumen:
    - "Selección Todas produce RESUMEN consolidado."
    - "Tabla Semana + Dom–Sáb coincide con el consolidado."
    - "Gráfica consume la serie consolidada."
    - "Etiquetas de 069-R2 permanecen."
    - "Positivo/negativo y línea cero permanecen."
    - "Null permanece hueco."
    - "summary_metric permanece."
    - "Export individual de una planta no cambia."

  regression:
    - "Suite 069-R2 PASS."
    - "Suite 069-R1 PASS."
    - "Suite 069 PASS."
    - "Suites relacionadas 064–068 PASS."
    - "053BC comentarios/clientes nuevos PASS."
    - "node --check server.js PASS."
    - "frontend build PASS."
    - "git diff --check PASS."

deliverables:
  report: "docs/dev-loop/reports/IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md"

  report_must_include:
    - "Fuente exacta de comisión/descuento por cliente."
    - "Definición exacta de compra anterior."
    - "Ejemplo JOSE ALBERTO LAYNES PEREZ."
    - "Tratamiento de rich text."
    - "Qué existía previamente en AK y cómo se preservó."
    - "Mapa final de columnas alrededor de AH–AM."
    - "Fórmula exacta de RESUMEN SEMANAL por tipo de unidad."
    - "Lista de conceptos sumados."
    - "Lista de conceptos ponderados."
    - "Tratamiento de null y venta 0."
    - "Cómo se consolidó RESUMEN Excel."
    - "Cómo se consolidó la gráfica."
    - "Pruebas ejecutadas."
    - "Resultados."
    - "SHA producto."
    - "SHA final."

stop_conditions:
  - "Si origin/main != 9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd, STOP."
  - "Si AK contiene lógica auxiliar que no puede desplazarse con seguridad, STOP antes de sobrescribir."
  - "Si no existe una fuente canónica suficiente para reconstruir la compra anterior del cliente, STOP y reportar."
  - "Si comisión y descuento representan conceptos distintos en la fuente actual, STOP y explicar antes de unificarlos."
  - "Si RESULTADO $/kg entra en conflicto con el contrato financiero existente, STOP antes de cambiarlo."
  - "Si la implementación requiere cambio de DB schema, STOP."
  - "Si requiere modificar una fórmula financiera fuente fuera del alcance, STOP."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  commit: true
  push_branch_only: true
  merge: false
  deploy: false