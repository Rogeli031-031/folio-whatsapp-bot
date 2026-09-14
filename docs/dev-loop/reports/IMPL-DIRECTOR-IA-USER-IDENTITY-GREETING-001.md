# IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001

```yaml
task_id: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001"
outcome: "DONE"
mode: "IMPL"
implementation: true
code_changes: true
test_changes: true
docs_director_ia_changes: false
reference_main: "eb03e794"
source_audit: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"
audit_commit: "d31fe03b"
branch: "implementation/director-ia-user-identity-greeting-001"
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resultado

**DONE_PENDING_REVIEW.** El saludo simple ya no dice `Hola. Estoy en Acapulco. ¿Qué quieres revisar?`.

Usa exclusivamente `req.dashboardAuth.actor_id` → `public.usuarios.nombre_persona`. No hay título. No hay hardcode de persona. La planta no es identidad.

## 2. Baseline

| Prompt | Antes (`origin/main` `eb03e794`) |
|--------|----------------------------------|
| `hola` + planta Acapulco | `Hola. Estoy en Acapulco. ¿Qué quieres revisar?` |
| `Buenos días` | Igual (sin eco, sin nombre) |
| `buenas tardes` / `buenas noches` | Igual |
| Sin planta label | `Hola. ¿Qué quieres revisar?` |

Fuente del baseline: `buildNeutralGreeting(plantLabel)` en CEL + early-return de `askDirectorIa`. Evidencia: auditoría `d31fe03b`.

## 3. Fuente exacta de identidad

```
JWT verificado
  → req.dashboardAuth.actor_id
  → SELECT nombre_persona FROM public.usuarios WHERE id = $1 LIMIT 1
  → sanitize (trim, length ≥ 2)
```

Helper: `lib/director-ia-authenticated-user.js`

| Se usa | No se usa |
|--------|-----------|
| `dashboardAuth.actor_id` | `req.user` / `req.dashboardUser` |
| `usuarios.nombre_persona` | `usuarios.nombre` (puesto) |
| | JWT `actor_nombre`, `role`, email, teléfono |
| | `body.planta_nombre`, memoria, `conversation_state` |

No existe campo de título. **TITLE_AVAILABLE = NOT_AVAILABLE.** No se dice “Ingeniero”.

Lookup fallido o nombre vacío: saludo sin vocativo. No 500.

## 4. Función / helper modificado

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-authenticated-user.js` | Nuevo. `resolveActorIdFromAuth`, `loadNombrePersonaByActorId`, `resolveGreetingIdentity`, `classifyGreetingKind`, `buildIdentityGreeting` |
| `lib/director-ia-chat.js` | `classifyConversationalIntent` → `greeting_kind`. Smalltalk carga identidad. Help sigue resolviendo planta. |
| `lib/director-ia-conversational-executive-layer.js` | `buildNeutralGreeting` deja de interpolar planta; delega al helper de identidad |

Auth middleware, permisos, memoria persistente y schema: **sin cambios**.

## 5. Manejo de fallo

`loadNombrePersonaByActorId` captura error de `pool.query` y devuelve `null`.  
Sin `actor_id`, sin pool o fila vacía → `nombre_persona: null` → `Hola. ¿En qué te ayudo?` (o el eco del utterance).  
El chat no se corta.

## 6. Aislamiento multiusuario

- Cada POST usa el `actor_id` de **esa** request.
- El SQL filtra `id = $1`. No hay cache de módulo.
- Memoria (`usuario:{id}`) no se lee en smalltalk (`hola` es `kind: none`).
- Usuario A no puede recibir el nombre de B aunque el store tenga un pendiente de B.

## 7. Ejemplos antes / después

