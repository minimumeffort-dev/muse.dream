import {describe,it,expect} from 'vitest';
import {Box3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import {compileDream,compileDreamWorld} from '../src/scene/dream';
import {buildObject} from '../src/game/world3d';
import {streetPolygons,cyclePolygons,onPolygon,type Street} from '../src/scene/streets';
import {buildStreets} from '../src/game/streets';
import {roadGeometry} from '../src/game/environment';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene} from '../src/scene/fixture';
import {crossingPolygons,onWalkway} from '../src/scene/sites';
import transit from '../src/scene/world/transit_assets.dream?raw';
import sports from '../src/scene/world/sports_assets.dream?raw';
import civic from '../src/scene/world/civic_assets.dream?raw';
import impacts from '../src/scene/impact-creations.dream?raw';

const assets=[...compileDream(transit),...compileDream(sports),...compileDream(civic),...compileDreamWorld(impacts).assemblies];
function model(name:string){
  const spec=assets.find(s=>s.displayName===name)!,group=buildObject({id:'audit',kind:'custom',labelText:name,x:0,y:0,scale:1,spec});group.updateMatrixWorld(true);
  return {spec,boxes:spec.parts.map(p=>new Box3().setFromObject(group.getObjectByName(p.id)!,true))};
}
describe('constructed public-space assets',()=>{
  it.each(['Transit shelter','Basketball hoop','Breakaway table','Produce stall'])('keeps every part of %s attached to its structure',name=>{
    const {spec,boxes}=model(name),connected=new Set([0]);let changed=true;
    while(changed){changed=false;for(let i=0;i<boxes.length;i++)if(!connected.has(i) && [...connected].some(j=>boxes[i]!.clone().expandByScalar(.02).intersectsBox(boxes[j]!))){connected.add(i);changed=true;}}
    expect(connected.size).toBe(spec.parts.length);
  });
  it('rests the crate produce on its floor and retains bounded destruction groups',()=>{
    const {spec,boxes}=model('Produce crate'),floor=boxes[0]!.max.y;
    const apples=spec.parts.map((p,i)=>p.shape==='sphere' ? boxes[i]! : undefined).filter(Boolean) as Box3[];
    expect(apples).toHaveLength(3);
    for(const apple of apples)expect(Math.abs(apple.min.y-floor)).toBeLessThan(.5);
    for(const name of ['Produce crate','Breakaway table']){
      const spec=model(name).spec;expect(spec.parts.length).toBeLessThanOrEqual(32);
      expect(new Set(spec.parts.map(p=>p.fragment)).size).toBe(name==='Produce crate' ? 8 : 7);
    }
  });
});
describe('street and crossing detail',()=>{
  const bend:Street={id:'bend',width:100,cycleWidth:20,sidewalk:20,points:[{x:100,y:400},{x:400,y:400},{x:700,y:430}]};
  it('joins shallow bends without interior square-cap protrusions or cycle end caps',()=>{
    expect(streetPolygons([bend]).some(p=>onPolygon(p,449,351))).toBe(false);
    expect(streetPolygons([bend],'riding').some(p=>onPolygon(p,475,325))).toBe(false);
    const lanes=cyclePolygons([bend]);
    for(const [x,y] of [[300,466],[400,466],[500,477]])expect(lanes.some(p=>onPolygon(p,x!,y!))).toBe(true);
    expect(lanes.some(p=>onPolygon(p,40,400))).toBe(false);
    expect(bend.points[0]).toEqual({x:100,y:400});
  });
  it('opens city sidewalks and cycle tracks where the driving circuit passes through',()=>{
    const street={id:'access',width:60,cycleWidth:20,sidewalk:20,points:[{x:480,y:80},{x:480,y:360}]};
    const scene=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},streets:[street]});
    const root=buildStreets(scene),ray=new Raycaster();
    for(const [name,x] of [['street-sidewalks',414],['street-cycle-tracks',435],['cycle-separators',447]] as const){
      ray.set(new Vector3(x-480,50,129-360),new Vector3(0,-1,0));
      expect(ray.intersectObject(root.getObjectByName(name)!,true),name).toHaveLength(0);
    }
    // The removed raised pavement becomes a painted, connected pedestrian crossing.
    expect(onWalkway(scene,414,129,3.5)).toBe(true);
    ray.set(new Vector3(414-480,50,127-360),new Vector3(0,-1,0));
    expect(ray.intersectObject(root.getObjectByName('pedestrian-crossings')!,true)).toHaveLength(1);
    // A yielding cycle lane must expose asphalt, not a hole down to grass.
    const asphalt=new Mesh(roadGeometry(scene),new MeshBasicMaterial({side:DoubleSide}));asphalt.updateMatrixWorld();
    ray.set(new Vector3(435-480,50,129-360),new Vector3(0,-1,0));
    expect(ray.intersectObject(asphalt)).toHaveLength(1);
  });
  it('omits a complete cycle symbol beside a crossing instead of leaving its clipped wheel behind',()=>{
    const street={id:'main',width:100,cycleWidth:20,sidewalk:20,points:[{x:100,y:360},{x:850,y:360}]};
    const scene=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},streets:[street],crossings:[{id:'walk',street:'main',at:{x:270,y:360},width:24,junction:false}]});
    const root=buildStreets(scene),symbols=root.getObjectByName('cycle-symbols')!,ray=new Raycaster();
    const hits=(x:number)=>{ray.set(new Vector3(x-480,50,430-360),new Vector3(0,-1,0));return ray.intersectObject(symbols,true).length;};
    expect(hits(239.6)).toBe(0);expect(hits(539.6)).toBeGreaterThan(0);
  });
  it('clips stop paint out of nearby crossings and does not stack duplicate zebra stripes',()=>{
    const street={id:'main',width:100,sidewalk:20,points:[{x:100,y:360},{x:850,y:360}]};
    const crossing={id:'one',street:'main',at:{x:400,y:360},width:24,junction:false};
    const scene=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},streets:[street],crossings:[crossing,{...crossing,id:'two',at:{x:430,y:360}},{...crossing,id:'duplicate'}]});
    const root=buildStreets(scene),stops=root.getObjectByName('crossing-stop-lines')!,zebras=root.getObjectByName('pedestrian-crossings')!;
    const ray=new Raycaster();
    const faces=(group:typeof stops,x:number,y:number)=>{ray.set(new Vector3(x-480,50,y-360),new Vector3(0,-1,0));return ray.intersectObject(group,true).length;};
    expect(faces(stops,421,380)).toBe(0);
    expect(faces(stops,379,380)).toBeGreaterThan(0);
    // A point inside one stripe, away from its diagonal, gets one surface hit.
    expect(faces(zebras,399.3,358.4)).toBe(1);
    stops.traverse(n=>{if(n instanceof Mesh){const p=n.geometry.getAttribute('position');for(let i=0;i<p.count;i++)expect(crossingPolygons(scene,crossing).some(poly=>onPolygon(poly,p.getX(i)+480,p.getZ(i)+360,-.01))).toBe(false);}});
  });
});
