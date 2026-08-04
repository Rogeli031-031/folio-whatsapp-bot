# Director IA v2 — Fase 2: Planner determinístico

## Objetivo

Interpretar una pregunta de usuario y producir un **plan estructurado** de dominios necesarios, sin consultar base de datos, sin OpenAI y sin alterar el routing ni las respuestas actuales del chat.

El Planner prepara el gobierno futuro del chat; en esta fase solo se calcula y se registra en debug.

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `lib/director-ia-planner.js` | Planner, intents, mapeo de dominios, validación |
| `scripts/test-director-ia-planner.js` | Pruebas determinísticas |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md` | Esta documentación |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-chat.js` | Import de `planDirectorIaQuestion`; cálculo del plan tras smalltalk y tras limitación de capacidades; solo `directorIaDebug("[DIRECTOR_IA] planner:", plan)` |

## Contrato del plan

`planDirectorIaQuestion(question, options?)` retorna:

```json
{
  "version": "1.0",
  "intent": "overdue_actions",
  "intent_label": "Acciones vencidas",
  "domains": ["action_register"],
  "available_domains": ["action_register"],
  "partial_domains": ["action_register"],
  "unavailable_domains": [],
  "restricted_domains": [],
  "requires_clarification": false,
  "clarification_reason": null,
  "confidence": 0.93,
  "evidence": [{ "type": "rule", "value": "acciones_vencidas" }]
}
```

Reglas:

- `confidence` ∈ [0, 1]
- `domains` sin duplicados y existentes en `lib/director-ia-capabilities.js`
- `available_domains` = dominios del plan con `canRead=true`
- `partial_domains` = `coverage=partial`
- `unavailable_domains` = `coverage=none` o `accessMode=not_integrated`
- `restricted_domains` = `accessMode=restricted`
- `evidence` solo reglas (`type: "rule"`)

API exportada:

- `planDirectorIaQuestion`
- `detectDirectorIaIntent`
- `resolveDomainsForIntent`
- `validateDirectorIaPlan`
- `buildDirectorIaPlanSummary`

Reutiliza: `getDirectorIaCapability`, `isDirectorIaDomainReadable`, `detectUnsupportedDirectorIaDomain` (no duplica el catálogo).

## Intents

`smalltalk`, `help`, `action_status`, `overdue_actions`, `responsible_lookup`, `plant_diagnosis`, `commercial_state`, `client_analysis`, `arr_status`, `igf_status`, `financial_diagnosis`, `bitacora_lookup`, `mejora_continua`, `folio_status`, `folio_history`, `folio_documents`, `folio_financial_status`, `budget_status`, `project_status`, `expense_analysis`, `investment_analysis`, `delta_sales`, `delta_discount`, `delta_income`, `duplicate_folios`, `user_permissions`, `unknown`

## Mapeo de dominios

Ver `INTENT_DOMAIN_MAP` en `lib/director-ia-planner.js`. Resumen:

| Intent | Dominios |
|--------|----------|
| smalltalk / help / unknown | `[]` |
| overdue_actions / action_status / responsible_lookup | `action_register` |
| plant_diagnosis | AR, dicf, bitacora, arr, igf, commercial_state |
| commercial_state | commercial_state, dicf, entidades_comerciales |
| client_analysis | dicf, cliente_comentarios, bitacora, entidades, arr (override posible a `folio_comentarios`) |
| arr_status / igf_status | arr / igf |
| financial_diagnosis | arr, igf, delta_* |
| bitacora_lookup | bitacora |
| mejora_continua | mejora_continua, action_register |
| folio_* / budget / project / expense / investment / delta_* / duplicate / user_permissions | según mapa Fase 2 |

## Prioridad de reglas

1. smalltalk / help  
2. Comentarios legibles (folio/cliente) antes de folio operativo  
3. Folio específico (etapa, historial, documentos, cheque/póliza)  
4. Usuarios / permisos  
5. Presupuestos / proyectos / gastos / inversiones / duplicados  
6. Mejora continua  
7. ARR / IGF / deltas / diagnóstico financiero  
8. commercial_state / client_analysis / bitácora  
9. Action Register (vencidas, responsable, «cómo va Taller»)  
10. Diagnóstico de planta  
11. unknown (+ fallback desde capabilities unsupported)

## Ambigüedades (`requires_clarification`)

- Proyectos vs Action Register (p. ej. «proyectos de mantenimiento»)
- «Gastos» como KPI IGF vs categoría de folios
- «Estado» sin objeto (planta / acción / cliente / folio)
- `confidence < 0.55`

No se genera aún la pregunta al usuario; solo `clarification_reason`.

## Integración no invasiva

En `askDirectorIa`, después de smalltalk y de la limitación Fase 1:

```js
const directorIaPlan = planDirectorIaQuestion(q);
directorIaDebug("[DIRECTOR_IA] planner:", directorIaPlan);
```

- No se agrega el plan al response público.
- No cambia routing, contextos ni OpenAI.
- Con `DIRECTOR_IA_DEBUG=true|1` se imprime el plan.

## Pruebas

```bash
node scripts/test-director-ia-planner.js
```

Exit code `0` si pasa, `1` si falla. No usa OpenAI ni DB.

También conviene re-ejecutar Fase 1:

```bash
node scripts/test-director-ia-capabilities.js
```

## Limitaciones

- El Planner **no gobierna** el chat todavía.
- Detección por reglas: preguntas raras → `unknown` / clarificación.
- Overrides de dominios (p. ej. comentarios de folio → `folio_comentarios`) son locales al plan.
- No hay persistencia del plan.

## Cómo revertir

1. Quitar import y bloque `planDirectorIaQuestion` / `directorIaDebug` planner en `lib/director-ia-chat.js`.
2. Eliminar `lib/director-ia-planner.js`, `scripts/test-director-ia-planner.js` y este documento.

No hay cambios de DB ni frontend que revertir.
