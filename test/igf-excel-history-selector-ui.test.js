"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const ts=require("../frontend-dashboard/node_modules/typescript"),React=require("../frontend-dashboard/node_modules/react");
const root=path.join(__dirname,"../frontend-dashboard");
function harness(){
 let index=0;const state=[],opened=[];
 const hooks={...React,useState(initial){const i=index++;if(!(i in state))state[i]=initial;return[state[i],v=>state[i]=typeof v==="function"?v(state[i]):v];},useMemo:fn=>fn(),useEffect(){}};
 function compile(file){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function("require","module","exports","window",code)(name=>name==="react"?hooks:name==="react/jsx-runtime"?require("../frontend-dashboard/node_modules/react/jsx-runtime"):name==="@/lib/igf-diario-weekly-rows"?compile("lib/igf-diario-weekly-rows.ts"):name==="@/lib/api"?{}:()=>null,module,module.exports,{location:{origin:"https://example.test"},open:(...args)=>opened.push(args)});return module.exports;}
 const Component=compile("components/IgfDiarioGraficaModal.tsx").default;
 return{opened,render(props){index=0;return Component(props);}};
}
function elements(node){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(elements);return[node,...elements(node.props?.children)];}
const props={token:"test",year:2026,month:11,uploadDay:"2026-11-02",plantCode:"Puebla",todas:false,scopeLabel:"GT Puebla",excelUrl:"/api/arr/dashboard-excel?year=2026&month=11&plant_code=Puebla&upload_day=2026-11-02&version_as_of_corte=1",onClose(){}};
test("a prior month lists weeks 40–44 and downloads the chosen historical week while preserving plant, period, metric and cutoff",()=>{
 for(const todas of [false,true]){
  const h=harness(),p={...props,todas,seriesMetric:"resultado_kg"};let tree=h.render(p);
  const month=elements(tree).find(e=>e.props?.["aria-label"]==="Mes de la semana a descargar");assert.equal(month.props.value,"2026-11");
  month.props.onChange({target:{value:"2026-10"}});tree=h.render(p);
  const select=elements(tree).find(e=>e.type==="select");const options=elements(select).filter(e=>e.type==="option");
  assert.deepEqual(options.map(e=>e.props.value),["2026-09-27","2026-10-04","2026-10-11","2026-10-18","2026-10-25"]);
  // Download immediately after changing month must not reuse the November week.
  elements(tree).find(e=>e.type==="button"&&e.props.children==="Descargar Excel").props.onClick();assert.match(h.opened[0][0],/week_anchor=2026-10-25/);
  select.props.onChange({target:{value:"2026-09-27"}});tree=h.render(p);
  elements(tree).find(e=>e.type==="button"&&e.props.children==="Descargar Excel").props.onClick();
  const url=new URL(h.opened[1][0],"https://example.test");assert.equal(url.searchParams.get("week_anchor"),"2026-09-27");assert.equal(url.searchParams.get("summary_metric"),"resultado_kg");assert.equal(url.searchParams.get("plant_code"),"Puebla");assert.equal(url.searchParams.get("upload_day"),"2026-11-02");assert.equal(url.searchParams.get("version_as_of_corte"),"1");assert.equal(url.searchParams.get("month"),"11");
 }
});
test("historical week picker supports previous years and ignores empty or out-of-range months",()=>{
 const h=harness();let tree=h.render(props);const input=()=>elements(tree).find(e=>e.props?.["aria-label"]==="Mes de la semana a descargar");
 for(const value of ["","1999-12","2026-12"]){input().props.onChange({target:{value}});tree=h.render(props);assert.equal(input().props.value,"2026-11");}
 input().props.onChange({target:{value:"2025-12"}});tree=h.render(props);assert.equal(input().props.value,"2025-12");
 assert.ok(elements(tree).filter(e=>e.type==="option").some(e=>e.props.value==="2025-11-30"));
});
