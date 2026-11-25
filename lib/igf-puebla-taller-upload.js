'use strict';
const {createHash,createHmac,randomBytes,timingSafeEqual}=require('node:crypto');
const {parseWorkbook,isoDay}=require('./igf-puebla-taller-xlsx');
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const accessSql='SELECT o.usuario_id FROM arr.igf_puebla_taller_operador o JOIN public.usuarios u ON u.id=o.usuario_id WHERE u.activo=true AND o.usuario_id=$1';
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
  const xlsx=body?.xlsx;
  if(typeof xlsx!=='string'||xlsx.length>2666668||!/^([A-Za-z0-9+/]+)={0,2}$/.test(xlsx))fail(422,'INVALID_XLSX');
  const bytes=Buffer.from(xlsx,'base64');
  if(bytes.length>2000000||bytes.toString('base64')!==xlsx)fail(422,'INVALID_XLSX');
  const data=await parse(bytes);
  if(data.layout!=='Puebla-v1'||data.records.length>120)fail(422,'INVALID_SOURCE');
  return {...data,sha:createHash('sha256').update(bytes).digest('hex')};
 }
 async function preview(actor,body){
  if(!await canUpload(actor))fail(403,'NOT_ALLOWED');
  const {sha,records,unitCount,sourceDate,tabDate,warnings}=await read(body);
  return {sourceDate,tabDate,unitCount,rowCount:records.length,warnings,
   records:records.map(({sourceRow,unit,kind,section,fault,repairCost})=>({sourceRow,unit,kind,section,fault,repairCost})),
   confirm:seal({actor:Number(actor),sha,expires:now()+600000})};
 }
 async function confirm(actor,body){
  if(!await canUpload(actor))fail(403,'NOT_ALLOWED');
  const token=open(body?.confirm);
  if(!token||token.expires<=now()||token.actor!==Number(actor))fail(409,'PREVIEW_CHANGED');
  const date=isoDay(body.reportDate);
  if(!date||date>businessDate()||body.dateConfirmed!==true)fail(422,'CONFIRM_REPORT_DATE');
  const data=await read(body);
  if(token.sha!==data.sha)fail(409,'PREVIEW_CHANGED');
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   if((await db.query(accessSql+' FOR SHARE OF o,u',[Number(actor)])).rowCount!==1)fail(403,'NOT_ALLOWED');
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('igf-puebla-taller:' || $1,0))",[date]);
   const duplicate=await db.query("SELECT id,revision FROM arr.igf_puebla_taller_revision WHERE report_date=$1::date AND sha256=$2",[date,data.sha]);
   if(duplicate.rowCount){await db.query('COMMIT');return {...duplicate.rows[0],duplicate:true};}
   const inserted=await db.query(`INSERT INTO arr.igf_puebla_taller_revision(report_date,revision,source_layout,sha256,uploaded_by,source_date,tab_date,row_count,unit_count)
    SELECT $1::date,COALESCE(MAX(revision),0)+1,$2,$3,$4,$5::date,$6::date,$7,$8
    FROM arr.igf_puebla_taller_revision WHERE report_date=$1::date RETURNING id,revision`,
    [date,data.layout,data.sha,Number(actor),data.sourceDate,data.tabDate,data.records.length,data.unitCount]);
   const result=await db.query(`INSERT INTO arr.igf_puebla_taller_detalle(revision_id,source_row,kind,unit_code,section,observations)
    SELECT $1,(r->>'sourceRow')::int,r->>'kind',r->>'unit',r->>'section',r FROM jsonb_array_elements($2::jsonb) AS t(r)`,
    [inserted.rows[0].id,JSON.stringify(data.records)]);
   if(result.rowCount!==data.records.length)throw Error('WORKSHOP_ROW_COUNT');
   await db.query('COMMIT');return {...inserted.rows[0],duplicate:false};
  }catch(e){try{await db.query('ROLLBACK');}catch{}throw e;}finally{db.release();}
 }
 return {canUpload,preview,confirm};
}
module.exports={createUpload};
