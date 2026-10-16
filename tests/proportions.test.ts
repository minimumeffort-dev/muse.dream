import {describe,it,expect} from "vitest";
import {Box3,Vector3} from "three";
import {compileDream,compileDreamWorld,checkDream,formatDream} from "../src/scene/dream";
import {objectDslSchema} from "../src/scene/object-dsl";
import {sceneObjectSchema,parseScene} from "../src/scene/schema";
import {measuredScale,assemblyBounds,playerRadius,playerHeight,UNITS_PER_METER} from "../src/scene/measure";
import {createWorldScene,worldSource,worldModules} from "../src/scene/world-fixture";
import {createFixtureScene,buildMaskForScene} from "../src/scene/fixture";
import {objectRadius,objectHeight} from "../src/sim/archetypes";
import {createCarAtSpawn,carFootprintClear} from "../src/sim/car";
import {buildPaperMask} from "../src/sim/mask";
import {buildObject,buildPlayer} from "../src/game/world3d";
import {objectContacts} from "../src/scene/contacts";

const source=(measure='measure(kind=custom,axis=x,meters=2);')=>`dream 2;
material red(style=toon,colors=[#aa4422,#aa4422]);
object block(label="Block"){
${measure}
body(interaction=solid,radius=8,height=10);
rideable(at=[0,8,0]);
part cube(shape=box,material=red,at=[0,5,0],size=[10,10,10]);
}
place first(object=block,at=[400,400]);`;

describe("physical proportions at the Dream boundary",()=>{
  it("resolves a physical extent uniformly, retaining local geometry and scaling contacts/seats",()=>{
    const world=compileDreamWorld(source()),item=world.objects[0]!,spec=world.assemblies[0]!;
    expect(item.scale).toBe(2);expect(spec.parts[0]!.size).toEqual([10,10,10]);
    expect(new Box3().setFromObject(buildObject(item),true).getSize(new Vector3()).toArray()).toEqual([20,20,20]);
    expect(objectRadius(item)).toBe(16);expect(objectHeight(item)).toBe(20);
    expect(spec.rideable!.seat[1]*item.scale).toBe(16);
    const scene=parseScene({...createFixtureScene(),objects:[item],terrain:{hills:[]}});
    expect(objectContacts(scene,item)[0]).toMatchObject({r:16,top:20});
    expect(formatDream(formatDream(source()))).toBe(formatDream(source()));
  });
  it("preserves physical size through imports and placement variation, with legacy units unchanged",()=>{
    const world=compileDreamWorld('dream 2;asset alias(module=library,object=block);place item(object=alias,at=[400,400],scale=1.25);',{library:source()});
    expect(world.objects[0]!.scale).toBe(2.5);expect(world.objects).toHaveLength(1);
    const legacy=compileDreamWorld(source(''));
    expect(legacy.objects[0]!.scale).toBe(1);expect(legacy.assemblies[0]).not.toHaveProperty('measure');
    expect(sceneObjectSchema.safeParse({...legacy.objects[0],scale:.1}).success).toBe(false);
  });
  it("measures rotated primitives in joint rest frames rather than summing raw sizes",()=>{
    const text=source().replace('axis=x,meters=2','axis=x,meters=1').replace('part cube(', 'joint frame(at=[10,0,0],rot_deg=[0,0,90]){part cube(').replace('size=[10,10,10]);','size=[10,20,10]);}');
    const object=compileDreamWorld(text).objects[0]!;
    expect(assemblyBounds(object.spec as Parameters<typeof assemblyBounds>[0]).getSize(new Vector3()).x).toBeCloseTo(20);
    expect(new Box3().setFromObject(buildObject(object),true).getSize(new Vector3()).x).toBeCloseTo(10);
  });
  it.each([
    'measure(kind=skateboard,axis=x,meters=5);',
    'measure(kind=tree,axis=x,meters=10);',
    'measure(kind=custom,axis=x,meters=0);',
    'measure(kind=custom,axis=x,meters=60);',
    'measure(kind=dragon,axis=x,meters=2);',
    'measure(kind=custom,axis=x,meters=2);measure(kind=custom,axis=x,meters=1);',
  ])("rejects contradictory or unbounded sizing atomically: %s",measure=>{
    const result=checkDream(source(measure));expect(result.ok).toBe(false);
    if(!result.ok){expect(result.diagnostics[0]!.path).toContain('measure');expect(result).not.toHaveProperty('world');}
  });
  it("rejects oversized typed placements and permits explicitly fantastical custom sizes",()=>{
    const board=source('measure(kind=skateboard,axis=x,meters=.8);');
    expect(checkDream(board.replace('at=[400,400]','at=[400,400],scale=2')).ok).toBe(false);
    expect(compileDreamWorld(board.replace('kind=skateboard','kind=custom')).objects[0]!.scale).toBeCloseTo(.8);
    const item=compileDreamWorld(board).objects[0]!;
    expect(sceneObjectSchema.safeParse({...item,scale:item.scale*2}).success).toBe(false);
  });
  it("rejects cyclic measured joints without hanging or throwing outside schema diagnostics",()=>{
    const text=source().replace('part cube(', 'joint frame(){part cube(').replace('size=[10,10,10]);','size=[10,10,10]);}');
    const spec=compileDreamWorld(text).assemblies[0]!;
    const invalid={...spec,joints:spec.joints!.map(j=>({...j,parent:j.id}))};
    expect(objectDslSchema.safeParse(invalid).success).toBe(false);
    expect(sceneObjectSchema.safeParse({...compileDreamWorld(text).objects[0],spec:invalid}).success).toBe(false);
  });
  it("uses the player's measure for both its mesh and driving cylinder",()=>{
    const player=compileDream(source().slice(0,source().indexOf('place first')).replace('rideable(at=[0,8,0]);',''))[0]!;
    const scene=parseScene({...createFixtureScene(),player,objects:[],terrain:{hills:[]}});
    expect(playerRadius(scene)).toBe(16);expect(playerHeight(scene)).toBe(20);
    expect(new Box3().setFromObject(buildPlayer(scene),true).getSize(new Vector3()).x).toBe(20);
    const world={scene,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(960,720),carRadius:playerRadius(scene)};
    expect(carFootprintClear(world,15,360,createCarAtSpawn(scene).elevation,0)).toBe(false);
  });
});

