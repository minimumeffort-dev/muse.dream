import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildObject } from "../src/game/world3d";
import { WorldScenery } from "../src/game/scenery";
import { createFixtureScene, buildMaskForScene } from "../src/scene/fixture";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import { parseScene, type Scene, type SceneObject } from "../src/scene/schema";
import { objectPlacement } from "../src/scene/placement";
import { drivingHeight, terrainSurfaceHeight } from "../src/scene/terrain";
import { mockOak, mockRock, mockMushroomRover } from "../src/scene/mock-objects";
import { mockSlab, mockFallenLog } from "../src/scene/mock-landscape";
import { mockBread, mockPerson, mockSculptedRock } from "../src/scene/mock-creations";
import { objectHeight, objectRadius } from "../src/sim/archetypes";
import { objectDslSchema } from "../src/scene/object-dsl";
import { sampleTerrain } from "../src/scene/terrain";
import { buildPaperMask } from "../src/sim/mask";
import { createCarAtSpawn, stepCar } from "../src/sim/car";

const item = (spec: SceneObject["spec"],scale=1): SceneObject => ({id:"test",kind:"custom",labelText:"Object",x:540,y:430,scale,spec});
const sceneFor = (object: SceneObject): Scene => parseScene({...createFixtureScene(),regions:[],objects:[object],terrain:{hills:[{id:"hill",x:480,y:360,radiusX:240,radiusY:240,height:200}]}});

function clearance(doc: Scene,object: SceneObject,x=object.x,y=object.y) {
  const group=buildObject(object),placement=objectPlacement(doc,object,x,y);
  group.position.set(x,placement.base+1.5,y);group.quaternion.copy(placement.rotation);group.updateMatrixWorld(true);
  let lowest=Infinity;
  group.traverse(child=>{
    if (!(child instanceof THREE.Mesh)) return;
    const vertices=child.geometry.getAttribute("position");
    for (let i=0;i<vertices.count;i++) {
      const p=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(child.matrixWorld);
      lowest=Math.min(lowest,p.y-Math.max(drivingHeight(doc.terrain,p.x,p.z),terrainSurfaceHeight(doc.terrain,p.x,p.z)));
    }
    child.geometry.dispose();
  });
  return lowest;
}

