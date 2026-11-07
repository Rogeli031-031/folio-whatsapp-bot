# Resumen diario de compras, venta y HG en AL

task_id: IMPL-IGF-DIARIO-RESUMEN-COMPRAS-HG-AL
outcome: DONE

El usuario autorizó por chat implementar y publicar para las seis plantas. Eligió HG sobre venta total. La autorización está registrada en CURRENT_TASK y su commit inicial.

AL muestra compras, venta total, saldo compras menos ventas, HG en kilos y porcentaje sobre venta total. Las fórmulas toman el mismo día de CONTROL DE COMPRAS y la venta en kilos del IGF. La búsqueda por encabezados soporta diferentes cantidades de proveedores y las hojas auxiliares de la descarga de Todas. El saldo se identifica como diferencia aritmética. No se declara inventario medido ni se infiere HG a partir de él.

Los días desde el corte se identifican como proyectados. Los faltantes quedan sin dato, los ceros explícitos se conservan y la venta no positiva no produce división. Los auxiliares de costo y flete se trasladan fuera de AL y se actualizan sus reglas de formato. El formato anterior a octubre conserva sus cálculos y también incorpora AL. La columna se incorpora a cada hoja de planta.

## Validación

- Pruebas de integración con las seis plantas en septiembre y noviembre, fuentes de compra con uno a tres proveedores, columnas de otra planta, fechas, conversión toneladas a kilos, conservación de comentarios, auxiliares y serialización XLSX.
- Suite de 59 pruebas con 58 aprobadas. El fallo de consolidación semanal de la prueba 070 también ocurre en la base integrada. Las dos comprobaciones estáticas antiguas de endpoint/nombre de archivo de 024 también fallan en la base. Se reprodujeron los tres fallos en una copia limpia de origin/main y se conservaron fuera de esta corrección.
- Regresión golden de Director IA terminada con código 0.
- Recálculo en Microsoft Excel de once casos con ceros, HG negativo, faltantes, fuentes con error y proyecciones. Todos aprobados.
- Copia privada del archivo aportado de Tehuacán recalculada en Excel. El 06/11/2026 muestra compras 23,670.00 kg, venta 12,259.60 kg, saldo +11,410.40 kg y HG 388.00 kg, 3.16 % sobre venta total.
- Revisión visual de AL en el archivo exportado con texto completo, encabezado, ajuste de líneas y distinción de proyecciones. Los datos privados y archivos de prueba quedan fuera de Git.

Archivos de producto limitados al lector de columnas de compras, los dos formatos IGF Diario y el nuevo resumen. Se actualizan las pruebas que esperaban AL oculta y se agrega cobertura específica.

Contratos consultados son Constitución, índice de arquitectura y LOOP_PROTOCOL. Contratos modificados ninguno. Sin desvíos de alcance. La autorización expresa del usuario permite registrar su respuesta e integrar tras las pruebas.

secrets_check: sin secretos, credenciales ni datos privados versionados
human_decision_needed: ninguna para la publicación autorizada
next_task_proposed: ninguna
