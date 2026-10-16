import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {sceneSchema} from '../src/scene/schema';
import {sampleDaylight,daylightSchema} from '../src/scene/daylight';
import {compileDreamScene,checkDream,formatDream,compileDream} from '../src/scene/dream';
import {WorldDaylight,buildLightPools} from '../src/game/daylight';
import {buildObject} from '../src/game/world3d';
import {compactObject} from '../src/game/compact-object';
import {nightFactor} from '../src/game/shaders';
import {terrainSurfaceHeight,drivingHeight} from '../src/scene/terrain';
import {SunShadows} from '../src/game/sun';
import {cameraPosition} from '../src/game/camera';

const source=readFileSync('docs/examples/day-night.dream','utf8'),identity={sceneId:'sky',revisionId:'r1',sourceHash:'fixture'};
const scene=compileDreamScene(source,identity);
describe('Dream daylight',()=>{
 it('round-trips bounded clock, night material and static light data without changing legacy defaults',()=>{
  expect(compileDreamScene(formatDream(source),identity)).toEqual(scene);
  expect(scene.daylight).toEqual({cycleSeconds:600,startHour:17});
  expect(scene.objects[0]!.spec).toMatchObject({lamp:{position:[0,38,0],radius:30,color:'#ffd18a'}});
  expect(compileDreamScene(source.replace('daylight(cycle_s=600,start_hour=17);',''),identity).daylight).toBeUndefined();
  for(const invalid of [source.replace('cycle_s=600','cycle_s=0'),source.replace('start_hour=17','start_hour=24'),source+'daylight(cycle_s=600,start_hour=10);',source.replace('radius=30,color','radius=81,color'),source.replace('night=#ffd18a','night="script"'),source.replace('role=prop','role=npc'),source.replace('lamp(at=[0,38,0],radius=30,color=#ffd18a);','repeat copies(index=i,count=2){lamp(at=[0,38,0],radius=30,color=#ffd18a);}'),source.replace('body(interaction=solid','body(interaction=knockable')])expect(checkDream(invalid).ok).toBe(false);
 });
 it('bounds the complete linked light population without consuming actor or joint slots',()=>{
  const result=sceneSchema.safeParse({...scene,objects:Array.from({length:513},(_,i)=>({...scene.objects[0]!,id:'lamp_'+i}))});
  expect(result.success).toBe(false);if(!result.success)expect(result.error.issues.some(i=>i.message==='scene exceeds 512 light pools')).toBe(true);
 });
 it('is periodic and gives a readable night, warm twilight and a dark handoff between sun and moon',()=>{
  const config=daylightSchema.parse({cycleSeconds:600,startHour:0});
  expect(sampleDaylight(config,0)).toEqual(sampleDaylight(config,600));
  expect(sampleDaylight(config,300).day).toBe(1);expect(sampleDaylight(config,0).night).toBe(1);
  expect(sampleDaylight(config,162.5).warm).toBeGreaterThan(0);
  for(const hour of [6,18]){
   const before=sampleDaylight({...config,startHour:hour-.0001},0),after=sampleDaylight({...config,startHour:hour+.0001},0);
   expect(before.intensity).toBeLessThan(.00001);expect(after.intensity).toBeLessThan(.00001);
   expect(Math.abs(before.night-after.night)).toBeLessThan(.001);
  }
  for(let t=0;t<600;t+=.5){const p=sampleDaylight(config,t);expect(p.direction.y).toBeGreaterThan(.3);expect(Math.hypot(...Object.values(p.direction))).toBeCloseTo(1);}
 });
 it('preserves per-part night paint while merging differently colored walls and windows',()=>{
  const spec=compileDream('dream 2;material wall(style=toon,colors=[#775544,#775544]);material glass(style=toon,colors=[#668899,#668899],night=#ffd18a);object house(label="House"){body(interaction=solid,radius=8,height=20);part wall(shape=box,material=wall,at=[0,10,0],size=[16,20,16]);part glass(shape=box,material=glass,at=[0,12,-8],size=[8,8,1]);}')[0]!;
  const object={id:'house',kind:'custom' as const,labelText:'House',x:0,y:0,scale:1,spec},raw=buildObject(object);
  const collect=(group:THREE.Group)=>{const values:number[]=[];group.traverse(node=>{if(node instanceof THREE.Mesh){const attr=node.geometry.getAttribute('nightEmission');for(let i=0;i<(node.geometry.index?.count??attr.count);i++){const index=node.geometry.index?.getX(i)??i;values.push(attr.getX(index),attr.getY(index),attr.getZ(index));}}});return values.sort((a,b)=>a-b);};
  const before=collect(raw),merged=compactObject(raw);expect(merged.children).toHaveLength(1);expect(collect(merged)).toEqual(before);expect(before.some(v=>v>0)).toBe(true);expect(before).toContain(0);
 });
 it('fits every lamp-pool vertex to the accepted terrain and shares its night uniform across resident tiles',()=>{
  const hill={...scene,terrain:{...scene.terrain,hills:[{id:'hill',x:580,y:710,radiusX:180,radiusY:180,height:70}]}};
  const group=buildLightPools(hill);expect(group.children.length).toBeGreaterThan(0);
  group.traverse(node=>{if(!(node instanceof THREE.Mesh))return;expect(node.castShadow).toBe(false);expect((node.material as THREE.ShaderMaterial).uniforms.nightFactor).toBe(nightFactor);const pos=node.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){const x=pos.getX(i)+scene.canonical.width/2,y=pos.getZ(i)+scene.canonical.height/2;expect(pos.getY(i)).toBeCloseTo(terrainSurfaceHeight(hill.terrain,x,y)+2.05,4);}});
 });
 it('changes lighting without adding point lights or another shadow map, and stays fixed when the visual clock stops',()=>{
  const root=new THREE.Scene(),sky=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();root.add(sky,sun,sun.target,fill);
  const renderer=new WorldDaylight(scene,root,sky,sun,fill);renderer.update(125);expect(nightFactor.value).toBe(1);expect(renderer.pools.visible).toBe(true);
  const direction=renderer.direction.clone(),color=sky.color.clone();renderer.update(125);expect(renderer.direction).toEqual(direction);expect(sky.color).toEqual(color);
  renderer.update(475);expect(nightFactor.value).toBe(0);expect(renderer.pools.visible).toBe(false);
  const lights:THREE.Light[]=[];root.traverse(n=>{if(n instanceof THREE.Light)lights.push(n);});expect(lights).toHaveLength(3);expect(lights.some(l=>l instanceof THREE.PointLight)).toBe(false);
 });
 it('keeps receivers and offscreen casters inside the moving sun/moon shadow grid',()=>{
  const target=new THREE.Vector3(2300,120,-1800),eye=cameraPosition(target,0),camera=new THREE.OrthographicCamera(-480,480,270,-270,1,10000);camera.position.set(eye.x,eye.y,eye.z);camera.lookAt(target);camera.updateMatrixWorld();
  const light=new THREE.DirectionalLight(),shadows=new SunShadows(light,-40,800),ray=new THREE.Raycaster();
  for(let hour=0;hour<24;hour+=.5){const p=sampleDaylight({cycleSeconds:600,startHour:hour},0),direction=new THREE.Vector3(p.direction.x,p.direction.y,p.direction.z);shadows.update(camera,direction);
   for(const x of [-1,1])for(const y of [-1,1])for(const height of [-40,800]){ray.setFromCamera(new THREE.Vector2(x,y),camera);const ground=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),new THREE.Vector3())!;const caster=ground.clone().addScaledVector(direction,(800-height)/direction.y);for(const point of [ground,caster]){point.project(light.shadow.camera);expect(Math.abs(point.x)).toBeLessThan(1);expect(Math.abs(point.y)).toBeLessThan(1);expect(Math.abs(point.z)).toBeLessThan(1);}}
  }
 });
});
