# Plan al cierre en las seis plantas

- Tarea: `FIX-IGF-PLAN-AL-CIERRE-MULTIPLANTA`
- Resultado: `DONE`. Pendiente de revisión humana.
- Base: `9ca8701f5cc01a43aaea64a68f757e7137dd90a8`. Autorización local: `7d59885`. Producto: `ebb53929ad8152a06af0f8d4716fe8bfac86b044`.

## Cambio

El plan consulta la planta autorizada y sus alias exactos en DICF, ventas, descuentos y clasificación. Un registro importado con dos nombres equivalentes se cuenta una vez en su clave de origen. Las capturas con importes incompatibles producen un aviso. La importación del Excel valida la misma planta, fuente y corte, también al volver a abrir un punto.

Se conserva una referencia DICF válida del día anterior al corte. Cuando falta o no concuerda con la venta registrada y el margen disponible, el plan reconstruye el pronóstico en lectura. Usa el cálculo nativo de cierre por cliente, los parámetros de la planta y una versión de margen disponible hasta el día de referencia. La tabla indica cuál de las dos fuentes se usó. Si falta la captura necesaria o el margen, devuelve la fecha y el dato pendiente. Las propuestas guardadas conservan sus cifras originales.

## Verificación

- 120 pruebas aprobadas en las suites de plan, simulador y DICF Excel. TypeScript y compilación de producción del dashboard aprobados.
- En PostgreSQL aislado se comparó la reconstrucción con el DICF nativo para Puebla, Tehuacán, Acapulco, Querétaro, San Luis y Morelos. En Edge se abrió la tabla desde el simulador para cada planta en dos cortes consecutivos, uno con pronóstico guardado y el siguiente con reconstrucción automática.
- El recorrido de integración verificó orden y selección, Excel, recuperación del archivo, guardado de punto, edición conservando su número, protección por planta y reintentos. También se verificaron ventas y versiones posteriores al corte, duplicados y conflictos bajo alias, compradores inactivos y descuentos desconocidos.
- En producción se ejecutaron únicamente consultas de lectura sobre las fuentes para las seis plantas en los cortes del 4, 5 y 6 de noviembre. En los dos primeros hubo ventas capturadas hasta el día requerido. Para el corte del día 6, en el momento de la comprobación faltaba la captura del día 5. El escenario de ese corte con la captura presente se probó con datos ficticios.
- Archivos de producto: módulo de Plan al cierre, catálogo de alias, función de proyección compartida con DICF, componente y validación de Excel. Pruebas en `test/igf-plan-al-cierre.test.js`. Sin cambios a precios, presupuestos, datos productivos, esquema, contratos de Director IA ni configuración de despliegue.
- Contratos consultados: Constitución Director IA, índice de arquitectura y protocolo del loop. Contratos modificados, contradicciones y desvíos: ninguno.
- `secrets_check`: sin credenciales ni registros de compradores en Git. `next_task_proposed`: ninguna. `human_decision_needed`: revisar e integrar en GitHub si se acepta. Despliegue pendiente de integración.
