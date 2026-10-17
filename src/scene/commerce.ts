import {z} from 'zod';
import {GROWTH_LIMITS} from './growth';
import {MEASURE_KINDS} from './measure';
import {impactOf,zonesOf} from './object-dsl';
import {onPolygon,streetPolygons,streetFootprints,rectPolygon} from './streets';
import {polygonBounds,distanceToPolygon,unionPolygons,intersectPolygons,triangulatePolygon} from './polygons';
import {roadFootprint} from './road';
import {objectContacts,type Contact} from './contacts';
import type {Scene} from './schema';
import {roleOf} from './agents';
import {waterAt,drivingHeight} from './terrain';

export const COMMERCE_LIMITS=Object.freeze({goods:8,accounts:16,markets:8,jobs:16,deliveries:16,repairs:8,repairNodes:4096,repairNetworkNodes:8192,repairNetworkLinks:32768,repairGrounds:8,repairStreetTargets:512,repairAccessPieces:2048,repairVerge:32,repairRadius:4,repairPath:128,money:1_000_000,quantity:10_000,capacity:32,decisionS:.25});
const ref=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),money=z.number().int().min(0).max(COMMERCE_LIMITS.money),quantity=z.number().int().min(0).max(COMMERCE_LIMITS.quantity);
const label=z.string().min(1).max(40).refine(s=>s.trim().length>0,'label must contain text');
const good=z.object({id:ref,label,food:z.number().finite().min(0).max(100).default(0)}).strict();
const account=z.object({id:ref,actor:ref,credits:money,capacity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),satiety:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),shop:z.boolean().default(false),work:ref.optional(),repair:ref.optional(),repairs:z.array(ref).min(1).max(GROWTH_LIMITS.workerServices).optional()}).strict();
const lot=z.object({id:ref,good:ref,quantity,limit:quantity.refine(n=>n>0),price:z.number().int().min(1).max(10_000).optional()}).strict();
const market=z.object({id:ref,label,actor:ref,credits:money,radius:z.number().finite().min(20).max(80),lots:z.array(lot).min(1).max(COMMERCE_LIMITS.goods)}).strict();
const job=z.object({id:ref,label,market:ref,input:ref,take:quantity.refine(n=>n>0),output:ref,make:quantity.refine(n=>n>0),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),capacity:z.number().int().min(1).max(4),target:quantity}).strict();
const delivery=z.object({id:ref,label,from:ref,to:ref,good:ref,quantity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),pay:money.refine(n=>n>0),price:z.number().int().min(0).max(10_000).optional(),capacity:z.number().int().min(1).max(4)}).strict();
const repair=z.object({id:ref,label,market:ref,on:ref,streets:z.array(ref).min(1).max(32).optional(),verge:z.number().finite().min(0).max(COMMERCE_LIMITS.repairVerge).optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),kind:z.enum(MEASURE_KINDS).optional(),kinds:z.array(z.enum(MEASURE_KINDS)).min(1).max(MEASURE_KINDS.length).optional(),input:ref,take:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),regrow_s:z.number().finite().min(GROWTH_LIMITS.minSeconds).max(GROWTH_LIMITS.maxSeconds).optional(),seed_scale:z.number().finite().min(GROWTH_LIMITS.minScale).max(GROWTH_LIMITS.maxScale).optional(),dispatch_s:z.number().finite().min(0).max(120).default(12)}).strict().superRefine((r,ctx)=>{
 if((r.kind!==undefined)===(r.kinds!==undefined))ctx.addIssue({code:'custom',message:'repair needs exactly one of kind or kinds',path:['kinds']});
 if(r.grounds && new Set([r.on,...r.grounds]).size!==r.grounds.length+1)ctx.addIssue({code:'custom',message:'repair grounds must be unique and exclude on',path:['grounds']});
 if(r.streets && new Set(r.streets).size!==r.streets.length)ctx.addIssue({code:'custom',message:'repair streets must be unique',path:['streets']});
 if(r.verge!==undefined && !r.streets)ctx.addIssue({code:'custom',message:'repair verge requires streets',path:['verge']});
 if(r.seed_scale!==undefined && r.regrow_s===undefined)ctx.addIssue({code:'custom',message:'seed_scale requires regrow_s',path:['seed_scale']});
 if(r.regrow_s!==undefined && (r.kind!=='tree' || r.kinds))ctx.addIssue({code:'custom',message:'regrow_s requires kind=tree',path:['regrow_s']});
 if(r.kinds && new Set(r.kinds).size!==r.kinds.length)ctx.addIssue({code:'custom',message:'repair kinds must be unique',path:['kinds']});
});
export const economySchema=z.object({goods:z.array(good).min(1).max(COMMERCE_LIMITS.goods),accounts:z.array(account).min(1).max(COMMERCE_LIMITS.accounts),markets:z.array(market).min(1).max(COMMERCE_LIMITS.markets),jobs:z.array(job).max(COMMERCE_LIMITS.jobs),deliveries:z.array(delivery).max(COMMERCE_LIMITS.deliveries).default([]),repairs:z.array(repair).max(COMMERCE_LIMITS.repairs).default([])}).strict().superRefine((e,ctx)=>{
 const issue=(message:string,path:(string|number)[])=>ctx.addIssue({code:'custom',message,path});
 for(const name of ['goods','accounts','markets','jobs','deliveries','repairs'] as const)if(new Set(e[name].map(v=>v.id)).size!==e[name].length)issue(`duplicate ${name} ID`,[name]);
 if(new Set(e.accounts.map(a=>a.actor)).size!==e.accounts.length)issue('one account per actor',['accounts']);
 if(e.accounts.filter(a=>a.actor==='player').length!==1)issue('economy requires one player account',['accounts']);
 if(new Set(e.markets.map(m=>m.actor)).size!==e.markets.length)issue('one market per actor',['markets']);
 e.markets.forEach((m,i)=>{
  if(new Set(m.lots.map(l=>l.id)).size!==m.lots.length || new Set(m.lots.map(l=>l.good)).size!==m.lots.length)issue('market lots need unique IDs and goods',['markets',i,'lots']);
  m.lots.forEach((l,j)=>{if(!e.goods.some(g=>g.id===l.good))issue('unknown lot good',['markets',i,'lots',j,'good']);if(l.quantity>l.limit)issue('initial quantity exceeds lot limit',['markets',i,'lots',j,'quantity']);});
 });
 e.deliveries.forEach((d,i)=>{
  const from=e.markets.find(m=>m.id===d.from),to=e.markets.find(m=>m.id===d.to);
  if(!from || !from.lots.some(l=>l.good===d.good && l.limit>=d.quantity))issue('delivery source must have a matching lot with room for the cargo',['deliveries',i,'from']);
  if(!to || !to.lots.some(l=>l.good===d.good && l.limit>=d.quantity))issue('delivery destination must have a matching lot with room for the cargo',['deliveries',i,'to']);
  if(d.from===d.to)issue('delivery needs different markets',['deliveries',i,'to']);
  if(d.pay+d.quantity*(d.price??0)>COMMERCE_LIMITS.money)issue('delivery invoice and wage must fit the treasury limit',['deliveries',i,'price']);
 });
 e.jobs.forEach((j,i)=>{
  const m=e.markets.find(m=>m.id===j.market),input=m?.lots.find(l=>l.good===j.input),output=m?.lots.find(l=>l.good===j.output);
  if(!m)issue('unknown work market',['jobs',i,'market']);
  if(!input || j.take>input.limit)issue('work input must fit an existing market lot',['jobs',i,'input']);
  if(!output || j.make>output.limit || j.target>output.limit)issue('work output and target must fit an existing market lot',['jobs',i,'output']);
  if(j.input===j.output)issue('work needs different input and output goods',['jobs',i,'output']);
 });
 e.repairs.forEach((r,i)=>{const lot=e.markets.find(m=>m.id===r.market)?.lots.find(l=>l.good===r.input);if(!lot || lot.limit<r.take)issue('repair input must fit an existing market lot',['repairs',i,'input']);});
 e.accounts.forEach((a,i)=>{
  if(a.repair && a.repairs || a.repairs && new Set(a.repairs).size!==a.repairs.length)issue('choose repair or a unique repairs list',['accounts',i,'repairs']);
  if(a.actor==='player' && (a.shop || a.work || accountRepairs(a).length))issue('the player acts through controls, not automatic policies',['accounts',i]);
  if(a.work && accountRepairs(a).length)issue('one automatic work policy per account',['accounts',i]);
  for(const id of accountRepairs(a))if(!e.repairs.some(r=>r.id===id))issue('unknown account repair',['accounts',i,a.repairs ? 'repairs' : 'repair']);
  if(a.work && !e.jobs.some(j=>j.id===a.work))issue('unknown account work',['accounts',i,'work']);
 });
});
export type Economy=z.infer<typeof economySchema>;
export type Market=Economy['markets'][number];
export type Job=Economy['jobs'][number];
export type Repair=Economy['repairs'][number];
export const accountRepairs=(a:{repair?:string;repairs?:string[]})=>a.repairs??(a.repair ? [a.repair] : []);
export const repairGrounds=(r:Repair)=>[r.on,...(r.grounds??[])];
export const repairKinds=(r:Repair)=>r.kinds??[r.kind!];
export const deliveryBill=(d:Economy['deliveries'][number])=>d.quantity*(d.price??0);

