import {describe,it,expect} from "vitest";
import {Box3,Quaternion,Vector3} from "three";
import source from "../src/scene/world/destructible.dream?raw";
import {compileDreamWorld,checkDream} from "../src/scene/dream";
import {objectDslSchema,type ObjectDslV2,isReactive} from "../src/scene/object-dsl";
import {objectFragments} from "../src/scene/fragments";
import {objectContacts} from "../src/scene/contacts";
import {objectPlacement} from "../src/scene/placement";
import {objectSupport} from "../src/scene/object-support";
import {parseScene} from "../src/scene/schema";
import {createWorldScene} from "../src/scene/world-fixture";
import {createFixtureScene,buildMaskForScene} from "../src/scene/fixture";
import {drivingHeight} from "../src/scene/terrain";
import {buildPaperMask} from "../src/sim/mask";
import {createCarAtSpawn,stepCar,resetCar,carFootprintClear,FixedStepper,type World} from "../src/sim/car";
import {breakOnContact,advanceImpactMotion} from "../src/sim/impacts";
import {buildDamageObject,updateDamage} from "../src/game/damage";
import {buildObject} from "../src/game/world3d";
import {WorldDebris} from "../src/game/debris";
import {WorldScenery} from "../src/game/scenery";
import {WorldParticles} from "../src/game/particles";
const examples=compileDreamWorld(source),spec=(name:string)=>examples.assemblies.find(s=>s.displayName===name)!;
// Local-unit fracture replays; complete-world contacts exercise resolved sizing separately.
function worldFor(assembly:ObjectDslV2,scale=1,headingRad=0):World{
  const scene=parseScene({...createFixtureScene(),objects:[{id:"target",kind:"custom",labelText:assembly.displayName,x:480,y:360,scale,headingRad,spec:{...assembly,measure:undefined}}],regions:[],terrain:{hills:[]}});
  return {scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:11};
}
function aimed(world:World,zone=false,speed=240){
  const target=world.scene.objects[0]!,contact=objectContacts(world.scene,target).find(c=>!!c.zoneId===zone)!,angle=target.headingRad??0;
  const nx=Math.cos(angle),ny=Math.sin(angle),sign=zone ? 1 : -1;
  return {...createCarAtSpawn(world.scene),x:contact.x+nx*(contact.r+12)*sign,y:contact.y+ny*(contact.r+12)*sign,elevation:objectPlacement(world.scene,target).base,
    vx:-sign*speed*nx,vy:-sign*speed*ny,headingRad:angle+(zone ? Math.PI : 0)};
}
const idle={throttle:0,steer:0};

describe("Dream 2 destruction authoring",()=>{
  it("compiles topple, splinter and partial crumble as bounded data",()=>{
    expect(examples.assemblies).toHaveLength(6);expect(spec("Leaning birch").impact).toMatchObject({kind:"topple",duration:1.1});
    expect(objectFragments(spec("Slatted park bench"))).toHaveLength(7);
    const house=spec("Brick bakehouse");expect(house.impact).toBeUndefined();expect(house.breakZones![0]!.impact.pattern).toBe("crumble");
    expect(house.parts.filter(p=>p.zone)).toHaveLength(9);expect(objectFragments(house)).toHaveLength(8);
    const cover=house.parts.find(p=>p.zone && p.size[0]===42)!;
    expect(house.parts.filter(p=>p.fragment===cover.fragment)).toHaveLength(2);
    expect(house.parts.some(p=>!p.zone)).toBe(true);
  });
  it.each([
    source.replace('duration=1.1','duration=9'),source.replace('pattern=splinter','pattern=execute'),source.replace('duration=1.1,lifetime=8','duration=2,lifetime=2'),
    source.replace('mode=topple(speed=110,duration=1.1,lifetime=8)','mode=topple(speed=110,duration=1.1,lifetime=8,script="run")'),
    source.replace('radius=16,height=43','radius=90,height=43'),
    source.replace('zone porch','fragment invalid(){part orphan(shape=box,material=wood,at=[0,2,0],size=[4,4,4]);} zone porch'),
    source.replace('mode=break(speed=100,scatter=52,lift=52,spin=3,lifetime=7,pattern=splinter)','mode=bounce(restitution=.5,lift=.2)'),
  ])("rejects unsupported or unbounded destruction source (case %#)",bad=>{expect(bad).not.toBe(source);expect(checkDream(bad).ok).toBe(false);});
  it("rejects orphan and animated zone geometry, whole-object/zone conflicts and extra topple fragments",()=>{
    const house=spec("Brick bakehouse"),tree=spec("Leaning birch"),bench=spec("Slatted park bench");
    for(const bad of [
      {...house,parts:house.parts.map(p=>p.zone ? {...p,zone:"missing"} : p)},
      {...house,breakZones:[...house.breakZones!,house.breakZones![0]!]},
      {...house,impact:bench.impact},
      {...house,parts:house.parts.filter(p=>p.zone)},
      {...house,parts:house.parts.map((p,i)=>i===0 ? {...p,animation:{kind:"spin",axis:"z",speed:1}} : p)},
      {...tree,parts:tree.parts.map((p,i)=>({...p,fragment:i ? p.fragment : "other"}))},
    ])expect(objectDslSchema.safeParse(bad).success).toBe(false);
    expect(()=>parseScene({...worldFor(house).scene,player:house})).toThrow('driving cylinder');
  });
});

