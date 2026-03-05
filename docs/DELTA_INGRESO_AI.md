# Delta Ingreso AI

Módulo aislado: WhatsApp + OpenAI para reducir negativos (No compran, −Ingreso) con planes 5W2H por cliente y seguimiento. **No modifica** fórmulas, categorías ni 80/20 de Delta Ingreso; solo consume la API existente.

## Variables de entorno

| Variable | Descripción |
|---------|-------------|
| `TEST_MODE` | `true` = modo prueba: envío 17:00 y resumen 17:45 (America/Mexico_City). `false` o no definido = producción: 08:00, 11:00, 15:30. |
| `OPENAI_API_KEY` | Clave API OpenAI para redacción de mensajes y parseo 5W2H. |
| `DELTA_INGRESO_AI_PERIODO_A` | Periodo A (default `2026-01`). |
| `DELTA_INGRESO_AI_PERIODO_B` | Periodo B (default `2026-02`). |

## Endpoints de prueba

- `GET /api/ai/delta-ingreso/test/help` – Guía paso a paso (Luis).
- `GET /api/ai/delta-ingreso/test/status` – Conteos outbox/actions y última ejecución.
- `POST /api/ai/delta-ingreso/test/send-question-now` – Envía ahora la pregunta a gerentes (top negativos + 5W2H).
- `POST /api/ai/delta-ingreso/test/send-summary-now` – Envía ahora el resumen a ZP.

## Tablas (public)

- `delta_ingreso_ai_outbox` – Mensajes enviados (QUESTION / FOLLOWUP / SUMMARY).
- `delta_ingreso_ai_inbox` – Respuestas recibidas.
- `delta_ingreso_ai_actions` – Planes 5W2H por cliente (OPEN / IN_PROGRESS / RISK / DONE / CANCELLED). Cierre solo cuando el gerente confirma "CERRADO: <cliente>".
- `delta_ingreso_ai_summary_zp` – Resúmenes diarios enviados a ZP.
- `delta_ingreso_ai_queries_zp` – Q&A ZP y GG (preguntas sobre Delta Ingreso); incluye columna `actor_role` (ZP/GG).

## Flujo

1. **08:00 (o 17:00 en TEST_MODE):** Se obtiene Delta Ingreso por planta (Provincia), se arma brief con top 3 No compran + top 3 −Ingreso, se redacta mensaje con OpenAI y se envía por WhatsApp a cada GG de esa planta.
2. **Gerente responde:** Plan 5W2H por cliente o "CERRADO: <cliente>". El webhook Twilio detecta GG y contenido tipo plan/cierre, llama a `handleIncoming`, parsea con OpenAI y actualiza `delta_ingreso_ai_actions`.
3. **15:30 (o 17:45 en TEST_MODE):** Se arma resumen ejecutivo con OpenAI y se envía a ZP.

4. **Q&A:** ZP y GG pueden escribir por WhatsApp cualquier pregunta; la IA responde **solo** sobre Delta Ingreso (periodos y datos del contexto). Se guarda en `delta_ingreso_ai_queries_zp` (campo `actor_role`).

5. **“Preguntale al GG y me informas”:** ZP puede pedir que se le pregunte algo a un gerente y se le avise cuando responda. Ejemplos: “Preguntale al gerente de Puebla: ¿cuándo esperan recuperar al cliente X?” o “Preguntale al GG y me informas en cuanto tengas la información”. La IA extrae planta (o “todos”) y la pregunta; se envía por WhatsApp al GG; cuando el GG responde, se reenvía esa respuesta a ZP y se confirma al GG. Tabla: `delta_ingreso_ai_zp_asks_gg`.

## Comandos "di" (Delta Ingreso)

Todos los comandos se invocan con prefijo `di ` (ej. `di peores`). **Si el mensaje no empieza con `di `, no se ejecuta ningún comando nuevo.** También se admite **modo natural** para frases que claramente piden datos de Delta Ingreso (sin palabras de folios): se traduce internamente a un comando `di ...`.

