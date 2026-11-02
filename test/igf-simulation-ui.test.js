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
 new Function("require","module","exports",code+"\nmodule.exports.Surface=Surface;")((name)=>{
  if(name==="react")return hooks;
  if(name==="react/jsx-runtime")return require("../frontend-dashboard/node_modules/react/jsx-runtime");
  if(name==="@/lib/api")return {getApiUrl:x=>x};
  if(name==="@/lib/igf-simulation")return require("../frontend-dashboard/lib/igf-simulation");
  throw new Error(name);
 },module,module.exports);
 return {render(props){index=0;return module.exports.Surface(props);},renderModal(props){index=0;return module.exports.default(props);}};
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
 const html=renderToStaticMarkup(tree);assert.match(html,/Faltan venta/);assert.match(html,/HG faltante/);assert.doesNotMatch(html,/<svg/);assert.match(html,/categoría y subcategoría/);
});
