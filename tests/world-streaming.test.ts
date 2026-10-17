import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {createFixtureScene} from '../src/scene/fixture';
import {WorldStreaming,selectChunks,streamFootprint} from '../src/game/world-streaming';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
import {validChunkRegion,buildWorldChunk} from '../src/game/chunk-builder';
import {toonMaterial,worldTime} from '../src/game/shaders';
import {surfaceGeometry} from '../src/game/surface';
import {contourSurface} from '../src/game/voxel-contours';
import {meshVoxelContour} from '../src/scene/voxel-contour';

const fixture=()=>({...createFixtureScene(),canonical:{width:9600,height:7200,coordinateSystem:'top-left-x-right-y-down-px' as const},objects:[]});
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function packet(){const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),toonMaterial('#decbb2')));return packChunk(root).packet;}
function cameraAt(x:number,z:number){const camera=new THREE.OrthographicCamera(-200,200,200,-200,1,10000);camera.position.set(x,1000,z+480);camera.lookAt(x,0,z);camera.updateMatrixWorld();return camera;}

it('clips canonical chunks without gaps, including negative origins and partial world edges',()=>{
 const scene=fixture(),footprint=[{x:1,y:1},{x:1599,y:1},{x:1599,y:1599},{x:1,y:1599}];
 expect(selectChunks(scene,footprint,0,{x:0,y:0}).map(r=>r.key).sort()).toEqual(['0,0','0,800','800,0','800,800']);
 expect(validChunkRegion(scene,{x0:-800,y0:-800,x1:0,y1:0})).toBe(true);
 for(const region of [{x0:1,y0:0,x1:801,y1:800},{x0:0,y0:0,x1:8000,y1:800},{x0:NaN,y0:0,x1:800,y1:800}])expect(()=>buildWorldChunk(scene,region)).toThrow('invalid render chunk');
});
it('includes zoomed and rotated camera corners plus upstream shadow casters',()=>{
 const scene=fixture(),camera=cameraAt(0,0),sun=new THREE.Vector3(-.7,.4,.6).normalize(),bounds={min:-40,max:320,radius:100};
 for(const zoom of [.5,1,2.5])for(const rotation of [0,Math.PI/2]){
  camera.zoom=zoom;camera.position.set(Math.sin(rotation)*480,1000,Math.cos(rotation)*480);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const footprint=streamFootprint(camera,sun,bounds,9600,7200),selection=selectChunks(scene,footprint,100,{x:4800,y:3600});
  const contains=(x:number,y:number)=>selection.some(r=>x>=r.region.x0 && x<=r.region.x1 && y>=r.region.y0 && y<=r.region.y1);
  const direction=camera.getWorldDirection(new THREE.Vector3());
  for(const x of [-1,1])for(const y of [-1,1])for(const height of [-40,320]){
   const p=new THREE.Vector3(x,y,-1).unproject(camera);p.addScaledVector(direction,(height-p.y)/direction.y);
   expect(contains(p.x+4800,p.z+3600)).toBe(true);
   p.addScaledVector(sun,(bounds.max-bounds.min)/sun.y);expect(contains(p.x+4800,p.z+3600)).toBe(true);
  }
 }
});
it('transfers independent geometry, attributes, instances, materials and transforms, then releases owned resources once',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(3,4,5),material=toonMaterial('#ffcc55'),mesh=new THREE.InstancedMesh(geometry,material,2);
 mesh.position.set(19,22,41);mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(2,3,4));mesh.setColorAt(0,new THREE.Color('#123456'));root.add(mesh);root.add(new THREE.Mesh(geometry,material));
 const {packet,transfer}=packChunk(root);expect(packet.geometries).toHaveLength(1);expect(new Set(transfer).size).toBe(transfer.length);
 const received=structuredClone(packet,{transfer}),copy=unpackChunk(received,()=>{throw Error('unexpected water');}),a=copy.children[0] as THREE.InstancedMesh,b=copy.children[1] as THREE.Mesh;
 expect(a.geometry).toBe(b.geometry);expect(a.material).toBe(b.material);expect(a.matrix.elements[12]).toBe(19);expect(a.instanceMatrix.array[12]).toBe(2);expect(a.instanceColor!.array.length).toBe(6);
 let geometryDisposals=0,materialDisposals=0,instanceDisposals=0;a.geometry.addEventListener('dispose',()=>geometryDisposals++);(a.material as THREE.Material).addEventListener('dispose',()=>materialDisposals++);a.addEventListener('dispose',()=>instanceDisposals++);
 disposeChunk(copy);expect([geometryDisposals,materialDisposals,instanceDisposals]).toEqual([1,1,1]);expect(copy.children).toHaveLength(0);
});
it('evicts distant meshes, rebuilds the same chunks on return and leaves accepted world and clocks untouched',async()=>{
 const scene=fixture(),source=JSON.stringify(scene),built:string[]=[],stream=new WorldStreaming(scene,async region=>{built.push(`${region.x0},${region.y0}`);return packet();},()=>{throw Error('unexpected water');});
 const sun=new THREE.Vector3(-.3,1,.2).normalize();worldTime.value=42;
 const settle=async()=>{for(let i=0;i<400 && (stream.stats.pending || !stream.ready);i++)await tick();expect(stream.error).toBeUndefined();expect(stream.ready).toBe(true);expect(stream.stats.pending).toBe(0);};
 const update=(x:number,z:number)=>stream.update(cameraAt(x,z),sun,new THREE.Vector3(x,0,z),{x:0,y:0},0,false);
 update(-3000,-2200);await settle();const first=stream.stats.keys.slice(),initialBytes=stream.stats.bytes;expect(first.length).toBeGreaterThan(0);
 update(3000,2200);await settle();expect(stream.stats.unloaded).toBeGreaterThan(0);expect(stream.stats.keys.some(k=>first.includes(k))).toBe(false);
 update(-3000,-2200);await settle();expect(stream.stats.keys.sort()).toEqual(first.sort());expect(stream.stats.bytes).toBe(initialBytes);expect(built.filter(k=>k===first[0]).length).toBe(2);
 expect(JSON.stringify(scene)).toBe(source);expect(worldTime.value).toBe(42);stream.dispose();expect(stream.stats.bytes).toBe(0);
});
it('discards a stale in-flight result and reports worker failures without unhandled rejection',async()=>{
 const waiting:{resolve:(value:ReturnType<typeof packet>)=>void;reject:(error:Error)=>void}[]=[],stream=new WorldStreaming(fixture(),()=>new Promise((resolve,reject)=>waiting.push({resolve,reject})),()=>toonMaterial('#fff'));
 const sun=new THREE.Vector3(0,1,0);stream.update(cameraAt(-3000,-2200),sun,new THREE.Vector3(-3000,0,-2200),{x:0,y:0},0,false);
 stream.update(cameraAt(3000,2200),sun,new THREE.Vector3(3000,0,2200),{x:0,y:0},0,false);
 waiting.shift()!.resolve(packet());await tick();expect(stream.stats.discarded).toBe(1);expect(stream.stats.resident).toBe(0);
 waiting.shift()!.reject(new Error('meshing failed'));await tick();expect(stream.error?.message).toBe('meshing failed');expect(stream.ready).toBe(false);stream.dispose();
});
it('keeps thin diagonal contours exact, preserves UVs across chunk seams and never grows paint to whole cells',()=>{
 const scene={...createFixtureScene(),voxelWorld:{groundCell:8 as const,heightStep:1,objectCell:1}},polygon=[{x:400,y:100},{x:600,y:300},{x:599.5,y:300.5},{x:399.5,y:100.5}];
 const make=(region?:{x0:number;y0:number;x1:number;y1:number})=>{
  const source=surfaceGeometry(scene,[polygon],1.86,undefined,undefined,[],region),g=contourSurface(source,{...source.userData.voxelOptions,baseAt:()=>10});source.dispose();return g;
 };
 for(const g of [make(),make({x0:0,y0:0,x1:480,y1:720}),make({x0:480,y0:0,x1:960,y1:720})]){
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');expect(p.count).toBeGreaterThan(0);
  for(let i=0;i<p.count;i++)if(n.getY(i)===1){const x=p.getX(i)+480,y=p.getZ(i)+360;expect(y-x+300).toBeGreaterThanOrEqual(-.0001);expect(y-x+300).toBeLessThanOrEqual(1.0001);expect(p.getY(i)).toBeCloseTo(11.86,4);expect(uv.getX(i)).toBeGreaterThanOrEqual(-.0001);expect(uv.getX(i)).toBeLessThanOrEqual(1.0001);}
  const indices=g.index!;for(let i=0;i<indices.count;i+=3){const [a,b,c]=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,indices.getX(i+k))) as [THREE.Vector3,THREE.Vector3,THREE.Vector3];expect(b.sub(a).cross(c.sub(a)).normalize().dot(new THREE.Vector3().fromBufferAttribute(n,indices.getX(i)))).toBeGreaterThan(.999);}
 }
});
it('surface nets retain hollow volumes, outward triangles and diagonal faces without changing voxel occupancy',()=>{
 const size=[8,8,8],cells=new Uint8Array(512);for(let z=0;z<8;z++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(x<y && !(x>1 && x<4 && y>3 && y<6))cells[x+8*(y+8*z)]=1;
 const mesh=meshVoxelContour(size,cells);expect(mesh.cells).toBe(cells.reduce((a,b)=>a+b,0));expect(mesh.quads).toBeGreaterThan(0);expect(mesh.positions.every(Number.isFinite)).toBe(true);expect(mesh.normals.some(n=>Math.abs(n)>.1 && Math.abs(n)<.99)).toBe(true);
 for(let i=0;i<mesh.positions.length;i+=9){const a=new THREE.Vector3().fromArray(mesh.positions,i),b=new THREE.Vector3().fromArray(mesh.positions,i+3),c=new THREE.Vector3().fromArray(mesh.positions,i+6);expect(b.sub(a).cross(c.sub(a)).normalize().dot(new THREE.Vector3().fromArray(mesh.normals,i))).toBeGreaterThan(.999);}
});

it('retains open wheel centres and bounds while reconstructing the occupied-cell silhouette',async()=>{
 const {partGeometry}=await import('../src/scene/object-geometry');
 const part={id:'wheel',shape:'torus' as const,size:[18,18,3] as [number,number,number],position:[0,0,0] as [number,number,number],rotation:[0,0,0] as [number,number,number],material:{shaderStyle:'toon' as const,colorA:'#222222',colorB:'#444444'}};
 const g=partGeometry(part,1),mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial()),ray=new THREE.Raycaster(new THREE.Vector3(0,0,2),new THREE.Vector3(0,0,-1));
 expect(ray.intersectObject(mesh)).toHaveLength(0);ray.ray.origin.x=.42;expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);g.computeBoundingBox();for(const n of g.boundingBox!.getSize(new THREE.Vector3()).toArray())expect(n).toBeCloseTo(1,6);
 expect(()=>meshVoxelContour([33,1,1],new Uint8Array(33))).toThrow('invalid bounded voxel grid');expect(()=>meshVoxelContour([8,8,8],new Uint8Array(2))).toThrow();
});
it('merges flat contour interiors without losing the exact boundary or height',()=>{
 const source=new THREE.PlaneGeometry(400,400,20,20).rotateX(-Math.PI/2),g=contourSurface(source,{cell:8,step:1,lift:1.25,thickness:.1,baseAt:()=>0});
 const normals=g.getAttribute('normal');expect(Array.from({length:normals.count},(_,i)=>normals.getY(i)).filter(n=>n===1).length).toBe(4);
 g.computeBoundingBox();expect(g.boundingBox!.min.x).toBe(-200);expect(g.boundingBox!.max.x).toBe(200);expect(g.boundingBox!.max.y).toBeCloseTo(1.25,5);
});

