import {it,expect,afterEach} from 'vitest';
import source from '../docs/examples/service-office.dream?raw';
import {worldModules} from '../src/scene/world-fixture';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {ambientGraph} from '../src/scene/ambient-navigation';
import {workstation} from '../src/scene/workstations';
import {workApproach,commuteArea} from '../src/sim/courier';
import {workPath,workSegment} from '../src/sim/work-navigation';
import {createCarAtSpawn} from '../src/sim/car';
import {nearbyMarket,nearbyWorkstation} from '../src/sim/commerce';
import {walkingHeight} from '../src/scene/interiors';
const identity={sceneId:'service-office',revisionId:'r1',sourceHash:'service-office'};
const scene=compileDreamScene(source,identity,worldModules);
const snapshot=JSON.stringify(scene);afterEach(()=>expect(JSON.stringify(scene)).toBe(snapshot));

it('builds a complete goods-free workplace and pavement graph without crowds, meals, repairs or placeholder lots',()=>{
 expect(scene.economy!.goods).toEqual([]);expect(scene.economy!.markets[0]!.on).toBe('exchange');expect(scene.economy!.markets[0]!.lots).toEqual([]);expect(scene.objects.some(o=>o.ambient)).toBe(false);expect(scene.economy!.repairs).toEqual([]);expect(scene.economy!.meals).toEqual([]);
 expect(ambientGraph(scene).nodes.some(n=>n.links.length)).toBe(true);expect(ambientGraph(scene).starts.size).toBe(0);expect(formatDream(formatDream(source))).toBe(formatDream(source));
});

it('keeps a dense local grid from hiding clear public anchors for a 4.3-radius worker and connects both stair directions',()=>{
 const a=scene.economy!.accounts.find(a=>a.id==='worker')!,home=scene.objects.find(o=>o.id===a.actor)!,job=scene.economy!.jobs[0]!,area=commuteArea(scene,a),offer=workApproach(scene,a,job,home)!;
 expect(area.radius).toBe(4.3);expect(offer).toBeDefined();expect(offer.path.some(p=>(p.elevation??0)>8&&(p.elevation??0)<48)).toBe(true);expect(workPath(scene,area,offer.end,home)).toBeDefined();
 let previous=home as {x:number;y:number;elevation?:number};for(const p of offer.path){expect(workSegment(scene,area,previous,p,undefined),JSON.stringify({previous,p})).toBe(true);previous=p;}
});

it('locates the business at its building and keeps the actual operator home separate',()=>{
 const s=createCarAtSpawn(scene),home=scene.objects.find(o=>o.id==='clerk')!,end=workstation(scene,'records')!;
 expect(nearbyMarket({...s,x:home.x,y:home.y,control:{kind:'foot'},elevation:0},scene)).toBeUndefined();
 expect(nearbyMarket({...s,x:1200,y:950,elevation:walkingHeight(scene,1200,950),control:{kind:'foot'}},scene)?.id).toBe('office');
 expect(nearbyWorkstation({...s,x:end.x,y:end.y,elevation:end.elevation,control:{kind:'foot'}},scene)?.id).toBe('records');
});

it('accepts a stationary employee at the premises while the operator lives elsewhere',()=>{
 const employee=source.replace('economy(){','place employee(object=resident,at=[1200,950],role=npc,behavior=welcome);\neconomy(){')
  .replace('actor=clerk,credits=0','actor=employee,credits=0')
  .replace(',commute=true,attendance=[8,18],on=exchange,grounds=[lobby,mezzanine,landing,entry_work]','');
 const result=checkDream(employee,worldModules);expect(result,JSON.stringify(result)).toMatchObject({ok:true});
});

it.each(['missing','desk'])('rejects service premises that are not an enterable static building: %s',on=>{
 expect(checkDream(source.replace('actor=clerk,on=exchange','actor=clerk,on='+on),worldModules).ok).toBe(false);
});

it('keeps stocked counters on their original ownership/location policy',()=>{
 const invalid=source.replace('economy(){','economy(){good paper(label="Paper");').replace('hours=[8,18]){}','hours=[8,18]){lot shelf(good=paper,quantity=1,limit=2);}');
 expect(checkDream(invalid,worldModules).ok).toBe(false);
});
