# AUDIT-PRONOSTICO-DIAS-SELECCION-COMDESC-078-R1

STATUS: DONE_PENDING_REVIEW

OUTCOME: B

BASE SHA: d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c

BRANCH: audit/pronostico-dias-seleccion-comdesc-078-r1

NO PRODUCT CHANGE. NO PR. NO MERGE. NO DEPLOY.

## Significado de selected=false

`selected=false` significa que ese día del lookback no entra como muestra del PROM. No significa «no proyectes este día».

La evidencia está en el propio producto, desde el commit `481fe2c2ea64b1e7b39a9c54d06f3c7c1471bf9d` del 2026-04-13:

- El comentario de `loadPronosticoDiasSeleccionMap` dice: mapa de fecha a «incluir en promedio PROM». Sin fila, se asume true.
- `POST /api/dashboard/pronostico-dias` dice: «Guarda qué días del lookback entran en el PROM».
- `computePromMesByDow` dice: «Día desmarcado no entra».
- La UI, en `IgfForecastClient`, titula el control «Días del lookback incluidos en el PROM (marcar / desmarcar)». El tipo del día dice que el clic alterna la inclusión en el PROM.

El día futuro recibe el resultado de ese promedio mediante `weekdayPromAt`. Esa aplicación no consulta si la fecha futura está marcada. `resolveComisionCd`, antes del corte, sigue usando la captura del propio día. La marca no borra la tasa real de ese día; solo la saca de la muestra que construye el forecast.

## Qué métricas usan la misma marca

La misma selección alimenta el PROM de venta total, venta por canal, descuento total y descuento por canal. Precio, costo y flete no leen `arr.pronostico_dias_seleccion`.

Un día desmarcado con un dato real válido deja de servir como evidencia histórica para venta y para comisión/descuento. Sigue existiendo como captura de ese mismo día cuando la fecha es anterior al corte.

## San Luis 13/09 y 20/09

La tabla no guarda motivo ni usuario. Solo guarda `selected` y `updated_at`.

Para el corte `2026-10-09`, las seis plantas tienen el mismo patrón: 18 días en false y 15 en true. False es el bloque 2026-09-07 a 2026-09-24. True es 2026-09-25 a 2026-10-09. Cada planta se guardó de una vez: 33 filas con el mismo `updated_at`. San Luis quedó en `2026-10-09T15:01:40.285Z`.

13/09 y 20/09 caen dentro del bloque desmarcado. 27/09 y 04/10 caen dentro del bloque marcado. No hay una regla de código que desmarque domingos. La base no dice si el bloque se excluyó por atípico, por venta o por otra razón. Lo que sí queda guardado es la exclusión de esas fechas para el PROM.

Dentro de la ventana estricta, que empieza el 2026-09-12, los días 12 al 24 de septiembre están desmarcados a propósito. Del 7 al 11 de septiembre están fuera de esa ventana; sin fila tampoco entrarían.

## Simulación con el helper real

`computePromMesByDow` sobre el mapa de San Luis, corte 2026-10-09:

- Escenario actual, con 13/09 y 20/09 desmarcados: el domingo queda `""`. `weekdayPromAt` devuelve null. El forecast de 04/10, si ese día se tratara como proyectado, es null.
- Escenario que vuelve a marcar solo esos dos domingos: el helper devuelve -3.69. Las observaciones que entran son 2026-09-13 = -5.99 y 2026-09-20 = -1.39. El resto de los días de la semana no se mueve en esa prueba, porque no se reabrieron.

No se cambió código ni datos.

## Alcance si se ignorara la selección

Reabrir todo el bloque 2026-09-12 a 2026-09-24 metería otra vez 13 fechas en el PROM de venta y de descuento de las seis plantas. No se calculó aquí el promedio nuevo de lunes a sábado. Reabrir solo 13/09 y 20/09 mueve únicamente el domingo, a -3.69, y contradice la selección guardada.

## Siguiente paso

No corresponde un FIX que vuelva a meter 13/09 y 20/09 en el promedio. Esa exclusión es el contrato vigente de la marca.

Para llenar la tasa del 04/10 sigue haciendo falta una decisión humana distinta:

- última tasa real anterior, -4.33 del 03/10;
- promedio simple del 03/10 y el 05/10, -4.095;
- mantener null;
- o autorizar de forma explícita el uso de muestras que hoy están desmarcadas, sabiendo que el helper de domingo daría -3.69.

task_id: AUDIT-PRONOSTICO-DIAS-SELECCION-COMDESC-078-R1

outcome: DONE

archivos tocados: este reporte y `docs/dev-loop/CURRENT_TASK.md`

archivos no tocados: producto y tests

secrets_check: sin secretos

human_decision_needed: la fuente de la tasa del 04/10, sin reabrir el PROM desmarcado
