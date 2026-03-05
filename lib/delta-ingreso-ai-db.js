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
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.delta_ingreso_ai_zp_asks_gg (
      id SERIAL PRIMARY KEY,
      zp_phone VARCHAR(50) NOT NULL,
      plant_code VARCHAR(100) NOT NULL,
      question_text TEXT NOT NULL,
      gg_phone VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING_GG',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      answered_at TIMESTAMPTZ,
      answer_text TEXT
    );
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

async function insertZPAskGG(client, row) {
  const r = await client.query(
    `INSERT INTO public.delta_ingreso_ai_zp_asks_gg (zp_phone, plant_code, question_text, gg_phone, status)
     VALUES ($1, $2, $3, $4, 'PENDING_GG') RETURNING id, created_at`,
    [row.zp_phone, row.plant_code, row.question_text, row.gg_phone]
  );
  return r.rows[0];
}

async function getPendingZPAskForPlantAndGG(client, plantCode, ggPhone, phoneLast10) {
  const plantNorm = plantCode ? String(plantCode).trim() : "";
  const phoneNorm = ggPhone ? String(ggPhone).trim() : "";
  const last10 = phoneLast10 || (phoneNorm ? phoneNorm.replace(/\D/g, "").slice(-10) : "");
  const r = await client.query(
    `SELECT id, zp_phone, plant_code, question_text FROM public.delta_ingreso_ai_zp_asks_gg
     WHERE status = 'PENDING_GG'
       AND LOWER(TRIM(plant_code)) = LOWER($1)
       AND (gg_phone = $2 OR (LENGTH($3) = 10 AND REGEXP_REPLACE(gg_phone, '\\D', '', 'g') LIKE '%' || $3))
     ORDER BY created_at ASC LIMIT 1`,
    [plantNorm, phoneNorm, last10]
  );
  return r.rows[0] || null;
}

async function markZPAskGGAnswered(client, id, answerText) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_zp_asks_gg SET status = 'ANSWERED', answered_at = NOW(), answer_text = $1 WHERE id = $2`,
    [answerText, id]
  );
}

/** Una acción por planta+cliente+periodos (la más reciente si hubiera duplicados). */
async function getActionByPlantAndCliente(client, plantCode, clienteNorm, periodoA, periodoB) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, action_status, what, why_tag, why_detail, when_date, who,
            last_update_text, last_update_at, how_much_impact_mxn, closed_confirmed_by, closed_confirmed_at
     FROM public.delta_ingreso_ai_actions
     WHERE LOWER(TRIM(plant_code)) = LOWER(TRIM($1))
       AND LOWER(TRIM(cliente_norm)) = LOWER(TRIM($2))
       AND periodo_a = $3 AND periodo_b = $4
     ORDER BY updated_at DESC LIMIT 1`,
    [plantCode, clienteNorm, periodoA, periodoB]
  );
  return (r.rows && r.rows[0]) || null;
}

/** Acciones pendientes (status != DONE) ordenadas por how_much_impact_mxn DESC. */
async function getPendientes(client, periodoA, periodoB) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, action_status, what, when_date, who, how_much_impact_mxn, last_update_text, last_update_at, why_tag
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE'
     ORDER BY how_much_impact_mxn DESC NULLS LAST, plant_code, cliente_norm`,
    [periodoA, periodoB]
  );
  return r.rows || [];
}

/** Acciones cerradas hoy (closed_confirmed_at::date = CURRENT_DATE). */
async function getCerradosHoy(client, periodoA, periodoB) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, closed_confirmed_by, closed_confirmed_at
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2
       AND closed_confirmed_at IS NOT NULL
       AND (closed_confirmed_at AT TIME ZONE 'America/Mexico_City')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date
     ORDER BY closed_confirmed_at DESC`,
    [periodoA, periodoB]
  );
  return r.rows || [];
}

/** Actualiza last_update_text y timestamps. */
async function updateActionUpdate(client, plantCode, clienteNorm, periodoA, periodoB, updateText) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_actions
     SET last_update_text = $1, last_update_at = NOW(), updated_at = NOW()
     WHERE LOWER(TRIM(plant_code)) = LOWER(TRIM($2)) AND LOWER(TRIM(cliente_norm)) = LOWER(TRIM($3)) AND periodo_a = $4 AND periodo_b = $5`,
    [updateText, plantCode, clienteNorm, periodoA, periodoB]
  );
}

/** Marca acción como BLOCKED y registra motivo. */
async function updateActionBlocked(client, plantCode, clienteNorm, periodoA, periodoB, texto) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_actions
     SET action_status = 'BLOCKED', last_update_text = $1, last_update_at = NOW(), updated_at = NOW()
     WHERE LOWER(TRIM(plant_code)) = LOWER(TRIM($2)) AND LOWER(TRIM(cliente_norm)) = LOWER(TRIM($3)) AND periodo_a = $4 AND periodo_b = $5`,
    ["BLOQUEO: " + (texto || "").trim(), plantCode, clienteNorm, periodoA, periodoB]
  );
}

