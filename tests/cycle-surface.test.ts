import {expect,it} from 'vitest';
import * as THREE from 'three';
import source from '../docs/examples/street-world.dream?raw';
import junctionSource from '../docs/examples/cycle-junctions.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {buildStreets,buildStreetSteps} from '../src/game/streets';
import {finishBuild} from '../src/game/batching';
import {buildMaskForScene} from '../src/scene/fixture';
import {buildPaperMask} from '../src/sim/mask';
import {createCarAtSpawn} from '../src/sim/car';
import {drivingReviewStart} from '../src/game/review-start';
import {streetCycleTracks,onPolygon} from '../src/scene/streets';
import {streetCycleSurface} from '../src/scene/cycle-surface';
import {polygonArea,unionPolygons,intersectPolygons,subtractPolygons} from '../src/scene/polygons';
import {createWorldScene} from '../src/scene/world-fixture';
import {roadFootprint} from '../src/scene/road';

const identity={sceneId:'cycle',revisionId:'r1',sourceHash:'test'};
const fixture=()=>compileDreamScene(source.replace('width=80,sidewalk=24','width=100,sidewalk=24,cycle_width=20')
  .replace('street north(width=80,sidewalk=24,points=[[800,200],[800,500]])','street north(width=100,sidewalk=24,cycle_width=20,points=[[800,200],[800,1000]])'),identity);
