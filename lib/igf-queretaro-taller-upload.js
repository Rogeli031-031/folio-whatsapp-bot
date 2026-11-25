'use strict';
const {createHash,createHmac,randomBytes,timingSafeEqual}=require('node:crypto');
const {parseWorkbook,absPeriod}=require('./igf-queretaro-taller-xlsx');
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const accessSql='SELECT o.usuario_id FROM arr.igf_queretaro_taller_operador o JOIN public.usuarios u ON u.id=o.usuario_id WHERE u.activo=true AND o.usuario_id=$1';
function createUpload({pool,businessDate,parse=parseWorkbook,now=Date.now}){
 const key=randomBytes(32);
 const sign=token=>createHmac('sha256',key).update(token).digest('base64url');
 function seal(payload){
  const token=Buffer.from(JSON.stringify(payload)).toString('base64url');return token+'.'+sign(token);
 }
 function open(value){
  if(typeof value!=='string'||value.length>1024)return null;
  const [token,mac,extra]=value.split('.');
  if(!token||!mac||extra!==undefined)return null;
  const received=Buffer.from(mac),expected=Buffer.from(sign(token));
  if(received.length!==expected.length||!timingSafeEqual(received,expected))return null;
  try{return JSON.parse(Buffer.from(token,'base64url'));}catch{return null;}
 }
 async function canUpload(actor){
  if(!Number.isSafeInteger(Number(actor))||Number(actor)<1)return false;
  try{return (await pool.query(accessSql,[Number(actor)])).rowCount===1;}
  catch(e){if(e.code==='42P01')return false;throw e;}
 }
 async function read(body){
  const xlsx=body?.xlsx,period=body?.period;
  if(!absPeriod(period)||typeof xlsx!=='string'||xlsx.length>2666668||!/^([A-Za-z0-9+/]+)={0,2}$/.test(xlsx))fail(422,'INVALID_SOURCE');
  const bytes=Buffer.from(xlsx,'base64');
  if(bytes.length>2000000||bytes.toString('base64')!==xlsx)fail(422,'INVALID_XLSX');
  const data=await parse(bytes,period);
  if(data.layout!=='Queretaro-v1'||data.period!==period||!data.cuts.length||data.cuts.length>31||data.cuts.some(c=>c.date>businessDate()))fail(422,'INVALID_SOURCE');
  return {...data,sha:createHash('sha256').update(bytes).digest('hex')};
 }
 async function preview(actor,body){
  if(!await canUpload(actor))fail(403,'NOT_ALLOWED');
  const {sha,period,cuts}=await read(body);
  return {period,cuts:cuts.map(c=>({date:c.date,rowCount:c.records.length,unitCount:c.unitCount,warnings:c.warnings})),
   rowCount:cuts.reduce((n,c)=>n+c.records.length,0),confirm:seal({actor:Number(actor),sha,period,expires:now()+600000})};
 }
 async function confirm(actor,body){
  if(!await canUpload(actor))fail(403,'NOT_ALLOWED');
  const token=open(body?.confirm);
  if(!token||token.expires<=now()||token.actor!==Number(actor)||token.period!==body?.period)fail(409,'PREVIEW_CHANGED');
  if(body.periodConfirmed!==true)fail(422,'CONFIRM_REPORT_PERIOD');
  const data=await read(body);
  if(token.sha!==data.sha)fail(409,'PREVIEW_CHANGED');
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   if((await db.query(accessSql+' FOR SHARE OF o,u',[Number(actor)])).rowCount!==1)fail(403,'NOT_ALLOWED');
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('igf-queretaro-taller:' || $1,0))",[data.period]);
   const results=[];
   for(const cut of data.cuts){
    const found=await db.query("SELECT revision FROM arr.igf_queretaro_taller_revision WHERE report_date=$1::date AND sheet_sha256=$2",[cut.date,cut.sha]);
    if(found.rowCount){results.push({date:cut.date,revision:found.rows[0].revision,duplicate:true});continue;}
    const added=await db.query(`INSERT INTO arr.igf_queretaro_taller_revision(report_date,revision,source_layout,sheet_sha256,workbook_sha256,uploaded_by,row_count,unit_count,warnings)
     SELECT $1::date,COALESCE(MAX(revision),0)+1,$2,$3,$4,$5,$6,$7,$8::jsonb
     FROM arr.igf_queretaro_taller_revision WHERE report_date=$1::date RETURNING id,revision`,
     [cut.date,data.layout,cut.sha,data.sha,Number(actor),cut.records.length,cut.unitCount,JSON.stringify(cut.warnings)]);
    const saved=await db.query(`INSERT INTO arr.igf_queretaro_taller_detalle(revision_id,source_row,kind,unit_code,section,observations)
     SELECT $1,(r->>'sourceRow')::int,r->>'kind',r->>'unit',r->>'section',r FROM jsonb_array_elements($2::jsonb) AS t(r)`,
     [added.rows[0].id,JSON.stringify(cut.records)]);
    if(saved.rowCount!==cut.records.length)throw Error('WORKSHOP_ROW_COUNT');
    results.push({date:cut.date,revision:added.rows[0].revision,duplicate:false});
   }
   await db.query('COMMIT');
   const inserted=results.filter(x=>!x.duplicate).length;
   return {inserted,duplicates:results.length-inserted,results};
  }catch(e){try{await db.query('ROLLBACK');}catch{}throw e;}finally{db.release();}
 }
 return {canUpload,preview,confirm};
}
module.exports={createUpload};
