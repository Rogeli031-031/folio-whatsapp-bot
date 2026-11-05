# Navegar semanas anteriores día por día

Solicitud directa: en Días de la semana, Semana anterior se desactiva al inicio del mes y no permite consultar semanas históricas. Continuación del flujo de integración/publicación autorizado. No se cambian contratos, aprobaciones ni CURRENT_TASK.

Base a4b06a01b381408853bf7992578d94e4712b0703. Rama fix/igf-semanas-anteriores-diarias.

Causa: navigationFor limitaba ambas direcciones a semanas que intersectaran el mes seleccionado, aunque loadWeeklyPlant/loadWeeklyAll ya cargan los meses que toca cada semana domingo–sábado.

- Los paneles diarios individual y Todas solicitan historical_navigation=1. El servidor conserva corte, planta, año/mes de contexto y autorizaciones, y habilita el retroceso fuera del mes.
- Desde semanas anteriores se puede avanzar de regreso. Se mantiene el límite futuro del mes seleccionado.
- El modo es explícito: los consumidores que recorren nav para construir la gráfica siguen acotados al mes y no disparan una cadena ilimitada de consultas históricas.
- Se mantienen las fórmulas y las fuentes de cada mes. No se generan datos para fechas sin registros.

Validación: 32 pruebas relacionadas aprobadas, con noviembre→octubre, varias semanas de retroceso, cruce diciembre/enero, retorno y conservación del horizonte futuro. Una prueba ejecuta el cliente API y verifica planta, año/mes, corte, ancla y flag para individual/Todas. Se conserva la navegación acotada de las gráficas. Se corrige en el archivo de pruebas una aserción anterior obsoleta que prohibía Gráfica en Todas, función ya presente en la base integrada y cubierta por 081. Compilación de producción/TypeScript, sintaxis del servidor y diferencias.
