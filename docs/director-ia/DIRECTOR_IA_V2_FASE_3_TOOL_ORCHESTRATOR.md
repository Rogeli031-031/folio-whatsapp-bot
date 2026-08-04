# Director IA v2 — Fase 3: Tool Registry + Tool Orchestrator

## Objetivo

Traducir un plan del Planner (Fase 2) a un **plan de herramientas declarativo**, sin ejecutar consultas, sin DB, sin OpenAI y sin alterar routing ni respuestas del chat.

Esta fase solo declara qué tools harían falta y si serían ejecutables con los inputs dados.

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `lib/director-ia-tools.js` | Tool Registry + mapeo dominio → tool |
| `lib/director-ia-tool-orchestrator.js` | Construcción / validación del Tool Plan |
| `scripts/test-director-ia-tool-orchestrator.js` | Pruebas |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md` | Esta documentación |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-chat.js` | Tras el planner plan, construye `toolPlan` y lo registra solo con `directorIaDebug` |

## Tool Registry

Catálogo en `lib/director-ia-tools.js`. Cada herramienta declara:

`id`, `label`, `domain`, `status`, `accessMode`, `readOnly`, `executor` (string o `null`), `sourceFiles`, `limitations`, `requiredInputs`.

### Status

| Valor | Uso |
|-------|-----|
| `available` | Integrada en context habitual |
| `available_on_demand` | Integrada solo bajo demanda (ARR/IGF/commercial_state/entidades/MC) |
| `declared_not_integrated` | Dominio auditado pero no cableado a Director IA |
| `restricted` | Reserva |
| `unknown` | Reserva |

`executor` es el **nombre** de una función existente identificada en la auditoría; **no se importa ni se invoca** en esta fase.

API:

- `KNOWN_INPUT_KEYS` (lista única compartida con el orchestrator)
- `getDirectorIaTool(toolId)`
- `listDirectorIaTools()`
- `listToolsForDomain(domainId)`
- `isDirectorIaToolExecutable(toolId)`
- `validateDirectorIaToolRegistry()` — marca `required_input_unknown:<tool_id>:<input>`
- `DOMAIN_TO_TOOLS`

No duplica el catálogo de capabilities; valida dominios contra `getDirectorIaCapability`.

## Contrato del Tool Plan

`buildDirectorIaToolPlan(plan, options?)` retorna:

```json
{
  "version": "1.0",
  "planner_version": "1.0",
  "intent": "overdue_actions",
  "requested_domains": ["action_register"],
  "tools": [
    {
      "tool_id": "get_action_register_context",
      "domain": "action_register",
      "status": "available",
      "executable": true,
      "required_inputs": ["planta_id"],
      "missing_inputs": [],
      "reason": "available"
    }
  ],
  "executable_tools": ["get_action_register_context"],
  "unavailable_tools": [],
  "restricted_tools": [],
  "missing_inputs": [],
  "can_execute": true,
  "can_execute_all": true,
  "requires_clarification": false,
  "clarification_reason": null
}
```

`can_execute=true` (ejecución parcial) si:

1. no hay clarificación bloqueante;
2. existe al menos una tool con `executable=true`.

Otras tools del plan con inputs faltantes **no** impiden `can_execute`.

`can_execute_all=true` solo si:

1. no hay clarificación;
2. el plan tiene al menos una tool;
3. todas las tools ejecutables por registry tienen sus inputs;
4. no hay `unavailable_tools` ni `restricted_tools` en el plan.

Si hay tools ejecutables y otras `declared_not_integrated`, `can_execute` puede ser `true`, `can_execute_all` será `false`, y `unavailable_tools` lista las no integradas.

## Mapeo dominio → herramienta

| Dominio | Tool |
|---------|------|
| action_register | get_action_register_context |
| dicf | get_dicf_context |
| bitacora | get_bitacora_context |
| mejora_continua | get_mejora_continua_context |
| cliente_comentarios | get_cliente_comentarios |
| folio_comentarios | get_folio_comentarios |
| entidades_comerciales | resolve_entidades_comerciales |
| arr | get_arr_snapshot |
| igf | get_igf_snapshot |
| commercial_state | get_commercial_state |
| folios / kanban | get_folio_status |
| folio_historial | get_folio_history |
| documentos | get_folio_documents |
| cheques / polizas | get_folio_financial_status |
| presupuestos | get_budget_status |
| proyectos | get_project_status |
| gastos / taller_at | get_expense_analysis |
| inversiones | get_investment_analysis |
| delta_venta / descuento / ingreso | get_delta_* |
| duplicados | get_duplicate_folios |
| usuarios_admin | get_user_permissions |

## Inputs

Lista única `KNOWN_INPUT_KEYS` exportada desde `lib/director-ia-tools.js` y reexportada por el orchestrator:

`planta_id`, `question`, `year`, `month`, `user`, `permissions`, `folio_id`, `entity`.

Cualquier otro valor en `requiredInputs` del registry o en `required_inputs` / `missing_inputs` de un Tool Plan falla validación con `required_input_unknown:<tool_id>:<input>`.

No se extrae `folio_id` del texto todavía: si falta, aparece en `missing_inputs`.

## Integración no invasiva

En `askDirectorIa`, tras smalltalk y limitación Fase 1:

```js
const directorIaPlan = planDirectorIaQuestion(q);
const directorIaToolPlan = buildDirectorIaToolPlan(directorIaPlan, {
  planta_id,
  question: q,
  user: _user,
});
directorIaDebug("[DIRECTOR_IA] planner:", directorIaPlan);
directorIaDebug("[DIRECTOR_IA] tool_plan:", directorIaToolPlan);
```

- No se agrega al response público.
- No gobierna routing ni OpenAI.
- Visible solo con `DIRECTOR_IA_DEBUG=true|1`.

## Pruebas

```bash
node scripts/test-director-ia-tool-orchestrator.js
node scripts/test-director-ia-capabilities.js
node scripts/test-director-ia-planner.js
```

Exit code `0` si pasan.

## Limitaciones

- Ninguna herramienta se ejecuta.
- `executor` es solo un nombre documentado.
- No hay runtime de permisos GA/GV en el orchestrator (solo declaración).
- No se inventa `folio_id` desde la pregunta.

## Cómo revertir

1. Quitar import y bloque `buildDirectorIaToolPlan` / debug `tool_plan` en `lib/director-ia-chat.js`.
2. Eliminar `lib/director-ia-tools.js`, `lib/director-ia-tool-orchestrator.js`, el script de pruebas y este documento.

Sin cambios de DB ni frontend.
