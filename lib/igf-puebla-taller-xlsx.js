'use strict';
const {inflateRawSync}=require('node:zlib');
const fail=code=>{throw Object.assign(new Error(code),{code,status:422});};
// Same bounded archive validation as Acapulco; no dependency on its layout.
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
const monthNames='ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC'.split(' ');
function titleDate(title) {
 const m=/^(\d{1,2})(?: DE)? ([A-Z]{3})(?: DE)? (\d{2}|\d{4})$/.exec(norm(title));
 const month=m?monthNames.indexOf(m[2])+1:0;
 return month?isoDay((m[3].length===2?'20':'')+m[3]+'-'+String(month).padStart(2,'0')+'-'+m[1].padStart(2,'0')):null;
}
const kinds=new Map([['AUTOTANQUES','Autotanque'],['CILINDRERAS','Cilindrera'],['UTILITARIOS','Utilitario']]);
const headers=['REG.','TALLER MAYOR','TALLER MENOR','NUMERO ECONOMICO','FECHA DE INGRESO','FALLA REPORTADA EN TALLER','ESTATUS','COSTO DE REPARACION',null,'FECHA DE AVANCE','FECHA SALIDA','RUTA DE UNIDAD','OBSERVACIONES','DIAS EN TALLER'];
const fields='ABCDEFGHIJKLMNO';
function parseLayout(sheet,{date1904=false}={}){
 if(!sheet||sheet.rowCount>160||sheet.columnCount>32||norm(sheet.cell(1,'A'))!=='REPORTE DE TALLER')fail('WORKBOOK_LAYOUT');
 const warnings=[], records=[], seen=new Set();let kind=null, hadHeader=false, sourceDate=null;
 const warn=(row,unit,code)=>warnings.push({row,unit,code});
 for(let r=2;r<=sheet.rowCount;r++){
  const a=sheet.cell(r,'A'),label=norm(a).replace(/\s/g,'');
  if(kinds.has(label)){
   if((kind&&!hadHeader)||seen.has(label))fail('WORKBOOK_LAYOUT');
   seen.add(label);kind=kinds.get(label);hadHeader=false;continue;
  }
  if(!kind)continue;
  if(norm(a)==='REG.'){
   if(hadHeader)fail('WORKBOOK_LAYOUT');
   for(let i=0;i<headers.length;i++){
    const v=norm(sheet.cell(r,fields[i]));const exp=(i===3&&kind==='Utilitario')?'UTILITARIO':headers[i];
    if(i===8?!/^APOYO\s*\/\s*(PRESUPUESTO|PREST\.?|PRESTAMO)$/.test(v):(i===6?v.replace(/\s/g,''):v)!==exp)fail('WORKBOOK_LAYOUT');
   }
   hadHeader=true;
   if(kind==='Autotanque')sourceDate=dayValue(sheet.cell(r,'O','date'),date1904);
   continue;
  }
  const d=sheet.cell(r,'D');
  if(empty(d)){
   for(const c of 'BCEFGHIJKLM')if(!empty(sheet.cell(r,c,c==='H'?'number':undefined)))fail('ROW_WITHOUT_UNIT');
   continue;
  }
  if(!hadHeader||!/^\d+$/.test(String(a))||!Number.isSafeInteger(Number(a)))fail('WORKBOOK_ROW');
  if(typeof d!=='string')fail('WORKBOOK_ROW');
  const unit=norm(d);
  if(kind==='Autotanque'?!/^T[- ]?\d{1,6}$/.test(unit):kind==='Cilindrera'?!/^C[- ]?\d{1,6}$/.test(unit):!/^[-A-Z0-9 ._/]{1,80}$/.test(unit))fail('WORKBOOK_ROW');
  const b=norm(sheet.cell(r,'B')), c=norm(sheet.cell(r,'C'));
  if(!((b==='X'&&!c)||(c==='X'&&!b)))fail('WORKSHOP_SECTION');
  const readDate=(col,field)=>{
   const raw=sheet.cell(r,col),value=dayValue(raw,date1904);
   if(!value&&(!empty(raw)||col==='E'))warn(r,unit,(empty(raw)?'MISSING_':'INVALID_')+field);
   return value;
  };
  const text=(col)=>{const v=sheet.cell(r,col);return empty(v)?null:String(v).trim()||null;};
  const entered=readDate('E','ENTRY_DATE'),advance=readDate('J','ADVANCE_DATE'),exit=readDate('K','EXIT_DATE');
  if(entered&&((advance&&advance<entered)||(exit&&exit<entered)))warn(r,unit,'CONFLICTING_UNIT_DATES');
  if(!exit&&/SALE A RUTA|LIBERAD[AO]|SALIDA/i.test(text('M')??''))warn(r,unit,'UNCONFIRMED_EXIT');
  const cost=sheet.cell(r,'H','number');
  if(!empty(cost)&&(!Number.isFinite(cost)||cost<0||cost>100000000))fail('INVALID_REPAIR_COST');
  const days=sheet.cell(r,'N','number');
  records.push({sourceRow:r,registry:Number(a),kind,unit,section:b?'Mayor':'Menor',entered,fault:text('F'),status:text('G'),repairCost:empty(cost)?null:cost,aid:text('I'),advance,exit,route:text('L'),notes:text('M'),reportedDays:entered&&Number.isSafeInteger(days)&&days>=0&&days<=20000?days:null});
  if(records.length>120)fail('WORKBOOK_ROW');
 }
 if(!hadHeader||seen.size!==3)fail('WORKBOOK_LAYOUT');
 const tabDate=titleDate(sheet.name);
 if(!sourceDate)warn(null,null,'MISSING_SOURCE_DATE');
 if(sourceDate&&tabDate&&sourceDate!==tabDate)warn(null,null,'REPORT_DATE_CONFLICT');
 const unitCount=new Set(records.map(row=>row.kind+':'+row.unit)).size;
 return {layout:'Puebla-v1',sourceDate,tabDate,unitCount,records,warnings};
}
async function parseWorkbook(bytes,ExcelJS=require('exceljs')){
 if(!Buffer.isBuffer(bytes))fail('INVALID_XLSX');
 assertXlsxBytes(bytes);
 const workbook=new ExcelJS.Workbook();
 try{await workbook.xlsx.load(bytes);}catch{fail('INVALID_XLSX');}
 const visible=workbook.worksheets.filter(sheet=>sheet.state==='visible');
 if(visible.length!==1)fail('WORKBOOK_LAYOUT');
 const sheet=visible[0];
 return parseLayout({name:sheet.name,rowCount:sheet.rowCount,columnCount:sheet.columnCount,cell(r,c,cached){
  const cell=sheet.getCell(c+r);
  if(cell.isMerged&&cell.master!==cell)return null;
  let v=cell.value;
  if(cell.type===ExcelJS.ValueType.Formula){
   v=cell.result;
   if((cached==='number'&&Number.isFinite(v))||(cached==='date'&&(v instanceof Date||Number.isFinite(v))))return v;
   if((c==='N'||c==='O')&&cached)return null;
   fail('NON_LITERAL_WORKSHOP_CELL');
  }
  if(v instanceof Date||typeof v==='string'||Number.isFinite(v)||v===null)return v;
  if(Array.isArray(v?.richText))return v.richText.map(t=>t.text).join('');
  fail('NON_LITERAL_WORKSHOP_CELL');
 }},{date1904:workbook.properties.date1904===true});
}
module.exports={parseWorkbook,parseLayout,isoDay};
