# CURRENT_TASK

## AUTORIZACIÓN HUMANA

AUTORIZACIÓN HUMANA CONFIRMADA PARA AUDITORÍA ÚNICAMENTE.

Esta tarea autoriza:

* inspección de código;
* búsqueda física de funciones y call-sites;
* ejecución de tests existentes;
* creación de sondas temporales/read-only cuando sean necesarias;
* comparación entre entradas y salidas intermedias;
* documentación de evidencia;
* creación del informe de auditoría correspondiente.

Esta tarea NO autoriza:

* implementación;
* corrección de bugs;
* refactor;
* modificación de comportamiento;
* ampliación de capacidades;
* cambios oportunistas;
* actualización de parsers, planners, resolvers o prompts;
* merge a `main`;
* deploy;
* corrección de hallazgos secundarios.

Un hallazgo residual NO constituye autorización de implementación.

---

# TAREA

`AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001`

# RAMA

`audit/director-ia-client-hint-y-grupo-move-001`

# TIPO

AUDIT / READ-ONLY / FIRST-DIVERGENCE

# ESTADO INICIAL

`DONE_PENDING_REVIEW`

---

# 1. OBJETIVO ÚNICO

Localizar físicamente el **primer punto de divergencia** por el cual Director IA reduce o transforma incorrectamente el nombre explícito del cliente:

`Y GRUPO MOVE`

hasta producir un hint equivalente a:

`GRUPO`

en lugar de preservar el nombre suficiente para su posterior resolución canónica.

La auditoría debe determinar:

1. cuál es la representación exacta del texto en cada frontera;
2. en qué función aparece por primera vez la pérdida de información;
3. qué regla concreta provoca esa transformación;
4. si la pérdida ocurre antes o después de:

   * clasificación de intención;
   * extracción del cliente;
   * normalización;
   * construcción de slots;
   * creación de `client_hint`;
   * resolución canónica;
   * ejecución de herramientas;
5. si el comportamiento depende de que el cliente aparezca:

   * solo;
   * dentro de una pregunta compuesta;
   * precedido por preposición/conector;
   * acompañado de periodo;
   * acompañado de métricas;
6. si el problema es exclusivamente de extracción/hint o si existe una segunda divergencia posterior.

No implementar la solución.

---

# 2. CONTEXTO Y EVIDENCIA PREVIA

Existe un hallazgo residual ya observado en una auditoría anterior:

`Y GRUPO MOVE` → hint `GRUPO`

Ese hallazgo NO fue corregido y NO estaba autorizado corregirlo dentro de aquella auditoría.

La auditoría anterior relacionada con periodos históricos ya está CLOSED y NO debe ser reabierta ni reescrita:

`docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md`

Su `FIRST_DIVERGENCE_POINT` histórico fue distinto:

`parseExplicitMonths → null`

para rangos abiertos como:

`enero a la fecha`

Ese incidente no forma parte del objetivo actual.

No mezclar ambos problemas.

---

# 3. BASE DE LA AUDITORÍA

La rama actual fue creada desde `main` limpio y sincronizado con `origin/main`.

Antes de realizar conclusiones:

1. registrar SHA exacto de `HEAD`;
2. registrar SHA de `origin/main`;
3. comprobar que el working tree inició limpio.

No asumir un SHA por memoria o documentación anterior.

Evidencia mínima esperada:

```text
git rev-parse HEAD
git rev-parse origin/main
git status --short
```

---

# 4. PREGUNTA CENTRAL

Responder con evidencia:

> ¿En qué función y en qué transformación exacta deja de existir la representación correcta de `Y GRUPO MOVE` y aparece por primera vez `GRUPO`?

La respuesta final NO puede limitarse a:

* “el parser falla”;
* “el planner lo interpreta mal”;
* “el LLM no entiende el cliente”;
* “el resolver no encuentra el cliente”;
* “hay una regex”;
* “parece un problema de normalización”.

Debe identificarse:

