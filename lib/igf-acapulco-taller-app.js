'use strict';

const {createHash, timingSafeEqual} = require('node:crypto');
const sha = v => createHash('sha256').update(v).digest();
const devicePattern = /^[A-Za-z0-9_-]{8,64}$/;
const keyPattern = /^[A-Za-z0-9_-]{43,128}$/;
const integer = v => Number.isSafeInteger(v) && v > 0 && v <= 2147483647;
const validDate = s => typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s)
  && Number.isFinite(Date.parse(s)) && new Date(Date.parse(s)).toISOString().slice(0,10) === s;
const keys = new Set(['v','id','seq','unitId','at','kind','section','claimedCompany']);
const answer = (status, code) => ({status, code});

function parse(body, now) {
  if (!body || Array.isArray(body) || Object.keys(body).some(k=>!keys.has(k)) ||
      body.v !== 1 || typeof body.id !== 'string' || !/^[0-9a-f]{32}$/.test(body.id) ||
      !integer(body.seq) || !integer(body.unitId) || typeof body.at !== 'string' ||
      !validDate(body.at.slice(0,10)) || !/^T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d-06:00$/.test(body.at.slice(10)) ||
      Date.parse(body.at) > now() + 300000 || !['entry','exit'].includes(body.kind) ||
      (body.kind === 'entry' ? !['Mayor','Menor'].includes(body.section) : body.section != null) ||
      (body.claimedCompany != null && !['E9','E10'].includes(body.claimedCompany))) return null;
  return {id:body.id, seq:body.seq, unitId:body.unitId, at:body.at.slice(0,19), kind:body.kind,
    section:body.section ?? null, claimedCompany:body.claimedCompany ?? null};
}

function createReceiver({db, device, secret, now=Date.now}) {
  if (!devicePattern.test(device || '') || !keyPattern.test(secret || '')) return null;
  const expected = sha('Bearer '+secret);
  return async (authorization, body) => {
    if (typeof authorization !== 'string' || authorization.length > 135 ||
        !timingSafeEqual(sha(authorization), expected)) return answer(401,'NOT_ALLOWED');
    const e = parse(body, now);
    if (!e) return answer(422,'INVALID_MOVEMENT');
    const fingerprint = sha(JSON.stringify(e)).toString('hex');
    const p = [device,e.id,e.seq,e.unitId,e.at,e.kind,e.section,e.claimedCompany,fingerprint];
    // One statement: resolves the roster and inserts once even under concurrent retries.
    const saved = await db.query(`
      WITH roster AS (
        SELECT eco,CASE unit_type WHEN 'Pipa' THEN 'E9' ELSE 'E10' END AS company
        FROM arr.igf_taller_acapulco_app_roster
        WHERE device=$1 AND unit_id=$4 AND starts_on<=$5::timestamp::date
          AND (ends_before IS NULL OR ends_before>$5::timestamp::date)
      ), match AS (
        SELECT count(*)::int AS n,min(eco) AS eco,min(company) AS company FROM roster
      ), candidate AS (
        SELECT eco,company,CASE WHEN n=0 THEN 'sin_asignar' WHEN n>1 THEN 'asignacion_ambigua'
          WHEN $8::text IS NOT NULL AND $8<>company THEN 'empresa_no_coincide' END AS reason FROM match
      )
      INSERT INTO arr.igf_taller_acapulco_app_event
        (device,event_id,seq,unit_id,occurred,movement,section,claimed_company,fingerprint,company,eco,held_reason)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,
        CASE WHEN reason IS NULL THEN company END,CASE WHEN reason IS NULL THEN eco END,reason
      FROM candidate ON CONFLICT DO NOTHING RETURNING held_reason`,p);
    if (saved.rows.length) return answer(201,saved.rows[0].held_reason ? 'HELD' : 'SAVED');
    const existing = await db.query(`SELECT event_id,fingerprint,held_reason FROM arr.igf_taller_acapulco_app_event
      WHERE device=$1 AND (event_id=$2 OR seq=$3)`,p.slice(0,3));
    if (existing.rows.length===1 && existing.rows[0].event_id===e.id &&
        existing.rows[0].fingerprint===fingerprint) return answer(200,existing.rows[0].held_reason ? 'HELD' : 'DUPLICATE');
    return answer(409,'MOVEMENT_CONFLICT');
  };
}