const hit=(root:THREE.Object3D,x:number,y:number,name:string)=>{
  root.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(x-800,1000,y-600),new THREE.Vector3(0,-1,0)).intersectObject(root,true).some(h=>h.object.name===name || h.object.parent?.name===name);
};
const dispose=(root:THREE.Object3D)=>root.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material) ? n.material : [n.material])m.dispose();}});
it('carries the cycle surface across every arm of an explicit junction, without changing dedicated lanes',()=>{
  const scene=fixture(),root=buildStreets(scene);
  try{for(const [x,y] of [[800,434],[800,566],[734,500],[866,500]]){
    expect(streetCycleTracks(scene).some(p=>onPolygon(p,x!,y!))).toBe(false);
    expect(hit(root,x!,y!,'street-cycle-tracks'),`cycle connection at ${x},${y}`).toBe(true);
  }}finally{dispose(root);}
});
it('requires a declared junction and removes isolated far-side end caps when a facility ends',()=>{
  const scene=fixture();
  for(const crossings of [[],scene.crossings.map(c=>({...c,junction:false}))]){
    const ordinary={...scene,crossings};expect(streetCycleSurface(ordinary)).toEqual(streetCycleTracks(ordinary));
  }
  const north=scene.streets[1]!;
  const ending={...scene,streets:[{...scene.streets[0]!,cycleWidth:undefined},{...north,points:[north.points[0]!,{x:800,y:500}]}]};
  const surface=streetCycleSurface(ending),contains=(x:number,y:number)=>surface.some(p=>onPolygon(p,x,y));
  expect(contains(734,350)).toBe(true);expect(contains(734,520)).toBe(false);expect(contains(866,560)).toBe(false);
  expect(contains(734,500)).toBe(false);
});
it('connects successive junctions from the runnable Dream example without one clipping the other',()=>{
  const scene=compileDreamScene(junctionSource,identity),bands=streetCycleSurface(scene);
  for(const x of [500,1100])for(const y of [434,566])expect(bands.some(p=>onPolygon(p,x,y))).toBe(true);
});
it('does not invent a cycle crossing over a nearby road without the shared centerline',()=>{
  const scene=compileDreamScene(junctionSource+'street nearby(width=100,sidewalk=24,points=[[1210,200],[1210,1000]]);',identity);
  const bands=streetCycleSurface(scene);
  expect(bands.some(p=>onPolygon(p,1034,500))).toBe(true);
  expect(bands.some(p=>onPolygon(p,1166,500))).toBe(false);
});
it('keeps a returning cycle street continuous where its two ends share the same junction',()=>{
  const loop=source.replace('street north(width=80,sidewalk=24,points=[[800,200],[800,500]])','street loop(width=100,sidewalk=24,cycle_width=20,points=[[800,500],[800,200],[1200,200],[1200,500],[800,500]])');
  const scene=compileDreamScene(loop,identity),bands=streetCycleSurface(scene);
  expect(bands.some(p=>onPolygon(p,734,500))).toBe(true);
});
it('connects both sides of a T-junction and is independent of street direction and duplicate declarations',()=>{
  const scene=fixture(),north=scene.streets[1]!;
  const t={...scene,streets:[scene.streets[0]!,{...north,points:[north.points[0]!,{x:800,y:500}]}]};
  const surface=streetCycleSurface(t);
  for(const [x,y] of [[734,500],[866,500],[734,566],[866,566],[800,434]])expect(surface.some(p=>onPolygon(p,x!,y!))).toBe(true);
  for(const [x,y] of [[734,585],[866,585],[800,500]])expect(surface.some(p=>onPolygon(p,x!,y!))).toBe(false);
  const reverse={...t,streets:[...t.streets].reverse().map(s=>({...s,points:[...s.points].reverse()})),crossings:[...t.crossings,{...t.crossings[0]!,id:'duplicate'}]};
  const other=streetCycleSurface(reverse),area=(p:typeof surface)=>p.reduce((n,p)=>n+polygonArea(p),0);
  expect(area(subtractPolygons(surface,other))).toBeLessThan(1e-5);expect(area(subtractPolygons(other,surface))).toBeLessThan(1e-5);
  expect(area(surface)).toBeCloseTo(area(unionPolygons(surface)),5);
});
it('keeps centerlines and stop bars out of connected cycle paint, including wide facilities',()=>{
  const scene={...fixture(),streets:fixture().streets.map(s=>({...s,cycleWidth:40}))},root=buildStreets(scene),bands=streetCycleSurface(scene);
  try{for(const name of ['street-centerlines','crossing-stop-lines','cycle-separators']){
    let area=0;root.getObjectByName(name)?.traverse(n=>{
      if(!(n instanceof THREE.Mesh))return;const p=n.geometry.getAttribute('position'),index=n.geometry.index;
      for(let i=0;i<(index?.count??p.count);i+=3){const triangle=[0,1,2].map(k=>{const j=index?.getX(i+k)??i+k;return {x:p.getX(j)+800,y:p.getZ(j)+600};});
        area+=intersectPolygons([triangle],bands).reduce((n,p)=>n+polygonArea(p),0);
      }
    });expect(area,name).toBeLessThan(.01);
  }}finally{dispose(root);}
});
it('retains cycle continuity on both sides of a streamed chunk boundary',()=>{
  const scene=fixture(),left=finishBuild(buildStreetSteps(scene,{x0:0,y0:0,x1:800,y1:1200})),right=finishBuild(buildStreetSteps(scene,{x0:800,y0:0,x1:1600,y1:1200}));
  try{for(const y of [434,566])for(const [root,x] of [[left,799.99],[right,800.01]] as const)expect(hit(root,x,y,'street-cycle-tracks')).toBe(true);}
  finally{dispose(left);dispose(right);}
});
it('retains continuous color through the live shallow fork within existing pavement',()=>{
  const scene=createWorldScene(),bands=streetCycleSurface(scene),hospital=scene.streets.find(s=>s.id==='hospital_street')!;
  const a=hospital.points[2]!,b=hospital.points[3]!,length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
  for(let d=0;d<=240;d+=4)for(const sign of [-1,1]){
    const across=sign*(hospital.width/2+6+hospital.cycleWidth!/2),x=a.x+dx*d-dy*across,y=a.y+dy*d+dx*across;
    expect(bands.some(p=>onPolygon(p,x,y,.001)),`hospital ribbon at ${d}, ${sign}`).toBe(true);
  }
  const area=(p:typeof bands)=>p.reduce((n,p)=>n+polygonArea(p),0);
  expect(area(bands)).toBeCloseTo(area(unionPolygons(bands)),4);
  expect(area(intersectPolygons(bands,roadFootprint(scene)))).toBeLessThan(.001);
  const start=createCarAtSpawn(scene),world={scene,carRadius:11,roadMask:buildMaskForScene(scene),driveMask:buildPaperMask(14000,11000)};
  expect(drivingReviewStart(start,world,'terrace-junction')).toMatchObject({x:4470,y:7753.5,vx:0,vy:0});
  expect(drivingReviewStart(start,world,null)).toBe(start);
});
