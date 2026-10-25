import {it,expect} from 'vitest';
import {createFixtureScene} from '../src/scene/fixture';
import {parseScene,type Scene,type SceneObject} from '../src/scene/schema';
import {mockBarn} from '../src/scene/mock-landscape';
import {mockBread} from '../src/scene/mock-creations';
import {objectPlacement,shareFoundationPlacements} from '../src/scene/placement';
import {sceneContactData} from '../src/scene/contacts';

function fixture(spec:SceneObject['spec']=mockBarn){
 const scene=parseScene({...createFixtureScene(),regions:[],objects:[{id:'building',kind:'custom',labelText:'Building',x:520,y:430,headingRad:.4,scale:2,spec}],terrain:{hills:[{id:'hill',x:480,y:360,radiusX:240,radiusY:240,height:100}]}});
 return {scene,object:scene.objects[0]!};
}
it('reuses the exact immutable foundation fit without changing contacts or accepted data',()=>{
 const {scene,object}=fixture(),fit=objectPlacement(scene,object),projection={...scene,revisionId:'projected',objects:[...scene.objects]},before=JSON.stringify([scene,projection]);
 shareFoundationPlacements(projection,scene);
 expect(objectPlacement(projection,object)).toBe(fit);expect(sceneContactData(projection)).toEqual(sceneContactData(scene));expect(JSON.stringify([scene,projection])).toBe(before);
});
it('recomputes for changed terrain or a distinct object with different geometry and orientation',()=>{
 const {scene,object}=fixture(),fit=objectPlacement(scene,object),terrain:Scene={...scene,terrain:{...scene.terrain,hills:scene.terrain.hills.map(h=>({...h,height:200}))}};
 shareFoundationPlacements(terrain,scene);const high=objectPlacement(terrain,object);expect(high).not.toBe(fit);expect(high.base).toBeGreaterThan(fit.base+40);
 const changed={...object,scale:1,headingRad:1.2},projection={...scene,objects:[changed]};shareFoundationPlacements(projection,scene);
 const own=objectPlacement(projection,changed);expect(own).not.toBe(fit);expect(own.rotation.equals(fit.rotation)).toBe(false);expect(own.foundation!.width).toBe(fit.foundation!.width/2);
});
it('keeps ordinary moving props on their own scene and position cache',()=>{
 const {scene,object}=fixture(mockBread),original=objectPlacement(scene,object),projection={...scene};shareFoundationPlacements(projection,scene);
 const own=objectPlacement(projection,object);expect(own).not.toBe(original);expect(own).toEqual(original);
 const moved=objectPlacement(projection,object,480,360);expect(moved.base).toBeGreaterThan(own.base);expect(objectPlacement(scene,object)).toBe(original);expect(objectPlacement(projection,object,480,360)).toBe(moved);
});
it('neither seeds a non-authored source pose nor replaces an already owned target pose',()=>{
 const {scene,object}=fixture(),projection={...scene};objectPlacement(scene,object,400,300);shareFoundationPlacements(projection,scene);
 const own=objectPlacement(projection,object),source=objectPlacement(scene,object);expect(own).not.toBe(source);expect(own).toEqual(source);
 const moved=objectPlacement(projection,object,480,360);shareFoundationPlacements(projection,scene);expect(objectPlacement(projection,object,480,360)).toBe(moved);expect(objectPlacement(scene,object)).toBe(source);
});
