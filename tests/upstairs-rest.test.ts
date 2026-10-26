import {it,expect} from 'vitest';
import source from '../docs/examples/upstairs-rest.dream?raw';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {stepCommerce,checkEconomyState} from '../src/sim/commerce';
import {stepNpcs} from '../src/sim/npcs';
import {actorPose} from '../src/sim/actors';
import {worldSeats} from '../src/scene/seating';
import {encodeSave,decodeSave} from '../src/sim/save';
import {repairNavigation,primeRepairNavigation,primeRepairNavigationSteps,repairArea,repairNetwork} from '../src/sim/repair';
import {repairCoverage} from '../src/scene/commerce';
import {parseScene} from '../src/scene/schema';
const scene=compileDreamScene(source,{sceneId:'upstairs',revisionId:'r1',sourceHash:'upstairs'}),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(4000,2400),carRadius:11};
const account=(s:ReturnType<typeof createCarAtSpawn>,id='regular')=>s.economy!.accounts.find(a=>a.id===id)!;
const tick=(s:ReturnType<typeof createCarAtSpawn>)=>stepCommerce({...s,timeS:s.timeS+.25,npcs:stepNpcs(s,.25,scene)},{},.25,scene);
it('walks the same stairs upstairs, rests on a real seat and walks back with clocks and money intact',()=>{
 let s=createCarAtSpawn(scene),seen=false,up=false;const initial=JSON.stringify(scene),seat=worldSeats(scene).find(s=>s.objectId==='upper_settee')!;let saved:string|undefined;
 for(let i=0;i<800;i++){
  s=tick(s);const p=actorPose(scene,scene.objects.find(o=>o.id==='customer')!,s.timeS,s),t=account(s).resting;up ||= p.elevation>20;
  if(t?.phase==='sit'){seen=true;expect(t.seat?.objectId).toBe('upper_settee');expect(p.elevation).toBeCloseTo(seat.elevation);saved??=encodeSave(s,s.timeS,world);}
  if(seen && !t)break;
 }
 expect(up).toBe(true);expect(seen,JSON.stringify(account(s))).toBe(true);expect(account(s).resting).toBeUndefined();expect(account(s).energy).toBeGreaterThan(80);expect(account(s).credits).toBe(20);expect(JSON.stringify(scene)).toBe(initial);checkEconomyState(s,scene);
 const restored=decodeSave(saved!,world).state;expect(account(restored).resting?.phase).toBe('sit');expect(account(restored).resting?.elevation).toBeCloseTo(seat.elevation);checkEconomyState(restored,scene);
});
it('carries real repair supplies up the stairs and pays once after restoring the upper settee',()=>{
 let s={...createCarAtSpawn(scene),broken:['upper_settee']},up=false;const before=s.economy!.markets.find(m=>m.id==='corner')!.stock.kit!;
 for(let i=0;i<1400 && (s.broken.length || account(s,'fixer').repair);i++){s=tick(s);const p=actorPose(scene,scene.objects.find(o=>o.id==='repairer')!,s.timeS,s);up ||= p.elevation>20;}
 expect(up).toBe(true);expect(s.broken).toEqual([]);expect(s.economy!.repaired.home_furniture).toBe(1);expect(account(s,'fixer').credits).toBe(3);expect(s.economy!.markets.find(m=>m.id==='corner')!.stock.kit).toBe(before-1);checkEconomyState(s,scene);
});
it('transfers derived indoor graphs with supported elevations and rejects forged heights',()=>{
 const prepared=repairNavigation(scene);expect(prepared.services.some(s=>s.id.startsWith('indoor/') && s.nodes.some(n=>n.elevation!>20))).toBe(true);const copy=parseScene(structuredClone(scene));primeRepairNavigation(copy,prepared);const plan=copy.economy!.repairs[0]!,service=prepared.services.find(s=>s.id===plan.id)!;expect(repairArea(copy,plan).access).toBe(service.coverage!.access);
 const forged=structuredClone(prepared),indoor=forged.services.find(s=>s.id.startsWith('indoor/'))!;indoor.nodes[0]!.elevation=4000;expect(()=>primeRepairNavigation(parseScene(structuredClone(scene)),forged)).toThrow();
});

it('cooperative navigation retains exact graph identities and installs only after all yielded checks pass',()=>{
 const packet=structuredClone(repairNavigation(scene)),copy=structuredClone(scene),plan=copy.economy!.repairs[0]!,previous=repairNetwork(copy,plan),coverage=repairCoverage(copy,plan),unchanged=JSON.stringify({copy,packet});
 const steps=primeRepairNavigationSteps(copy,packet);let result=steps.next(),yields=0;
 while(!result.done){yields++;expect(repairNetwork(copy,plan)).toBe(previous);expect(repairCoverage(copy,plan)).toBe(coverage);result=steps.next();}
 expect(yields).toBeGreaterThan(20);expect(repairNetwork(copy,plan)).toBe(packet.services.find(s=>s.id===plan.id)!.nodes);expect(repairCoverage(copy,plan)).toBe(packet.services.find(s=>s.id===plan.id)!.coverage);expect(JSON.stringify({copy,packet})).toBe(unchanged);
 const sync=structuredClone(scene);primeRepairNavigation(sync,structuredClone(packet));expect(repairNetwork(sync,plan)).toEqual(repairNetwork(copy,plan));
});

it('abandoned or late-invalid cooperative packets leave the previous navigation and coverage installed',()=>{
 const packet=structuredClone(repairNavigation(scene)),copy=structuredClone(scene),plan=copy.economy!.repairs[0]!,previous=repairNetwork(copy,plan),coverage=repairCoverage(copy,plan);
 const abandoned=primeRepairNavigationSteps(copy,packet);expect(abandoned.next().done).toBe(false);abandoned.return(undefined);expect(repairNetwork(copy,plan)).toBe(previous);expect(repairCoverage(copy,plan)).toBe(coverage);
 for(const change of [(p:typeof packet)=>{p.services.filter(s=>s.id.startsWith('indoor/')).at(-1)!.nodes.at(-1)!.elevation=4000;},(p:typeof packet)=>{p.services.find(s=>s.coverage)!.coverage!.targets[0]!.contact.r++;}]){
  const bad=structuredClone(packet);change(bad);let yields=0;
  expect(()=>{for(const _ of primeRepairNavigationSteps(copy,bad))yields++;}).toThrow('Invalid prepared');expect(yields).toBeGreaterThan(20);expect(repairNetwork(copy,plan)).toBe(previous);expect(repairCoverage(copy,plan)).toBe(coverage);
 }
});

it('rejects a saved resident height on an unsupported layer',()=>{
 let s=createCarAtSpawn(scene);for(let i=0;i<800 && account(s).resting?.phase!=='sit';i++)s=tick(s);const data=JSON.parse(encodeSave(s,s.timeS,world));data.state.economy.accounts.find((a:{id:string})=>a.id==='regular').resting.elevation+=10;expect(()=>decodeSave(JSON.stringify(data),world)).toThrow();
});
