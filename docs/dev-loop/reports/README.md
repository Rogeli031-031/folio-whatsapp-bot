# Reportes del Loop v0.3

Un reporte por `task_id`. Se versionan en Git.  
Un reporte **nunca** autoriza trabajo posterior.

## Convención de nombres

```
docs/dev-loop/reports/<task_id>.md
```

Ejemplo: `docs/dev-loop/reports/TASK-20260812-001.md`.

`task_id` = el de `CURRENT_TASK.md` por la vía Git, o el de la propuesta privada verificada según §4 bis por la vía chat. Un `task_id`, un archivo.

## Append-only

Cuando el implementador deja la tarea en `DONE_PENDING_REVIEW`, `STOPPED` o `BLOCKED`, el reporte de esa ejecución se considera **cerrado**.

Prohibido reescribir un reporte cerrado para alterar el resultado.  
Correcciones: nota humana posterior al final del mismo archivo, o un archivo nuevo con `task_id` distinto autorizado por G1.

## Contenido prohibido

- Secretos, tokens, credenciales, claves API, `.env`, passwords.
- Autorización de la siguiente tarea.
- Texto `AUTHORIZED_BY_HUMAN` inventado por el agente.
- Transcripciones, IDs o enlaces de conversaciones privadas. En vía chat, registrar sólo la atestación no privada definida en LOOP §4 bis y, cuando aplique, la evidencia mínima de §4 ter.

## Relación con CURRENT_TASK

`CURRENT_TASK.md` documenta la autorización Git. Para Dashboard ordinario por §4 bis, el reporte documenta alcance, estado, dato no privado de la atestación, archivos y pruebas, sin editar `CURRENT_TASK.md`. La autorización sigue siendo humana y se verifica en origen.  
El reporte es evidencia de lo ocurrido. No sustituye G1. No abre G5.


## Evidencia posterior de G4 ordinario (§4 ter)

Registrar como evidencia complementaria en el PR, o al final del reporte sin reescribir contenido cerrado: PR, HEAD aprobado, base verificada, fecha y método de aprobación, recibo opaco (sin citas, enlaces o IDs privados), resultado de las protecciones y checks, SHA integrado y estado de la publicación. Si el merge no se hizo, registrar el bloqueo comprobado, no inferir aprobación. No es una autorización de G5.