describe("the complete mock world's proportion rules",()=>{
  const scene=createWorldScene();
  const size=(name:string)=>{const object=scene.objects.find(o=>o.spec?.displayName===name)!;return assemblyBounds(object.spec as Parameters<typeof assemblyBounds>[0]).getSize(new Vector3()).multiplyScalar(object.scale/UNITS_PER_METER);};
  it("gives every placed asset a measure and keeps the existing racing car footprint",()=>{
    expect(scene.objects.every(o=>o.spec && 'measure' in o.spec && o.spec.measure)).toBe(true);
    expect(playerRadius(scene)).toBeCloseTo(11,5);expect(playerHeight(scene)).toBeCloseTo(14,5);
    const carLength=assemblyBounds(scene.player!).getSize(new Vector3()).x*measuredScale(scene.player!)/UNITS_PER_METER;
    expect(carLength).toBeCloseTo(3.55);
    for(const object of scene.objects){
      const spec=object.spec!;if(!('measure' in spec) || spec.measure?.kind!=='tree')continue;
      expect(assemblyBounds(spec).getSize(new Vector3()).y*object.scale/UNITS_PER_METER).toBeGreaterThan(carLength);
    }
  });
  it("rejects a valid per-kind size that contradicts the player car's proportions",()=>{
    const modules={...worldModules,landmarks:worldModules.landmarks!.replace('meters=3.55','meters=6')};
    const result=checkDream(worldSource,modules);expect(result.ok).toBe(false);
    if(!result.ok)expect(result.diagnostics[0]!.code).toBe('E_SCENE_OBJECT_PROPORTIONS');
  });
  it("keeps plane, bike, skateboard, people and street furniture in a coherent hierarchy",()=>{
    expect(size('Cloudhopper plane').z).toBeCloseTo(10.8);
    expect(size('Maple skateboard').x).toBeCloseTo(.82);
    expect(size('Meadow bicycle').x).toBeCloseTo(1.8);
    expect(size('Market vendor').y).toBeCloseTo(1.8);
    expect(size('Slatted park bench').x).toBeCloseTo(1.8);
    for(const name of ['Slatted park bench']){expect(size(name).y).toBeGreaterThan(.85);expect(size(name).y).toBeLessThan(1);}
    expect(size('Cloudhopper plane').y).toBeLessThan(3.5);
    expect(size('City bus').x).toBeCloseTo(9.4);
    expect(size('River hospital').y).toBeCloseTo(16);
  });
});
