'use strict';
const fs=require('node:fs'),test=require('node:test'),a=require('node:assert/strict'),ExcelJS=require('exceljs');
const {parseWorkbook}=require('../lib/igf-tehuacan-taller-xlsx');
async function fixture(edit=()=>{}){
 const w=new ExcelJS.Workbook(),s=w.addWorksheet('REPORTE TALLER  '),f=w.addWorksheet('PARQUE VEHICULAR');
 s.getCell('B6').value='EMPRESA: CIA MEXICANA TEHUACAN';s.getCell('I6').value='Fecha: 18 DE AGOSTO DE 2026';
 const h=[undefined,'NUM DE AT','MARCA','MODELO','CAPACIDAD','FECHA DE INGRESO A TALLER','FALLA PRESENTADA','REPARABLE','REQUERIMIENTO','COSTO DE REPARACION'];
 s.getRow(9).values=h;s.getCell('I11').value='TOTAL TALLER MENOR:';
 s.getRow(12).values=h;s.getRow(13).values=[undefined,'A4',{formula:'2',result:'GMC'},2009,'PIPA',new Date('2026-11-01'),'Motor','SI','Refacción',{formula:'1000+200',result:1200},'APOYO',0.5,'última semana de noviembre'];
 s.getRow(14).values=[undefined,55,'Nissan',2010,'CILINDRERA','-','Falla','SI','Validar','-'];
 s.getCell('I15').value='TOTAL TALLER MAYOR:';s.getCell('B30').value='Fuera de secciones';
 f.getRow(6).values=[undefined,1,'Tehuacán','Pipa','A',4];
 f.getRow(7).values=[undefined,2,'Tehuacán','Cilindrera',undefined,55];
 w.addWorksheet('Hoja1').getCell('A1').value='No es corte';
 edit(s,f);return Buffer.from(await w.xlsx.writeBuffer());
}
test('usa solo las secciones, permite valores guardados y no presume salida',async()=>{
 const r=await parseWorkbook(await fixture());
 a.equal(r.records.length,2);a.equal(r.unitCount,2);a.equal(r.latestEntry,'2026-11-01');
 a.equal(r.records[0].exit,null);a.equal(r.records[0].exitAsReported,'última semana de noviembre');
 a.equal(r.records[0].repairCost,1200);a.equal(r.records[1].repairCost,null);
 a.ok(r.warnings.some(w=>w.code==='ENTRY_AFTER_HEADER'));
});
test('rechaza planta incorrecta, fórmulas de identidad y enlaces externos',async()=>{
 await a.rejects(parseWorkbook(await fixture(s=>s.getCell('B6').value='EMPRESA: OTRA')),{code:'PLANT_NOT_VERIFIED'});
 await a.rejects(parseWorkbook(await fixture(s=>s.getCell('B13').value={formula:'1',result:'A4'})),{code:'NON_LITERAL_WORKSHOP_CELL'});
 await a.rejects(parseWorkbook(await fixture(s=>s.getCell('G13').value={text:'enlace',hyperlink:'https://example.invalid/'})),{code:'INVALID_XLSX'});
});
test('original privado E8 si está disponible',{skip:!process.env.TEHUACAN_XLSX},async()=>{
 const d=await parseWorkbook(fs.readFileSync(process.env.TEHUACAN_XLSX));
 a.equal(d.records.length,6);a.equal(d.unitCount,6);a.ok(d.records.every(x=>x.section==='Mayor'));
 a.equal(d.records.filter(x=>x.kind==='Autotanque').length,3);
 a.equal(d.records.find(x=>x.unit==='55').repairCost,null);
 a.ok(d.records.every(x=>x.exit===null));a.ok(d.sourceDate<d.latestEntry);
});
