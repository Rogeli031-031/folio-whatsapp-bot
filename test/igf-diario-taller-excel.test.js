'use strict';

const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const Excel=require('exceljs');
const {plantContext,appendLocalProductivity}=require('../lib/igf-diario-taller-excel');
const {reportModel,approvedAcapulcoConfig}=require('../lib/igf-acapulco-productividad-model');
let PGlite;try{({PGlite}=require('@electric-sql/pglite'));}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}

const cuts={year:2026,month:11,uploadDay:'2026-11-04',now:new Date('2026-11-05T19:00Z')};
const tabs=['PIPAS RESUMEN','PIPAS TIPO A','PIPAS TIPO B','PIPAS TIPO C','EST RESUMEN','EST TIPO A','EST TIPO B','EST TIPO C'];
const puebla={plantaId:1,clave:'PUEBLA'};
const queretaro={plantaId:2,clave:'QUERETARO'};

test('solo Puebla/Querétaro verificados y solo export individual con resumen semanal',()=>{
 assert.equal(plantContext('Puebla',{plantaId:1,clave:'QUERETARO'},4),null);
 assert.equal(plantContext('Queretaro',{plantaId:2,clave:'E11'},4).plantId,2);
 assert.equal(plantContext('Acapulco',{plantaId:1,clave:'ACAPULCO'},4),null);
 const server=fs.readFileSync(require.resolve('../server'),'utf8');
 const start=server.indexOf('app.get("/api/arr/dashboard-excel"');
 const route=server.slice(start,server.indexOf('\n/**',start));
 assert.match(route,/forecastOpts\.igfWeeklySummary && resolvedPlant\?\.clave/);
 assert.match(route,/\.plantContext\(plantCode, resolvedPlant, req\.dashboardAuth\.actor_id\)/);
 const formatter=fs.readFileSync(require.resolve('../lib/dashboard-arr-forecast'),'utf8');
 assert.match(formatter,/else if \(exportPlant && options\.igfWeeklySummary && options\.igfLocalProductivityContext\)/);
});

test('ventas sin meta no pierden volumen ni usan metas de Acapulco; una meta explícita sí clasifica',()=>{
 const rows=[
  {fecha:'2026-11-01',canal:'Casa',subcanal:'Carburación',pdv_original:'ORGANOS',kg:'54'},
  {fecha:'2026-11-02',canal:'Casa',subcanal:'Carburación',pdv_original:'PROPIA B1',kg:'108'},
 ];
 const model=reportModel(rows,{...approvedAcapulcoConfig,plant:'Puebla',localPlant:true,year:2026,month:11,cutoff:'2026-11-03',stationGoals:{PROPIA:100}});
 assert.equal(model.stations.find(x=>x.label==='ORGANOS').tier,null);
 assert.equal(model.stations.find(x=>x.label==='ORGANOS').goal,null);
 assert.equal(model.stations.find(x=>x.label==='ORGANOS').total,100);
 assert.equal(model.stations.find(x=>x.label==='PROPIA').tier,'A');
});

test('sin ventas conciliadas se conserva el IGF base y las 8 hojas informan cobertura',async()=>{
 const wb=new Excel.Workbook();wb.addWorksheet('IGF Diario');
 const db={async query(){return {rows:[{unmatched_keys:1,legacy_keys:1,observed_days:3,rows:[{}]}]};}};
 assert.equal(await appendLocalProductivity(wb,db,{...cuts,salesCode:'Puebla',context:plantContext('Puebla',puebla,4)}),true);
 assert.deepEqual(wb.worksheets.slice(0,8).map(s=>s.name),tabs);
 assert.match(wb.worksheets[0].getCell('B4').text,/no concilia/);
 assert.ok(wb.getWorksheet('IGF Diario'));
});