export interface RepairTarget {objectId:string;zoneId?:string;contact:Contact}
const coverageCache=new WeakMap<Scene,Map<string,{targets:RepairTarget[];access:Scene['surfaces'][number]['points'][]}>>();
/** Short work approaches extend named sidewalks only near declared category contacts. */
export function repairCoverage(scene:Scene,r:Repair){
 let entries=coverageCache.get(scene);if(!entries){entries=new Map();coverageCache.set(scene,entries);}const cached=entries.get(r.id);if(cached)return cached;
 const grounds=repairGrounds(r).flatMap(id=>scene.surfaces.find(s=>s.id===id)?.points ? [scene.surfaces.find(s=>s.id===id)!.points] : []),selected=scene.streets.filter(s=>r.streets?.includes(s.id)),road=roadFootprint(scene),riding=streetFootprints(scene).riding;
 const sidewalks=r.streets ? unionPolygons(streetPolygons(selected,'reserved'),[...riding,...road]) : [],verge=r.verge??24;
 const verges=r.streets ? streetPolygons(selected.map(s=>({...s,sidewalk:s.sidewalk+verge})),'reserved') : [];
 const targets:RepairTarget[]=[],streetTargets:RepairTarget[]=[];
 for(const o of scene.objects){if(!o.spec || !('measure' in o.spec) || !o.spec.measure || !repairKinds(r).includes(o.spec.measure.kind))continue;
  const whole=['break','topple'].includes(impactOf(o.spec)?.kind??''),zones=zonesOf(o.spec);if(!whole && !zones.length)continue;
  const contacts=objectContacts(scene,o),local=grounds.some(p=>onPolygon(p,o.x,o.y));
  const candidates=[...(whole ? [{objectId:o.id,contact:contacts[0]!}] : []),...zones.map(z=>({objectId:o.id,zoneId:z.id,contact:contacts.find(c=>c.zoneId===z.id)!})).filter(t=>t.contact.bottom<=drivingHeight(scene.terrain,t.contact.x,t.contact.y)+18)];
  for(const t of candidates){const c=t.contact,street=sidewalks.some(p=>onPolygon(p,c.x,c.y) || distanceToPolygon(c.x,c.y,p)<=verge);if(local || street)targets.push(t);if(street)streetTargets.push(t);}
 }
 if(streetTargets.length>COMMERCE_LIMITS.repairStreetTargets)throw Error(`${r.id}: repair exceeds 512 street targets; split service districts`);
 const boxes=streetTargets.map(t=>{const c=t.contact,radius=c.r+12+COMMERCE_LIMITS.repairRadius;return rectPolygon({x0:Math.max(0,c.x-radius),y0:Math.max(0,c.y-radius),x1:Math.min(scene.canonical.width,c.x+radius),y1:Math.min(scene.canonical.height,c.y+radius)});});
 const access=r.streets ? unionPolygons(intersectPolygons(verges,boxes),[...riding,...road,...(scene.terrain.landscape?.waters??[]).flatMap(w=>triangulatePolygon(w.polygon))]) : [];
 if(access.length>COMMERCE_LIMITS.repairAccessPieces)throw Error(`${r.id}: repair exceeds 2048 verge access pieces; split service districts`);
 const result={targets,access};entries.set(r.id,result);return result;
}
export const repairTargets=(scene:Scene,r:Repair)=>repairCoverage(scene,r).targets;

