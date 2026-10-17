import {sceneInteriors} from '../scene/interiors';
import {tiledMesh} from './batching';
import * as THREE from 'three';
import type {Scene} from '../scene/schema';
import {sampleDaylight} from '../scene/daylight';
import {objectPlacement} from '../scene/placement';
import {surfaceGeometry} from './surface';
import {nightFactor} from './shaders';
import {DEFAULT_SUN_DIRECTION} from './sun';

type PoolRange={attribute:THREE.BufferAttribute;first:number;end:number;enabled:boolean};
const poolData=new WeakMap<THREE.Group,{last:readonly string[]|undefined;entries:Map<string,PoolRange[]>}>();
export function updateLightPools(group:THREE.Group,broken:readonly string[]):void{
 const data=poolData.get(group);if(!data || data.last===broken)return;data.last=broken;const hidden=new Set(broken);
 for(const [id,ranges] of data.entries){const enabled=!hidden.has(id);for(const range of ranges)if(range.enabled!==enabled){range.enabled=enabled;(range.attribute.array as Float32Array).fill(Number(enabled),range.first,range.end);range.attribute.needsUpdate=true;}}
}

/** Resident terrain-fitted tiles for all static lamp pools. No per-lamp lights or shadow maps. */
export function buildLightPools(doc:Scene):THREE.Group {
  const positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[],owners:number[]=[],roomLight:number[]=[],ids:string[]=[];
  for(const object of doc.objects){
    const lamp=object.spec && 'lamp' in object.spec ? object.spec.lamp : undefined;if(!lamp)continue;
    const owner=ids.length;ids.push(object.id);
    const placement=objectPlacement(doc,object),source=new THREE.Vector3(...lamp.position).multiplyScalar(object.scale).applyQuaternion(placement.rotation);
    const cx=object.x+source.x,cy=object.y+source.z,r=lamp.radius*object.scale,color=new THREE.Color(lamp.color),offset=positions.length/3;
    // Share the exact ground/deck triangles and sit above pavement/paint render layers.
    const interior=sceneInteriors(doc).find(f=>f.object.id===object.id);
    const patch=surfaceGeometry(doc,interior ? [interior.polygon] : [[{x:cx-r,y:cy-r},{x:cx+r,y:cy-r},{x:cx+r,y:cy+r},{x:cx-r,y:cy+r}]],2.05);
    if(interior){const p=patch.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,interior.floor+2.05);}
    const points=patch.getAttribute('position');
    for(let i=0;i<points.count;i++){
      const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
      positions.push(x,y,z);uvs.push((x+doc.canonical.width/2-cx)/(2*r)+.5,(z+doc.canonical.height/2-cy)/(2*r)+.5);
      color.toArray(colors,colors.length);indices.push(offset+i);owners.push(owner);roomLight.push(Number(!!interior));
    }
    patch.dispose();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('roomLight',new THREE.Float32BufferAttribute(roomLight,1));geometry.setAttribute('poolOwner',new THREE.Float32BufferAttribute(owners,1));geometry.setAttribute('enabled',new THREE.Float32BufferAttribute(new Float32Array(owners.length).fill(1),1));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({uniforms:{nightFactor},vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    vertexShader:'attribute float enabled;attribute float roomLight;varying float vRoomLight;varying float vPoolEnabled;varying vec2 vUv;varying vec3 tint;void main(){vRoomLight=roomLight;vPoolEnabled=enabled;vUv=uv;tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float nightFactor;varying float vRoomLight;varying float vPoolEnabled;varying vec2 vUv;varying vec3 tint;void main(){float r=length(vUv*2.-1.);float falloff=pow(max(0.,1.-r*r),2.);gl_FragColor=vec4(tint*.38,falloff*max(nightFactor,vRoomLight*.65)*vPoolEnabled);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const group=tiledMesh(geometry,material,800);group.name='night-light-pools';group.userData.indoor=roomLight.some(Boolean);
  const entries=new Map<string,PoolRange[]>();
  group.traverse(node=>{if(!(node instanceof THREE.Mesh))return;node.renderOrder=1;node.receiveShadow=false;
    const owner=node.geometry.getAttribute('poolOwner'),attribute=node.geometry.getAttribute('enabled') as THREE.BufferAttribute;attribute.setUsage(THREE.DynamicDrawUsage);
    for(let first=0;first<owner.count;){const id=ids[owner.getX(first)]!;let end=first+1;while(end<owner.count && owner.getX(end)===owner.getX(first))end++;const ranges=entries.get(id)??[];ranges.push({attribute,first,end,enabled:true});entries.set(id,ranges);first=end;}
    node.geometry.deleteAttribute('poolOwner');
  });poolData.set(group,{last:undefined,entries});return group;
}

const palette={skyDay:new THREE.Color('#526b76'),skyNight:new THREE.Color('#101a2c'),skyDusk:new THREE.Color('#79535e'),
  upperDay:new THREE.Color('#bad4e2'),upperNight:new THREE.Color('#9aacc7'),lowerDay:new THREE.Color('#384736'),lowerNight:new THREE.Color('#485970'),
  sun:new THREE.Color('#ffe5b8'),sunset:new THREE.Color('#ffc28d'),moon:new THREE.Color('#9dbcea')};
export class WorldDaylight {
  readonly direction=DEFAULT_SUN_DIRECTION.clone();
  readonly pools:THREE.Group;
  hour=10;
  constructor(readonly world:Scene,readonly scene:THREE.Scene,readonly hemisphere:THREE.HemisphereLight,readonly sun:THREE.DirectionalLight,readonly fill:THREE.DirectionalLight){
    if(!(scene.background instanceof THREE.Color))scene.background=new THREE.Color();
    this.pools=buildLightPools(world);scene.add(this.pools);this.update(0);
  }
  update(seconds:number,broken:readonly string[]=[]):void {
    updateLightPools(this.pools,broken);
    const config=this.world.daylight;
    if(!config){nightFactor.value=0;this.pools.visible=!!this.pools.userData.indoor;return;}
    const phase=sampleDaylight(config,seconds);this.hour=phase.hour;nightFactor.value=phase.night;
    this.direction.set(phase.direction.x,phase.direction.y,phase.direction.z);this.pools.visible=phase.night>.001 || !!this.pools.userData.indoor;
    (this.scene.background as THREE.Color).copy(palette.skyNight).lerp(palette.skyDay,phase.day).lerp(palette.skyDusk,phase.warm*.6);
    if(this.scene.fog)this.scene.fog.color.copy(this.scene.background as THREE.Color);
    this.hemisphere.color.copy(palette.upperNight).lerp(palette.upperDay,phase.day);this.hemisphere.groundColor.copy(palette.lowerNight).lerp(palette.lowerDay,phase.day);this.hemisphere.intensity=1.1+.15*phase.day;
    this.sun.color.copy(phase.moon ? palette.moon : palette.sun).lerp(palette.sunset,phase.warm);this.sun.intensity=phase.intensity;
    this.fill.intensity=.34-.04*phase.day;
  }
}
