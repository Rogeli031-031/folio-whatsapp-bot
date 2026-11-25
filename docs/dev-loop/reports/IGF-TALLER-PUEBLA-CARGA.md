# IGF-TALLER-PUEBLA-CARGA

```yaml
task_id: IGF-TALLER-PUEBLA-CARGA
outcome: DONE
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/igf-puebla-taller-xlsx.js
  - lib/igf-puebla-taller-upload.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/20261125_igf_taller_diario_puebla.sql
  - test/igf-puebla-taller-xlsx.test.js
  - test/igf-puebla-taller-upload.test.js
  - docs/dev-loop/reports/IGF-TALLER-PUEBLA-CARGA.md
files_not_touched:
  - lib/igf-acapulco-taller-xlsx.js
  - lib/igf-acapulco-taller-upload.js
  - sql/027_igf_taller_diario_acapulco.sql
  - frontend-dashboard/components/DashboardIgfDiario.tsx
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions:
  - "La fecha del nombre de la hoja puede discrepar de la celda de corte; se muestran ambas y se requiere confirmar la fecha efectiva. No se interpreta el valor calculado de días como válido si falta la fecha de ingreso."
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Revisar el PR borrador. Antes de fusionar o publicar, autorizar por separado la migración y el acceso explícito de las cuentas de Puebla por el responsable de base de datos. No se agregó ninguna cuenta ni se ejecutó SQL en producción."
```

- La ruta de Puebla tiene almacenamiento y lista de operadores separados; Acapulco conserva sus rutas y datos. No se modificaron exportación, cálculos ni folios.
- El lector toma solo la hoja visible, no ejecuta fórmulas y admite resultados escalares guardados en campos acotados. El original incluye una referencia CID inerte de imagen en un dibujo. ExcelJS no la resuelve; siguen rechazados enlaces a la web, partes activas y libros ambiguos.
- La confirmación liga cuenta y archivo, requiere una fecha explícita y guarda en una única transacción; la misma fecha y los mismos bytes no duplican la revisión. Filas de una misma unidad no se descartan.
- Pruebas: 15/15 casos Puebla/Acapulco, migración en PostgreSQL aislado (PGlite), TypeScript sin emitir y sintaxis del backend. En Chromium, a 390 y 1366 px, se ejercitó la pantalla local de IGF Forecast con datos sintéticos de la vista y el cargador real conectado a PGlite. Con el Excel original en privado, vio seis registros de cinco unidades, ambas reparaciones de T-16, aviso de fechas, bloqueo sin confirmación, guardado y reenvío sin duplicación. Verificados también la ocultación en otra planta, en modo Forecast y cuando el permiso no existe.
- No se probó el login de producción ni se tocaron bases remotas. No se adjuntó al repositorio el libro original.
