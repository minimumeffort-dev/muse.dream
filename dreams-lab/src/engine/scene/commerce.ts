import {workGestureSchema,WORK_GESTURE_LIMITS} from './work-gestures';
import {standingSightClear} from './contact-geometry';
import {walkingHeight} from './interiors';
import {HUMANOID_BONES} from './humanoid';
import {worldSeats} from './seating';
import {workGround} from './interiors';
import {z} from 'zod';
import {GROWTH_LIMITS} from './growth';
import {MEASURE_KINDS} from './measure';
import {impactOf,zonesOf} from './object-dsl';
import {onPolygon,streetPolygons,streetFootprints,rectPolygon} from './streets';
import {polygonBounds,polygonArea,distanceToPolygon,unionPolygons,intersectPolygons,triangulatePolygon} from './polygons';
import {roadFootprint} from './road';
import {objectContacts,sceneContacts,type Contact} from './contacts';
import type {Scene} from './schema';
import {roleOf} from './agents';
import {waterAt,drivingHeight} from './terrain';

export const COMMERCE_LIMITS=Object.freeze({goods:8,rations:8,accounts:16,markets:8,jobs:16,meals:8,shifts:8,socials:8,mealMarkets:4,milestones:16,workerJobs:5,ingredients:4,equipment:4,stations:16,deliveries:16,courierContracts:4,repairs:8,recoverySources:512,repairNodes:4096,repairNetworkNodes:8192,repairNetworkLinks:32768,repairGrounds:12,repairStreetTargets:512,repairAccessPieces:2048,repairVerge:128,repairRadius:4,repairPath:128,money:1_000_000,quantity:10_000,capacity:32,decisionS:.25});
const ref=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),money=z.number().int().min(0).max(COMMERCE_LIMITS.money),quantity=z.number().int().min(0).max(COMMERCE_LIMITS.quantity);
const label=z.string().min(1).max(40).refine(s=>s.trim().length>0,'label must contain text');
const good=z.object({id:ref,label,food:z.number().finite().min(0).max(100).default(0)}).strict();
const hours=z.tuple([z.number().finite().min(0).lt(24),z.number().finite().min(0).max(24)]).refine(([start,end])=>start!==end,'hours need different opening and closing times; omit for all-day service');
const companyNeed=z.object({initial:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),below:z.number().finite().min(0).max(95),gain:z.number().finite().min(1).max(100)}).strict();
const account=z.object({id:ref,actor:ref,visit:ref.optional(),credits:money,capacity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),satiety:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),rest:ref.optional(),company:companyNeed.optional(),commute:z.boolean().optional(),attendance:hours.optional(),on:ref.optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),shop:z.boolean().default(false),ration:ref.optional(),social:ref.optional(),shift:ref.optional(),meal:ref.optional(),work:ref.optional(),works:z.array(ref).min(1).max(COMMERCE_LIMITS.workerJobs).optional(),repair:ref.optional(),repairs:z.array(ref).min(1).max(GROWTH_LIMITS.workerServices).optional(),deliveries:z.array(ref).min(1).max(COMMERCE_LIMITS.courierContracts).optional()}).strict();
const lot=z.object({id:ref,good:ref,quantity,limit:quantity.refine(n=>n>0),price:z.number().int().min(1).max(10_000).optional()}).strict();
const market=z.object({id:ref,label,actor:ref,on:ref.optional(),credits:money,radius:z.number().finite().min(20).max(80),hours:hours.optional(),owner:ref.optional(),sale:money.positive().optional(),lots:z.array(lot).max(COMMERCE_LIMITS.goods)}).strict();
const ingredient=z.object({good:ref,take:quantity.refine(n=>n>0)}).strict();
const job=z.object({id:ref,label,kind:z.enum(['recipe','service']).optional(),market:ref,input:ref.optional(),take:quantity.refine(n=>n>0).optional(),ingredients:z.array(ingredient).min(1).max(COMMERCE_LIMITS.ingredients).optional(),output:ref.optional(),make:quantity.refine(n=>n>0).optional(),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),capacity:z.number().int().min(1).max(4),target:quantity,period_s:z.number().finite().min(30).max(86400).optional(),fee:z.number().int().min(1).max(10000).optional(),waiting:z.array(ref).min(1).max(4).optional(),wait_s:z.number().finite().min(1).max(600).optional(),cooldown_s:z.number().finite().min(30).max(86400).optional(),requires:ref.optional(),requires_any:z.array(ref).min(1).max(4).optional(),equipment:z.array(ref).min(1).max(COMMERCE_LIMITS.equipment).optional(),station:ref.optional(),gesture:ref.optional()}).strict().superRefine((j,ctx)=>{
 if((j.fee!==undefined)!==!!j.waiting || j.fee===undefined && (j.wait_s!==undefined || j.cooldown_s!==undefined))ctx.addIssue({code:'custom',message:'paid service needs fee and waiting together; wait_s/cooldown_s require them',path:['fee']});
 if(j.waiting && new Set(j.waiting).size!==j.waiting.length)ctx.addIssue({code:'custom',message:'waiting furniture must be unique',path:['waiting']});
 if(j.wait_s!==undefined && j.wait_s<j.seconds)ctx.addIssue({code:'custom',message:'service wait_s must cover its work duration',path:['wait_s']});
 if(j.fee!==undefined && j.kind!=='service')ctx.addIssue({code:'custom',message:'fee is only valid for service work',path:['fee']});
 if(j.requires_any && (j.requires || new Set(j.requires_any).size!==j.requires_any.length))ctx.addIssue({code:'custom',message:'requires_any needs unique milestone IDs and excludes requires',path:['requires_any']});
 if(j.equipment && new Set(j.equipment).size!==j.equipment.length)ctx.addIssue({code:'custom',message:'work equipment needs unique placement IDs',path:['equipment']});
 if(j.kind==='service'){
  for(const field of ['input','take','ingredients','output','make'] as const)if(j[field]!==undefined)ctx.addIssue({code:'custom',message:'service work cannot consume or produce goods',path:[field]});
  if(!j.station || !j.equipment?.length || j.capacity!==1)ctx.addIssue({code:'custom',message:'service work needs a physical station, matching equipment and capacity=1',path:['station']});
  if(j.target<1)ctx.addIssue({code:'custom',message:'service target must be a positive shared completion quota',path:['target']});
 }else{
  if(j.period_s!==undefined)ctx.addIssue({code:'custom',message:'period_s is only valid for service work',path:['period_s']});
  if(j.output===undefined || j.make===undefined)ctx.addIssue({code:'custom',message:'recipe work needs output and make',path:['output']});
  if(j.ingredients ? j.input!==undefined || j.take!==undefined : j.input===undefined || j.take===undefined)ctx.addIssue({code:'custom',message:'work needs input and take, or an ingredient block, never both',path:['ingredients']});
 }
 if(j.ingredients && new Set(j.ingredients.map(i=>i.good)).size!==j.ingredients.length)ctx.addIssue({code:'custom',message:'work ingredients need unique goods',path:['ingredients']});
});
const station=z.object({id:ref,object:ref,at:z.tuple([z.number().finite().min(-256).max(256),z.number().finite().min(-256).max(256)]),hands:z.tuple([z.number().finite().min(-256).max(256),z.number().finite().min(0).max(256),z.number().finite().min(-256).max(256)]),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional()}).strict().superRefine((s,ctx)=>{if(s.grounds && new Set([s.on,...s.grounds]).size!==s.grounds.length+1)ctx.addIssue({code:'custom',message:'station grounds must be unique and exclude on',path:['grounds']});});
const delivery=z.object({id:ref,label,from:ref,to:ref,good:ref,quantity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),pay:money.refine(n=>n>0),price:z.number().int().min(0).max(10_000).optional(),capacity:z.number().int().min(1).max(4),on:ref.optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional()}).strict().superRefine((d,ctx)=>{
 if(d.grounds && (!d.on || new Set([d.on,...d.grounds]).size!==d.grounds.length+1))ctx.addIssue({code:'custom',message:'delivery grounds require on and must be unique, excluding on',path:['grounds']});
});
const repair=z.object({id:ref,gesture:ref.optional(),label,market:ref,on:ref,dry:z.boolean().optional(),recover:ref.optional(),amount:z.number().int().min(1).max(COMMERCE_LIMITS.capacity).optional(),streets:z.array(ref).min(1).max(32).optional(),verge:z.number().finite().min(0).max(COMMERCE_LIMITS.repairVerge).optional(),grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),kind:z.enum(MEASURE_KINDS).optional(),kinds:z.array(z.enum(MEASURE_KINDS)).min(1).max(MEASURE_KINDS.length).optional(),input:ref,take:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),regrow_s:z.number().finite().min(GROWTH_LIMITS.minSeconds).max(GROWTH_LIMITS.maxSeconds).optional(),seed_scale:z.number().finite().min(GROWTH_LIMITS.minScale).max(GROWTH_LIMITS.maxScale).optional(),dispatch_s:z.number().finite().min(0).max(120).default(12)}).strict().superRefine((r,ctx)=>{
 if((r.recover!==undefined)!==(r.amount!==undefined))ctx.addIssue({code:'custom',message:'recovery needs both recover and amount',path:['recover']});
 if((r.kind!==undefined)===(r.kinds!==undefined))ctx.addIssue({code:'custom',message:'repair needs exactly one of kind or kinds',path:['kinds']});
 if(r.grounds && new Set([r.on,...r.grounds]).size!==r.grounds.length+1)ctx.addIssue({code:'custom',message:'repair grounds must be unique and exclude on',path:['grounds']});
 if(r.streets && new Set(r.streets).size!==r.streets.length)ctx.addIssue({code:'custom',message:'repair streets must be unique',path:['streets']});
 if(r.verge!==undefined && !r.streets)ctx.addIssue({code:'custom',message:'repair verge requires streets',path:['verge']});
 if(r.seed_scale!==undefined && r.regrow_s===undefined)ctx.addIssue({code:'custom',message:'seed_scale requires regrow_s',path:['seed_scale']});
 if(r.regrow_s!==undefined && (r.kind!=='tree' || r.kinds))ctx.addIssue({code:'custom',message:'regrow_s requires kind=tree',path:['regrow_s']});
 if(r.kinds && new Set(r.kinds).size!==r.kinds.length)ctx.addIssue({code:'custom',message:'repair kinds must be unique',path:['kinds']});
});
const visit=z.object({id:ref,work:ref,on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional()}).strict().superRefine((v,ctx)=>{if(v.grounds && new Set([v.on,...v.grounds]).size!==v.grounds.length+1)ctx.addIssue({code:'custom',message:'visit grounds must be unique and exclude on',path:['grounds']});});
const meal=z.object({id:ref,good:ref,markets:z.array(ref).min(1).max(COMMERCE_LIMITS.mealMarkets),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),eat_s:z.number().finite().min(1).max(12),seats:z.array(ref).min(1).max(4).optional()}).strict().superRefine((m,ctx)=>{
 if(m.seats && new Set(m.seats).size!==m.seats.length)ctx.addIssue({code:'custom',message:'meal seats must be unique furniture placement IDs',path:['seats']});
 if(new Set(m.markets).size!==m.markets.length)ctx.addIssue({code:"custom",message:"meal markets must be unique",path:["markets"]});
 if(m.grounds && new Set([m.on,...m.grounds]).size!==m.grounds.length+1)ctx.addIssue({code:"custom",message:"meal grounds must be unique and exclude on",path:["grounds"]});
});
const social=z.object({id:ref,peers:z.array(ref).min(1).max(4).optional(),good:ref,seats:z.array(ref).min(1).max(4),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),eat_s:z.number().finite().min(1).max(12),cooldown_s:z.number().finite().min(30).max(86400).default(600),max_fullness:z.number().finite().min(0).max(100).default(80),markets:z.array(ref).min(1).max(COMMERCE_LIMITS.mealMarkets).optional()}).strict().superRefine((m,ctx)=>{
 if(m.peers && (!m.markets || new Set(m.peers).size!==m.peers.length))ctx.addIssue({code:'custom',message:'social peers need unique account IDs and supply markets',path:['peers']});
 if(new Set(m.seats).size!==m.seats.length)ctx.addIssue({code:'custom',message:'social seats must be unique furniture placement IDs',path:['seats']});
 if(m.markets && new Set(m.markets).size!==m.markets.length)ctx.addIssue({code:'custom',message:'social markets must be unique',path:['markets']});
 if(m.grounds && new Set([m.on,...m.grounds]).size!==m.grounds.length+1)ctx.addIssue({code:'custom',message:'social grounds must be unique and exclude on',path:['grounds']});
});
const rest=z.object({id:ref,energy:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),recover_s:z.number().finite().min(.1).max(10),below:z.number().finite().min(0).max(95),until:z.number().finite().min(5).max(100),shelter:z.boolean().optional(),seats:z.array(ref).min(1).max(4),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional()}).strict().superRefine((r,ctx)=>{
 if(r.until<r.below+5)ctx.addIssue({code:'custom',message:'rest until must exceed below by at least 5',path:['until']});
 if(new Set(r.seats).size!==r.seats.length)ctx.addIssue({code:'custom',message:'rest seats must be unique furniture IDs',path:['seats']});
 if(new Set([r.on,...(r.grounds??[])]).size!==1+(r.grounds?.length??0))ctx.addIssue({code:'custom',message:'rest grounds must be unique and exclude on',path:['grounds']});
});
const ration=z.object({id:ref,good:ref,market:ref,below:z.number().finite().min(0).max(95)}).strict();
const milestone=z.object({id:ref,label,kind:z.enum(['work','delivery','repair','shared_meal']),task:ref,peer:ref.optional(),count:z.number().int().min(1).max(1e9)}).strict().superRefine((m,ctx)=>{
 if(m.peer && m.kind!=='shared_meal')ctx.addIssue({code:'custom',message:'peer is only valid for a shared_meal milestone',path:['peer']});
});
const shift=z.object({id:ref,market:ref,rest:z.object({x:z.number().finite().min(0).max(16384),y:z.number().finite().min(0).max(16384)}).strict(),on:ref,grounds:z.array(ref).min(1).max(COMMERCE_LIMITS.repairGrounds-1).optional(),lead_s:z.number().finite().min(0).max(120).default(15)}).strict().superRefine((s,ctx)=>{if(s.grounds && new Set([s.on,...s.grounds]).size!==s.grounds.length+1)ctx.addIssue({code:'custom',message:'shift grounds must be unique and exclude on',path:['grounds']});});
function ownServiceOperator(e:{markets:z.infer<typeof market>[];jobs:z.infer<typeof job>[]},a:z.infer<typeof account>){
 const business=e.markets.find(m=>m.actor===a.actor),jobs=accountJobs(a);
 return !!business?.on && !business.lots.length && jobs.length>0 && jobs.every(id=>e.jobs.some(j=>j.id===id && j.kind==='service' && j.market===business.id));
}
export const economySchema=z.object({visits:z.array(visit).min(1).max(8).optional(),gestures:z.array(workGestureSchema).min(1).max(WORK_GESTURE_LIMITS.gestures).optional(),stations:z.array(station).min(1).max(COMMERCE_LIMITS.stations).optional(),rests:z.array(rest).min(1).max(8).optional(),rations:z.array(ration).min(1).max(COMMERCE_LIMITS.rations).optional(),goods:z.array(good).max(COMMERCE_LIMITS.goods),accounts:z.array(account).min(1).max(COMMERCE_LIMITS.accounts),markets:z.array(market).min(1).max(COMMERCE_LIMITS.markets),jobs:z.array(job).max(COMMERCE_LIMITS.jobs),meals:z.array(meal).max(COMMERCE_LIMITS.meals).default([]),shifts:z.array(shift).max(COMMERCE_LIMITS.shifts).default([]),socials:z.array(social).max(COMMERCE_LIMITS.socials).default([]),milestones:z.array(milestone).max(COMMERCE_LIMITS.milestones).default([]),deliveries:z.array(delivery).max(COMMERCE_LIMITS.deliveries).default([]),repairs:z.array(repair).max(COMMERCE_LIMITS.repairs).default([])}).strict().superRefine((e,ctx)=>{
 const issue=(message:string,path:(string|number)[])=>ctx.addIssue({code:'custom',message,path});
 if(!e.goods.length && !e.jobs.some(j=>j.kind==='service'))issue('goods-free economy needs service work',['goods']);
 if(e.visits && new Set(e.visits.map(v=>v.id)).size!==e.visits.length)issue('duplicate visit ID',['visits']);
 e.visits?.forEach((v,i)=>{if(!e.jobs.some(j=>j.id===v.work && j.fee!==undefined))issue('visit work must be a paid service',['visits',i,'work']);});
 for(const name of ['goods','accounts','markets','jobs','deliveries','repairs','milestones','meals','shifts','socials'] as const)if(new Set(e[name].map(v=>v.id)).size!==e[name].length)issue(`duplicate ${name} ID`,[name]);
 if(e.gestures && new Set(e.gestures.map(g=>g.id)).size!==e.gestures.length)issue('duplicate gesture ID',['gestures']);
 for(const [group,items] of [['jobs',e.jobs],['repairs',e.repairs]] as const)items.forEach((item,i)=>{if(item.gesture && (!e.gestures?.some(g=>g.id===item.gesture) || group==='jobs' && !('station' in item && item.station)))issue('work gesture needs an existing program and station-bound work or a repair',[''+group,i,'gesture']);});
 if(e.stations && new Set(e.stations.map(s=>s.id)).size!==e.stations.length)issue('duplicate station ID',['stations']);
 e.accounts.forEach((a,i)=>{if(a.company && !(a.actor==='player' ? e.accounts.some(p=>p.social) : a.social || e.accounts.some(host=>e.socials.find(p=>p.id===host.social)?.peers?.includes(a.id))))issue('company needs an existing player social host or a participating NPC social plan',['accounts',i,'company']);});
 e.jobs.forEach((j,i)=>{if(j.station && (!e.stations?.some(s=>s.id===j.station && j.equipment?.includes(s.object)) || j.capacity!==1))issue('station work needs an existing station object in equipment and capacity=1',['jobs',i,'station']);});
 if(new Set(e.accounts.flatMap(a=>a.shift ? [a.shift] : [])).size!==e.accounts.filter(a=>a.shift).length)issue('one account per shift plan',['accounts']);
 e.shifts.forEach((s,i)=>{if(!e.markets.some(m=>m.id===s.market && m.hours))issue('shift needs a market with daily hours',['shifts',i,'market']);});
 if(new Set(e.accounts.map(a=>a.actor)).size!==e.accounts.length)issue('one account per actor',['accounts']);
 if(e.accounts.filter(a=>a.actor==='player').length!==1)issue('economy requires one player account',['accounts']);
 if(new Set(e.markets.map(m=>m.actor)).size!==e.markets.length)issue('one market per actor',['markets']);
 e.markets.forEach((m,i)=>{
  if(!m.lots.length && !e.jobs.some(j=>j.market===m.id && j.kind==='service'))issue('empty business needs a physical service task',['markets',i,'lots']);
  if(m.on && (m.lots.length || e.jobs.some(j=>j.market===m.id && j.kind!=='service')))issue('business on requires goods-free service work',['markets',i,'on']);
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
  if(j.kind!=='service' && (!output || j.make!>output.limit || j.target>output.limit))issue('work output and target must fit an existing market lot',['jobs',i,'output']);
  if(j.kind!=='service' && jobTake(j,j.output!)>0 && j.make!<=jobTake(j,j.output!))issue('same-good work must make more than it takes',['jobs',i,'make']);
 });
 e.milestones.forEach((m,i)=>{const tasks=m.kind==='work' ? e.jobs : m.kind==='delivery' ? e.deliveries : m.kind==='repair' ? e.repairs : e.accounts.filter(a=>a.actor!=='player' && a.social);if(!tasks.some(t=>t.id===m.task))issue(m.kind==='shared_meal' ? 'shared meal milestone needs an existing NPC social account' : 'milestone needs an existing task of its kind',['milestones',i,'task']);});
 e.milestones.forEach((m,i)=>{if(m.peer){const host=e.accounts.find(a=>a.id===m.task),plan=e.socials.find(s=>s.id===host?.social);if(m.peer===m.task || !e.accounts.some(a=>a.id===m.peer && a.actor!=='player') || !plan?.peers?.includes(m.peer))issue('peer must name another NPC account in the host social plan peers',['milestones',i,'peer']);}});
 e.jobs.forEach((j,i)=>{
  const field=j.requires_any ? 'requires_any' : 'requires';
  for(const id of jobRequirements(j))if(!e.milestones.some(m=>m.id===id))issue(`unknown work milestone ${id}`,['jobs',i,field]);
  const visiting=new Set<string>(),done=new Set<string>();
  const cyclic=(next:typeof j):boolean=>{if(visiting.has(next.id))return true;if(done.has(next.id))return false;visiting.add(next.id);
   for(const id of jobRequirements(next)){const m=e.milestones.find(m=>m.id===id),parent=m?.kind==='work' && e.jobs.find(j=>j.id===m.task);if(parent && cyclic(parent))return true;}
   visiting.delete(next.id);done.add(next.id);return false;
  };
  if(cyclic(j))issue('work milestone requirements must not form a cycle',['jobs',i,field]);
 });
 e.repairs.forEach((r,i)=>{const market=e.markets.find(m=>m.id===r.market),lot=market?.lots.find(l=>l.good===r.input);if(!lot || lot.limit<r.take)issue('repair input must fit an existing market lot',['repairs',i,'input']);if(r.recover && !market?.lots.some(l=>l.good===r.recover && l.limit>=r.amount!))issue('recovery must fit an existing market lot',['repairs',i,'recover']);});
 e.meals.forEach((m,i)=>{
  if(!e.goods.some(g=>g.id===m.good && g.food>0))issue("meal good must be food",["meals",i,"good"]);
  for(const id of m.markets)if(!e.markets.some(v=>v.id===id && v.lots.some(l=>l.good===m.good && l.price)))issue("meal markets need a priced lot for this food",["meals",i,"markets"]);
 });
 e.socials.forEach((m,i)=>{for(const peer of m.peers??[])if(!e.accounts.some(a=>a.id===peer && a.actor!=='player' && a.social!==m.id))issue('social peers need another existing NPC account',['socials',i,'peers']);if(!e.goods.some(g=>g.id===m.good && g.food>0))issue('social good must be food',['socials',i,'good']);
  for(const id of m.markets??[])if(!e.markets.some(v=>v.id===id && v.lots.some(l=>l.good===m.good && l.price)))issue('social markets need a priced lot for this food',['socials',i,'markets']);
 });
 if(e.rations && new Set(e.rations.map(r=>r.id)).size!==e.rations.length)issue('duplicate rations ID',['rations']);
 e.rations?.forEach((r,i)=>{if(!e.goods.some(g=>g.id===r.good && g.food>0))issue('ration good must be food',['rations',i,'good']);if(!e.markets.some(m=>m.id===r.market && m.lots.some(l=>l.good===r.good && l.price)))issue('ration needs a priced food lot',['rations',i,'market']);});
 if(e.rests && new Set(e.rests.map(r=>r.id)).size!==e.rests.length)issue('duplicate rest ID',['rests']);
 e.accounts.forEach((a,i)=>{
  if(a.visit && (a.actor==='player' || !e.visits?.some(v=>v.id===a.visit) || a.shop || a.ration || a.shift || a.social || accountRepairs(a).length || a.deliveries || !a.commute && accountJobs(a).length || e.markets.some(m=>m.actor===a.actor)))issue('visit needs an existing plan and non-vendor NPC without competing duties; meal, rest and commuting may coexist',['accounts',i,'visit']);
  const fixedVendor=e.markets.some(m=>m.actor===a.actor) && !ownServiceOperator(e,a);
  if(a.rest && (!(e.rests??[]).some(r=>r.id===a.rest) || a.actor!=='player' && (a.shop || a.ration || a.shift || a.social || accountRepairs(a).length || a.deliveries || fixedVendor)))issue('rest needs an existing plan and player, non-vendor or own-service operator without competing automatic policies',['accounts',i,'rest']);
  if(a.commute && (!a.on || a.actor==='player' || !accountJobs(a).length || a.shop || a.ration || a.shift || a.social || accountRepairs(a).length || a.deliveries || fixedVendor))issue('commute needs work, on and a non-vendor or own-service operator without competing automatic policies',['accounts',i,'commute']);
  if(a.attendance && (!a.commute || new Set(accountJobs(a).map(id=>e.jobs.find(j=>j.id===id)?.market)).size!==1))issue('attendance requires commute=true and jobs at one workplace',['accounts',i,'attendance']);
  if(!a.commute && (a.on || a.grounds))issue('account on/grounds requires commute=true',['accounts',i,'on']);
  if(a.grounds && new Set([a.on,...a.grounds]).size!==a.grounds.length+1)issue('commute grounds must be unique and exclude on',['accounts',i,'grounds']);
  if(a.ration && (a.actor==='player' || !e.rations?.some(r=>r.id===a.ration) || a.meal || a.social || a.shift || accountJobs(a).length || !accountRepairs(a).length && !a.deliveries))issue('ration needs an existing plan and an NPC repair or delivery account without other routines',['accounts',i,'ration']);
  if(a.social && (a.actor==='player' || !e.socials.some(m=>m.id===a.social)))issue('social needs an existing plan and an NPC account',['accounts',i,'social']);
  if(a.social && e.socials.find(s=>s.id===a.social)?.markets && a.capacity<2)issue('social hosts need room for two portions',['accounts',i,'capacity']);
  if(a.shift && (!e.shifts.some(s=>s.id===a.shift) || a.actor==='player' || a.meal || accountRepairs(a).length || a.deliveries))issue('shift needs an existing plan and an NPC staff account without meal, repair or delivery policies',['accounts',i,'shift']);
  if(a.shift){const plan=e.shifts.find(s=>s.id===a.shift);if(plan && (accountJobs(a).some(id=>e.jobs.find(j=>j.id===id)?.market!==plan.market) || e.markets.some(m=>m.actor===a.actor && m.id!==plan.market)))issue('shift work and operated counter must use its market',['accounts',i,'shift']);}
  if(a.meal && (!e.meals.some(m=>m.id===a.meal) || a.shop || !a.commute && accountJobs(a).length>0 || accountRepairs(a).length || a.deliveries))issue("meal needs an existing plan and excludes other automatic economy policies",["accounts",i,"meal"]);
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
export const jobRequirements=(job:Pick<Job,'requires'|'requires_any'>)=>job.requires_any??(job.requires ? [job.requires] : []);
export const jobInputs=(job:Pick<Job,'input'|'take'|'ingredients'>)=>job.ingredients??(job.input!==undefined && job.take!==undefined ? [{good:job.input,take:job.take}] : []);
export const jobMakes=(job:Pick<Job,'output'|'make'>,good:string)=>job.output===good ? job.make??0 : 0;
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
export interface RepairCoverage {targets:RepairTarget[];access:Scene['surfaces'][number]['points'][]}
const coverageCache=new WeakMap<Scene,Map<string,RepairCoverage>>();
const priorCoverage=new WeakSet<Scene>();
/** Registered save projections retain the released access geometry, never an authored or saved field. */
export function inheritPriorRepairCoverage(scene:Scene,from?:Scene){
 if(from && !priorCoverage.has(from) || priorCoverage.has(scene))return;
 if(coverageCache.has(scene))throw Error('Prior repair coverage must be selected before preparing work areas');
 priorCoverage.add(scene);
}
/** Short work approaches extend named sidewalks only near declared category contacts. */
export function repairCoverage(scene:Scene,r:Repair){
 let entries=coverageCache.get(scene);if(!entries){entries=new Map();coverageCache.set(scene,entries);}const cached=entries.get(r.id);if(cached)return cached;
 const grounds=repairGrounds(r).flatMap(id=>workGround(scene,id)?.points ? [workGround(scene,id)!.points] : []),selected=scene.streets.filter(s=>r.streets?.includes(s.id)),road=roadFootprint(scene),riding=streetFootprints(scene).riding;
 const sidewalks=r.streets ? unionPolygons(streetPolygons(selected,'reserved'),[...riding,...road]) : [],verge=r.verge??24;
 const verges=r.streets ? streetPolygons(selected.map(s=>({...s,sidewalk:s.sidewalk+verge})),'reserved') : [];
 const targets:RepairTarget[]=[],streetTargets:RepairTarget[]=[];
 for(const o of scene.objects){if(o.floor && !repairGrounds(r).includes(o.floor))continue;if(!o.spec || !('measure' in o.spec) || !o.spec.measure || !repairKinds(r).includes(o.spec.measure.kind))continue;
  const whole=['break','topple'].includes(impactOf(o.spec)?.kind??''),zones=zonesOf(o.spec);if(!whole && !zones.length)continue;
  const contacts=objectContacts(scene,o),local=grounds.some(p=>onPolygon(p,o.x,o.y));
  const candidates=[...(whole ? [{objectId:o.id,contact:contacts[0]!}] : []),...zones.map(z=>({objectId:o.id,zoneId:z.id,contact:contacts.find(c=>c.zoneId===z.id)!})).filter(t=>t.contact.bottom<=drivingHeight(scene.terrain,t.contact.x,t.contact.y)+18)];
  for(const t of candidates){const c=t.contact,street=sidewalks.some(p=>onPolygon(p,c.x,c.y) || distanceToPolygon(c.x,c.y,p)<=verge);if(local || street)targets.push(t);if(street)streetTargets.push(t);}
 }
 if(streetTargets.length>COMMERCE_LIMITS.repairStreetTargets)throw Error(`${r.id}: repair exceeds 512 street targets; split service districts`);
 // Include body clearance where verge approaches join the pavement.
 const boxes=streetTargets.map(t=>{const c=t.contact,reach=c.r+12+COMMERCE_LIMITS.repairRadius,radius=priorCoverage.has(scene) ? reach : Math.max(reach,verge+COMMERCE_LIMITS.repairRadius*2);return rectPolygon({x0:Math.max(0,c.x-radius),y0:Math.max(0,c.y-radius),x1:Math.min(scene.canonical.width,c.x+radius),y1:Math.min(scene.canonical.height,c.y+radius)});});
 const access=r.streets ? unionPolygons(intersectPolygons(verges,boxes),[...riding,...road,...(scene.terrain.landscape?.waters??[]).flatMap(w=>triangulatePolygon(w.polygon))]) : [];
 if(access.length>COMMERCE_LIMITS.repairAccessPieces)throw Error(`${r.id}: repair exceeds 2048 verge access pieces; split service districts`);
 const result={targets,access};entries.set(r.id,result);return result;
}
export const repairTargets=(scene:Scene,r:Repair)=>repairCoverage(scene,r).targets;

/** Internal worker data only; validate the complete packet before replacing any cached coverage. */
export function primeRepairCoverage(scene:Scene,prepared:Map<string,RepairCoverage>):void{
 const definitions=scene.economy?.repairs.filter(r=>r.grounds || r.streets)??[],bad=()=>{throw Error('Invalid prepared repair coverage');};
 if(prepared.size!==definitions.length || definitions.some(r=>!prepared.has(r.id)))bad();
 const objectOrder=new Map(scene.objects.map((o,i)=>[o.id,i])),objects=sceneContacts(scene).objects,contacts=new Map<string,Map<string|undefined,Contact>>();
 for(const c of sceneContacts(scene).contacts)if(c.id){let zones=contacts.get(c.id);if(!zones){zones=new Map();contacts.set(c.id,zones);}if(!zones.has(c.zoneId))zones.set(c.zoneId,c);}
 for(const r of definitions){
  const value=prepared.get(r.id)!;if(!value || !Array.isArray(value.targets) || !value.targets.length || value.targets.length>scene.objects.length*33 || !Array.isArray(value.access) || value.access.length>COMMERCE_LIMITS.repairAccessPieces)bad();
  let previousObject=-1,previousZone=-2;
  for(const t of value.targets){
   const object=t && objects.get(t.objectId),index=t && objectOrder.get(t.objectId),spec=object?.spec;
   if(!object || index===undefined || !spec || !('measure' in spec) || !spec.measure || !repairKinds(r).includes(spec.measure.kind))bad();
   const zones=zonesOf(spec),zone=t.zoneId===undefined ? -1 : zones.findIndex(z=>z.id===t.zoneId);
   if(t.zoneId===undefined ? !['break','topple'].includes(impactOf(spec)?.kind??'') : zone<0)bad();
   if(index!<previousObject || index===previousObject && zone<=previousZone)bad();previousObject=index!;previousZone=zone;
   const reference=contacts.get(t.objectId)?.get(t.zoneId)??objectContacts(scene,object!).find(c=>c.zoneId===t.zoneId);
   if(!t.contact || ![t.contact.x,t.contact.y,t.contact.r,t.contact.top].every(Number.isFinite) || !(Number.isFinite(t.contact.bottom) || t.contact.bottom===-Infinity) || !reference || JSON.stringify(reference)!==JSON.stringify(t.contact))bad();
  }
  if(value.access.some(p=>!Array.isArray(p) || p.length<3 || p.some(v=>!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x<0 || v.y<0 || v.x>scene.canonical.width || v.y>scene.canonical.height) || Math.abs(polygonArea(p))<1e-8))bad();
 }
 const next=new Map(coverageCache.get(scene));for(const [id,value] of prepared)next.set(id,value);coverageCache.set(scene,next);
}

/** Linked actor ownership is checked after modules/furnishings have been combined. */
export function economyProblems(scene:Scene):string[]{
 const e=scene.economy;const guarded=scene.behaviors.flatMap(b=>b.states.flatMap(s=>s.transitions.filter(t=>t.requires).map(t=>({b,t}))));
 if(!e)return [...guarded.map(({b,t})=>`${b.id}/${t.id}: requires needs an economy milestone`),...scene.behaviors.flatMap(b=>b.states.flatMap(s=>s.transitions.filter(t=>t.shared_meals!==undefined).map(t=>`${b.id}/${t.id}: shared_meals needs an economy social account`)))];
 const stationary=(id:string)=>{const o=scene.objects.find(o=>o.id===id);return o && roleOf(o)==='npc' && !o.route && !o.ambient && !scene.behaviors.find(b=>b.id===o.behavior)?.states.some(s=>s.action==='patrol');};
 const problems:string[]=[];
 for(const m of e.markets)if(m.on){const o=scene.objects.find(o=>o.id===m.on),spec=o?.spec;if(!o || roleOf(o)!=='prop' || o.route || o.ambient || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || !spec.interior || spec.body.interaction!=='solid')problems.push(`${m.id}: business on needs an existing static enterable building`);}
 for(const j of e.jobs)for(const id of j.equipment??[]){
  const o=scene.objects.find(o=>o.id===id),m=e.markets.find(m=>m.id===j.market)!,vendor=scene.objects.find(o=>o.id===(m.on??m.actor)),spec=o?.spec;
  if(!o || roleOf(o)!=='prop' || o.route || o.ambient || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.body.interaction!=='solid' || spec.rideable)problems.push(`${j.id}: equipment '${id}' needs a static solid prop placement`);
  else if(vendor && Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${j.id}: equipment '${id}' must be within its market reach`);
 }

 for(const a of e.accounts.filter(a=>!a.commute)){const stations=accountJobs(a).flatMap(id=>{const station=e.stations?.find(s=>s.id===e.jobs.find(j=>j.id===id)?.station);return station ? [station] : [];});if(new Set(stations.map(s=>JSON.stringify([s.on,...(s.grounds??[])]))).size>1)problems.push(`${a.id}: stationary work stations must share ordered work grounds`);}
 if(e.repairs.some(r=>r.dry) && !scene.weather)problems.push('dry repair policy requires world weather');
 if((e.markets.some(m=>m.hours) || e.accounts.some(a=>a.attendance)) && !scene.daylight)problems.push('market hours require a world daylight clock');
 for(const a of e.accounts)if(a.ration){const r=e.rations?.find(r=>r.id===a.ration),o=scene.objects.find(o=>o.id===a.actor),m=e.markets.find(m=>m.id===r?.market),vendor=scene.objects.find(o=>o.id===m?.actor);
  if(!stationary(a.actor) || !o || !vendor || !m || Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius || !standingSightClear(sceneContacts(scene).contacts,{...o,elevation:walkingHeight(scene,o.x,o.y)}, {...vendor,elevation:walkingHeight(scene,vendor.x,vendor.y)},c=>c.id===vendor.id))problems.push(`${a.id}: ration supply needs a stationary worker home within clear counter reach`);
 }
 for(const a of e.accounts)if(a.shift){
  const plan=e.shifts.find(s=>s.id===a.shift),o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec,m=e.markets.find(m=>m.id===plan?.market),vendor=scene.objects.find(o=>o.id===m?.actor);
  if(!stationary(a.actor) || !o?.behavior || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.measure?.kind!=='person' || spec.body.interaction!=='decor' || spec.body.colliderRadius*(o.scale??1)>8 || (spec.body.colliderHeight??18)*(o.scale??1)>32)problems.push(`${a.id}: shift staff need a stationary person NPC program and a decor body within 8 radius and 32 height; paths use the actual body`);
  if(plan && o && Math.hypot(o.x-plan.rest.x,o.y-plan.rest.y)<16)problems.push(`${a.id}: shift rest point must be at least 16 units from work`);
  if(o && m && vendor && Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${a.id}: shift work placement must be within its counter reach`);
 }
 for(const a of e.accounts)if(a.social || e.socials.some(s=>s.peers?.includes(a.id))){const o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec;
  if((a.social ? !stationary(a.actor) : !stationary(a.actor) && !(o?.role==='npc' && !o.ambient && o.route && scene.routes.find(r=>r.id===o.route!.id)?.kind==='walk')) || !o?.behavior || !spec || !('dslVersion' in spec) || spec.dslVersion!==2 || spec.measure?.kind!=='person' || spec.body.interaction!=='decor' || spec.body.colliderRadius*(o.scale??1)>8 || (spec.body.colliderHeight??18)*(o.scale??1)>32 || !HUMANOID_BONES.every(b=>spec.joints?.some(j=>j.bone===b)))problems.push(`${a.id}: social hosts need stationary complete humanoids; peers may use accepted walk routes, with decor bodies within 8 radius and 32 height`);
  const plan=e.socials.find(s=>s.id===a.social);
  if(plan?.markets && o && !plan.markets.some(id=>{const m=e.markets.find(m=>m.id===id)!,vendor=scene.objects.find(v=>v.id===m.actor);return vendor && Math.hypot(o.x-vendor.x,o.y-vendor.y)<=m.radius;}))problems.push(`${a.id}: social hosts need a supply counter within reach of their work placement; hosting does not add a shopping journey`);
 }
 for(const b of scene.behaviors)for(const s of b.states)for(const t of s.transitions)if(t.shared_meals!==undefined && scene.objects.some(o=>o.behavior===b.id && !e.accounts.some(a=>a.actor===o.id && a.social)))problems.push(`${b.id}/${t.id}: shared_meals requires social capability on every using NPC account`);
 for(const m of e.socials)for(const id of m.seats)if(worldSeats(scene).filter(s=>s.objectId===id).length<2)problems.push(`${m.id}: social seats require furniture with at least two slots`);
 for(const s of e.shifts){
  const m=e.markets.find(m=>m.id===s.market);if(m?.hours && scene.daylight){const [start,end]=m.hours,open=end>start ? end-start : 24-start+end,closed=(24-open)/24*scene.daylight.cycleSeconds;if(s.lead_s>=closed)problems.push(`${s.id}: lead_s must be shorter than the market's closed interval`);}
  let samples=0;for(const id of [s.on,...(s.grounds??[])]){const ground=workGround(scene,id);if(!ground){problems.push(`${s.id}: unknown shift ground ${id}`);continue;}const p=ground.points,turns=p.map((a,i)=>{const b=p[(i+1)%p.length]!,c=p[(i+2)%p.length]!;return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${s.id}: shift grounds must be convex`);const b=polygonBounds(p);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${s.id}: shift grounds exceed 4096 local navigation samples`);
 }
 for(const {b,t} of guarded){
  const m=e.milestones.find(m=>m.id===t.requires);if(!m){problems.push(`${b.id}/${t.id}: unknown conversation milestone ${t.requires}`);continue;}
  if(m.peer){problems.push(`${b.id}/${t.id}: player conversation cannot require an NPC peer milestone`);continue;}
  const market=m.kind==='work' ? e.jobs.find(j=>j.id===m.task)?.market : m.kind==='delivery' ? e.deliveries.find(d=>d.id===m.task)?.to : e.repairs.find(r=>r.id===m.task)?.market;
  const actor=m.kind==='shared_meal' ? e.accounts.find(a=>a.id===m.task)?.actor : e.markets.find(m=>m.id===market)?.actor;
  if(scene.objects.some(o=>o.behavior===b.id && o.id!==actor))problems.push(`${b.id}/${t.id}: conversation milestones must belong to this task's receiving market actor`);
 }
 for(const a of e.accounts){const o=scene.objects.find(o=>o.id===a.actor);if(a.actor!=='player' && (!o || roleOf(o)!=='npc'))problems.push(`${a.id}: account actor must be player or an NPC placement`);if(accountJobs(a).length && !a.commute && !stationary(a.actor))problems.push(`${a.id}: automatic workers must be stationary NPCs`);}
 for(const a of e.accounts)if(a.visit || a.commute || a.rest && a.actor!=='player' || a.actor!=='player' && accountJobs(a).some(id=>e.jobs.find(j=>j.id===id)?.station) || a.actor!=='player' && accountRepairs(a).some(id=>e.repairs.find(r=>r.id===id)?.gesture)){const o=scene.objects.find(o=>o.id===a.actor),s=o?.spec;
  if(!o?.behavior || o.ambient || !s || !('dslVersion' in s) || s.dslVersion!==2 || s.measure?.kind!=='person' || s.body.interaction!=='decor' || s.body.colliderRadius*o.scale>8 || (s.body.colliderHeight??18)*o.scale>32 || !HUMANOID_BONES.every(b=>s.joints?.some(j=>j.bone===b)) || o.route && scene.routes.find(r=>r.id===o.route!.id)?.kind!=='walk')problems.push(`${a.id}: ${a.rest ? 'rest' : 'commute'} needs a complete person NPC program, decor body within 8 radius/32 height and a walk route or stationary home`);
 }
 for(const a of e.accounts)if(a.meal){const o=scene.objects.find(o=>o.id===a.actor);if(!o?.behavior || o.ambient || !o.spec || !('dslVersion' in o.spec) || o.spec.dslVersion!==2 || o.spec.measure?.kind!=='person' || o.spec.body.interaction!=='decor' || e.markets.some(m=>m.actor===a.actor) && !ownServiceOperator(e,a) || o.route && scene.routes.find(r=>r.id===o.route!.id)?.kind!=='walk')problems.push(`${a.id}: meal trips need a person NPC program and a stationary home or walk route; only own-service operators may leave a market`);}
 for(const a of e.accounts)if(a.meal && e.meals.find(m=>m.id===a.meal)?.seats){const o=scene.objects.find(o=>o.id===a.actor),spec=o?.spec;if(!spec || !('joints' in spec) || !HUMANOID_BONES.every(b=>spec.joints?.some(j=>j.bone===b)))problems.push(`${a.id}: seated meals require a complete humanoid rig`);}
 for(const m of [...(e.visits??[]),...(e.stations??[]),...e.meals,...e.socials,...(e.rests??[]),...e.accounts.filter(a=>a.commute).map(a=>({id:a.id,on:a.on!,grounds:a.grounds}))]){let samples=0;for(const id of [m.on,...(m.grounds??[])]){const ground=workGround(scene,id);if(!ground){problems.push(`${m.id}: unknown activity ground ${id}`);continue;}const p=ground.points,turns=p.map((a,i)=>{const b=p[(i+1)%p.length]!,c=p[(i+2)%p.length]!;return Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${m.id}: activity grounds must be convex`);const b=polygonBounds(p);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${m.id}: activity grounds exceed 4096 local navigation samples`);}
 for(const m of [...e.meals,...(e.rests??[])])for(const id of m.seats??[])if(!worldSeats(scene).some(s=>s.objectId===id))problems.push(`${m.id}: unknown seat furniture ${id}`);
 for(const m of e.markets)if(!stationary(m.actor))problems.push(`${m.id}: market requires a stationary NPC placement`);
 for(const m of e.markets){const o=scene.objects.find(o=>o.id===(m.on??m.actor));if(o && waterAt(scene.terrain,o.x,o.y,m.on ? walkingHeight(scene,o.x,o.y) : drivingHeight(scene.terrain,o.x,o.y)))problems.push(`${m.id}: market requires dry ground or a supported deck`);}
 for(const d of e.deliveries){const from=e.markets.find(m=>m.id===d.from),to=e.markets.find(m=>m.id===d.to),a=scene.objects.find(o=>o.id===from?.actor),b=scene.objects.find(o=>o.id===to?.actor);if(from && to && a && b && Math.hypot(a.x-b.x,a.y-b.y)<=from.radius+to.radius)problems.push(`${d.id}: delivery markets must have separate interaction areas`);}
 for(const d of e.deliveries)if(d.on){
  const ids=[d.on,...(d.grounds??[])];let samples=0;
  for(const id of ids){const ground=workGround(scene,id);if(!ground){problems.push(`${d.id}: unknown delivery ground ${id}`);continue;}const points=ground.points,turns=points.map((p,i)=>{const q=points[(i+1)%points.length]!,r=points[(i+2)%points.length]!;return Math.sign((q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x));}).filter(Boolean);if(new Set(turns).size>1)problems.push(`${d.id}: delivery grounds must be convex`);const b=polygonBounds(points);samples+=(Math.ceil((b.x1-b.x0)/12)+1)*(Math.ceil((b.y1-b.y0)/12)+1);}
  if(samples>COMMERCE_LIMITS.repairNodes)problems.push(`${d.id}: delivery grounds exceed 4096 local navigation samples`);
 }
 for(const a of e.accounts)if(a.deliveries?.length && (!stationary(a.actor) || e.markets.some(m=>m.actor===a.actor)))problems.push(`${a.id}: courier needs a stationary non-vendor home; complete-world validation checks its connected pickup, handoff and return paths`);
 for(const a of e.accounts.filter(a=>!a.commute))for(const id of accountJobs(a)){const j=e.jobs.find(j=>j.id===id),m=e.markets.find(m=>m.id===j?.market),worker=scene.objects.find(o=>o.id===a.actor),vendor=scene.objects.find(o=>o.id===(m?.on??m?.actor));if(m && worker && vendor && Math.hypot(worker.x-vendor.x,worker.y-vendor.y)>m.radius)problems.push(`${a.id}: worker is outside its market's reach`);}
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
 if(recoverySourceIds(scene).size>COMMERCE_LIMITS.recoverySources)problems.push('recovery exceeds 512 growing sources');
 for(const a of e.accounts)for(const id of accountRepairs(a)){const r=e.repairs.find(r=>r.id===id),area=workGround(scene,r?.on),o=scene.objects.find(o=>o.id===a.actor),m=e.markets.find(m=>m.id===r?.market),vendor=scene.objects.find(o=>o.id===m?.actor);if(!stationary(a.actor) || e.markets.some(m=>m.actor===a.actor) || !area || !o || !onPolygon(area.points,o.x,o.y) || !m || !vendor || Math.hypot(o.x-vendor.x,o.y-vendor.y)>m.radius)problems.push(`${a.id}: repair worker needs a stationary home inside its service area and supply-market reach; a market owner cannot leave for repairs`);}
 return problems;
}

const recoverySources=new WeakMap<Scene,Set<string>>();
/** Growth completion, rather than elapsed wall time, renews these physical sources. */
export function recoverySourceIds(scene:Scene):Set<string>{let ids=recoverySources.get(scene);if(!ids){ids=new Set(scene.economy?.repairs.filter(r=>r.recover && r.regrow_s!==undefined).flatMap(r=>repairTargets(scene,r).map(t=>t.objectId)));recoverySources.set(scene,ids);}return ids;}
