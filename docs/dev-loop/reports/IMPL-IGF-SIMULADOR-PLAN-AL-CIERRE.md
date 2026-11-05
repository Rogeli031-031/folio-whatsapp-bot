# Plan al cierre en el simulador IGF

- `task_id` — `IMPL-IGF-SIMULADOR-PLAN-AL-CIERRE`
- `outcome` — `DONE`, pendiente de revisión humana.
- Base integrada `bab5dd65da07e60a3b5a924750f07b7ef1a6baeb`. Autorización en la rama `65cd426`. Producto `817c80e47ab169ec4cc858983d40299f42974edf`.

## Resultado

El simulador abre la cartera de la planta y corte seleccionados desde **Plan al cierre**. La tabla ordena por variación de ingreso al cumplir la meta, confirmando los cambios de F y G al salir de la celda. La selección determina las variaciones que se agregan al IGF base. Las propuestas incluyen compradores inactivos, el historial de las cuentas confirmadas como un mismo comprador y una referencia mensual cuando hay observaciones comparables. Los objetivos son escenarios comerciales a validar.

El Excel se genera desde el cálculo que alimenta la pantalla y contiene plan, cuentas, categorías y conciliación IGF. «Usar plan de Excel» recupera F, G y la inclusión del archivo revisado localmente, tras comparar identidad de la cartera, fuente, planta, corte y ventas base. El punto conserva una copia de su base y selección. Al editarlo actualiza el mismo registro. Los reintentos de creación se serializan en la base y se comprueba la versión al editar.

## Comprobación

- Pasaron 42 pruebas del plan, las rutas de propuestas y la interfaz del simulador. Cubren la permanencia del descuento en todo el volumen pendiente, el signo del ingreso, el mínimo para empatar, fuentes incompletas, accesos por planta, clientes inactivos, orden, agrupación, exportación y reapertura.
- Verificación privada con el Excel revisado del negocio y los registros disponibles a su corte. Se conciliaron la cartera, los compradores seleccionados, el cambio de ingreso y los tres valores del punto con la precisión mostrada en el Excel.
- Prueba en Edge con las rutas Express del producto, PostgreSQL temporal y compradores ficticios. Se abrió el simulador, se editaron F y G, se seleccionó el comprador, se descargó el Excel, se recuperó su selección y se guardó en la gráfica. Al repetir el guardado permaneció un registro. La reapertura restauró las entradas y una segunda edición actualizó el mismo número.
- TypeScript aprobado. Compilación de producción del dashboard completada con 13 páginas; el servidor standalone respondió HTTP 200 en `/health` y `/igf-forecast` en localhost.
- Un plan nuevo requiere una versión DICF con fecha del día anterior al corte dentro del mes seleccionado. Si falta la versión, se muestra un mensaje. Un punto ya guardado conserva su referencia aunque DICF cambie posteriormente.

## Alcance y revisión

Archivos modificados: ficha de estado, modal del simulador, componente Plan al cierre, cálculo compartido, lectura y conciliación del plan, exportador Excel, rutas y almacén de propuestas, pruebas de interfaz/plan y este informe. Sin modificación de contratos, de la copia de la tarea 080, de precios, ventas registradas, presupuestos o configuración de servicios.

Contratos consultados: Constitución Director IA, índice de arquitectura y protocolo del loop. Contratos modificados: ninguno. Contradicciones contractuales: ninguna. Desvíos: ninguno. La recuperación del Excel cubre la selección revisada solicitada. `secrets_check`: no se incluyeron tokens, credenciales, teléfonos, exportaciones ni listados de clientes reales. `next_task_proposed`: ninguna. `human_decision_needed`: revisar la solicitud e integrar en GitHub si se acepta. Producción queda pendiente de esa decisión.
