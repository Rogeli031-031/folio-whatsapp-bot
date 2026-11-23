task_id: IMPL-IGF-ACAPULCO-TALLER
status: DRAFT
objective: "Integrar al Excel IGF Diario de Acapulco la prueba aprobada de productividad, taller, folios y comentarios de seguimiento."
in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/dashboard-arr-forecast.js
  - lib/igf-acapulco-productividad.js
  - lib/igf-acapulco-productividad-model.js
  - lib/igf-acapulco-productividad-excel.js
  - lib/igf-acapulco-productividad-taller.js
  - test/igf-acapulco-productividad.test.js
  - test/igf-acapulco-productividad-taller.test.js
out_of_scope:
  - otras plantas, cambios a estaciones, datos de producción, migraciones y adjuntos privados
  - docs/director-ia/ y push o merge a main
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - implementar y probar en la rama autorizada; abrir PR para revisión humana
  - preservar litros, incluir pipas de taller con cero venta y distinguir días sin base evaluable
  - mostrar folios y comentarios, separando reparaciones actuales de folios ajenos a la falla
forbidden_actions:
  - modificar campos de autorización del humano ni aprobar gates
  - publicar sin fuente de taller verificable ni inferir fechas, depósitos o salidas
  - merge, auto-merge o despliegue directo por el implementador
max_attempts: 1
result_report_path: docs/dev-loop/reports/IMPL-IGF-ACAPULCO-TALLER.md