`archivo → función → entrada → transformación → salida`

y, cuando sea posible:

`caller → función divergente → siguiente consumidor`

---

# 5. PRINCIPIO FIRST-DIVERGENCE

No comenzar por modificar el lugar donde finalmente aparece `GRUPO`.

Reconstruir la cadena desde la entrada original.

Como mínimo rastrear físicamente, si existen en el runtime actual, fronteras equivalentes a:

```text
raw user text
    ↓
intent/routing
    ↓
explicit client extraction
    ↓
normalization/token filtering
    ↓
slots
    ↓
client_hint
    ↓
canonical resolution
    ↓
tool/query execution
```

Los nombres anteriores describen fronteras conceptuales.

NO asumir que esos son los nombres reales de las funciones.

Localizar los nombres reales en el repositorio.

---

# 6. SONDAS OBLIGATORIAS

Ejecutar sondas read-only suficientes para distinguir pérdida de identidad de fallo posterior.

Debe incluirse como mínimo el cliente exacto:

`Y GRUPO MOVE`

y conservar el texto exacto de entrada y salida de cada sonda.

## 6.1 Caso mínimo

Probar una consulta mínima equivalente a:

`¿Qué sabemos de Y GRUPO MOVE?`

Objetivo:

determinar qué cliente/hint/slot produce la primera vuelta desde un chat sin contexto previo.

---

## 6.2 Cliente aislado

Probar el mecanismo físico de extracción con:

`Y GRUPO MOVE`

sin métricas ni periodo, en el nivel más bajo que permita el código.

Objetivo:

separar el problema de extracción del routing conversacional.

---

## 6.3 Pregunta compuesta

Probar una consulta con cliente + métrica, por ejemplo:

`Dame las compras de Y GRUPO MOVE.`

y, si el runtime lo soporta:

`Dame los kg comprados de Y GRUPO MOVE.`

Objetivo:

determinar si la presencia de una métrica cambia la extracción.

---

## 6.4 Cliente + periodo

Probar:

`Dame las compras de Y GRUPO MOVE desde enero a la fecha.`

Objetivo:

confirmar que el parser temporal actual no es la causa de la mutilación del cliente.

No reauditar el comportamiento completo de rangos históricos salvo lo necesario para separar ambas fronteras.

---

## 6.5 Control semántico

Crear controles read-only con nombres que permitan comprobar si existen reglas genéricas que eliminan tokens.

Seleccionar controles derivados del mecanismo encontrado, no una batería arbitraria.

Como mínimo debe quedar demostrado si el token inicial:

`Y`

es interpretado como:

* conjunción;
* separador;
* stopword;
* operador;
* marcador conversacional;
* parte legítima del nombre;
* o no participa realmente en la divergencia.

También debe verificarse por qué el resultado observado termina en:

`GRUPO`

y qué ocurre con:

`MOVE`.

No asumir que `Y` es necesariamente la causa.

---

# 7. TRAZABILIDAD OBLIGATORIA

Para cada frontera relevante documentar, cuando exista:

| Frontera           | Función real | Entrada | Salida | ¿Identidad íntegra? |
| ------------------ | ------------ | ------- | ------ | ------------------- |
| raw text           | ...          | ...     | ...    | YES/NO              |
| routing/planner    | ...          | ...     | ...    | YES/NO              |
| extraction         | ...          | ...     | ...    | YES/NO              |
| normalization      | ...          | ...     | ...    | YES/NO              |
| slots/hint         | ...          | ...     | ...    | YES/NO              |
| canonical resolver | ...          | ...     | ...    | YES/NO              |
| executor/tool      | ...          | ...     | ...    | YES/NO              |

La primera fila que cambie de `YES` a `NO` debe poder defenderse como:

`FIRST_DIVERGENCE_POINT`

si la evidencia demuestra que realmente es la primera.

---

# 8. RESOLUCIÓN CANÓNICA

Comprobar por separado:

