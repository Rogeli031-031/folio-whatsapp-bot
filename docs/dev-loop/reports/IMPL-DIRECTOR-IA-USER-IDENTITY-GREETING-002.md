# IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-002

```yaml
task_id: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-002"
outcome: "DONE"
mode: "IMPL"
implementation: true
code_changes: true
schema_changes: false
reference_main: "02582512"
previous_commit: "c3125b82"
branch: "implementation/director-ia-user-identity-greeting-002"
historical_branch_merged: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. No autoriza deploy por este agente."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** Director IA saluda con `usuarios.nombre_persona` del `req.dashboardAuth.actor_id`. Si no hay nombre o falla el lookup, responde neutro y el chat continúa.

No se mergeó ni rebaseó `implementation/director-ia-user-identity-greeting-001`.

## 2. Diferencia entre rama vieja y main actual

`c3125b82` (14 sep) añadió el helper y cambió el saludo que usaba planta (`Estoy en {planta}`). Ese cambio no está en `origin/main` `02582512`.

El main actual ya incluye Expense Analytics, hojas anuales ARR y resolución webpack/exceljs. `askDirectorIa` y `buildNeutralGreeting` siguen existiendo, pero `director-ia-chat.js` y CEL crecieron. Por eso no se arrastró el diff histórico completo: solo se reaplicó la frontera de identidad.

## 3. Qué se reaplicó

| Pieza | Origen | Motivo |
|-------|--------|--------|
| `lib/director-ia-authenticated-user.js` | `c3125b82` | Sigue siendo la separación correcta: actor_id → `nombre_persona`, sin cache |
| Hook en `classifyConversationalIntent` + `askDirectorIa` | misma idea, sobre el chat actual | El punto de smalltalk no cambió de contrato |
| `buildNeutralGreeting` → `buildIdentityGreeting` | misma idea | Quita planta del saludo simple |
| Tests de identidad | referencia + Expense Analytics | Cobertura 1–16 |
| Ajustes smalltalk / CEL greeting | equivalentes al commit previo | Evitan regresiones que aún exigían planta |

No hizo falta otra integración: el main actual sigue resolviendo smalltalk antes de planner/CEL operativo.

## 4. Qué no se reaplicó y por qué

- Merge/rebase de la rama histórica completa: prohibido.
- `CURRENT_TASK.md` y reporte `...-001.md` de aquel commit: son de otra tarea.
- Cualquier otro archivo de esa rama no listado en `c3125b82`.
- Schema/`nombre_persona` column: ya existe; no se crea campo nuevo.
- Honoríficos / `preferred_salutation` / memoria relacional: fuera de alcance.

## 5. Fuente física de identidad

```
req.dashboardAuth.actor_id
  → SELECT nombre_persona FROM public.usuarios WHERE id = $1 LIMIT 1
```

No usa planta, memory, thread, role, `usuarios.nombre`, puesto ni claims de display del JWT.

## 6. Ejemplos y fallback

| Input | Con nombre | Sin nombre / error DB |
|-------|------------|------------------------|
| hola | Hola, Luis Zaragoza. ¿En qué te ayudo? | Hola. ¿En qué te ayudo? |
| buenos días | Buenos días, Luis Zaragoza. ¿En qué te ayudo? | Buenos días. ¿En qué te ayudo? |
| buenas tardes | Buenas tardes, Luis Zaragoza. ¿En qué te ayudo? | Buenas tardes. ¿En qué te ayudo? |
| buenas noches | Buenas noches, Luis Zaragoza. ¿En qué te ayudo? | Buenas noches. ¿En qué te ayudo? |

Lookup con excepción → `nombre_persona = null` → saludo neutro, `ok: true`.

## 7. Evidencia cross-user

Actor 10 → Ana Pérez. Actor 20 → Carlos Ruiz. Cada request consulta su `actor_id`. No hay cache global. Memoria de otro usuario no sustituye el nombre.

## 8. Pruebas

- `test/director-ia-user-identity-greeting.test.js` + expense core: 52/52
- `scripts/test-director-ia-smalltalk.js`: OK
- `test/director-ia-conversational-executive-status.test.js`: 55/55
- `test/director-ia-executive-diagnosis-observations-risks.test.js`: 19/19

Cubre: hola/días/tardes/noches, sin nombre, fallo DB, A/B, no planta, no role/puesto/Ingeniero, Expense Analytics, EXECUTIVE_STATUS, DIAGNOSIS, PERFORMANCE, smalltalk.

## 9. Diff conceptual

```
antes (main):
  hola → resolvePlantaLabel → "Hola. Estoy en Acapulco. ¿Qué quieres revisar?"

después:
  hola → resolveGreetingIdentity(actor_id)
       → "Hola, {nombre_persona}. ¿En qué te ayudo?"
       → o "Hola. ¿En qué te ayudo?"
  help sigue pudiendo mencionar planta; smalltalk no.
```

## 10. Contratos

`authorized_*` intactos. Sin merge, sin deploy, sin siguiente tarea.
