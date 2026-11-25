'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const {createUpload}=require('../lib/igf-queretaro-taller-upload');
const example=Buffer.from('libro sintético').toString('base64'),period='2026-11';
const synthetic=(bytes,p)=>({layout:'Queretaro-v1',period:p,cuts:[{
 date:p+'-05',sha:(bytes.toString().includes('editado')?'b':'a').repeat(64),unitCount:1,warnings:[],
 records:[{sourceRow:5,kind:'Autotanque',unit:'100',section:'Menor'}]
}]});
test('acceso exclusivo, token vincula operador, periodo y archivo',async()=>{
 const denied=createUpload({pool:{query:async()=>({rowCount:0})},businessDate:()=> '2026-11-25'});
 await assert.rejects(denied.preview(3,{xlsx:example,period}),{status:403});
 const svc=createUpload({pool:{query:async()=>({rowCount:1})},parse:synthetic,businessDate:()=> '2026-11-25'});
 const result=await svc.preview(3,{xlsx:example,period});
 const body={xlsx:example,period,confirm:result.confirm,periodConfirmed:true};
 await assert.rejects(svc.confirm(8,body),{status:409});
 await assert.rejects(svc.confirm(3,{...body,period:'2026-10'}),{status:409});
 await assert.rejects(svc.confirm(3,{...body,xlsx:Buffer.from('editado').toString('base64')}),{status:409});
 await assert.rejects(svc.confirm(3,{...body,periodConfirmed:false}),{status:422});
 await assert.rejects(svc.preview(3,{xlsx:example,period:'2026-12'}),{status:422});
});
let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('PostgreSQL aislado: duplicados no escriben y un corte editado genera otra revisión',{skip:!PGlite},async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE SCHEMA arr; CREATE TABLE public.usuarios(id integer primary key, activo boolean not null); INSERT INTO public.usuarios VALUES (3,true),(8,true);');
  await db.exec(fs.readFileSync(path.join(__dirname,'../sql/20261125_igf_taller_diario_queretaro.sql'),'utf8'));
  const query=async(s,p)=>{const r=await db.query(s,p);return {rows:r.rows,rowCount:r.rows.length||r.affectedRows||0};};
  const pool={query,connect:async()=>({query,release(){}})};
  const svc=createUpload({pool,parse:synthetic,businessDate:()=> '2026-11-25'});
  assert.equal(await svc.canUpload(3),false);
  await db.exec('INSERT INTO arr.igf_queretaro_taller_operador VALUES (3)');
  assert.equal(await svc.canUpload(8),false);
  const preview=await svc.preview(3,{xlsx:example,period});
  assert.equal((await query('SELECT count(*)::int n FROM arr.igf_queretaro_taller_revision')).rows[0].n,0);
  const body={confirm:preview.confirm,xlsx:example,period,periodConfirmed:true};
  assert.equal((await svc.confirm(3,body)).inserted,1);
  assert.equal((await svc.confirm(3,body)).duplicates,1);
  const other=Buffer.from('libro editado').toString('base64'),p2=await svc.preview(3,{xlsx:other,period});
  assert.equal((await svc.confirm(3,{...body,xlsx:other,confirm:p2.confirm})).results[0].revision,2);
  assert.equal((await query('SELECT count(*)::int n FROM arr.igf_queretaro_taller_detalle')).rows[0].n,2);
  if(process.env.QUERETARO_XLSX){
   const actual=createUpload({pool,businessDate:()=> '2026-11-25'}),xlsx=fs.readFileSync(process.env.QUERETARO_XLSX).toString('base64');
   const report=await actual.preview(3,{xlsx,period});
   assert.equal(report.cuts.length,12);assert.equal(report.rowCount,120);
   const save={xlsx,period,periodConfirmed:true,confirm:report.confirm};
   assert.equal((await actual.confirm(3,save)).inserted,12);
   assert.equal((await actual.confirm(3,save)).duplicates,12);
   assert.equal((await query('SELECT count(*)::int n FROM arr.igf_queretaro_taller_detalle')).rows[0].n,122);
  }
 }finally{await db.close();}
});
