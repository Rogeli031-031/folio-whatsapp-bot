'use strict';

const MONTHS = 'ENERO FEBRERO MARZO ABRIL MAYO JUNIO JULIO AGOSTO SEPTIEMBRE OCTUBRE NOVIEMBRE DICIEMBRE'.split(' ');
const COLORS = { tint:'FFD9DDE1', navy:'FF203864', meta:'FFD4D4D4', forecast:'FFFFFF00', red:'FFFF0000', green:'FF00B050', gold:'FFFFD966', ink:'FF000000', paper:'FFFFFFFF' };
const COLORS_TAB = { RESUMEN:COLORS.red,A:COLORS.gold,B:COLORS.green,C:COLORS.red };
const sum = (a) => a.reduce((v,x)=>v+(x??0),0);
function letters(c) { let s=''; for(;c>0;c=Math.floor((c-1)/26)) s=String.fromCharCode(65+(c-1)%26)+s; return s; }
function fmt(cell,style) {
 const sizes={title:20,hero:36,subtitle:20,subhero:26,period:26,header:12,totalhead:22,date:11,daily:14,total:16,avg:14,meta:14,forecast:16,variance:11,footer:11};
 const bold=['title','hero','subtitle','subhero','period','header','totalhead','total','meta','forecast','variance'].includes(style);
 cell.font={name:'Lato', size:sizes[style],bold,color:{argb:style==='totalhead'?COLORS.paper:COLORS.ink}};
 cell.alignment={horizontal:'center',vertical:'middle',wrapText:['subtitle','subhero','header'].includes(style)};
 const bg={header:COLORS.tint,totalhead:COLORS.navy,meta:COLORS.meta,forecast:COLORS.forecast,variance:COLORS.meta}[style];
 if(bg) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:bg}};
 if(style==='daily'||style==='total'||style==='avg'||style==='meta'||style==='forecast'||style==='variance')cell.numFmt='#,##0;[Red](#,##0);0';
 if(style==='header'||style==='totalhead'){const ln={style:'thin',color:{argb:COLORS.ink}};cell.border={top:ln,bottom:ln,left:ln,right:ln};}
}
function make(wb,name,key,model,kind,endCol,logoId) {
 const ws=wb.addWorksheet(name,{properties:{tabColor:{argb:COLORS_TAB[key]}},views:[{showGridLines:false}]});
 const isSummary=key==='RESUMEN';
 const prefix=(kind==='AT'?'PIPAS PROPIAS':'ESTACIONES PROPIAS');
 ws.getColumn(1).width=isSummary?9.33:5.11; ws.getColumn(2).width=isSummary?16.44:14.55; ws.getColumn(3).width=1.55;
 for(let i=4;i<=endCol;i++)ws.getColumn(i).width=isSummary?20:17.55;
 ws.getColumn(endCol-1).width=1.55;
 [isSummary?31.2:55.8,isSummary?77.25:67.5,40.2,18.6,isSummary?36:32.1,14.7].forEach((h,i)=>{ws.getRow(i+1).height=h;});
 for(let r=1;r<=3;r++)ws.mergeCells(r,2,r,endCol);
 ws.getCell('B1').value='ACAPULCO';fmt(ws.getCell('B1'),isSummary?'title':'hero');
 ws.getCell('B2').value='VENTA DE\n'+prefix;fmt(ws.getCell('B2'),isSummary?'subtitle':'subhero');
 ws.getCell('B3').value=(isSummary?'MES ':'TIPO '+key+'  •  ')+MONTHS[model.month-1]+' '+model.year;fmt(ws.getCell('B3'),'period');
 if(logoId != null){
  const anchors={RESUMEN:[[0,0,649604,0],[3,1,803274,568386]],A:[[3,0,792479,708660],[5,2,422273,73086]],B:[[1,0,0,0],[3,1,935197,212151]],C:[[0,0,857249,0],[3,1,934243,415986]]};
  const [tl,br]=anchors[key].map(([nativeCol,nativeRow,nativeColOff,nativeRowOff])=>({nativeCol,nativeRow,nativeColOff,nativeRowOff}));
  ws.addImage(logoId,{tl,br,editAs:'oneCell'});
 }
 ws.getCell('B4').value='Litros | Corte '+model.cutoff;
 fmt(ws.getCell('B4'),'footer');
 const value=(row,col,v,style)=>{const c=ws.getCell(row,col);if(v!==null&&v!==undefined)c.value=v;fmt(c,style);return c;};
 model.allDays.forEach((d,index)=>{const r=index+7;ws.getRow(r).height=21.9;const c=value(r,2,new Date(d+'T00:00:00Z'),'date');c.numFmt='ddd dd-mmm';});
 for(const [r,l] of [[39,'Total'],[41,'PROMEDIO'],[43,'META'],[44,'PROYECCIÓN'],[46,'VARIACIÓN']]) {ws.getRow(r).height=23;value(r,2,l,r===39?'total':'footer');}
 function daily(row,col,v){const c=value(row,col,v,'daily');if(row%2===1)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:COLORS.tint}};}
 return {ws,value,daily};
}
function formula(expression,result){return {formula:expression,result};}
function putDetail(wb,name,key,model,kind,items,logo) {
 const finish=items.length+5, last=letters(finish);
 const {ws,value,daily}=make(wb,name,key,model,kind,finish,logo);
 value(5,finish,'TOTAL','totalhead');
 if(kind==='EST')value(42,2,'META DIARIA (L)','footer');
 const elapsed=kind==='EST'?(model.stationElapsed??model.elapsed):model.elapsed;
 const full=kind==='EST'?(model.stationFullDays??model.fullBusinessDays):model.fullBusinessDays;
 const until=Number(model.cutoff.slice(-2))+6;
 for(let i=0;i<items.length;i++){
  const x=items[i],col=i+4,c=letters(col), denom=x.elapsed??elapsed, projected=denom>0?Math.round(x.total/denom*full):null;
  const h=value(5,col,x.label,'header');
  if(x.sourceLabels.length>0)h.note='Puntos de venta: '+x.sourceLabels.join(', ');
  else if(kind==='EST')h.note='No se identificó un punto de venta para esta meta al corte. No dar por confirmada una venta cero.';
  if(kind==='EST')value(42,col,x.dailyGoal,'meta');
  x.litres.forEach((v,j)=>{
   daily(j+7,col,v);
   if(x.workshop?.days.includes(model.allDays[j])){
    const cell=ws.getCell(j+7,col);
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:v||!x.workshop.wholeDays.includes(model.allDays[j])?COLORS.gold:COLORS.red}};
    cell.note=v?'Traslape: se conservó la venta. No se descuenta día sin confirmación de jornada completa.':x.workshop.wholeDays.includes(model.allDays[j])?'Jornada completa confirmada.':'Taller reportado; no consta jornada completa.';
   }
  });
  if(x.workshop){
   const latest=x.workshop.latest;
   const folios=Array.isArray(latest.folios)?latest.folios.filter(f=>/^F-\d{6}-\d+$/.test(f.code||'')&&typeof f.amount==='number'&&Number.isFinite(f.amount)):[];
   if(folios.length){
    const linked=folios.filter(f=>f.relation==='confirmed_repair');
    const pending=linked.some(f=>!(f.depositVerified===true?f.depositAt:null));
    const color=pending||!linked.length?COLORS.red:COLORS.forecast;
    const highlight={type:'pattern',pattern:'solid',fgColor:{argb:color}};
    const text=(rows,fn)=>rows.map(fn).join('\n');
    const rows=[
     [49,'FOLIOS / COSTO',text(folios,f=>f.code+'  MXN '+f.amount.toFixed(2)+(f.relation==='confirmed_repair'?'':' (otra falla)'))],
     [50,'CREACIÓN',text(folios,f=>f.code+': '+(f.createdAt||'Sin dato'))],
     [51,'DEPÓSITO Y CIERRE',text(folios,f=>f.code+': '+((f.depositVerified===true?f.depositAt:null)||'No verificado'))],
     [52,'DÍAS TALLER',x.workshop.days.length],
     [53,'SEGUIMIENTO',typeof latest.comment==='string'?latest.comment:'']
    ];
    for(const [rr,label,data] of rows){
     value(rr,2,label,'footer');
     const cell=value(rr,col,data,'footer');
     cell.alignment={wrapText:true,horizontal:'center',vertical:'middle'};
     ws.getRow(rr).height=Math.max(ws.getRow(rr).height||0,rr===52?22:Math.max(44,folios.length*17));
     if(rr<=51)cell.fill=highlight;
    }
   }else{
    value(52,2,'DÍAS TALLER','footer');
    value(52,col,x.workshop.days.length,'footer');
    value(53,2,'SEGUIMIENTO','footer');
    value(53,col,typeof latest.comment==='string'?latest.comment:'','footer');
    value(49,2,'FOLIOS / COSTO','footer');
    value(49,col,'Sin folio atribuible','footer').fill={type:'pattern',pattern:'solid',fgColor:{argb:COLORS.red}};
   }
   if(Array.isArray(latest.folioCandidates)&&latest.folioCandidates.length){
    value(54,2,'FOLIOS POR VALIDAR','footer');
    const cell=value(54,col,latest.folioCandidates.join(', '),'footer');
    cell.note='Coincidencia estricta de empresa jurídica, taller y eco. No acredita vínculo con esta reparación; no se aplica costo ni depósito.';
    cell.alignment={wrapText:true,horizontal:'center',vertical:'middle'};
    ws.getRow(54).height=48;
   }
   value(40,col,denom,'avg');
   value(40,2,'DÍAS HÁBILES NETOS','footer');
  }
  value(39,col,formula('SUM('+c+'7:'+c+until+')',x.total),'total');
  const avgCell=value(41,col,denom>0?formula(kind==='EST'?c+'39/'+denom:'ROUND('+c+'39/'+denom+',0)',x.avg):null,'avg');
 if(kind==='EST')avgCell.numFmt='#,##0.00';
  if(x.goal!=null)value(43,col,x.goal,'meta'); else value(43,col,null,'meta');
  value(44,col,denom>0?formula('ROUND('+c+'39/'+denom+'*'+String(full)+',0)',projected):null,'forecast');
  if(x.goal!=null)value(46,col,formula(c+'44-'+c+'43',projected-x.goal),'variance');else value(46,col,null,'variance');
 }
 for(let r=7;r<7+model.allDays.length;r++){
  if(r>until){daily(r,finish,null);continue;}
  const result=sum(items.map(x=>x.litres[r-7]));
  const f=items.length?'SUM(D'+r+':'+letters(finish-2)+r+')':'0';
  daily(r,finish,formula(f,result));
 }
 const m=sum(items.map(x=>x.total)), goal=kind==='EST'?sum(items.map(x=>x.goal)):null;
 const projected=sum(items.map(x=>(x.elapsed??elapsed)>0?Math.round(x.total/(x.elapsed??elapsed)*full):null));
 value(39,finish,formula('SUM('+last+'7:'+last+until+')',m),'total');
 const avgCell=value(41,finish,formula(kind==='EST'?last+'39/'+String(elapsed):'ROUND('+last+'39/'+String(elapsed)+',0)',kind==='EST'?m/elapsed:Math.round(m/elapsed)),'avg');
 if(kind==='EST')avgCell.numFmt='#,##0.00';
 if(kind==='EST')value(42,finish,sum(items.map(x=>x.dailyGoal)),'meta');
 value(43,finish,goal,'meta');
 value(44,finish,formula(items.length?'SUM(D44:'+letters(finish-2)+'44)':'0',projected),'forecast');
 value(46,finish,goal==null?null:formula(last+'44-'+last+'43',projected-goal),'variance');
 return { sheet:ws,last,items,m,goal,projected,elapsed };
}
function putSummary(wb,name,model,kind,groups,logo) {
 const {ws,value,daily}=make(wb,name,'RESUMEN',model,kind,8,logo);
 const closed=Number(model.cutoff.slice(-2));
 value(5,8,'TOTAL','totalhead');
 groups.forEach((g,i)=>value(5,i+4,(['TIPO A','TIPO B','TIPO C','SIN BASE'][i])+'   '+String(g.items.length),'header'));
 for(let d=0;d<model.allDays.length;d++){
  const r=d+7;
  const elapsed=d<closed;
  const amounts=groups.map(g=>sum(g.items.map(x=>x.litres[d])));
  groups.forEach((g,i)=>daily(r,i+4,elapsed?formula("'"+g.sheet.name+"'!"+g.last+r,amounts[i]):null));
  daily(r,8,elapsed?formula('SUM(D'+r+':'+(groups.length===4?'G':'F')+r+')',sum(amounts)):null);
 }
 const expected=(g,r)=>r===39?g.m:r===41?(kind==='EST'?g.m/g.elapsed:Math.round(g.m/g.elapsed)):r===43?g.goal:r===44?g.projected:g.goal===null?null:g.projected-g.goal;
 const style={39:'total',41:'avg',43:'meta',44:'forecast',46:'variance'};
 for(const row of [39,41,43,44,46]){
  const vals=groups.map(g=>expected(g,row));
  groups.forEach((g,i)=>{ const c=value(row,i+4,vals[i]===null?null:formula("'"+g.sheet.name+"'!"+g.last+row,vals[i]),style[row]); if(kind==='EST'&&row===41)c.numFmt='#,##0.00'; });
  const v=vals.every(x=>x===null)?null:row===41?(kind==='EST'?sum(groups.map(g=>g.m))/groups[0].elapsed:Math.round(sum(groups.map(g=>g.m))/groups[0].elapsed)):sum(vals);
  const f=row===41?(kind==='EST'?'H39/'+String(groups[0].elapsed):'ROUND(H39/'+String(groups[0].elapsed)+',0)'):'SUM(D'+row+':'+(groups.length===4?'G':'F')+row+')';
  const c=value(row,8,v===null?null:formula(f,v),style[row]); if(kind==='EST'&&row===41)c.numFmt='#,##0.00';
 }
 if(kind==='EST'){
  value(42,2,'META DIARIA (L)','footer');
  groups.forEach((g,i)=>value(42,i+4,formula("'"+g.sheet.name+"'!"+g.last+'42',sum(g.items.map(x=>x.dailyGoal))),'meta'));
  value(42,8,formula('SUM(D42:F42)',sum(groups.flatMap(g=>g.items.map(x=>x.dailyGoal)))),'meta');
 }
 const unresolved=new Map();
 for(const x of model.unresolved.filter(r=>r.kind===kind))unresolved.set(x.raw,(unresolved.get(x.raw)??0)+x.kg);
 if(unresolved.size){
  value(48,2,'PUNTOS SIN HOMOLOGAR (kg, no clasificados)','footer');
  value(48,8,sum([...unresolved.values()]),'avg');
  [...unresolved].sort().forEach(([label,kg],i)=>{value(49+i,2,label||'(sin dato)','footer');value(49+i,8,kg,'avg');});
 }
 if(kind==='EST'){
  const unmatched=model.stations.filter(x=>x.sourceLabels.length===0).map(x=>x.label);
  if(unmatched.length){const row=51+unresolved.size;value(row,2,'METAS SIN PUNTO HOMOLOGADO','footer');unmatched.forEach((x,i)=>value(row+1+i,2,x,'footer'));}
 }
 return ws;
}
function prependProductivity(wb, model, {logo}={}) {
 const legacy=wb.worksheets.slice();
 const logoId=logo?wb.addImage(logo):null;
 const ordered=[];
 for(const [kind,items,label] of [['AT',model.trucks,'PIPAS'],['EST',model.stations,'EST']]){
  const groups=['A','B','C'].map(k=>putDetail(wb,label+' TIPO '+k,k,model,kind,items.filter(x=>x.tier===k),logoId));
  if(kind==='AT'&&items.some(x=>x.tier===null))groups.push(putDetail(wb,'PIPAS SIN BASE','C',model,kind,items.filter(x=>x.tier===null),logoId));
  ordered.push(putSummary(wb,label+' RESUMEN',model,kind,groups,logoId),...groups.map(g=>g.sheet));
 }
 [...ordered,...legacy].forEach((w,i)=>{w.orderNo=i+1;});
 return ordered;
}
function prependUnavailable(wb,{year,month,cutoff,message}) {
 const legacy=wb.worksheets.slice();
 const ordered=[];
 for(const prefix of ['PIPAS','EST']){
  for(const [name,key] of [['RESUMEN','RESUMEN'],['TIPO A','A'],['TIPO B','B'],['TIPO C','C']]){
   const ws=wb.addWorksheet(prefix+' '+name,{properties:{tabColor:{argb:COLORS_TAB[key]}},views:[{showGridLines:false}]});
   ws.getColumn(2).width=24;
   ws.mergeCells('B1:H1');ws.mergeCells('B2:H2');ws.mergeCells('B4:H4');ws.getRow(4).height=36;
   ws.getCell('B1').value='ACAPULCO';fmt(ws.getCell('B1'),'title');
   ws.getCell('B2').value='PRODUCTIVIDAD NO DISPONIBLE';fmt(ws.getCell('B2'),'period');
   ws.getCell('B3').value=cutoff||MONTHS[Number(month)-1]+' '+year;fmt(ws.getCell('B3'),'footer');
   ws.getCell('B4').value=message;fmt(ws.getCell('B4'),'header');
   ordered.push(ws);
  }
 }
 [...ordered,...legacy].forEach((w,i)=>{w.orderNo=i+1;});
}
module.exports={prependProductivity,prependUnavailable};
