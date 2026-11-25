'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ExcelJS=require('exceljs');
const {parseWorkbook}=require('../lib/igf-acapulco-taller-xlsx');
const {createUpload}=require('../lib/igf-acapulco-taller-upload');
async function fixture(e10=false, formula=false){
 const w=new ExcelJS.Workbook(),s=w.addWorksheet('REPORTE TALLER'),p=w.addWorksheet('PARQUE VEHICULAR');
 const company=e10?'HIDROGAS ACAPULCO':'GAS URIBE DE ACAPULCO';
 s.getCell(e10?'B5':'B4').value='EMPRESA: '+company;
 s.getCell(e10?'I5':'I4').value=formula?{formula:'1+2',result:3}:'FECHA: 25 NOVIEMBRE 2026';
 p.getCell('B2').value=e10?'EMPRESA:':'EMPRESA: '+company;
 p.getCell('C7').value=e10?'Hidrogas':'Gas Uribe';
 p.getCell('D7').value=e10?'Cilindrera':'Pipa';
 p.getCell('E7').value='A';p.getCell('F7').value=101;
 for(const [i,title] of [[6,'MENOR'],[12,'MAYOR']]){
  s.getCell('A'+i).value='TALLER '+title;
  for(const [c,h] of [['B','NUM DE AT'],['E','CAPACIDAD'],['G','FALLA PRESENTADA'],['I','REQUERIMIENTO']])s.getCell(c+(i+1)).value=h;
  if(i===12)s.getCell('B14').value=101;
  s.getCell('I'+(i+3)).value='TOTAL TALLER '+title+':';
 }
 return Buffer.from(await w.xlsx.writeBuffer());
}
test('reads real XLSX E9 and E10, does not promote cilindrera, rejects formula',async()=>{
 const e9=await parseWorkbook(await fixture()),e10=await parseWorkbook(await fixture(true));
 assert.equal(e9.records[0].eco,'AT-101');assert.equal(e9.records[0].fullDayOut,undefined);
 assert.deepEqual([e10.date,e10.records.length,e10.excluded],['2026-11-25',0,1]);
 await assert.rejects(parseWorkbook(await fixture(false,true)),e=>e.code==='NON_LITERAL_WORKSHOP_CELL');
});
test('preview does not write and binds acting account and original bytes',async()=>{
 let calls=0;const pool={query:async(_,[,actor])=>({rows:[101,102].includes(actor)?[{}]:[]}),connect(){calls++;throw Error('unexpected write');}};
 const h=createUpload({pool,businessDate:()=> '2026-11-25'});
 const input={xlsx:(await fixture()).toString('base64')}, other={xlsx:(await fixture(true)).toString('base64')};
 const ready=await h.preview(101,input);assert.equal(ready.rowCount,1);
 await assert.rejects(h.preview(103,input),e=>e.status===403);
 await assert.rejects(h.confirm(102,{...input,confirm:ready.confirm}),e=>e.status===409);
 await assert.rejects(h.confirm(101,{...other,confirm:ready.confirm}),e=>e.status===409);
 assert.equal(calls,0);
});

