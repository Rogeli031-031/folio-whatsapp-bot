"use strict";
const proposals = require("./igf-simulation-proposals");
const scope = require("./igf-dashboard-scope");

module.exports = function register(app, deps) {
 const { pool, auth, blockGA, blockGV, resolvePlant, computeCategories } = deps;
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
   date.setUTCDate(date.getUTCDate()-1);
   const through=date.toISOString().slice(0,10);
   const data=await computeCategories(client,parsed.year,parsed.month,plant.provinciaPlantCode||plant.canon,{
    historico:false,targetKgOverride:target,salesThrough:through,fechaHasta:through,
   });
   // No customer names leave this endpoint; preserve unknown discounts as null.
   const groups=new Map();
   for(const row of data.rows||[]){
    const kg=Number(row.kgProy);if(!(kg>0))continue;
    const category=/comision/i.test(String(row.categoria))?"COMISIONISTA":"CASA";
    const subcategory=String(row.subcategoria||"").trim()||"Sin subcategoría",key=`${category}|${subcategory}`;
    const group=groups.get(key)||{category,subcategory,kg:0,discount_amount:0,missing_discount_kg:0};
    group.kg+=kg;
    const discount=row.hasDiscountRow===false && Number(row.kg)>0 ? 0 : row.descKg;
    if(discount==null||!Number.isFinite(Number(discount)))group.missing_discount_kg+=kg;
    else group.discount_amount+=kg*Math.abs(Number(discount));
    groups.set(key,group);
   }
   return res.json({ok:true,cutoff,through,rows:[...groups.values()].map(g=>({...g,
    discount_amount:g.missing_discount_kg>0?null:g.discount_amount,
    discount_kg:g.missing_discount_kg>0?null:g.discount_amount/g.kg,
   }))});
  }catch(error){console.error("[igf-simulation-categories]",error.message);res.status(500).json({error:"No se pudo consultar el desglose por categoría"});}
  finally{if(client)client.release();}
 });
 for (const method of ["get", "post", "delete"]) {
  app[method]("/api/dashboard/igf-simulation-proposals", auth, async (req,res) => {
   if (blockGA(req,res) || blockGV(req,res)) return;
   const input=method==="post" ? req.body||{} : req.query||{};
   const parsed=method==="post" ? proposals.parseProposal(input) : proposals.parsePeriod(input);
   if(parsed.error) return res.status(400).json({error:parsed.error});
   const id=Number(input.id);
   if(method==="delete" && (!Number.isSafeInteger(id)||id<=0)) return res.status(400).json({error:"Propuesta inválida"});
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
    const actor=req.dashboardAuth?.actor_id != null ? `Dashboard:${req.dashboardAuth.actor_id}` : "Dashboard";
    return res.json({ok:true,row:await proposals.save(client,plant.plantaId,parsed,actor)});
   } catch(error) {
    console.error("[igf-simulation-proposals]",error.message);
    return res.status(500).json({error:"No se pudieron guardar o consultar las propuestas"});
   } finally { if(client) client.release(); }
  });
 }
};