/** Marca acción como IN_PROGRESS (para GG "di plan {cliente}"). */
async function setActionInProgress(client, plantCode, clienteNorm, periodoA, periodoB) {
  await client.query(
    `UPDATE public.delta_ingreso_ai_actions
     SET action_status = 'IN_PROGRESS', updated_at = NOW()
     WHERE LOWER(TRIM(plant_code)) = LOWER(TRIM($1)) AND LOWER(TRIM(cliente_norm)) = LOWER(TRIM($2)) AND periodo_a = $3 AND periodo_b = $4`,
    [plantCode, clienteNorm, periodoA, periodoB]
  );
}

/** Una acción por ID. */
async function getActionById(client, id) {
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, periodo_a, periodo_b, action_status, what, why_tag, why_detail, when_date, who,
            last_update_text, last_update_at, how_much_impact_mxn, how_much_impact_kg, closed_confirmed_by, closed_confirmed_at
     FROM public.delta_ingreso_ai_actions WHERE id = $1`,
    [id]
  );
  return (r.rows && r.rows[0]) || null;
}

/** Crea acción mínima; devuelve id. */
async function createAction(client, row) {
  const r = await client.query(
    `INSERT INTO public.delta_ingreso_ai_actions (
       plant_code, cliente_norm, periodo_a, periodo_b, negative_type, what, action_status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')
     ON CONFLICT (plant_code, cliente_norm, periodo_a, periodo_b)
     DO UPDATE SET what = COALESCE(EXCLUDED.what, delta_ingreso_ai_actions.what), updated_at = NOW()
     RETURNING id`,
    [
      row.plant_code,
      row.cliente_norm,
      row.periodo_a,
      row.periodo_b,
      row.negative_type || "NO_COMPRAN",
      row.what || null,
    ]
  );
  return (r.rows && r.rows[0] && r.rows[0].id) || null;
}

/** Actualiza campos por ID. fields = { why_tag, why_detail, when_date, who, how_much_impact_kg, how_much_impact_mxn, last_update_text, ... } */
async function updateActionById(client, id, fields) {
  const allowed = ["why_tag", "why_detail", "where_text", "when_date", "who", "how_steps_json", "how_much_impact_kg", "how_much_impact_mxn", "last_update_text"];
  const setParts = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k)) continue;
    if (k === "how_steps_json") {
      setParts.push(`${k} = $${i}::jsonb`);
      values.push(v != null ? (typeof v === "string" ? v : JSON.stringify(v)) : null);
    } else if (k === "when_date") {
      setParts.push(`${k} = $${i}::date`);
      values.push(v || null);
    } else {
      setParts.push(`${k} = $${i}`);
      values.push(v);
    }
    i++;
  }
  if (setParts.length === 0) return;
  setParts.push("last_update_at = NOW()", "updated_at = NOW()");
  values.push(id);
  await client.query(
    `UPDATE public.delta_ingreso_ai_actions SET ${setParts.join(", ")} WHERE id = $${i}`,
    values
  );
}

/** Cierra acción por ID; devuelve fila (plant_code, cliente_norm) para notificación. */
async function markActionClosedById(client, id, confirmedBy) {
  const r = await client.query(
    `UPDATE public.delta_ingreso_ai_actions
     SET action_status = 'DONE', closed_confirmed_by = $1, closed_confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $2
     RETURNING id, plant_code, cliente_norm`,
    [confirmedBy, id]
  );
  return (r.rows && r.rows[0]) || null;
}

/** Pendientes con filtro opcional por planta. */
async function getPendientesByPlant(client, periodoA, periodoB, plantCode) {
  if (plantCode) {
    const r = await client.query(
    `SELECT id, plant_code, cliente_norm, action_status, what, when_date, who, how_much_impact_mxn, last_update_text, last_update_at, why_tag
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE' AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))
       ORDER BY how_much_impact_mxn DESC NULLS LAST, cliente_norm`,
      [periodoA, periodoB, plantCode]
    );
    return r.rows || [];
  }
  return getPendientes(client, periodoA, periodoB);
}

/** Agrupa acciones por why_tag con conteo y suma how_much_impact_mxn. soloAbiertas=true => solo OPEN/IN_PROGRESS/BLOCKED. */
async function getCausaByPlant(client, periodoA, periodoB, plantCode, soloAbiertas) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const statusFilter = soloAbiertas ? " AND action_status != 'DONE'" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT COALESCE(why_tag, 'SIN_TAG') AS tag, COUNT(*) AS cnt, SUM(COALESCE(how_much_impact_mxn, 0)) AS sum_mxn
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2${plantFilter}${statusFilter}
     GROUP BY COALESCE(why_tag, 'SIN_TAG')
     ORDER BY sum_mxn ASC`,
    params
  );
  return r.rows || [];
}

const TZ = "America/Mexico_City";

