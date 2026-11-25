'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs'),ExcelJS=require('exceljs');
const {parseWorkbook}=require('../lib/igf-queretaro-taller-xlsx');
const headers=['REG.','TALLER MAYOR','TALLER MENOR','NUMERO ECONOMICO','FECHA DE INGRESO','FALLA REPORTADA EN TALLER','E S T A T U S','COSTO DE REPARACIÓN','APOYO / PRESUPUESTO','FECHA DE AVANCE','FECHA SALIDA','RUTA DE UNIDAD','OBSERVACIONES','DIAS EN TALLER'];
async function fixture({names=['05','09'],plant='Querétaro',tweak=()=>{}}={}){
 const w=new ExcelJS.Workbook(),p=w.addWorksheet('PARQUE VEHICULAR ');
 p.getCell('B2').value='EMPRESA: GAS TOMZA DE MÉXICO SA DE CV'; p.getCell('C9').value=plant;
 w.addWorksheet('Plantilla vieja',{state:'hidden'}).addRow(['NO ES UN CORTE']);
 for(const name of names){
  const s=w.addWorksheet(name);
  s.getCell('A1').value=' REPORTE DE TALLER ';s.getCell('M1').value={formula:'TODAY()',result:46350};
  s.getCell('A3').value='A U T O T A N Q U E S';s.getRow(4).values=headers;
  s.getRow(5).values=[1,'X',undefined,10,new Date('2026-10-03'), 'Motor'];
  s.getCell('A7').value='CILINDRERAS';s.getRow(8).values=headers;
  s.getRow(9).values=[1,'X',undefined,'M-75',new Date('2026-11-30'),'Motor'];
  s.getCell('A12').value='UTILITARIOS';s.getRow(13).values=headers.map((e,i)=>i===3?'UTILITARIO':e);
  tweak(s);
 }
 return Buffer.from(await w.xlsx.writeBuffer());
}
test('usa pestañas diarias y excluye padrón, hoja oculta y TODAY',async()=>{
 const x=await parseWorkbook(await fixture(),'2026-11');
 assert.deepEqual(x.cuts.map(c=>c.date),['2026-11-05','2026-11-09']);
 assert.equal(x.cuts[0].records.length,2);assert.equal(x.cuts[0].unitCount,2);
 assert.equal(x.cuts[0].sha,x.cuts[1].sha);
 assert.equal(x.cuts[0].warnings[0].code,'AFTER_CUT_ENTRY_DATE');
 assert.equal(x.cuts[0].records[1].entry.raw,'2026-11-30');
});
test('la huella ignora la fecha volátil y cambia con una reparación editada',async()=>{
 const a=await parseWorkbook(await fixture(),'2026-11');
 const b=await parseWorkbook(await fixture({tweak:s=>{s.getCell('M1').value={formula:'TODAY()',result:46351};if(s.name==='09')s.getCell('F5').value='Freno';}}),'2026-11');
 assert.equal(a.cuts[0].sha,b.cuts[0].sha);assert.notEqual(a.cuts[1].sha,b.cuts[1].sha);
});
test('rechaza otra planta, cortes duplicados, fechas imposibles y enlaces web',async()=>{
 await assert.rejects(parseWorkbook(await fixture({plant:'Puebla'}),'2026-11'),{code:'PLANT_NOT_VERIFIED'});
 await assert.rejects(parseWorkbook(await fixture({names:['5','05']}),'2026-11'),{code:'INVALID_CUT_DATE'});
 await assert.rejects(parseWorkbook(await fixture({names:['31']}),'2026-11'),{code:'INVALID_CUT_DATE'});
 await assert.rejects(parseWorkbook(await fixture({tweak:s=>{s.getCell('F5').value={text:'Enlace',hyperlink:'https://example.invalid/'};}}),'2026-11'),{code:'INVALID_XLSX'});
});
test('muestra original únicamente si se suministra en privado',{skip:!process.env.QUERETARO_XLSX},async()=>{
 const b=await parseWorkbook(fs.readFileSync(process.env.QUERETARO_XLSX),'2026-11');
 assert.equal(b.cuts.length,12);assert.ok(b.cuts.every(x=>x.records.length===10&&x.unitCount===10));
 assert.ok(b.cuts.every(x=>x.warnings.filter(w=>w.code==='AFTER_CUT_ENTRY_DATE').length===2));
});