async function fixture(db){
 await db.exec(`
  CREATE SCHEMA arr;
  CREATE TABLE public.usuarios(id integer PRIMARY KEY, activo boolean);
  INSERT INTO public.usuarios VALUES (4,true),(5,true),(6,false);
  CREATE TABLE public.plantas(id integer PRIMARY KEY,clave text);
  INSERT INTO public.plantas VALUES (1,'PUEBLA'),(2,'QUERETARO'),(3,'E7');
  CREATE TABLE public.categorias(id integer PRIMARY KEY,clave text);
  INSERT INTO public.categorias VALUES (1,'taller'),(2,'otro');
  CREATE TABLE public.folios(planta_id int,categoria_id int,categoria text,unidad text,numero_folio text,
   creado_en timestamptz,solo_zp_ad boolean,override_planta boolean);
  INSERT INTO public.folios VALUES
   (1,1,NULL,'AT-20','F-202610-10','2026-10-24 14:00Z',false,false),
   (1,1,NULL,'AT-020','F-202610-11','2026-10-25 14:00Z',true,false),
   (1,1,NULL,'T20','F-202610-12','2026-10-25 14:00Z',false,true),
   (1,2,NULL,'20','F-202610-13','2026-10-25 14:00Z',false,false),
   (1,1,NULL,'AT-20,AT-22','F-202610-14','2026-10-25 14:00Z',false,false),
   (3,1,NULL,'AT-20','F-202610-15','2026-10-25 14:00Z',false,false),
   (2,1,NULL,'AT-020','F-202610-16','2026-10-24 14:00Z',false,false),
   (1,1,NULL,'AT-20','F-202611-99','2026-11-05 14:00Z',false,false);
  CREATE TABLE arr.ventas_diarias_cliente(plant_code text,fecha date,cliente_norm text,canal text,subcanal text,kg numeric);
  CREATE TABLE arr.ventas_diarias_pdv(LIKE arr.ventas_diarias_cliente INCLUDING ALL);
  ALTER TABLE arr.ventas_diarias_pdv ADD COLUMN pdv_original text, ADD COLUMN unidad_candidata text, ADD COLUMN estado_pdv text;
  INSERT INTO arr.ventas_diarias_pdv VALUES
   ('Puebla','2026-11-01','one','Casa','Autotanque',540,'AT-020','AT-20','unidad_candidata'),
   ('Puebla','2026-11-02','two','Casa','Carburación',108,'ESTACIÓN UNO B1',null,'texto_sin_resolver'),
   ('Puebla','2026-11-03','two','Casa','Carburación',216,'ESTACIÓN UNO B1',null,'texto_sin_resolver'),
   ('Queretaro','2026-11-01','one','Casa','Carburación',54,'OTRA ESTACIÓN B1',null,'texto_sin_resolver'),
   ('Queretaro','2026-11-02','one','Casa','Autotanque',108,'AT-020','AT-20','unidad_candidata'),
   ('Queretaro','2026-11-03','one','Casa','Autotanque',108,'AT-020','AT-20','unidad_candidata');
  INSERT INTO arr.ventas_diarias_cliente SELECT plant_code,fecha,cliente_norm,canal,subcanal,kg FROM arr.ventas_diarias_pdv;
 `);
 for(const site of ['puebla','queretaro']){
  await db.exec(fs.readFileSync(require.resolve('../sql/20261125_igf_taller_diario_'+site+'.sql'),'utf8'));
  await db.exec('INSERT INTO arr.igf_'+site+'_taller_operador VALUES (4),(6)');
 }
 await db.exec(`
  INSERT INTO arr.igf_puebla_taller_revision(report_date,revision,source_layout,sha256,uploaded_by,row_count,unit_count) VALUES
   ('2026-11-03',1,'Puebla-v1',repeat('a',64),4,1,1),
   ('2026-11-04',1,'Puebla-v1',repeat('b',64),4,1,1),
   ('2026-11-04',2,'Puebla-v1',repeat('c',64),4,5,4);
  INSERT INTO arr.igf_puebla_taller_detalle VALUES
   (1,5,'Autotanque','T20','Menor','{"fault":"Reporte anterior"}'),
   (2,5,'Autotanque','T99','Menor','{}'),
   (3,5,'Autotanque','T20','Mayor','{"fault":"Falla A"}'),
   (3,6,'Autotanque','T-020','Menor','{"fault":"Falla B"}'),
   (3,7,'Autotanque','T21','Mayor','{"fullDayOut":true}'),
   (3,8,'Autotanque','T22','Menor','{"entered":"2026-11-02","exit":"2026-11-03"}'),
   (3,9,'Cilindrera','C20','Mayor','{}');
  INSERT INTO arr.igf_queretaro_taller_revision(report_date,revision,source_layout,sheet_sha256,workbook_sha256,uploaded_by,warnings,row_count,unit_count)
  VALUES ('2026-11-02',1,'Queretaro-v1',repeat('d',64),repeat('a',64),4,'[]',1,1),('2026-11-04',1,'Queretaro-v1',repeat('e',64),repeat('a',64),4,'[]',1,1);
  INSERT INTO arr.igf_queretaro_taller_detalle VALUES (1,5,'Autotanque','020','Menor','{"fault":"Reporte Q"}'),
   (2,5,'Autotanque','20','Menor','{"fault":"Solo Querétaro"}');
 `);
}
async function roundtrip(db,salesCode,context){
 const wb=new Excel.Workbook();wb.addWorksheet('IGF Diario').getCell('B4').value=123;
 await appendLocalProductivity(wb,db,{...cuts,salesCode,context});
 const loaded=new Excel.Workbook();
 await loaded.xlsx.load(await wb.xlsx.writeBuffer());
 return loaded;
}

