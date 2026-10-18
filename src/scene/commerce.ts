import {HUMANOID_BONES} from './humanoid';
import {worldSeats} from './seating';
import {workGround} from './interiors';
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

export const COMMERCE_LIMITS=Object.freeze({goods:8,accounts:16,markets:8,jobs:16,meals:8,shifts:8,socials:8,mealMarkets:4,milestones:16,workerJobs:4,ingredients:4,deliveries:16,courierContracts:4,repairs:8,repairNodes:4096,repairNetworkNodes:8192,repairNetworkLinks:32768,repairGrounds:8,repairStreetTargets:512,repairAccessPieces:2048,repairVerge:32,repairRadius:4,repairPath:128,money:1_000_000,quantity:10_000,capacity:32,decisionS:.25});
const ref=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),money=z.number().int().min(0).max(COMMERCE_LIMITS.money),quantity=z.number().int().min(0).max(COMMERCE_LIMITS.quantity);
const label=z.string().min(1).max(40).refine(s=>s.trim().length>0,'label must contain text');
const good=z.object({id:ref,label,food:z.number().finite().min(0).max(100).default(0)}).strict();
const account=z.object({id:ref,actor:ref,credits:money,capacity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),satiety:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),shop:z.boolean().default(false),social:ref.optional(),shift:ref.optional(),meal:ref.optional(),work:ref.optional(),works:z.array(ref).min(1).max(COMMERCE_LIMITS.workerJobs).optional(),repair:ref.optional(),repairs:z.array(ref).min(1).max(GROWTH_LIMITS.workerServices).optional(),deliveries:z.array(ref).min(1).max(COMMERCE_LIMITS.courierContracts).optional()}).strict();
const lot=z.object({id:ref,good:ref,quantity,limit:quantity.refine(n=>n>0),price:z.number().int().min(1).max(10_000).optional()}).strict();
const hours=z.tuple([z.number().finite().min(0).lt(24),z.number().finite().min(0).max(24)]).refine(([start,end])=>start!==end,'hours need different opening and closing times; omit for all-day service');
const market=z.object({id:ref,label,actor:ref,credits:money,radius:z.number().finite().min(20).max(80),hours:hours.optional(),owner:ref.optional(),sale:money.positive().optional(),lots:z.array(lot).min(1).max(COMMERCE_LIMITS.goods)}).strict();
const ingredient=z.object({good:ref,take:quantity.refine(n=>n>0)}).strict();
const job=z.object({id:ref,label,market:ref,input:ref.optional(),take:quantity.refine(n=>n>0).optional(),ingredients:z.array(ingredient).min(1).max(COMMERCE_LIMITS.ingredients).optional(),output:ref,make:quantity.refine(n=>n>0),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),capacity:z.number().int().min(1).max(4),target:quantity,requires:ref.optional()}).strict().superRefine((j,ctx)=>{
 if(j.ingredients ? j.input!==undefined || j.take!==undefined : j.input===undefined || j.take===undefined)ctx.addIssue({code:'custom',message:'work needs input and take, or an ingredient block, never both',path:['ingredients']});
 if(j.ingredients && new Set(j.ingredients.map(i=>i.good)).size!==j.ingredients.length)ctx.addIssue({code:'custom',message:'work ingredients need unique goods',path:['ingredients']});
});
const delivery=z.object({id:ref,label,from:ref,to:ref,good:ref,quantity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),pay:money.refine(n=>n>0),price:z.number().int().min(0).max(10_000).optional(),capacity:z.number().int().min(1).max(4),on:ref.optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional()}).strict().superRefine((d,ctx)=>{
 if(d.grounds && (!d.on || new Set([d.on,...d.grounds]).size!==d.grounds.length+1))ctx.addIssue({code:'custom',message:'delivery grounds require on and must be unique, excluding on',path:['grounds']});
});
const repair=z.object({id:ref,label,market:ref,on:ref,streets:z.array(ref).min(1).max(32).optional(),verge:z.number().finite().min(0).max(COMMERCE_LIMITS.repairVerge).optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),kind:z.enum(MEASURE_KINDS).optional(),kinds:z.array(z.enum(MEASURE_KINDS)).min(1).max(MEASURE_KINDS.length).optional(),input:ref,take:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),regrow_s:z.number().finite().min(GROWTH_LIMITS.minSeconds).max(GROWTH_LIMITS.maxSeconds).optional(),seed_scale:z.number().finite().min(GROWTH_LIMITS.minScale).max(GROWTH_LIMITS.maxScale).optional(),dispatch_s:z.number().finite().min(0).max(120).default(12)}).strict().superRefine((r,ctx)=>{
 if((r.kind!==undefined)===(r.kinds!==undefined))ctx.addIssue({code:'custom',message:'repair needs exactly one of kind or kinds',path:['kinds']});
 if(r.grounds && new Set([r.on,...r.grounds]).size!==r.grounds.length+1)ctx.addIssue({code:'custom',message:'repair grounds must be unique and exclude on',path:['grounds']});
 if(r.streets && new Set(r.streets).size!==r.streets.length)ctx.addIssue({code:'custom',message:'repair streets must be unique',path:['streets']});
 if(r.verge!==undefined && !r.streets)ctx.addIssue({code:'custom',message:'repair verge requires streets',path:['verge']});
 if(r.seed_scale!==undefined && r.regrow_s===undefined)ctx.addIssue({code:'custom',message:'seed_scale requires regrow_s',path:['seed_scale']});
 if(r.regrow_s!==undefined && (r.kind!=='tree' || r.kinds))ctx.addIssue({code:'custom',message:'regrow_s requires kind=tree',path:['regrow_s']});
 if(r.kinds && new Set(r.kinds).size!==r.kinds.length)ctx.addIssue({code:'custom',message:'repair kinds must be unique',path:['kinds']});
});
const meal=z.object({id:ref,good:ref,markets:z.array(ref).min(1).max(COMMERCE_LIMITS.mealMarkets),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),eat_s:z.number().finite().min(1).max(12),seats:z.array(ref).min(1).max(4).optional()}).strict().superRefine((m,ctx)=>{
 if(m.seats && new Set(m.seats).size!==m.seats.length)ctx.addIssue({code:'custom',message:'meal seats must be unique furniture placement IDs',path:['seats']});
 if(new Set(m.markets).size!==m.markets.length)ctx.addIssue({code:"custom",message:"meal markets must be unique",path:["markets"]});
 if(m.grounds && new Set([m.on,...m.grounds]).size!==m.grounds.length+1)ctx.addIssue({code:"custom",message:"meal grounds must be unique and exclude on",path:["grounds"]});
});
const social=z.object({id:ref,good:ref,seats:z.array(ref).min(1).max(4),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),eat_s:z.number().finite().min(1).max(12),cooldown_s:z.number().finite().min(30).max(86400).default(600),max_fullness:z.number().finite().min(0).max(100).default(80)}).strict().superRefine((m,ctx)=>{
 if(new Set(m.seats).size!==m.seats.length)ctx.addIssue({code:'custom',message:'social seats must be unique furniture placement IDs',path:['seats']});
 if(m.grounds && new Set([m.on,...m.grounds]).size!==m.grounds.length+1)ctx.addIssue({code:'custom',message:'social grounds must be unique and exclude on',path:['grounds']});
});
const milestone=z.object({id:ref,label,kind:z.enum(['work','delivery','repair']),task:ref,count:z.number().int().min(1).max(1e9)}).strict();
const shift=z.object({id:ref,market:ref,rest:z.object({x:z.number().finite().min(0).max(16384),y:z.number().finite().min(0).max(16384)}).strict(),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),lead_s:z.number().finite().min(0).max(120).default(15)}).strict().superRefine((s,ctx)=>{if(s.grounds && new Set([s.on,...s.grounds]).size!==s.grounds.length+1)ctx.addIssue({code:'custom',message:'shift grounds must be unique and exclude on',path:['grounds']});});
export const economySchema=z.object({goods:z.array(good).min(1).max(COMMERCE_LIMITS.goods),accounts:z.array(account).min(1).max(COMMERCE_LIMITS.accounts),markets:z.array(market).min(1).max(COMMERCE_LIMITS.markets),jobs:z.array(job).max(COMMERCE_LIMITS.jobs),meals:z.array(meal).max(COMMERCE_LIMITS.meals).default([]),shifts:z.array(shift).max(COMMERCE_LIMITS.shifts).default([]),socials:z.array(social).max(COMMERCE_LIMITS.socials).default([]),milestones:z.array(milestone).max(COMMERCE_LIMITS.milestones).default([]),deliveries:z.array(delivery).max(COMMERCE_LIMITS.deliveries).default([]),repairs:z.array(repair).max(COMMERCE_LIMITS.repairs).default([])}).strict().superRefine((e,ctx)=>{
 const issue=(message:string,path:(string|number)[])=>ctx.addIssue({code:'custom',message,path});
 for(const name of ['goods','accounts','markets','jobs','deliveries','repairs','milestones','meals','shifts','socials'] as const)if(new Set(e[name].map(v=>v.id)).size!==e[name].length)issue(`duplicate ${name} ID`,[name]);
 if(new Set(e.accounts.flatMap(a=>a.shift ? [a.shift] : [])).size!==e.accounts.filter(a=>a.shift).length)issue('one account per shift plan',['accounts']);
 e.shifts.forEach((s,i)=>{if(!e.markets.some(m=>m.id===s.market && m.hours))issue('shift needs a market with daily hours',['shifts',i,'market']);});
 if(new Set(e.accounts.map(a=>a.actor)).size!==e.accounts.length)issue('one account per actor',['accounts']);
 if(e.accounts.filter(a=>a.actor==='player').length!==1)issue('economy requires one player account',['accounts']);
 if(new Set(e.markets.map(m=>m.actor)).size!==e.markets.length)issue('one market per actor',['markets']);
 e.markets.forEach((m,i)=>{
  if(m.owner && !e.accounts.some(a=>a.id===m.owner))issue('market owner must be an existing account',['markets',i,'owner']);
  if(m.sale!==undefined && (!m.owner || e.accounts.find(a=>a.id===m.owner)?.actor==='player'))issue('sale needs an existing non-player owner account',['markets',i,'sale']);
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
  const m=e.markets.find(m=>m.id===j.market),output=m?.lots.find(l=>l.good===j.output);
  if(!m)issue('unknown work market',['jobs',i,'market']);
  for(const [k,need] of jobInputs(j).entries()){const input=m?.lots.find(l=>l.good===need.good);if(!input || need.take>input.limit)issue('work input must fit an existing market lot',j.ingredients ? ['jobs',i,'ingredients',k,'good'] : ['jobs',i,'input']);}
  if(!output || j.make>output.limit || j.target>output.limit)issue('work output and target must fit an existing market lot',['jobs',i,'output']);
  if(jobInputs(j).some(i=>i.good===j.output))issue('work needs different input and output goods',['jobs',i,'output']);
 });
 e.milestones.forEach((m,i)=>{const tasks=m.kind==='work' ? e.jobs : m.kind==='delivery' ? e.deliveries : e.repairs;if(!tasks.some(t=>t.id===m.task))issue('milestone needs an existing task of its kind',['milestones',i,'task']);});
 e.jobs.forEach((j,i)=>{
  if(j.requires && !e.milestones.some(m=>m.id===j.requires))issue('unknown work milestone',['jobs',i,'requires']);
  const seen=new Set<string>();let next:typeof j|undefined=j;while(next?.requires){if(seen.has(next.id)){issue('work milestone requirements must not form a cycle',['jobs',i,'requires']);break;}seen.add(next.id);const m=e.milestones.find(m=>m.id===next!.requires);next=m?.kind==='work' ? e.jobs.find(j=>j.id===m.task) : undefined;}
 });
 e.repairs.forEach((r,i)=>{const lot=e.markets.find(m=>m.id===r.market)?.lots.find(l=>l.good===r.input);if(!lot || lot.limit<r.take)issue('repair input must fit an existing market lot',['repairs',i,'input']);});
 e.meals.forEach((m,i)=>{
  if(!e.goods.some(g=>g.id===m.good && g.food>0))issue("meal good must be food",["meals",i,"good"]);
  for(const id of m.markets)if(!e.markets.some(v=>v.id===id && v.lots.some(l=>l.good===m.good && l.price)))issue("meal markets need a priced lot for this food",["meals",i,"markets"]);
 });
 e.socials.forEach((m,i)=>{if(!e.goods.some(g=>g.id===m.good && g.food>0))issue('social good must be food',['socials',i,'good']);});
 e.accounts.forEach((a,i)=>{
  if(a.social && (a.actor==='player' || !e.socials.some(m=>m.id===a.social)))issue('social needs an existing plan and an NPC account',['accounts',i,'social']);
  if(a.shift && (!e.shifts.some(s=>s.id===a.shift) || a.actor==='player' || a.meal || accountRepairs(a).length || a.deliveries))issue('shift needs an existing plan and an NPC staff account without meal, repair or delivery policies',['accounts',i,'shift']);
  if(a.shift){const plan=e.shifts.find(s=>s.id===a.shift);if(plan && (accountJobs(a).some(id=>e.jobs.find(j=>j.id===id)?.market!==plan.market) || e.markets.some(m=>m.actor===a.actor && m.id!==plan.market)))issue('shift work and operated counter must use its market',['accounts',i,'shift']);}
  if(a.meal && (!e.meals.some(m=>m.id===a.meal) || a.shop || accountJobs(a).length || accountRepairs(a).length || a.deliveries))issue("meal needs an existing plan and excludes other automatic economy policies",["accounts",i,"meal"]);
  if(a.work && a.works || a.works && new Set(a.works).size!==a.works.length)issue('choose work or a unique works list',['accounts',i,'works']);
  if(a.repair && a.repairs || a.repairs && new Set(a.repairs).size!==a.repairs.length)issue('choose repair or a unique repairs list',['accounts',i,'repairs']);
  if(a.actor==='player' && (a.meal || a.shop || accountJobs(a).length || accountRepairs(a).length || a.deliveries))issue('the player acts through controls, not automatic policies',['accounts',i]);
  if(accountJobs(a).length && accountRepairs(a).length)issue('one automatic work policy per account',['accounts',i]);
  for(const id of accountRepairs(a))if(!e.repairs.some(r=>r.id===id))issue('unknown account repair',['accounts',i,a.repairs ? 'repairs' : 'repair']);
  for(const id of accountJobs(a))if(!e.jobs.some(j=>j.id===id))issue('unknown account work',['accounts',i,a.works ? 'works' : 'work']);
  if(a.deliveries){
   if(accountJobs(a).length || new Set(a.deliveries).size!==a.deliveries.length)issue('deliveries must be unique and exclude production work',['accounts',i,'deliveries']);
   for(const id of a.deliveries){const d=e.deliveries.find(d=>d.id===id);if(!d?.on)issue('automatic delivery needs an existing delivery with on and connected grounds',['accounts',i,'deliveries']);else if(d.quantity>a.capacity)issue('automatic delivery cargo exceeds account capacity',['accounts',i,'deliveries']);}
  }
 });
});
export type Economy=z.infer<typeof economySchema>;
export type Market=Economy['markets'][number];
export type Job=Economy['jobs'][number];
export const jobInputs=(job:Pick<Job,'input'|'take'|'ingredients'>)=>job.ingredients??(job.input!==undefined && job.take!==undefined ? [{good:job.input,take:job.take}] : []);
export const jobTake=(job:Job,good:string)=>job.ingredients ? job.ingredients.find(i=>i.good===good)?.take??0 : job.input===good ? job.take! : 0;
export type Repair=Economy['repairs'][number];
export const accountJobs=(a:{work?:string;works?:string[]})=>a.works??(a.work ? [a.work] : []);
export type Meal=Economy['meals'][number];
export type Social=Economy['socials'][number];
export type Shift=Economy['shifts'][number];
export type Delivery=Economy['deliveries'][number];
export const accountRepairs=(a:{repair?:string;repairs?:string[]})=>a.repairs??(a.repair ? [a.repair] : []);
export const repairGrounds=(r:Repair)=>[r.on,...(r.grounds??[])];
export const repairKinds=(r:Repair)=>r.kinds??[r.kind!];
export const deliveryBill=(d:Economy['deliveries'][number])=>d.quantity*(d.price??0);

