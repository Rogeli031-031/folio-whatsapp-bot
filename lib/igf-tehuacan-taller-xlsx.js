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
const months='ENERO FEBRERO MARZO ABRIL MAYO JUNIO JULIO AGOSTO SEPTIEMBRE OCTUBRE NOVIEMBRE DICIEMBRE'.split(' ');
function printedDate(s){
 const m=/^FECHA\s*:\s*(\d{1,2}) DE ([A-Z]+) DE (\d{4})$/.exec(norm(s));
 const month=m?months.indexOf(m[2])+1:0;
 return month?isoDay(m[3]+'-'+String(month).padStart(2,'0')+'-'+m[1].padStart(2,'0')):null;
}
const kinds={PIPA:'Autotanque',CILINDRERA:'Cilindrera',UTILITARIO:'Utilitario'};
function parseLayout(sheet,fleet,{date1904=false}={}){
 if(sheet.rowCount>160||sheet.columnCount>32||fleet.rowCount>500||fleet.columnCount>64)fail('WORKBOOK_LAYOUT');
 const v=(r,c,t)=>sheet.cell(r,c,t), fv=(r,c)=>fleet.cell(r,c);
 if(norm(v(6,'B')).replace(/^EMPRESA:\s*/,'')!=='CIA MEXICANA TEHUACAN')fail('PLANT_NOT_VERIFIED');
 const fleetMap=new Map();
 for(let r=6;r<=fleet.rowCount;r++){
  if(norm(fv(r,'C'))!=='TEHUACAN'||!kinds[norm(fv(r,'D'))])continue;
  const eco=norm(fv(r,'F')),prefix=norm(fv(r,'E')),kind=kinds[norm(fv(r,'D'))];
  if(!eco)continue;
  const keys=kind==='Autotanque'&&/^[A-Z]$/.test(prefix)&&/^\d+$/.test(eco)?[prefix+eco]:[eco];
  for(const k of keys){if(fleetMap.has(k))fleetMap.set(k,null);else fleetMap.set(k,kind);}
 }
 if(!fleetMap.size)fail('PLANT_NOT_VERIFIED');
 const sourceDate=printedDate(v(6,'I'));
 const warnings=[],records=[];
 let latestEntry=null,start=0;
 const warn=(row,unit,code)=>warnings.push({row,unit,code});
 if(!sourceDate)warn(null,null,'MISSING_SOURCE_DATE');
 for(const section of ['Menor','Mayor']){
  const end=Array.from({length:sheet.rowCount-start},(_,i)=>start+i+1).find(r=>norm(v(r,'I'))==='TOTAL TALLER '+section.toUpperCase()+':');
  if(!end)fail('WORKBOOK_LAYOUT');
  const header=Array.from({length:end-start-1},(_,i)=>start+i+1).filter(r=>norm(v(r,'B'))==='NUM DE AT');
  if(header.length!==1||norm(v(header[0],'G'))!=='FALLA PRESENTADA'||norm(v(header[0],'I'))!=='REQUERIMIENTO'||norm(v(header[0],'J'))!=='COSTO DE REPARACION'||norm(v(header[0],'E'))!=='CAPACIDAD')fail('WORKBOOK_LAYOUT');
  for(let r=header[0]+1;r<end;r++){
   const raw=v(r,'B');if(empty(raw)){
    if(!empty(v(r,'G'))||!empty(v(r,'I'))||!empty(v(r,'J','number')))fail('ROW_WITHOUT_UNIT');
    continue;
   }
   const unit=norm(raw), kind=kinds[norm(v(r,'E','number-or-text'))]||fleetMap.get(unit);
   if(!/^[A-Z0-9][A-Z0-9 ./_-]{0,79}$/.test(unit)||!kind)fail('WORKBOOK_ROW');
   if(!fleetMap.has(unit)||!fleetMap.get(unit))warn(r,unit,'UNIT_UNMATCHED');
   else if(fleetMap.get(unit)!==kind)warn(r,unit,'UNIT_TYPE_CONFLICT');
   const entryRaw=v(r,'F'),entered=dayValue(entryRaw,date1904),exitRaw=v(r,'M');
   const exitDateAsReported=typeof exitRaw==='number'?null:dayValue(exitRaw,date1904);
   const exitAsReported=empty(exitRaw)?null:exitRaw instanceof Date?exitRaw.toISOString().slice(0,10):String(exitRaw).trim().slice(0,500);
   if(!entered)warn(r,unit,empty(entryRaw)||entryRaw==='-'?'MISSING_ENTRY_DATE':'INVALID_ENTRY_DATE');
   else{
    if(!latestEntry||entered>latestEntry)latestEntry=entered;
    if(sourceDate&&entered>sourceDate)warn(r,unit,'ENTRY_AFTER_HEADER');
   }
   if(exitAsReported)warn(r,unit,'EXIT_NOT_VERIFIED');
   const amount=(c)=>{const x=v(r,c,'number');if(empty(x)||String(x).trim()==='-')return null;if(!Number.isFinite(x)||x<0||x>100000000)fail('INVALID_REPAIR_COST');return x;};
   const text=(c,t)=>{const x=v(r,c,t);return empty(x)?null:String(x).trim().slice(0,1500)||null;};
   const advance=v(r,'L','number-or-text');
   records.push({sourceRow:r,unit,kind,section,brand:text('C','number-or-text'),model:text('D','number-or-text'),capacityL:Number.isFinite(v(r,'E','number-or-text'))?v(r,'E','number-or-text'):null,
    entered,entryAsReported:text('F'),fault:text('G'),repairable:text('H'),requested:text('I'),repairCost:amount('J'),supportType:text('K'),
    advance:empty(advance)?null:advance instanceof Date?advance.toISOString().slice(0,10):advance,exit:null,exitDateAsReported,exitAsReported,
    route:text('N'),coveringUnit:text('O'),notes:text('P'),hasSupport:text('Q'),aid:amount('R'),supportMonth:text('S')});
   if(records.length>120)fail('WORKBOOK_ROW');
  }
  start=end;
 }
 return {layout:'Tehuacan-E8-v1',sourceDate,tabDate:null,latestEntry,unitCount:new Set(records.map(r=>r.kind+':'+r.unit)).size,records,warnings};
}
async function parseWorkbook(bytes,ExcelJS=require('exceljs')){
 if(!Buffer.isBuffer(bytes))fail('INVALID_XLSX');
 assertXlsxBytes(bytes);
 const workbook=new ExcelJS.Workbook();
 try{await workbook.xlsx.load(bytes);}catch{fail('INVALID_XLSX');}
 const visible=workbook.worksheets.filter(s=>s.state==='visible');
 const get=name=>{const matches=visible.filter(s=>norm(s.name)===name);if(matches.length!==1)fail('WORKBOOK_LAYOUT');return matches[0];};
 const adapt=s=>({rowCount:s.rowCount,columnCount:s.columnCount,cell(r,c,cache){
  const cell=s.getCell(c+r);if(cell.isMerged&&cell.master!==cell)return null;
  let k=cell.value;
  if(cell.type===ExcelJS.ValueType.Formula){
   k=cell.result;
   if(((cache==='number'||cache==='number-or-text')&&Number.isFinite(k))||((cache==='text'||cache==='number-or-text')&&typeof k==='string'&&k.trim()))return k;
   fail('NON_LITERAL_WORKSHOP_CELL');
  }
  if(k instanceof Date||typeof k==='string'||Number.isFinite(k)||k===null)return k;
  if(Array.isArray(k?.richText))return k.richText.map(t=>t.text).join('');
  fail('NON_LITERAL_WORKSHOP_CELL');
 }});
 return parseLayout(adapt(get('REPORTE TALLER')),adapt(get('PARQUE VEHICULAR')),{date1904:workbook.properties.date1904===true});
}
module.exports={parseWorkbook,isoDay};
