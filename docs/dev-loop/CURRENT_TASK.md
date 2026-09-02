# UI-ACTION-REGISTER-GROUPING-001

task_type: IMPLEMENTATION

mode: IMPLEMENTATION

status: DONE_PENDING_REVIEW

implementation_authorized: YES

merge_authorized: NO

deploy_authorized: NO

rollback_authorized: NO

docs_director_ia_changed: NO

runtime_changed: NO

backend_changed: NO

database_changed: NO

frontend_changed: YES

max_attempts: 3

authorized_by: "Human Approver"

authorized_at: "2026-09-02T15:37:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver approved UI-ACTION-REGISTER-GROUPING-001 to implement the approved Action Register presentation redesign without loss of information. Frontend presentation only. No Director IA changes, no database/schema/API contract changes, no merge, no deploy, and no next task."

## 1. Objetivo único

Implementar la reorganización visual del Action Register para reducir drásticamente el espacio en blanco y mejorar lectura/captura, SIN perder información, funcionalidades existentes ni semántica del producto.

La intervención debe ser principalmente de PRESENTACIÓN.

No rediseñar el modelo de datos.

No modificar Director IA.

No reinterpretar el Action Register.

## 2. Baseline funcional que debe preservarse

Archivo principal actual:

`frontend-dashboard/app/acciones/page.tsx`

Temas canónicos:

`ACTION_REGISTER_TEMAS`

Catálogo actual:

* Contrataciones
* Mantenimiento
* General
* Clientes
* Apoyos
* Licencias
* Taller
* Oficinas
* Sistema vs Incendio
* ERP
* Imagen Corporativa

El Action Register actual trabaja conceptualmente como:

`fecha × (Comentarios del día + temas)`

El espacio en blanco proviene principalmente de:

* repetir formularios de captura en múltiples celdas;
* mostrar fechas sin contenido;
* mostrar siempre todos los temas aunque estén vacíos;
* desplegar captura y lectura simultáneamente.

El objetivo NO es eliminar ninguna de esas dimensiones.

El objetivo es representarlas mejor.

## 3. Principio de diseño obligatorio

### Separar lectura de captura

La vista normal debe estar optimizada para LEER.

La captura debe realizarse mediante UN SOLO mecanismo reutilizable.

No debe existir un formulario completo permanentemente desplegado en cada cruce:

`fecha × tema`

## 4. Vista principal — Registro vivo

Crear una vista principal denominada conceptualmente:

`Registro vivo`

Debe ser la vista DEFAULT al entrar al Action Register.

Debe organizar las acciones existentes de forma compacta y fácil de recorrer.

Cada acción debe conservar como mínimo la información que actualmente corresponda, incluyendo cuando aplique:

* fecha;
* tema;
* descripción;
* responsable;
* vencimiento;
* estado derivado;
* comentarios;
* subacciones/items;
* fotos;
* controles existentes.

### Estados

Para acciones propias utilizar solamente la semántica actualmente demostrada por el producto:

* Abierta
* Vencida
* Terminada

`Vencida` puede derivarse de `due_date` + `closed`.

NO inventar estados como:

* Programada
* En revisión
* Pausada
* Aprobada

salvo que ya existan físicamente en el modelo actual.

## 5. Agrupación por temas

En Registro vivo:

### Temas con actividad

Mostrar normalmente los temas que tengan acciones dentro del rango/contexto visible.

Ejemplo conceptual:

`Mantenimiento (6 abiertas)`

seguido por sus acciones.

### Temas sin acciones

No renderizar 11 bloques vacíos permanentemente.

Agruparlos bajo un control compacto:

`Temas sin acciones (N) ▸`

Al expandirlo deben continuar disponibles los temas canónicos individualmente.

NO fusionar temas.

NO borrar temas.

NO crear un tema genérico.

El catálogo de 11 temas sigue siendo canónico.

## 6. Comentarios del día

`Comentarios del día` continúa siendo una entidad visual distinta de una acción.

NO mezclar comentarios del día con acciones.

