task_id: "IMPL-IGF-GRAFICA-ARR-CANALES-LAYOUT-056"

title: "Integrar CASA/COMISIONISTA ARR en gráfica IGF y alinear semanas"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-01"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-01"

base_sha: "cb2a25337e17091a04d3c36990f739b62f87df19"

branch: "impl/igf-grafica-arr-canales-layout-056"

objective: >
  Mejorar el modal de Rentabilidad IGF Diario:
  cambiar la tendencia real a amarillo, alinear cada tarjeta semanal
  con sus días reales en el eje X, retirar del modal el bloque de
  Clientes Nuevos y sustituirlo por las gráficas ARR de CASA y
  COMISIONISTA, permitiendo abrir con doble clic la gráfica individual
  de cualquier cliente del Top 6 delta.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "nuevo componente reusable ARR si es necesario"
  - "frontend-dashboard/lib/api.ts solo si necesita types/props"
  - "server.js únicamente si Todas/Provincia requiere soporte agregado"
  - "lib/commercial-trend-engine.js únicamente si Todas/Provincia requiere resolver agregado"
  - "tests 056"
  - "docs/dev-loop/reports/IMPL-IGF-GRAFICA-ARR-CANALES-LAYOUT-056.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "cambiar matemática AF/AE"
  - "cambiar CIERRE PROYECTADO"
  - "cambiar cálculo ARR"
  - "cambiar definición Top 6"
  - "cambiar Delta Ingreso Cliente Forecast"
  - "eliminar backend de Clientes Nuevos"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

trend_color:
  - "La línea Tendencia real de Rentabilidad IGF pasa de blanca a amarillo."
  - "Usar amarillo visible equivalente a amber/yellow."
  - "Cambiar también la muestra de la leyenda."
  - "Real continúa azul."
  - "Proyectado conserva amarillo punteado."
  - "Deben distinguirse: proyectado punteado; tendencia sólida."
  - "No modificar la regresión ni los puntos usados para la tendencia."

weekly_alignment:
  - "Las tarjetas Semana 1..Semana 5 ya no se distribuyen con flex uniforme independiente del gráfico."
  - "Cada tarjeta debe quedar horizontalmente debajo del intervalo de fechas que representa."
  - "Semana 1 debajo de sus días reales."
  - "Semana 2 debajo de sus días reales."
  - "Etc."
  - "Usar fecha_desde/fecha_hasta de cada week y los índices de points."
  - "No asumir que cada semana siempre tiene 7 días."
  - "No asumir que el mes inicia lunes."
  - "No posicionar por label Semana N."
  - "Debe funcionar también en meses de 28/29/30/31 días."

weekly_layout:
  - "Preferir layout basado en las mismas posiciones X del gráfico."
  - "Puede implementarse con CSS grid donde cada point/fecha represente una columna, o porcentajes derivados de xOf()."
  - "La tarjeta debe abarcar visualmente desde fecha_desde hasta fecha_hasta."
  - "Mantener separación pequeña entre semanas."
  - "No solapar tarjetas."
  - "En móvil permitir scroll/stack controlado si el ancho no alcanza."

main_left_layout:
  - "Se permite desplazar/reducir ligeramente la gráfica hacia la izquierda."
  - "Reservar una columna estable para CIERRE PROYECTADO."
  - "Las semanas deben alinearse únicamente con el ancho real del chart, no con la tarjeta de cierre."
  - "CIERRE PROYECTADO no forma parte del eje temporal."

month_close:
  - "Mantener exactamente lógica 055."
  - "No recalcular."
  - "No modificar B/AF/AE."
  - "Solo puede cambiar su posición visual."

remove_new_clients:
  - "Retirar del modal IGF el bloque visual Clientes Nuevos."
  - "Retirar también Top 10 nuevos del modal IGF para liberar toda la columna derecha."
  - "NO eliminar new_clients_chart/new_clients_top del endpoint."
  - "NO cambiar 053BC."
  - "Los datos se conservan para reutilizarlos más adelante en otro lugar."

