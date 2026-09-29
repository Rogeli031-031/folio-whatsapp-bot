task_id: "FIX-IGF-GRAFICA-PARIDAD-EXCEL-054-R1"

title: "Paridad exacta entre gráfica IGF Diario y Excel"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "La 054 está en 9a5c726257910250965600aabc955b105fa3297a. La UI, toggle $/$kg, clientes nuevos y gate están correctos, pero la auditoría encontró divergencias potenciales con el pipeline productivo del Excel: proyección diaria post-corte, fuente/semántica de C&D, carry de PRECIO y geometría de la tendencia."

objective: "Corregir 054 para que la serie gráfica de rentabilidad reproduzca exactamente los mismos inputs diarios resueltos que utiliza IGF Diario Excel, antes y después del corte. La gráfica no debe mantener una segunda interpretación de venta, C&D, precio, costo, flete o HG."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "9a5c726257910250965600aabc955b105fa3297a"

branch: "fix/igf-grafica-paridad-excel-054-r1"

in_scope:
  - "lib/igf-diario-grafica.js"
  - "lib/dashboard-arr-forecast.js para extraer/exportar helpers puros existentes sin cambiar comportamiento del Excel"
  - "lib/compras-excel.js o lib/compras-dashboard.js solo si se necesita extraer un resolver puro para reproducir exactamente CONTROL DE COMPRAS"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "server.js solo si hace falta transportar contexto ya resuelto"
  - "test/igf-diario-grafica-rentabilidad-nuevos-054.test.js"
  - "nuevo test específico 054-R1"
  - "docs/dev-loop/reports/FIX-IGF-GRAFICA-PARIDAD-EXCEL-054-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar fórmulas de IGF Diario"
  - "cambiar AF"
  - "cambiar AE"
  - "cambiar 050-053BC"
  - "cambiar definición de cliente nuevo"
  - "rediseñar modal"
  - "DB/schema/migrations"
  - "writes o DDL"
  - "OpenAI"
  - "PR, merge o deploy"

source_of_truth:
  - "El Excel IGF Diario es el oráculo funcional."
  - "B = VENTA KG."
  - "C = PRECIO."
  - "F = COSTO KG."
  - "G = FLETE KG."
  - "X = IMPORTE HG."
  - "AC = C&D."
  - "AE = RESULTADO POR KG."
  - "AF = RESULTADO MXN."
  - "La gráfica no puede crear una interpretación distinta para ninguno de esos campos."
  - "Para el mismo year/month/corte/planta, resultado_mxn debe coincidir con AF y resultado_per_kg con AE."

corte_contract:
  - "Mantener contrato 050."
  - "fecha < corte = real."
  - "fecha >= corte = proyectado."
  - "Probar explícitamente la fecha EXACTA del corte."
  - "No usar venta real faltante como motivo para dejar nula una fecha que el Excel sí proyecta."

venta_contract:
  - "Reutilizar la misma pronosticoProjection que usa Provincia Venta Diaria."
  - "Para días reales usar venta real."
  - "Para días proyectados usar el mismo forecast por día/weekday del Excel."
  - "VENTA KG por planta sigue siendo CASA + COMISIONISTA, multiplicado a kg."
  - "No usar la columna TOTAL redondeada."
  - "No usar forecast_mensual plano cuando el Excel usa proyección diaria."

cd_contract:
  - "C&D debe reproducir Provincia Comisiones / soporte correspondiente."
  - "Fuente real primaria: la misma que usa el Excel."
  - "Si arr.descuento_por_kilo_diario_provincia tiene dato defendible, ese dato tiene precedencia."
  - "descuentos_diarios_cliente / ventas solo es fallback cuando el pipeline Excel lo usa como fallback."
  - "Para proyectado usar exactamente la misma proyección diaria de descuento del Excel."
  - "No recalcular C&D con una regla paralela."
  - "Conservar exactamente el signo que recibe AC en IGF Diario."

precio_contract:
  - "Usar loadPrecioDiario existente."
  - "Extraer/reutilizar la misma lógica de appendPrecioWorksheet."
  - "Dentro del mes, un día sin precio propio toma el último precio positivo válido anterior, exactamente como PRECIO."
  - "No inventar carry cross-month si PRECIO no lo hace."
  - "Alias de precio deben conservarse."
  - "La gráfica debe leer el precio ya resuelto/carry, no solo precioByDate exacto."

compras_contract:
  - "COSTO/FLETE/HG deben coincidir con CONTROL DE COMPRAS."
  - "No reconstruirlos con una simplificación si CONTROL DE COMPRAS ya resuelve proyección/carry."
  - "Conservar fallback día 1 de 052."
  - "Conservar costo histórico previo cuando exista."
  - "Conservar reglas reales/proyectadas de costo, flete y HG."
  - "Si el Excel deja un componente vacío, gráfica lo deja vacío y complete=false."
  - "Si el Excel lo proyecta/resuelve, gráfica debe recibir ese valor."

shared_resolver_contract:
  - "Preferir extraer helpers puros desde los builders existentes."
  - "No generar XLSX en runtime para después leerlo."
  - "No hacer parsing del Excel dentro del endpoint."
  - "No crear un tercer motor financiero."
  - "Es válido generar workbook en TESTS para usarlo como oráculo."
  - "Si se extrae lógica existente a un helper compartido, el Excel debe conservar exactamente sus resultados previos."

