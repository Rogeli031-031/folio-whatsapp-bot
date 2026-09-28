task_id: "IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A"

title: "Exportar Todas con IGF Diario Provincia y una hoja IGF Diario por planta"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "main está en c15b77779f8173dc3fff6ca6effc371b50d45285. Actualmente el export por planta genera IGF Diario <planta>, pero al seleccionar Todas no se generan IGF Diario individuales ni una hoja consolidada Provincia."

objective: "Cuando el usuario seleccione Todas en IGF Forecast y descargue Excel, generar como primera hoja IGF Diario Provincia y después una hoja IGF Diario por cada planta de Provincia. IGF Diario Provincia debe conservar exactamente el formato de IGF Diario de planta y representar a todas las plantas como una sola empresa, agregando importes y kilos y recalculando correctamente todas las métricas por kg."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "c15b77779f8173dc3fff6ca6effc371b50d45285"

branch: "impl/igf-diario-provincia-multiplanta-053a"

in_scope:
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-puebla.js"
  - "server.js"
  - "frontend-dashboard/components/IgfForecastClient.tsx solo si es estrictamente necesario para distinguir export Todas"
  - "nuevas funciones auxiliares necesarias para generar soportes por planta sin duplicar el motor financiero"
  - "test/igf-diario-provincia-multiplanta-053a.test.js"
  - "ajustes estrictamente necesarios en pruebas existentes de IGF Diario/export Excel"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "AH COMENTARIO DEL DIA; se implementará en 053B"
  - "nueva columna VENTAS/clientes nuevos; se implementará en 053C"
  - "Director IA"
  - "cliente_contactos"
  - "cambiar definiciones comerciales de clientes nuevos, clientes que bajaron o dejaron de comprar"
  - "cambiar fecha de corte"
  - "cambiar CONTROL DE COMPRAS existente"
  - "cambiar reglas 050, 051, 052"
  - "DB/schema"
  - "PR, merge o deploy"

contracts_in_force:
  - "La 050, 051, 051-R1 y 052 permanecen vigentes."
  - "Seleccionar una planta individual debe seguir produciendo el mismo reporte actual de esa planta."
  - "Seleccionar Todas debe producir un único XLSX."
  - "La primera hoja visible debe llamarse exactamente IGF Diario Provincia."
  - "Después deben aparecer las hojas IGF Diario <planta>, una por cada planta de Provincia disponible para el periodo."
  - "Usar plantsEquivalent y aliases existentes; no hardcodear Querétaro/Queretaro, Tehuacán/Tehuacan, GTM, etc."
  - "No crear un segundo motor de pronóstico o financiero."
  - "Las hojas individuales deben usar exactamente la misma lógica que el export individual."
  - "IGF Diario Provincia debe calcularse desde las mismas cifras defendibles de las hojas individuales."
  - "No sumar directamente métricas expresadas en $/kg."
  - "Los valores absolutos se suman. Los valores por kg se reconstruyen usando importes absolutos y venta total."
  - "Las fórmulas de Provincia deben mantenerse auditables dentro del Excel."
  - "Las hojas técnicas adicionales necesarias pueden quedar ocultas, pero no eliminar hojas existentes que hoy sean visibles para el usuario salvo que sean duplicados exclusivamente técnicos creados por 053A."

visible_sheet_order:
  - "IGF Diario Provincia"
  - "IGF Diario <planta 1>"
  - "IGF Diario <planta 2>"
  - "..."
  - "resto de hojas actuales del workbook"

province_daily_contract:
  - "B VENTA KG = suma de B de todas las hojas IGF Diario de planta para esa fecha."
  - "D INGRESO = suma de D de las plantas."
  - "C PRECIO = D Provincia / B Provincia."
  - "F COSTO KG = suma(F planta * B planta) / B Provincia."
  - "G FLETE KG = suma(G planta * B planta) / B Provincia."
  - "H MARGEN BRUTO = C - F - G."
  - "M GASTO CORPORATIVO por kg = suma(M planta * B planta) / B Provincia."
  - "O MARGEN NETO = H - M."
  - "T GASTO OPERATIVO por kg = suma(T planta * B planta) / B Provincia."
  - "V SOBRANTE OPERACION = O - T."
  - "X IMPORTE HG = suma(X de todas las plantas)."
  - "Y HG POR KG = X Provincia / B Provincia."
  - "AA SOBRANTE OPERACION = V - Y."
  - "AC C&D por kg = suma(AC planta * B planta) / B Provincia."
  - "AE RESULTADO POR KG = AF Provincia / B Provincia."
  - "AF RESULTADO = suma(AF de todas las plantas)."
  - "Cuando B Provincia sea cero o no numérico, no inventar ratios."