let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('folio candidates compare canonical single AT/T within same company, period and permissions',{skip:!PGlite},async()=>{
 const {readReport}=require('../lib/igf-acapulco-taller-upload');
 const db=new PGlite();
 try{
  await db.exec(`
   CREATE SCHEMA arr;
   CREATE TABLE arr.igf_taller_reporte_revision(id int,company_code text,plant_code text,report_date date,sha256 text,row_count int,revision int);
   CREATE TABLE arr.igf_taller_reporte_unidad(revision_id int,eco text,observations jsonb);
   CREATE TABLE public.plantas(id int,clave text);
   CREATE TABLE public.categorias(id int,clave text);
   CREATE TABLE public.folios(planta_id int,categoria_id int,categoria text,unidad text,numero_folio text,creado_en timestamptz,solo_zp_ad bool,override_planta bool);
   INSERT INTO arr.igf_taller_reporte_revision VALUES (1,'E9','Acapulco','2026-11-24',repeat('a',64),1,1);
   INSERT INTO arr.igf_taller_reporte_unidad VALUES (1,'AT-020','{"eco":"AT-020","kind":"Pipa"}');
   INSERT INTO public.plantas VALUES (1,'E9'),(2,'E10'),(3,'ACAPULCO');
   INSERT INTO public.categorias VALUES (1,'taller'),(2,'ventas');
   INSERT INTO public.folios VALUES
    (1,1,NULL,'AT-20','F-202611-11','2026-11-20 12:00Z',false,false),
    (1,1,NULL,' T 020 ','F-202611-12','2026-11-20 12:00Z',false,false),
    (2,1,NULL,'AT-20','F-202611-13','2026-11-20 12:00Z',false,false),
    (3,1,NULL,'AT-20','F-202611-14','2026-11-20 12:00Z',false,false),
    (1,1,NULL,'AT-20/AT-21','F-202611-15','2026-11-20 12:00Z',false,false),
    (1,1,NULL,'C-020','F-202611-16','2026-11-20 12:00Z',false,false),
    (1,1,NULL,'20','F-202611-17','2026-11-20 12:00Z',false,false),
    (1,1,NULL,'AT-20','F-202611-18','2026-11-20 12:00Z',true,false),
    (1,1,NULL,'AT-020','F-202611-19','2026-11-20 12:00Z',false,true),
    (1,2,NULL,'AT-020','F-202611-20','2026-11-20 12:00Z',false,false),
    (1,1,NULL,'AT-20','F-202611-21','2026-11-25 12:00Z',false,false),
    (1,1,NULL,'AT-20','F-202608-22','2026-08-01 12:00Z',false,false);
  `);
  const args=[db,'2026-11-01','2026-11-24'];
  const permitted=await readReport(...args,{showFolioCandidates:true});
  assert.deepEqual(permitted.reports[0].units[0],{eco:'AT-020',kind:'Pipa',folioCandidates:['F-202611-11','F-202611-12']});
  assert.deepEqual((await readReport(...args)).reports[0].units[0],{eco:'AT-020',kind:'Pipa'});
 }finally{await db.close();}
});

test('confirmation binds one selected cut and writes the date verified in preview',async()=>{
 const writes=[];
 const client={release(){},async query(q,params=[]){
  if(q.includes('FOR SHARE'))return {rows:[{}]};
  if(q.includes('AND sha256='))return {rows:[]};
  if(q.includes('INSERT INTO arr.igf_taller_reporte_revision')){writes.push(params);return {rows:[{id:1,revision:1}]};}
  if(q.includes('INSERT INTO arr.igf_taller_reporte_unidad'))return {rowCount:JSON.parse(params[1]).length};
  return {rows:[]};
 }};
 const pool={query:async()=>({rows:[{}]}),connect:async()=>client};
 const dates=['2026-11-26','2026-11-25','2026-11-24'];
 const h=createUpload({pool,businessDate:()=> '2026-11-25',parse:async(_bytes,_excel,reportDate)=>({
  verifiedLayout:'E9-v1',date:reportDate??dates[1],availableDates:dates,
  records:[{eco:'AT-101',section:'Mayor'}]
 })});
 const input={xlsx:Buffer.from('test').toString('base64')};
 const cut=await h.preview(101,{...input,reportDate:dates[2]});
 assert.deepEqual(cut.availableDates,dates.slice(1));
 await assert.rejects(h.confirm(101,{...input,reportDate:dates[1],confirm:cut.confirm}),{code:'PREVIEW_CHANGED'});
 assert.equal(writes.length,0);
 await h.confirm(101,{...input,confirm:cut.confirm,reportDate:dates[2]});
 assert.equal(writes.length,1);
 assert.deepEqual(writes[0].slice(0,3),['Acapulco','E9',dates[2]]);
});
