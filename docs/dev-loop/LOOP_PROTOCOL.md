# LOOP_PROTOCOL.md — desarrollo supervisado de Director IA

**Versión:** 0.1  
**Estado:** VIGENTE  
**Tipo:** Protocolo de ejecución (no es contrato arquitectónico de Director IA)

Este documento no redefine la Constitución ni ningún contrato en `docs/director-ia/`.  
En conflicto con esos contratos, prevalecen ellos. El implementador hace **STOP** y reporta.

---

## 1. Propósito

Cursor ejecuta **una** tarea autorizada por un humano.  
No interpreta silenciosamente la arquitectura.  
No aprueba cambios.  
No encadena trabajo.  
No fusiona a `main`.

`origin/main` es la referencia integrada.  
Los contratos congelados o aprobados en `docs/director-ia/` son autoridad.  
Una tarea no autoriza la siguiente.

---

## 2. Roles

| Rol | Quién | Puede | No puede |
|-----|-------|-------|----------|
| **Autoridad** | Constitución + contratos propietarios + índice + `origin/main` | Definir qué es válido | Ser reinterpretada por un agente |
| **HUMAN_APPROVER** | Humano | Autorizar tarea (G1), gates G2–G8, merge a `main`, cerrar/rechazar, autorizar la siguiente | Delegar aprobación al agente |
| **Implementador** | Cursor / agente | Ejecutar una `CURRENT_TASK` en `AUTHORIZED`, o en `IN_PROGRESS` solo si hereda G1 intacto; escribir reporte; STOP | Aprobar gates; fusionar a `main`; redefinir contratos; encadenar tareas; tratar `IN_PROGRESS` como autorización independiente |

Ningún agente ocupa el rol HUMAN_APPROVER.

---

## 3. Archivos del loop

| Archivo | Mutabilidad | Función |
|---------|-------------|---------|
| `AGENTS.md` | Solo con Gate G6 | Reglas siempre visibles del implementador |
| `docs/dev-loop/LOOP_PROTOCOL.md` | Solo con Gate G6 | Este procedimiento |
| `docs/dev-loop/CURRENT_TASK.md` | Sí — solo la tarea vigente | Autorización de **esta** ejecución |
| `docs/dev-loop/TASK_TEMPLATE.md` | Solo con Gate G6 | Schema para proponer/autorizar |
| `docs/dev-loop/reports/README.md` | Solo con Gate G6 | Convención de reportes (meta-protocolo) |
| `docs/dev-loop/reports/<task_id>.md` | Append-only | Auditoría; un archivo por `task_id` |

`CURRENT_TASK.md` representa únicamente la tarea vigente.  
Los reportes no constituyen autorización.

Contratos en `docs/director-ia/` permanecen **fuera de alcance** salvo gate humano específico (G2/G3) declarado en la tarea autorizada.

---

## 4. Máquina de estados

```
IDLE
  → (solo HUMAN_APPROVER) DRAFT
  → (solo HUMAN_APPROVER, Gate G1) AUTHORIZED
  → (implementador, una vez) IN_PROGRESS
  → DONE_PENDING_REVIEW | STOPPED | BLOCKED
  → (solo HUMAN_APPROVER) CLOSED | REJECTED
```

| Estado | Quién lo escribe | Significado |
|--------|------------------|-------------|
| `IDLE` | Humano (o bootstrap ya cerrado) | No hay trabajo. Implementador: solo lectura. |
| `DRAFT` | Solo humano | Propuesta. No ejecutable. |
| `AUTHORIZED` | Solo humano + `AUTHORIZED_BY_HUMAN` | Única autorización de ejecución. |
| `IN_PROGRESS` | Implementador, una vez, **solo** desde `AUTHORIZED` | Ejecución en curso. `max_attempts: 1`. **No** es autorización independiente. |
| `DONE_PENDING_REVIEW` | Implementador, al terminar con reporte | Fin de implementación. Espera revisión humana. |
| `STOPPED` | Implementador | Parada por contradicción, ambigüedad o violación de alcance. |
| `BLOCKED` | Implementador | Falta un gate o un dato que solo el humano puede dar. |
| `CLOSED` | Solo humano | Tarea aceptada. No abre la siguiente. |
| `REJECTED` | Solo humano | Tarea rechazada. |

