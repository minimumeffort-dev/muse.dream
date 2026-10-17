import {it,expect} from 'vitest';
import source from '../docs/examples/npc-conversation.dream?raw';
import {compileDreamScene,compileDreamWorld} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {encodeSave,decodeSave,MAX_SAVE_CHARACTERS} from '../src/sim/save';
import {gameSave} from '../src/game/save';
import {npcSpeech} from '../src/sim/npcs';

const base=compileDreamScene(source,{sceneId:'save-test',revisionId:'r1',sourceHash:'exact-source'});
const table=compileDreamWorld('dream 2;material wood(style=toon,colors=[#886644,#554433]);object table(label="Table"){body(interaction=solid,radius=10,height=12);impact(mode=break(speed=80,scatter=50,lift=40,spin=1,lifetime=4));part top(shape=box,material=wood,at=[0,11,0],size=[20,2,20]);}').assemblies[0]!;
const scene=parseScene({...base,objects:[...base.objects,{id:'table',kind:'custom',labelText:'Table',x:1000,y:1000,scale:1,spec:table}]});
const world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(scene.canonical.width,scene.canonical.height),carRadius:11};
const idle={throttle:0,steer:0};
function met(){const foot=toggleRide(createCarAtSpawn(scene),world);return stepInteractive({...foot,x:580,y:745,elevation:0}, {...idle,talkPressed:true},1/120,world);}

it('round-trips physical changes, NPC memory, parked vehicles and the visual clock without scene data',()=>{
 const state={...met(),broken:['table']},text=encodeSave(state,212.5,world),copy=decodeSave(text,world);
 expect(copy.worldTime).toBe(212.5);expect(copy.state.npcs[0]!.known).toBe(true);expect(copy.state.broken).toEqual(['table']);expect(copy.state.vehicles).toEqual(state.vehicles);expect(copy.state.control.kind).toBe('foot');expect(copy.state.x).toBe(state.x);expect(text.length).toBeLessThan(10_000);expect(text).not.toContain('parts');
 expect(stepInteractive(copy.state,idle,1/120,world)).toEqual(stepInteractive(state,idle,1/120,world));
 let next=copy.state;for(let i=0;i<730;i++)next=stepInteractive(next,idle,1/120,world);next=stepInteractive(next,{...idle,talkPressed:true},1/120,world);expect(npcSpeech(next,scene)?.text).toBe('Good to see you again.');
});
it('cancels held input without mutating the live state or replaying transient impacts',()=>{
 const state={...met(),jump:{held:true,bufferUntilS:10,coyoteUntilS:0},carBoost:{held:true,activeUntilS:0,readyAtS:3},boostedThisStep:true};
 const restored=decodeSave(encodeSave(state,1,world),world).state;expect(restored.jump.held).toBe(false);expect(restored.jump.bufferUntilS).toBe(0);expect(restored.carBoost.held).toBe(false);expect(restored.boostedThisStep).toBe(false);expect(restored.impacts).toEqual([]);expect(state.jump.held).toBe(true);expect(state.carBoost.held).toBe(true);
});
it('rejects corrupt, oversized, foreign-source, unknown-member and duplicate-owner saves',()=>{
 const text=encodeSave(met(),0,world),data=JSON.parse(text);
 for(const invalid of ['{',' '.repeat(MAX_SAVE_CHARACTERS+1),JSON.stringify({...data,version:99}),JSON.stringify({...data,sourceHash:'other'}),JSON.stringify({...data,state:{...data.state,x:-1}}),JSON.stringify({...data,state:{...data.state,npcs:[{...data.state.npcs[0],stateId:'missing'}]}}),JSON.stringify({...data,state:{...data.state,vehicles:[...data.state.vehicles,...data.state.vehicles]}}),JSON.stringify({...data,state:{...data.state,broken:['missing']}})])expect(()=>decodeSave(invalid,world)).toThrow();
});
it('saves atomically, restores the same world and preserves a corrupt slot until explicit replacement',()=>{
 const rows=new Map<string,string>(),storage={getItem:(key:string)=>rows.get(key)??null,setItem:(key:string,value:string)=>{rows.set(key,value);}},slot=gameSave(world,()=>storage),state=met();
 expect(slot.restored).toBeUndefined();expect(slot.write(state,50)).toBe(true);expect(gameSave(world,()=>storage).restored?.state.npcs[0]!.known).toBe(true);
 const previous=rows.get(slot.key)!;const quota=gameSave(world,()=>({...storage,setItem:()=>{throw Error('quota');}}));expect(quota.write(state,51)).toBe(false);expect(rows.get(slot.key)).toBe(previous);expect(quota.status).toContain('Could not save');
 rows.set(slot.key,'broken');const corrupt=gameSave(world,()=>storage);expect(corrupt.write(state,52)).toBe(false);expect(rows.get(slot.key)).toBe('broken');expect(corrupt.write(createCarAtSpawn(scene),0,true)).toBe(true);expect(gameSave(world,()=>storage).restored?.state.npcs[0]!.known).toBe(false);
});
it('keeps storage errors recoverable and source slots separate',()=>{
 const unavailable=gameSave(world,()=>{throw Error('storage disabled');});expect(unavailable.restored).toBeUndefined();expect(unavailable.write(met(),0)).toBe(false);
 const storage={getItem:()=>null,setItem:()=>{}},other=gameSave({...world,scene:{...scene,sourceHash:'new-world'}},()=>storage);expect(other.key).not.toBe(gameSave(world,()=>storage).key);
});

