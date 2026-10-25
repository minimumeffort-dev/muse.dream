import {afterEach,beforeAll,it,expect} from 'vitest';
import {createWorldScene} from '../src/scene/world-fixture';
import {preCrossingAccessScene,preStationMaintenanceScene} from '../src/scene/save-compatibility';
import {COMMERCE_LIMITS,accountRepairs,repairGrounds} from '../src/scene/commerce';
import {GROWTH_LIMITS,growthScale} from '../src/scene/growth';
import {workGround} from '../src/scene/interiors';
import {sceneContactData} from '../src/scene/contacts';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {AMBIENT_LIMITS} from '../src/scene/ambient';
import {hasAnimatedJoints,impactOf} from '../src/scene/object-dsl';
import {controlFor} from '../src/scene/agents';
import {repairTargets,repairApproach,repairPath,repairSegment,repairNavigation} from '../src/sim/repair';
import {createCarAtSpawn,type CarState} from '../src/sim/car';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {actorPose} from '../src/sim/actors';

let accepted:ReturnType<typeof createWorldScene>|undefined,snapshot:string|undefined;
function scene(){if(!accepted){accepted={...preCrossingAccessScene(createWorldScene()),revisionId:'r112'};snapshot=JSON.stringify(accepted);}return accepted;}
beforeAll(()=>{scene();},60000);
afterEach(()=>{if(accepted)expect(JSON.stringify(accepted)).toBe(snapshot);});
const fixtures=['bench_nw','bench_ne','bench_sw','bench_se','home_seat','office_seat','lamp_west','lamp_center','lamp_east','home_planter','work_planter'].map(id=>'station_quarter_'+id);
const trees=['west','center','east'].map(id=>'station_quarter_tree_'+id),expected=[...fixtures,...trees];
const key=(t:{objectId:string;zoneId?:string})=>t.objectId+'/'+(t.zoneId??'');

it('adds all fourteen station damage targets to the existing finite caretaker policies without removing old work',()=>{
 const current=scene(),prior=preStationMaintenanceScene(current),before=prior.economy!,after=current.economy!;
 expect(current.revisionId).toBe('r112');expect(current.objects).toEqual(prior.objects);expect(current.terrain).toEqual(prior.terrain);expect(current.floors).toEqual(prior.floors);
 expect(after.accounts).toEqual(before.accounts);expect(after.markets).toEqual(before.markets);expect(after.goods).toEqual(before.goods);expect(after.jobs).toEqual(before.jobs);expect(after.deliveries).toEqual(before.deliveries);
 const caretaker=after.accounts.find(a=>a.id==='caretaker')!;expect(accountRepairs(caretaker)).toEqual(['market_tables','orchard_trees','classroom_furniture','home_furniture']);expect(accountRepairs(caretaker)).toHaveLength(GROWTH_LIMITS.workerServices);
 const old=new Set(before.repairs.flatMap(r=>repairTargets(prior,r).map(key))),now=new Set(after.repairs.flatMap(r=>repairTargets(current,r).map(key)));
 for(const id of old)expect(now.has(id),id).toBe(true);
 expect([...now].filter(id=>!old.has(id)).sort()).toEqual(expected.map(id=>id+'/').sort());
 const counts={market_tables:449,classroom_furniture:18,home_furniture:11,orchard_trees:109};
 for(const r of after.repairs){
  expect(repairTargets(current,r)).toHaveLength(counts[r.id as keyof typeof counts]);
  const oldRule=before.repairs.find(p=>p.id===r.id)!,{grounds:oldGrounds,kinds:oldKinds,...oldPolicy}=oldRule,{grounds:newGrounds,kinds:newKinds,...policy}=r;expect(policy).toEqual(oldPolicy);
  for(const id of repairGrounds(oldRule))expect(repairGrounds(r)).toContain(id);
 }
 const repairs=after.repairs.find(r=>r.id==='classroom_furniture')!,planting=after.repairs.find(r=>r.id==='orchard_trees')!;
 expect(repairTargets(current,repairs).filter(t=>t.objectId.startsWith('station_quarter_')).map(t=>t.objectId).sort()).toEqual([...fixtures].sort());
 expect(repairTargets(current,planting).filter(t=>t.objectId.startsWith('station_quarter_')).map(t=>t.objectId).sort()).toEqual([...trees].sort());
 expect(planting).toMatchObject({input:'sapling',take:1,pay:6,seconds:10,regrow_s:180,seed_scale:.15});expect(repairs).toMatchObject({input:'timber',take:1,pay:4,seconds:8,recover:'fasteners',amount:1});
 for(const id of expected){const object=current.objects.find(o=>o.id===id)!;expect(impactOf(object.spec)?.kind,id).toBe(id.includes('bench_')||id.endsWith('_seat') ? 'break' : 'topple');}
});