describe("objects supported on hills",()=>{
  it("aligns surface objects rigidly while keeping trees upright and foundations level",()=>{
    const log=item(mockFallenLog),doc=sceneFor(log),slope=sampleTerrain(doc.terrain,log.x,log.y);
    const normal=new THREE.Vector3(-slope.dx,1,-slope.dy).normalize();
    expect(new THREE.Vector3(0,1,0).applyQuaternion(objectPlacement(doc,log).rotation).distanceTo(normal)).toBeLessThan(1e-9);
    const tree=item(mockOak);
    expect(objectPlacement(sceneFor(tree),tree).rotation.equals(new THREE.Quaternion())).toBe(true);
    expect(objectDslSchema.safeParse({...mockFallenLog,grounding:"anything"}).success).toBe(false);
    expect(objectDslSchema.safeParse({...mockFallenLog,foundation:{footprint:[48,20],color:"#887766"}}).success).toBe(false);
  });
  it("rests a long log on its underside instead of leaving a whole-assembly hover gap",()=>{
    const object=item(mockFallenLog,2),doc=sceneFor(object),placement=objectPlacement(doc,object),group=buildObject(object);
    group.position.set(object.x,placement.base+1.5,object.y);group.quaternion.copy(placement.rotation);group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group,true),ray=new THREE.Raycaster();let gap=Infinity;
    for(let x=bounds.min.x;x<=bounds.max.x;x+=1)for(let y=bounds.min.z;y<=bounds.max.z;y+=1){
      const ground=Math.max(drivingHeight(doc.terrain,x,y),terrainSurfaceHeight(doc.terrain,x,y));
      ray.set(new THREE.Vector3(x,ground-2,y),new THREE.Vector3(0,1,0));
      const hit=ray.intersectObject(group,true)[0];if(hit)gap=Math.min(gap,hit.point.y-ground);
    }
    expect(gap).toBeGreaterThan(.5);expect(gap).toBeLessThan(2);
  });
  it.each(["tree","cone","tire-stack"] as const)("keeps the original %s archetype above the slope",kind=>{
    const object: SceneObject={id:"original",kind,labelText:kind,x:540,y:430,scale:2};
    expect(clearance(sceneFor(object),object)).toBeGreaterThanOrEqual(1.49);
  });
  it("keeps rotated rocks, logs, trees, food and people clear at different scales",()=>{
    for (const spec of [mockOak,mockRock,mockSlab,mockFallenLog,mockBread,mockPerson,mockSculptedRock,mockMushroomRover])
      for (const scale of [.5,1,2]) {
        const object=item(spec,scale),doc=sceneFor(object),gap=clearance(doc,object);
        expect(gap,`${spec.displayName} × ${scale}`).toBeGreaterThanOrEqual(1.49);
      }
  });
  it("places every current world assembly above the rendered surface",()=>{
    const doc=createWorldScene();
    for (const object of doc.objects) expect(clearance(doc,object),object.id).toBeGreaterThanOrEqual(-.001);
  });
  it("samples the interior of a broad base over an off-center crest",()=>{
    const object=item({...mockSculptedRock,grounding:"upright",parts:[{...mockSculptedRock.parts[0]!,shape:"box",position:[60,2,0],size:[128,4,128],deform:undefined}]});
    object.x=400;object.y=360;
    const doc=parseScene({...createFixtureScene(),objects:[object],terrain:{hills:[{id:"crest",x:500,y:360,radiusX:120,radiusY:120,height:200}]}});
    const placement=objectPlacement(doc,object);
    expect(placement.base).toBeGreaterThan(drivingHeight(doc.terrain,object.x,object.y)+180);
    for (let dx=-4;dx<=124;dx+=2) for (let dz=-64;dz<=64;dz+=2)
      expect(placement.base+1.5).toBeGreaterThan(terrainSurfaceHeight(doc.terrain,object.x+dx,object.y+dz));
  });
  it("includes nested joint rest transforms without stretching or tilting the assembly",()=>{
    const object=item({...mockPerson,joints:[{id:"root",position:[22,8,-4],rotation:[.3,.4,-.2]},{id:"child",parent:"root",position:[-8,1,9],rotation:[-.4,.2,.5]}],
      parts:[{...mockSculptedRock.parts[0]!,parent:"child",rotation:[.2,-.3,.4]}]});
    const doc=sceneFor(object);
    expect(clearance(doc,object)).toBeGreaterThanOrEqual(1.49);
  });
  it("refreshes moving props at their current position while caching stationary contacts",()=>{
    const object=item(mockBread),doc=sceneFor(object);
    const first=objectPlacement(doc,object);
    expect(objectPlacement(doc,object)).toBe(first);
    const moved=objectPlacement(doc,object,480,360);
    expect(moved.base).toBeGreaterThan(first.base+50);
    expect(objectPlacement(doc,object,480,360)).toBe(moved);
    expect(clearance(doc,object,480,360)).toBeGreaterThanOrEqual(1.49);
    expect(objectPlacement(doc,object).base).toBeCloseTo(first.base,9);
  });
  it("uses the raised base for static landings and prop hit/overflight tests",()=>{
    const spec={...mockSlab,grounding:"upright" as const,parts:[{...mockSlab.parts[0]!,shape:"box" as const,position:[0,2,0] as [number,number,number],size:[60,4,40] as [number,number,number]}]};
    const object=item(spec,2);
    const doc=sceneFor(object),top=objectPlacement(doc,object).base+objectHeight(object);
    const world={scene:doc,roadMask:buildMaskForScene(doc),driveMask:buildPaperMask(960,720),carRadius:11};
    let car={...createCarAtSpawn(doc),x:object.x,y:object.y,elevation:top+1,vz:-60,grounded:false};
    for(let i=0;i<10;i++) car=stepCar(car,{throttle:0,steer:0},1/120,world);
    expect(car.grounded).toBe(true);expect(car.elevation).toBeCloseTo(top,6);
    const moving=item({...spec,body:{...spec.body,interaction:"knockable"}},2);
    moving.x=200;moving.y=100;
    const movingDoc=sceneFor(moving),movingWorld={...world,scene:movingDoc};
    const hit=(elevation:number)=>stepCar({...createCarAtSpawn(movingDoc),x:object.x-objectRadius(moving)-10,y:object.y,elevation,grounded:false,
      props:[{id:moving.id,x:object.x,y:object.y,vx:0,vy:0}]}, {throttle:0,steer:0},1/120,movingWorld);
    expect(top).toBeGreaterThan(drivingHeight(doc.terrain,object.x,object.y)+objectHeight(object)+20);
    expect(hit(top-2).props[0]!.vx).toBeGreaterThan(0);
    expect(hit(top+2).props[0]!.vx).toBe(0);
  });
  it("puts instanced scenery at the same supported elevation as the source assembly",()=>{
    const object=item(mockSculptedRock,2),doc=sceneFor(object),source=buildObject(object);
    source.position.set(object.x-480,objectPlacement(doc,object).base+1.5,object.y-360);source.quaternion.copy(objectPlacement(doc,object).rotation);
    const scenery=new WorldScenery(doc).group;
    const a=new THREE.Box3().setFromObject(source,true),b=new THREE.Box3();scenery.updateMatrixWorld(true);
    // An InstancedMesh's cached AABB is conservative after rotation; inspect its actual vertices.
    scenery.traverse(child=>{
      if(!(child instanceof THREE.InstancedMesh))return;
      const vertices=child.geometry.getAttribute("position"),matrix=new THREE.Matrix4();
      for(let i=0;i<child.count;i++){
        child.getMatrixAt(i,matrix);matrix.premultiply(child.matrixWorld);
        for(let j=0;j<vertices.count;j++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(vertices,j).applyMatrix4(matrix));
      }
    });
    expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
  });
});
