# G6-MERGE-DASHBOARD-POR-CHAT

```yaml
task_id: G6-MERGE-DASHBOARD-POR-CHAT
outcome: DONE
files_touched:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/TASK_TEMPLATE.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
  - docs/dev-loop/reports/G6-MERGE-DASHBOARD-POR-CHAT.md
files_not_touched:
  - "docs/director-ia/ y código de la aplicación"
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: none
human_decision_needed:
  - "Revisar y fusionar manualmente este PR G6 según el protocolo aún vigente."
```

G1 y G6 se verificaron en el commit humano `1449af9973b482bd1af8b405fd239a92bc70aa2e`. El cambio distingue la aprobación de G4, que sigue reservada a Luis, de la ejecución de un merge ordinario por Mía después de aprobación privada autenticada para el PR y el SHA exactos. Se conservan los controles de GitHub, el STOP si no son verificables y el merge humano de este G6. No hay auto-merge, cambios en reglas de protección ni push directo a main.

Se cotejaron el contenido y las rutas de la rama contra la base, y se comprobaron los campos humanos y la separación de G1 y G4. No se ejecutaron pruebas de runtime ni un merge de ensayo: el cambio es documental. La disponibilidad de protecciones e integración se comprobará en cada PR elegible.
