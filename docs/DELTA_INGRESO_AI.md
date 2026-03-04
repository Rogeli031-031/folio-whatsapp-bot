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
- `delta_ingreso_ai_queries_zp` – (Opcional) Q&A ZP.

## Flujo

1. **08:00 (o 17:00 en TEST_MODE):** Se obtiene Delta Ingreso por planta (Provincia), se arma brief con top 3 No compran + top 3 −Ingreso, se redacta mensaje con OpenAI y se envía por WhatsApp a cada GG de esa planta.
2. **Gerente responde:** Plan 5W2H por cliente o "CERRADO: <cliente>". El webhook Twilio detecta GG y contenido tipo plan/cierre, llama a `handleIncoming`, parsea con OpenAI y actualiza `delta_ingreso_ai_actions`.
3. **15:30 (o 17:45 en TEST_MODE):** Se arma resumen ejecutivo con OpenAI y se envía a ZP.

## Archivos

- `lib/delta-ingreso-ai-db.js` – Schema y persistencia.
- `lib/delta-ingreso-ai.js` – buildBrief, composeManagerQuestion, parsePlansByClient, composeZPSummary, handleIncoming.
- `server.js` – Rutas, scheduler, webhook (bloque GG + plan/cierre), `getDeltaIngresoDatosInternal` (solo consumo).
