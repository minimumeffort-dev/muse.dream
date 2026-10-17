import {z} from 'zod';
import type {Scene} from './schema';
import {roleOf} from './agents';
import {waterAt,drivingHeight} from './terrain';

export const COMMERCE_LIMITS=Object.freeze({goods:8,accounts:16,markets:8,jobs:16,deliveries:16,money:1_000_000,quantity:10_000,capacity:32,decisionS:.25});
const ref=z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),money=z.number().int().min(0).max(COMMERCE_LIMITS.money),quantity=z.number().int().min(0).max(COMMERCE_LIMITS.quantity);
const label=z.string().min(1).max(40).refine(s=>s.trim().length>0,'label must contain text');
const good=z.object({id:ref,label,food:z.number().finite().min(0).max(100).default(0)}).strict();
const account=z.object({id:ref,actor:ref,credits:money,capacity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),satiety:z.number().finite().min(0).max(100),drainPerS:z.number().finite().min(0).max(.25),shop:z.boolean().default(false),work:ref.optional()}).strict();
const lot=z.object({id:ref,good:ref,quantity,limit:quantity.refine(n=>n>0),price:z.number().int().min(1).max(10_000).optional()}).strict();
const market=z.object({id:ref,label,actor:ref,credits:money,radius:z.number().finite().min(20).max(80),lots:z.array(lot).min(1).max(COMMERCE_LIMITS.goods)}).strict();
const job=z.object({id:ref,label,market:ref,input:ref,take:quantity.refine(n=>n>0),output:ref,make:quantity.refine(n=>n>0),seconds:z.number().finite().min(1).max(120),pay:money.refine(n=>n>0),effort:z.number().finite().min(1).max(50),capacity:z.number().int().min(1).max(4),target:quantity}).strict();
const delivery=z.object({id:ref,label,from:ref,to:ref,good:ref,quantity:z.number().int().min(1).max(COMMERCE_LIMITS.capacity),pay:money.refine(n=>n>0),capacity:z.number().int().min(1).max(4)}).strict();
export const economySchema=z.object({goods:z.array(good).min(1).max(COMMERCE_LIMITS.goods),accounts:z.array(account).min(1).max(COMMERCE_LIMITS.accounts),markets:z.array(market).min(1).max(COMMERCE_LIMITS.markets),jobs:z.array(job).max(COMMERCE_LIMITS.jobs),deliveries:z.array(delivery).max(COMMERCE_LIMITS.deliveries).default([])}).strict().superRefine((e,ctx)=>{
 const issue=(message:string,path:(string|number)[])=>ctx.addIssue({code:'custom',message,path});
 for(const name of ['goods','accounts','markets','jobs','deliveries'] as const)if(new Set(e[name].map(v=>v.id)).size!==e[name].length)issue(`duplicate ${name} ID`,[name]);
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
 });
 e.jobs.forEach((j,i)=>{
  const m=e.markets.find(m=>m.id===j.market),input=m?.lots.find(l=>l.good===j.input),output=m?.lots.find(l=>l.good===j.output);
  if(!m)issue('unknown work market',['jobs',i,'market']);
  if(!input || j.take>input.limit)issue('work input must fit an existing market lot',['jobs',i,'input']);
  if(!output || j.make>output.limit || j.target>output.limit)issue('work output and target must fit an existing market lot',['jobs',i,'output']);
  if(j.input===j.output)issue('work needs different input and output goods',['jobs',i,'output']);
 });
 e.accounts.forEach((a,i)=>{
  if(a.actor==='player' && (a.shop || a.work))issue('the player acts through controls, not automatic policies',['accounts',i]);
  if(a.work && !e.jobs.some(j=>j.id===a.work))issue('unknown account work',['accounts',i,'work']);
 });
});
export type Economy=z.infer<typeof economySchema>;
export type Market=Economy['markets'][number];
export type Job=Economy['jobs'][number];

/** Linked actor ownership is checked after modules/furnishings have been combined. */
export function economyProblems(scene:Pick<Scene,'economy'|'objects'|'behaviors'|'terrain'>):string[]{
 const e=scene.economy;if(!e)return [];
 const stationary=(id:string)=>{const o=scene.objects.find(o=>o.id===id);return o && roleOf(o)==='npc' && !o.route && !o.ambient && !scene.behaviors.find(b=>b.id===o.behavior)?.states.some(s=>s.action==='patrol');};
 const problems:string[]=[];
 for(const a of e.accounts){const o=scene.objects.find(o=>o.id===a.actor);if(a.actor!=='player' && (!o || roleOf(o)!=='npc'))problems.push(`${a.id}: account actor must be player or an NPC placement`);if(a.work && !stationary(a.actor))problems.push(`${a.id}: automatic workers must be stationary NPCs`);}
 for(const m of e.markets)if(!stationary(m.actor))problems.push(`${m.id}: market requires a stationary NPC placement`);
 for(const m of e.markets){const o=scene.objects.find(o=>o.id===m.actor);if(o && waterAt(scene.terrain,o.x,o.y,drivingHeight(scene.terrain,o.x,o.y)))problems.push(`${m.id}: market requires dry ground or a supported deck`);}
 for(const d of e.deliveries){const from=e.markets.find(m=>m.id===d.from),to=e.markets.find(m=>m.id===d.to),a=scene.objects.find(o=>o.id===from?.actor),b=scene.objects.find(o=>o.id===to?.actor);if(from && to && a && b && Math.hypot(a.x-b.x,a.y-b.y)<=from.radius+to.radius)problems.push(`${d.id}: delivery markets must have separate interaction areas`);}
 for(const a of e.accounts)if(a.work){const j=e.jobs.find(j=>j.id===a.work),m=e.markets.find(m=>m.id===j?.market),worker=scene.objects.find(o=>o.id===a.actor),vendor=scene.objects.find(o=>o.id===m?.actor);if(m && worker && vendor && Math.hypot(worker.x-vendor.x,worker.y-vendor.y)>m.radius)problems.push(`${a.id}: worker is outside its market's reach`);}
 return problems;
}