En modo lectura:

* mostrar cada fecha de manera compacta;
* si existe comentario, mostrar una línea/resumen;
* si no existe, mostrar `Sin comentarios` solo cuando sea relevante;
* NO mantener un textarea permanentemente abierto.

Debe existir acceso claro para agregar/editar según las capacidades actuales.

## 7. Panel único de captura

Crear UN SOLO mecanismo de captura reutilizable.

Puede ser:

* drawer lateral;
* panel;
* modal;

elegir la opción que mejor se integre con la UI existente.

Debe permanecer CERRADO mientras el usuario solamente lee.

Botones como:

`+ Agregar`

o

`+`

desde una fecha/tema deben abrir ESTE MISMO panel.

### Campos

El panel debe reutilizar los datos y contratos actuales.

Debe poder manejar al menos:

#### Comentario del día

* Fecha
* Texto

#### Acción

* Fecha
* Tema
* Acción/texto
* Responsable
* Vencimiento
* demás campos actualmente soportados

Cuando se abra desde una fecha o tema específico debe prellenar ese contexto.

NO duplicar formularios por celda.

## 8. Vista secundaria — Matriz por fecha

Conservar una segunda vista para comparación histórica:

`Matriz por fecha`

Esta vista mantiene el concepto fecha × tema, pero debe ser compacta.

### Agrupación temporal

Agrupar visualmente fechas por semana.

Ejemplo conceptual:

`Semana 28 jul – 3 ago`

`Semana 4 – 10 ago`

La agrupación NO cambia fechas reales ni datos.

### Fechas vacías

Una fecha sin comentarios ni acciones NO debe ocupar una columna completa con formularios vacíos.

Puede:

* ocultarse de la expansión normal;
* mostrarse como chip compacto;
* quedar accesible mediante la agrupación semanal.

Al seleccionar una fecha debe seguir siendo posible visualizarla y capturar información.

### Captura

La Matriz NO debe volver a introducir formularios completos permanentes.

Usar el mismo panel único de captura definido anteriormente.

## 9. Selector de vistas

Debe existir una forma simple de alternar entre:

* Registro vivo
* Matriz por fecha

NO apilar ambas vistas completas una debajo de la otra.

Registro vivo debe ser DEFAULT.

## 10. Información y capacidades que NO pueden perderse

Preservar físicamente las capacidades existentes, incluyendo donde actualmente existan:

* acciones;
* comentarios del día;
* responsable;
* vencimiento;
* editar;
* eliminar;
* cerrar/reabrir cuando aplique;
* items/subacciones;
* comentarios de acción;
* fotos;
* copiar acción previa;
* PDF diario;
* exportación Excel;
* crear/seleccionar fecha;
* selección de planta;
* sticky/identificación de tema;
* DICF virtual/read-only;
* historial actualmente accesible.

La reorganización no autoriza eliminar funciones porque sean difíciles de colocar.

Si alguna función requiere una ubicación visual diferente, reubicarla conservando comportamiento.

## 11. DICF

DICF virtual continúa siendo READ-ONLY.

Sus estados propios no deben mezclarse ni normalizarse artificialmente con los estados de acciones propias.

NO modificar su modelo.

NO convertir DICF en acción editable.

## 12. Restricciones técnicas

### Prohibido

* cambiar schema;
* ejecutar SQL;
* migrar datos;
* borrar filas;
* cambiar contratos de API;
* cambiar payloads existentes salvo necesidad técnica demostrada e inevitable;
* modificar Director IA;
* modificar planner;
* modificar conversation-state;
* modificar historical_margin;
* cambiar documentos de `docs/director-ia/`;
* implementar directamente en `main`;
* hacer merge;
* hacer deploy;
* abrir automáticamente la siguiente tarea.

### Preferencia

Resolver todo en frontend reutilizando endpoints y estructuras existentes.

`server.js` debe permanecer sin cambios salvo que exista una imposibilidad física demostrable para implementar PRESENTACIÓN con el contrato actual.

Si aparece esa imposibilidad:

