# CURRENT_TASK

task_id: IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001

status: DONE_PENDING_REVIEW

task_type: IMPLEMENTATION

branch: implementation/director-ia-leading-y-client-hint-001

authorized_by_human: YES

base_main_sha: 4f286af9266e72d26c67ae0fd37b3a2f93865a3c

audit_contract:

`docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001.md`

## 1. Objetivo único

Implementar el cambio mínimo, determinista y defendible para que Director IA pueda preservar y resolver correctamente una identidad canónica legítima cuyo nombre comienza con `Y`, incluyendo:

`Y GRUPO MOVE`

sin romper la semántica conversacional existente de follow-ups como:

`¿Y Arturo?` → `Arturo`

La implementación debe corregir únicamente la divergencia demostrada en la auditoría:

`lib/director-ia-conversation-state.js`
→ `extractEntityHint`
→ `yMatch`
→ captura de un solo token + return temprano.

No ampliar esta implementación a otros problemas de extracción.

## 2. Evidencia contractual

La auditoría demostró:

* raw text preserva `Y GRUPO MOVE`;
* `extractEntityHint` es el FIRST_DIVERGENCE_POINT;
* `yMatch` interpreta `Y/y` inicial como marcador conversacional;
* captura solamente `GRUPO`;
* `MOVE` nunca entra al capture group;
* el resolver canónico recibe el hint ya mutilado;
* el resolver sí puede resolver `Y GRUPO MOVE` cuando recibe la identidad íntegra;
* `¿Qué sabemos de Y GRUPO MOVE?` ya preserva correctamente la identidad;
* `¿Y Arturo? → Arturo` es comportamiento existente cubierto por tests;
* las preguntas compuestas que producen `null` son un hallazgo separado.

No reauditar estos hechos salvo lo necesario para verificar la implementación.

## 3. Principio de diseño obligatorio

No resolver la ambigüedad `Y` mediante una regla lexical frágil que simplemente diga:

* “si hay dos palabras, entonces Y es parte del nombre”;
* “si está en mayúsculas, entonces Y es parte del nombre”;
* “captura todo después de Y”;
* o equivalente.

La implementación debe conservar el comportamiento conversacional legítimo y preferir evidencia canónica/determinista cuando sea necesaria para distinguir:

`Y GRUPO MOVE`

de:

`¿Y Arturo?`

No hardcodear:

`Y GRUPO MOVE`

ni ninguna lista especial de clientes.

Si la arquitectura actual permite resolverlo con un cambio más pequeño sin introducir inferencias inseguras, usar el cambio mínimo y documentar por qué es correcto.

## 4. Acceptance criteria obligatorios

Debe quedar demostrado por tests que:

### Caso A — identidad canónica con Y inicial

Entrada relevante:

`Y GRUPO MOVE`

Resultado:

la identidad que llega a resolución canónica conserva:

`Y GRUPO MOVE`

y no:

`GRUPO`

ni:

`GRUPO MOVE`

### Caso B — variante interrogativa

`¿Y GRUPO MOVE?`

Debe poder preservar/resolver la identidad `Y GRUPO MOVE` cuando exista evidencia canónica de ese cliente.

### Caso C — regresión conversacional

`¿Y Arturo?`

Debe continuar comportándose como follow-up:

`Arturo`

No debe convertirse automáticamente en:

`Y Arturo`

### Caso D — pregunta que ya funcionaba

`¿Qué sabemos de Y GRUPO MOVE?`

Debe seguir preservando:

`Y GRUPO MOVE`

### Caso E — no hardcode

Agregar al menos un control estructural suficiente para demostrar que la implementación no depende literalmente del string `Y GRUPO MOVE`.

### Caso F — fail closed

Cuando exista ambigüedad real y no pueda demostrarse identidad canónica, no inventar una identidad.

Conservar la semántica segura existente o clarificar según corresponda.

## 5. Scope permitido

Puede modificarse únicamente lo estrictamente necesario dentro de la frontera:

* `lib/director-ia-conversation-state.js`
* resolver/client-profile únicamente si la solución necesita evidencia canónica allí;
* integración mínima necesaria para transportar candidatos/hint;
* tests directamente relacionados;
* `docs/dev-loop/CURRENT_TASK.md`
* reporte de implementación.

