"use strict";

/**
 * Delta Ingreso AI: persistencia (outbox, inbox, actions, summary ZP).
 * No toca tablas existentes del proyecto.
 */

async function ensureDeltaIngresoAiSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_outbox (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      plant_code VARCHAR(100) NOT NULL,
      to_phone VARCHAR(50) NOT NULL,
      kind VARCHAR(30) NOT NULL,
      payload_json JSONB,
      text TEXT,
      sent_at TIMESTAMPTZ,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    );
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_inbox (
      id SERIAL PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      from_phone VARCHAR(50) NOT NULL,
      plant_code VARCHAR(100),
      text TEXT NOT NULL,
      raw_payload_json JSONB
    );
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_actions (
      id SERIAL PRIMARY KEY,
      plant_code VARCHAR(100) NOT NULL,
      cliente_norm VARCHAR(255) NOT NULL,
      periodo_a VARCHAR(7) NOT NULL,
      periodo_b VARCHAR(7) NOT NULL,
      negative_type VARCHAR(30) NOT NULL,
      what TEXT,
      why_tag VARCHAR(50),
      why_detail TEXT,
      where_text TEXT,
      when_date DATE,
      who TEXT,
      how_steps_json JSONB,
      how_much_impact_kg NUMERIC,
      how_much_impact_mxn NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action_status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
      last_update_text TEXT,
      last_update_at TIMESTAMPTZ,
      closed_confirmed_by VARCHAR(50),
      closed_confirmed_at TIMESTAMPTZ,
      UNIQUE(plant_code, cliente_norm, periodo_a, periodo_b)
    );
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_summary_zp (
      date DATE NOT NULL PRIMARY KEY,
      periodo_a VARCHAR(7) NOT NULL,
      periodo_b VARCHAR(7) NOT NULL,
      text TEXT NOT NULL,
      metrics_json JSONB,
      sent_at TIMESTAMPTZ
    );
  `).catch(() => {});
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_queries_zp (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      zp_phone VARCHAR(50),
      question TEXT NOT NULL,
      answer TEXT,
      sources_json JSONB
    );
  `).catch(() => {});
  await client.query(`
    ALTER TABLE public.delta_ingreso_ai_queries_zp ADD COLUMN IF NOT EXISTS actor_role VARCHAR(20);
  `).catch(() => {});
}

async function getProvinciaPlantsWithPlantaId(client) {
  const r = await client.query(`
    SELECT ap.plant_code, p.id AS planta_id
    FROM arr.provincia_plants ap
    JOIN public.plantas p ON (
      UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
      OR (p.clave IS NOT NULL AND TRIM(p.clave) <> '' AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
    )
    WHERE UPPER(TRIM(COALESCE(p.nombre,''))) != 'CORPORATIVO'
      AND UPPER(TRIM(COALESCE(p.clave,''))) != 'CORPORATIVO'
    ORDER BY ap.plant_code
  `);
  return r.rows || [];
}

async function insertOutbox(client, row) {
  const r = await client.query(
    `INSERT INTO public.delta_ingreso_ai_outbox (date, plant_code, to_phone, kind, payload_json, text, status)
     VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5, $6, 'PENDING')
     RETURNING id, date, plant_code, to_phone, kind, text, status`,
    [
      row.date || null,
      row.plant_code,
      row.to_phone,
      row.kind,
      row.payload_json ? JSON.stringify(row.payload_json) : null,
      row.text || null,
    ]
  );
  return r.rows[0];
}

async function updateOutboxSent(client, id, sentAt) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_outbox SET sent_at = $1, status = 'SENT' WHERE id = $2`,
    [sentAt || new Date(), id]
  );
}

async function insertInbox(client, row) {
  const r = await client.query(
    `INSERT INTO public.delta_ingreso_ai_inbox (from_phone, plant_code, text, raw_payload_json)
     VALUES ($1, $2, $3, $4) RETURNING id, received_at`,
    [row.from_phone, row.plant_code || null, row.text, row.raw_payload_json ? JSON.stringify(row.raw_payload_json) : null]
  );
  return r.rows[0];
}

async function getOpenActionsByPlant(client, plantCode, periodoA, periodoB) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, periodo_a, periodo_b, negative_type, what, why_tag, when_date, who, action_status, last_update_at
     FROM public.delta_ingreso_ai_actions
     WHERE plant_code = $1 AND periodo_a = $2 AND periodo_b = $3
       AND action_status IN ('OPEN','IN_PROGRESS','RISK')
     ORDER BY created_at ASC`,
    [plantCode, periodoA, periodoB]
  );
  return r.rows || [];
}

