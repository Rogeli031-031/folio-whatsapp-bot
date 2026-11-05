"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ts=require("../frontend-dashboard/node_modules/typescript"),React=require("../frontend-dashboard/node_modules/react");
const {renderToStaticMarkup}=require("../frontend-dashboard/node_modules/react-dom/server");
const root=path.join(__dirname,"../frontend-dashboard");
const text=fs.readFileSync(path.join(root,"components/IgfSimulationModal.tsx"),"utf8");
function harness(fetcher){
 let index=0;const state=[],effects=[];
 const hooks={...React,useMemo:fn=>fn(),useEffect(fn){effects.push(fn);},useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==="function"?v(state[i]):v;}];},useRef(initial){const i=index++;if(!(i in state))state[i]={current:initial};return state[i];}};
 const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports","fetch",code+"\nmodule.exports.Surface=Surface;module.exports.WeekControls=WeekControls;module.exports.FullComparison=FullComparison;")((name)=>{
  if(name==="react")return hooks;
  if(name==="react/jsx-runtime")return require("../frontend-dashboard/node_modules/react/jsx-runtime");
  if(name==="@/lib/api")return {getApiUrl:x=>x};
  if(name==="@/lib/igf-simulation")return require("../frontend-dashboard/lib/igf-simulation");
  throw new Error(name);
 },module,module.exports,fetcher);
 return {async load(){effects[0]();effects[1]();await new Promise(resolve=>setImmediate(resolve));},render(props){index=0;return module.exports.Surface(props);},renderModal(props){index=0;return module.exports.default(props);},renderWeeks(props){return module.exports.WeekControls(props);},renderComparison(props){return module.exports.FullComparison(props);}};
}
function elements(node){if(!node||typeof node!=="object")return [];if(Array.isArray(node))return node.flatMap(elements);return [node,...elements(node.props?.children)];}
const model={q:1400,d:3.6,a:6.525225303866561,fixed:3850193.5114285713};
test("3D renders weekly/current/proposal markers, touch rotation and cancel without changing financial inputs",()=>{
 const h=harness(),props={model,q:1400,d:3.6,points:[{key:"week",label:"Semana 44",state:"real",q:1000,d:3,z:-100000,color:"purple"},{key:"current",label:"Tendencia actual",q:1400,d:3.6,z:245122,color:"yellow"}]};
 let tree=h.render(props),html=renderToStaticMarkup(tree);assert.match(html,/Semana 44/);assert.match(html,/Tendencia actual/);assert.match(html,/Equilibrio:/);assert.doesNotMatch(html,/NaN|Infinity/);
 assert.equal(elements(tree).find(e=>e.type==="button"&&e.props.children==="Vista 3D").props["aria-pressed"],true);
 const svg=elements(tree).find(e=>e.type==="svg");assert.equal(svg.props.style.touchAction,"none");
 const target={setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 const event=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,currentTarget:target,preventDefault(){}});
 svg.props.onPointerDown(event(10,10));svg.props.onPointerMove(event(180,60));
 const rotated=renderToStaticMarkup(h.render(props));assert.notEqual(html,rotated);assert.doesNotMatch(rotated,/NaN|Infinity/);
 svg.props.onPointerCancel();svg.props.onPointerMove(event(280,80));assert.equal(renderToStaticMarkup(h.render(props)),rotated);
 assert.equal(props.q,1400);assert.equal(props.d,3.6);
});
test("partial financial data shows an explicit explanation rather than a fictional 3D scenario",()=>{
 const h=harness();const tree=h.renderModal({row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:100,comDesc:-2,resultadoFinalImporte:null},token:"test",year:2026,month:11,cutoff:"2026-11-02",mode:"igf_diario",versionAsOf:true,onClose(){}});
 const html=renderToStaticMarkup(tree);assert.match(html,/Faltan venta/);assert.match(html,/HG faltante/);assert.doesNotMatch(html,/<svg/);assert.match(html,/Categorías del mes/);
});

