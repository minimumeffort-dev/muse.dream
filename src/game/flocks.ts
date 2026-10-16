import * as THREE from 'three';
import type {Scene} from '../scene/schema';
import {flockBase,seededRandom} from '../scene/population';
import {measuredScale} from '../scene/measure';
import {buildObject} from './world3d';
import {batchPrototype} from './scenery';
import {flockMaterial,flockDepthMaterial} from './shaders';

/** Resident cosmetic populations use instanced GPU flight, without an NPC, joint clock or rigid body per bird. */
export function buildFlocks(scene:Scene):THREE.Group{
  const root=new THREE.Group();root.name='decorative-flocks';
  for(const flock of scene.flocks){
    const scale=measuredScale(flock.spec),base=flockBase(scene,flock),random=seededRandom(flock.seed);
    const prototype=batchPrototype(buildObject({id:flock.id,kind:'custom',labelText:flock.spec.displayName,x:0,y:0,scale:1,spec:flock.spec}));
    const flight=new Float32Array(flock.count*4);
    for(let i=0;i<flock.count;i++){
      flight[i*4]=random()*Math.PI*2;flight[i*4+1]=.25+random()*.7;
      flight[i*4+2]=random()*Math.PI*2;flight[i*4+3]=.85+random()*.3;
    }
    for(const child of prototype.children){
      if(!(child instanceof THREE.Mesh))continue;
      const geometry=child.geometry as THREE.BufferGeometry;
      geometry.setAttribute('flight',new THREE.InstancedBufferAttribute(flight,4));
      const mesh=new THREE.InstancedMesh(geometry,flockMaterial(child.material as THREE.Material,flock,scale),flock.count);
      mesh.name=`flock-${flock.id}`;
      const matrix=new THREE.Matrix4().makeScale(scale,scale,scale);for(let i=0;i<flock.count;i++)mesh.setMatrixAt(i,matrix);
      mesh.position.set(flock.center.x-scene.canonical.width/2,base,flock.center.y-scene.canonical.height/2);
      // Shader movement has one conservative bound for every phase, shared by camera and shadow culling.
      mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(flock.radius.x,flock.radius.y)+40);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=flockDepthMaterial(flock,scale);root.add(mesh);
    }
  }
  return root;
}