arr_source_of_truth:
  component: "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  endpoint: "/api/arr/venta-serie"
  engine: "lib/commercial-trend-engine.js"
  - "No duplicar cálculo de series."
  - "No reconstruir Top 6."
  - "No consultar directamente tablas ARR desde frontend."
  - "CASA usa canal=casa."
  - "COMISIONISTA usa canal=comisionista."
  - "Top 6 debe ser exactamente clientes_top del endpoint."
  - "La comparación vs periodo previo debe seguir siendo la misma del ARR actual."

arr_embedded_panels:
  - "Crear un componente reutilizable del contenido ARR, preferiblemente extraído de ArrVentaGraficaModal."
  - "El modal ARR existente debe seguir funcionando."
  - "El nuevo componente debe poder usarse embedded sin header modal ni botones de cerrar."
  - "Renderizar dos instancias simultáneas:"
  - "CASA arriba."
  - "COMISIONISTA abajo."
  - "Cada panel incluye gráfica de toneladas + línea de tendencia + Top 6 delta."
  - "Mantener colores actuales ARR: CASA amarillo; COMISIONISTA azul."
  - "Comentarios pueden conservarse si el ancho lo permite, pero Top 6 tiene prioridad."
  - "No agregar selector CASA/COMISIONISTA dentro de cada panel."

arr_range_sync:
  - "Los paneles CASA y COMISIONISTA siguen el mismo range seleccionado en IGF."
  - "1D IGF => ARR 1d."
  - "5D => 5d."
  - "1M => 1m."
  - "3M => 3m."
  - "YTD => ytd."
  - "1A => 1a."
  - "5A => 5a."
  - "Todo => todo."
  - "No mostrar segundo selector de rango dentro de panels embedded."
  - "Cambiar rango debe refrescar los dos canales."

arr_plant_scope:
  - "Planta individual: empresa debe ser la planta/empresa seleccionada en IGF."
  - "Usar alias compatible con /api/arr/venta-serie."
  - "GT Puebla debe resolver correctamente a Puebla con el mecanismo existente."
  - "No hardcodear aliases por planta."

province_scope:
  - "Cuando IGF está en Todas, mostrar CASA y COMISIONISTA de Provincia."
  - "No seleccionar arbitrariamente una planta."
  - "Extender el motor compartido únicamente si hace falta."
  - "Provincia = agregación de todos los plant_code de arr.provincia_plants."
  - "Serie diaria = suma de toneladas de todas las plantas del scope."
  - "Top 6 = delta de cliente agregado en Provincia, no concatenación de Top 6 por planta."
  - "Mantener clasificación CASA/COMISIONISTA."
  - "El acceso Provincia debe usar el mismo gate global de IGF Diario Todas."
  - "Usuarios locales no pueden pedir Provincia por URL."

embedded_client_double_click:
  - "Cada fila/cliente del Top 6 debe indicar visualmente que es interactiva."
  - "Doble clic sobre el cliente abre ArrVentaGraficaModal."
  - 'Abrir con mode="cliente".'
  - "clienteNorm = c.cliente."
  - "empresa = scope actual."
  - "Para planta individual, misma empresa/planta seleccionada."
  - "Para Provincia, usar scope agregado Provincia si se implementa soporte aggregate-client."
  - "No abrir DeltaIngresoClienteForecastModal primero."
  - "Debe abrir directamente la misma gráfica individual que usa el botón GRAFICA dentro de Delta Ingreso Cliente Forecast."

client_graph_contract:
  - "La gráfica individual mantiene Venta Ton."
  - "Mantiene Descuento $/kg."
  - "Mantiene Línea de tendencia."
  - "Mantiene Movimiento del cliente."
  - "Mantiene Últimos comentarios."
  - "Mantiene rangos 1D/5D/1M/3M/YTD/1A/5A/Todo."
  - "No modificar esa experiencia salvo para habilitar el launch desde Top 6."