describe("distinct fracture motion",()=>{
  it("sends splinters forward while masonry drops near its original position",()=>{
    const bench=spec("Slatted park bench"),splinter=worldFor(bench),crumble=worldFor({...bench,impact:{...bench.impact as Extract<NonNullable<ObjectDslV2['impact']>,{kind:'break'}>,pattern:'crumble'}});
    const a=stepCar(aimed(splinter),idle,1/120,splinter),b=stepCar(aimed(crumble),idle,1/120,crumble);
    expect(a.debris).toHaveLength(7);expect(b.debris).toHaveLength(7);
    expect(a.debris.every(p=>p.vx>100)).toBe(true);expect(Math.max(...b.debris.map(p=>Math.abs(p.vx)))).toBeLessThan(45);
    expect(Math.max(...a.debris.map(p=>p.vz))).toBeGreaterThan(Math.max(...b.debris.map(p=>p.vz))*3);
    const gentle=stepCar(aimed(splinter,false,30),idle,1/120,splinter);expect(gentle.broken).toEqual([]);expect(gentle.debris).toEqual([]);
    const particles=new WorldParticles(splinter.scene);particles.objectImpacts(a,a.impacts,true);expect(particles.activeCount).toBe(22);
  });
  it.each(["Leaning birch","Silver spruce","Amber sapling"])("topples %s rigidly from its base and rests on the terrain",name=>{
    const world=worldFor(spec(name)),target=world.scene.objects[0]!,before=aimed(world),state=stepCar(before,idle,1/120,world);
    expect(state.broken).toEqual(['target']);expect(state.debris).toHaveLength(1);expect(state.impacts[0]!.kind).toBe('topple');
    const pivot=[...state.debris[0]!.topple!.pivot];
    for(let i=0;i<240;i++)advanceImpactMotion(state,world,1/120,false);
    const piece=state.debris[0]!;expect(piece.topple!.pivot).toEqual(pivot);expect(piece.topple!.angle).toBeGreaterThan(.6);expect(piece.settled).toBe(true);expect(piece.x).toBeGreaterThan(target.x);
    const q=new Quaternion(...piece.rotation),shape=objectFragments(target.spec as ObjectDslV2)[0]!;
    for(const local of objectSupport(world.scene,target)){
      const p=local.clone().sub(shape.center).applyQuaternion(q).add(new Vector3(piece.x,piece.elevation,piece.y));
      expect(p.y).toBeGreaterThanOrEqual(drivingHeight(world.scene.terrain,p.x,p.z)-.002);
    }
    expect(carFootprintClear(world,target.x,target.y,0,state.timeS,state)).toBe(true);
  });
  it.each([30,60,144])("replays hinged falls and partial damage exactly at %i render fps",fps=>{
    for(const name of ['Leaning birch','Brick bakehouse']){
      const world=worldFor(spec(name)),run=(rate:number)=>{let car=aimed(world,name==='Brick bakehouse');const timer=new FixedStepper();for(let f=0;f<rate*2;f++)for(let i=0,n=timer.push(1/rate);i<n;i++)car=stepCar(car,idle,timer.stepDt,world);return car;};
      expect(run(fps)).toEqual(run(60));
    }
  });
  it("supports a scaled, rotated tree falling over a hill without burying its geometry",()=>{
    const base=worldFor(spec('Leaning birch'),1.5,.7),scene=parseScene({...base.scene,terrain:{hills:[{id:'hill',x:500,y:360,radiusX:210,radiusY:250,height:65}]}}),world={...base,scene};
    const object=scene.objects[0]!,state=stepCar(aimed(world),idle,1/120,world),shape=objectFragments(object.spec as ObjectDslV2)[0]!;
    expect(state.broken).toEqual(['target']);
    for(let i=0;i<180;i++){
      advanceImpactMotion(state,world,1/120,false);const piece=state.debris[0]!,q=new Quaternion(...piece.rotation);
      for(const local of objectSupport(scene,object)){
        const p=local.clone().sub(shape.center).multiplyScalar(object.scale).applyQuaternion(q).add(new Vector3(piece.x,piece.elevation,piece.y));
        expect(p.y).toBeGreaterThanOrEqual(drivingHeight(scene.terrain,p.x,p.z)-.002);
      }
    }
    expect(state.debris[0]!.settled).toBe(true);
  });
});

