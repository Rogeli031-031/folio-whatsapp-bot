# Plan de integración: Delta Ingreso AI

**Restricción:** NO modificar nada fuera de Delta Ingreso ni del nuevo módulo. Prohibido tocar: Delta Venta, Delta Descuento, folios, comandos existentes, dashboard general, rutas no relacionadas.

---

## 1. Archivos a CREAR (nuevos)

| Archivo | Propósito |
|---------|-----------|
| `lib/delta-ingreso-ai-db.js` | Tablas (schema run), outbox/inbox/actions/summary_zp/queries_zp: insert, upsert, get por planta y periodo. **No toca tablas existentes.** |
| `lib/delta-ingreso-ai.js` | Servicio: `getProvinciaPlants(client)`, `buildBrief(planta, deltaResult)`, `composeManagerQuestion(brief, openActions)` (OpenAI), `parsePlansByClient(replyText)` (OpenAI), `upsertActions(client, plans)`, `followupRules(actions)`, `composeZPSummary(...)` (OpenAI). Consume resultado Delta Ingreso (misma forma que API); no cambia fórmulas. |
| `docs/DELTA_INGRESO_AI.md` | Documentación mínima del módulo y variables ENV. |

---

## 2. Archivos a MODIFICAR (mínimo)

| Archivo | Cambios exactos |
|---------|------------------|
| `server.js` | 1) **ensureSchema:** añadir creación de las 5 tablas `delta_ingreso_ai_*` (o invocar función de `lib/delta-ingreso-ai-db.js` que las cree). 2) **Refactor mínimo:** extraer lógica actual del handler `POST /api/dashboard/delta-ingreso-datos` en una función interna `getDeltaIngresoDatosInternal(client, planta, periodoA, periodoB, sinRegla8020)`; el handler solo llama a esa función y hace `res.json(data)`. 3) **Rutas nuevas:** montar `POST /api/ai/delta-ingreso/test/send-question-now`, `POST /api/ai/delta-ingreso/test/send-summary-now`, `GET /api/ai/delta-ingreso/test/status`, `GET /api/ai/delta-ingreso/test/help` (estas rutas llaman al servicio en `lib/delta-ingreso-ai.js` y a la DB en `lib/delta-ingreso-ai-db.js`). 4) **Scheduler:** añadir un único job (cron o setInterval con chequeo de hora America/Mexico_City): si `TEST_MODE=true` ejecutar 17:00 y 17:45 solo hoy; si no, 08:00, 11:00, 15:30. 5) **Webhook Twilio:** en `POST /twilio/whatsapp`, después de los comandos existentes y una vez identificado `actor`, si `actor.rol_clave === 'GG'` (o equivalente) y el cuerpo del mensaje parece respuesta a plan 5W2H o contiene "CERRADO: …", llamar a `deltaIngresoAi.handleIncoming(client, fromNorm, body, actor)` y, si devuelve una respuesta para el usuario, hacer `return safeReply(respuesta)`. No cambiar el flujo de otros comandos. |
| `.env.example` | Añadir (si no existen): `TEST_MODE=`, `OPENAI_API_KEY=`, `DELTA_INGRESO_AI_PERIODO_A=2026-01`, `DELTA_INGRESO_AI_PERIODO_B=2026-02`. |

---

## 3. Archivos que NO se tocan

- Cualquier archivo bajo `frontend-dashboard/` (salvo necesidad absoluta; por defecto no tocar).
- `lib/arr-refresh-provincia.js`, `lib/dashboard-auth.js`, `lib/arr-load.js`, etc.
- Handlers de Delta Venta, Delta Descuento, folios, presupuesto, IGF, etc.
- Rutas distintas de `/api/dashboard/delta-ingreso-*` y las nuevas `/api/ai/delta-ingreso/*`.

---

## 4. Tablas nuevas (esquema)

- **`delta_ingreso_ai_outbox`:** id, date, plant_code, to_phone, kind (QUESTION | FOLLOWUP | SUMMARY), payload_json, text, sent_at, status.
- **`delta_ingreso_ai_inbox`:** id, received_at, from_phone, plant_code, text, raw_payload_json.
- **`delta_ingreso_ai_actions`:** id, plant_code, cliente_norm, periodoA, periodoB, negative_type (NO_COMPRAN | MENOS_INGRESO), what, why_tag, why_detail, where_text, when_date, who, how_steps_json, how_much_impact_kg, how_much_impact_mxn, created_at, updated_at, action_status (OPEN | IN_PROGRESS | RISK | DONE | CANCELLED), last_update_text, last_update_at, closed_confirmed_by, closed_confirmed_at.
- **`delta_ingreso_ai_summary_zp`:** date, periodoA, periodoB, text, metrics_json, sent_at.
- **`delta_ingreso_ai_queries_zp`:** (opcional) id, ts, zp_phone, question, answer, sources_json.

Crear en esquema `public` o en un esquema nuevo `arr_ai` según decisión (especificación dice "arr_ai o arr"). Se recomienda `public` para no crear esquema nuevo y reutilizar pool.

---

## 5. Flujo de datos

1. **Obtener datos Delta Ingreso:** Solo consumo. Llamada a `getDeltaIngresoDatosInternal(client, planta, periodoA, periodoB, false)` desde el servicio AI (invocada desde server.js con `client`). No se cambia la fórmula ni las categorías.
2. **Provincia:** Lista de plantas desde `arr.provincia_plants` + join a `public.plantas` para tener `planta_id` y poder llamar a `getUsersByRoleAndPlanta(client, 'GG', planta_id)` (existente en server.js). El servicio recibirá una función `getGerenesByPlanta(client, plantCode)` inyectada desde server.js que use ese mapeo.
3. **WhatsApp:** Reutilizar `sendWhatsApp` (o el helper existente de Twilio) para enviar mensajes; reutilizar webhook para recibir; solo añadir un bloque condicional para GG con contenido 5W2H/CERRADO.

---

## 6. Checklist antes de codificar

- [ ] Confirmar que `getDeltaIngresoDatosInternal` no altera respuesta actual de la API (misma estructura).
- [ ] Confirmar que las nuevas rutas están bajo `/api/ai/delta-ingreso/` y no interfieren con rutas existentes.
- [ ] Confirmar que el webhook solo añade un `if (actor es GG y mensaje parece plan/cierre) { ... }` sin cambiar otros flujos.
- [ ] Si en algún momento se necesita tocar algo fuera de esta lista, **detener** y reportar.