it('walks from the actual supply home to all fourteen approaches and back through the declared grounds and lobbies',()=>{
 const current=scene(),home=current.objects.find(o=>o.id==='market_neighbor')!;let checked=0;
 for(const r of current.economy!.repairs)for(const target of repairTargets(current,r).filter(t=>expected.includes(t.objectId))){
  const trip=repairApproach(current,r,target,home);expect(trip,target.objectId).toBeDefined();expect(trip!.path.length).toBeLessThanOrEqual(COMMERCE_LIMITS.repairPath);
  let previous:{x:number;y:number;elevation?:number}=home;for(const point of trip!.path){expect(repairSegment(current,r,previous,point,undefined),target.objectId).toBe(true);previous=point;}
  const back=repairPath(current,r,trip!.end,home);expect(back,target.objectId).toBeDefined();previous=trip!.end;for(const point of back!){expect(repairSegment(current,r,previous,point,undefined),target.objectId).toBe(true);previous=point;}
  if(target.objectId.endsWith('_seat'))expect(trip!.end.elevation).toBeGreaterThan(0);checked++;
 }
 expect(checked).toBe(14);
});

it('keeps contacts, the public crowd graph and all actor, surface and navigation budgets intact',()=>{
 const current=scene(),prior=preStationMaintenanceScene(current);
 expect(sceneContactData(current)).toEqual(sceneContactData(prior));expect(ambientGraph(current)).toEqual(ambientGraph(prior));
 expect(COMMERCE_LIMITS.repairGrounds).toBe(12);expect(COMMERCE_LIMITS.repairNodes).toBe(4096);expect(COMMERCE_LIMITS.repairNetworkNodes).toBe(8192);expect(COMMERCE_LIMITS.repairNetworkLinks).toBe(32768);
 expect(current.objects).toHaveLength(1813);expect(current.surfaces).toHaveLength(61);expect(current.surfaces.filter(s=>s.id==='station_repair_work'||s.id.startsWith('station_tree_work_'))).toHaveLength(4);
 for(const surface of current.surfaces.filter(s=>s.id==='station_repair_work'||s.id.startsWith('station_tree_work_'))){expect(surface.finish).toBe('terrain');expect(surface.walkable).not.toBe(true);}
 const samples:Record<string,number>={};
 for(const r of current.economy!.repairs){expect(repairGrounds(r).length).toBeLessThanOrEqual(COMMERCE_LIMITS.repairGrounds);samples[r.id]=repairGrounds(r).reduce((n,id)=>{const p=workGround(current,id)!.points,x=p.map(p=>p.x),y=p.map(p=>p.y);return n+(Math.ceil((Math.max(...x)-Math.min(...x))/12)+1)*(Math.ceil((Math.max(...y)-Math.min(...y))/12)+1);},0);expect(samples[r.id]).toBeLessThanOrEqual(COMMERCE_LIMITS.repairNodes);}
 expect(samples).toEqual({market_tables:3829,classroom_furniture:3263,home_furniture:645,orchard_trees:4054});
 const packet=repairNavigation(current);for(const service of packet.services){expect(service.nodes.length).toBeLessThanOrEqual(COMMERCE_LIMITS.repairNetworkNodes);expect(service.nodes.reduce((n,p)=>n+p.links.length,0)).toBeLessThanOrEqual(COMMERCE_LIMITS.repairNetworkLinks);}
 expect(current.objects.filter(o=>o.ambient)).toHaveLength(189);expect(AMBIENT_LIMITS.members).toBe(192);expect(current.objects.filter(o=>!o.parked&&(o.route||controlFor(o)))).toHaveLength(24);
 expect(current.objects.filter(o=>!o.parked&&hasAnimatedJoints(o.spec)).length+Number(current.objects.some(o=>o.parked&&hasAnimatedJoints(o.spec)))+Number(hasAnimatedJoints(current.player))+1).toBe(24);
});