describe("partial buildings retain structure and collisions",()=>{
  it("ignores gentle contacts and high jumps over a detachable section",()=>{
    const world=worldFor(spec('Brick bakehouse'));
    const gentle=stepCar(aimed(world,true,30),idle,1/120,world),high=stepCar({...aimed(world,true),elevation:100,grounded:false},idle,1/120,world);
    expect(gentle.brokenZones).toEqual([]);expect(gentle.debris).toEqual([]);expect(high.brokenZones).toEqual([]);
  });
  it("removes only the hit zone, keeps the main walls solid and restores it on full restart",()=>{
    const world=worldFor(spec('Brick bakehouse')),before=aimed(world,true),copy=structuredClone(before),state=stepCar(before,idle,1/120,world),object=world.scene.objects[0]!;
    expect(before).toEqual(copy);expect(state.broken).toEqual([]);expect(state.brokenZones).toHaveLength(1);expect(state.debris).toHaveLength(8);
    const contacts=objectContacts(world.scene,object),zone=contacts.find(c=>c.zoneId)!,core=contacts.find(c=>!c.zoneId)!;
    expect(carFootprintClear(world,zone.x,zone.y,0,state.timeS,state)).toBe(true);expect(carFootprintClear(world,core.x,core.y,0,state.timeS,state)).toBe(false);
    const intact=buildDamageObject(object),branch=intact.children.find(c=>c.userData.breakZone)!;updateDamage(intact,object.id,state);
    expect(intact.visible).toBe(true);expect(branch.visible).toBe(false);expect(intact.children.some(c=>!c.userData.breakZone && c.visible)).toBe(true);
    expect(resetCar(state,world.scene).brokenZones).toEqual(state.brokenZones);
    const restart=resetCar(state,world.scene,true);updateDamage(intact,object.id,restart);expect(restart.brokenZones).toEqual([]);expect(branch.visible).toBe(true);
    for(let i=0;i<900;i++)advanceImpactMotion(state,world,1/120,false);expect(state.debris).toEqual([]);expect(state.brokenZones).toHaveLength(1);
    expect(carFootprintClear(world,zone.x,zone.y,0,state.timeS,state)).toBe(true);
  });
  it("keeps scaled, rotated zone release geometry aligned without releasing the core",()=>{
    const world=worldFor(spec('Timber workshop'),1.4,.6),object=world.scene.objects[0]!,state=aimed(world,true);
    const contact=objectContacts(world.scene,object).find(c=>c.zoneId)!;
    breakOnContact(state,world,contact.x,contact.y,[contact]);expect(state.debris).toHaveLength(6);
    const spec2=object.spec as ObjectDslV2,zone=buildObject({...object,spec:{...spec2,parts:spec2.parts.filter(p=>p.zone)}}),placement=objectPlacement(world.scene,object);
    zone.position.set(0,placement.base+1.5,0);zone.quaternion.copy(placement.rotation);
    const visual=new WorldDebris(world.scene);visual.update(state);
    const a=new Box3().setFromObject(zone,true),b=new Box3().setFromObject(visual.group,true);
    expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
    visual.update(state,true);expect(visual.group.children.every(p=>!p.visible)).toBe(true);
    const scene=parseScene({...world.scene,terrain:{hills:[{id:'slope',x:500,y:360,radiusX:200,radiusY:230,height:90}]}});
    expect(new WorldScenery(scene).group.getObjectByName('terrain-foundations')).toBeDefined();
    const core=objectContacts(scene,scene.objects[0]!).find(c=>!c.zoneId)!;
    expect(carFootprintClear({...world,scene},core.x,core.y,objectPlacement(scene,scene.objects[0]!).base-20,0)).toBe(false);
  });
  it("damages two sections independently while retaining the same building core",()=>{
    const house=spec('Timber workshop'),second={...house.breakZones![0]!,id:'side',position:[0,0,55] as [number,number,number],radius:8,height:30};
    const assembly=objectDslSchema.parse({...house,foundation:{...house.foundation,footprint:[128,128]},breakZones:[...house.breakZones!,second],
      parts:[...house.parts,{id:'side_panel',zone:'side',shape:'box',position:[0,15,55],size:[12,30,12],material:house.parts[0]!.material}]}) as ObjectDslV2;
    const world=worldFor(assembly),first=stepCar(aimed(world,true),idle,1/120,world),model=buildDamageObject(world.scene.objects[0]!);
    updateDamage(model,'target',first);expect(first.brokenZones).toHaveLength(1);
    expect(model.children.find(c=>c.userData.breakZone==='side')!.visible).toBe(true);
    const contact=objectContacts(world.scene,world.scene.objects[0]!).find(c=>c.zoneId==='side')!;
    const after=stepCar({...first,x:contact.x,y:contact.y+contact.r+12,vx:0,vy:-240,headingRad:-Math.PI/2},idle,1/120,world);
    expect(after.brokenZones).toHaveLength(2);expect(after.broken).toEqual([]);expect(after.debris).toHaveLength(7);
    updateDamage(model,'target',after);expect(model.children.filter(c=>c.userData.breakZone).every(c=>!c.visible)).toBe(true);
    expect(carFootprintClear(world,468,360,0,after.timeS,after)).toBe(false);
  });
  it("keeps a default core cylinder separate from the outer bound of its detachable section",()=>{
    const world=worldFor({...spec('Brick bakehouse'),contacts:undefined}),state=stepCar(aimed(world,true),idle,1/120,world);
    const contacts=objectContacts(world.scene,world.scene.objects[0]!),zone=contacts.find(c=>c.zoneId)!,core=contacts.find(c=>!c.zoneId)!;
    expect(state.brokenZones).toHaveLength(1);expect(core.r).toBe(30);
    expect(carFootprintClear(world,zone.x,zone.y,0,state.timeS,state)).toBe(true);expect(carFootprintClear(world,core.x,core.y,0,state.timeS,state)).toBe(false);
  });
});

