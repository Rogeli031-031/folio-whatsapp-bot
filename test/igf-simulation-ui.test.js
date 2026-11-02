"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ts=require("../frontend-dashboard/node_modules/typescript"),React=require("../frontend-dashboard/node_modules/react");
const {renderToStaticMarkup}=require("../frontend-dashboard/node_modules/react-dom/server");
const root=path.join(__dirname,"../frontend-dashboard");
const text=fs.readFileSync(path.join(root,"components/IgfSimulationModal.tsx"),"utf8");
function harness(){
 let index=0;const state=[];
 const hooks={...React,useMemo:fn=>fn(),useEffect(){},useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==="function"?v(state[i]):v;}];},useRef(initial){const i=index++;if(!(i in state))state[i]={current:initial};return state[i];}};
 const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports",code+"\nmodule.exports.Surface=Surface;module.exports.WeekControls=WeekControls;")((name)=>{
  if(name==="react")return hooks;
  if(name==="react/jsx-runtime")return require("../frontend-dashboard/node_modules/react/jsx-runtime");
  if(name==="@/lib/api")return {getApiUrl:x=>x};
  if(name==="@/lib/igf-simulation")return require("../frontend-dashboard/lib/igf-simulation");
  throw new Error(name);
 },module,module.exports);
 return {render(props){index=0;return module.exports.Surface(props);},renderModal(props){index=0;return module.exports.default(props);},renderWeeks(props){return module.exports.WeekControls(props);}};
}
function elements(node){if(!node||typeof node!=="object")return [];if(Array.isArray(node))return node.flatMap(elements);return [node,...elements(node.props?.children)];}
const model={q:1400,d:3.6,a:6.525225303866561,fixed:3850193.5114285713};
test("3D renders weekly/current/proposal markers, touch rotation and cancel without changing financial inputs",()=>{
 const h=harness(),props={model,q:1400,d:3.6,points:[{key:"week",label:"Semana 44",state:"real",q:1000,d:3,z:-100000,color:"purple"},{key:"current",label:"Tendencia actual",q:1400,d:3.6,z:245122,color:"yellow"}]};
 let tree=h.render(props),html=renderToStaticMarkup(tree);assert.match(html,/Semana 44/);assert.match(html,/Tendencia actual/);assert.match(html,/Equilibrio:/);assert.doesNotMatch(html,/NaN|Infinity/);
 elements(tree).find(e=>e.type==="button"&&e.props["aria-pressed"]===false).props.onClick();tree=h.render(props);
 const svg=elements(tree).find(e=>e.type==="svg");assert.equal(svg.props.style.touchAction,"none");
 const target={setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 const event=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,currentTarget:target});
 svg.props.onPointerDown(event(10,10));svg.props.onPointerMove(event(180,60));
 const rotated=renderToStaticMarkup(h.render(props));assert.notEqual(html,rotated);assert.doesNotMatch(rotated,/NaN|Infinity/);
 svg.props.onPointerCancel();svg.props.onPointerMove(event(280,80));assert.equal(renderToStaticMarkup(h.render(props)),rotated);
 assert.equal(props.q,1400);assert.equal(props.d,3.6);
});
test("partial financial data shows an explicit explanation rather than a fictional 3D scenario",()=>{
 const h=harness();const tree=h.renderModal({row:{empresa:"GT Puebla",plant_code:"Puebla",ventaTon:100,comDesc:-2,resultadoFinalImporte:null},token:"test",year:2026,month:11,cutoff:"2026-11-02",mode:"igf_diario",versionAsOf:true,onClose(){}});
 const html=renderToStaticMarkup(tree);assert.match(html,/Faltan venta/);assert.match(html,/HG faltante/);assert.doesNotMatch(html,/<svg/);assert.match(html,/Categorías del mes/);
});

test("zoom grows the plotted surface, has bounds and resets without changing the scenario",()=>{
 const h=harness(),props={model,q:1400,d:3.6,points:[]};
 const width=tree=>{const polys=elements(tree).filter(e=>e.type==="polygon");const xs=polys.flatMap(p=>p.props.points.split(" ").map(pair=>Number(pair.split(",")[0])));return Math.max(...xs)-Math.min(...xs);};
 let tree=h.render(props),base=width(tree);
 const find=(tree,label)=>elements(tree).find(e=>e.props?.["aria-label"]===label);
 find(tree,"Acercar gráfica").props.onClick();tree=h.render(props);assert.ok(width(tree)>base);
 find(tree,"Zoom de gráfica").props.onChange({target:{value:"4"}});tree=h.render(props);assert.equal(find(tree,"Acercar gráfica").props.disabled,true);
 find(tree,"Zoom de gráfica").props.onChange({target:{value:".5"}});tree=h.render(props);assert.equal(find(tree,"Alejar gráfica").props.disabled,true);
 elements(tree).find(e=>e.type==="button"&&e.props.children==="Ajustar gráfica").props.onClick();tree=h.render(props);assert.ok(renderToStaticMarkup(tree).includes("100%"));
 assert.equal(props.q,1400);assert.equal(props.d,3.6);assert.doesNotMatch(renderToStaticMarkup(tree),/NaN|Infinity/);
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
 tree=h.renderModal(props);elements(tree).find(e=>e.type==="button"&&Array.isArray(e.props.children)&&e.props.children[0]==="Agregar punto / propuestas (").props.onClick();
 html=renderToStaticMarkup(h.renderModal(props));assert.match(html,/Nombre de propuesta/);assert.match(html,/Guardar punto actual/);
});
test("each weekly financial cell opens the chosen week's detail without toggling its visibility",()=>{
 const h=harness();let selected=null,hidden=[];
 const week={key:"a",label:"Semana 40",from:"2026-09-27",to:"2026-10-03",available:true,state:"real",actualTon:100,d:3,actualResult:-20,financials:{margen:6,operativos:100,corporativos:50,gasto:150}};
 const tree=h.renderWeeks({weeks:[week],hidden,onChange:v=>hidden=v,onDetail:(w,field)=>selected={w,field}});
 elements(tree).find(e=>e.props?.["aria-label"]==="Gastos operativos de Semana 40 del 2026-09-27").props.onClick();
 assert.equal(selected.w,week);assert.equal(selected.field,"operativos");assert.deepEqual(hidden,[]);assert.match(renderToStaticMarkup(tree),/Margen bruto/);
});
