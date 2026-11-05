"use strict";
const ExcelJS=require("exceljs");
const {normNombre}=require("./cliente-contacto");

function addSheet(book,name,labels,values) {
  const sheet=book.addWorksheet(name,{views:[{state:"frozen",ySplit:1}]});
  sheet.addRow(labels);
  for(const row of values) sheet.addRow(row);
  sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:labels.length}};
  sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
  sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF23465B"}};
  sheet.columns.forEach((col,i)=>{col.width=i===0?39:Math.max(18,Math.min(36,labels[i].length+3));});
  return sheet;
}

async function workbook({plant,period,cutoff,mode,source,result,anchor,contacts}) {
  const book=new ExcelJS.Workbook(), {rows,scenario:s}=result;
  const phones=new Map(contacts.map(c=>[normNombre(c.cliente_nombre_norm),c.telefono]));
  const sheet=addSheet(book,"Plan al cierre",
    ["Comprador","Venta real (t)","Desc. real ($/kg)","Cierre DICF (t)","Continuidad ($/kg)","Nuevo descuento ($/kg)",
      "Meta de cierre (t)","Cierre mínimo (t)","Cambio si cumple ($)","Cambio solo forecast ($)","En IGF","Teléfono","Mes de referencia"],
    rows.map(r=>[r.name,r.real/1000,r.actual,r.base/1000,r.continuity,r.rate,r.goal/1000,r.minimum==null?null:r.minimum/1000,
      r.gain,r.downside,r.selected?"Sí":"No",phones.get(normNombre(r.future))??null,r.reference]));
  for(const index of [2,4,7,8])sheet.getColumn(index).numFmt='#,##0.000';
  for(const index of [3,5,6])sheet.getColumn(index).numFmt='0.0000';
  for(const index of [9,10])sheet.getColumn(index).numFmt='#,##0.00;[Red](#,##0.00)';
  const groups=new Map(), accounts=[];
  for(const r of rows)for(const a of r.accounts) {
    const kg=r.selected ? a.real+(a.name===r.future?r.goal-r.real:0) : a.base;
    const rate=r.selected?r.rate:a.continuity;
    const pending=kg-a.real;
    const cost=a.realCost===null || (pending>0 && rate===null) ? null : a.realCost+pending*(rate??0);
    const key=JSON.stringify([a.category,a.subcategory]);
    const group=groups.get(key)??{category:a.category,subcategory:a.subcategory,kg:0,cost:0};
    group.kg+=kg;
    group.cost=group.cost===null||cost===null?null:group.cost+cost;
    groups.set(key,group);
    accounts.push([r.name,a.name,a.category,a.subcategory,a.real/1000,a.base/1000,kg/1000,cost,phones.get(normNombre(a.name))??null]);
  }
  addSheet(book,"Cuentas",["Comprador","Cuenta","Categoría","Subcategoría","Venta real (t)","DICF (t)","Venta plan (t)","Descuento plan ($)","Teléfono"],accounts);
  const categoryRows=[];
  const categories=[...new Set([...groups.values()].map(g=>g.category))].sort();
  for(const cat of categories) {
    let kg=0,cost=0;
    for(const g of [...groups.values()].filter(g=>g.category===cat).sort((a,b)=>a.subcategory.localeCompare(b.subcategory,"es"))) {
      categoryRows.push([cat,g.subcategory,g.kg/1000,g.cost,g.kg && g.cost!==null?g.cost/g.kg:null]);
      kg+=g.kg;cost=cost===null||g.cost===null?null:cost+g.cost;
    }
    categoryRows.push([cat,"TOTAL",kg/1000,cost,kg && cost!==null?cost/kg:null]);
  }
  addSheet(book,"Categorías",["Categoría","Subcategoría","Venta plan (t)","Descuentos ($)","Ponderado ($/kg)"],categoryRows);
  const fin=anchor.financials??{}, budget=anchor.fixed, baseCost=anchor.q*1000*anchor.d;
  const hg=anchor.hg_kg==null?null:-anchor.hg_kg;
  const delta=s.result-s.baseResult;
  addSheet(book,"IGF",["Indicador","Base","Plan seleccionado","Cambio"],[
    ["Planta",plant],["Mes",period.month+"/"+period.year],["Corte",cutoff],["Fuente",mode],["Compradores seleccionados",0,result.count],
    ["Venta (t)",anchor.q,s.kg/1000,s.kgDelta/1000],["Descuento medio ($/kg)",anchor.d,s.rate,s.rate-anchor.d],
    ["Descuentos ($)",baseCost,s.cost,s.cost-baseCost],["Margen IGF ($/kg)",fin.margen_kg,fin.margen_kg],
    ["Margen DICF ($/kg)",source.margin,source.margin],["Aportación HG ($)",hg===null?null:hg*anchor.q*1000,hg===null?null:hg*s.kg,hg===null?null:hg*s.kgDelta],
    ["Ingreso IGF ($)",s.baseResult+budget,s.result+budget,delta],["Operativos ($)",fin.operativos_mxn,fin.operativos_mxn],
    ["Corporativos ($)",fin.corporativos_mxn,fin.corporativos_mxn],["Impuestos ($)",fin.impuestos_mxn,fin.impuestos_mxn],
    ["Gastos e impuestos ($)",budget,budget,0],["Resultado final ($)",s.baseResult,s.result,delta],
    ["Cambio comercial seleccionado ($)",null,null,s.commercial],["Ajuste de base IGF frente a DICF ($), incluye HG",null,null,delta-s.commercial],
    ["Cambio comercial de toda la cartera calculable ($)",null,null,result.portfolio],["Filas sin cambio calculable",null,result.pending]
  ]);
  return Buffer.from(await book.xlsx.writeBuffer());
}
module.exports={workbook};
