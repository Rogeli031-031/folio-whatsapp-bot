# Plan al cierre · HG editable como porcentaje de venta

task_id: IMPL-IGF-PLAN-AL-CIERRE-HG
outcome: DONE
product_sha: c1f39295e5ab67c977f133e1fe9cf77424a3a850

La pantalla aplica el porcentaje de HG a los kilos de venta mensual del plan y valora los kilos generados o perdidos al precio de HG del corte. La diferencia entre la aportación original y la simulada se incorpora una vez al resultado. La base original queda guardada dentro del plan y el punto de la gráfica usa los supuestos del escenario. Los cambios comerciales por comprador siguen calculándose con el margen DICF.

## Verificación

- Pasaron 52 pruebas del plan y del simulador, incluida la edición de un punto de formato anterior con HG positivo, cero y negativo, la protección frente a ediciones simultáneas y la coincidencia de resultado entre el Excel, la gráfica y la reapertura. También pasaron la comprobación de tipos y la compilación de producción.
- En Edge y una base temporal con datos sintéticos se ejercitó el flujo de las seis plantas para los cortes 5 y 6 de noviembre de 2026. En los 12 casos se editó el HG, se descargó y recuperó el Excel, se guardó el punto y se reabrió el mismo número para volver a cero. Se contrastaron los resultados con la base y la selección comercial.
- Al faltar la valoración del HG se conserva el cálculo original y se explica en pantalla el dato requerido para editar el porcentaje.

## Alcance y decisión

- Archivos de producto: componente IgfPlanAlCierre, cálculo compartido, servicio de puntos y exportador del plan. También se actualizaron la ficha y las pruebas de Plan al cierre.
- Fuera del cambio: bases de datos de producción, puntos existentes en producción, cálculos reales, contratos de Director IA y configuración de despliegue.
- Contratos consultados: Constitución de Director IA, índice de arquitectura y protocolo de desarrollo supervisado.
- Contratos modificados: ninguno. Sin contradicciones ni desvíos de alcance.
- secrets_check: se revisó el diff. Las pruebas usaron datos de ejemplo.
- human_decision_needed: revisar la solicitud e integrarla para desplegar.
- next_task_proposed: ninguna.
