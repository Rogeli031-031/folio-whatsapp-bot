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
