import {tiledMesh} from './batching';
import * as THREE from 'three';
import type {Scene} from '../scene/schema';
import {sampleDaylight} from '../scene/daylight';
import {objectPlacement} from '../scene/placement';
import {surfaceGeometry} from './surface';
import {nightFactor} from './shaders';
import {DEFAULT_SUN_DIRECTION} from './sun';

/** Resident terrain-fitted tiles for all static lamp pools. No per-lamp lights or shadow maps. */
export function buildLightPools(doc:Scene):THREE.Group {
  const positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
  for(const object of doc.objects){
    const lamp=object.spec && 'lamp' in object.spec ? object.spec.lamp : undefined;if(!lamp)continue;
    const placement=objectPlacement(doc,object),source=new THREE.Vector3(...lamp.position).multiplyScalar(object.scale).applyQuaternion(placement.rotation);
    const cx=object.x+source.x,cy=object.y+source.z,r=lamp.radius*object.scale,color=new THREE.Color(lamp.color),offset=positions.length/3;
    // Share the exact ground/deck triangles and sit above pavement/paint render layers.
    const patch=surfaceGeometry(doc,[[{x:cx-r,y:cy-r},{x:cx+r,y:cy-r},{x:cx+r,y:cy+r},{x:cx-r,y:cy+r}]],2.05);
    const points=patch.getAttribute('position');
    for(let i=0;i<points.count;i++){
      const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
      positions.push(x,y,z);uvs.push((x+doc.canonical.width/2-cx)/(2*r)+.5,(z+doc.canonical.height/2-cy)/(2*r)+.5);
      color.toArray(colors,colors.length);indices.push(offset+i);
    }
    patch.dispose();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({uniforms:{nightFactor},vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    vertexShader:'varying vec2 vUv;varying vec3 tint;void main(){vUv=uv;tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float nightFactor;varying vec2 vUv;varying vec3 tint;void main(){float r=length(vUv*2.-1.);float falloff=pow(max(0.,1.-r*r),2.);gl_FragColor=vec4(tint*.38,falloff*nightFactor);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const group=tiledMesh(geometry,material,800);group.name='night-light-pools';
  group.traverse(node=>{if(node instanceof THREE.Mesh){node.renderOrder=1;node.receiveShadow=false;}});return group;
}

const palette={skyDay:new THREE.Color('#526b76'),skyNight:new THREE.Color('#101a2c'),skyDusk:new THREE.Color('#79535e'),
  upperDay:new THREE.Color('#bad4e2'),upperNight:new THREE.Color('#7391ba'),lowerDay:new THREE.Color('#384736'),lowerNight:new THREE.Color('#1c293a'),
  sun:new THREE.Color('#ffe5b8'),sunset:new THREE.Color('#ffc28d'),moon:new THREE.Color('#9dbcea')};
export class WorldDaylight {
  readonly direction=DEFAULT_SUN_DIRECTION.clone();
  readonly pools:THREE.Group;
  hour=10;
  constructor(readonly world:Scene,readonly scene:THREE.Scene,readonly hemisphere:THREE.HemisphereLight,readonly sun:THREE.DirectionalLight,readonly fill:THREE.DirectionalLight){
    if(!(scene.background instanceof THREE.Color))scene.background=new THREE.Color();
    this.pools=buildLightPools(world);scene.add(this.pools);this.update(0);
  }
  update(seconds:number):void {
    const config=this.world.daylight;
    if(!config){nightFactor.value=0;this.pools.visible=false;return;}
    const phase=sampleDaylight(config,seconds);this.hour=phase.hour;nightFactor.value=phase.night;
    this.direction.set(phase.direction.x,phase.direction.y,phase.direction.z);this.pools.visible=phase.night>.001;
    (this.scene.background as THREE.Color).copy(palette.skyNight).lerp(palette.skyDay,phase.day).lerp(palette.skyDusk,phase.warm*.6);
    if(this.scene.fog)this.scene.fog.color.copy(this.scene.background as THREE.Color);
    this.hemisphere.color.copy(palette.upperNight).lerp(palette.upperDay,phase.day);this.hemisphere.groundColor.copy(palette.lowerNight).lerp(palette.lowerDay,phase.day);this.hemisphere.intensity=.48+.77*phase.day;
    this.sun.color.copy(phase.moon ? palette.moon : palette.sun).lerp(palette.sunset,phase.warm);this.sun.intensity=phase.intensity;
    this.fill.intensity=.16+.14*phase.day;
  }
}
