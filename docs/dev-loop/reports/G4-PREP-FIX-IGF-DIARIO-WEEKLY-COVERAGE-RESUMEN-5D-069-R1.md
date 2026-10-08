# G4-PREP-FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1

```yaml
task_id: "G4-PREP-FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md"
files_not_touched:
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Squash and merge queda reservado al HUMAN_APPROVER."
main_reference_sha: "f50e61356325b13be289beb4e6354b52634f5eee"
product_sha: "be14171adbe9fd1d55b59a5dee22eea3d1c616c5"
implementation_final_sha: "493e2b6387f1b71006eeaaf89a9a9132b57a9d90"
branch: "fix/igf-diario-weekly-coverage-resumen-5d-069-r1"
before_g4:
  ahead: 2
  behind: 0
merge_base: "f50e61356325b13be289beb4e6354b52634f5eee"
pruebas:
  - "93/93"
  - "node --check server.js"
  - "frontend build exit 0"
  - "git diff --check limpio"
producto:
  - "San Luis cobertura semanal corregida"
  - "RESUMEN como hoja #1"
  - "gráfica PNG embebida"
  - "5D ligado a semana domingo-sábado"
  - "week_anchor + summary_metric"
produccion_pendiente: true
merge_autorizado: false
deploy_autorizado: false
pr: "https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/115"
preferred_merge: "Squash and merge"
merge_executor: "HUMAN_APPROVER_ONLY"
```

| Campo | Valor |
|---|---|
| main | f50e61356325b13be289beb4e6354b52634f5eee |
| rama | fix/igf-diario-weekly-coverage-resumen-5d-069-r1 |
| producto | be14171adbe9fd1d55b59a5dee22eea3d1c616c5 |
| final antes de este commit | 493e2b6387f1b71006eeaaf89a9a9132b57a9d90 |
| ahead / behind | 2 / 0 |
| merge base | f50e61356325b13be289beb4e6354b52634f5eee |
| PR | https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/115 |
| merge | no |
| deploy | no |
| producción pendiente | sí |

`git rev-parse origin/main` dio `f50e61356325b13be289beb4e6354b52634f5eee`. `HEAD` dio `493e2b6387f1b71006eeaaf89a9a9132b57a9d90`. `git rev-list --left-right --count origin/main...HEAD` dio `0 2`. `be14171adbe9fd1d55b59a5dee22eea3d1c616c5` es ancestro de HEAD. Entre el producto y `493e2b63` solo cambian `docs/dev-loop/CURRENT_TASK.md` y el reporte de FIX 069-R1. `git diff --check origin/main...HEAD` quedó limpio.

## Producto ya integrado en la rama

San Luis deja de perder la semana cuando el domingo no tiene venta. El fixture 04 null, 05 16,585, 06 19,286, 07 24,210, 08 30,260, 09 22,960 y 10 29,730 suma 143,031 kg. Los ponderados usan días con venta positiva y no convierten null en cero. El export individual abre con RESUMEN como hoja 1, tabla semanal y gráfica PNG embebida. El rango 5D usa los primeros cinco días de la semana domingo-sábado seleccionada. `week_anchor` y `summary_metric` viajan con esa semana.

## Pruebas ya registradas

93/93. `node --check server.js` correcto. Build del frontend con exit 0. `git diff --check` limpio.

## PR

https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/115

Base `main`. Head `fix/igf-diario-weekly-coverage-resumen-5d-069-r1`. Preferencia Squash and merge. Ejecutor HUMAN_APPROVER_ONLY. Auto-merge no habilitado.

NO MERGE. NO DEPLOY.
