# Reporte — ARCH-EB-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-EB-PHYSICAL-DECISIONS-001"
outcome: "BLOCKED"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - "lib/"
  - "test/"
  - "código productivo"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "LOOP_PROTOCOL.md §8.1 y AGENTS.md exigen rama de trabajo ≠ main (salvo lectura de origin/main). Al iniciar, git branch --show-current = main."
  - "allowed_actions de CURRENT_TASK no incluye cambiar de rama. El implementador no puede satisfacer §8.1 sin salir de allowed_actions."
deviations_from_current_task:
  - "D1–D15 no se respondieron: parada en la comprobación de rama, antes de auditar contracts_in_force de Evidence Builder."
next_task_proposed: "Misma auditoría ARCH-EB-PHYSICAL-DECISIONS en una rama de trabajo ≠ main, con G1 humano nuevo. Esta línea no autoriza trabajo ni IMPL-EB-001."
secrets_check: "none"
human_decision_needed:
  - "Crear o checkout de una rama de trabajo ≠ main. El implementador no puede cambiar de rama en esta tarea."
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED de esta ejecución BLOCKED."
  - "Si se desea la auditoría D1–D15, autorizar de nuevo G1 ya situada en rama de trabajo."
  - "G2 permanece PENDING; no se autoaprobó. Tampoco se evaluó si D15 exige G2, porque la auditoría no se ejecutó."
```

## Ejecución

- Rama al ejecutar: `main`.
- G1 leído: `authorized_by`, `authorized_at` y `human_authorization` presentes; no creados ni modificados por el implementador.
- G2 leído: `PENDING` (no usado; no se editó `docs/director-ia/`).
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → bloqueo por rama `main` → `BLOCKED` (solo `status`).
- `max_attempts: 1`. Sin auditoría D1–D15. Sin runtime. Sin calibración. Sin IMPL-EB-001.
- Sin commit. Sin push. Sin merge. Sin cambio de rama. Sin encadenar tarea.

## Motivo de BLOCKED

El procedimiento vigente exige confirmar rama de trabajo distinta de `main` antes de editar. La excepción es solo lectura de `origin/main`.

Esta tarea autoriza escribir `CURRENT_TASK.md` y el reporte, y no lista el cambio de rama en `allowed_actions`. Ejecutar la auditoría completa sobre `main` contradice `LOOP_PROTOCOL.md` §8.1 / `AGENTS.md`. Cambiar de rama no está permitido.

No se “resuelve con criterio”. No se implementó Evidence Builder. No se modificaron contratos ni código.

## Verificaciones

- `docs/director-ia/`, `server.js`, `package.json`, `lib/`, `test/`: no modificados.
- `git diff --check` se ejecuta al cerrar esta parada.