// A pilot overlay is evidence for observed movement dates only. It cannot attest whole-day coverage.
// Preserve Excel rows and their folio fields; archive and cylinders are never input for IGF.
async function readPilot(db, device, from, cutoff, base) {
  if (!devicePattern.test(device || '') || !validDate(from) || !validDate(cutoff) ||
      from>cutoff || Date.parse(cutoff)-Date.parse(from)>31*86400000 ||
      (base && (base.plant!=='Acapulco' || !Array.isArray(base.reports)))) return base;
  const r = await db.query(`SELECT seq,unit_id AS "unitId",company,eco,movement,section,held_reason,
     to_char(occurred,'YYYY-MM-DD') AS date FROM arr.igf_taller_acapulco_app_event
     WHERE device=$1 AND occurred<$2::date+1 ORDER BY seq LIMIT 5001`,[device,cutoff]);
  const rows = r.rows;
  if (!rows.length || rows.length>5000 || rows.some((e,i)=>e.seq!==i+1)) return base;
  const source=base||{plant:'Acapulco',reports:[]};
  const states=new Map(), byUnit=new Map(), suspect=new Set();
  for (const e of rows) {
    if (e.held_reason) { suspect.add(e.unitId); continue; }
    if(e.company!=='E9')continue;
    const prev=states.get(e.unitId), other=byUnit.get(e.eco);
    if (other!=null && other!==e.unitId) {suspect.add(other);suspect.add(e.unitId);}
    byUnit.set(e.eco,e.unitId);
    if ((!prev && e.movement!=='entry') || (prev && (prev.date>e.date || prev.eco!==e.eco ||
        prev.movement===e.movement))) suspect.add(e.unitId);
    states.set(e.unitId,e);
  }
  const days=new Map();
  for (const e of rows) {
    if (e.company!=='E9' || suspect.has(e.unitId) || e.date<from)continue;
    if (!days.has(e.date)) days.set(e.date,new Map());
    // A closing movement on its own still attests part of that day, not downtime for the day.
    const units=days.get(e.date);
    if (!units.has(e.eco) || e.section) units.set(e.eco,e.section||null);
  }
  if (!days.size) return base;
  const reports = source.reports.map(r=>r);
  for (const [date, additions] of days) {
    const index=reports.findIndex(r=>r.entity==='E9' && r.date===date);
    const old=index===-1?null:reports[index];
    const units=new Map((old?.units||[]).map(u=>[u.eco,u]));
    for (const [eco,section] of additions) if(!units.has(eco)) {
      units.set(eco,{eco,kind:'Pipa',section,fullDayOut:false,pilotMovement:true,source:'App de taller Acapulco'});
    }
    if (old && old.units.length===units.size) continue;
    const sorted=[...units.values()].sort((a,b)=>a.eco.localeCompare(b.eco));
    const report={...old,entity:'E9',date,units:sorted,row_count:sorted.length,
      sha256:sha(JSON.stringify([old?.sha256||null,sorted])).toString('hex'),partialCoverage:!old};
    if (index===-1)reports.push(report);else reports[index]=report;
  }
  return {...source,reports:reports.sort((a,b)=>a.date.localeCompare(b.date)||a.entity.localeCompare(b.entity))};
}

const PILOT_PATH='/api/integraciones/igf/taller/acapulco/v1/movimientos';

function pilotDevice(env=process.env) {
  return ['development','test'].includes(env.NODE_ENV) && env.IGF_ACAPULCO_TALLER_PILOT==='1' &&
    devicePattern.test(env.IGF_ACAPULCO_TALLER_DEVICE||'') &&
    keyPattern.test(env.IGF_ACAPULCO_TALLER_SECRET||'') ? env.IGF_ACAPULCO_TALLER_DEVICE : null;
}

function mountPilot(app, {db, json, env=process.env, now=Date.now}) {
  const device=pilotDevice(env);
  if (!device) return false;
  const receiver=createReceiver({db,device,secret:env.IGF_ACAPULCO_TALLER_SECRET,now});
  const parseJson=json({limit:'4kb',inflate:false});
  app.post(PILOT_PATH, (req,res)=>{
    res.set('Cache-Control','no-store');
    if (!req.is('application/json')) return res.status(415).json({code:'JSON_REQUIRED'});
    parseJson(req,res,async e=>{
      if(e) return res.status([413,415].includes(e.status)?e.status:400).json({code:'INVALID_BODY'});
      try {
        const {status,code}=await receiver(req.headers.authorization,req.body);
        return res.status(status).json({code});
      } catch {
        return res.status(503).json({code:'WORKSHOP_UNAVAILABLE'});
      }
    });
  });
  return true;
}

module.exports={createReceiver,readPilot,pilotDevice,mountPilot,PILOT_PATH};
