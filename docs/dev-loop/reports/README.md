# Reportes del Loop v0.2

Un reporte por `task_id`. Se versionan en Git.  
Un reporte **nunca** autoriza trabajo posterior.

## Convención de nombres

```
docs/dev-loop/reports/<task_id>.md
```

Ejemplo: `docs/dev-loop/reports/TASK-20260812-001.md`.

`task_id` = el de `CURRENT_TASK.md`. Un `task_id`, un archivo.

## Append-only

Cuando el implementador deja la tarea en `DONE_PENDING_REVIEW`, `STOPPED` o `BLOCKED`, el reporte de esa ejecución se considera **cerrado**.

Prohibido reescribir un reporte cerrado para alterar el resultado.  
Correcciones: nota humana posterior al final del mismo archivo, o un archivo nuevo con `task_id` distinto autorizado por G1.

## Contenido prohibido

- Secretos, tokens, credenciales, claves API, `.env`, passwords.
- Autorización de la siguiente tarea.
- Texto `AUTHORIZED_BY_HUMAN` inventado por el agente.
- Transcripciones, IDs o enlaces de conversaciones privadas. En vía chat, registrar sólo la atestación no privada definida en LOOP §4 bis.

## Relación con CURRENT_TASK

`CURRENT_TASK.md` documenta el alcance y la vía vigente de G1. La autorización es humana: por Git, o sólo para dashboard ordinario, por aprobación autenticada verificada según LOOP §4 bis.  
El reporte es evidencia de lo ocurrido. No sustituye G1. No abre G5.