it('round-trips the live population, damage and every control domain without resetting ownership',async()=>{
 const {createWorldScene}=await import('../src/scene/world-fixture'),{actorPose}=await import('../src/sim/actors'),{controlFor}=await import('../src/scene/agents'),{impactOf}=await import('../src/scene/object-dsl');
 const doc=createWorldScene(),w:World={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(doc.canonical.width,doc.canonical.height),carRadius:11},base=createCarAtSpawn(doc);
 const broken=doc.objects.find(o=>impactOf(o.spec)?.kind==='break')!;base.broken=[broken.id];
 const car=decodeSave(encodeSave(base,314,w),w);expect(car.state.broken).toEqual(base.broken);expect(car.state.population).toEqual(base.population);expect(car.state.control.kind).toBe('car');
 for(const kind of ['bicycle','boat','plane'] as const){
  const object=doc.objects.find(o=>controlFor(o)===kind)!,p=actorPose(doc,object,0,base),state={...base,control:{kind:'vehicle' as const,id:object.id},x:p.x,y:p.y,elevation:p.elevation,headingRad:p.headingRad,vehicles:[{id:null,x:base.x,y:base.y,elevation:base.elevation,headingRad:base.headingRad,distance:0}]};
  expect(decodeSave(encodeSave(state,314,w),w).state.control).toEqual(state.control);
 }
 const bus=doc.objects.find(o=>o.role==='npc' && o.route && o.spec && 'rideable' in o.spec && o.spec.rideable && !('control' in o.spec.rideable && o.spec.rideable.control))!,p=actorPose(doc,bus,0,base);
 const passenger={...base,control:{kind:'passenger' as const,id:bus.id},x:p.x,y:p.y,elevation:p.elevation,vehicles:[{id:null,x:base.x,y:base.y,elevation:base.elevation,headingRad:base.headingRad,distance:0}]};
 expect(decodeSave(encodeSave(passenger,314,w),w).state.control).toEqual(passenger.control);
});

it('retains a valid fragment and recovers an unsafe active pose without erasing NPC memory',async()=>{
 const {objectFragments}=await import('../src/scene/fragments'),fragment=objectFragments(table)[0]!;
 const state={...met(),broken:['table'],debris:[{objectId:'table',fragmentId:fragment.id,x:1000,y:1000,elevation:14,vx:0,vy:0,vz:0,rotation:[0,0,0,1] as [number,number,number,number],spin:[0,0,0] as [number,number,number],age:1,lifetime:4,settled:false}]};
 const copy=decodeSave(encodeSave(state,30,world),world).state;expect(copy.debris).toEqual(state.debris);
 const blocked={...met(),x:1000,y:1000,elevation:0};const recovered=decodeSave(encodeSave(blocked,30,world),world).state;expect(recovered.control.kind).toBe('car');expect(recovered.x).toBe(scene.spawn.x);expect(recovered.npcs[0]!.known).toBe(true);
});

it('detects another tab updating the slot and requires an explicit session replacement',()=>{
 const rows=new Map<string,string>(),storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}},first=gameSave(world,()=>storage),second=gameSave(world,()=>storage);
 expect(first.write(met(),4)).toBe(true);const previous=rows.get(first.key);expect(second.write(createCarAtSpawn(scene),0)).toBe(false);expect(second.blocked).toBe(true);expect(rows.get(first.key)).toBe(previous);
 expect(second.write(met(),5,true)).toBe(true);expect(second.blocked).toBe(false);expect(gameSave(world,()=>storage).restored?.worldTime).toBe(5);
});
