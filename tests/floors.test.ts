import {it,expect} from 'vitest';
import home from '../docs/examples/stairs-home.dream?raw';
import {compileDream,compileDreamWorld,checkDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {measuredScale} from '../src/scene/measure';
import {sceneFloors} from '../src/scene/floors';
import {objectPlacement} from '../src/scene/placement';
import {objectContacts} from '../src/scene/contacts';
import {worldSeats} from '../src/scene/seating';
import {createCarAtSpawn,type World} from '../src/sim/car';
import {toggleRide,standUp,stepInteractive} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';
import {workPath,workSegment,type WalkingArea} from '../src/sim/work-navigation';
import {indoorAreas,indoorEntries} from '../src/sim/indoor-navigation';
const [house,bench]=compileDream(home),scale=measuredScale(house!),floor=9*scale;
const doc=()=>parseScene({...createFixtureScene(),terrain:{hills:[]},regions:[],floors:[{id:'upper',objectId:'house',position:[-3,9,0],size:[12,32]},{id:'landing',objectId:'house',position:[6,9,13.5],size:[6,5]}],objects:[{id:'house',kind:'custom',labelText:'Home',x:480,y:360,scale,spec:house},{id:'seat',kind:'custom',labelText:'Settee',x:468,y:360,scale:measuredScale(bench!),spec:bench,role:'prop',floor:'upper'}]});
const scene=doc(),world:World={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11},area:WalkingArea={id:'house-rest',grounds:['house','upper','landing'],access:[],network:true,radius:4,height:18};
it('binds checked furnishing to an existing slab without blocking the room below',()=>{
 expect(sceneFloors(scene)).toHaveLength(2);expect(objectPlacement(scene,scene.objects[1]!).base).toBeCloseTo(floor);expect(objectContacts(scene,scene.objects[1]!)[0]!.bottom).toBeCloseTo(floor);expect(worldSeats(scene)[0]!.elevation).toBeCloseTo(floor);
 for(const change of [{floors:[{...scene.floors![0]!,id:'house'}]},{floors:[{...scene.floors![0]!,objectId:'missing'}]},{floors:[{...scene.floors![0]!,position:[-3,8,0]}]},{objects:scene.objects.map(o=>o.id==='seat' ? {...o,x:500} : o)}])expect(()=>parseScene({...scene,...change})).toThrow();
 const compiled=compileDreamWorld(home+'\nplace house(object=commuter_home,at=[480,360]);floor upper(on=house,at=[-3,9,0],size=[12,32]);place seat(object=timber_settee,at=[468,360],role=prop,floor=upper);');expect(compiled.floors?.[0]!.id).toBe('upper');expect(compiled.objects[1]!.floor).toBe('upper');
});
it('sits and stands upstairs without transferring through the slab',()=>{
 const seat=worldSeats(scene)[0]!,initial={...createCarAtSpawn(scene),control:{kind:'foot' as const},...seat.approach,elevation:floor,vx:0,vy:0,vehicles:[{id:null,x:800,y:650,elevation:0,headingRad:0,distance:0}]};const sitting=toggleRide(initial,world);expect(sitting.seated?.objectId).toBe('seat');expect(sitting.elevation).toBeCloseTo(floor);expect(standUp(sitting,world).elevation).toBeCloseTo(floor);
 expect(toggleRide({...initial,elevation:.5*scale},world).seated).toBeUndefined();
});
it('routes through the physical stairs and landing in both directions, never straight through the slab',()=>{
 const to=worldSeats(scene)[0]!.approach,start={x:480,y:360-13*scale},path=workPath(scene,area,start,to);expect(path).toBeDefined();expect(path!.some(p=>(p.elevation??0)>floor-1)).toBe(true);expect(workSegment(scene,area,{x:to.x,y:to.y},{...to,elevation:floor},undefined)).toBe(false);expect(workPath(scene,area,to,start)).toBeDefined();
 const indoors=indoorAreas(scene,area);expect(indoors).toHaveLength(1);expect(indoorEntries(scene,indoors[0]!)).toHaveLength(1);
});

it('retains floor bindings through chunk transfer and hides only the upper instance from below',async()=>{
 const {WorldScenery}=await import('../src/game/scenery'),{packChunk,unpackChunk,disposeChunk}=await import('../src/game/chunk-packet'),{toonMaterial}=await import('../src/game/shaders'),{OrthographicCamera,Vector3,Mesh}=await import('three');
 const lower={...scene.objects[1]!,id:'lower',floor:undefined},d=parseScene({...scene,damagePool:true,objects:[...scene.objects,lower]}),built=new WorldScenery(d,[d.objects[1]!,d.objects[2]!]),packed=packChunk(built.group),root=unpackChunk(packed.packet,()=>toonMaterial('#fff')),streamed=WorldScenery.fromChunk(d,root,packed.packet.occlusion);
 const camera=new OrthographicCamera(-200,200,200,-200,1,2000);camera.position.set(200,300,-300);camera.lookAt(0,20,0);camera.updateMatrixWorld();
 const point=new Vector3(-12,.5*scale+8.5,0),values=()=>{const out:Record<string,number[]>={};root.traverse(n=>{if(!(n instanceof Mesh) || !n.userData.sceneryEntries)return;const attr=n.geometry.getAttribute('visibility');n.userData.sceneryEntries.forEach((id:number,index:number)=>{const key=packed.packet.occlusion![id]!.objectId!;(out[key]??=[]).push(attr.getX(index));});});return out;};
 streamed.update(camera,point,1/30,true);expect(values().seat!.every(v=>v===0)).toBe(true);expect(values().lower!.every(v=>v>0)).toBe(true);
 point.y=floor+8.5;streamed.update(camera,point,1/30,true);expect(values().seat!.every(v=>v>0)).toBe(true);disposeChunk(root);disposeChunk(built.group);
});

it('binds furniture to a supported ground-floor slab while rejecting floors below the room',()=>{
 const lower=parseScene({...scene,floors:[{id:'ground',objectId:'house',position:[0,.5,0],size:[18,32]}],objects:scene.objects.map(o=>o.id==='seat' ? {...o,floor:'ground'} : o)});
 const placed=lower.objects.find(o=>o.id==='seat')!;expect(objectPlacement(lower,placed).base).toBeCloseTo(.5*scale);
 const seat=worldSeats(lower)[0]!,w={...world,scene:lower},foot={...createCarAtSpawn(lower),...seat.approach,elevation:.5*scale,control:{kind:'foot' as const},vehicles:[]};
 expect(toggleRide(foot,w).seated?.objectId).toBe('seat');expect(standUp(toggleRide(foot,w),w).elevation).toBeCloseTo(.5*scale);
 expect(()=>parseScene({...lower,floors:[{...lower.floors![0]!,position:[0,.4,0]}]})).toThrow();
});
