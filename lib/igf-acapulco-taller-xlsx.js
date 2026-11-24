'use strict';
// The passed XLSX loader must enforce an OOXML expanded-size bound,
// reject external links/macros and return a bounded, non-executing cell accessor.
const {inflateRawSync}=require('node:zlib');
const months='ENERO FEBRERO MARZO ABRIL MAYO JUNIO JULIO AGOSTO SEPTIEMBRE OCTUBRE NOVIEMBRE DICIEMBRE'.split(' ');
const norm=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').trim().replace(/\s+/g,' ').toUpperCase();
const fail=code=>{throw Object.assign(Error(code),{status:422,code});};
function parseDateHeader(value){
 const m=/^FECHA\s*:\s*(\d{1,2})(?:\s+DE)?\s+([A-Z]+)(?:\s+DE)?\s+(\d{4})$/.exec(norm(value));
 if(!m||!months.includes(m[2]))fail('REPORT_DATE_INVALID');
 const s=m[3]+'-'+String(months.indexOf(m[2])+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');
 if(!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('REPORT_DATE_INVALID');
 return s;
}
function parseLayout(wb){
 if(!wb?.sheet||wb.hasUnsafeParts!==false)fail('UNSAFE_WORKBOOK');
 const workshop=wb.sheet('REPORTE TALLER'), fleet=wb.sheet('PARQUE VEHICULAR');
 if(!workshop||!fleet||workshop.rowCount>160||fleet.rowCount>500)fail('WORKBOOK_LAYOUT');
 const C=(r,c)=>workshop.cell(r,c), F=(r,c)=>fleet.cell(r,c);
 const e9=norm(C(4,'B')).replace(/^EMPRESA:\s*/,'')==='GAS URIBE DE ACAPULCO';
 const e10=norm(C(5,'B')).replace(/^EMPRESA:\s*/,'')==='HIDROGAS ACAPULCO';
 if(e9===e10) fail('COMPANY_NOT_VERIFIED');
 const company=e9?'GAS URIBE DE ACAPULCO':'HIDROGAS ACAPULCO';
 if(e9&&norm(F(2,'B')).replace(/^EMPRESA:\s*/,'')!==company)fail('COMPANY_NOT_VERIFIED');
 const date=parseDateHeader(C(e9?4:5,'I'));
 const types=new Map();
 for(let r=6;r<=fleet.rowCount;r++){
  if(norm(F(r,'D'))!=='PIPA'&&norm(F(r,'D'))!=='CILINDRERA')continue;
  if(e9&&norm(F(r,'E'))!=='A')continue;
  if(e10&&norm(F(r,'C'))!=='HIDROGAS')continue;
  const n=String(F(r,'F')??'').trim();if(!/^\d{1,3}$/.test(n))fail('FLEET_ECO_INVALID');
  const eco='AT-'+n.padStart(3,'0');
  if(types.has(eco))fail('FLEET_DUPLICATE');
  types.set(eco,norm(F(r,'D')));
 }
 let section, headers=false, closed=false;const seenSections=new Set(), records=[];let excluded=0;
 for(let r=6;r<=workshop.rowCount;r++){
  const label=norm(C(r,'A'));
  if(label==='TALLER MENOR'||label==='TALLER MAYOR'){
   if(section&&!closed)fail('SECTION_NO_TOTAL');
   section=label.endsWith('MENOR')?'Menor':'Mayor';if(seenSections.has(section))fail('SECTION_REPEATED');
   seenSections.add(section);headers=false;closed=false;continue;
  }
  if(label==='PROCESO DE BAJA')break;
  if(!section||closed)continue;
  if(norm(C(r,'B'))==='NUM DE AT'){
   if(norm(C(r,'G'))!=='FALLA PRESENTADA'||norm(C(r,'I'))!=='REQUERIMIENTO'||norm(C(r,'E'))!=='CAPACIDAD')fail('HEADERS_INVALID');
   headers=true;continue;
  }
  if(norm(C(r,'I'))==='TOTAL TALLER '+section.toUpperCase()+':'){if(!headers)fail('HEADERS_MISSING');closed=true;continue;}
  const n=String(C(r,'B')??'').trim();
  if(!n)continue;
  if(!headers||!/^\d{1,3}$/.test(n))fail('ROW_INVALID');
  const eco='AT-'+n.padStart(3,'0');
  if(!types.has(eco))fail('UNMATCHED_FLEET');
  if(types.get(eco)!=='PIPA'){excluded++;continue;}
  records.push({eco,section,kind:'Pipa',brand:C(r,'C'),model:C(r,'D'),capacityL:C(r,'E'),enteredRaw:C(r,'F'),fault:C(r,'G'),requested:C(r,'I'),repairCost:C(r,'J'),advanceRaw:C(r,'L'),exitRaw:C(r,'M'),status:C(r,'P'),aid:C(r,'R')});
 }
 if(!closed||seenSections.size!==2)fail('LAYOUT_INCOMPLETE');
 return {company,date,verifiedLayout:e9?'E9-v1':'E10-v1',records,excluded};
}
// Cap central directory aggregate BEFORE XML inflation. Only normal, single-disk OOXML.
function assertXlsxBytes(buffer){
 if(buffer.length<22||buffer.length>2000000)fail('INVALID_XLSX');
 let end=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){
  if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}
 }
 if(end<0||buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6))fail('INVALID_XLSX');
 const entries=buffer.readUInt16LE(end+10), bytes=buffer.readUInt32LE(end+12), offset=buffer.readUInt32LE(end+16);
 if(!entries||entries>160||entries!==buffer.readUInt16LE(end+8)||offset+bytes!==end)fail('INVALID_XLSX');
 const names=new Set(), segments=[];let pos=offset,total=0;
 for(let i=0;i<entries;i++){
  if(pos+46>end||buffer.readUInt32LE(pos)!==0x02014b50)fail('INVALID_XLSX');
  const flags=buffer.readUInt16LE(pos+8), method=buffer.readUInt16LE(pos+10), size=buffer.readUInt32LE(pos+24), n=buffer.readUInt16LE(pos+28), ext=buffer.readUInt16LE(pos+30), comment=buffer.readUInt16LE(pos+32);
  if(pos+46+n+ext+comment>end||(flags&1)||![0,8].includes(method))fail('INVALID_XLSX');
  const name=buffer.subarray(pos+46,pos+46+n).toString('utf8').toLowerCase();
  if(names.has(name)||/\\|(?:^|\/)\.\.(?:\/|$)|vmacros|vbaproject|externallinks|activex|embeddings/.test(name))fail('INVALID_XLSX');
  names.add(name);total+=size;if(total>12000000)fail('INVALID_XLSX');
  const local=buffer.readUInt32LE(pos+42),compressed=buffer.readUInt32LE(pos+20);
  if(local+30>offset||buffer.readUInt32LE(local)!==0x04034b50||buffer.readUInt16LE(local+8)!==method||buffer.readUInt16LE(local+6)!==flags)fail('INVALID_XLSX');
  const ln=buffer.readUInt16LE(local+26),le=buffer.readUInt16LE(local+28),data=local+30+ln+le;
  if(data+compressed>offset||ln!==n||!buffer.subarray(local+30,local+30+ln).equals(buffer.subarray(pos+46,pos+46+n)))fail('INVALID_XLSX');
  segments.push([local,data+compressed]);
  let unpacked;try{unpacked=method===8?inflateRawSync(buffer.subarray(data,data+compressed),{maxOutputLength:Math.max(1,size+1)}):buffer.subarray(data,data+compressed);}catch{fail('INVALID_XLSX');}
  if(unpacked.length!==size)fail('INVALID_XLSX');
  if((/\.(?:xml|rels)$/.test(name))&&/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External/i.test(unpacked.toString('utf8')))fail('INVALID_XLSX');
  pos+=46+n+ext+comment;
 }
 segments.sort((a,b)=>a[0]-b[0]);
 if(segments.some((one,i)=>i&&one[0]<segments[i-1][1]))fail('INVALID_XLSX');
 if(pos!==end||!names.has('xl/workbook.xml'))fail('INVALID_XLSX');
}
async function parseWorkbook(buffer,ExcelJS=require('exceljs')){
 assertXlsxBytes(buffer);
 const wb=new ExcelJS.Workbook();
 try{await wb.xlsx.load(buffer);}catch{fail('INVALID_XLSX');}
 const sheets=new Map();
 for(const ws of wb.worksheets){const key=ws.name.trim();if(sheets.has(key))fail('WORKBOOK_LAYOUT');sheets.set(key,ws);}
 return parseLayout({hasUnsafeParts:false,sheet(name){
  const s=sheets.get(name);if(!s)return null;
  if(s.columnCount>160)fail('WORKBOOK_LAYOUT');
  return {rowCount:s.rowCount,cell:(r,c)=>{
   let v=s.getCell(c+r).value;
   if(v&&typeof v==='object'){
    if(v.formula||v.sharedFormula||v.hyperlink||v.error)fail('NON_LITERAL_WORKSHOP_CELL');
    if(Array.isArray(v.richText))v=v.richText.map(t=>t.text).join('');
    else if(v instanceof Date)v=Number.isFinite(v.getTime())?v.toISOString().slice(0,10):null;
    else fail('NON_LITERAL_WORKSHOP_CELL');
   }
   return typeof v==='string'?v.slice(0,1500):typeof v==='number'&&Number.isFinite(v)?v:null;
  }};
 }});
}
module.exports={parseWorkbook,parseLayout,parseDateHeader};