async function getActionsForSummary(client, periodoA, periodoB) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, negative_type, what, when_date, who, action_status, closed_confirmed_at
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2
     ORDER BY plant_code, cliente_norm`,
    [periodoA, periodoB]
  );
  return r.rows || [];
}

async function upsertAction(client, plan) {
  const steps = plan.how_steps && (Array.isArray(plan.how_steps) ? plan.how_steps : [plan.how_steps]);
  await client.query(
    `INSERT INTO public.delta_ingreso_ai_actions (
      plant_code, cliente_norm, periodo_a, periodo_b, negative_type,
      what, why_tag, why_detail, where_text, when_date, who, how_steps_json,
      how_much_impact_kg, how_much_impact_mxn, action_status, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,$13,$14,'OPEN',NOW())
    ON CONFLICT (plant_code, cliente_norm, periodo_a, periodo_b)
    DO UPDATE SET
      what = EXCLUDED.what, why_tag = EXCLUDED.why_tag, why_detail = EXCLUDED.why_detail,
      where_text = EXCLUDED.where_text, when_date = EXCLUDED.when_date, who = EXCLUDED.who,
      how_steps_json = EXCLUDED.how_steps_json, how_much_impact_kg = EXCLUDED.how_much_impact_kg,
      how_much_impact_mxn = EXCLUDED.how_much_impact_mxn, updated_at = NOW()`,
    [
      plan.plant_code,
      plan.cliente_norm,
      plan.periodo_a || plan.periodoA,
      plan.periodo_b || plan.periodoB,
      plan.negative_type || "NO_COMPRAN",
      plan.what || null,
      plan.why_tag || null,
      plan.why_detail || null,
      plan.where_text || null,
      plan.when_date || null,
      plan.who || null,
      steps ? JSON.stringify(steps) : null,
      plan.how_much_impact_kg != null ? plan.how_much_impact_kg : null,
      plan.how_much_impact_mxn != null ? plan.how_much_impact_mxn : null,
    ]
  );
}

async function markActionClosed(client, plantCode, clienteNorm, periodoA, periodoB, confirmedBy) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_actions
     SET action_status = 'DONE', closed_confirmed_by = $1, closed_confirmed_at = NOW(), updated_at = NOW()
     WHERE plant_code = $2 AND cliente_norm = $3 AND periodo_a = $4 AND periodo_b = $5`,
    [confirmedBy, plantCode, clienteNorm, periodoA, periodoB]
  );
}

async function saveSummaryZp(client, date, periodoA, periodoB, text, metricsJson, sentAt) {
  await client.query(
    `INSERT INTO public.delta_ingreso_ai_summary_zp (date, periodo_a, periodo_b, text, metrics_json, sent_at)
     VALUES ($1::date, $2, $3, $4, $5, $6)
     ON CONFLICT (date) DO UPDATE SET text = EXCLUDED.text, metrics_json = EXCLUDED.metrics_json, sent_at = EXCLUDED.sent_at`,
    [date, periodoA, periodoB, text, metricsJson ? JSON.stringify(metricsJson) : null, sentAt || null]
  );
}

async function insertQuery(client, row) {
  await client.query(
    `INSERT INTO public.delta_ingreso_ai_queries_zp (zp_phone, actor_role, question, answer, sources_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      row.from_phone || row.zp_phone || null,
      row.actor_role || null,
      row.question,
      row.answer != null ? row.answer : null,
      row.sources_json ? JSON.stringify(row.sources_json) : null,
    ]
  );
}

module.exports = {
  ensureDeltaIngresoAiSchema,
  getProvinciaPlantsWithPlantaId,
  insertOutbox,
  updateOutboxSent,
  insertInbox,
  getOpenActionsByPlant,
  getActionsForSummary,
  upsertAction,
  markActionClosed,
  saveSummaryZp,
  insertQuery,
};
