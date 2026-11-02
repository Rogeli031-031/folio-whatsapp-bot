"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ts=require("../frontend-dashboard/node_modules/typescript"),React=require("../frontend-dashboard/node_modules/react"),{renderToStaticMarkup}=require("../frontend-dashboard/node_modules/react-dom/server");
const dir=path.join(__dirname,"../frontend-dashboard");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 let index=0,effects=[],state=[],calls=[];
 const hooks={...React,useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>state[i]=typeof v==="function"?v(state[i]):v];},useEffect(fn){effects.push(fn);}};
 function compile(file){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(dir,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const req=name=>name==="react"?hooks:name==="react/jsx-runtime"?require("../frontend-dashboard/node_modules/react/jsx-runtime"):name==="@/lib/api"?{getApiUrl:x=>x}:name==="@/lib/igf-diario-weekly-rows"?compile("lib/igf-diario-weekly-rows.ts"):null;
 const fetch=async(url,opts)=>{calls.push({url,opts});const forecast=url.includes("source=forecast");return{ok:true,json:async()=>({columns:[{key:"2026-10",label:"Octubre 2026",fecha_desde:"2026-10-01",fecha_hasta:"2026-10-31",estado:"real",complete:true,coverage:{},metrics:{venta_kg:1000,precio_kg:forecast?null:20,margen_kg:6,resultado_mxn:50},forecast_sources:forecast?[{version_number:3,fields:["venta_kg","margen_kg","resultado_mxn"]}]:[]}]})};};
 new Function("require","module","exports","fetch",code)(req,module,module.exports,fetch);return module.exports;}
 const Panel=compile("components/IgfDiarioPeriodPanel.tsx");
 return{calls,render(props){index=0;effects=[];return Panel.default(props);},async run(){const fns=effects;effects=[];fns.forEach(fn=>fn());await tick();await tick();}};
}
function elements(node){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(elements);return[node,...elements(node.props?.children)];}
test("period selector defaults to daily data, requests the chosen source and hides unsupported Forecast-only details",async()=>{
 const h=harness(),props={token:"test",year:2026,month:11,plantCode:"Puebla",uploadDay:"2026-11-02",versionAsOfCorte:true,mode:"months"};
 let tree=h.render(props);await h.run();tree=h.render(props);
 assert.match(h.calls[0].url,/source=igf_diario/);assert.match(h.calls[0].url,/version_as_of_corte=1/);assert.match(h.calls[0].url,/plant_code=Puebla/);
 let html=renderToStaticMarkup(tree);assert.match(html,/Precio de Venta al Público/);assert.match(html,/No se reemplazan datos faltantes/);
 elements(tree).find(e=>e.props?.["aria-label"]==="Fuente del resultado").props.onChange({target:{value:"forecast"}});
 tree=h.render(props);await h.run();tree=h.render(props);html=renderToStaticMarkup(tree);
 assert.match(h.calls.at(-1).url,/source=forecast/);assert.match(html,/IGF Forecast · v3/);assert.doesNotMatch(html,/Precio de Venta al Público/);assert.match(html,/No se mezcla con cifras diarias/);
 tree=h.render({...props,mode:"weeks"});await h.run();assert.match(h.calls.at(-1).url,/source=igf_diario/);assert.match(h.calls.at(-1).url,/period_mode=weeks/);
});
