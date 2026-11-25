# LOOP_PROTOCOL.md — desarrollo supervisado de Director IA

**Versión:** 0.3  
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
No fusiona a `main`, salvo la ejecución por Mía de un merge ordinario del Dashboard expresamente autorizado en §4 ter.

`origin/main` es la referencia integrada.  
Los contratos congelados o aprobados en `docs/director-ia/` son autoridad.  
Una tarea no autoriza la siguiente.

---

## 2. Roles

| Rol | Quién | Puede | No puede |
|-----|-------|-------|----------|
| **Autoridad** | Constitución + contratos propietarios + índice + `origin/main` | Definir qué es válido | Ser reinterpretada por un agente |
| **HUMAN_APPROVER** | Humano | Autorizar tarea (G1), gates G2–G8, decidir el merge a `main`, cerrar/rechazar, autorizar la siguiente | Delegar aprobación al agente |
| **Implementador** | Cursor / agente | Ejecutar una tarea bajo G1 vigente por una vía de §§ 4 o 4 bis; escribir reporte; STOP. Solo Mía puede ejecutar un merge con G4 ordinario verificado según §4 ter | Aprobar gates; fusionar fuera de §4 ter; hacer push directo a `main`; redefinir contratos; encadenar tareas; tratar `IN_PROGRESS` como autorización independiente |

Ningún agente ocupa el rol HUMAN_APPROVER.

---

## 3. Archivos del loop

| Archivo | Mutabilidad | Función |
|---------|-------------|---------|
| `AGENTS.md` | Solo con Gate G6 | Reglas siempre visibles del implementador |
| `docs/dev-loop/LOOP_PROTOCOL.md` | Solo con Gate G6 | Este procedimiento |
| `docs/dev-loop/CURRENT_TASK.md` | Sí — solo la tarea vigente por Git | Alcance y registro de G1 de **esta** ejecución por Git |
| `docs/dev-loop/TASK_TEMPLATE.md` | Solo con Gate G6 | Schema para proponer/autorizar |
| `docs/dev-loop/reports/README.md` | Solo con Gate G6 | Convención de reportes (meta-protocolo) |
| `docs/dev-loop/reports/<task_id>.md` | Append-only | Auditoría; un archivo por `task_id` |

`CURRENT_TASK.md` representa únicamente la tarea vigente por Git. No se reemplaza para tareas ordinarias autorizadas por chat.  
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
| `AUTHORIZED` | Solo humano + `AUTHORIZED_BY_HUMAN` | Autoriza la ejecución por la vía Git. |
| `IN_PROGRESS` | Implementador, una vez, desde `AUTHORIZED` por Git o bajo §4 bis | Ejecución en curso. `max_attempts: 1`. **No** es autorización independiente. |
| `DONE_PENDING_REVIEW` | Implementador, al terminar con reporte | Fin de implementación. Espera revisión humana. |
| `STOPPED` | Implementador | Parada por contradicción, ambigüedad o violación de alcance. |
| `BLOCKED` | Implementador | Falta un gate o un dato que solo el humano puede dar. |
| `CLOSED` | Solo humano | Tarea aceptada. No abre la siguiente. |
| `REJECTED` | Solo humano | Tarea rechazada. |

### `IN_PROGRESS` no es autorización independiente

Por la vía Git, una tarea en `IN_PROGRESS` solo es ejecutable si se cumplen **todas** estas condiciones:

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
- Escribir `IN_PROGRESS` sin G1 válido por una de las dos vías.
- Reabrir `CLOSED` / `REJECTED`.
- Pasar de `DONE_PENDING_REVIEW` a una nueva tarea.

---

## 4 bis. Gate G1 ordinario por chat privado autenticado

La aprobación es del HUMAN_APPROVER, no del agente. Vía alternativa sólo para un cambio normal y acotado del dashboard. Autoriza implementar y probar fuera de producción, y abrir un PR en una rama no-main. **No** autoriza migraciones, DDL, permisos, credenciales, datos o configuración de producción, despliegues, cambios de arquitectura/contratos ni G2–G8. Esas decisiones mantienen su vía vigente. G1 no autoriza el merge. G4 sigue siendo decisión humana; el merge asistido de un PR ordinario elegible requiere autorización separada conforme a §4 ter.