| Caso | Antes | Después |
|------|-------|---------|
| `hola` + `nombre_persona=Luis Zaragoza` + planta Acapulco | `Hola. Estoy en Acapulco. ¿Qué quieres revisar?` | `Hola, Luis Zaragoza. ¿En qué te ayudo?` |
| `Buenos días` + mismo nombre | Mismo string con Acapulco | `Buenos días, Luis Zaragoza. ¿En qué te ayudo?` |
| `buenas tardes` | Acapulco | `Buenas tardes, Luis Zaragoza. ¿En qué te ayudo?` |
| `buenas noches` | Acapulco | `Buenas noches, Luis Zaragoza. ¿En qué te ayudo?` |
| `hola` sin nombre | Acapulco | `Hola. ¿En qué te ayudo?` |
| Lookup DB falla | (no aplicaba) | `Hola. ¿En qué te ayudo?` |
| `ayuda` | Help con planta | Help con planta (scope de trabajo; no “Estoy en”) |
| `¿Cómo vamos?` | EXECUTIVE_STATUS | Sin cambio de ruta |

`hola` no se convierte en buenos días por reloj. `qué tal` / `saludos` ecoan como `Hola`.

## 8. Tests

Archivo nuevo: `test/director-ia-user-identity-greeting.test.js` (23).

| # | Caso | Resultado |
|---|------|-----------|
| 1 | hola + nombre | PASS |
| 2 | buenos días + nombre | PASS |
| 3 | buenas tardes + nombre | PASS |
| 4 | buenas noches + nombre | PASS |
| 5 | sin nombre | PASS |
| 6 | lookup fallido | PASS |
| 7 | dos `actor_id` | PASS |
| 8 | memoria no cruza | PASS |
| 9 | planta no en `hola` | PASS |
| 10 | role no es trato | PASS |
| 11 | puesto / JWT display no sustituye | PASS |
| 12 | help/thanks | PASS |
| 13 | consulta operativa ≠ saludo | PASS |
| 14 | EXECUTIVE_STATUS | PASS (`test/director-ia-conversational-executive-status.test.js` completo) |
| 15 | DIAGNOSIS | PASS (`test/director-ia-executive-diagnosis-observations-risks.test.js` completo) |
| 16 | PERFORMANCE (venta/meta no es smalltalk) + routing IGF existente | PASS comportamiento |

También: `scripts/test-director-ia-smalltalk.js`.

Nota: `test/director-ia-rentabilidad-executive-routing.test.js` **061** es un candado de *superficie de archivos* de otro slice. Detecta que se tocaron CEL / smalltalk / tests de status. No es regresión de routing IGF/venta. No se modificó planner ni composer de PERFORMANCE.

## 9. Diff conceptual

```
ANTES
  classifyConversationalIntent("hola") → smalltalk
  resolvePlantaLabelForChat → "Acapulco"
  buildNeutralGreeting("Acapulco") → "Hola. Estoy en Acapulco. ¿Qué quieres revisar?"

DESPUÉS
  classifyConversationalIntent("hola") → { smalltalk, greeting_kind: hola }
  resolveGreetingIdentity(req.dashboardAuth.actor_id)
  buildIdentityGreeting("hola", nombre_persona|null)
  → "Hola, {nombre}. ¿En qué te ayudo?" | "Hola. ¿En qué te ayudo?"
```

Help sigue pidiendo label de planta. Consultas operativas siguen llevando `planta_id` / `planta_nombre` en el body.

## 10. Contratos

Consultados: auditoría de identidad, `CURRENT_TASK` autorizado, `LOOP_PROTOCOL`.  
`docs/director-ia/`: no modificados.

Conflicto menor auditoría vs tarea: la auditoría proponía `Hola, buen día, {nombre}`. La tarea autorizada fija `Hola, {nombre_persona}`. Se implementó la tarea autorizada.

## 11. Archivos

Tocados:

- `lib/director-ia-authenticated-user.js` (nuevo)
- `lib/director-ia-chat.js`
- `lib/director-ia-conversational-executive-layer.js` (`buildNeutralGreeting`)
- `test/director-ia-user-identity-greeting.test.js` (nuevo)
- `test/director-ia-conversational-executive-status.test.js` (aserciones de saludo)
- `scripts/test-director-ia-smalltalk.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md`

No tocados: schema, `dashboard-auth.js`, memoria persistente, frontend, EXECUTIVE_STATUS/DIAGNOSIS/PERFORMANCE composers.

## 12. Desvíos / secretos / decisión humana

Desvíos: ninguno material respecto al contrato autorizado.  
`secrets_check`: none  
`human_decision_needed`: merge a `main` (G4 humano). Este DONE no autoriza Taller ni la siguiente tarea.
