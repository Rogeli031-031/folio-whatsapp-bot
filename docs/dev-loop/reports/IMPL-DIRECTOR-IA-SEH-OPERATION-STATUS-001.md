# IMPL-DIRECTOR-IA-SEH-OPERATION-STATUS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-SEH-OPERATION-STATUS-001"
outcome: "DONE"
mode: "IMPL"
implementation: true
code_changes: true
schema_changes: false
seh_data_mutated: false
mirror_table_created: false
html_scraping: false
reference_main: "53138bd0"
branch: "implementation/director-ia-seh-operation-status-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. Este agente no mergea, no despliega y no abre la siguiente tarea."
```

## 1. Resultado

**DONE_PENDING_REVIEW.**

Director IA lee el tablero SEH Operación con la misma fuente que `fetchSehBoard`. Una familia semántica `SEH_OPERATION_STATUS`. Solo lectura.

## 2. Fuente física SEH descubierta

El tablero Operación no usa Carpetas Legales ni HTML.

| Capa | Hecho |
|------|--------|
| UI | `SehOperacionBoard` llama `fetchSehBoard(token, plantaId)` |
| Cliente | `frontend-dashboard/lib/api.ts` → `GET /api/seh?planta_id=` |
| Ámbitos UI | `seh-ambitos.ts`: estacion→`ESTACIONES`, autotanque→`PIPAS`, planta→`PLANTA` + `SISTEMA CONTRA INCENDIO` |
| Backend | `server.js` `app.get("/api/seh")` |
| Tabla | `public.seh_equipos` |
| Categorías fijas | `lib/seh-equipos.js` `SEH_CATEGORIAS` |

Prohibido y no usado: cheerio, jsdom, querySelector, tabla espejo, `INSERT`/`PUT`/`POST`/`DELETE` desde Director IA.

## 3. Endpoint

`GET /api/seh?planta_id=`

Auth: `dashboardAuthMiddleware`. Respuesta: `{ planta_id, categorias, componentes, items, ultima_edicion }`.

Director IA no llama HTTP: ejecuta el mismo `SELECT` (sin columnas de foto) contra `public.seh_equipos`.

`PUT /api/seh` y fotos quedan fuera de alcance.

## 4. Tablas / columnas

Tabla: `public.seh_equipos`.

| Columna | Uso Director IA |
|---------|-----------------|
| `id` | identidad de renglón |
| `planta_id` | aislamiento |
| `categoria` | scope |
| `locacion` | estación / pipa / ubicación de planta |
| `descripcion` | detalle de equipo |
| `componente` | extintor vs otros |
| `nombre` | equipo SCI |
| `vence` | vigencia (`to_char` → `YYYY-MM-DD`) |
| `sort_order` | orden del tablero |

Fotos (`foto_*`) no se leen. `seh_ultima_edicion` no se usa. Carpetas Legales / cumplimiento / regulación: fuera.

## 5. Aislamiento por planta

Misma regla que `assertSehPlantaAccess` en `server.js`:

- `ZP` / `AD` / `CF_CDMX`: todas las plantas
- otro rol con `plantas_permitidas`: solo esas
- lista vacía: no bloquea (paridad backend)
- cruce → 403, no se mezclan `planta_id`

Precedencia de planta:

1. planta explícita en la pregunta (etiqueta)
2. planta seleccionada del dashboard (`planta_id`)
3. entidad inequívoca dentro de los items ya filtrados por esa planta
4. sin `planta_id` usable → aclaración

No hay default hardcodeado a Acapulco. Acapulco en las 40 frases es etiqueta de fixture, no fallback global.

## 6. Semántica de categorías

| Pregunta / ámbito UI | `categoria` física | scope |
|----------------------|-------------------|-------|
| ESTACION - OPERACION | `ESTACIONES` | `STATION` |
| AUTOTANQUE - OPERACION | `PIPAS` | `AUTOTANK` |
| PLANTA - OPERACION | `PLANTA` | `PLANT` |
| Sistema contra incendio | `SISTEMA CONTRA INCENDIO` | `FIRE_SYSTEM` |
| Extintores de [planta] sin recorte | `ESTACIONES` + `PIPAS` + `PLANTA` | `ALL_EXTINGUISHERS` |
| Seguridad e higiene / seguridad contra incendio | las cuatro | `ALL_SEH` |

Extintor = `componente` `EXTINTOR` o vacío, y nunca SCI.

PLANTA no infiere número de plantas desde `LOCACION`.

SCI usa `nombre` + `vence`.

## 7. Deduplicación de estaciones

`COUNT`/`LIST` de estaciones: `COUNT DISTINCT` de `LOCACION` normalizada (NFD, minúsculas, sin acentos) en `ESTACIONES`.

`PIE DE LA CUESTA` × 6 renglones = 1 estación.

## 8. Deduplicación de autotanques

Igual sobre `PIPAS` / `LOCACION`.

`AUTOTANQUE ECO 39` × 3 extintores = 1 pipa.

## 9. Conteo de extintores

Cada renglón extintor cuenta. No se deduplica por locación.

Ejemplo fixture: Pie de la Cuesta = 6 extintores. ECO 39 = 3.

`ALL_EXTINGUISHERS` en el fixture sintético = 13 (7 estación + 4 pipa + 2 planta). SCI excluido. El 13 no es un número productivo inventado: es el conteo honesto del fixture de prueba.

## 10. Algoritmo de vigencia

Paridad con `venceTone` (`SehOperacionBoard`): diferencia en días UTC a `now` inyectable.

| Estado | Regla |
|--------|--------|
| `VENCIDO` | días < 0 |
| `POR_VENCER` | 0..30 inclusive |
| `VIGENTE` | > 30 |
| `SIN_FECHA` | nula / no parseable (`sehParseVence`) |

`SIN_FECHA` nunca es `VIGENTE`. Tests usan `now = 2026-09-16`.

## 11. Entity resolution

Campos: `locacion` (estación/pipa/planta) y `nombre` (SCI).

- case-insensitive, tolerante a acentos
- match exacto de clave normalizada
- match de tokens contiguos solo con ≥2 tokens o un token con dígito (`eco 39`)
- un token suelto (`cuesta`, `pie`) no resuelve
- no fuzzy Levenshtein

Resuelve: `Pie de la Cuesta`, `PIÉ DE LA CUESTA`, `ECO 39`, `cuarto de control`.

Frases de dominio (`sistema contra incendio`, `sin fecha`, `la planta`) no se capturan como entidad.

## 12. Continuidad conversacional

`seh_operation_status` es inheritable. Follow-ups:

- `¿Y cuál es su estatus?`
- `¿Hay alguno vencido?`
- `¿Cuál vence primero?`
- `¿Están vigentes los del ECO 39?`

heredan SEH + scope + entidad. `conversation_state` guarda `parent_intent`, `active_subtopic` (scope) y `display` de entidad.

No hereda si hay planta/entidad/dominio explícito incompatible, o si cambia `planta_id` (sanitize vacía entidades).

Gasto (`gastó`/`gastos`/`gasté`) no entra a SEH: `¿cuánto se gastó en extintores en febrero?` sigue en Expense Analytics.

## 13. Familia semántica (no intents por frase)

Un intent: `seh_operation_status`.

`scope` × `metric` × `entity`.

Métricas: `COUNT` `LIST` `STATUS` `EXPIRED` `EXPIRING_SOON` `NEXT_EXPIRATION`.

## 14. 40 frases de aceptación

Battery 1 — planta (20/20):

| # | Frase | scope | metric |
|---|-------|-------|--------|
| 1 | ¿Cuántas estaciones tenemos en Acapulco? | STATION | COUNT |
| 2 | ¿Cuántas estaciones de carburación hay en Acapulco? | STATION | COUNT |
| 3 | Dime el número de estaciones que tenemos en Acapulco | STATION | COUNT |
| 4 | ¿Cuáles son nuestras estaciones de Acapulco? | STATION | LIST |
| 5 | ¿Cómo están los extintores de las estaciones de Acapulco? | STATION | STATUS |
| 6 | ¿Están vigentes los extintores de las estaciones en Acapulco? | STATION | STATUS |
| 7 | ¿Tenemos algún extintor vencido en las estaciones de Acapulco? | STATION | EXPIRED |
| 8 | ¿Qué extintores de estaciones están por vencer en Acapulco? | STATION | EXPIRING_SOON |
| 9 | ¿Cuántas pipas tenemos en Acapulco? | AUTOTANK | COUNT |
| 10 | ¿Cuántos autotanques tenemos en Acapulco? | AUTOTANK | COUNT |
| 11 | Dime cuántas unidades de autotanque hay en Acapulco | AUTOTANK | COUNT |
| 12 | ¿Cuáles son las pipas de Acapulco? | AUTOTANK | LIST |
| 13 | ¿Cómo están los extintores de los autotanques de Acapulco? | AUTOTANK | STATUS |
| 14 | ¿Están vigentes todos los extintores de las pipas de Acapulco? | AUTOTANK | STATUS |
| 15 | ¿Hay alguna pipa con extintor vencido en Acapulco? | AUTOTANK | EXPIRED |
| 16 | ¿Qué extintores de los autotanques vencen pronto? | AUTOTANK | EXPIRING_SOON |
| 17 | ¿Cómo están los extintores de la planta de Acapulco? | PLANT | STATUS |
| 18 | ¿Cuál es el estatus del sistema contra incendio de Acapulco? | FIRE_SYSTEM | STATUS |
| 19 | ¿Están vigentes los extintores de Acapulco? | ALL_EXTINGUISHERS | STATUS |
| 20 | Dame el estatus de seguridad contra incendio de Acapulco | ALL_SEH | STATUS |

Battery 2 — Pie de la Cuesta (20/20): las 20 frases de `acceptance_suite_location_specific` → `STATION` + entidad `pie de la cuesta`. 1–8 `COUNT`; el resto `STATUS` / `EXPIRED` / `EXPIRING_SOON` según el enunciado.

Adicionales:

- ECO 39 → `AUTOTANK` COUNT = 3 extintores; follow-up vigencia hereda unidad
- cuarto de control → `PLANT` STATUS = 2
- vence primero en la planta → `NEXT_EXPIRATION` (fixture 2026-09-20)
- SCI sin fecha → nombra `Hidrante norte`

Formato de respuesta (concepto): `Pie de la Cuesta tiene N extintores registrados: X vigentes, Y por vencer, Z vencidos y W sin fecha.` Si hay vencidos/por vencer, se listan ubicación/equipo + fecha.

## 15. Regresiones

| Suite | Resultado |
|-------|-----------|
| `test/director-ia-seh-operation-status.test.js` | 15/15 |
| Expense core + keyword genérico | pass (extintores+gasto no cae a SEH) |
| Greeting identidad | pass |
| EXECUTIVE_STATUS (CEL) | pass |
| DIAGNOSIS | pass |
| smalltalk `hola` | pass |

No se tocó el schema. No hay números productivos inventados.

## 16. Diff conceptual

```
antes:
  Director IA no leía public.seh_equipos
  fetchSehBoard solo alimentaba el dashboard

después:
  misma SELECT / misma planta / mismas categorías
  SEH_OPERATION_STATUS = scope × metric × entity
  COUNT estaciones/pipas = DISTINCT locacion
  COUNT extintores = renglones
  vigencia = venceTone (now inyectable)
  ALL_EXTINGUISHERS = ESTACIONES+PIPAS+PLANTA
  ALL_SEH = eso + SCI
  continuidad por conversation_state
  gasto+extintores permanece en Expense Analytics
```

Archivos:

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-seh-operation-status.js` | adapter read-only |
| `lib/director-ia-planner.js` | intent `seh_operation_status` |
| `lib/director-ia-capabilities.js` | dominio `seh_equipos` canRead |
| `lib/director-ia-conversation-state.js` | intent inheritable |
| `lib/director-ia-chat.js` | handler in-process + follow-up |
| `test/director-ia-seh-operation-status.test.js` | contrato + 40 frases + regresiones |
| `docs/dev-loop/CURRENT_TASK.md` | solo `status` |
| este reporte | auditoría |

## 17. STOP

Rama autorizada únicamente. Sin merge a `main`. Sin deploy. Sin siguiente tarea.
