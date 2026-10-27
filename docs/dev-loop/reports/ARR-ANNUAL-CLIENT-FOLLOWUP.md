# ARR anual: seguimiento del cliente en columnas I–M

outcome: DONE_PENDING_REVIEW

Solicitud directa del usuario: añadir a las hojas anuales YTD por planta última compra, frecuencia estimada, estado, descuento acumulado del mes y descuento del día de la última compra. Se conserva A–H y el análisis YTD existente. Las tres primeras columnas son fecha, días y texto; únicamente los descuentos se expresan en $/kg.

Base: 3d07f1880249705b7bfc42752edce5e645111cdd.
Rama: feature/arr-annual-client-followup.

## Fuentes y cálculo

El endpoint anual enriquece las filas existentes por planta y cliente. Lecturas por lote de ventas diarias, descuentos diarios y configuración DICF. Fecha de última compra: último día con kilos positivos hasta el mes seleccionado, incluyendo clientes sin venta en el mes. El corte de seguimiento corresponde al último dato de ventas de cada planta hasta ese mes. Frecuencia y estado reutilizan las funciones puras de dicf.js y su configuración de ventana/tolerancia; no se ejecuta computeDicf ni se persisten proyecciones.

Descuento acumulado mes = suma real de descuento MXN / suma real de kg desde inicio de mes al corte. Descuento última compra = descuento MXN de ese día / kg de ese día. Se mantiene el signo de la fuente; no se usa Forecast ni se promedian tasas diarias. Cero explícito se conserva; información ausente o denominador no positivo deja celda sin cifra. Un fallo de la fuente de seguimiento se identifica en el subtítulo y no reemplaza cifras con ceros.

Columnas en PUEBLA, TEHUACAN, ACAPULCO, QUERETARO, SAN LUIS y MORELOS: I última compra (fecha Excel), J frecuencia (días), K estado, L descuento acumulado mes ($/kg), M descuento día última compra ($/kg). Formatos, encabezados y filtros extendidos; importes con tres decimales. Las hojas ARR, ARR Plan, CASA, COMISIONISTA y consolidados anuales conservan su estructura.

## Validación

- 33/33 pruebas de análisis/exportador anual y seguimiento: separación por planta, ponderación por kilos, signo, cero y ausencia, fecha anterior al mes, exclusión de datos posteriores, configuración DICF, lectura sin escrituras, columnas I–M y serialización XLSX.
- Build frontend de producción correcto, incluyendo validación TypeScript y prepare-standalone. El primer intento aislado encontró EPERM en .next; la compilación fuera del aislamiento terminó con exit 0.
- Revisión visual mediante render de una exportación sintética: encabezados I–M y formatos legibles, fecha y tasas correctas.
- Archivo de referencia ARR_GT_Puebla_2026-09_2026-10 (3).xlsx inspeccionado sin modificar: hoja PUEBLA con ocho columnas existentes.
- git diff --check correcto.

Contratos consultados previamente en esta sesión: AGENTS.md, LOOP_PROTOCOL.md y DIRECTOR_IA_CONSTITUTION.md; sin modificaciones. No se crean aprobaciones humanas ni se reutilizan autorizaciones históricas: esta implementación corresponde a la petición directa del chat.

Sin DDL, escrituras en DB, credenciales, cambios de clasificación comercial o de fórmulas YTD. Se añaden exports de funciones puras DICF, sin cambiar sus reglas. Sin merge ni deploy de esta funcionalidad.

human_decision_needed: revisión e integración; main activa Auto-Deploy de backend y frontend.