No asumir de antemano que todos esos archivos deben cambiar.

Preferir el diff mínimo.

## 6. Fuera de alcance

NO corregir en esta tarea:

* `Dame las compras de Y GRUPO MOVE.` → `null`
* otras preguntas compuestas cuyo extractor no obtiene identidad;
* `Ahora dime lo mismo…` → `plant_switch`
* `inherit=false` asociado a ese hallazgo;
* parser de `enero a la fecha`;
* periodos históricos;
* Render SHA;
* deploy;
* otros clientes;
* aliases manuales;
* fuzzy resolver general;
* refactor general de conversation-state;
* nuevos intents;
* cambios de prompts LLM;
* Golden Set general.

Si aparece otro bug:

documentarlo como `OUT_OF_SCOPE`.

No corregirlo.

## 7. Protección de regresiones

Todos los tests existentes relacionados con:

* conversation-state;
* client_profile;
* continuity;
* entity follow-up;
* persistent memory;
* planner relacionado;

deben continuar pasando.

La implementación NO puede eliminar el contrato actualmente cubierto por:

`extractEntityHint("¿Y Arturo?") === "Arturo"`

o su equivalente vigente.

## 8. Tests nuevos mínimos

Agregar tests de regresión que demuestren el incidente y la corrección.

Deben cubrir como mínimo:

* `Y GRUPO MOVE`
* `¿Y GRUPO MOVE?`
* `¿Y Arturo?`
* `¿Qué sabemos de Y GRUPO MOVE?`
* control estructural no hardcodeado
* caso ambiguo/fail-closed si la solución introduce resolución por candidatos.

Los tests deben probar comportamiento real, no únicamente una regex aislada si la corrección depende de resolución canónica.

## 9. No permitido

* hardcodear cliente;
* ampliar regex indiscriminadamente;
* hacer que todo `Y <dos palabras>` sea nombre;
* reducir controles fail-closed;
* usar LLM para decidir identidad;
* introducir fuzzy matching silencioso;
* cambiar unrelated routing;
* corregir OUT_OF_SCOPE;
* modificar auditoría CLOSED;
* merge a main;
* deploy.

## 10. Reporte

Crear:

`docs/dev-loop/reports/IMPL-DIRECTOR-IA-LEADING-Y-CLIENT-HINT-001.md`

Debe documentar:

* SHA base;
* archivos modificados;
* mecanismo elegido;
* por qué distingue identidad canónica de follow-up;
* before/after;
* tests nuevos;
* tests existentes ejecutados;
* resultados;
* riesgos;
* OUT_OF_SCOPE;
* diff summary.

Debe terminar con:

IMPLEMENTATION_STATUS =
ROOT_CAUSE_CONTRACT_PRESERVED =
Y_GRUPO_MOVE_FIXED =
QUESTION_Y_GRUPO_MOVE_FIXED =
Y_ARTURO_REGRESSION_PRESERVED =
SABEMOS_REGRESSION_PRESERVED =
HARDCODE_USED = NO
CANONICAL_EVIDENCE_USED =
AMBIGUOUS_CASE_FAIL_CLOSED =
COMPOUND_QUESTION_NULL_FIXED = NO
PLANT_SWITCH_FIXED = NO
HISTORICAL_RANGE_CHANGED = NO
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
TESTS =
GIT_DIFF_CHECK =
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO

## 11. Ejecución autónoma autorizada

Cursor está autorizado a completar en una sola pasada:

1. actualizar `CURRENT_TASK.md` con este contrato;
2. inspeccionar el código necesario;
3. implementar;
4. crear/actualizar tests;
5. ejecutar tests focalizados;
6. ejecutar suite Director IA pertinente;
7. corregir únicamente fallos causados por esta implementación;
8. escribir el reporte;
9. ejecutar `git diff --check`;
10. revisar `git diff`;
11. dejar `CURRENT_TASK` en `DONE_PENDING_REVIEW`;
12. hacer commit de la rama;
13. hacer push de la rama de implementación.

No pedir confirmación humana entre estos pasos.

## 12. Gate final

Después del commit y push:

STOP.

No hacer merge a `main`.

No desplegar.

No abrir automáticamente otra tarea.

Esperar revisión humana.
