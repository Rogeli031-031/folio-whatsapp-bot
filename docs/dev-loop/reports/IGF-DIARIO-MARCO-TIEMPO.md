# IGF Diario: marco de tiempo

Solicitud directa: alternar el detalle diario existente con columnas por semana y por mes. Base: 2affa516e008e6627b74ec9b8f42ee6a54aac235. Rama: feature/igf-diario-marco-tiempo.

- Selector Marco de tiempo: Dias de la semana (predeterminado), Por semanas, Por mes. Disponible en planta y Todas (consolidado de plantas autorizadas).
- Semanas completas de domingo a sabado que intersectan el mes seleccionado. Octubre 2026: semanas 40 a 44, desde 27/09 hasta 31/10. Cada encabezado indica fechas exactas.
- Meses calendario del mismo anio hasta el mes seleccionado, cuatro meses iniciales por defecto, con selector Mes inicial. Octubre abre julio a octubre. Enero comienza en enero.
- Reutiliza loadMonthBundle, aggregateWeek y consolidateCovered: suma importes, pondera valores por kilo, conserva cobertura, faltantes, corte, overrides y proyeccion vigente del mes abierto. Meses historicos sin proyeccion actual. No agrega totales que dupliquen semanas cruzadas.
- Carga una vez cada mes por planta dentro de cada peticion. Mantiene controles de acceso del endpoint existente. Sin migraciones ni nuevas escrituras de datos.

## Validacion

- 24/24 pruebas focales. Regresion ampliada: 38/39, sin nueva falla; la restante es una asercion obsoleta en igf-diario-weekly-sunsat-multiplant-069 que prohibe Grafica en Todas, aunque ese boton ya existe en HEAD base (git show confirmado). No se altero esa prueba.
- Pruebas nuevas: limites, semanas 40-44, cruce de anio, febrero bisiesto, meses exactos, peso de venta, cobertura incompleta, paridad con detalle semanal, consolidado y proyeccion solo del mes abierto.
- Compilacion de produccion, TypeScript, sintaxis del servidor y diff --check correctos.
- Navegador local con API simulada: detalle, cinco semanas, cuatro meses, cambio de mes inicial y regreso al detalle correctos. Capturas revisadas. Ruta temporal de prueba retirada.

Implementado para revision; sin merge, despliegue ni manipulacion de datos en produccion.
