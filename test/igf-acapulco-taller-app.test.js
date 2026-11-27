'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {randomBytes}=require('node:crypto');
const express=require('express');
const Excel=require('exceljs');
const {mountPilot,PILOT_PATH}=require('../lib/igf-acapulco-taller-app');
const {readReport}=require('../lib/igf-acapulco-taller-upload');
const {makeWorkshopView}=require('../lib/igf-acapulco-productividad-taller');
const {appendAcapulcoIgfProductivity}=require('../lib/igf-acapulco-productividad');

test('production or missing config never registers the pilot route',()=>{
 const guard={post(){assert.fail('The pilot must not mount')}};
 const opts={db:null,json:express.json,env:{NODE_ENV:'production',IGF_ACAPULCO_TALLER_PILOT:'1',IGF_ACAPULCO_TALLER_DEVICE:'lab-acapulco',IGF_ACAPULCO_TALLER_SECRET:'a'.repeat(43)}};
 assert.equal(mountPilot(guard,opts),false);
 assert.equal(mountPilot(guard,{...opts,env:{NODE_ENV:'test'}}),false);
});

// Install @electric-sql/pglite in the isolated test workspace, never as a production dependency.
test('HTTP → isolated PostgreSQL → readReport → rendered and reopened IGF workbook',async()=>{
 const {PGlite}=require('@electric-sql/pglite');
 const db=new PGlite();
 const app=express();
 const secret=randomBytes(32).toString('base64url');
 const device='lab-acapulco';
 const env={NODE_ENV:'test',IGF_ACAPULCO_TALLER_PILOT:'1',IGF_ACAPULCO_TALLER_DEVICE:device,
   IGF_ACAPULCO_TALLER_SECRET:secret};
 const originalEnv=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 Object.assign(process.env,env);
 let http;
 try {
  await db.exec(`CREATE SCHEMA arr;
   CREATE TABLE arr.igf_taller_reporte_revision(id int PRIMARY KEY, plant_code text, company_code text,
     report_date date, revision int, sha256 text, row_count int);
   CREATE TABLE arr.igf_taller_reporte_unidad(revision_id int, eco text, observations jsonb);
   CREATE TABLE arr.ventas_diarias_cliente(plant_code text, fecha date,cliente_norm text,canal text,subcanal text,kg numeric);
   CREATE TABLE arr.ventas_diarias_pdv(LIKE arr.ventas_diarias_cliente,pdv_original text,unidad_candidata text,estado_pdv text);
   INSERT INTO arr.ventas_diarias_pdv SELECT 'Acapulco',d::date,'VENTA FICTICIA','Casa','Autotanque',54,
     'AT-997','AT-997','unidad_candidata' FROM generate_series('2026-11-01'::date,'2026-11-27'::date,'1 day') d;
   INSERT INTO arr.ventas_diarias_cliente SELECT plant_code,fecha,cliente_norm,canal,subcanal,kg FROM arr.ventas_diarias_pdv;
   INSERT INTO arr.igf_taller_reporte_revision VALUES (1,'Acapulco','E9','2026-11-25',1,repeat('a',64),1),
     (2,'Acapulco','E10','2026-11-25',1,repeat('b',64),0);
   INSERT INTO arr.igf_taller_reporte_unidad VALUES
     (1,'AT-211','{"eco":"AT-211","kind":"Pipa","section":"Menor","fullDayOut":true,"folioCandidates":["F-202611-999"]}');
  `);
  await db.exec(readFileSync(join(__dirname,'../sql/032_igf_acapulco_taller_app.sql'),'utf8'));
  await db.query(`INSERT INTO arr.igf_taller_acapulco_app_roster VALUES
    ($1,1,'2026-11-25',null,'AT-997','Pipa'),($1,2,'2026-11-25',null,'AT-997','Cilindrera'),
    ($1,4,'2026-11-25',null,'AT-999','Pipa')`,[device]);
  const now=()=>Date.parse('2026-11-28T16:00Z');
  assert.equal(mountPilot(app,{db,json:express.json,env,now}),true);
  http=app.listen(0,'127.0.0.1');
  await new Promise((ok,no)=>http.once('listening',ok).once('error',no));
  const url='http://127.0.0.1:'+http.address().port+PILOT_PATH;
  const send=(body,token=secret)=>fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
  const make=(seq,unitId,day,kind='entry')=>({v:1,id:seq.toString(16).padStart(32,'0'),seq,unitId,at:`2026-11-${day}T10:00:00-06:00`,kind,
    ...(kind==='entry'?{section:'Menor'}:{})});
  const e1=make(1,1,25), e2=make(2,2,25), e3=make(3,1,27,'exit');
  assert.equal((await send(e1,'incorrecto')).status,401);
  assert.equal((await send({...e1,at:'2026-11-31T10:00:00-06:00'})).status,422);
  const initial=await readReport(db,'2026-11-01','2026-11-27');
  assert.equal((await send(e3)).status,201);
  assert.deepEqual(await readReport(db,'2026-11-01','2026-11-27'),initial,'Missing sequence must not publish');
  assert.deepEqual((await Promise.all([send(e1),send(e1)])).map(x=>x.status).sort(),[200,201]);
  assert.equal((await send(e2)).status,201);
  assert.equal((await send({...e1,section:'Mayor'})).status,409);
  assert.deepEqual(await (await send(make(4,3,27))).json(),{code:'HELD'});
  assert.deepEqual(await (await send({...make(5,4,27),claimedCompany:'E10'})).json(),{code:'HELD'});
  const rows=(await db.query('SELECT company,eco,held_reason FROM arr.igf_taller_acapulco_app_event ORDER BY seq')).rows;
  assert.deepEqual(rows.map(x=>x.company),['E9','E10','E9',null,null]);
  assert.deepEqual(rows.map(x=>x.held_reason),[null,null,null,'sin_asignar','empresa_no_coincide']);
  const merged=await readReport(db,'2026-11-01','2026-11-27');
  assert.equal(merged.reports.find(x=>x.entity==='E10').units.length,0);
  assert.equal(merged.reports.find(x=>x.date==='2026-11-25'&&x.entity==='E9').units[0].folioCandidates[0],'F-202611-999');
  const view=makeWorkshopView(merged,{plant:'Acapulco',from:'2026-11-01',cutoff:'2026-11-27',entities:['E9','E10']});
  assert.deepEqual([...view.units.get('AT-997').days],['2026-11-25','2026-11-27']);
  assert.equal(view.units.get('AT-997').wholeDays.size,0);
  assert.equal(view.perUnit('AT-997',{},26).divisor,26);
  assert.ok(view.missing.some(x=>x.entity==='E9'&&x.date==='2026-11-27'));
  const wb=new Excel.Workbook();
  wb.addWorksheet('DATOS DE PRUEBA');
  await appendAcapulcoIgfProductivity(wb,db,{plant:'Acapulco',year:2026,month:11,uploadDay:'2026-11-28',isIgfDiario:true,
    now:new Date(now()),readVerifiedWorkshop:({cutoff})=>readReport(db,'2026-11-01',cutoff)});
  const reopened=new Excel.Workbook();
  await reopened.xlsx.load(await wb.xlsx.writeBuffer());
  const sheet=reopened.worksheets.find(s=>/^PIPAS TIPO/.test(s.name)&&s.getRow(11).values.includes('AT-997'));
  assert.ok(sheet);
  const col=sheet.getRow(11).values.indexOf('AT-997');
  assert.equal(sheet.getRow(4).hidden,true);
  assert.equal(sheet.getCell(37,col).value,100);
  assert.equal(sheet.getCell(37,col).fill.fgColor.argb,'FFFFD966');
  assert.equal(sheet.getCell(39,col).value,100);
  assert.equal(sheet.getCell(39,col).fill.fgColor.argb,'FFFFD966');
  process.env.IGF_ACAPULCO_TALLER_PILOT='0';
  assert.deepEqual(await readReport(db,'2026-11-01','2026-11-27'),initial,'Excel source must not be overwritten');
 } finally{
  for(const [k,v] of Object.entries(originalEnv)) if(v===undefined)delete process.env[k];else process.env[k]=v;
  if(http){http.closeAllConnections();await new Promise(ok=>http.close(ok));}
  await db.close();
 }
});