/** Linked actor ownership is checked after modules/furnishings have been combined. */
export function economyProblems(scene:Scene):string[]{
 const e=scene.economy;if(!e)return [];
 const stationary=(id:string)=>{const o=scene.objects.find(o=>o.id===id);return o && roleOf(o)==='npc' && !o.route && !o.ambient && !scene.behaviors.find(b=>b.id===o.behavior)?.states.some(s=>s.action==='patrol');};
 const problems:string[]=[];
 for(const a of e.accounts){const o=scene.objects.find(o=>o.id===a.actor);if(a.actor!=='player' && (!o || roleOf(o)!=='npc'))problems.push(`${a.id}: account actor must be player or an NPC placement`);if(a.work && !stationary(a.actor))problems.push(`${a.id}: automatic workers must be stationary NPCs`);}
 for(const m of e.markets)if(!stationary(m.actor))problems.push(`${m.id}: market requires a stationary NPC placement`);
 for(const m of e.markets){const o=scene.objects.find(o=>o.id===m.actor);if(o && waterAt(scene.terrain,o.x,o.y,drivingHeight(scene.terrain,o.x,o.y)))problems.push(`${m.id}: market requires dry ground or a supported deck`);}
 for(const d of e.deliveries){const from=e.markets.find(m=>m.id===d.from),to=e.markets.find(m=>m.id===d.to),a=scene.objects.find(o=>o.id===from?.actor),b=scene.objects.find(o=>o.id===to?.actor);if(from && to && a && b && Math.hypot(a.x-b.x,a.y-b.y)<=from.radius+to.radius)problems.push(`${d.id}: delivery markets must have separate interaction areas`);}
 for(const a of e.accounts)if(a.work){const j=e.jobs.find(j=>j.id===a.work),m=e.markets.find(m=>m.id===j?.market),worker=scene.objects.find(o=>o.id===a.actor),vendor=scene.objects.find(o=>o.id===m?.actor);if(m && worker && vendor && Math.hypot(worker.x-vendor.x,worker.y-vendor.y)>m.radius)problems.push(`${a.id}: worker is outside its market's reach`);}
 for(const r of e.repairs){
  const vendor=scene.objects.find(o=>o.id===e.markets.find(m=>m.id===r.market)?.actor),home=scene.surfaces.find(s=>s.id===r.on);
  if(!home || !vendor || !onPolygon(home.points,vendor.x,vendor.y))problems.push(`${r.id}: repair needs a surface containing its supply market`);
  for(const id of r.streets??[]){const street=scene.streets.find(s=>s.id===id);if(!street || street.sidewalk<8)problems.push(`${r.id}: repair street ${id} needs an existing sidewalk at least 8 units wide`);}
  let samples=0;
  for(const id of repairGrounds(r)){
   const area=scene.surfaces.find(s=>s.id===id);if(!area){problems.push(`${r.id}: unknown repair ground ${id}`);continue;}
   const turns=area.points.map((p,i)=>{const q=area.points[(i+1)%area.points.length]!,r=area.points[(i+2)%area.points.length]!;return Math.sign((q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x));}).filter(n=>n);
   if(new Set(turns).size>1)problems.push(`${r.id}: repair area must be convex; split irregular work grounds`);
   const b=polygonBounds(area.points);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);
  }
  if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${r.id}: repair area exceeds 4096 local navigation samples in total`);
  if(r.regrow_s!==undefined)for(const t of repairTargets(scene,r)){const o=scene.objects.find(o=>o.id===t.objectId)!,spec=o.spec;if(t.zoneId || roleOf(o)!=='prop' || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.foundation || spec.rideable || spec.emitter || spec.lamp || spec.breakZones?.length || impactOf(spec)?.kind!=='topple' || spec.contacts?.some(c=>c.position.some(n=>n!==0)) || (spec.contacts?.length??0)>1)problems.push(`${r.id}: regrowth requires whole toppling prop trees with one centered base body, without foundations, zones, seats, emitters or lamps`);}
  try{if(!repairTargets(scene,r).length)problems.push(`${r.id}: repair area has no destructible objects of its measured kind`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 for(const a of e.accounts)for(const id of accountRepairs(a)){const r=e.repairs.find(r=>r.id===id),area=scene.surfaces.find(s=>s.id===r?.on),o=scene.objects.find(o=>o.id===a.actor),m=e.markets.find(m=>m.id===r?.market),vendor=scene.objects.find(o=>o.id===m?.actor);if(!stationary(a.actor) || e.markets.some(m=>m.actor===a.actor) || !area || !o || !onPolygon(area.points,o.x,o.y) || !m || !vendor || Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${a.id}: repair worker needs a stationary home inside its service area and supply-market reach; a market owner cannot leave for repairs`);}
 return problems;
}