province_monthly_contract:
  - "Los importes corporativos superiores usados por la hoja Provincia deben ser la suma de los importes corporativos de las plantas."
  - "Los importes operativos superiores usados por Provincia deben ser la suma de los importes operativos de las plantas."
  - "Semana y TOTAL MES deben operar sobre las filas diarias de Provincia con la misma lógica de ponderación existente."
  - "No promediar promedios de plantas."
  - "No sumar $/kg de plantas."

per_plant_contract:
  - "Cada IGF Diario <planta> debe coincidir con lo que actualmente se obtiene descargando esa misma planta individualmente."
  - "Misma venta."
  - "Mismo precio."
  - "Mismo costo y flete."
  - "Mismos gastos."
  - "Mismo HG."
  - "Mismo C&D."
  - "Mismo resultado."
  - "Mismo corte y proyección."
  - "Mismos amarillos/carry."

future_contract:
  - "053B agregará COMENTARIO DEL DIA en AH tanto a Provincia como a cada planta."
  - "053C agregará VENTAS/clientes nuevos por día tanto a Provincia como a cada planta."
  - "No implementar todavía esos dos contenidos en 053A."

acceptance_criteria:
  - "Con Planta=Todas se descarga un solo XLSX."
  - "La primera hoja es IGF Diario Provincia."
  - "Existe una hoja IGF Diario por cada planta de Provincia del periodo."
  - "Querétaro no se duplica por diferencias de acento o alias."
  - "Tehuacán no se duplica por diferencias de acento o alias."
  - "La suma de VENTA KG diaria de plantas coincide exactamente con B de Provincia."
  - "La suma de INGRESO diario coincide exactamente con D de Provincia."
  - "PRECIO Provincia es D/B, no promedio simple de precios."
  - "COSTO KG y FLETE KG Provincia son ponderados por kilos."
  - "Gasto corporativo y operativo por kg se reconstruyen desde importes, no se suman."
  - "HG por kg se reconstruye desde importe HG total / venta total."
  - "C&D por kg se reconstruye desde importe económico equivalente / venta total."
  - "AF Provincia es suma de resultados absolutos de plantas."
  - "AE Provincia es AF/B."
  - "Semana y TOTAL MES incluyen correctamente las seis plantas como una sola empresa."
  - "El export individual por planta no cambia."
  - "La fecha de corte sigue siendo el primer día proyectado."
  - "No aparece un segundo cálculo distinto al usado en las hojas individuales."

validation:
  - "Comparar Puebla en export Todas contra export Puebla individual."
  - "Comparar Acapulco."
  - "Comparar Tehuacan/Tehuacán."
  - "Comparar Queretaro/Querétaro."
  - "Probar al menos una fecha con plantas que tengan precios/costos diferentes para demostrar ponderación."
  - "Probar que precio Provincia no sea promedio aritmético."
  - "Probar que descuento/C&D Provincia no sea suma de $/kg."
  - "Probar corporativo, operativo y HG con importes diferentes entre plantas."
  - "Probar corte dentro del mes."
  - "Guardar y reabrir XLSX."
  - "Verificar orden y nombres de hojas."
  - "Ejecutar regresión 036 a 052 relacionada con IGF/Compras/export."
  - "git diff --check."

allowed_actions:
  - "crear rama 053A desde base_sha"
  - "editar solo in_scope"
  - "crear hojas técnicas namespaced u ocultas si son necesarias para conservar fórmulas y la lógica existente"
  - "ejecutar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a la rama 053A"

forbidden_actions:
  - "hardcodear seis plantas si el catálogo actual puede resolverlas dinámicamente"
  - "copiar valores redondeados cuando existe un importe o fórmula defendible"
  - "crear otro motor financiero"
  - "usar promedio simple para métricas por kg"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "hacer migraciones o mutaciones DB"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A.md"