STOP.

Documentarla.

No ampliar alcance automáticamente.

## 13. Rama obligatoria

Partir de `main` limpio, actualizado y sincronizado con `origin/main`.

Crear rama:

`implementation/ui-action-register-grouping-001`

Confirmar antes de escribir:

* rama ≠ main;
* working tree limpio;
* CURRENT_TASK = UI-ACTION-REGISTER-GROUPING-001;
* status = AUTHORIZED;
* implementation_authorized = YES.

## 14. Orden de implementación

Implementar incrementalmente en este orden:

1. panel único de captura;
2. colapsar temas sin acciones;
3. compactar Comentarios del día;
4. Registro vivo como vista principal;
5. Matriz por fecha compacta;
6. agrupación semanal;
7. selector Registro vivo / Matriz;
8. revisión integral de funcionalidades preservadas.

No realizar un rewrite total si puede resolverse por refactor incremental.

## 15. Criterios visuales

Priorizar:

* densidad útil de información;
* lectura ejecutiva rápida;
* reducción de scroll horizontal innecesario;
* reducción de formularios repetidos;
* mantenimiento de contexto de planta, fecha y tema;
* jerarquía clara;
* responsive razonable.

Evitar:

* panel derecho permanentemente abierto;
* cinco o más colores de estado sin significado real;
* una columna completa por cada fecha vacía;
* duplicar Registro vivo y Matriz simultáneamente;
* ocultar funciones existentes;
* copiar literalmente el poster/mockup previo.

El mockup previo es referencia conceptual, NO especificación pixel-perfect.

## 16. Protección contra pérdida de información

Antes de modificar:

inventariar físicamente en `page.tsx`:

* estados React relevantes;
* loaders;
* handlers;
* mutations;
* botones;
* exportaciones;
* PDF;
* fotos;
* items;
* comentarios;
* DICF;
* formularios;
* comportamiento responsive.

Después de modificar:

hacer una matriz BEFORE → AFTER.

Cada capacidad existente debe aparecer como:

`PRESERVED`

o, si no puede preservarse:

`STOP`

No aceptar silenciosamente:

`REMOVED`

## 17. Validación obligatoria

Ejecutar las validaciones existentes aplicables al frontend.

Como mínimo:

* lint/build/typecheck correspondientes al proyecto si existen;
* comprobar que la página compile;
* comprobar ausencia de errores introducidos;
* revisar estados empty/loading/error;
* comprobar apertura/cierre del panel;
* comprobar creación de comentario;
* comprobar creación de acción;
* comprobar edición/borrado existentes;
* comprobar vistas;
* comprobar temas sin acciones;
* comprobar fechas vacías;
* comprobar export/PDF;
* comprobar DICF read-only;
* comprobar que no haya pérdida de información.

Si existen tests específicos del Action Register, ejecutarlos.

No fabricar pruebas inexistentes.

## 18. Evidencia final requerida

Entregar reporte con:

### A. Baseline

Qué existía antes y qué funciones fueron identificadas.

### B. Implementación

Archivos modificados y propósito de cada cambio.

### C. Registro vivo

Cómo quedó funcionando.

### D. Matriz por fecha

Cómo quedó funcionando.

### E. Panel único

Cómo reemplaza formularios repetidos.

### F. Información preservada

Tabla:

| Capacidad | Before | After | Estado    |
| --------- | ------ | ----- | --------- |
| ...       | ...    | ...   | PRESERVED |

### G. Validaciones

Comandos ejecutados + resultado real.

### H. Git

* branch
* base SHA
* final SHA/commit
* `git status --short`
* diff summary

### I. Declaración de alcance

Confirmar explícitamente:

* Director IA untouched;
* DB untouched;
* schema untouched;
* API contracts unchanged;
* no merge;
* no deploy.

## 19. Completion

Al terminar correctamente:

`status: DONE_PENDING_REVIEW`

NO poner CLOSED.

NO hacer merge.

NO desplegar.

NO iniciar la siguiente tarea.

Esperar revisión humana.