it.each([
 ['station_quarter_bench_nw','classroom_furniture'],
 ['station_quarter_lamp_center','classroom_furniture'],
 ['station_quarter_tree_center','orchard_trees'],
] as const)('physically repairs %s with finite supplies, one wage, a real return and ordinary growth',async(objectId,serviceId)=>{
 const current=scene(),home=current.objects.find(o=>o.id==='market_neighbor')!,r=current.economy!.repairs.find(r=>r.id===serviceId)!;
 let state:CarState={...createCarAtSpawn(current),broken:[objectId]},started=false,worked=false,paid=false,returned=false,moved=false,planted=false,maxDistance=0,completionCredit=0;
 const caretaker=(s:CarState)=>s.economy!.accounts.find(a=>a.id==='caretaker')!,market=(s:CarState)=>s.economy!.markets.find(m=>m.id===r.market)!;
 for(let tick=0;tick<3600/.25;tick++){
  const before=state,oldWorker=caretaker(before);state=stepCommerce({...before,timeS:before.timeS+.25},{},.25,current);const worker=caretaker(state),task=worker.repair;
  if(task?.objectId===objectId){
   if(!started){expect(task.id).toBe(serviceId);expect(worker.credits).toBe(oldWorker.credits);expect(market(state).stock[r.input]).toBe(market(before).stock[r.input]!-r.take);started=true;}
   maxDistance=Math.max(maxDistance,task.distance);moved ||= Math.hypot(task.x-home.x,task.y-home.y)>100;worked ||= task.phase==='work';
   const pose=actorPose(current,home,state.timeS,state);expect(pose.x).toBeCloseTo(task.x);expect(pose.y).toBeCloseTo(task.y);
   if(oldWorker.repair?.objectId===objectId)expect(Math.hypot(task.x-oldWorker.repair.x,task.y-oldWorker.repair.y)).toBeLessThanOrEqual(3.501);
  }
  if(!paid && state.economy!.repaired[serviceId]===1){
   expect(state.broken).not.toContain(objectId);expect(worker.completed.repair[serviceId]).toBe(1);expect(worker.credits).toBe(oldWorker.credits+r.pay);completionCredit=worker.completed.repair[serviceId]!;paid=true;
   if(r.regrow_s){expect(state.growing).toContainEqual(expect.objectContaining({objectId,serviceId}));expect(growthScale(current,state,objectId)).toBeCloseTo(r.seed_scale!);planted=true;}
  }
  if(paid && !returned && task?.objectId!==objectId){returned=true;const pose=actorPose(current,home,state.timeS,state);expect(Math.hypot(pose.x-home.x,pose.y-home.y)).toBeLessThan(.101);}
  if(tick%4===0||oldWorker.completed.repair[serviceId]!==worker.completed.repair[serviceId])checkEconomyState(state,current);
  if(paid && returned && !(state.growing??[]).some(p=>p.objectId===objectId))break;
  if(tick%200===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect({started,worked,paid,returned,moved},JSON.stringify({time:state.timeS,task:caretaker(state).repair,courier:caretaker(state).courier})).toEqual({started:true,worked:true,paid:true,returned:true,moved:true});expect(maxDistance).toBeGreaterThan(1000);expect(completionCredit).toBe(1);
 expect(state.economy!.repaired[serviceId]).toBe(1);expect(caretaker(state).completed.repair[serviceId]).toBe(1);expect(state.broken).toEqual([]);expect(state.growing??[]).toEqual([]);expect(growthScale(current,state,objectId)).toBe(1);expect(planted).toBe(!!r.regrow_s);checkEconomyState(state,current);
},60000);