### `IN_PROGRESS` no es autorización independiente

Una tarea en `IN_PROGRESS` solo es ejecutable si se cumplen **todas** estas condiciones:

- deriva de una transición previa `AUTHORIZED` → `IN_PROGRESS`;
- `authorized_by` sigue presente;
- `authorized_at` sigue presente;
- `human_authorization` conserva la autorización G1 válida;
- esos tres campos no fueron creados ni modificados por el implementador.

En la transición `AUTHORIZED` → `IN_PROGRESS` el implementador **solo** puede cambiar `status`. No puede crear, borrar ni modificar `authorized_by`, `authorized_at` ni `human_authorization`.

Escribir manualmente `status: IN_PROGRESS` **no** evade G1.  
Si falta cualquiera de las condiciones: `BLOCKED` + reporte + STOP.

### Transiciones prohibidas al implementador

- Cualquier transición hacia `AUTHORIZED`, `CLOSED` o `REJECTED`.
- `IDLE` → `DRAFT` (el agente puede **proponer** texto con `TASK_TEMPLATE.md`, no cambiar el estado vigente a `DRAFT`/`AUTHORIZED`).
- Escribir `IN_PROGRESS` sin partir de `AUTHORIZED` con G1 intacto.
- Reabrir `CLOSED` / `REJECTED`.
- Pasar de `DONE_PENDING_REVIEW` a una nueva tarea.

---

## 5. Anti-loop

- `max_attempts: 1`. Un intento por tarea autorizada.
- Al escribir el reporte, el implementador deja `DONE_PENDING_REVIEW`, `STOPPED` o `BLOCKED` y **termina el turno**.
- Prohibido: watcher, `/loop`, agentes secundarios para “continuar”, “seguir hasta que pase CI/tests”, auto-merge, auto-push a `main`.
- Un `DONE` / `DONE_PENDING_REVIEW` **no** autoriza otra tarea.
- El campo `next_task_proposed` del reporte es propuesta, no autorización.

Si `CURRENT_TASK.md` no existe, o `status` no es `AUTHORIZED`, o es `IN_PROGRESS` sin las condiciones de G1 heredado: **solo lectura**. Si `IN_PROGRESS` aparece sin esas condiciones: `BLOCKED` + reporte + STOP.

---

## 6. Schema de CURRENT_TASK (mínimo)

Campos obligatorios:

- `task_id`
- `status`
- `authorized_by` — vacío salvo G1 humano
- `authorized_at` — vacío salvo G1 humano; timestamp ISO 8601 con zona horaria. Ejemplo **solo de formato** (no es autorización): `2026-08-12T23:15:00-06:00`
- `human_authorization` — vacío, o exactamente una línea `AUTHORIZED_BY_HUMAN: <nombre> <YYYY-MM-DD>` escrita por humano
- `objective` — una frase
- `in_scope` — rutas permitidas
- `out_of_scope` — rutas y temas prohibidos
- `contracts_in_force` — docs a obedecer, no a reescribir
- `allowed_actions`
- `forbidden_actions`
- `max_attempts` — siempre `1` en v0.1
- `result_report_path`

El implementador **no** escribe `AUTHORIZED_BY_HUMAN`.  
El implementador **no** pone `status: AUTHORIZED`.  
El implementador **no** crea, borra ni modifica `authorized_by`, `authorized_at` ni `human_authorization`.

Plantilla: `docs/dev-loop/TASK_TEMPLATE.md`.

---

## 7. Gates G1–G8

Ningún agente aprueba un gate. Ningún agente escribe `APPROVED` ni `AUTHORIZED_BY_HUMAN`.