test("middle-button drag zooms up/in, down/out, clamps and cancels without changing financial inputs",()=>{
 const h=harness(),props={model,q:1400,d:3.6,points:[]};
 const width=tree=>{const xs=elements(tree).filter(e=>e.type==="polygon").flatMap(p=>p.props.points.split(" ").map(pair=>Number(pair.split(",")[0])));return Math.max(...xs)-Math.min(...xs);};
 let tree=h.render(props),base=width(tree);const svg=()=>elements(h.render(props)).find(e=>e.type==="svg");
 const target={setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 const event=y=>({pointerId:1,button:1,clientX:100,clientY:y,currentTarget:target,preventDefault(){}});
 let view=svg();view.props.onPointerDown(event(200));view.props.onPointerMove(event(100));assert.ok(width(h.render(props))>base);
 view.props.onPointerMove(event(300));assert.ok(width(h.render(props))<base);
 view.props.onPointerMove(event(10000));const min=width(h.render(props));view.props.onPointerMove(event(20000));assert.equal(width(h.render(props)),min);
 view.props.onPointerMove(event(-10000));const max=width(h.render(props));view.props.onPointerMove(event(-20000));assert.equal(width(h.render(props)),max);
 view.props.onPointerCancel();view.props.onPointerMove(event(200));assert.equal(width(h.render(props)),max);
 assert.equal(width(harness().render(props)),base);
 assert.doesNotMatch(renderToStaticMarkup(h.render(props)),/Vista inicial|Girar gráfica|Terminar giro|Zoom de gráfica|Acercar gráfica|Alejar gráfica/);assert.equal(props.q,1400);assert.equal(props.d,3.6);
});

test("week checkboxes toggle individual weeks, all/none and disable incomplete points",()=>{
 const h=harness(),weeks=[{key:"a",label:"Semana 40",from:"2026-09-27",to:"2026-10-03",available:true,state:"real"},{key:"b",label:"Semana 41",from:"2026-10-04",to:"2026-10-10",available:true,state:"real"},{key:"gap",label:"Semana 42",from:"2026-10-11",to:"2026-10-17",available:false,state:"real"}];
 let hidden=[];const render=()=>h.renderWeeks({weeks,hidden,onChange:v=>{hidden=v;}});
 let tree=render();const checks=elements(tree).filter(e=>e.type==="input");assert.equal(checks[2].props.disabled,true);
 checks[0].props.onChange({target:{checked:false}});assert.deepEqual(hidden,["a"]);
 tree=render();assert.equal(elements(tree).find(e=>e.props?.["aria-label"]==="Mostrar Semana 40 del 2026-09-27").props.checked,false);
 elements(tree).find(e=>e.type==="button"&&e.props.children==="Ocultar todas").props.onClick();assert.deepEqual(hidden,["a","b"]);
 tree=render();elements(tree).find(e=>e.type==="button"&&e.props.children==="Mostrar todas").props.onClick();assert.deepEqual(hidden,[]);
});

test("three extended axes have arrows, named units and multiple tick labels, with a clear nonprobability legend",()=>{
 const h=harness(),tree=h.render({model,q:1400,d:3.6,points:[]});
 const axes=elements(tree).filter(e=>e.props?.["data-sim-axis"]);
 assert.deepEqual(axes.map(e=>e.props["data-sim-axis"]),["venta","descuento","resultado"]);
 for(const axis of axes){
  assert.ok(elements(axis).some(e=>e.type==="line"&&e.props.markerEnd));
  assert.ok(elements(axis).filter(e=>e.props?.["data-axis-tick"]!==undefined).length>=3);
 }
 const resultTicks=elements(axes[2]).filter(e=>e.props?.["data-axis-tick"]!==undefined).map(e=>e.props["data-axis-tick"]);
 assert.ok(resultTicks.some(v=>v<0));assert.ok(resultTicks.some(v=>v>0));assert.ok(resultTicks.includes(0));
 const html=renderToStaticMarkup(tree);assert.match(html,/Venta \(t\/mes\)/);assert.match(html,/Descuento \(\$\/kg\)/);assert.match(html,/Resultado \(MXN\/mes\)/);
 assert.match(html,/no representan porcentajes ni probabilidades/);assert.doesNotMatch(html,/NaN|Infinity/);
});

test("weekly summary stays in a popup, with categories and proposals accessible without long bottom tables",()=>{
 const h=harness(),props={row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:801,comDesc:-3.62,margen:6.2,operativos:3012592,corporativos:837601,impuestos:.53,resultadoFinalImporte:-2744015},token:"test",year:2026,month:11,cutoff:"2026-11-02",mode:"igf_diario",versionAsOf:true,onClose(){}};
 let tree=h.renderModal(props),html=renderToStaticMarkup(tree);
 assert.match(html,/Margen/);assert.match(html,/3,012,592/);assert.doesNotMatch(html,/Resultados por semana|TOTAL ARR|Nombre de propuesta|Historial de semanas/);
 elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Semanas · ").props.onClick();
 tree=h.renderModal(props);html=renderToStaticMarkup(tree);assert.match(html,/Semanas · selección y resumen financiero/);assert.match(html,/Historial de semanas/);
 const popup=elements(tree).find(e=>typeof e.type==="function"&&e.props.title==="Semanas · selección y resumen financiero");popup.props.onClose();
 tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&e.props.children==="Categorías del mes").props.onClick();
 html=renderToStaticMarkup(h.renderModal(props));assert.match(html,/categoría y subcategoría/);assert.match(html,/TOTAL CASA/);
 tree=h.renderModal(props);elements(tree).find(e=>typeof e.type==="function"&&e.props.title?.includes("categoría y subcategoría")).props.onClose();
 tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Puntos guardados (").props.onClick();
 html=renderToStaticMarkup(h.renderModal(props));assert.match(html,/Puntos guardados/);assert.doesNotMatch(html,/Nombre de propuesta|Guardar punto actual/);
});
test("each weekly financial cell opens the chosen week's detail without toggling its visibility",()=>{
 const h=harness();let selected=null,hidden=[];
 const week={key:"a",label:"Semana 40",from:"2026-09-27",to:"2026-10-03",available:true,state:"real",actualTon:100,d:3,actualResult:-20,financials:{margen:6,operativos:100,corporativos:50,gasto:150}};
 const tree=h.renderWeeks({weeks:[week],hidden,onChange:v=>hidden=v,onDetail:(w,field)=>selected={w,field}});
 elements(tree).find(e=>e.props?.["aria-label"]==="Gastos operativos de Semana 40 del 2026-09-27").props.onClick();
 assert.equal(selected.w,week);assert.equal(selected.field,"operativos");assert.deepEqual(hidden,[]);assert.match(renderToStaticMarkup(tree),/Margen bruto/);
});