Antes de escribir, un verificador con acceso autorizado debe comprobar en el origen autenticado que la cuenta emisora corresponde al HUMAN_APPROVER del repositorio (no basta nombre visible) y que aprobó expresamente una sola propuesta con task_id, repositorio, rama, objetivo, rutas, alcance excluido y acciones. Capturas, citas, mensajes reenviados, terceros y afirmaciones ambiguas no cuentan. Si no se puede verificar esta relación, la aprobación exacta o que sigue vigente, usar la vía Git. Una revocación o cambio de alcance detiene la ejecución y requiere nueva aprobación.

En una rama dedicada sin otra tarea activa, registrar el alcance exacto y `IN_PROGRESS` una sola vez en el registro privado verificable con G1 vigente. No modificar `CURRENT_TASK.md` ni sus campos humanos. `IN_PROGRESS` sólo conserva continuidad si la evidencia sigue válida y el alcance coincide íntegramente. Registrar en el reporte de la tarea una sección separada `owner_chat_attestation` con estos campos y referenciar el reporte desde el PR:

- `method: verified_owner_chat`.
- `approved_at`: fecha y hora ISO 8601 con zona.
- `receipt_id`: identificador opaco aleatorio de un registro privado revisable por el HUMAN_APPROVER y sus verificadores autorizados.
- `scope_sha256`: SHA-256 de la propuesta canónica registrada privadamente al aprobar: JSON UTF-8 compacto, sin BOM, objeto con llaves ordenadas de forma recursiva, arrays en su orden original, con versión y los campos de alcance indicados arriba.

Antes de continuar y al abrir el PR, confrontar alcance y vigencia con el registro privado. Recibo y huella no sustituyen comprobación en el origen. En el PR/reporte incluir sólo evidencia no privada: método, fecha/hora, recibo opaco, huella, alcance y pruebas. Nunca copiar mensajes, vínculos ni IDs privados ni guardar secretos en Git. Si no existe capacidad de verificación y almacenamiento privado autorizado, no habilitar esta vía; esta disposición no instala herramientas ni cambia permisos.

## 4 ter. Gate G4: merge asistido de cambios ordinarios del Dashboard

La decisión sigue siendo de Luis, verificado como HUMAN_APPROVER en el chat privado autenticado conforme a §4 bis. Autorizar la implementación por G1 no equivale a autorizar el merge. La excepción sólo permite que Mía ejecute **un merge manual por API**, no delega la decisión y no aplica a Cursor u otros implementadores. El protocolo vigente en `origin/main` manda; una propuesta de cambio al protocolo no puede autorizar su propio merge.

**Elegibilidad:** PR acotado al funcionamiento ordinario del Dashboard, con G1 vigente y pruebas fuera de producción. Quedan fuera el meta-protocolo, contratos y arquitectura, autenticación o permisos, credenciales, migraciones y DDL, cambios o escrituras de datos en producción, infraestructura, configuración de producción y despliegues manuales. La publicación automática que ya sigue al merge puede ocurrir y debe informarse antes de pedir G4.

1. Mostrar a Luis el repositorio, número y enlace del PR, SHA completo del commit final y referencia de base revisada, alcance, pruebas y resultado, riesgos y servicio que se publicará. Pedir aprobación expresa de ese PR y de ese SHA; la respuesta privada puede identificar ambos por referencia inequívoca a esa única propuesta. No aceptar capturas, mensajes reenviados, aprobaciones genéricas, anticipadas, revocadas o de terceros.
2. Justo antes de ejecutar, verificar autorización y vigencia, objetivo y rutas, PR abierto y listo para revisión, rama base `main`, SHA de la base revisada y SHA del HEAD aprobado sin cambios, checks y revisiones obligatorios satisfechos y protecciones de GitHub intactas. Si algo falta, cambió o no puede verificarse, detenerse. Un cambio de base o HEAD exige nueva revisión y G4. No desactivar ni omitir protecciones, ni usar privilegios de administrador para forzar el merge.
3. Ejecutar mediante la operación normal de merge del PR, con el SHA esperado del HEAD como precondición. Si la herramienta no admite esa precondición, si la protección vigente no garantiza integrar contra la base revisada sin quedar desactualizado o si GitHub rechaza, no usar push a `main`, auto-merge, una cola automática, otro mecanismo de omisión ni repetir la acción por cuenta propia. Si el resultado es incierto, consultar el estado antes de informar; no reintentar sin nueva decisión.
4. Registrar la aprobación y el resultado con la evidencia mínima de §9, verificar que se fusionó el commit aprobado y que el despliegue automático correspondiente quedó activo. Cuando sea posible, comprobar el punto de entrada usado por Luis. Informar cualquier punto no verificable; no reiniciar, desplegar manualmente ni revertir por cuenta propia.

