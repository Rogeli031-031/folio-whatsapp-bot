'use strict';
const {createHash,createHmac,randomBytes,timingSafeEqual}=require('node:crypto');
const {parseWorkbook}=require('./igf-acapulco-taller-xlsx');
const SCOPE='Acapulco';
const fail=(status,code)=>{throw Object.assign(Error(code),{status,code});};
const key=randomBytes(32);
function signed(b){return createHmac('sha256',key).update(b).digest('base64url');}
function seal(data){const b=Buffer.from(JSON.stringify(data)).toString('base64url');return b+'.'+signed(b);}
function open(token){
 if(typeof token!=='string'||token.length>1024)return null;
 const [b,mac,x]=token.split('.');
 if(!b||!mac||x!==undefined)return null;
 const actual=Buffer.from(signed(b)),provided=Buffer.from(mac);
 if(actual.length!==provided.length||!timingSafeEqual(actual,provided))return null;
 try{return JSON.parse(Buffer.from(b,'base64url'));}catch{return null;}
}
async function canUpload(db,actorId){
 if(!Number.isInteger(Number(actorId))||Number(actorId)<=0)return false;
 try{
  const r=await db.query(`SELECT 1 FROM arr.igf_taller_operadores o JOIN public.usuarios u ON o.usuario_id=u.id
   WHERE o.plant_code=$1 AND o.usuario_id=$2 AND u.activo=true`,[SCOPE,Number(actorId)]);
  return r.rows.length===1;
 }catch(e){if(e.code==='42P01')return false;throw e;}
}
async function readInput(body,now,parse){
 if(!body||typeof body.xlsx!=='string'||body.xlsx.length>2666668||!/^[a-zA-Z0-9+/]+={0,2}$/.test(body.xlsx))fail(422,'INVALID_XLSX');
 const bytes=Buffer.from(body.xlsx,'base64');if(bytes.toString('base64')!==body.xlsx)fail(422,'INVALID_XLSX');
 if(body.reportDate!==undefined&&(typeof body.reportDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.reportDate)))fail(422,'REPORT_DATE_INVALID');
 const book=await parse(bytes,undefined,body.reportDate), company=book.verifiedLayout==='E9-v1'?'E9':book.verifiedLayout==='E10-v1'?'E10':null;
 if(!company||(body.reportDate!==undefined&&body.reportDate!==book.date)||book.date>now.businessDate||book.records.length>120)fail(422,'INVALID_SOURCE');
 const seen=new Set();
 for(const row of book.records){if(seen.has(row.eco))fail(422,'DUPLICATE_ECO');seen.add(row.eco);}
 return {company,date:book.date,availableDates:(book.availableDates??[book.date]).filter(d=>d<=now.businessDate),records:book.records,excluded:book.excluded||0,layout:book.verifiedLayout,sha:createHash('sha256').update(bytes).digest('hex')};
}
async function insertVersion(pool,actorId,data){
 const db=await pool.connect(); const scope=[SCOPE,data.company,data.date];
 try{
  await db.query('BEGIN');
  const access=await db.query(`SELECT o.usuario_id FROM arr.igf_taller_operadores o JOIN public.usuarios u ON u.id=o.usuario_id
   WHERE o.plant_code=$1 AND o.usuario_id=$2 AND u.activo=true FOR SHARE OF o,u`,[SCOPE,actorId]);
  if(access.rows.length!==1)fail(403,'NOT_ALLOWED');
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended('igf-taller:' || $1 || ':' || $2 || ':' || $3,0))",scope);
  const duplicate=await db.query(`SELECT id,revision FROM arr.igf_taller_reporte_revision
   WHERE plant_code=$1 AND company_code=$2 AND report_date=$3::date AND sha256=$4`,[...scope,data.sha]);
  if(duplicate.rows.length){await db.query('COMMIT');return {...duplicate.rows[0],duplicate:true};}
  const r=await db.query(`INSERT INTO arr.igf_taller_reporte_revision(plant_code,company_code,report_date,sha256,uploaded_by,source_layout,row_count,revision)
   SELECT $1,$2,$3::date,$4,$5,$6,$7,COALESCE(MAX(revision),0)+1 FROM arr.igf_taller_reporte_revision
   WHERE plant_code=$1 AND company_code=$2 AND report_date=$3::date RETURNING id,revision`,[...scope,data.sha,actorId,data.layout,data.records.length]);
  const added=await db.query(`INSERT INTO arr.igf_taller_reporte_unidad(revision_id,eco,section,observations)
   SELECT $1,t.eco,t.section,e.z FROM jsonb_array_elements($2::jsonb) AS e(z) CROSS JOIN LATERAL jsonb_to_record(e.z) AS t(eco text,section text)`,[r.rows[0].id,JSON.stringify(data.records)]);
  if(added.rowCount!==data.records.length)throw Error('WORKSHOP_ROW_COUNT');
  await db.query('COMMIT');return {...r.rows[0],duplicate:false};
 }catch(e){try{await db.query('ROLLBACK')}catch{}throw e;}finally{db.release();}
}
function createUpload({pool,businessDate,parse=parseWorkbook,now=Date.now}){
 return {
  canUpload:actorId=>canUpload(pool,actorId),
  canUploadWithClient:(client,actorId)=>canUpload(client,actorId),
  async preview(actorId,body) {
   if(!await canUpload(pool,actorId))fail(403,'NOT_ALLOWED');
   const data=await readInput(body,{businessDate:businessDate()},parse);
   const confirm=seal({actorId:Number(actorId),company:data.company,date:data.date,sha:data.sha,expires:now()+600000});
   return {company:data.company,date:data.date,availableDates:data.availableDates,rowCount:data.records.length,excluded:data.excluded,units:data.records.map(({eco,section})=>({eco,section})),confirm};
  },
  async confirm(actorId,body){
   if(!await canUpload(pool,actorId))fail(403,'NOT_ALLOWED');
   const token=open(body?.confirm);
   if(!token||token.expires<now()||token.actorId!==Number(actorId))fail(409,'PREVIEW_EXPIRED');
   if(body.reportDate!==undefined&&body.reportDate!==token.date)fail(409,'PREVIEW_CHANGED');
   const data=await readInput({...body,reportDate:token.date},{businessDate:businessDate()},parse);
   if(['company','date','sha'].some(k=>data[k]!==token[k]))fail(409,'PREVIEW_CHANGED');
   return insertVersion(pool,Number(actorId),data);
  }
 };
}
async function readReport(db,from,cutoff,{showFolioCandidates=false}={}){
 try{
  const schema=await db.query("SELECT to_regclass('arr.igf_taller_reporte_revision') IS NOT NULL AND to_regclass('arr.igf_taller_reporte_unidad') IS NOT NULL AS ready");
  if(schema.rows[0]?.ready!==true)return null;
  const r=await db.query(`WITH versions AS (
   SELECT DISTINCT ON (company_code,report_date) id,company_code,report_date,sha256,row_count
   FROM arr.igf_taller_reporte_revision WHERE plant_code='Acapulco' AND report_date BETWEEN $1::date AND $2::date
   ORDER BY company_code,report_date,revision DESC
  )
  SELECT v.company_code AS entity,v.report_date::text AS date,v.sha256,v.row_count,
   coalesce(jsonb_agg(u.observations ORDER BY u.eco) FILTER (WHERE u.eco IS NOT NULL),'[]'::jsonb) AS units
  FROM versions v LEFT JOIN arr.igf_taller_reporte_unidad u ON u.revision_id=v.id GROUP BY 1,2,3,4 ORDER BY 2,1`,[from,cutoff]);
  if(r.rows.some(x=>x.units.length!==x.row_count))return null;
  if(showFolioCandidates){
   const refs=r.rows.flatMap(({entity,date,units})=>units.map(unit=>({entity,date,eco:unit.eco})));
   if(refs.length){
    const candidates=await db.query(`WITH keys AS (SELECT DISTINCT * FROM jsonb_to_recordset($1::jsonb) AS k(entity text,date date,eco text))
     SELECT k.entity,k.date::text AS date,k.eco,jsonb_agg(DISTINCT f.numero_folio) as folios
     FROM keys k JOIN public.plantas p ON p.clave=k.entity
     JOIN public.folios f ON f.planta_id=p.id
      AND substring(upper(trim(f.unidad)) from '^(?:AT[- ]?|T[- ]?)0*([1-9][0-9]{0,3})$')
          = ltrim(substr(k.eco,4),'0')
      AND NOT COALESCE(f.solo_zp_ad,false) AND NOT COALESCE(f.override_planta,false)
      AND f.numero_folio ~ '^F-[0-9]{6}-[0-9]+$'
      AND (f.creado_en AT TIME ZONE 'America/Mexico_City')::date BETWEEN k.date-90 AND k.date
     LEFT JOIN public.categorias cat ON cat.id=f.categoria_id
     WHERE COALESCE(lower(cat.clave),'')='taller' OR COALESCE(lower(f.categoria),'')='taller'
     GROUP BY 1,2,3`,[JSON.stringify(refs)]);
    const byKey=new Map(candidates.rows.map(c=>[[c.entity,c.date,c.eco].join('|'),c.folios]));
    for(const {entity,date,units} of r.rows)for(const unit of units)
     unit.folioCandidates=(byKey.get([entity,date,unit.eco].join('|'))||[]).sort().slice(0,12);
   }
  }
  return {plant:SCOPE,reports:r.rows};
 }catch(e){if(e.code==='42P01')return null;throw e;}
}
module.exports={createUpload,readReport};
