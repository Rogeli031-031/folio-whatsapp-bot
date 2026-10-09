TASK: FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2

AUTORIZACIÓN HUMANA:
Luis Rogelio Zaragoza Álvarez autoriza implementar esta corrección.
NO MERGE.
NO DEPLOY.
Al terminar: DONE_PENDING_REVIEW y STOP.

status: DONE_PENDING_REVIEW

product_sha: 5827f2c709cf847c029fee8e83b251c8ca293ce9

BASE:
Trabajar desde el main actual que contiene FIX 069-R1.
SHA esperado de main:
ac8625cc8f3b81bd345c54a291219f7bf7b8e9ff

Antes de modificar:
1. fetch origin
2. verificar que origin/main sea exactamente ese SHA
3. working tree limpio
4. crear rama:
   fix/igf-diario-weekly-chart-values-compras-comment-069-r2

Si main cambió, STOP y reportar.

OBJETIVO

Corregir dos puntos del IGF Diario/Excel sin alterar las fórmulas financieras existentes.

==================================================
A. GRÁFICA DE RESUMEN SEMANAL
==================================================

Problema:
La hoja RESUMEN del Excel ya contiene una gráfica semanal, pero visualmente no permite identificar claramente cuánto se ganó o perdió cada día.

Ejemplo real Puebla Semana 41:
Dom +55,745.73
Lun -50,465.74
Mar -32,868.88
Mié -14,468.60
Jue -41,987.93
Vie -32,768.60
Sáb -39,892.67

La gráfica debe seguir representando los valores reales/proyectados según el contrato existente, pero debe ser ejecutiva y entendible sin consultar la tabla.

REQUERIDO:

1. Mostrar el valor numérico de cada punto/día.
2. Para RESULTADO (Importe), formato legible MXN:
   positivo: +$55,746
   negativo: -$50,466
   cero: $0

3. Agregar línea horizontal claramente identificable en cero.

4. Diferenciar visualmente:
   - resultado positivo: verde
   - resultado negativo: rojo
   - cero: neutral

5. Mantener la distinción existente entre real y proyectado, pero sin que esa distinción impida identificar ganancia/pérdida.

6. Los null siguen siendo huecos.
   NO convertir null a cero.

7. La gráfica debe continuar respondiendo a summary_metric.
   No hardcodear RESULTADO Importe.

8. Para métricas $/kg, mostrar formato correspondiente.
   Para kilos, formato correspondiente.
   Para importes, formato monetario correspondiente.

9. No recalcular métricas financieras desde valores redondeados.
   La gráfica consume los valores ya calculados por el weekly summary.

10. Mantener PNG embebido y generación local actual.
    No servicio externo.
    No dependencia nueva salvo necesidad técnicamente justificada; si aparece esa necesidad, STOP antes de agregarla.

==================================================
B. COMENTARIO DEL DÍA — CONTROL DE COMPRAS
==================================================

Objetivo:
En la hoja IGF Diario, columna AI "COMENTARIO DEL DIA", agregar AL PRINCIPIO del comentario de cada día un análisis automático del comportamiento del costo de compra.

No sustituir ni eliminar el comentario existente.
El bloque COMPRAS debe aparecer primero y después continúa Venta/clientes/etc.

FUENTE:

Usar CONTROL DE COMPRAS y su costo CONSOLIDADO diario.

No reconstruir el costo desde valores visualmente redondeados si ya existe la fuente numérica usada para generar CONSOLIDADO.

REFERENCIA:

Para cada día D con costo consolidado válido:

1. Buscar hacia atrás los últimos DOS DÍAS ANTERIORES que tengan costo consolidado válido.
2. No significa simplemente D-1 y D-2.
3. Saltar días sin costo/compra válida.
4. Calcular:

referencia = promedio aritmético de esos dos costos consolidados.

variación = costo_consolidado_D - referencia

Ejemplo Puebla:

05/10 = 12.465
06/10 = 12.465
07/10 = 12.918

referencia = 12.465
variación = +0.453 $/kg

El comentario debe comenzar aproximadamente:

COMPRAS: Incrementó el costo de compra +0.453 $/kg, de una referencia promedio de 12.465 $/kg en los 2 días anteriores a 12.918 $/kg hoy. Compra: TOMZA TEPEJI — 20,220 kg.

Después debe continuar exactamente el contenido actual:

Venta: ...
clientes...
etc.

PROVEEDORES:

Determinar los proveedores que REALMENTE tuvieron compra ese día.

No inferir proveedor por tarifa.