resolved_day_shape:
  fecha: "YYYY-MM-DD"
  ventaKg: "number|null"
  precio: "number|null"
  costoKg: "number|null"
  fleteKg: "number|null"
  hgImporte: "number|null"
  cdKg: "number|null"
  estado: "real|proyectado"

historical_range_contract:
  - "Cada mes del rango usa su propio contexto financiero."
  - "Corporativo y operativo deben ser del mes correspondiente."
  - "Precio, compras, flete, HG y C&D son del mes correspondiente."
  - "No usar datos de septiembre para agosto."
  - "No rellenar periodos históricos inexistentes con cero."
  - "5A/Todo conservan huecos reales."

trend_contract:
  - "Solo real + complete + valor numérico."
  - "No extender la línea hasta fechas proyectadas."
  - "No reindexar los puntos utilizables como si los huecos temporales no existieran."
  - "La regresión debe usar el índice X real de cada punto dentro de chart.points."
  - "Extremo izquierdo = primer índice real/completo utilizado."
  - "Extremo derecho = último índice real/completo utilizado."
  - "Al cambiar $/$kg se recalcula Y, manteniendo los mismos índices temporales elegibles."
  - "Si hay menos de 2 puntos utilizables, no dibujar tendencia."

province_contract:
  - "Provincia sigue agregando las mismas hojas/planta."
  - "AF Provincia debe coincidir con AF de IGF Diario Provincia."
  - "AE Provincia = AF Provincia / B Provincia, exactamente como Excel."
  - "Si una planta con venta positiva está incompleta, complete=false y missing_plants/missing_components lo informan."
  - "No tratar missing como cero."

new_clients_contract:
  - "No modificar mini gráfica ni Top 10 salvo ajustes estrictamente necesarios por refactor."
  - "newClientEvents de 053BC sigue siendo fuente de verdad."
  - "Top 10 sigue por kg real acumulado."
  - "Descuento Top 10 sigue SUM(monto)/SUM(kg)."

security_contract:
  - "Todas mantiene gate ZP/AD/CF_CDMX antes de lecturas multi-planta."
  - "Individual mantiene assertPlantaPermitidaDashboard."
  - "No debilitar R2."
  - "No writes."
  - "No DDL."
  - "No OpenAI."

acceptance_criteria:
  - "Día real Puebla: gráfica AF == Excel AF."
  - "Día real Puebla: gráfica AE == Excel AE."
  - "Día exacto del corte con proyección: gráfica AF/AE == Excel AF/AE."
  - "Día posterior al corte: gráfica AF/AE == Excel AF/AE."
  - "Un día proyectado con forecast válido no queda nulo solo porque arr.ventas_diarias_cliente no tenga fila real."
  - "VENTA proyectada coincide con B del Excel."
  - "C&D real coincide con AC del Excel."
  - "C&D proyectado coincide con AC del Excel."
  - "Caso donde tabla C&D primaria difiere del fallback demuestra que se usa la misma precedencia del Excel."
  - "Precio faltante en día 2 pero válido en día 1: gráfica día 2 usa mismo carry que PRECIO/Excel."
  - "Costo/flete/HG real coinciden."
  - "Costo/flete/HG proyectados coinciden."
  - "Fallback día 1 052 sigue coincidiendo."
  - "AF Semana == Excel AF Semana."
  - "AE Semana == Excel AE Semana."
  - "Provincia real coincide."
  - "Provincia proyectada coincide."
  - "Tendencia termina en el último punto real/completo, nunca en el último proyectado."
  - "Un hueco/incompleto no comprime artificialmente el eje temporal de la regresión."
  - "Excel previo no cambia."

validation:
  - "Generar en tests el mismo soporte/workbook del Excel y evaluar B/C/F/G/X/AC/AE/AF como oráculo."
  - "Comparar JSON gráfica contra esas celdas."
  - "Probar corte en día 3: día 2 real, día 3 proyectado, día 4 proyectado."
  - "Probar venta proyectada sin venta real."
  - "Probar C&D fuente primaria vs fallback."
  - "Probar precio carry."
  - "Probar compras proyectadas."
  - "Probar fallback día 1."
  - "Probar Provincia."
  - "Probar semana."
  - "Probar tendencia con puntos reales 0,1,4 y proyectados posteriores."
  - "Ejecutar 054 original."
  - "Ejecutar 053A/R1/R2, 053BC, 052, 050 y regresiones afectadas."
  - "git diff --check."

allowed_actions:
  - "crear rama R1 desde base_sha"
  - "extraer helpers puros existentes"
  - "exportar helpers ya existentes si es necesario"
  - "agregar pruebas de paridad"
  - "crear reporte"
  - "commit"
  - "push solo a rama R1"

forbidden_actions:
  - "generar XLSX en runtime para alimentar gráfica"
  - "leer/parsing XLSX desde endpoint"
  - "crear fórmulas financieras nuevas"
  - "cambiar Excel deliberadamente para que coincida con la gráfica"
  - "usar OpenAI"
  - "hacer writes/DDL"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-GRAFICA-PARIDAD-EXCEL-054-R1.md"