test("HG editing moves the surface and result, keeps actual trend unchanged and restores all three inputs",()=>{
 const h=harness(),row={empresa:"GT Puebla",plant_code:"Puebla",ventaTon:800,comDesc:-3,margen:6.2,operativos:2200000,corporativos:800000,impuestos:.5,resultadoFinalImporte:-200000,hgKg:-.7,hgDollar:10};
 const props={row,token:"test",year:2026,month:11,cutoff:"2026-11-04",mode:"igf_diario",versionAsOf:true,onClose(){}};
 const field=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label);
 let tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&e.props.children==="Categorías del mes").props.onClick();tree=h.renderModal(props);const originalSurface=elements(tree).find(e=>e.props?.points&&e.props?.model);const originalA=originalSurface.props.model.a;
 assert.equal(field(tree,"HG simulado como porcentaje de venta").props.value,7);
 field(tree,"HG simulado como porcentaje de venta").props.onChange({target:{value:"8"}});field(tree,"Venta simulada en toneladas").props.onChange({target:{value:"1000"}});
 tree=h.renderModal(props);const surface=elements(tree).find(e=>e.props?.points&&e.props?.model);
 assert.ok(Math.abs(surface.props.model.a-originalA-.1)<1e-10);assert.equal(surface.props.q,1000);
 assert.deepEqual(surface.props.points.find(p=>p.key==="current"),originalSurface.props.points.find(p=>p.key==="current"));
 elements(tree).find(e=>e.type==="button"&&e.props.children==="Restaurar actual").props.onClick();tree=h.renderModal(props);
 assert.equal(field(tree,"Venta simulada en toneladas").props.value,800);assert.equal(field(tree,"Descuento simulado por kilo").props.value,3);assert.equal(field(tree,"HG simulado como porcentaje de venta").props.value,7);assert.equal(row.hgKg,-.7);
 const mh=harness(),mp={...props,row:{...row,hgKg:null}};let missing=mh.renderModal(mp);elements(missing).find(e=>e.type==="button"&&e.props.children==="Categorías del mes").props.onClick();missing=mh.renderModal(mp);assert.equal(field(missing,"HG simulado como porcentaje de venta").props.disabled,true);assert.match(renderToStaticMarkup(missing),/Falta HG o su valor por kilo/);
});
test("category edits weight discounts, retain HG/comments, save snapshot and selecting restores the saved model",async()=>{
 let posted;const lines=[{category:"CASA",subcategory:"Autotanque",kg:100000,discount_kg:1,discount_amount:100000,missing_discount_kg:0},{category:"COMISIONISTA",subcategory:"Portátil",kg:700000,discount_kg:4,discount_amount:2800000,missing_discount_kg:0}];
 const h=harness(async(path,options)=>{let data={rows:[]};if(options.method==="POST"){posted=JSON.parse(options.body);data={row:{id:"12",name:posted.name,volume_ton:posted.volume_ton,discount_kg:posted.discount_kg,basis:posted.basis,created_at:"2026-11-04"}};}else if(path.includes("categories?"))data={rows:lines};else if(path.includes("semanal?"))data={columns:[{key:"week",label:"Semana 45",fecha_desde:"2026-11-01",fecha_hasta:"2026-11-07",estado:"real",metrics:{venta_kg:70000,com_desc_kg:-3,resultado_mxn:7000},coverage:{resultado:{coverage_kg_pct:100},com_desc_kg:{coverage_kg_pct:100}}}]};return {ok:true,json:async()=>data};});
 const props={row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:800,comDesc:-3,operativos:2200000,corporativos:800000,impuestos:.5,resultadoFinalImporte:-200000,hgKg:-.7,hgDollar:10},token:"test",year:2026,month:11,cutoff:"2026-11-04",mode:"igf_diario",versionAsOf:true,onClose(){}};
 const field=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label);
 const button=(tree,label)=>elements(tree).find(e=>e.type==="button"&&(Array.isArray(e.props.children)?e.props.children.join(""):e.props.children)===label);
 let tree=h.renderModal(props);await h.load();tree=h.renderModal(props);
 let surface=elements(tree).find(e=>e.props?.points&&e.props?.model);assert.deepEqual(surface.props.points.map(p=>p.key),["current"]);assert.ok(!field(tree,"HG simulado como porcentaje de venta"));
 button(tree,"Categorías del mes").props.onClick();tree=h.renderModal(props);
 const categoryHtml=renderToStaticMarkup(tree);assert.ok(categoryHtml.indexOf("Agregar punto / propuesta")<categoryHtml.indexOf("Comentarios de la propuesta"));
 field(tree,"HG simulado como porcentaje de venta").props.onChange({target:{value:"5"}});field(tree,"Comentarios de la propuesta").props.onChange({target:{value:"Más venta de casa"}});
 let group=elements(tree).find(e=>typeof e.type==="function"&&e.props.category==="CASA");group.props.onEdit(group.props.lines[0],"kg",300000);tree=h.renderModal(props);
 group=elements(tree).find(e=>typeof e.type==="function"&&e.props.category==="CASA");group.props.onEdit(group.props.lines[0],"discount_kg",2);tree=h.renderModal(props);
 surface=elements(tree).find(e=>e.props?.points&&e.props?.model);assert.equal(surface.props.q,1000);assert.equal(surface.props.d,3.4);
 button(tree,"Agregar punto / propuesta").props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(posted.basis.hg_pct,.05);assert.equal(posted.basis.hg_price_kg,10);assert.equal(posted.basis.hg_kg,-.5);assert.equal(posted.basis.comments,"Más venta de casa");assert.equal(posted.basis.category_lines[0].kg,300000);assert.equal(posted.volume_ton,1000);assert.equal(posted.discount_kg,3.4);
 const parsed=require("../lib/igf-simulation-proposals").parseProposal(posted);assert.ok(!parsed.error);assert.equal(parsed.basis.category_lines[0].discount_amount,600000);
 tree=h.renderModal(props);assert.match(renderToStaticMarkup(tree),/Punto #12/);assert.ok(!field(tree,"HG simulado como porcentaje de venta"));
 button(tree,"Restaurar actual").props.onClick();tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Puntos guardados (").props.onClick();tree=h.renderModal(props);
 assert.match(renderToStaticMarkup(tree),/Más venta de casa/);button(tree,"Punto #12").props.onClick();tree=h.renderModal(props);
 surface=elements(tree).find(e=>e.props?.points&&e.props?.model);assert.equal(surface.props.q,1000);assert.equal(surface.props.d,3.4);assert.equal(surface.props.model.a,posted.basis.a);assert.equal(surface.props.model.fixed,posted.basis.fixed);
});

