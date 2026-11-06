"use strict";
const proposals = require("./igf-simulation-proposals");
const scope = require("./igf-dashboard-scope");
const closingPlan = require("./igf-plan-al-cierre");
const {loadCategoryBase} = require("./igf-simulation-category-base");

module.exports = function register(app, deps) {
 const { pool, auth, blockGA, blockGV, resolvePlant, computeCategories } = deps;
 app.post("/api/dashboard/igf-simulation-plan", auth, async (req,res)=>{
  if(blockGA(req,res)||blockGV(req,res))return;
  const input=req.body||{}, period=proposals.parsePeriod(input);
  if(period.error)return res.status(400).json({error:period.error});
  let client;
  try {
   client=await pool.connect();
   const plant=await resolvePlant(client,String(input.plant_code||""));
   if(!plant)return res.status(400).json({error:"Planta no reconocida"});
   if(!scope.canAccessPlant(req.dashboardAuth,plant.plantaId))return res.status(403).json({error:"Sin permiso para esta planta"});
   const data=await closingPlan.handle(client,plant,period,{...input,actor:req.dashboardAuth?.actor_id!=null?"Dashboard:"+req.dashboardAuth.actor_id:"Dashboard"},computeCategories);
   res.set("Cache-Control","no-store");
   if(data.bytes)return res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").attachment("Plan-al-cierre.xlsx").send(data.bytes);
   return res.json(data);
  }catch(e){if(!e.status)console.error("[igf-simulation-plan]",e.message);return res.status(e.status||500).json({error:e.status?e.message:"No se pudo preparar el plan al cierre."});}
  finally{if(client)client.release();}
 });
 app.get("/api/dashboard/igf-simulation-categories", auth, async (req,res)=>{
  if(blockGA(req,res)||blockGV(req,res))return;
  const parsed=proposals.parsePeriod(req.query||{}), cutoff=String(req.query.cutoff||"");
  const date=new Date(`${cutoff}T00:00:00Z`), target=Number(req.query.target_kg);
  if(parsed.error||!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==cutoff||!Number.isFinite(target)||target<=0||target>1e9)
   return res.status(400).json({error:parsed.error||"Corte o venta inválidos"});
  let client;
  try{
   client=await pool.connect();const plant=await resolvePlant(client,String(req.query.plant_code||""));
   if(!plant)return res.status(400).json({error:"Planta no reconocida"});
   if(!scope.canAccessPlant(req.dashboardAuth,plant.plantaId))return res.status(403).json({error:"Sin permiso para esta planta"});
   return res.json(await loadCategoryBase(client,plant,parsed,cutoff,target,computeCategories));
  }catch(error){console.error("[igf-simulation-categories]",error.message);res.status(500).json({error:"No se pudo consultar el desglose por categoría"});}
  finally{if(client)client.release();}
 });
 for (const method of ["get", "post", "put", "delete"]) {
  app[method]("/api/dashboard/igf-simulation-proposals", auth, async (req,res) => {
   if (blockGA(req,res) || blockGV(req,res)) return;
   const writes=method==="post"||method==="put";
   const input=writes ? req.body||{} : req.query||{};
   const parsed=writes ? proposals.parseProposal(input) : proposals.parsePeriod(input);
   if(parsed.error) return res.status(400).json({error:parsed.error});
   const id=Number(input.id);
   if((method==="delete"||method==="put") && (!Number.isSafeInteger(id)||id<=0)) return res.status(400).json({error:"Propuesta inválida"});
   let client;
   try {
    client=await pool.connect();
    const plant=await resolvePlant(client,String(input.plant_code||""));
    if(!plant) return res.status(400).json({error:"Planta no reconocida"});
    if(!scope.canAccessPlant(req.dashboardAuth,plant.plantaId)) return res.status(403).json({error:"Sin permiso para esta planta"});
    if(method==="get") return res.json({ok:true,rows:await proposals.list(client,plant.plantaId,parsed.year,parsed.month)});
    if(method==="delete") {
     const removed=await proposals.remove(client,plant.plantaId,parsed.year,parsed.month,id);
     return removed ? res.json({ok:true}) : res.status(404).json({error:"La propuesta ya no existe en esta planta y mes"});
    }
    if(method==="put") {
     const row=await proposals.update(client,plant.plantaId,parsed,id);
     return row?res.json({ok:true,row}):res.status(404).json({error:"El punto ya no existe en esta planta y mes"});
    }
    const actor=req.dashboardAuth?.actor_id != null ? `Dashboard:${req.dashboardAuth.actor_id}` : "Dashboard";
    return res.json({ok:true,row:await proposals.save(client,plant.plantaId,parsed,actor)});
   } catch(error) {
    console.error("[igf-simulation-proposals]",error.message);
    return res.status(500).json({error:"No se pudieron guardar o consultar las propuestas"});
   } finally { if(client) client.release(); }
  });
 }
};
