import {it,expect} from 'vitest';
import source from '../docs/examples/workstations.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {parseScene,type Scene} from '../src/scene/schema';
import {workstation,workstations} from '../src/scene/workstations';
import {createCarAtSpawn,resetCar,type CarState,type World} from '../src/sim/car';
import {stepInteractive} from '../src/sim/interaction';
import {stepCommerce,commerceReason,checkEconomyState} from '../src/sim/commerce';
import {actorPose} from '../src/sim/actors';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
const compile=(text=source)=>compileDreamScene(text,{sceneId:'stations',revisionId:'test',sourceHash:'stations'});
const scene=compile(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:CarState,id='pocket')=>s.economy!.accounts.find(a=>a.id===id)!;
const start=(doc=scene):CarState=>{const p=workstations(doc)[0]!;return {...createCarAtSpawn(doc),control:{kind:'foot'},x:p.x,y:p.y,elevation:p.elevation,surface:'paper',vehicles:[{id:null,x:525,y:609,elevation:0,headingRad:0,distance:0}]};};
const step=(s:CarState,job?:string,dt=.25,doc=scene)=>stepCommerce({...s,timeS:s.timeS+dt},{commerce:job ? {kind:'work',job} : undefined},dt,doc);
it('compiles local standing/hand points, canonical formatting and actionable rejection of invalid stations',()=>{
 expect(formatDream(formatDream(source))).toBe(formatDream(source));
 expect(workstations(scene)[0]).toMatchObject({x:626.5,y:750,hands:{x:619.8,y:10,z:750}});
 for(const [from,to] of [['object=prep_table,at=','object=missing,at='],['at=[16.5,0]','at=[0,0]'],['hands=[9.8,10,0]','hands=[9.8,20,0]'],['hands=[9.8,10,0]','hands=[2,10,0]'],['station=preparation','station=missing'],['capacity=1,target=4','capacity=2,target=4'],['equipment=[prep_table]','equipment=[missing]'],['on=plaza);','on=missing);']] as const)expect(checkDream(source.replace(from,to)).ok,to).toBe(false);
 const rotated=compile(source.replace('at=[610,750],role=prop','at=[610,750],heading_deg=90,role=prop'));
 expect(workstations(rotated)[0]!.x).toBeCloseTo(610);expect(workstations(rotated)[0]!.y).toBeCloseTo(766.5);
});
it('requires a physical station, faces it without snapping position and refunds a departure immediately',()=>{
 const s=start(),counter={...s,x:580,y:750};expect(commerceReason(counter,scene,'pocket',{kind:'work',job:'bake'})).toBe('station');
 const blocked=step(counter,'bake');expect(account(blocked).work).toBeUndefined();expect(blocked.economy!.markets[0]!.stock.flour).toBe(12);
 let next=step(s,'bake');expect(account(next).work?.id).toBe('bake');expect([next.x,next.y,next.elevation]).toEqual([s.x,s.y,s.elevation]);expect(next.headingRad).toBeCloseTo(Math.PI);
 const before=JSON.stringify(next),away=step({...next,x:next.x+3},undefined,1/120);expect(JSON.stringify(next)).toBe(before);expect(account(away).work).toBeUndefined();expect(account(away).credits).toBe(20);expect(away.economy!.markets[0]).toMatchObject({credits:100,stock:{flour:12,bread:2}});
 next=step(away);expect(next.economy!.events.filter(e=>e.kind==='cancel')).toHaveLength(1);checkEconomyState(next,scene);
});
it('shares one station across different jobs and preserves a committed batch through save/reload and R',()=>{
 const doc=parseScene({...scene,economy:{...scene.economy!,jobs:[...scene.economy!.jobs,{...scene.economy!.jobs[0]!,id:'second'}],accounts:scene.economy!.accounts.map(a=>({...a,commute:undefined,works:undefined,on:undefined}))}}),w={...world,scene:doc};
 let s=step(start(doc),'bake',.25,doc);
 // A second account at the same physical point still cannot claim another recipe.
 const npc=doc.objects.find(o=>o.id==='neighbor')!,copy=parseScene({...doc,objects:doc.objects.map(o=>o===npc ? {...o,x:s.x,y:s.y} : o)});
 expect(commerceReason(s,copy,'baker',{kind:'work',job:'second'})).toBe('busy');
 const text=encodeSave(s,s.timeS,w),loaded=decodeSave(text,w).state;expect(loaded).toEqual(JSON.parse(text).state);expect(resetCar(s,doc).economy).toEqual(s.economy);
 const bad=JSON.parse(text);bad.state.x+=3;expect(()=>decodeSave(JSON.stringify(bad),w)).toThrow('invalid');
 let replay=loaded;for(let i=0;i<360;i++){s=stepInteractive(s,{steer:0,throttle:0},1/120,w);replay=stepInteractive(replay,{steer:0,throttle:0},1/120,w);}expect(replay).toEqual(s);expect(account(s).credits).toBe(23);expect(account(s).completed.work.bake).toBe(1);expect(s.economy!.markets[0]!.stock.bread).toBe(4);checkEconomyState(s,doc);
});
it.each(['commuter','stationary'])('walks the %s to the same station before reserving resources, then pays and walks home',kind=>{
 const doc=kind==='commuter' ? scene : parseScene({...scene,economy:{...scene.economy!,accounts:scene.economy!.accounts.map(a=>a.id==='baker' ? {...a,work:'bake'} : {...a,commute:undefined,works:undefined,on:undefined})}}),snapshot=JSON.stringify(doc);let s={...start(doc),x:900,y:730},owner=kind==='commuter' ? 'regular' : 'baker',seen=false,paid=false;const p=workstations(doc)[0]!;
 for(let i=0;i<480;i++){
  s=step(s,undefined,.25,doc);checkEconomyState(s,doc);const a=account(s,owner),t=a.commute;
  if(t?.phase==='out'){expect(a.work).toBeUndefined();expect(a.credits).toBe(kind==='commuter' ? 20 : 0);}
  if(a.work){seen=true;const pose=actorPose(doc,doc.objects.find(o=>o.id===doc.economy!.accounts.find(a=>a.id===owner)!.actor)!,s.timeS,s);expect(Math.hypot(pose.x-p.x,pose.y-p.y)).toBeLessThan(.1);expect(pose.headingRad).toBeCloseTo(p.headingRad);}
  if(a.completed.work.bake!>0 && !t){paid=true;break;}
 }
 expect(seen && paid).toBe(true);expect(account(s,owner).completed.work.bake).toBe(1);expect(account(s,owner).credits).toBe(kind==='commuter' ? 23 : 3);expect(JSON.stringify(doc)).toBe(snapshot);
});
it('releases station reservations on equipment damage without paying twice',()=>{
 const s=step(start(),'bake'),broken=step({...s,broken:['prep_table']},undefined,1/120);expect(account(broken).work).toBeUndefined();expect(account(broken).credits).toBe(20);expect(broken.economy!.markets[0]).toMatchObject({credits:100,stock:{flour:12,bread:2}});checkEconomyState(broken,scene);
});