| Gate | Qué autoriza solo el humano | Si falta |
|------|-----------------------------|----------|
| **G1** Autorizar tarea | `status: AUTHORIZED` + `AUTHORIZED_BY_HUMAN` | No implementar |
| **G2** Cambio arquitectónico | Editar archivos existentes en `docs/director-ia/` | STOP |
| **G3** Nuevo contrato | Crear docs de arquitectura (p. ej. `06-CHANNEL-PROJECTION`) | STOP |
| **G4** Integración | Push o merge a `main` | Prohibido |
| **G5** Siguiente tarea | Cerrar la vigente y autorizar otra con nuevo G1 | STOP al terminar el reporte |
| **G6** Meta-protocolo | Cambiar `AGENTS.md`, `LOOP_PROTOCOL.md`, `TASK_TEMPLATE.md` o `docs/dev-loop/reports/README.md` | STOP |
| **G7** Ambigüedad o contradicción contractual | Continuar tras resolución humana explícita | STOP y reportar |
| **G8** Calibración / materialidad / firma | Fijar `k`/`wi`, ruleset de materialidad, firma IES | STOP |

G4 nunca lo ejecuta el agente. El merge a `main` es exclusivamente humano en GitHub.

---

## 8. Conducta del implementador

1. Confirmar rama de trabajo ≠ `main` (salvo lectura de la referencia integrada).
2. Leer `CURRENT_TASK.md`.
3. Si no está `AUTHORIZED`: no editar, salvo `IN_PROGRESS` que cumpla G1 heredado (si no cumple: `BLOCKED` + reporte + STOP).
4. Pasar a `IN_PROGRESS` una sola vez si estaba `AUTHORIZED`, cambiando **solo** `status`. No tocar `authorized_by`, `authorized_at` ni `human_authorization`.
5. Leer `contracts_in_force`. Obedecerlos. No “mejorarlos”.
6. Tocar solo `in_scope`.
7. Ante duda contractual: `STOPPED` o `BLOCKED`, reporte, STOP.
8. Escribir un reporte en `docs/dev-loop/reports/` según `reports/README.md`.
9. Dejar `DONE_PENDING_REVIEW` / `STOPPED` / `BLOCKED`. Terminar.
10. No commit ni push salvo que la tarea autorizada lo liste en `allowed_actions`. Nunca a `main`.

---

## 9. Reportes

- Un archivo por `task_id`.
- Append-only una vez el ciclo de implementación cerró (`DONE_PENDING_REVIEW`, `STOPPED`, `BLOCKED`).
- Se versionan en Git.
- No contienen secretos, tokens ni credenciales.
- No autorizan trabajo posterior.

Campos mínimos del reporte:

- `task_id`
- `outcome`: `DONE` | `STOPPED` | `BLOCKED`
- archivos tocados / no tocados
- contratos consultados
- contratos modificados (vacío salvo G2/G3 humano)
- contradicciones o ambigüedades (cita documental)
- desvíos respecto a `CURRENT_TASK`
- `next_task_proposed` (no autorizado)
- `secrets_check`
- `human_decision_needed`

---

## 10. Secretos

Prohibido almacenar secretos, tokens, credenciales, claves API o `.env` en cualquier archivo del loop, reportes, commits o prompts copiados al repo.

---

## 11. Relación con Director IA

Este protocolo **no** implementa Director IA.  
**No** diseña `06-CHANNEL-PROJECTION` salvo G3 humano.  
Capabilities / Planner / Tool Orchestrator no son el pipeline constitucional N1–N5.

---

## Control documental

| Campo | Valor |
|-------|--------|
| Documento | `docs/dev-loop/LOOP_PROTOCOL.md` |
| Versión | 0.1 |
| Estado | VIGENTE |
| Aprobación de gates | Exclusiva de HUMAN_APPROVER |
| Auto-merge / auto-push a main | Prohibidos |
| Loop infinito | Prohibido |
