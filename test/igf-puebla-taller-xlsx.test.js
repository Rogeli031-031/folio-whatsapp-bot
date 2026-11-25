'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const fs=require('node:fs');
const ExcelJS=require('exceljs');
const {parseWorkbook}=require('../lib/igf-puebla-taller-xlsx');
const header=['REG.','TALLER MAYOR','TALLER MENOR','NUMERO ECONOMICO','FECHA DE INGRESO','FALLA REPORTADA EN TALLER','E S T A T U S','COSTO DE REPARACIÓN','APOYO / PRESUPUESTO','FECHA DE AVANCE','FECHA SALIDA','RUTA DE UNIDAD','OBSERVACIONES','DIAS EN TALLER'];
async function fixture(tweak=()=>{}){
 const w=new ExcelJS.Workbook();
 w.addWorksheet('Histórico',{state:'hidden'}).addRow(['NUNCA IMPORTAR']);
 const s=w.addWorksheet('18 DE NOV 26');
 s.mergeCells('A1:N1');s.getCell('A1').value=' REPORTE DE TALLER ';
 s.mergeCells('A3:N3');s.getCell('A3').value='A U T O T A N Q U E S';
 s.getRow(4).values=[...header,{formula:'TODAY()',result:46350}];
 const entry=new Date('2026-11-17');
 s.getRow(5).values=[1,'X',undefined,'T-12',entry,'Falla 1'];
 s.getRow(6).values=[2,'X',undefined,'T-16',entry,'Falla 2',undefined,1111];
 s.getRow(7).values=[3,undefined,'X','T-16',entry,'Falla 3',undefined,{formula:'2222',result:2222}];
 s.getRow(8).values=[4,'X',undefined,'T-17',undefined,'Falla 4',undefined,3333,undefined,undefined,undefined,undefined,'Unidad sale a ruta',{formula:'TODAY()-E8',result:46350}];
 s.getCell('A10').value='CILINDRERAS';s.getRow(11).values=header;
 s.getRow(12).values=[1,undefined,'X','C-54',entry,'Falla 5'];
 s.getCell('A14').value='UTILITARIOS';s.getRow(15).values=header.map((v,i)=>i===3?'UTILITARIO':v);
 s.getRow(16).values=[1,undefined,'X','JETTA',undefined,'Falla 6'];
 s.getCell('A17').value=2;
 tweak(w,s);
 return Buffer.from(await w.xlsx.writeBuffer());
}
test('formato Puebla: 6 filas, 5 unidades, dos reparaciones y fechas en conflicto',async()=>{
 const r=await parseWorkbook(await fixture());
 assert.equal(r.records.length,6);assert.equal(r.unitCount,5);
 assert.equal(r.sourceDate,'2026-11-24');assert.equal(r.tabDate,'2026-11-18');
 assert.deepEqual(r.records.filter(x=>x.unit==='T-16').map(x=>x.repairCost),[1111,2222]);
 assert.equal(r.records.find(x=>x.unit==='T-17').reportedDays,null);
 assert.ok(r.warnings.some(x=>x.code==='UNCONFIRMED_EXIT'));
 assert.ok(r.warnings.some(x=>x.code==='REPORT_DATE_CONFLICT'));
});
test('rechaza otros encabezados, hojas visibles ambiguas y fórmulas de identidad',async()=>{
 for(const tweak of [(w,s)=>s.getCell('E4').value='CAPACIDAD',(w)=>w.addWorksheet('Otra'),(w,s)=>s.getCell('D6').value={formula:'X',result:'T-16'}]){
  await assert.rejects(parseWorkbook(await fixture(tweak)),{status:422});
 }
});
test('rechaza archivo no Excel, marca ambigua o costo fórmula sin resultado',async()=>{
 await assert.rejects(parseWorkbook(Buffer.from('otro formato')),{status:422});
 for(const tweak of [(w,s)=>s.getCell('B7').value='X',(w,s)=>s.getCell('H7').value={formula:'2222'}]){
  await assert.rejects(parseWorkbook(await fixture(tweak)),{status:422});
 }
});
test('mantiene el rechazo de relaciones a la web',async()=>{
 const r=await fixture((w,s)=>{s.getCell('F5').value={text:'Enlace',hyperlink:'https://example.invalid/'};});
 await assert.rejects(parseWorkbook(r),{code:'INVALID_XLSX'});
});
test('muestra suministrada, si se proporciona localmente', {skip:!process.env.PUEBLA_XLSX},async()=>{
 const r=await parseWorkbook(fs.readFileSync(process.env.PUEBLA_XLSX));
 assert.equal(r.records.length,6);assert.equal(r.unitCount,5);
 assert.equal(r.tabDate,'2026-11-18');assert.equal(r.sourceDate,'2026-11-24');
});
