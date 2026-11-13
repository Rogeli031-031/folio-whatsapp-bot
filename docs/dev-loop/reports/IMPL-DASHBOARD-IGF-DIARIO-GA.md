# IGF Diario desde el dashboard de folios

- Tarea: `IMPL-DASHBOARD-IGF-DIARIO-GA`.
- Fecha: 2026-11-13.
- Estado: `DONE_PENDING_REVIEW`.
- Rama: `feat/dashboard-igf-diario-ga`.
- Base: `041e1c1795ffc639397776fd5947c39dde3aecd6`.
- Autorización: solicitud directa del usuario en el chat: «el boton de IGF Diario, quiero que pongas uno igual con el mismo comando en el dashboard de folios, el cual lo podran descargar tambien los GA.»

## Cambio

Se añade IGF Diario a la barra del dashboard de folios, después de Delta Ingreso. Abre un selector de planta y fecha de corte y reutiliza `IgfDiarioGraficaModal` y el exportador existentes. La selección de semana permanece a cargo del mismo modal.

El servidor lista únicamente las plantas permitidas. GA recibe una excepción de lectura para gráfica, series CASA/COMISIONISTA y Excel individual: requiere planta explícita y asignada; las solicitudes globales, sin asignación y de plantas ajenas se rechazan. Se conserva el bloqueo general de sus demás funciones financieras y de escritura. La descarga GA no guarda el snapshot de pronóstico que el exportador genera para otros roles.

No se cambian fórmulas financieras, datos productivos, contratos ni otras tareas. Los artefactos de compilación quedan fuera del cambio.

## Validación

- `node --check server.js`: aprobado.
- `node --test test/dashboard-igf-diario-ga.test.js test/igf-dashboard-gg-scope.test.js test/igf-diario-todas-scope-global-053a-r2.test.js test/impl-igf-grafica-excel-week-selector-087.test.js`: 28 pruebas aprobadas, cero fallos.
- Las pruebas ejecutan los manejadores de las rutas con dependencias de datos sustituidas: seis plantas para GA, rechazo de planta ajena y exportación global, lista según asignación, roles existentes y conservación de periodo/corte/semana. El exportador del workbook está sustituido en estas pruebas de acceso.
- `frontend-dashboard`: TypeScript (`tsc --noEmit --incremental false`) y `npm run build` aprobados. Solo se observó la advertencia existente de caniuse-lite desactualizado.
- Prueba de interfaz en Chrome con servidor local y datos sintéticos: GA ve IGF Diario; solo se ofrece su planta; abre la gráfica existente; selecciona Semana 45 y solicita el Excel con la planta, corte 2026-11-13 y `week_anchor=2026-11-01`. Se comprobó la descarga de un archivo de prueba local. ZP ve el botón después de Delta Ingreso y puede elegir las seis plantas o Todas.

## Límites y siguiente paso

La prueba de interfaz y de rutas utiliza datos sintéticos, no una sesión real de GA ni la base productiva. No demuestra los importes de un workbook productivo. Se reutiliza el exportador existente sin cambiar sus cálculos.

Pendiente revisión e integración; el cambio todavía no está publicado. La publicación requiere actualizar backend y frontend y comprobar la descarga con una sesión autorizada. Este reporte no autoriza producción ni otra tarea.