1. qué hint recibe físicamente el resolver;
2. si el resolver conoce o puede encontrar `Y GRUPO MOVE` cuando recibe una representación adecuada;
3. si el fallo sucede antes de entrar al resolver;
4. si el resolver introduce una divergencia adicional.

No atribuir al resolver un error causado por un hint ya mutilado.

Si existe acceso read-only a catálogo/entidades comerciales mediante tests, fixtures o herramientas existentes, puede utilizarse.

No insertar ni modificar clientes.

---

# 9. CONTINUIDAD

Esta auditoría está centrada en el **primer turno con cliente explícito**.

La continuidad solo debe utilizarse como control comparativo si ayuda a localizar la frontera.

No ampliar esta tarea al hallazgo independiente:

`Ahora dime lo mismo…` → `plant_switch`, `inherit=false`

Ese hallazgo debe permanecer separado.

Si aparece durante las sondas:

* documentarlo como `OUT_OF_SCOPE`;
* no corregirlo;
* no convertirlo en una segunda auditoría dentro de esta tarea.

---

# 10. RENDER / DEPLOY

La equivalencia entre runtime de Render y el SHA local NO es el objetivo de esta auditoría.

Existe un hallazgo previo:

`Render runtime SHA vs repository SHA = NOT_PROVEN`

No intentar resolverlo aquí salvo que sea estrictamente necesario para interpretar una evidencia utilizada.

Las conclusiones de esta auditoría deben especificar claramente si corresponden a:

`CURRENT_REPOSITORY_CODE`

y no afirmar equivalencia con producción sin evidencia.

---

# 11. INSPECCIÓN DE TESTS

Localizar tests existentes relacionados con:

* cliente explícito;
* client hint;
* resolución de entidades;
* planner/client profile;
* canonicalización;
* continuidad de cliente;
* preguntas compuestas.

Determinar:

1. si `Y GRUPO MOVE` aparece actualmente en algún test;
2. si existe un caso estructural equivalente;
3. si el bug está cubierto o no;
4. si un test existente permitiría el comportamiento incorrecto.

NO agregar todavía el golden test.

Registrar:

`GOLDEN_SET_IMPLEMENTED = NO`

salvo autorización futura independiente.

---

# 12. GIT HISTORY

Cuando resulte útil, usar historia Git únicamente para entender procedencia y causalidad.

Puede utilizarse:

```text
git log
git show
git blame
git diff
```

La auditoría debe diferenciar:

* código vigente;
* comportamiento histórico;
* hipótesis;
* evidencia demostrada.

Si se identifica el commit que introdujo una regla relevante, documentarlo.

No es obligatorio atribuir autoría causal si la evidencia no alcanza.

Usar:

`INTRODUCING_COMMIT = NOT_PROVEN`

cuando corresponda.

---

# 13. NO HACER

Queda expresamente prohibido durante esta tarea:

* corregir regex;
* cambiar stopwords;
* cambiar extracción;
* modificar `client_hint`;
* cambiar planner;
* cambiar prompts;
* cambiar canonical resolver;
* cambiar continuidad;
* agregar fallbacks;
* ampliar heurísticas;
* agregar aliases;
* hardcodear `Y GRUPO MOVE`;
* agregar tests que cambien el resultado esperado;
* implementar golden set;
* modificar producción;
* deploy;
* merge a main;
* aprovechar para corregir `Ahora dime lo mismo…`;
* aprovechar para demostrar SHA de Render;
* reescribir auditorías CLOSED.

---

# 14. ARTEFACTO DE SALIDA

Crear exclusivamente el informe:

`docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENT-HINT-Y-GRUPO-MOVE-001.md`

Además de cualquier actualización de estado estrictamente requerida por el protocolo de `CURRENT_TASK.md`.

No modificar documentación arquitectónica general.

---

# 15. CONTENIDO MÍNIMO DEL INFORME

El informe debe incluir:

## A. Executive result

Conclusión breve y verificable.