test("multiple saved proposals toggle independently without changing the active surface or their original results",async()=>{
 const saved=[{id:"1",name:"Primera",volume_ton:900,discount_kg:2,basis:{a:6,fixed:3000000,hg_pct:.07,hg_price_kg:10,hg_kg:-.7,comments:"Venta casa mayor",cutoff:"2026-11-02",mode:"igf_diario",version_as_of:true}},{id:"2",name:"Segunda",volume_ton:1300,discount_kg:3,basis:{a:7,fixed:3400000,hg_pct:.08,hg_price_kg:12,hg_kg:-.96,comments:"Más comisionistas",cutoff:"2026-11-03",mode:"forecast",version_as_of:true}}];
 const h=harness(async path=>({ok:true,json:async()=>path.includes("proposals?")?{rows:saved}:{rows:[],columns:[]}}));
 const props={row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:800,comDesc:-3,operativos:2200000,corporativos:800000,impuestos:.5,resultadoFinalImporte:-200000,hgKg:-.7,hgDollar:10},token:"test",year:2026,month:11,cutoff:"2026-11-04",mode:"igf_diario",versionAsOf:true,onClose(){}};
 const field=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label);
 const surface=tree=>elements(tree).find(e=>e.props?.points&&e.props?.model).props;
 let tree=h.renderModal(props);await h.load();tree=h.renderModal(props);const original=surface(tree);
 elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Puntos guardados (").props.onClick();tree=h.renderModal(props);
 field(tree,"Comparar punto #1").props.onChange({target:{checked:true}});tree=h.renderModal(props);field(tree,"Comparar punto #2").props.onChange({target:{checked:true}});tree=h.renderModal(props);
 const plotted=surface(tree);assert.equal(plotted.q,original.q);assert.equal(plotted.d,original.d);assert.equal(plotted.model.a,original.model.a);
 assert.deepEqual(plotted.points.map(p=>p.key),["current","proposal-1","proposal-2"]);assert.equal(plotted.points[1].z,600000);assert.equal(plotted.points[2].z,1800000);assert.notEqual(plotted.points[1].color,plotted.points[2].color);assert.equal(plotted.points[2].comments,"Más comisionistas");
 const chartHtml=renderToStaticMarkup(harness().render(plotted));assert.match(chartHtml,/Punto #1/);assert.match(chartHtml,/Venta casa mayor/);assert.match(chartHtml,/Punto #2/);assert.match(chartHtml,/Más comisionistas/);assert.doesNotMatch(chartHtml,/NaN|Infinity/);
 tree=h.renderModal(props);field(tree,"Comparar punto #1").props.onChange({target:{checked:false}});tree=h.renderModal(props);assert.deepEqual(surface(tree).points.map(p=>p.key),["current","proposal-2"]);assert.equal(surface(tree).model.a,original.model.a);
 elements(tree).find(e=>e.type==="button"&&e.props.children==="Mostrar todos los puntos").props.onClick();tree=h.renderModal(props);assert.equal(surface(tree).points.length,3);
 elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children.join("")==="Punto #1").props.onClick();tree=h.renderModal(props);assert.equal(surface(tree).q,900);assert.equal(surface(tree).model.a,6);assert.equal(surface(tree).points.find(p=>p.key==="proposal-2").z,1800000);
});