## 5. Anti-loop

- `max_attempts: 1`. Un intento por tarea autorizada.
- Al escribir el reporte, el implementador deja `DONE_PENDING_REVIEW`, `STOPPED` o `BLOCKED` y **termina el turno**.
- Prohibido: watcher, `/loop`, agentes secundarios para “continuar”, “seguir hasta que pase CI/tests”, auto-merge, auto-push a `main`.
- Un `DONE` / `DONE_PENDING_REVIEW` **no** autoriza otra tarea.
- El campo `next_task_proposed` del reporte es propuesta, no autorización.

Sin G1 válido según §§ 4 o 4 bis: **solo lectura**. Si `IN_PROGRESS` aparece sin esas condiciones: `BLOCKED` + reporte + STOP.

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
| **G1** Autorizar tarea | Vía Git de §4 o, sólo para dashboard ordinario, aprobación autenticada de §4 bis | No implementar |
| **G2** Cambio arquitectónico | Editar archivos existentes en `docs/director-ia/` | STOP |
| **G3** Nuevo contrato | Crear docs de arquitectura (p. ej. `06-CHANNEL-PROJECTION`) | STOP |
| **G4** Integración | Decidir el merge a `main`; sólo para cambios ordinarios del Dashboard, autorizar la ejecución por Mía de un PR y commit exactos según §4 ter | Prohibido sin G4; el push directo a `main` siempre está prohibido |
| **G5** Siguiente tarea | Cerrar la vigente y autorizar otra con nuevo G1 | STOP al terminar el reporte |
| **G6** Meta-protocolo | Cambiar `AGENTS.md`, `LOOP_PROTOCOL.md`, `TASK_TEMPLATE.md` o `docs/dev-loop/reports/README.md` | STOP |
| **G7** Ambigüedad o contradicción contractual | Continuar tras resolución humana explícita | STOP y reportar |
| **G8** Calibración / materialidad / firma | Fijar `k`/`wi`, ruleset de materialidad, firma IES | STOP |

G4 nunca lo aprueba el agente. Fuera de §4 ter, el merge a `main` es exclusivamente humano en GitHub.

---

## 8. Conducta del implementador

1. Confirmar rama de trabajo ≠ `main` (salvo lectura de la referencia integrada).
2. Leer `CURRENT_TASK.md`; por chat ordinario, verificar la propuesta y el registro privado sin modificar `CURRENT_TASK.md`.
3. Verificar G1 conforme a §§ 4 o 4 bis; sin G1 vigente no editar.
4. Pasar a `IN_PROGRESS` una sola vez: por Git, cambiando **solo** `status`; por chat, registrar la atestación conforme a §4 bis. Nunca tocar `authorized_by`, `authorized_at` ni `human_authorization`.
5. Leer `contracts_in_force`. Obedecerlos. No “mejorarlos”.
6. Tocar solo `in_scope`.
7. Ante duda contractual: `STOPPED` o `BLOCKED`, reporte, STOP.
8. Escribir un reporte en `docs/dev-loop/reports/` según `reports/README.md`.
9. Dejar `DONE_PENDING_REVIEW` / `STOPPED` / `BLOCKED` en `CURRENT_TASK.md` por Git o en el registro de tarea por §4 bis. Terminar la implementación y esperar G4; no encadenar otra tarea.
10. No commit ni push salvo que la tarea autorizada lo liste en `allowed_actions`. Nunca push directo a `main`. El merge asistido posterior, si aplica, se rige únicamente por §4 ter.

---

## 9. Reportes

- Un archivo por `task_id`.
- Append-only una vez el ciclo de implementación cerró (`DONE_PENDING_REVIEW`, `STOPPED`, `BLOCKED`).
- Se versionan en Git.
- No contienen secretos, tokens ni credenciales.
- No autorizan trabajo posterior. Por §4 ter, anexar evidencia de integración por separado, sin reescribir el resultado de implementación ni publicar chats privados.

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
| Versión | 0.3 |
| Estado | VIGENTE |
| Aprobación de gates | Exclusiva de HUMAN_APPROVER |
| Auto-merge / auto-push a main | Prohibidos |
| Loop infinito | Prohibido |
