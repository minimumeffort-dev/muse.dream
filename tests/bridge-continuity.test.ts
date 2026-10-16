import * as THREE from "three";
import { describe,expect,it } from "vitest";
import { WorldLandscape } from "../src/game/landscape";
import { curbGeometry, roadGeometry, roadMarkingGeometry, roadSections } from "../src/game/environment";
import { tiledMesh } from "../src/game/batching";
import { surfaceGeometry, surfaceHeight } from "../src/game/surface";
import { createWorldScene } from "../src/scene/world-fixture";
import { createFixtureScene, buildMaskForScene } from "../src/scene/fixture";
import { bridgeAt, bridgeCoordinates, type Bridge } from "../src/scene/landscape-dsl";
import { bridgeFitsRoad, roadFrames, ROAD_SURFACE_LIFT } from "../src/scene/road";
import { parseScene } from "../src/scene/schema";
import { validateScenePlayability } from "../src/scene/validate";

const doc=createWorldScene(),bridge=doc.terrain.landscape!.bridges[0]!;
const landscape=new WorldLandscape(doc),deck=landscape.group.getObjectByName(`bridge-${bridge.id}`)!;
const road=tiledMesh(roadGeometry(doc),new THREE.MeshBasicMaterial());
const paint=tiledMesh(roadMarkingGeometry(doc),new THREE.MeshBasicMaterial());
for(const object of [deck,road,paint])object.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
function hits(object:THREE.Object3D,x:number,y:number) {
  ray.set(new THREE.Vector3(x-doc.canonical.width/2,600,y-doc.canonical.height/2),new THREE.Vector3(0,-1,0));
  return ray.intersectObject(object,true);
}

