# FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1

## Identidad

```yaml
task_id: "FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-dashboard.js"
  - "server.js"
  - "test/compras-asistente-direccion-global-051-r1.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/usuario-permisos.js"
  - "lib/igf-diario-puebla.js"
  - "frontend"
  - "base de datos / schema"
  - "frontend-dashboard/.next"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "buildDicfNotifDashboardUrls también pasó a isAsistenteDireccion. Ya clasificaba AD por rol y puesto; ahora usa el mismo algoritmo que el enlace de Compras."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 7eee26ff422dc40c15d6f0b56ccef4f53ac35709 |
| branch | fix/compras-asistente-direccion-global-051-r1 |
| schema_changes | false |
| data_mutation | false |
| git_diff_check | clean |

## Corrección

`isAsistenteDireccion` reconoce el puesto o el nombre del rol, sin nombre personal ni teléfono:

- `rol_clave` es `AD`, o
- `rol_nombre` contiene Asistente y Dirección, o
- `nombre` (el puesto) contiene Asistente y Dirección.

La comparación ignora mayúsculas, acentos y espacios repetidos.

Eso no concede `acceso_compras`. El permiso sigue saliendo de `rol_clave` más `permisos_json`. GA genérico permanece en false.

`comprasActorIsGlobal` usa esa función. `buildDashboardSignedUrlForUsuario` también. Si el actor es Asistente Dirección, el JWT queda con rol `AD` y sin lista de plantas, y `comprasT` no agrega `planta_id`.

## Casos

| Caso | Permiso | Global | URL |
|---|---|---|---|
| GA, puesto Asistente Dirección, `acceso_compras: true`, planta 1 | true | true | `https://dash.example/compras?t=TOKEN` |
| Igual, sin override o con false | false | true | `⛔ No tienes permiso de Compras.` |
| GA, puesto Gerente Administrativo, `acceso_compras: true`, planta 1 | true | false | `https://dash.example/compras?t=TOKEN&planta_id=1` |
| AD | según rol | true | sin planta |
| ZP y CF_CDMX | según rol | true | sin planta |
| GG y GO | según rol | false | con su planta |

También pasan `Asistente Dirección`, `ASISTENTE DIRECCION` y `asistente   dirección`. Un `nombre_persona` con ese texto no vuelve global a un GA.

## Pruebas

47 PASS, 0 FAIL: 051-R1, 051 completa y compras-dashboard 013.

Los 2 FAIL de baseline siguen iguales y no se tocaron:

- 014 TOTAL MES de HG: espera −787 y obtiene −3148.
- 016 consolidado de flete: espera 200 y obtiene una fórmula SUM.

`git diff --check` no reportó errores.

## Límite

No hay cambio de schema ni de defaults de GA. No hay PR, merge ni despliegue.
