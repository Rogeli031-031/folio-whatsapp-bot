'use strict';
const {inflateRawSync}=require('node:zlib');
const fail=code=>{throw Object.assign(new Error(code),{code,status:422});};
// Bounded archive validation matching the earlier workshop readers.
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
  if(/\.(?:xml|rels)$/.test(name)){
   let xml=unpacked.toString('utf8');
   if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail('INVALID_XLSX');
   // The original attaches a static Outlook CID image to a drawing. ExcelJS
   // never resolves CID; only this exact inert drawing relation is allowed.
   if(/^xl\/drawings\/_rels\/drawing\d+\.xml\.rels$/.test(name)){
    xml=xml.replace(/<Relationship Id="rId\d+" Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/image" Target="cid:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+" TargetMode="External"\s*\/>/g,'');
   }
   if(/TargetMode\s*=\s*["']External/i.test(xml))fail('INVALID_XLSX');
  }
  pos+=46+n+ext+comment;
 }
 segments.sort((a,b)=>a[0]-b[0]);
 if(segments.some((one,i)=>i&&one[0]<segments[i-1][1]))fail('INVALID_XLSX');
 if(pos!==end||!names.has('xl/workbook.xml'))fail('INVALID_XLSX');
}
const norm=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').trim().replace(/\s+/g,' ').toUpperCase();
const empty=v=>v===null||v===undefined||v==='';
const DAY=86400000;
function isoDay(v) {
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v)||v<'1900-01-01'||v>'2199-12-31')return null;
 const t=Date.parse(v+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v?v:null;
}
function dayValue(v,date1904){
 if(v instanceof Date)return Number.isFinite(v.getTime())?isoDay(v.toISOString().slice(0,10)):null;
 if(Number.isInteger(v)&&v>=61&&v<=110000)return isoDay(new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+v*DAY).toISOString().slice(0,10));
 if(typeof v!=='string')return null;
 const s=v.trim(),m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
 return isoDay(m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):s);
}
const {createHash}=require('node:crypto');
const kinds=new Map([['AUTOTANQUES','Autotanque'],['CILINDRERAS','Cilindrera'],['UTILITARIOS','Utilitario']]);
const headings=['REG.','TALLER MAYOR','TALLER MENOR','NUMERO ECONOMICO','FECHA DE INGRESO','FALLA REPORTADA EN TALLER','ESTATUS','COSTO DE REPARACION',null,'FECHA DE AVANCE','FECHA SALIDA','RUTA DE UNIDAD','OBSERVACIONES','DIAS EN TALLER'];
function readSheet(sheet,day,date1904){
 if(sheet.rowCount>160||sheet.columnCount>32||norm(sheet.cell(1,'A'))!=='REPORTE DE TALLER')fail('WORKBOOK_LAYOUT');
 const warnings=[],records=[],seen=new Set();let kind=null,hasHeader=false;
 for(let r=2;r<=sheet.rowCount;r++){
  const a=sheet.cell(r,'A'),label=norm(a).replace(/\s/g,'');
  if(kinds.has(label)){
   if((kind&&!hasHeader)||seen.has(label))fail('WORKBOOK_LAYOUT');
   seen.add(label);kind=kinds.get(label);hasHeader=false;continue;
  }
  if(!kind)continue;
  if(norm(a)==='REG.'){
   if(hasHeader)fail('WORKBOOK_LAYOUT');
   for(let i=0;i<headings.length;i++){
    const v=norm(sheet.cell(r,'ABCDEFGHIJKLMN'[i]));
    const exp=i===3&&kind==='Utilitario'?'UTILITARIO':headings[i];
    if(i===8?!/^APOYO\s*\/\s*(PRESUPUESTO|PREST\.?|PRESTAMO)$/.test(v):(i===6?v.replace(/\s/g,''):v)!==exp)fail('WORKBOOK_LAYOUT');
   }
   hasHeader=true;continue;
  }
  const raw=sheet.cell(r,'D');
  if(empty(raw)){
   for(const c of 'BCEFGHIJKLM')if(!empty(sheet.cell(r,c,c==='H'?'number':undefined)))fail('ROW_WITHOUT_UNIT');
   continue;
  }
  if(!hasHeader||!/^\d+$/.test(String(a))||!Number.isSafeInteger(Number(a)))fail('WORKBOOK_ROW');
  const unit=norm(raw);
  if(typeof raw!=='string'&&!Number.isSafeInteger(raw))fail('WORKBOOK_ROW');
  if(!/^[A-Z0-9][A-Z0-9 ./_-]{0,79}$/.test(unit)|| (kind==='Autotanque'&&!/^\d{1,8}$/.test(unit)))fail('WORKBOOK_ROW');
  const unitKey=kind==='Autotanque'?unit.replace(/^0+(?=\d)/,''):unit.replace(/[ ._/-]/g,'');
  const b=norm(sheet.cell(r,'B')),c=norm(sheet.cell(r,'C'));
  if(!((b==='X'&&!c)||(c==='X'&&!b)))fail('WORKSHOP_SECTION');
  const warn=code=>warnings.push({sourceRow:r,unit,code});
  const text=col=>{const x=sheet.cell(r,col); return empty(x)?null:String(x).trim().slice(0,1500)||null;};
  const getDate=(col,field)=>{
   const raw=sheet.cell(r,col),value=dayValue(raw,date1904);
   if(!value&&(!empty(raw)||col==='E'))warn((empty(raw)?'MISSING_':'INVALID_')+field);
   if(value&&value>day)warn('AFTER_CUT_'+field);
   return {value,raw:empty(raw)?null:(raw instanceof Date?raw.toISOString().slice(0,10):String(raw).slice(0,150))};
  };
  const e=getDate('E','ENTRY_DATE'),j=getDate('J','ADVANCE_DATE'),k=getDate('K','EXIT_DATE');
  if(e.value&&((j.value&&j.value<e.value)||(k.value&&k.value<e.value)))warn('CONFLICTING_UNIT_DATES');
  const cost=sheet.cell(r,'H','number'),n=sheet.cell(r,'N','number');
  if(!empty(cost)&&(!Number.isFinite(cost)||cost<0||cost>100000000))fail('INVALID_REPAIR_COST');
  const reportedDays=Number.isSafeInteger(n)&&n>=0?n:null;
  if(e.value&&e.value<=day&&reportedDays!==null&&(Date.parse(day)-Date.parse(e.value))/DAY!==reportedDays)warn('DAYS_DIFFER_FROM_CALENDAR');
  records.push({sourceRow:r,registry:Number(a),kind,unit,unitKey,section:b?'Mayor':'Menor',entry:e,advance:j,exit:k,
   fault:text('F'),status:text('G'),repairCost:empty(cost)?null:cost,aid:text('I'),route:text('L'),notes:text('M'),reportedDays});
  if(records.length>120)fail('WORKBOOK_ROW');
 }
 if(!hasHeader||seen.size!==3)fail('WORKBOOK_LAYOUT');
 const content=records.map(({sourceRow,registry,...detail})=>JSON.stringify(detail)).sort();
 return {date:day,records,unitCount:new Set(records.map(r=>r.kind+':'+r.unitKey)).size,warnings,
  sha:createHash('sha256').update(JSON.stringify(content)).digest('hex')};
}
function absPeriod(period){return typeof period==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(period);}
async function parseWorkbook(bytes,period,ExcelJS=require('exceljs')){
 if(!Buffer.isBuffer(bytes)||!absPeriod(period))fail('INVALID_SOURCE');
 assertXlsxBytes(bytes);
 const workbook=new ExcelJS.Workbook();
 try{await workbook.xlsx.load(bytes);}catch{fail('INVALID_XLSX');}
 const visible=workbook.worksheets.filter(s=>s.state==='visible');
 if(visible.length>32)fail('WORKBOOK_LAYOUT');
 const namedFleet=visible.filter(s=>norm(s.name)==='PARQUE VEHICULAR');
 if(namedFleet.length!==1)fail('WORKBOOK_LAYOUT');
 const fleet=namedFleet[0];
 if(fleet.rowCount>500||fleet.columnCount>64||norm(fleet.getCell('B2').value).replace(/^EMPRESA:\s*/,'').replace(/[^A-Z ]/g,'').trim()!=='GAS TOMZA DE MEXICO SA DE CV')fail('PLANT_NOT_VERIFIED');
 const labels=[];
 for(let r=8;r<=fleet.rowCount;r++){const cell=fleet.getCell('C'+r);if(cell.isMerged&&cell.master!==cell)continue;const label=norm(cell.value);if(label)labels.push(label);}
 if(!labels.length||labels.some(label=>label!=='QUERETARO'))fail('PLANT_NOT_VERIFIED');
 const cuts=[],seen=new Set(),date1904=workbook.properties.date1904===true;
 for(const s of visible){
  if(s===fleet)continue;
  const n=s.name.trim();
  if(!/^\d{1,2}$/.test(n))fail('WORKBOOK_LAYOUT');
  const day=isoDay(period+'-'+n.padStart(2,'0'));
  if(!day||seen.has(day))fail('INVALID_CUT_DATE');
  seen.add(day);
  cuts.push(readSheet({rowCount:s.rowCount,columnCount:s.columnCount,cell(r,c,cached){
   const cell=s.getCell(c+r);if(cell.isMerged&&cell.master!==cell)return null;
   let v=cell.value;
   if(cell.type===ExcelJS.ValueType.Formula){
    v=cell.result;if(cached==='number'&&Number.isFinite(v))return v;
    if(cached&&c==='N')return null;
    fail('NON_LITERAL_WORKSHOP_CELL');
   }
   if(v instanceof Date||typeof v==='string'||Number.isFinite(v)||v===null)return v;
   if(Array.isArray(v?.richText))return v.richText.map(t=>t.text).join('');
   fail('NON_LITERAL_WORKSHOP_CELL');
  }},day,date1904));
 }
 if(!cuts.length||cuts.length>31)fail('WORKBOOK_LAYOUT');
 cuts.sort((a,b)=>a.date.localeCompare(b.date));return {layout:'Queretaro-v1',period,cuts};
}
module.exports={parseWorkbook,absPeriod};