describe("one continuous road across a bridge",()=>{
  it("joins the full asphalt approach to a timber driving surface",()=>{
    let checked=0;
    for(const p of roadFrames(doc)) {
      const local=bridgeCoordinates(bridge,p.x,p.y);
      if(local.t<-.15 || local.t>1.15 || Math.abs(local.across)>bridge.width/2)continue;
      for(const fraction of [-.98,-.5,0,.5,.98]) {
        const offset=doc.roadMaskRef.params.roadWidth/2*fraction,x=p.x+p.nx*offset,y=p.y+p.ny*offset;
        const timber=bridgeAt(doc.terrain.landscape,x,y)?.style==="timber";
        const surface=hits(timber ? deck : road,x,y)[0];expect(surface,`missing driving surface at ${x},${y}`).toBeDefined();
        expect(surface!.point.y).toBeCloseTo(surfaceHeight(doc,x,y)+ROAD_SURFACE_LIFT,3);
        expect(hits(timber ? road : deck,x,y)).toHaveLength(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(150);
  });
  it("covers the deck exactly once, with no holes or competing top faces",()=>{
    let timber=0;
    const {ux,uy}=bridgeCoordinates(bridge,bridge.a.x,bridge.a.y);
    for(let i=0;i<31;i++)for(let j=0;j<17;j++) {
      const t=(i+.37)/31,across=((j+.61)/17-.5)*bridge.width;
      const x=bridge.a.x+(bridge.b.x-bridge.a.x)*t-uy*across,y=bridge.a.y+(bridge.b.y-bridge.a.y)*t+ux*across;
      const a=hits(road,x,y)[0],b=hits(deck,x,y)[0];
      expect(Number(!!a)+Number(!!b),`surface ownership at ${t},${across}`).toBe(1);
      expect((a??b)!.point.y).toBeCloseTo(surfaceHeight(doc,x,y)+ROAD_SURFACE_LIFT,3);
      expect(a).toBeUndefined();if(b)timber++;
    }
    expect(timber).toBe(31*17);
  });
  it("stops painted dashes and raised curbs at timber banks",()=>{
    const sections=roadSections(doc),curbs=[-1,1].map(side=>tiledMesh(curbGeometry(doc,side as -1|1),new THREE.MeshBasicMaterial()));
    curbs.forEach(curb=>curb.updateMatrixWorld(true));let checked=0;
    for(let i=1;i<sections.length;i++) {
      const a=sections[i-1]!,b=sections[i]!,distance=(a.distance+b.distance)/2;
      const x=(a.x+b.x)/2,y=(a.y+b.y)/2,local=bridgeCoordinates(bridge,x,y);
      if(local.t<.02 || local.t>.98 || Math.abs(local.across)>bridge.width/2 || distance%48>=22)continue;
      const marking=hits(paint,x,y)[0],asphalt=hits(road,x,y)[0];
      expect(marking).toBeUndefined();expect(asphalt).toBeUndefined();
      for(const [i,side] of [-1,1].entries()) {
        const half=doc.roadMaskRef.params.roadWidth/2,cx=x+(a.nx+b.nx)/2*half*side,cy=y+(a.ny+b.ny)/2*half*side;
        const contacts=hits(curbs[i]!,cx,cy);
        if(bridgeAt(doc.terrain.landscape,cx,cy)?.style==="timber")expect(contacts).toHaveLength(0);
        else expect(contacts.length).toBeGreaterThan(0);
      }
      expect(hits(deck,x,y).length).toBeGreaterThan(0);checked++;
    }
    expect(checked).toBeGreaterThan(8);
  });
  it("has no height step at either open end",()=>{
    const frames=roadFrames(doc);let ends=0;
    for(const target of [0,1])for(let i=1;i<frames.length;i++) {
      const a=frames[i-1]!,b=frames[i]!,start=bridgeCoordinates(bridge,a.x,a.y),end=bridgeCoordinates(bridge,b.x,b.y);
      if((start.t-target)*(end.t-target)>0 || Math.abs(start.across)>bridge.width/2 || Math.abs(end.t-start.t)<1e-9)continue;
      const t=(target-start.t)/(end.t-start.t),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      const x=a.x+dx*t,y=a.y+dy*t;
      const surfaceAt=(x:number,y:number)=>hits(road,x,y)[0] ?? hits(deck,x,y)[0];
      const before=surfaceAt(x-dx/length*.02,y-dy/length*.02)!,after=surfaceAt(x+dx/length*.02,y+dy/length*.02)!;
      expect(Math.abs(after.point.y-before.point.y)).toBeLessThan(.03);ends++;
    }
    expect(ends).toBe(2);
  });
  it("tapers both curb sections into the timber without exposed ends",()=>{
    const frames=roadFrames(doc),half=doc.roadMaskRef.params.roadWidth/2;let checked=0;
    for(const side of [-1,1] as const) {
      const curb=tiledMesh(curbGeometry(doc,side),new THREE.MeshBasicMaterial());curb.updateMatrixWorld(true);
      for(const target of [0,1])for(let i=1;i<frames.length;i++) {
        const p=frames[i-1]!,q=frames[i]!;
        const a={x:p.x+p.nx*half*side,y:p.y+p.ny*half*side},b={x:q.x+q.nx*half*side,y:q.y+q.ny*half*side};
        const start=bridgeCoordinates(bridge,a.x,a.y),end=bridgeCoordinates(bridge,b.x,b.y);
        if((start.t-target)*(end.t-target)>0 || Math.abs(start.across)>bridge.width/2 || Math.abs(end.t-start.t)<1e-9)continue;
        const t=(target-start.t)/(end.t-start.t),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),sign=target===0 ? -1 : 1;
        for(const [distance,lift] of [[.1,1.5],[40,3.1]]) {
          const x=a.x+dx*t+sign*dx/length*distance!,y=a.y+dy*t+sign*dy/length*distance!;
          expect(hits(curb,x,y)[0]!.point.y-surfaceHeight(doc,x,y)).toBeCloseTo(lift!,1);
        }
        checked++;
      }
    }
    expect(checked).toBe(4);
  });
  it("retains asphalt over a stone road bridge",()=>{
    const stone=structuredClone(doc);stone.terrain.landscape!.bridges[0]!.style="stone";
    const paved=tiledMesh(roadGeometry(stone),new THREE.MeshBasicMaterial());
    const shoulder=new WorldLandscape(stone).group.getObjectByName(`bridge-${bridge.id}`)!;
    paved.updateMatrixWorld(true);shoulder.updateMatrixWorld(true);
    const frame=roadFrames(stone).find(p=>Math.abs(bridgeCoordinates(bridge,p.x,p.y).t-.5)<.01)!;
    expect(hits(paved,frame.x,frame.y).length).toBeGreaterThan(0);
    expect(hits(shoulder,frame.x,frame.y)).toHaveLength(0);
  });
  it("retains the complete top of an off-road footbridge",()=>{
    const foot=doc.terrain.landscape!.bridges[1]!,mesh=landscape.group.getObjectByName(`bridge-${foot.id}`)!;
    const x=(foot.a.x+foot.b.x)/2,y=(foot.a.y+foot.b.y)/2;
    expect(hits(mesh,x,y)[0]!.point.y).toBeCloseTo(surfaceHeight(doc,x,y)+ROAD_SURFACE_LIFT,3);
  });
});

describe("bridge/road semantic validation",()=>{
  const crossing:Bridge={id:"road-crossing",a:{x:300,y:591},b:{x:660,y:591},width:156,archHeight:12,style:"timber",rails:true};
  const make=(bridge:Bridge)=>parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[],landscape:{dslVersion:1,waters:[],bridges:[bridge]}}});
  it.each([
    {...crossing,width:120},
    {...crossing,a:{x:300,y:660},b:{x:660,y:660}},
    {...crossing,a:{x:480,y:500},b:{x:480,y:680}},
    {...crossing,a:{x:450,y:561},b:{x:510,y:621},width:240},
  ])("rejects a clipped, narrow or sideways crossing ($a.x,$a.y → $b.x,$b.y)",bridge=>{
    const scene=make(bridge);
    expect(bridgeFitsRoad(scene,bridge)).toBe(false);
    expect(validateScenePlayability(scene,buildMaskForScene(scene),11)).toContainEqual(expect.objectContaining({code:"bridge-road-disconnected"}));
  });
  it("accepts either end order, curved contained crossings and unrelated footbridges",()=>{
    for(const bridge of [crossing,{...crossing,a:crossing.b,b:crossing.a},{...crossing,a:{x:300,y:360},b:{x:660,y:360},width:100}])
      expect(validateScenePlayability(make(bridge),buildMaskForScene(make(bridge)),11)).toEqual([]);
    expect(bridgeFitsRoad(doc,doc.terrain.landscape!.bridges[0]!)).toBe(true);
    expect(bridgeFitsRoad(doc,doc.terrain.landscape!.bridges[1]!)).toBe(true);
  });
});

it("subtracts a top-face opening without gaps, overlap or dependence on polygon winding",()=>{
  const scene=parseScene({...createFixtureScene(),terrain:{hills:[]},objects:[],regions:[]});
  const outer=[{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}],hole=[{x:140,y:80},{x:160,y:80},{x:160,y:220},{x:140,y:220}];
  for(const outline of [hole,[...hole].reverse()]) {
    const geometry=surfaceGeometry(scene,[outer],0,undefined,()=>0,[outline]),p=geometry.getAttribute("position");let area=0;
    for(let i=0;i<p.count;i+=3) {
      const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
      area+=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).length()/2;
    }
    expect(area).toBeCloseTo(8000,4);geometry.dispose();
  }
});
