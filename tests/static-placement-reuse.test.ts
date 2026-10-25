import {it,expect} from 'vitest';
import roomSource from '../src/scene/world/market_interior.dream?raw';
import {compileDream} from '../src/scene/dream';
import {measuredScale} from '../src/scene/measure';
import {parseScene,type Scene,type SceneObject} from '../src/scene/schema';
import {createFixtureScene} from '../src/scene/fixture';
import {mockBirch} from '../src/scene/mock-landscape';
import {mockBread} from '../src/scene/mock-creations';
import {objectPlacement,shareStaticPlacements} from '../src/scene/placement';
import {sceneContactData} from '../src/scene/contacts';
import {sceneInteriors} from '../src/scene/interiors';
const roomSpec=compileDream(roomSource)[0]!;
function fixture(x=800,y=600){return parseScene({...createFixtureScene(),regions:[],terrain:{hills:[]},objects:[{id:'prop',kind:'custom',labelText:'Tree',x,y,scale:1,spec:mockBirch},{id:'room',kind:'custom',labelText:'Room',x:480,y:360,scale:measuredScale(roomSpec),spec:roomSpec}]});}
it('shares only an exact immutable static fit while retaining contacts and authored data',()=>{
 const scene=fixture(),object=scene.objects[0]!,fit=objectPlacement(scene,object),projection={...scene,objects:[...scene.objects]},source=JSON.stringify([scene,projection]);shareStaticPlacements(projection,scene);expect(objectPlacement(projection,object)).toBe(fit);expect(sceneContactData(projection)).toEqual(sceneContactData(scene));expect(JSON.stringify([scene,projection])).toBe(source);
});
it('keeps distant static fits across a changed interior but recomputes supports inside the changed floor',()=>{
 for(const [x,y,near] of [[800,600,false],[480,360,true]] as const){
  const scene=fixture(x,y),object=scene.objects[0]!,fit=objectPlacement(scene,object),projection:Scene={...scene,objects:[object,{...scene.objects[1]!,x:100,y:100}]};shareStaticPlacements(projection,scene);const actual=objectPlacement(projection,object),fresh=objectPlacement({...projection},object);expect(actual).toEqual(fresh);
  if(near){expect(actual).not.toBe(fit);expect(actual.base).toBeLessThan(fit.base);}else expect(actual).toBe(fit);
 }
});
it('rejects reuse for new objects, changed terrain, moving props and non-prop owners',()=>{
 const scene=fixture(),object=scene.objects[0]!,fit=objectPlacement(scene,object);
 for(const projection of [{...scene,terrain:{...scene.terrain}},{...scene,objects:[{...object},scene.objects[1]!]}]){shareStaticPlacements(projection,scene);expect(objectPlacement(projection,projection.objects[0]!)).not.toBe(fit);}
 for(const item of [{...object,spec:mockBread},{...object,role:'npc' as const}]){const source={...scene,objects:[item]},fit=objectPlacement(source,item),target={...source};shareStaticPlacements(target,source);expect(objectPlacement(target,item)).not.toBe(fit);}
});
it('preserves target ownership and moving-position invalidation rather than sharing a displaced source pose',()=>{
 const scene=fixture(),object=scene.objects[0]!,projection={...scene};objectPlacement(scene,object,700,500);shareStaticPlacements(projection,scene);const own=objectPlacement(projection,object),source=objectPlacement(scene,object);expect(own).not.toBe(source);expect(own).toEqual(source);
 const moved=objectPlacement(projection,object,600,500);shareStaticPlacements(projection,scene);expect(objectPlacement(projection,object,600,500)).toBe(moved);expect(objectPlacement(scene,object)).toBe(source);
});

it('recomputes an overhanging underside even when its pivot and collider lie outside the changed floor',()=>{
 const base=fixture(),room=sceneInteriors(base)[0]!,prop:SceneObject={...base.objects[0]!,x:room.object.x+room.room.size[0]*room.object.scale/2+12,y:room.object.y,spec:{dslVersion:1,displayName:'Overhang',body:{interaction:'solid',colliderRadius:2,colliderHeight:2},parts:[{id:'plank',shape:'box',position:[0,1,0],size:[40,2,4],material:{shaderStyle:'toon',colorA:'#777777',colorB:'#555555'}}]}},scene={...base,objects:[prop,base.objects[1]!]};
 const fit=objectPlacement(scene,prop),target={...scene,objects:[prop,{...base.objects[1]!,x:100,y:100}]};expect(fit.base).toBeGreaterThan(0);shareStaticPlacements(target,scene);const actual=objectPlacement(target,prop);expect(actual).not.toBe(fit);expect(actual.base).toBe(0);expect(actual).toEqual(objectPlacement({...target},prop));
});
it('recomputes a static fit when a new interior floor appears under it',()=>{
 const base=fixture(480,360),object=base.objects[0]!,scene={...base,objects:[object]},fit=objectPlacement(scene,object),target={...scene,objects:[object,base.objects[1]!]};shareStaticPlacements(target,scene);const actual=objectPlacement(target,object);expect(actual).not.toBe(fit);expect(actual.base).toBeGreaterThan(fit.base);expect(actual).toEqual(objectPlacement({...target},object));
});