### Resumen / Riesgo / Oportunidades
- `di resumen provincia` – Total negativos, top 3 plantas, top 5 clientes, acciones (abiertas/bloqueadas/cerradas hoy).
- `di resumen {planta}` – Totales por categoría (No compran, −Ingreso, Nuevos, +Ingreso), top 3 afectados, acciones.
- `di riesgo provincia` / `di riesgo {planta}` – Top 10 riesgos (NO_COMPRA, CAIDA_VOL, BLOQUEO).
- `di oportunidades provincia` / `di oportunidades {planta}` – Top 10 oportunidades (+Ingreso ≥30k, Nuevos tonB≥5).

### Director (foco / seguimiento / hoy)
- `di foco provincia [topN]` / `di foco {planta} [topN]` – 80/20 negativos (clientes que explican ~80% del total negativo).
- `di seguimiento provincia` / `di seguimiento {planta}` – Acciones por estado, responsables, más urgentes sin update.
- `di hoy provincia` / `di hoy {planta}` – Cerradas hoy, actualizadas hoy, nuevos bloqueos, vencidas.

### Otros
- `di ayuda` – Lista de comandos.
- `di periodos` / `di set periodos A=YYYY-MM B=YYYY-MM` – Periodos.
- `di peores` – Plantas con mayor impacto.
- `di no compran` / `di menos ingreso` / `di nuevos` / `di mas ingreso` + {planta} [topN].
- `di detalle top {planta}` – Detalle venta/descuento top 3.
- `di venta descuento [planta] topN` – Venta y descuento por mes.
- `di cliente [planta] {nombre}` – Búsqueda por cliente.
- `di crear accion {planta} {cliente}` – Crea acción.
- `di 5w2h #ID` | `di actualizar #ID campo=valor` | `di pendientes [planta]` | `di cerrar #ID [motivo]`.
- `di causa [planta] [topN]` – Agrupación por why_tag.
- `di mix {planta}` – % negativos No compran vs −Ingreso.
- `di causas` / `di bloqueos` / `di vencidas` / `di semaforo` / `di kpis` + [provincia|planta].

## Pruebas manuales sugeridas

Probar por WhatsApp (o simular body en webhook). **Confirmar que si el mensaje NO empieza con `di ` no se ejecuta ningún comando nuevo.**

### Obligatorias (resumen / riesgo / oportunidades / foco / seguimiento / hoy)
1. `di resumen provincia`
2. `di resumen queretaro`
3. `di riesgo provincia`
4. `di riesgo morelos`
5. `di oportunidades provincia`
6. `di oportunidades puebla`
7. `di foco provincia`
8. `di foco queretaro`
9. `di seguimiento provincia`
10. `di seguimiento queretaro`
11. `di hoy provincia`
12. `di hoy queretaro`

### Otras
13. `di peores` | `di detalle top queretaro` | `di venta descuento queretaro top3`
14. `di no compran puebla top5` | `di cliente morelos granjas`
15. `di crear accion queretaro plant factory` | `di 5w2h #1` | `di actualizar #1 why_tag=INVENTARIO` | `di pendientes queretaro` | `di cerrar #1 "recuperado"`
16. Frase natural: *¿cuáles son los peores?* – debe responder como `di peores` (modo natural).

## Archivos

- `lib/delta-ingreso-ai-db.js` – Schema y persistencia.
- `lib/delta-ingreso-commands.js` – Parser y ejecutor de comandos `di`, modo natural, preferencias periodo.
- `lib/delta-ingreso-ai.js` – buildBrief, composeManagerQuestion, parsePlansByClient, composeZPSummary, handleIncoming.
- `server.js` – Rutas, scheduler, webhook (bloque GG + plan/cierre), `getDeltaIngresoDatosInternal` (solo consumo).