const full=createWorldScene(),fullWorld:World={scene:full,roadMask:buildMaskForScene(full),driveMask:buildPaperMask(6000,4800),carRadius:11};
describe("live destructible world",()=>{
  it("adds ten placed examples under the existing impact and fragment limits",()=>{
    expect(full.objects).toHaveLength(448);const reactive=full.objects.filter(o=>isReactive(o.spec));expect(reactive).toHaveLength(21);
    expect(reactive.reduce((sum,o)=>sum+(o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 && o.spec.impact?.kind!=='bounce' ? objectFragments(o.spec).length : 0),0)).toBe(97);
    expect(examples.objects).toHaveLength(10);
  });
  it.each(['park_bench','station_bench','orchard_workshop','wayside_bakehouse'])("allows an actual off-road impact on %s without damaging the circuit",id=>{
    const object=full.objects.find(o=>o.id===id)!,zone=objectContacts(full,object).find(c=>c.zoneId),contact=zone??objectContacts(full,object)[0]!;
    const x=contact.x+contact.r+12,y=contact.y,state={...createCarAtSpawn(full),x,y,elevation:objectPlacement(full,object).base,vx:-240,headingRad:Math.PI};
    const after=stepCar(state,idle,1/120,fullWorld);
    expect(zone ? after.brokenZones.some(z=>z.objectId===id) : after.broken.includes(id)).toBe(true);expect(after.debris.length).toBeGreaterThan(0);
    expect(after.lap).toBe(0);expect(after.nextCheckpoint).toBe(1);
  });
});
