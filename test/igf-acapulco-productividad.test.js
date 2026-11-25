'use strict';
const test=require('node:test');
const a=require('node:assert/strict');
const ExcelJS=require('exceljs');
const {GOALS,stationKey,truckTier,goalAttainment}=require('../lib/igf-acapulco-productividad-model');
const {appendAcapulcoIgfProductivity,closedCutoff}=require('../lib/igf-acapulco-productividad');
const s={plant:'Acapulco',year:2026,month:11,uploadDay:'2026-11-23',isIgfDiario:true,now:new Date('2026-11-23T21:00:00Z')};
const row=(kg,fecha,subcanal='Autotanque',pdv_original='AT-004',unidad_candidata='AT-4',estado_pdv='unidad_candidata',canal='Casa')=>({kg,fecha,subcanal,pdv_original,unidad_candidata,estado_pdv,canal});
const raw=[
 row(1620,'2026-11-01'),row(17820,'2026-11-02'),row(123,'2026-11-23'),
 row(999,'2026-11-01','Autotanque','BOULEVARD B1',null,'texto_sin_resolver'),
 row(60,'2026-11-01','Carburación','ZAPAGAS B1',null,'texto_sin_resolver'),
 row(1944,'2026-11-01','Carburación','COLOSIO ΙΙ B1',null,'texto_sin_resolver'),
 row(-54,'2026-11-01','Carburación','COLOSIO ΙΙ B1',null,'texto_sin_resolver'),
 row(54,'2026-11-01','Autotanque','AT-004','AT-4','unidad_candidata','Comisionista')
];
const names=['PIPAS RESUMEN','PIPAS TIPO A','PIPAS TIPO B','PIPAS TIPO C','EST RESUMEN','EST TIPO A','EST TIPO B','EST TIPO C','IGF ORIGINAL'];
const wb=()=>{const w=new ExcelJS.Workbook(),o=w.addWorksheet('IGF ORIGINAL');o.getCell('A1').value={formula:'2+2',result:4};o.getCell('A1').font={bold:true};return w;};
const audit=(values={})=>({rows:[{legacy_keys:10,unmatched_keys:0,observed_days:22,rows:raw,...values}]});
async function roundtrip(w){const copy=new ExcelJS.Workbook();await copy.xlsx.load(await w.xlsx.writeBuffer());return copy;}

test('rounds trucks before threshold; does not round station threshold',()=>{
 a.deepEqual([1999.50,1999.49,1499.5,1499.49].map(truckTier),['A','B','B','C']);
 a.deepEqual([799.99,800,999.99,1000].map(unroundedAvg=>goalAttainment({unroundedAvg,dailyGoal:1000})),['C','B','B','A']);
 a.equal(stationKey('OMETEPEC II B1'),'OMETEPEC 2');
 a.equal(stationKey('COLOSIO ΙΙ B1'),'COLOSIO 2');
 a.equal(stationKey('CRUZ GRANDE (HIDROGAS)'),'CRUZ GRANDE');
 for(const n of ['VACACIONAL B2','ZAPAGAS B1','TOLVA (HIDROGAS)','BOULEVARD (HIDROGAS)'])a.equal(stationKey(n),null);
 a.equal(Object.values(GOALS).reduce((x,y)=>x+y,0),16620);
});
test('closed period honors exclusive upload day, time zone and month boundary',()=>{
 a.equal(closedCutoff(2026,11,'2026-11-23',s.now),'2026-11-22');
 a.equal(closedCutoff(2026,11,'2026-11-12',s.now),'2026-11-11');
 a.equal(closedCutoff(2026,10,'2026-11-01',s.now),'2026-10-31');
 a.equal(closedCutoff(2026,11,'2026-11-01',s.now),null);
});
test('eight sheets first, Sunday volume included but not a divisor, real XLSX roundtrip',async()=>{
 const w=wb();
 a.equal(await appendAcapulcoIgfProductivity(w,{query:async(sql,params)=>{
  a.deepEqual(params,['Acapulco','2026-11-01','2026-11-22']);
  a.match(sql,/FULL JOIN/); a.match(sql,/IS DISTINCT FROM/);return audit();
 }},s),true);
 const z=await roundtrip(w);
 a.deepEqual(z.worksheets.map(x=>x.name),names);
 a(z.worksheets.slice(0,8).every(t=>t.getImages().length===1));
 a.equal(z.worksheets[8].getCell('A1').formula,'2+2');
 a.equal(z.worksheets[8].getCell('A1').font.bold,true);
 const p=z.getWorksheet('PIPAS RESUMEN');
 a.equal(p.getCell('B1').value,'ACAPULCO');a.equal(p.getCell('B1').font.name,'Lato');
 a.equal(p.getCell('H7').result,3000);a.equal(p.getCell('H39').result,36000);
 a.equal(p.getCell('H41').result,2000);a.equal(p.getCell('H29').value,null);
 const e=z.getWorksheet('EST RESUMEN');
 a.equal(e.getCell('H39').result,3500);a.equal(e.getCell('H41').result,3500/18);
 a.equal(e.getCell('H42').result,16620);a.equal(e.getCell('H43').result,415500);
 a.equal(e.getCell('H48').value,60);
});
test('other plants, global, and ordinary ARR do not query or add sheets',async()=>{
 for(const patch of [{plant:'Puebla'},{plant:''},{isIgfDiario:false}]){
  const w=wb();a.equal(await appendAcapulcoIgfProductivity(w,{query(){throw Error('no debe consultar');}},{...s,...patch}),false);
  a.deepEqual(w.worksheets.map(t=>t.name),['IGF ORIGINAL']);
 }
});
test('incomplete source retains existing workbook, no zero-filled productivity',async()=>{
 for(const patch of [{unmatched_keys:1},{observed_days:21},{legacy_keys:0,rows:[]}]){
   const w=wb();await appendAcapulcoIgfProductivity(w,{query:async()=>audit(patch)},s);
   const z=await roundtrip(w);a.deepEqual(z.worksheets.map(t=>t.name),names);
   a.equal(z.worksheets[0].getCell('B2').value,'PRODUCTIVIDAD NO DISPONIBLE');a.equal(z.worksheets[0].getCell('H39').value,null);
   a.equal(z.worksheets[8].getCell('A1').formula,'2+2');
 }
});

