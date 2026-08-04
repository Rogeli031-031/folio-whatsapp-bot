# Director IA v2 — Fase 1: Veracidad y catálogo de capacidades

## Objetivo

Declarar de forma central qué dominios puede consultar Director IA y responder con honestidad cuando la pregunta apunta a una fuente **todavía no integrada**, sin llamar a OpenAI ni cargar contextos innecesarios.

Esta fase **no** integra fuentes nuevas, no agrega voz, no persiste memoria de conversaciones, no cambia el modelo OpenAI y no modifica `server.js` ni el frontend.

## Archivos creados

| Archivo | Rol |
|---------|-----|
| `lib/director-ia-capabilities.js` | Catálogo, estados de veracidad, detección y respuesta de limitación |
| `scripts/test-director-ia-capabilities.js` | Pruebas de detección (bloqueadas vs permitidas) |
| `docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md` | Esta documentación |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/director-ia-chat.js` | Import del catálogo; early-return en `askDirectorIa` antes de contexto/OpenAI |

## Catálogo de cobertura

Cada dominio declara: `id`, `label`, `coverage`, `accessMode`, `canRead`, `canWrite`, `description`, `limitations`.

### Cobertura (`coverage`)

| Valor | Uso en Fase 1 |
|-------|----------------|
| `complete` | Reserva (ningún dominio de negocio marcado así salvo el producto propio implícito) |
| `partial` | Fuentes ya usadas por context/chat (AR, DICF, bitácora, comentarios, IGF/ARR on-demand, etc.) |
| `indirect` | Reserva |
| `none` | Dominio existente en el dashboard pero no consultado por Director IA |
| `unknown` | Reserva |

### Modo de acceso (`accessMode`)

| Valor | Significado |
|-------|-------------|
| `always` | Disponible al construir contexto de chat |
| `on_demand` | Solo si el routing/regex existente lo activa |
| `related_data_only` | Reserva |
| `not_integrated` | Bloqueo honesto en Fase 1 |
| `restricted` | Canal/acceso limitado (p. ej. WhatsApp como enlace, no como fuente) |

### Dominios legibles (`canRead: true`)

`action_register`, `dicf`, `bitacora`, `mejora_continua`, `cliente_comentarios`, `folio_comentarios`, `entidades_comerciales`, `arr`, `igf`, `commercial_state`

### Dominios no integrados (`canRead: false`, `coverage: none`)

`folios`, `kanban`, `folio_historial`, `documentos`, `cheques`, `polizas`, `presupuestos`, `proyectos`, `clasificacion_apoyos`, `taller_at`, `gastos`, `inversiones`, `delta_venta`, `delta_descuento`, `delta_ingreso`, `duplicados`, `usuarios_admin`  
(`whatsapp`: `partial` / `restricted`, no legible como fuente de datos)

API exportada:

- `getDirectorIaCapability(domainId)`
- `listDirectorIaCapabilities()`
- `isDirectorIaDomainReadable(domainId)`
- `buildDirectorIaCapabilitiesSummary()`
- `detectUnsupportedDirectorIaDomain(question)`
- `buildUnsupportedDomainChatResult(capability, opts)`
- Constantes `SOURCE_*` / `DIRECTOR_IA_VERACITY`

## Reglas de detección

- Sin OpenAI: normalización NFD + minúsculas + reglas regex explícitas.
- Primero se evalúan **intents permitidos** (comentarios de folio/cliente, acciones vencidas, ARR, IGF, bitácora, dejaron de comprar, etc.).
- Luego reglas de bloqueo (etapa/estatus, historial, documentos faltantes, póliza, cheque/depósito, presupuesto semanal, proyectos, taller AT, gastos de folios, inversiones, clasificación, duplicados, usuarios admin).
- La palabra «folio» sola **no** bloquea.

## Contrato de respuesta (limitación)

Cuando hay dominio no integrado, `askDirectorIa` retorna (compatible con el frontend: `answer`, `sources`, `context_meta`) más `limitation` opcional:

```json
{
  "ok": true,
  "answer": "…todavía no está integrado…",
  "sources": [],
  "context_meta": {
    "mode": "capability_limitation",
    "requested_domain": "folio_historial",
    "coverage": "none",
    "access_mode": "not_integrated",
    "openai_called": false,
    "veracity": "SOURCE_NOT_INTEGRATED",
    "planta_id": 1,
    "timestamp": "…"
  },
  "limitation": {
    "code": "SOURCE_NOT_INTEGRATED",
    "domain": "folio_historial",
    "label": "Historial de folios"
  }
}
```

### Estados de veracidad

Definidos: `SOURCE_AVAILABLE`, `SOURCE_PARTIAL`, `SOURCE_NOT_INTEGRATED`, `SOURCE_RESTRICTED`, `SOURCE_ERROR`, `DATA_NOT_FOUND`.

En Fase 1 **solo** `SOURCE_NOT_INTEGRATED` altera automáticamente el flujo del chat.

## Pruebas

```bash
node scripts/test-director-ia-capabilities.js
```

Exit code `0` si pasa, `1` si falla.

Casos mínimos: etapa, último movimiento, documentos, póliza, cheque/depósito, presupuesto, duplicados (bloqueados); acciones vencidas, ARR, IGF, comentarios folio, bitácora, pregunta ambigua (permitidos).

## Limitaciones de la fase

- No integra kanban, historial, documentos, presupuestos, etc.
- No cambia routing regex existente de IGF/ARR/DICF.
- No escribe en base de datos ni ejecuta mutaciones.
- Respuestas de limitación son plantillas (no LLM).
- Detección conservadora: preguntas ambiguas siguen al flujo actual (pueden llamar OpenAI).

## Cómo revertir

1. Quitar el bloque early-return y el `require` de `director-ia-capabilities` en `lib/director-ia-chat.js`.
2. Eliminar o ignorar `lib/director-ia-capabilities.js`, `scripts/test-director-ia-capabilities.js` y este documento.

No hay migraciones ni cambios de frontend que revertir.
