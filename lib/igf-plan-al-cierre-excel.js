"use strict";
const ExcelJS=require("exceljs");
const {normNombre}=require("./cliente-contacto");
const {writeCategories}=require("./igf-plan-al-cierre-categorias");
const {HG_PERCENT_LABEL,DISCOUNT_LABELS,DISCOUNT_SOURCE_ROW}=require("../frontend-dashboard/lib/igf-plan-al-cierre");

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

async function workbook({plant,period,cutoff,mode,source,result,anchor,contacts,categoryBase}) {
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
  const accounts=[];
  for(const r of rows)for(const a of r.accounts) {
    const kg=r.selected ? a.real+(a.name===r.future?r.goal-r.real:0) : a.base;
    const rate=r.selected?r.rate:a.continuity;
    const pending=kg-a.real;
    const cost=a.realCost===null || (pending>0 && rate===null) ? null : a.realCost+pending*(rate??0);
    accounts.push([r.name,a.name,a.category,a.subcategory,a.real/1000,a.base/1000,kg/1000,cost,phones.get(normNombre(a.name))??null]);
  }
  addSheet(book,"Cuentas",["Comprador","Cuenta","Categoría","Subcategoría","Venta real (t)","DICF (t)","Venta plan (t)","Descuento plan ($)","Teléfono"],accounts);
  writeCategories(book,categoryBase,rows);
  const fin=anchor.financials??{}, budget=anchor.fixed, baseCost=s.baseCost;
  const hg=anchor.hg_kg==null?null:-anchor.hg_kg;
  const baseHgAmount=hg===null?null:hg*anchor.q*1000;
  const baseHgKg=anchor.hg_pct==null?null:anchor.q*1000*anchor.hg_pct;
  const delta=s.result-s.baseResult;
  const igf=addSheet(book,"IGF",["Indicador","Base","Plan seleccionado","Cambio"],[
    ["Planta",plant],["Mes",period.month+"/"+period.year],["Corte",cutoff],["Fuente",mode],["Compradores seleccionados",0,result.count],
    [DISCOUNT_SOURCE_ROW,DISCOUNT_LABELS[result.discountSource]],
    ["Venta (t)",anchor.q,s.kg/1000,s.kgDelta/1000],["Descuento medio ($/kg)",s.baseRate,s.rate,s.rate-s.baseRate],
    ["Descuentos ($)",baseCost,s.cost,s.cost-baseCost],["Margen IGF ($/kg)",fin.margen_kg,fin.margen_kg],
    ["Margen DICF ($/kg)",source.margin,source.margin],
    ["HG generado / perdido (kg)",baseHgKg,s.hgKg,baseHgKg==null||s.hgKg==null?null:s.hgKg-baseHgKg],
    ["Valoración HG ($/kg)",anchor.hg_price_kg,anchor.hg_price_kg],
    ["Aportación HG ($)",baseHgAmount,s.hgAmount,baseHgAmount==null||s.hgAmount==null?null:s.hgAmount-baseHgAmount],
    ["Efecto de editar el HG a la venta del plan ($)",null,null,s.hgEffect],
    ["Ingreso IGF ($)",s.baseResult+budget,s.result+budget,delta],["Operativos ($)",fin.operativos_mxn,fin.operativos_mxn],
    ["Corporativos ($)",fin.corporativos_mxn,fin.corporativos_mxn],["Impuestos ($)",fin.impuestos_mxn,fin.impuestos_mxn],
    ["Gastos e impuestos ($)",budget,budget,0],["Resultado final ($)",s.baseResult,s.result,delta],
    ["Cambio comercial seleccionado ($)",null,null,s.commercial],["Ajuste de base IGF frente a DICF ($), incluye HG",null,null,delta-s.commercial],
    ["Cambio comercial de toda la cartera calculable ($)",null,null,result.portfolio],["Filas sin cambio calculable",null,result.pending]
  ]);
  const rate=s.hgPercent==null?null:s.hgPercent/100;
  const hgRow=igf.addRow([HG_PERCENT_LABEL,anchor.hg_pct,rate,rate==null||anchor.hg_pct==null?null:rate-anchor.hg_pct]);
  for(const col of [2,3,4])hgRow.getCell(col).numFmt="0.0000%";
  igf.autoFilter={from:{row:1,column:1},to:{row:hgRow.number,column:4}};
  const comparison=addSheet(book,"Comparación de descuentos",["Descuento base","Venta base (kg)","Descuento del tablero ($/kg)","Venta del plan (kg)",
    "Descuento del plan ($)","Descuento del plan ($/kg)","Utilidad del plan ($)","Fuente elegida","Tasa base como costo ($/kg)"],
    Object.entries(result.comparisons).map(([key,value])=>[DISCOUNT_LABELS[key],s.baseKg,value==null?null:-value.baseRate,s.kg,
      value?.cost??null,value?.rate??null,value?.result??null,key===result.discountSource?"Sí":"",value?.baseRate??null]));
  for(const i of [2,4,5,7])comparison.getColumn(i).numFmt='#,##0.00;[Red](#,##0.00)';
  for(const i of [3,6,9])comparison.getColumn(i).numFmt='0.0000';
  return Buffer.from(await book.xlsx.writeBuffer());
}
module.exports={workbook};
