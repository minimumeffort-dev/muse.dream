import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {SunShadows} from '../src/game/sun';
import {cameraPosition} from '../src/game/camera';
import {sampleDaylight} from '../src/scene/daylight';

function view(aspect=16/9,angle=0,elevation=12,zoom=1.18,x=0,z=0){
  const half=Math.max(270,205/aspect),camera=new THREE.OrthographicCamera(-half*aspect,half*aspect,half,-half,1,10000);
  const target={x,y:elevation,z},eye=cameraPosition(target,angle);camera.position.set(eye.x,eye.y,eye.z);camera.lookAt(x,elevation,z);camera.zoom=zoom;
  camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;
}
function screenPoint(camera:THREE.OrthographicCamera,x:number,y:number,height:number){
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x,y),camera);
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),new THREE.Vector3());
}

describe('sun shadow continuity',()=>{
  it('changes projection size continuously through moving sunlight and a sports zoom transition',()=>{
    const light=new THREE.DirectionalLight(),shadows=new SunShadows(light,-40,800),camera=view();let previous:number[]|undefined,max=0;
    for(let frame=0;frame<1200;frame++){
      const phase=sampleDaylight({cycleSeconds:1200,startHour:10},frame/60),direction=new THREE.Vector3(phase.direction.x,phase.direction.y,phase.direction.z);
      camera.zoom=1.18-(1.18-.85)*(1-Math.exp(-frame/60/.35));camera.updateProjectionMatrix();shadows.update(camera,direction);
      const size=[light.shadow.camera.right,light.shadow.camera.top];if(previous)max=Math.max(max,...size.map((n,i)=>Math.abs(n-previous![i]!)));previous=size;
    }
    expect(max).toBeLessThan(8);expect(light.shadow.mapSize.toArray()).toEqual([2048,2048]);
  });
  it('covers visible receivers and their offscreen casters through hills, flight, rotation, zoom and resize',()=>{
    const light=new THREE.DirectionalLight(),shadows=new SunShadows(light,-40,800),direction=new THREE.Vector3(-300,690,220).normalize();
    for(const aspect of [9/19.5,4/3,16/9,32/9])for(const angle of [0,.6,Math.PI/2,Math.PI,Math.PI*1.5])for(const elevation of [12,190,770])for(const zoom of [.59,1.18,1.6,2.8,8.4]){
      const camera=view(aspect,angle,elevation,zoom,2300,-1800);shadows.update(camera);
      for(const x of [-1,0,1])for(const y of [-1,0,1])for(const height of [-40,0,320,800]){
        const point=screenPoint(camera,x,y,height);
        if(!point)continue; // A high plane can lie behind the camera in a wide overview.
        const caster=point.clone().addScaledVector(direction,(800-height)/direction.y);
        for(const p of [point,caster]){
          const ndc=p.project(light.shadow.camera);
          expect(Math.abs(ndc.x)).toBeLessThan(.999);expect(Math.abs(ndc.y)).toBeLessThan(.999);expect(Math.abs(ndc.z)).toBeLessThan(1);
        }
      }
    }
  });
  it('keeps fixed world shadows aligned to whole shadow pixels while the player translates and climbs',()=>{
    const light=new THREE.DirectionalLight(),shadows=new SunShadows(light,-40,800),point=new THREE.Vector3(125,60,-75),pixels=[];
    for(const [x,y,z] of [[0,12,0],[.01,12,.01],[25,47,-30],[400,190,320]]){
      shadows.update(view(16/9,0,y!,1.18,x!,z!));
      const p=point.clone().project(light.shadow.camera);pixels.push(new THREE.Vector2(p.x*1024,p.y*1024));
    }
    for(const pixel of pixels.slice(1)){
      const delta=pixel.clone().sub(pixels[0]!);
      expect(delta.x).toBeCloseTo(Math.round(delta.x),8);expect(delta.y).toBeCloseTo(Math.round(delta.y),8);
    }
    expect(pixels[1]!.distanceTo(pixels[0]!)).toBeLessThan(1e-8);
  });
  it('keeps the sun direction and grid size fixed during motion and boarding zoom',()=>{
    const light=new THREE.DirectionalLight(),shadows=new SunShadows(light,-40,800),expected=new THREE.Vector3(-300,690,220).normalize();
    for(const factor of [.5,1,3]){
      let size:number[]|undefined;
      for(const [x,height,zoom] of [[0,12,1.18],[300,160,1.5],[800,770,2.8],[4000,12,1.18]]){
        shadows.update(view(16/9,0,height!,zoom!*factor,x!,-2000),expected,1.18*factor);
        expect(light.position.clone().sub(light.target.position).normalize().distanceTo(expected)).toBeLessThan(1e-12);
        const bounds=[light.shadow.camera.right,light.shadow.camera.top];if(size)expect(bounds).toEqual(size);size=bounds;
        expect(light.shadow.mapSize.toArray()).toEqual([2048,2048]);
      }
    }
  });
});
