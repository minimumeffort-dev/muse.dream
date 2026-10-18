import {expect,it} from 'vitest';
import source from '../docs/examples/street-world.dream?raw';
import {compileDreamScene,checkDream} from '../src/scene/dream';
import {buildMaskForScene} from '../src/scene/fixture';
import {roadPoints,roadFrames,roadFootprint} from '../src/scene/road';
import {roadSections,roadGeometry} from '../src/game/road-surfaces';
import {curbGeometry,drapedPolygon} from '../src/game/environment';
import {createCarAtSpawn,stepCar,type World} from '../src/sim/car';
import {buildPaperMask} from '../src/sim/mask';
import {encodeSave,decodeSave} from '../src/sim/save';
import {crossingPaint} from '../src/game/crossing-paint';
import {polygonArea,unionPolygons} from '../src/scene/polygons';
const identity={sceneId:'streets',revisionId:'r1',sourceHash:'test'};
it('accepts a connected street-only world without an invisible circuit or checkpoint state',()=>{
 const scene=compileDreamScene(source,identity),roadMask=buildMaskForScene(scene),world:World={scene,roadMask,driveMask:buildPaperMask(1600,1200),carRadius:11};
 expect(scene.roadMaskRef.kind).toBe('street-network');expect(scene.checkpoints).toEqual([]);expect(roadMask.isDrivable(800,500)).toBe(true);expect(roadMask.isDrivable(400,800)).toBe(false);
 for(const data of [roadPoints(scene),roadFrames(scene),roadFootprint(scene),roadSections(scene)])expect(data).toEqual([]);
 for(const g of [roadGeometry(scene),curbGeometry(scene,1),curbGeometry(scene,-1)]){expect(g.getAttribute('position').count).toBe(0);g.dispose();}
 const start=createCarAtSpawn(scene),moved=stepCar(start,{throttle:1,steer:0},.1,world);expect(moved.x).toBeGreaterThan(start.x);expect(moved.nextCheckpoint).toBe(0);expect(moved.lap).toBe(0);expect(decodeSave(encodeSave(moved,0,world),world).state).toEqual(moved);
 const effect=drapedPolygon(scene,[{x:700,y:480},{x:900,y:480},{x:900,y:520},{x:700,y:520}],1.65);expect(effect.getAttribute('position').count).toBeGreaterThan(0);expect(Array.from(effect.getAttribute('position').array).every(Number.isFinite)).toBe(true);effect.dispose();
});
it('rejects absent infrastructure, disconnected streets and checkpoints without a circuit',()=>{
 expect(checkDream(source.replace(/street .*\n/g,'').replace(/crossing .*\n/g,'')).ok).toBe(false);
 const corner=checkDream(source+'street corner_touch(width=80,sidewalk=0,points=[[1480,580],[1480,1000]]);');expect(corner.ok).toBe(false);if(!corner.ok)expect(corner.diagnostics[0]!.code).toBe('E_SCENE_STREET_UNREACHABLE');
 expect(checkDream(source+'street isolated(width=60,sidewalk=20,points=[[100,1000],[400,1000]]);').ok).toBe(false);
 expect(checkDream(source+'checkpoint phantom(at=[800,500],dir=[1,0],width=60);').ok).toBe(false);
});
it('merges overlapping parallel zebras with one stripe phase, preserving accepted pedestrian envelopes',()=>{
 const scene=compileDreamScene(source,identity),a={id:'a',street:'main',at:{x:1100,y:500},width:24,junction:false},b={...a,id:'b',at:{x:1116,y:500}};
 const paint=crossingPaint({...scene,crossings:[a,b]});expect(paint.bands).toBe(2);expect(paint.groups).toBe(1);
 expect(paint.polygons.reduce((n,p)=>n+polygonArea(p),0)).toBeCloseTo(unionPolygons(paint.polygons).reduce((n,p)=>n+polygonArea(p),0),5);
 expect(crossingPaint({...scene,crossings:[b,a]}).polygons.reduce((n,p)=>n+polygonArea(p),0)).toBeCloseTo(paint.polygons.reduce((n,p)=>n+polygonArea(p),0),5);
});
