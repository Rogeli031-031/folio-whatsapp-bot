# IGF-TALLER-QUERETARO-CARGA

```yaml
task_id: IGF-TALLER-QUERETARO-CARGA
outcome: DONE
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/igf-queretaro-taller-xlsx.js
  - lib/igf-queretaro-taller-upload.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/20261125_igf_taller_diario_queretaro.sql
  - test/igf-queretaro-taller-xlsx.test.js
  - test/igf-queretaro-taller-upload.test.js
  - docs/dev-loop/reports/IGF-TALLER-QUERETARO-CARGA.md
files_not_touched:
  - lib/igf-puebla-taller-xlsx.js
  - lib/igf-puebla-taller-upload.js
  - lib/igf-acapulco-taller-xlsx.js
  - lib/igf-acapulco-taller-upload.js
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions:
  - "Una fecha volátil en el encabezado no es el corte. Se usa el día de la pestaña con el mes y año confirmados. Se conservan fechas y días reportados con advertencias; los avisos no prueban una fecha corregida ni una salida."
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Revisar el PR borrador. Antes de publicar, autorizar por separado el historial de Querétaro y las cuentas de acceso. No se aplicó SQL ni se otorgó acceso en producción."
```

- Carga aislada por planta y cuenta. El padrón visible verifica que es Querétaro; ni el padrón ni el contenido oculto se almacenan como cortes. Se validan encabezados y calendario, se presentan los avisos por corte y no se rellenan fechas faltantes.
- La confirmación liga archivo, cuenta y periodo. Se conserva el detalle por revisión. Huella por fecha y contenido del corte: no incluye fecha volátil del encabezado ni posición de filas. El mismo contenido admite fechas distintas, y un cambio genera nueva revisión sin duplicar cortes previos. El lote usa una sola transacción con bloqueo por periodo.
- Prueba con el Excel original no publicado: 12 cortes, 120 filas, diez unidades por corte; la segunda carga omite los 12. Se ejercitó revisión nueva con datos sintéticos, exclusión de fechas imposibles/futuras, enlaces web, archivos no válidos y cuentas sin autorización.
- 21/21 pruebas de taller Querétaro/Puebla/Acapulco, TypeScript y verificación de sintaxis. Chromium de 390 y 1366 px en la ruta local real de IGF Forecast con datos sintéticos de la vista, cargador real y PostgreSQL aislado (PGlite). Se verificaron selector de planta, confirmación, avisos, guardado y no duplicación. No se probó una sesión de producción.
- No se cambió el funcionamiento de Puebla o Acapulco ni se aplicó la migración.