test('existing exporter uses only the plant IGF branch and inserts before serialization',()=>{
 const fs=require('node:fs'), path=require('node:path');
 const code=fs.readFileSync(path.join(__dirname,'../lib/dashboard-arr-forecast.js'),'utf8');
 const exportFn=code.slice(code.indexOf('async function generarDashboardArrForecast('));
 const hook=exportFn.indexOf('if (exportPlant === "Acapulco" && options.igfWeeklySummary)');
 const financial=exportFn.indexOf('await weeklyExcel.fillResumen');
 const serialize=exportFn.indexOf('await wb.xlsx.writeBuffer()');
 a(financial>=0 && financial<hook && hook<serialize);
 a.match(exportFn.slice(hook,serialize),/uploadDay: fechaCorte/);
});

test('inserts six hidden folio rows without shifting titles, logos or visible styles',async()=>{
 const base=wb(),withFolios=wb(),db={query:async()=>audit()};
 await appendAcapulcoIgfProductivity(base,db,s);
 await appendAcapulcoIgfProductivity(withFolios,db,{...s,readVerifiedWorkshop:async()=>({
  plant:'Acapulco',reports:[{entity:'E9',date:'2026-11-03',sha256:'a'.repeat(64),units:[
   {eco:'AT-004',kind:'Pipa',folioCandidates:['F-202610-84']},
  ]}]
 })});
 const original=await roundtrip(base), actual=await roundtrip(withFolios);
 const before=original.getWorksheet('PIPAS TIPO A'), after=actual.getWorksheet('PIPAS TIPO A');
 for(const [ref,value] of [['B1','ACAPULCO'],['B2','VENTA DE\nPIPAS PROPIAS'],['B3','TIPO A  •  NOVIEMBRE 2026']]){
  a.equal(after.getCell(ref).value,value);
  a.deepEqual(after.getCell(ref).style,before.getCell(ref).style);
 }
 a.deepEqual(after.getImages().map(i=>[i.range.tl.nativeRow,i.range.br.nativeRow]),before.getImages().map(i=>[i.range.tl.nativeRow,i.range.br.nativeRow]));
 a.deepEqual(Array.from({length:7},(_,i)=>after.getRow(i+4).hidden),[true,true,true,true,true,true,false]);
 a.equal(after.getCell('D9').text,'F-202610-84');
 a.equal(after.getCell('D4').text,'Sin folio atribuible');
 a.equal(after.getCell('B10').value,before.getCell('B4').value);
 a.equal(after.getCell('D11').value,before.getCell('D5').value);
 a.deepEqual(after.getCell('D13').style,before.getCell('D7').style);
 a.equal(after.getCell('D15').fill.fgColor.argb,'FFFFD966');
 a.equal(after.getCell('D45').formula,'SUM(D13:D34)');
 a.equal(after.getCell('D45').result,before.getCell('D39').result);
 const summary=actual.getWorksheet('PIPAS RESUMEN');
 a.equal(summary.getCell('D7').formula,"'PIPAS TIPO A'!F13");
 a.equal(summary.getCell('D39').formula,"'PIPAS TIPO A'!F45");
 a.equal(summary.getCell('H39').result,original.getWorksheet('PIPAS RESUMEN').getCell('H39').result);
});