test('DB aislada y XLSX: folios con alcance, última revisión, dos fallas por eco, colores y corte separado',{skip:!PGlite},async()=>{
 const db=new PGlite();
 try{
  await fixture(db);
  const wb=await roundtrip(db,'Puebla',plantContext('Puebla',puebla,4));
  assert.deepEqual(wb.worksheets.map(s=>s.name),[...tabs,'IGF Diario']);
  assert.equal(wb.getWorksheet('IGF Diario').getCell('B4').value,123);
  assert.equal(wb.getWorksheet('PIPAS RESUMEN').getCell('B1').text,'PUEBLA');
  assert.match(wb.getWorksheet('PIPAS RESUMEN').getCell('B47').text,/Ventas cerradas al 2026-11-03\. Taller hasta 2026-11-04/);
  const p=wb.getWorksheet('PIPAS TIPO C');
  assert.equal(p.getCell('D5').text,'AT-020');
  assert.equal(p.getCell('E5').text,'AT-021');
  assert.equal(p.getCell('G5').text,'TOTAL');
  assert.equal(p.getCell('D39').result,1000); // Sunday 540 kg contributes to numerator
  assert.equal(p.getCell('D40').value,2);
  assert.equal(p.getCell('D41').result,500);
  assert.equal(p.getCell('D10').value,null); // has workshop evidence but closed sales only thru day 3
  assert.equal(p.getCell('D10').fill.fgColor.argb,'FFFFD966');
  assert.equal(p.getCell('E10').fill.fgColor.argb,'FFFFD966');
  assert.match(p.getCell('D53').text,/Rev\. 2.*Falla A.*Falla B/s);
  assert.equal(p.getCell('D54').text,'F-202610-10');
  assert.equal(p.getCell('D49').text,'Sin folio atribuible');
  assert.equal(p.getCell('D51').text,'');
  const est=wb.getWorksheet('EST RESUMEN');
  assert.equal(est.getCell('J6').text,'Sin meta');
  assert.equal(est.getCell('H39').result,600);
  assert.equal(est.getCell('H42').value,null);
  assert.match(est.getCell('G39').formula,/^K39$/);

  const q=await roundtrip(db,'Queretaro',plantContext('Queretaro',queretaro,4));
  const qDetail=q.getWorksheet('PIPAS TIPO C');
  assert.equal(qDetail.getCell('B1').text,'QUERÉTARO');
  assert.equal(qDetail.getCell('D39').result,400);
  assert.equal(qDetail.getCell('D8').fill.fgColor.argb,'FFFFD966'); // sold and was in workshop
  assert.equal(qDetail.getCell('D54').text,'F-202610-16');
  assert.match(qDetail.getCell('D53').text,/Solo Querétaro/);
  assert.equal(q.getWorksheet('EST RESUMEN').getCell('H39').result,100);

  for(const actor of [5,6]){
   const blocked=await roundtrip(db,'Puebla',plantContext('Puebla',puebla,actor));
   assert.equal(blocked.getWorksheet('PIPAS TIPO C').getCell('D54').text,'');
  }
 }finally{await db.close();}
});