## B. Repository evidence

* branch;
* HEAD SHA;
* origin/main SHA;
* working tree inicial.

## C. Production observation inherited

Documentar el hallazgo recibido:

`Y GRUPO MOVE` → `GRUPO`

sin presentarlo como una nueva observación de producción si no se ejecutó realmente contra producción.

## D. Physical call chain

Cadena real de funciones desde texto hasta resolución.

## E. Probe matrix

Entrada exacta y resultados.

## F. First divergence

Formato obligatorio:

```text
FIRST_DIVERGENCE_POINT =
<archivo>
→ <función>
→ <transformación exacta>
```

## G. Root cause

Debe describir mecanismo, no síntoma.

## H. Downstream behavior

Qué reciben planner/resolver/tools después de la divergencia.

## I. Canonical resolver control

Demostrar si el resolver puede o no resolver la identidad cuando recibe información adecuada, siempre que el repositorio permita demostrarlo.

## J. Test coverage

Qué cubren actualmente los tests y qué no.

## K. Secondary findings

Separados y marcados:

`OUT_OF_SCOPE`

## L. Implementation assessment

Solo describir qué frontera tendría que ser objeto de una implementación futura.

NO diseñar ni aplicar el fix salvo lo mínimo necesario para explicar la frontera.

---

# 16. CAMPOS DE CIERRE OBLIGATORIOS

El informe debe terminar contestando explícitamente:

```text
AUDIT_STATUS =
INCIDENT_REPRODUCED =
CURRENT_MAIN_CODE_BEHAVIOR =
FIRST_DIVERGENCE_POINT =
ROOT_CAUSE =
CLIENT_NAME_RAW_PRESERVED =
CLIENT_NAME_EXTRACTION_PRESERVED =
CLIENT_HINT_PRESERVED =
CANONICAL_RESOLVER_RECEIVES_FULL_IDENTITY =
CANONICAL_RESOLUTION_WITH_FULL_IDENTITY =
TOKEN_Y_CAUSAL =
TOKEN_MOVE_LOSS_EXPLAINED =
SECOND_DIVERGENCE_FOUND =
CURRENT_TEST_COVERAGE =
GOLDEN_SET_IMPLEMENTED = NO
IMPLEMENTATION_AUTHORIZED = NO
CURRENT_TASK_CHANGED =
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
OUT_OF_SCOPE_FINDINGS =
```

No usar `YES`, `NO` o una causa concreta si no está demostrada.

Usar:

`NOT_PROVEN`

cuando corresponda.

---

# 17. CRITERIO DE ÉXITO

La auditoría está completa únicamente cuando pueda explicarse con evidencia reproducible:

```text
"Y GRUPO MOVE"
        ↓
[función A: todavía correcto]
        ↓
[función B: transformación demostrada]
        ↓
"GRUPO"
```

o, si la observación ya no se reproduce:

```text
historical observation
        ↓
current branch probe
        ↓
NOT_REPRODUCED
```

y localizar hasta donde la historia/código permitan explicar la causa anterior sin inventarla.

No forzar la conclusión de que el bug sigue existiendo.

---

# 18. STOP CONDITION

Al completar la evidencia:

1. crear el informe;
2. ejecutar validaciones/tests read-only pertinentes;
3. mostrar `git diff --check`;
4. mostrar `git status`;
5. detenerse.

NO hacer implementación.

NO crear rama de implementación.

NO hacer merge.

NO push salvo autorización humana posterior.

El resultado de esta tarea debe terminar en:

`DONE_PENDING_REVIEW`

y esperar revisión humana.

---

# 19. REGLA FINAL

La pregunta de esta auditoría es exclusivamente:

> ¿Dónde y por qué `Y GRUPO MOVE` pierde su identidad antes de la resolución canónica?

No:

> ¿Cómo lo arreglamos?

Primero evidencia.

Después, si la auditoría demuestra una causa y existe autorización humana independiente, podrá evaluarse una implementación separada.
