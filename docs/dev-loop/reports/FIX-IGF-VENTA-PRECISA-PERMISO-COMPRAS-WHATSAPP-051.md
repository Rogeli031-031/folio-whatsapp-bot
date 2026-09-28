# FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051

## Identidad

```yaml
task_id: "FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "lib/usuario-permisos.js"
  - "lib/compras-dashboard.js"
  - "server.js"
  - "frontend-dashboard/lib/auth.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "test/igf-venta-permiso-compras-whatsapp-051.test.js"
  - "test/igf-diario-continuar-proyeccion-desde-corte-050.test.js"
  - "test/igf-corte-proyeccion-compras-importe-049.test.js"
  - "test/compras-importe-venta-igf-por-planta-048.test.js"
  - "test/igf-diario-puebla-036.test.js"
  - "test/compras-dashboard-013.test.js"
  - "test/compras-hg-kilos-014.test.js"
  - "test/compras-flete-tarifa-016.test.js"
  - "docs/dev-loop/reports/FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/compras-excel.js"
  - "motor de Pronóstico"
  - "Provincia Venta Diaria"
  - "Provincia Comisiones"
  - "PRECIO"
  - "CONTROL DE COMPRAS"
  - "base de datos / schema"
  - "Director IA"
  - "frontend-dashboard/.next"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "049, 048 y 036 también exigían la columna total redondeada. Esas aserciones se actualizaron porque la 051 sustituye únicamente esa fuente de VENTA KG. La proyección desde el corte no se tocó."
  - "013, 014 y 016 montan las rutas HTTP sin permiso. Su auth de prueba ahora incluye acceso_compras para que el control de planta siga ejecutándose."
  - "DZC y AZP no existen en el catálogo. No se crearon."
  - "DIRECTORZP y DIR-ZP ya existen como alias de Director ZP en el reconocimiento de dashboard. Reciben solo acceso_compras, sin copiar el resto de defaults de ZP."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 83fc6bf4db77351b1bf7ecb477d44f6b041af1ee |
| branch | fix/igf-venta-permiso-compras-whatsapp-051 |
| schema_changes | false |
| data_mutation | false |
| git_diff_check | clean |

## VENTA KG

La 050 sigue vigente: `fecha < corte` es real y `fecha >= corte` es proyectado, incluido el día de corte, hasta el último día del mes.

La única corrección es la fuente de VENTA KG. La columna total de Provincia Venta Diaria está redondeada. IGF Diario vuelve a usar los canales de la planta, localizados con `canalCols()` y `plantEquivalent`. No se hardcodean J y K.

La fórmula es `IF(AND(ISNUMBER(CASA),ISNUMBER(COMISIONISTA)),(CASA+COMISIONISTA)*1000,"")`. Un cero numérico es válido.

En el caso Tehuacán del fixture, el total visible es 40.000 en la columna B y los canales quedan en J = 14.114 y K = 25.642. La fórmula referencia J y K. El resultado conceptual es 39,756 kg, no 40,000.

Puebla, Acapulco, Querétaro/Queretaro, San Luis y Morelos resuelven sus propias columnas de canal.

## acceso_compras

El catálogo agrega `acceso_compras` / "Acceso a Compras". El editor de usuarios lo muestra porque lee el catálogo. No hay columna nueva: sigue en `permisos_json`.

Default true: GG, GO, ZP y sus alias ya reconocidos (DIR_ZP, DIRZP, DIRECTOR_ZP, DZP, DIRECTORZP, DIR-ZP), CF_CDMX/CDMX y AD.

Default false: GA, GV, SG, SEH y cualquier otro rol. DZC y AZP no están en el catálogo.

Un override en `permisos_json` manda: GG con `false` queda en false; un rol sin default con `true` queda en true.

## API, botón y página

Todas las rutas `/api/compras` exigen `authHasPermiso(..., "acceso_compras")` antes del control de planta. Sin permiso responden 403 `{ "error": "No tienes permiso de Compras." }`. Con permiso, otra planta sigue en 403 de planta. ZP, AD y CF_CDMX conservan el alcance global que ya tenía `assertDashboardPlantaAccessForActionRegister`.

El JWT incluye `acceso_compras` siempre, y el resto de permisos solo cuando difieren del default del rol. Un token de GG sin otros overrides lleva una sola clave. Los tokens antiguos sin la clave usan el default del rol en el frontend.

El botón Compras de IGF Forecast solo se muestra con permiso efectivo. `/compras` sin permiso no carga datos y muestra "No tienes permiso de Compras."

## comprasT

El comando es exacto y no distingue mayúsculas: `comprasT`, `ComprasT`, `COMPRast`. No acepta `comprasTotal` ni `miscomprasT`.

Sin alta: "No estás dado de alta. Contacta al administrador." Sin permiso: "⛔ No tienes permiso de Compras." Con permiso, el mensaje trae el enlace de 20 horas y no imprime el token aparte.

GG/GO con planta reciben `planta_id` canónico. ZP, AD y CF_CDMX no lo fuerzan.

GO nivel 6 puede usar `comprasT` además de AR, DirectorIA y SEH. SG y SEH siguen sin ese comando.

## Pruebas

La corrida pedida dio 181 PASS y 2 FAIL, de 183 pruebas: 051, 050, 049, 048, 013, 014, 016, 020, 021, 022, 024, 026 y 030.

Los 2 FAIL ya fallan en el SHA base `83fc6bf4`, sin esta tarea:

- `compras-hg-kilos-014`: TOTAL MES de HG espera -787 y el libro entrega -3148.
- `compras-flete-tarifa-016`: el consolidado de flete espera 200 y la celda trae una fórmula SUM.

No se modificaron esas aserciones. 036 y 045, tocadas o revisadas por la fuente de venta, dieron 6 PASS adicionales.

No hay archivos previos de pruebas de usuarios/permisos ni de Twilio fuera de la 051. La 051 cubre defaults, overrides, API, JWT corto y el comando.

`git diff --check` no reportó errores.

## Límite

No hay cambio de schema. No hay PR, merge ni despliegue.