export interface RepairTarget {objectId:string;zoneId?:string;contact:Contact}
const coverageCache=new WeakMap<Scene,Map<string,{targets:RepairTarget[];access:Scene['surfaces'][number]['points'][]}>>();
/** Short work approaches extend named sidewalks only near declared category contacts. */
export function repairCoverage(scene:Scene,r:Repair){
 let entries=coverageCache.get(scene);if(!entries){entries=new Map();coverageCache.set(scene,entries);}const cached=entries.get(r.id);if(cached)return cached;
 const grounds=repairGrounds(r).flatMap(id=>workGround(scene,id)?.points ? [workGround(scene,id)!.points] : []),selected=scene.streets.filter(s=>r.streets?.includes(s.id)),road=roadFootprint(scene),riding=streetFootprints(scene).riding;
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
 const e=scene.economy;const guarded=scene.behaviors.flatMap(b=>b.states.flatMap(s=>s.transitions.filter(t=>t.requires).map(t=>({b,t}))));
 if(!e)return [...guarded.map(({b,t})=>`${b.id}/${t.id}: requires needs an economy milestone`),...scene.behaviors.flatMap(b=>b.states.flatMap(s=>s.transitions.filter(t=>t.shared_meals!==undefined).map(t=>`${b.id}/${t.id}: shared_meals needs an economy social account`)))];
 const stationary=(id:string)=>{const o=scene.objects.find(o=>o.id===id);return o && roleOf(o)==='npc' && !o.route && !o.ambient && !scene.behaviors.find(b=>b.id===o.behavior)?.states.some(s=>s.action==='patrol');};
 const problems:string[]=[];
 if(e.markets.some(m=>m.hours) && !scene.daylight)problems.push('market hours require a world daylight clock');
 for(const a of e.accounts)if(a.shift){
  const plan=e.shifts.find(s=>s.id===a.shift),o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec,m=e.markets.find(m=>m.id===plan?.market),vendor=scene.objects.find(o=>o.id===m?.actor);
  if(!stationary(a.actor) || !o?.behavior || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.measure?.kind!=='person' || spec.body.interaction!=='decor' || spec.body.colliderRadius*(o.scale??1)>8 || (spec.body.colliderHeight??18)*(o.scale??1)>32)problems.push(`${a.id}: shift staff need a stationary person NPC program and a decor body within 8 radius and 32 height; paths use the actual body`);
  if(plan && o && Math.hypot(o.x-plan.rest.x,o.y-plan.rest.y)<16)problems.push(`${a.id}: shift rest point must be at least 16 units from work`);
  if(o && m && vendor && Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${a.id}: shift work placement must be within its counter reach`);
 }
 for(const a of e.accounts)if(a.social){const o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec;
  if(!stationary(a.actor) || !o?.behavior || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.measure?.kind!=='person' || spec.body.interaction!=='decor' || spec.body.colliderRadius*(o.scale??1)>8 || (spec.body.colliderHeight??18)*(o.scale??1)>32 || !HUMANOID_BONES.every(b=>spec.joints?.some(j=>j.bone===b)))problems.push(`${a.id}: social meals need a stationary complete humanoid NPC program and decor body within 8 radius and 32 height`);
 }
 for(const b of scene.behaviors)for(const s of b.states)for(const t of s.transitions)if(t.shared_meals!==undefined && scene.objects.some(o=>o.behavior===b.id && !e.accounts.some(a=>a.actor===o.id && a.social)))problems.push(`${b.id}/${t.id}: shared_meals requires social capability on every using NPC account`);
 for(const m of e.socials)for(const id of m.seats)if(worldSeats(scene).filter(s=>s.objectId===id).length<2)problems.push(`${m.id}: social seats require furniture with at least two slots`);
 for(const s of e.shifts){
  const m=e.markets.find(m=>m.id===s.market);if(m?.hours && scene.daylight){const [start,end]=m.hours,open=end>start ? end-start : 24-start+end,closed=(24-open)/24*scene.daylight.cycleSeconds;if(s.lead_s>=closed)problems.push(`${s.id}: lead_s must be shorter than the market's closed interval`);}
  let samples=0;for(const id of [s.on,...(s.grounds??[])]){const ground=workGround(scene,id);if(!ground){problems.push(`${s.id}: unknown shift ground ${id}`);continue;}const p=ground.points,turns=p.map((a,i)=>{const b=p[(i+1)%p.length]!,c=p[(i+2)%p.length]!;return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${s.id}: shift grounds must be convex`);const b=polygonBounds(p);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${s.id}: shift grounds exceed 4096 local navigation samples`);
 }
 for(const {b,t} of guarded){
  const m=e.milestones.find(m=>m.id===t.requires);if(!m){problems.push(`${b.id}/${t.id}: unknown conversation milestone ${t.requires}`);continue;}
  const market=m.kind==='work' ? e.jobs.find(j=>j.id===m.task)?.market : m.kind==='delivery' ? e.deliveries.find(d=>d.id===m.task)?.to : e.repairs.find(r=>r.id===m.task)?.market;
  const actor=e.markets.find(m=>m.id===market)?.actor;
  if(scene.objects.some(o=>o.behavior===b.id && o.id!==actor))problems.push(`${b.id}/${t.id}: conversation milestones must belong to this task's receiving market actor`);
 }
 for(const a of e.accounts){const o=scene.objects.find(o=>o.id===a.actor);if(a.actor!=='player' && (!o || roleOf(o)!=='npc'))problems.push(`${a.id}: account actor must be player or an NPC placement`);if(accountJobs(a).length && !stationary(a.actor))problems.push(`${a.id}: automatic workers must be stationary NPCs`);}
 for(const a of e.accounts)if(a.meal){const o=scene.objects.find(o=>o.id===a.actor);if(!o?.behavior || o.ambient || !o.spec || !('dslVersion' in o.spec) || o.spec.dslVersion!==2 || o.spec.measure?.kind!=='person' || o.spec.body.interaction!=='decor' || e.markets.some(m=>m.actor===a.actor) || o.route && scene.routes.find(r=>r.id===o.route!.id)?.kind!=='walk')problems.push(`${a.id}: meal trips need a person NPC program, a walking route or stationary home, and no market ownership`);}
 for(const a of e.accounts)if(a.meal && e.meals.find(m=>m.id===a.meal)?.seats){const o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec;if(!spec || !('joints' in spec) || !HUMANOID_BONES.every(b=>spec.joints?.some(j=>j.bone===b)))problems.push(`${a.id}: seated meals require a complete humanoid rig`);}
 for(const m of [...e.meals,...e.socials]){let samples=0;for(const id of [m.on,...(m.grounds??[])]){const ground=workGround(scene,id);if(!ground){problems.push(`${m.id}: unknown meal/social ground ${id}`);continue;}const p=ground.points,turns=p.map((a,i)=>{const b=p[(i+1)%p.length]!,c=p[(i+2)%p.length]!;return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${m.id}: meal/social grounds must be convex`);const b=polygonBounds(p);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${m.id}: meal/social grounds exceed 4096 local navigation samples`);}
 for(const m of e.meals)for(const id of m.seats??[])if(!worldSeats(scene).some(s=>s.objectId===id))problems.push(`${m.id}: unknown seat furniture ${id}`);
 for(const m of e.markets)if(!stationary(m.actor))problems.push(`${m.id}: market requires a stationary NPC placement`);
 for(const m of e.markets){const o=scene.objects.find(o=>o.id===m.actor);if(o && waterAt(scene.terrain,o.x,o.y,drivingHeight(scene.terrain,o.x,o.y)))problems.push(`${m.id}: market requires dry ground or a supported deck`);}
 for(const d of e.deliveries){const from=e.markets.find(m=>m.id===d.from),to=e.markets.find(m=>m.id===d.to),a=scene.objects.find(o=>o.id===from?.actor),b=scene.objects.find(o=>o.id===to?.actor);if(from && to && a && b && Math.hypot(a.x-b.x,a.y-b.y)<=from.radius+to.radius)problems.push(`${d.id}: delivery markets must have separate interaction areas`);}
 for(const d of e.deliveries)if(d.on){
  const ids=[d.on,...(d.grounds??[])],destination=scene.objects.find(o=>o.id===e.markets.find(m=>m.id===d.to)?.actor);let samples=0;
  for(const id of ids){const ground=workGround(scene,id);if(!ground){problems.push(`${d.id}: unknown delivery ground ${id}`);continue;}const points=ground.points,turns=points.map((p,i)=>{const q=points[(i+1)%points.length]!,r=points[(i+2)%points.length]!;return Math.sign((q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${d.id}: delivery grounds must be convex`);const b=polygonBounds(points);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}
  if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${d.id}: delivery grounds exceed 4096 local navigation samples`);
  const home=workGround(scene,d.on);if(!home || !destination || !onPolygon(home.points,destination.x,destination.y))problems.push(`${d.id}: delivery on must contain its receiving market`);
 }
 for(const a of e.accounts)for(const id of a.deliveries??[]){const d=e.deliveries.find(d=>d.id===id),ground=workGround(scene,d?.on),home=scene.objects.find(o=>o.id===a.actor),m=e.markets.find(m=>m.id===d?.to),vendor=scene.objects.find(o=>o.id===m?.actor);if(!stationary(a.actor) || e.markets.some(m=>m.actor===a.actor) || !ground || !home || !onPolygon(ground.points,home.x,home.y) || !m || !vendor || Math.hypot(home.x-vendor.x,home.y-vendor.y)>m.radius)problems.push(`${a.id}: courier needs a stationary home in its receiving market ground and reach; a market owner cannot leave for deliveries`);}
 for(const a of e.accounts)for(const id of accountJobs(a)){const j=e.jobs.find(j=>j.id===id),m=e.markets.find(m=>m.id===j?.market),worker=scene.objects.find(o=>o.id===a.actor),vendor=scene.objects.find(o=>o.id===m?.actor);if(m && worker && vendor && Math.hypot(worker.x-vendor.x,worker.y-vendor.y)>m.radius)problems.push(`${a.id}: worker is outside its market's reach`);}
 for(const r of e.repairs){
  const vendor=scene.objects.find(o=>o.id===e.markets.find(m=>m.id===r.market)?.actor),home=workGround(scene,r.on);
  if(!home || !vendor || !onPolygon(home.points,vendor.x,vendor.y))problems.push(`${r.id}: repair needs a surface containing its supply market`);
  for(const id of r.streets??[]){const street=scene.streets.find(s=>s.id===id);if(!street || street.sidewalk<8)problems.push(`${r.id}: repair street ${id} needs an existing sidewalk at least 8 units wide`);}
  let samples=0;
  for(const id of repairGrounds(r)){
   const area=workGround(scene,id);if(!area){problems.push(`${r.id}: unknown repair ground ${id}`);continue;}
   const turns=area.points.map((p,i)=>{const q=area.points[(i+1)%area.points.length]!,r=area.points[(i+2)%area.points.length]!;return Math.sign((q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x));}).filter(n=>n);
   if(new Set(turns).size>1)problems.push(`${r.id}: repair area must be convex; split irregular work grounds`);
   const b=polygonBounds(area.points);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);
  }
  if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${r.id}: repair area exceeds 4096 local navigation samples in total`);
  if(r.regrow_s!==undefined)for(const t of repairTargets(scene,r)){const o=scene.objects.find(o=>o.id===t.objectId)!,spec=o.spec;if(t.zoneId || roleOf(o)!=='prop' || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.foundation || spec.rideable || spec.emitter || spec.lamp || spec.breakZones?.length || impactOf(spec)?.kind!=='topple' || spec.contacts?.some(c=>c.position.some(n=>n!==0)) || (spec.contacts?.length??0)>1)problems.push(`${r.id}: regrowth requires whole toppling prop trees with one centered base body, without foundations, zones, seats, emitters or lamps`);}
  try{if(!repairTargets(scene,r).length)problems.push(`${r.id}: repair area has no destructible objects of its measured kind`);}catch(error){problems.push(error instanceof Error ? error.message : String(error));}
 }
 for(const a of e.accounts)for(const id of accountRepairs(a)){const r=e.repairs.find(r=>r.id===id),area=workGround(scene,r?.on),o=scene.objects.find(o=>o.id===a.actor),m=e.markets.find(m=>m.id===r?.market),vendor=scene.objects.find(o=>o.id===m?.actor);if(!stationary(a.actor) || e.markets.some(m=>m.actor===a.actor) || !area || !o || !onPolygon(area.points,o.x,o.y) || !m || !vendor || Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${a.id}: repair worker needs a stationary home inside its service area and supply-market reach; a market owner cannot leave for repairs`);}
 return problems;
}