test("clicking a comparison card edits and updates the same point, preserves its name, and retains edits on failure",async()=>{
 const first={id:"3",name:"Propuesta original",volume_ton:420,discount_kg:0,basis:{a:6,fixed:3000000,hg_pct:.13,hg_price_kg:10,hg_kg:-1.3,comments:"0 Descuentos",cutoff:"2026-11-04",mode:"igf_diario",version_as_of:true},created_at:"2026-11-04"};
 const second={...first,id:"2",name:"Otro punto",basis:{...first.basis,hg_pct:.02,hg_kg:-.2,comments:"Otra propuesta"}};
 let posted,method,fail=true;const h=harness(async(path,options)=>{if(options.method==="PUT"){method=options.method;posted=JSON.parse(options.body);return fail?{ok:false,json:async()=>({error:"Fallo temporal"})}:{ok:true,json:async()=>({row:{...first,volume_ton:posted.volume_ton,discount_kg:posted.discount_kg,basis:posted.basis}})};}return {ok:true,json:async()=>path.includes("proposals?")?{rows:[first,second]}:{rows:[],columns:[]}};});
 const props={row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:800,comDesc:-3,operativos:2200000,corporativos:800000,impuestos:.5,resultadoFinalImporte:-200000,hgKg:-.7,hgDollar:10},token:"test",year:2026,month:11,cutoff:"2026-11-04",mode:"igf_diario",versionAsOf:true,onClose(){}};
 const field=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label),button=(tree,label)=>elements(tree).find(e=>e.type==="button"&&e.props.children===label);
 let tree=h.renderModal(props);await h.load();tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Puntos guardados (").props.onClick();tree=h.renderModal(props);button(tree,"Mostrar todos los puntos").props.onClick();tree=h.renderModal(props);
 field(tree,"Editar punto #3").props.onClick();tree=h.renderModal(props);assert.match(renderToStaticMarkup(tree),/Editando punto #3/);assert.equal(field(tree,"Venta simulada en toneladas").props.value,420);assert.equal(field(tree,"HG simulado como porcentaje de venta").props.value,13);assert.equal(field(tree,"Comentarios de la propuesta").props.value,"0 Descuentos");
 field(tree,"Venta simulada en toneladas").props.onChange({target:{value:"500"}});field(tree,"HG simulado como porcentaje de venta").props.onChange({target:{value:"14"}});field(tree,"Comentarios de la propuesta").props.onChange({target:{value:"Propuesta revisada"}});tree=h.renderModal(props);
 button(tree,"Guardar cambios del punto #3").props.onClick();await new Promise(resolve=>setImmediate(resolve));tree=h.renderModal(props);assert.match(renderToStaticMarkup(tree),/Fallo temporal/);assert.equal(field(tree,"Venta simulada en toneladas").props.value,500);
 fail=false;button(tree,"Guardar cambios del punto #3").props.onClick();await new Promise(resolve=>setImmediate(resolve));tree=h.renderModal(props);
 assert.equal(method,"PUT");assert.equal(posted.id,"3");assert.equal(posted.name,"Propuesta original");assert.equal(posted.volume_ton,500);assert.equal(posted.basis.hg_pct,.14);assert.equal(posted.basis.comments,"Propuesta revisada");
 const surface=elements(tree).find(e=>e.props?.points&&e.props?.model).props;assert.deepEqual(surface.points.map(p=>p.key),["current","proposal-3","proposal-2"]);assert.equal(surface.points[1].q,500);assert.equal(surface.points[1].comments,"Propuesta revisada");assert.equal(surface.points[2].q,420);assert.ok(!field(tree,"HG simulado como porcentaje de venta"));
});