it('restores styled shaders, night paint, wind shadows and local instance fades after worker transfer',async()=>{
 const {compileDreamWorld}=await import('../src/scene/dream'),{WorldScenery}=await import('../src/game/scenery');
 const spec=compileDreamWorld(`dream 2;
 material red(style=toon,colors=[#b84a3b,#ffffff],night=#ffd36b);
 material wood(style=wood,colors=[#80543a,#bca27a]);
 material flag(style=cloth,colors=[#a84b36,#ffffff]);
 object test(label="Transfer"){
 body(interaction=solid,radius=20,height=40);
 part a(shape=box,material=red,at=[0,20,0],size=[20,40,20]);
 part b(shape=box,material=wood,at=[0,41,0],size=[30,2,30]);
 part c(shape=box,material=flag,at=[0,45,0],size=[8,6,1]);
 }`).assemblies[0]!;
 const doc={...createFixtureScene(),objects:[{id:'transfer',kind:'custom' as const,labelText:'Transfer',x:480,y:360,scale:1,spec}]};
 const source=new WorldScenery(doc),{packet}=packChunk(source.group),copy=unpackChunk(structuredClone(packet),()=>{throw Error('unexpected water');}),restored=WorldScenery.fromChunk(doc,copy,packet.occlusion);
 expect(restored.objectCount).toBe(source.objectCount);expect(copy.children.length).toBe(source.group.children.length);
 for(let i=0;i<copy.children.length;i++){
  const a=source.group.children[i] as THREE.InstancedMesh,b=copy.children[i] as THREE.InstancedMesh;
  expect(b.geometry.getAttribute('visibility')).toBeInstanceOf(THREE.InstancedBufferAttribute);
  expect((b.material as THREE.Material).customProgramCacheKey()).toBe((a.material as THREE.Material).customProgramCacheKey());
  for(const name of Object.keys(a.geometry.attributes))expect(b.geometry.getAttribute(name).array).toEqual(a.geometry.getAttribute(name).array);
  expect(!!b.customDepthMaterial).toBe(!!a.customDepthMaterial);
  if(a.customDepthMaterial)expect(b.customDepthMaterial!.customProgramCacheKey()).toBe(a.customDepthMaterial.customProgramCacheKey());
  const shader=()=>({uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <clipping_planes_fragment>'}) as any;
  const sa=shader(),sb=shader();(a.material as THREE.Material).onBeforeCompile(sa,null as any);(b.material as THREE.Material).onBeforeCompile(sb,null as any);expect(sb.vertexShader).toBe(sa.vertexShader);expect(sb.fragmentShader).toBe(sa.fragmentShader);expect(Object.keys(sb.uniforms)).toEqual(Object.keys(sa.uniforms));
 }
 const camera=cameraAt(0,0),player=new THREE.Vector3(0,2,-30);source.update(camera,player,1,true);restored.update(camera,player,1,true);
 expect(restored.obscuredCount).toBeGreaterThan(0);expect(restored.obscuredCount).toBe(source.obscuredCount);
 for(let i=0;i<copy.children.length;i++)expect((copy.children[i] as THREE.Mesh).geometry.getAttribute('visibility').array).toEqual((source.group.children[i] as THREE.Mesh).geometry.getAttribute('visibility').array);
 disposeChunk(source.group);disposeChunk(copy);
});

it('keeps persistent water colour, wave material and ownership when the worker uses a placeholder',()=>{
 const root=new THREE.Group(),placeholder=new THREE.MeshBasicMaterial();placeholder.userData.streamMaterial={kind:'water',id:'river'};
 const tile=new THREE.Mesh(new THREE.PlaneGeometry(10,10),placeholder);tile.renderOrder=2;root.add(tile);
 const persistent=new THREE.MeshStandardMaterial({color:'#237e8c',roughness:.28,metalness:.12,transparent:true,opacity:.88,depthWrite:false});persistent.userData.streamShared=true;
 const dispose=vi.fn();persistent.addEventListener('dispose',dispose);
 const copy=unpackChunk(structuredClone(packChunk(root).packet),id=>{expect(id).toBe('river');return persistent;});
 expect((copy.children[0] as THREE.Mesh).material).toBe(persistent);expect(persistent.color.getHexString()).toBe('237e8c');expect(persistent.opacity).toBe(.88);expect(persistent.depthWrite).toBe(false);disposeChunk(copy);expect(dispose).not.toHaveBeenCalled();
});
it('closes tall contour risers on bridge ramps even when a step exceeds the road skin thickness',()=>{
 const source=new THREE.PlaneGeometry(16,8).rotateX(-Math.PI/2),g=contourSurface(source,{cell:8,step:1,lift:1.25,thickness:1.25,baseAt:x=>x<0?0:8});
 const ray=new THREE.Raycaster(new THREE.Vector3(-7,4,1),new THREE.Vector3(1,0,0)),hits=ray.intersectObject(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));
 expect(hits.length).toBeGreaterThan(0);expect(hits[0]!.point.x).toBeCloseTo(0);expect(hits[0]!.face!.normal.x).toBeLessThan(-.99);
});
it('reconstructs continuous bridge tops and paint with aligned slope normals instead of visible crosswise stairs',()=>{
 const source=new THREE.PlaneGeometry(32,16,4,2).rotateX(-Math.PI/2),heightAt=(x:number)=>2+x*.27;
 const g=contourSurface(source,{cell:8,step:1,lift:1.25,thickness:1.25,baseAt:x=>heightAt(x),surfaceAt:(x)=>heightAt(x)+1.25});
 const p=g.getAttribute('position'),n=g.getAttribute('normal');let checked=0;
 for(let i=0;i<p.count;i++)if(n.getY(i)>.5){expect(p.getY(i)).toBeCloseTo(heightAt(p.getX(i))+1.25,5);expect(n.getX(i)).toBeCloseTo(-.27/Math.hypot(.27,1),5);checked++;}
 expect(checked).toBeGreaterThan(20);
});

it('joins water tiles through continuous shared UV waves without transparent internal skirts',async()=>{
 const {waterGeometry}=await import('../src/game/landscape'),{tiledMesh}=await import('../src/game/batching'),{waterMaterial}=await import('../src/game/shaders');
 const doc={...createFixtureScene(),voxelWorld:{groundCell:8,heightStep:1,objectCell:1} as const};
 const water={id:'seam',polygon:[{x:0,y:0},{x:640,y:0},{x:640,y:320},{x:0,y:320}],level:8,depth:20,color:'#237e8c',flow:{x:1,y:0}} as any;
 const group=tiledMesh(waterGeometry(doc,water),new THREE.MeshBasicMaterial()),seen=new Map<string,number[]>();let shared=0;
 group.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const g=node.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');expect(g.hasAttribute('voxelAnchor')).toBe(true);
  for(let i=0;i<p.count;i++){expect(n.getY(i)).toBeCloseTo(1);const key=`${p.getX(i)},${p.getZ(i)}`,value=[p.getY(i),uv.getX(i),uv.getY(i)],previous=seen.get(key);if(previous){previous.forEach((v,j)=>expect(value[j]).toBeCloseTo(v,5));shared++;}else seen.set(key,value);}
 });expect(shared).toBeGreaterThan(100);
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'} as any;
 waterMaterial(water,new THREE.DataTexture(new Uint8Array(4),2,2),{columns:2,rows:2,width:640,height:320},true).onBeforeCompile(shader,null as any);
 expect(shader.vertexShader).toContain('transformed.y+=waterWave(uv)');expect(shader.vertexShader).not.toContain('waterWave(voxelAnchor)');expect(shader.vertexShader).toContain('objectNormal=normalize(vec3(-wx,1.,-wy))');
});

it('reselects coverage when resizing changes the camera frustum without moving the player',()=>{
 const stream=new WorldStreaming(fixture(),()=>new Promise(()=>{}),()=>toonMaterial('#fff')),camera=cameraAt(0,0),player=new THREE.Vector3(),sun=new THREE.Vector3(0,1,0);
 stream.update(camera,sun,player,{x:0,y:0},0,false);const before=stream.stats.required;
 camera.left=-2400;camera.right=2400;camera.updateProjectionMatrix();stream.update(camera,sun,player,{x:0,y:0},0,false);
 expect(stream.stats.required).toBeGreaterThan(before);stream.dispose();
});