Si solo compró uno:
Compra: TOMZA TEPEJI — 20,220 kg.

Si participaron varios:
Compras: PEMEX TUXPAN — X kg; TOMZA TEPEJI — Y kg.

No mencionar proveedores con compra vacía o 0.

FORMATO:

La variación debe conservar precisión de 3 decimales $/kg.

Si variación > 0:
"Incrementó..."
y SOLO el valor de variación:
+0.453 $/kg
debe mostrarse rojo en Excel.

Si variación < 0:
"Disminuyó..."
y SOLO el valor:
-0.XXX $/kg
debe mostrarse verde.

Si variación = 0:
"Sin cambio..."
0.000 $/kg
formato neutral.

Usar rich text de Excel para colorear únicamente el valor de la variación.
NO colorear toda la celda AI.

No romper wrapText, alineación, tamaño de fila ni comentarios existentes.

CASOS DE COBERTURA:

A) Existen dos días previos válidos:
usar promedio de 2.

B) Solo existe un día previo válido dentro de la información disponible:
usar ese único día como referencia y decir:
"respecto al último día con compra..."

C) No existe referencia previa:
no inventar variación.
Puede informar el costo/compra del día sin afirmar incremento/disminución.

D) Día actual sin costo consolidado válido:
no generar comparación falsa.

E) Costo 0:
revisar semántica existente.
No asumir automáticamente que 0 equivale a compra válida.
Debe respetar el contrato real de CONTROL DE COMPRAS.

F) Cruce de semana:
los dos días anteriores válidos pueden pertenecer a la semana anterior.

G) Cruce de mes:
debe poder obtener los últimos días válidos del mes anterior si son necesarios para formar la referencia.

IMPORTANTE:
La referencia es temporal, NO "los dos renglones anteriores del Excel".

==================================================
C. PARIDAD Y NO REGRESIONES
==================================================

No modificar:

- cálculo de Venta
- Precio
- Costo
- Flete
- Margen Bruto
- Margen Neto
- gastos
- HG
- C&D
- Resultado $/kg
- Resultado Importe
- ARR
- Forecast
- Folios
- lógica semanal domingo-sábado
- lógica 5D de 069-R1
- orden RESUMEN / IGF Diario
- comentarios de clientes existentes
- clientes nuevos
- permisos
- DB schema

El nuevo comentario de compras es ADITIVO.

==================================================
D. PRUEBAS
==================================================

Crear pruebas específicas 069-R2.

Como mínimo verificar:

1. 12.465, 12.465 -> 12.918 produce:
   referencia 12.465
   delta +0.453

2. El texto dice Incrementó.

3. +0.453 $/kg recibe rich text rojo y el resto del comentario no.

4. Una disminución produce delta negativo y rich text verde.

5. Sin cambio produce neutral.

6. Día sin compra no fabrica comparación.

7. Salta un día sin compra para encontrar los últimos dos válidos.

8. Cruza semana correctamente.

9. Cruza mes correctamente.

10. Identifica TOMZA TEPEJI porque tuvo compra real, no por tarifa.

11. Varios proveedores se enumeran correctamente.

12. El comentario existente de Venta/clientes permanece después del bloque COMPRAS.

13. Gráfica muestra labels para todos los puntos no-null.

14. Positivos y negativos son distinguibles.

15. Existe referencia visual de cero.

16. Null no se convierte a cero.

17. summary_metric continúa funcionando.

18. 069-R1 completo sigue PASS.

19. Suite relacionada 064–069 sigue PASS.

20. node --check server.js PASS.
21. frontend build PASS.
22. git diff --check limpio.

==================================================
E. ENTREGA
==================================================

Actualizar:
docs/dev-loop/CURRENT_TASK.md

Crear:
docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2.md

El reporte debe incluir:
- causa
- archivos modificados
- fórmula exacta de referencia
- tratamiento de null/0
- cruce de semana/mes
- fuente de proveedores
- ejemplo Puebla 07/10
- comportamiento del rich text
- cambios de gráfica
- pruebas ejecutadas
- resultados
- SHA final

Commit y push únicamente a la rama 069-R2.

NO crear merge automático.
NO merge a main.
NO deploy.

Finalizar en:
DONE_PENDING_REVIEW

y STOP para revisión humana.

RESULTADO:
status: DONE_PENDING_REVIEW
product_sha: 5827f2c709cf847c029fee8e83b251c8ca293ce9
pruebas: 109/109
node_check: PASS
frontend_build: exit 0
git_diff_check: limpio
reporte: docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CHART-VALUES-COMPRAS-COMMENT-069-R2.md