/** Conteos por estado (OPEN, IN_PROGRESS, BLOCKED) y cerradas hoy. */
async function getAccionesCountByStatus(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT action_status, COUNT(*) AS cnt
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2${plantFilter}
       AND action_status IN ('OPEN','IN_PROGRESS','BLOCKED')
     GROUP BY action_status`,
    params
  );
  const counts = { open: 0, in_progress: 0, blocked: 0 };
  (r.rows || []).forEach((row) => {
    const k = row.action_status && row.action_status.toUpperCase();
    if (k === "OPEN") counts.open = parseInt(row.cnt, 10) || 0;
    else if (k === "IN_PROGRESS") counts.in_progress = parseInt(row.cnt, 10) || 0;
    else if (k === "BLOCKED") counts.blocked = parseInt(row.cnt, 10) || 0;
  });
  const r2 = await client.query(
    `SELECT COUNT(*) AS cnt FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2${plantFilter}
       AND closed_confirmed_at IS NOT NULL
       AND (closed_confirmed_at AT TIME ZONE $${params.length + 1})::date = (CURRENT_TIMESTAMP AT TIME ZONE $${params.length + 1})::date`,
    [...params, TZ]
  );
  counts.closedHoy = parseInt((r2.rows && r2.rows[0] && r2.rows[0].cnt) || 0, 10);
  return counts;
}

/** Top responsables (who) con cantidad de acciones abiertas/in_progress/blocked. */
async function getResponsablesAbiertas(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT COALESCE(TRIM(who), 'Sin asignar') AS who, COUNT(*) AS cnt
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE'${plantFilter}
     GROUP BY COALESCE(TRIM(who), 'Sin asignar')
     ORDER BY cnt DESC`,
    params
  );
  return r.rows || [];
}

/** Acciones más viejas sin update (last_update_at NULL o más antiguas), limit. */
async function getMasViejasSinUpdate(client, periodoA, periodoB, plantCode, limit) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode, limit] : [periodoA, periodoB, limit];
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, action_status, when_date, who, last_update_at
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE'${plantFilter}
     ORDER BY last_update_at ASC NULLS FIRST, created_at ASC
     LIMIT $${params.length}`,
    params
  );
  return r.rows || [];
}

/** Acciones actualizadas hoy (last_update_at::date = hoy). */
async function getActualizadasHoy(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, action_status, last_update_text
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE'${plantFilter}
       AND last_update_at IS NOT NULL
       AND (last_update_at AT TIME ZONE $${params.length + 1})::date = (CURRENT_TIMESTAMP AT TIME ZONE $${params.length + 1})::date
     ORDER BY last_update_at DESC`,
    [...params, TZ]
  );
  return r.rows || [];
}

/** Acciones BLOCKED con last_update_at::date = hoy (nuevos bloqueos hoy). */
async function getBloqueosHoy(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status = 'BLOCKED'${plantFilter}
       AND last_update_at IS NOT NULL
       AND (last_update_at AT TIME ZONE $${params.length + 1})::date = (CURRENT_TIMESTAMP AT TIME ZONE $${params.length + 1})::date`,
    [...params, TZ]
  );
  return r.rows || [];
}

/** Acciones vencidas: when_date < hoy y status != DONE. */
async function getVencidas(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, when_date, action_status, who
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status != 'DONE'${plantFilter}
       AND when_date IS NOT NULL AND when_date < (CURRENT_TIMESTAMP AT TIME ZONE $${params.length + 1})::date
     ORDER BY when_date ASC`,
    [...params, TZ]
  );
  return r.rows || [];
}

/** Bloqueos (BLOCKED) con last_update_text y impacto, ordenados por impacto. */
async function getBloqueos(client, periodoA, periodoB, plantCode) {
  const plantFilter = plantCode ? " AND LOWER(TRIM(plant_code)) = LOWER(TRIM($3))" : "";
  const params = plantCode ? [periodoA, periodoB, plantCode] : [periodoA, periodoB];
  const r = await client.query(
    `SELECT id, plant_code, cliente_norm, last_update_text, how_much_impact_mxn
     FROM public.delta_ingreso_ai_actions
     WHERE periodo_a = $1 AND periodo_b = $2 AND action_status = 'BLOCKED'${plantFilter}
     ORDER BY how_much_impact_mxn ASC NULLS LAST`,
    params
  );
  return r.rows || [];
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
  insertZPAskGG,
  getPendingZPAskForPlantAndGG,
  markZPAskGGAnswered,
  getActionByPlantAndCliente,
  getPendientes,
  getCerradosHoy,
  updateActionUpdate,
  updateActionBlocked,
  setActionInProgress,
  getActionById,
  createAction,
  updateActionById,
  markActionClosedById,
  getPendientesByPlant,
  getCausaByPlant,
  getAccionesCountByStatus,
  getResponsablesAbiertas,
  getMasViejasSinUpdate,
  getActualizadasHoy,
  getBloqueosHoy,
  getVencidas,
  getBloqueos,
};