test("deletion requires confirmation, preserves points on cancel/failure, then removes only the target and resets a deleted active scenario",async()=>{
 const saved=[1,2].map(id=>({id:String(id),name:`Propuesta ${id}`,volume_ton:420,discount_kg:0,basis:{a:6,fixed:3000000,hg_pct:.13,hg_price_kg:10,hg_kg:-1.3,comments:`Comentario ${id}`,cutoff:"2026-11-04",mode:"igf_diario",version_as_of:true}}));
 let deletes=[],fail=true;const h=harness(async(path,options)=>{if(options.method==="DELETE"){deletes.push(path);return fail?{ok:false,json:async()=>({error:"No se pudo eliminar"})}:{ok:true,json:async()=>({ok:true})};}return {ok:true,json:async()=>path.includes("proposals?")?{rows:saved}:{rows:[],columns:[]}};});
 const props={row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:800,comDesc:-3,operativos:2200000,corporativos:800000,impuestos:.5,resultadoFinalImporte:-200000,hgKg:-.7,hgDollar:10},token:"test",year:2026,month:11,cutoff:"2026-11-04",mode:"igf_diario",versionAsOf:true,onClose(){}};
 const field=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label),button=(tree,label)=>elements(tree).find(e=>e.type==="button"&&(Array.isArray(e.props.children)?e.props.children.join(""):e.props.children)===label);
 const open=tree=>elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Puntos guardados (").props.onClick();
 let tree=h.renderModal(props);await h.load();tree=h.renderModal(props);open(tree);tree=h.renderModal(props);button(tree,"Mostrar todos los puntos").props.onClick();tree=h.renderModal(props);button(tree,"Punto #1").props.onClick();tree=h.renderModal(props);open(tree);tree=h.renderModal(props);
 field(tree,"Eliminar punto #1").props.onClick();tree=h.renderModal(props);assert.match(renderToStaticMarkup(tree),/Esta acción no se puede deshacer/);assert.match(renderToStaticMarkup(tree),/Comentario 1/);assert.equal(deletes.length,0);button(tree,"Cancelar").props.onClick();tree=h.renderModal(props);assert.equal(deletes.length,0);assert.ok(field(tree,"Eliminar punto #1"));
 field(tree,"Eliminar punto #1").props.onClick();tree=h.renderModal(props);button(tree,"Eliminar definitivamente").props.onClick();await new Promise(resolve=>setImmediate(resolve));tree=h.renderModal(props);assert.match(renderToStaticMarkup(tree),/No se pudo eliminar/);assert.ok(field(tree,"Eliminar punto #1"));
 fail=false;button(tree,"Eliminar definitivamente").props.onClick();await new Promise(resolve=>setImmediate(resolve));tree=h.renderModal(props);assert.equal(deletes.length,2);const path=new URL(deletes[1],"http://test");assert.equal(path.searchParams.get("id"),"1");assert.equal(path.searchParams.get("plant_code"),"Puebla");assert.equal(path.searchParams.get("year"),"2026");assert.equal(path.searchParams.get("month"),"11");assert.ok(!field(tree,"Eliminar punto #1"));assert.ok(field(tree,"Eliminar punto #2"));
 const surface=elements(tree).find(e=>e.props?.points&&e.props?.model).props;assert.deepEqual(surface.points.map(p=>p.key),["current","proposal-2"]);assert.equal(surface.q,800);assert.equal(surface.d,3);
});

