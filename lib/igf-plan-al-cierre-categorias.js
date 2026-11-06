"use strict";

const tons = '#,##0.000';
const pesos = '"$"#,##0.00;[Red]("$"#,##0.00)';
const perKg = '0.0000';
const groupKey = (category, subcategory) => JSON.stringify([category.toLocaleUpperCase("es"), subcategory.trim().toLocaleUpperCase("es")]);

function band(sheet, label) {
  const row = sheet.addRow([label]);
  sheet.mergeCells(row.number, 1, row.number, 8);
  row.font = {bold:true,color:{argb:"FFFFFFFF"},size:12};
  row.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF23465B"}};
  row.height = 23;
}

function header(sheet, cells) {
  const row = sheet.addRow(cells);
  row.font = {bold:true,color:{argb:"FF18384A"}};
  row.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FFDCEBF1"}};
  row.alignment = {vertical:"middle",wrapText:true};
  row.height = 32;
}

function numberRow(sheet, cells, formats, total=false) {
  const row = sheet.addRow(cells);
  formats.forEach(([col,fmt]) => {row.getCell(col).numFmt = fmt;});
  if (total) row.font = {bold:true};
  return row;
}

function addAmounts(a,b) {
  return a==null || b==null ? null : a+b;
}

function categoryTable(sheet, groups) {
  header(sheet,["Categoría","Subcategoría","Venta (t)","Descuentos ($)","Ponderado ($/kg)","Cobertura"]);
  const formats = [[3,tons],[4,pesos],[5,perKg]];
  function record(label, sub, kg, cost, total) {
    const inconsistent = kg < -0.0001 || (cost!=null && (cost < -0.01 || (Math.abs(kg)<0.0001 && Math.abs(cost)>0.01)));
    const note = inconsistent ? "Revisar diferencia ARR / DICF" : cost==null ? "Descuento pendiente" : null;
    numberRow(sheet,[label,sub,kg/1000,cost,!inconsistent && kg>0 && cost!=null ? cost/kg : null,note],formats,total);
  }
  let allKg=0,allCost=0;
  for (const cat of [...new Set(groups.map(g=>g.category))].sort()) {
    let kg=0,cost=0;
    for (const g of groups.filter(g=>g.category===cat).sort((a,b)=>a.subcategory.localeCompare(b.subcategory,"es"))) {
      record(cat,g.subcategory,g.kg,g.discount_amount,false);
      kg+=g.kg;cost=addAmounts(cost,g.discount_amount);
    }
    record("TOTAL "+cat,null,kg,cost,true);
    allKg+=kg;allCost=addAmounts(allCost,cost);
  }
  if(groups.length)record("TOTAL",null,allKg,allCost,true);
  else sheet.addRow(["Sin base ARR disponible para la planta y el corte."]);
}

function writeCategories(book, base, rows) {
  const sheet=book.addWorksheet("Categorías",{views:[{state:"frozen",ySplit:2}]});
  [42,23,21,24,24,32,24,24].forEach((width,i)=>{sheet.getColumn(i+1).width=width;});
  band(sheet,"Categorías del mes · Descuento ponderado por cliente");
  categoryTable(sheet,base.rows);
  const selected=rows.filter(r=>r.selected);
  const projected=new Map(base.rows.map(g=>[groupKey(g.category,g.subcategory),{...g}]));
  for (const r of selected) {
    for (const a of r.accounts) {
      const before=a.base-a.real, after=a.name===r.future?r.goal-r.real:0;
      const kgDelta=after-before;
      const costDelta=after*(r.rate??0)-before*(a.continuity??0);
      if(kgDelta===0 && costDelta===0)continue;
      const category=a.category.toLocaleUpperCase("es"),subcategory=a.subcategory;
      const key=groupKey(category,subcategory);
      const group=projected.get(key)??{category,subcategory,kg:0,discount_amount:0};
      group.kg+=kgDelta;group.discount_amount=addAmounts(group.discount_amount,costDelta);
      projected.set(key,group);
    }
  }
  sheet.addRow([]);
  band(sheet,"Cierre por categoría · Ponderado por cliente más el cambio de los compradores seleccionados");
  if(base.rows.length)categoryTable(sheet,[...projected.values()]);
  else sheet.addRow(["Sin base ARR para calcular el cierre por categoría."]);
  const note=sheet.addRow(["El ponderado de esta hoja describe la mezcla de clientes. La hoja IGF calcula la utilidad con el descuento base elegido en Plan al cierre."]);
  sheet.mergeCells(note.number,1,note.number,8);
  sheet.addRow([]);
  band(sheet,"Plan al cierre · Compradores seleccionados ("+selected.length+")");
  header(sheet,["Comprador","Cierre DICF (t)","Meta de cierre (t)","Venta adicional (t)","Nuevo descuento ($/kg)",
    "Descuento desde el corte ($)","Cambio de descuento ($)","Cambio de ingreso si cumple ($)"]);
  const formats=[[2,tons],[3,tons],[4,tons],[5,perKg],[6,pesos],[7,pesos],[8,pesos]];
  const totals={base:0,goal:0,kgDelta:0,pending:0,cost:0,costDelta:0,gain:0};
  for (const r of selected) {
    const pending=r.goal-r.real, cost=pending*(r.rate??0);
    numberRow(sheet,[r.name,r.base/1000,r.goal/1000,r.kgDelta/1000,r.rate,cost,r.costDelta,r.gain],formats);
    for(const k of ["base","goal","kgDelta","costDelta","gain"])totals[k]+=r[k];
    totals.pending+=pending;totals.cost+=cost;
  }
  numberRow(sheet,["TOTAL SELECCIÓN",totals.base/1000,totals.goal/1000,totals.kgDelta/1000,
    totals.pending>0?totals.cost/totals.pending:null,totals.cost,totals.costDelta,totals.gain],formats,true);
  sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};
  return sheet;
}
module.exports={writeCategories};
