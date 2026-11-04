"use strict";

const ENSURE_SQL = `CREATE TABLE IF NOT EXISTS arr.igf_simulation_proposals (
 id BIGSERIAL PRIMARY KEY, plant_id INTEGER NOT NULL, year SMALLINT NOT NULL,
 month SMALLINT NOT NULL, name VARCHAR(120) NOT NULL, volume_ton NUMERIC NOT NULL,
 discount_kg NUMERIC NOT NULL, basis JSONB NOT NULL, created_by TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS igf_simulation_proposals_period_idx
ON arr.igf_simulation_proposals (plant_id, year, month, id DESC)`;

function parsePeriod(input) {
 const year = Number(input.year), month = Number(input.month);
 if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12)
  return { error: "Selecciona año y mes válidos" };
 return { year, month };
}

function parseProposal(input) {
 const period = parsePeriod(input);
 if (period.error) return period;
 const name = typeof input.name === "string" ? input.name.trim() : "";
 const numeric = value => typeof value === "number" && Number.isFinite(value);
 if (!name || name.length > 120) return { error: "Escribe un nombre de hasta 120 caracteres" };
 if (!numeric(input.volume_ton) || input.volume_ton <= 0 || input.volume_ton > 1000000 ||
     !numeric(input.discount_kg) || input.discount_kg < -100 || input.discount_kg > 100)
  return { error: "Venta o descuento fuera del rango permitido" };
 const b = input.basis;
 if (!b || !numeric(b.a) || Math.abs(b.a) > 1000 || !numeric(b.fixed) || b.fixed < 0 || b.fixed > 1e12 ||
     !["forecast", "igf_diario"].includes(b.mode) || !/^\d{4}-\d{2}-\d{2}$/.test(b.cutoff || ""))
  return { error: "La propuesta requiere supuestos y fecha de corte válidos" };
 const cutoffDate=new Date(`${b.cutoff}T00:00:00Z`);
 if (!Number.isFinite(cutoffDate.getTime()) || cutoffDate.toISOString().slice(0,10)!==b.cutoff)
  return { error: "Fecha de corte inválida" };
 if (b.hg_kg !== undefined && (!numeric(b.hg_kg) || Math.abs(b.hg_kg)>100))
  return { error: "HG fuera del rango permitido" };
 const percentHg=b.hg_pct!==undefined||b.hg_price_kg!==undefined;
 if(percentHg&&(!numeric(b.hg_pct)||Math.abs(b.hg_pct)>1||!numeric(b.hg_price_kg)||b.hg_price_kg<=0||b.hg_price_kg>1000||!numeric(b.hg_kg)||Math.abs(b.hg_kg+b.hg_pct*b.hg_price_kg)>1e-8))
  return { error: "Porcentaje o valoración del HG inválidos" };
 // Only retain financial assumptions, never arbitrary client fields or session tokens.
 return { ...period, name, volume_ton: input.volume_ton, discount_kg: input.discount_kg,
  basis: { a: b.a, fixed: b.fixed, mode: b.mode, cutoff: b.cutoff, version_as_of: b.version_as_of === true,
   ...(b.hg_kg !== undefined ? { hg_kg:b.hg_kg } : {}),
   ...(percentHg?{hg_pct:b.hg_pct,hg_price_kg:b.hg_price_kg}:{}) } };
}

async function list(client, plantId, year, month) {
 await client.query(ENSURE_SQL);
 return (await client.query(`SELECT id, name, volume_ton, discount_kg, basis, created_at, created_by
 FROM arr.igf_simulation_proposals WHERE plant_id=$1 AND year=$2 AND month=$3 ORDER BY id DESC LIMIT 200`,
 [plantId, year, month])).rows;
}

async function save(client, plantId, proposal, actor) {
 await client.query(ENSURE_SQL);
 const p = proposal;
 return (await client.query(`INSERT INTO arr.igf_simulation_proposals
 (plant_id,year,month,name,volume_ton,discount_kg,basis,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
 RETURNING id,name,volume_ton,discount_kg,basis,created_at,created_by`,
 [plantId,p.year,p.month,p.name,p.volume_ton,p.discount_kg,JSON.stringify(p.basis),actor])).rows[0];
}

async function remove(client, plantId, year, month, id) {
 await client.query(ENSURE_SQL);
 return (await client.query(`DELETE FROM arr.igf_simulation_proposals
 WHERE id=$1 AND plant_id=$2 AND year=$3 AND month=$4 RETURNING id`, [id,plantId,year,month])).rowCount > 0;
}
module.exports = { ENSURE_SQL, parsePeriod, parseProposal, list, save, remove };
