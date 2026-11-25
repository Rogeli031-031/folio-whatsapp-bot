'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const {createUpload}=require('../lib/igf-tehuacan-taller-upload');
const xlsx=Buffer.from('example spreadsheet bytes').toString('base64');
const data={layout:'Tehuacan-E8-v1',sourceDate:'2026-08-18',tabDate:null,latestEntry:'2026-11-01',unitCount:1,
 records:[{sourceRow:6,kind:'Autotanque',unit:'T-16',section:'Mayor',fault:'Clutch'},{sourceRow:7,kind:'Autotanque',unit:'T-16',section:'Menor',fault:'Frenos'}],warnings:[]};
const service=pool=>createUpload({pool,parse:async()=>data,businessDate:()=> '2026-11-25'});
test('sin autorización de Tehuacán no abre vista previa',async()=>{
 const svc=service({query:async()=>({rowCount:0})});
 assert.equal(await svc.canUpload(9),false);
 await assert.rejects(svc.preview(9,{xlsx}),{status:403});
});
test('requiere el mismo actor, mismo archivo y confirmación explícita de fecha',async()=>{
 const svc=service({query:async()=>({rowCount:1})});
 const p=await svc.preview(3,{xlsx});
 assert.equal(p.rowCount,2);assert.equal(p.unitCount,1);
 const good={xlsx,confirm:p.confirm,reportDate:'2026-11-24',dateConfirmed:true};
 await assert.rejects(svc.confirm(8,good),{status:409});
 await assert.rejects(svc.confirm(3,{...good,xlsx:Buffer.from('other').toString('base64')}),{status:409});
 for(const v of [{dateConfirmed:false},{reportDate:'2026-11-26'},{reportDate:'2026-08-18'},{reportDate:'2026-02-30'}]){
  await assert.rejects(svc.confirm(3,{...good,...v}),{status:422});
 }
});
let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('migración en PostgreSQL aislado: vista previa sin escritura, reenvío idempotente, ambas reparaciones', {skip:!PGlite},async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE SCHEMA arr; CREATE TABLE public.usuarios(id integer primary key, activo boolean not null); INSERT INTO public.usuarios VALUES (3,true),(9,true);');
  await db.exec(fs.readFileSync(path.join(__dirname,'../sql/20261125_igf_taller_diario_tehuacan.sql'),'utf8'));
  const query=async(s,p)=>{const r=await db.query(s,p);return {rows:r.rows,rowCount:r.rows.length || r.affectedRows || 0};};
  const svc=service({query,connect:async()=>({query,release(){}})});
  assert.equal(await svc.canUpload(3),false);
  await db.exec('INSERT INTO arr.igf_tehuacan_taller_operador VALUES (3)');
  const preview=await svc.preview(3,{xlsx});
  assert.equal((await query('SELECT count(*)::int n FROM arr.igf_tehuacan_taller_revision')).rows[0].n,0);
  const body={confirm:preview.confirm,xlsx,reportDate:'2026-11-24',dateConfirmed:true};
  assert.equal((await svc.confirm(3,body)).duplicate,false);
  assert.equal((await svc.confirm(3,body)).duplicate,true);
  assert.deepEqual((await query('SELECT report_date::text,revision,row_count,unit_count FROM arr.igf_tehuacan_taller_revision')).rows,[{report_date:'2026-11-24',revision:1,row_count:2,unit_count:1}]);
  assert.deepEqual((await query('SELECT unit_code,source_row FROM arr.igf_tehuacan_taller_detalle ORDER BY source_row')).rows,[{unit_code:'T-16',source_row:6},{unit_code:'T-16',source_row:7}]);
 }finally{await db.close();}
});