double_click_behavior:
  - "Un clic no debe abrir la gráfica."
  - "Doble clic sí."
  - "No disparar accidentalmente selección/close del IGF modal."
  - "stopPropagation cuando corresponda."
  - "Cursor visual pointer."
  - "title/tooltip: Doble clic para abrir gráfica del cliente."

modal_layering:
  - "La gráfica individual debe aparecer encima del modal IGF."
  - "Cerrar la gráfica del cliente regresa al modal IGF todavía abierto."
  - "No cerrar IGF al abrir/cerrar cliente."
  - "z-index debe ser mayor que IGF."

performance:
  - "CASA y COMISIONISTA pueden cargarse en paralelo."
  - "Máximo una request por canal por cambio de empresa/range."
  - "No query por día."
  - "Evitar que un re-render dispare requests duplicadas."
  - "Abort/cancel stale requests cuando cambia range o planta."

error_handling:
  - "Si CASA falla, COMISIONISTA sigue visible."
  - "Si COMISIONISTA falla, CASA sigue visible."
  - "Mostrar error dentro del panel correspondiente."
  - "No tumbar la gráfica principal IGF."
  - "Loading independiente por canal."

responsive:
  desktop:
    - "Rentabilidad IGF a la izquierda."
    - "CASA y COMISIONISTA apilados a la derecha."
  mobile:
    - "Rentabilidad primero."
    - "Semanas."
    - "Cierre."
    - "CASA."
    - "COMISIONISTA."
    - "Sin overflow horizontal destructivo."

acceptance_criteria:
  - "Tendencia IGF sólida amarilla."
  - "Leyenda Tendencia real amarilla."
  - "Semanas alineadas con sus fechas."
  - "CIERRE PROYECTADO conserva exactamente valores 055."
  - "Clientes Nuevos y Top 10 nuevos ya no aparecen en este modal."
  - "CASA aparece en su lugar."
  - "COMISIONISTA aparece debajo."
  - "CASA coincide con ArrVentaGraficaModal para misma empresa/range."
  - "COMISIONISTA coincide con ArrVentaGraficaModal para misma empresa/range."
  - "Top 6 coincide exactamente con endpoint ARR."
  - "Doble clic Top 6 abre gráfica individual."
  - "Cerrar gráfica individual conserva modal IGF."
  - "1M/3M/etc sincronizan las tres gráficas."
  - "Planta individual funciona."
  - "Todas/Provincia funciona con gate global."
  - "054-R3 y 055 permanecen intactas financieramente."
  - "No writes."
  - "No DDL."
  - "No OpenAI."

validation:
  - "GT Puebla CASA 1M."
  - "GT Puebla COMISIONISTA 1M."
  - "Acapulco."
  - "Tehuacán."
  - "range 5D."
  - "range 1M."
  - "range 3M."
  - "Provincia/Todas."
  - "Top 6 parity."
  - "double click cliente CASA."
  - "double click cliente COMISIONISTA."
  - "client modal stacking."
  - "weekly date alignment 30-day month."
  - "weekly date alignment 31-day month."
  - "month starts midweek."
  - "CIERRE PROYECTADO parity."
  - "regresión 054/R1/R2/R3/055."
  - "git diff --check."

allowed_actions:
  - "crear rama 056 desde base_sha"
  - "extraer componente reusable ARR"
  - "ajustar layout modal IGF"
  - "agregar soporte Provincia read-only si es necesario"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama 056"

forbidden_actions:
  - "copiar lógica commercialTrendEngine al frontend"
  - "duplicar cálculo Top 6"
  - "cambiar matemática IGF"
  - "borrar backend Clientes Nuevos"
  - "writes"
  - "DDL"
  - "git add ."
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-IGF-GRAFICA-ARR-CANALES-LAYOUT-056.md"