test("3D starts rotating and compares independent surfaces/equilibria; top view hides height without altering scenarios",()=>{
 const layers=[{key:"actual",label:"Actual",color:"cyan",model},{key:"p7",label:"Punto #7",color:"magenta",model:{...model,a:model.a+1,fixed:model.fixed+100000,q:1500,d:3}}];
 const props={model,q:model.q,d:model.d,points:[],layers},h=harness();let tree=h.render(props);
 const nodes=(type,key)=>elements(tree).filter(e=>e.props?.[type]===key);
 assert.ok(nodes("data-surface","actual").length>0);assert.ok(nodes("data-surface","p7").length>0);assert.equal(nodes("data-equilibrium","actual").length,1);assert.equal(nodes("data-equilibrium","p7").length,1);
 const curves=elements(tree).filter(e=>e.type==="polyline"&&e.props.strokeWidth==="3"&&e.props.children?.type==="title");assert.notEqual(curves[0].props.points,curves[1].props.points);
 elements(tree).find(e=>e.props?.["aria-label"]==="Mostrar superficie Punto #7").props.onChange({target:{checked:false}});tree=h.render(props);assert.equal(nodes("data-surface","p7").length,0);assert.equal(nodes("data-equilibrium","p7").length,0);
 elements(tree).find(e=>e.props?.["aria-label"]==="Mostrar superficie Punto #7").props.onChange({target:{checked:true}});tree=h.render(props);elements(tree).find(e=>e.type==="button"&&e.props.children==="Vista superior").props.onClick();tree=h.render(props);
 assert.equal(elements(tree).find(e=>e.type==="svg").props.style.touchAction,"auto");assert.equal(elements(tree).filter(e=>e.props?.["data-surface"]).length,0);assert.equal(elements(tree).filter(e=>e.props?.["data-equilibrium"]).length,2);assert.ok(!elements(tree).find(e=>e.props?.["data-sim-axis"]==="resultado"));assert.doesNotMatch(renderToStaticMarkup(tree),/NaN|Infinity|Vista inicial/);
 elements(tree).find(e=>e.type==="button"&&e.props.children==="Vista 3D").props.onClick();tree=h.render(props);assert.equal(elements(tree).find(e=>e.type==="svg").props.style.touchAction,"none");assert.equal(layers[1].model.fixed,model.fixed+100000);
});

test("full comparison keeps every variable and original fixed basis, leaving legacy breakdowns unknown",()=>{
 const current={label:"Actual",model:{q:1000,d:3,a:7,fixed:3000000},hg:5,price:10,financials:{margen_kg:6,operativos_mxn:2000000,corporativos_mxn:500000,gasto_mxn:2500000,impuestos_mxn:500000},cutoff:"2026-11-04",mode:"igf_diario",comments:"Actual"};
 const proposal={label:"Punto #7",model:{q:1200,d:4,a:8,fixed:3600000},hg:8,price:12,cutoff:"2026-11-02",mode:"forecast",comments:"Otro volumen y gastos"};
 const html=renderToStaticMarkup(harness().renderComparison({records:[current,proposal]}));
 for(const label of ["Gastos operativos","Gastos corporativos","Margen bruto","Impuestos mensuales","HG generado","Valoración HG","Resultado final","Venta de equilibrio","Descuento de equilibrio","Otro volumen y gastos"])assert.match(html,new RegExp(label));
 assert.match(html,/No registrado/);assert.match(html,/3,600,000/);assert.match(html,/96,000/);assert.match(html,/1,200/);assert.match(html,/Δ/);assert.doesNotMatch(html,/NaN|Infinity/);
});
