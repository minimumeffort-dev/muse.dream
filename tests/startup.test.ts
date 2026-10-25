import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {tiledMesh,tiledMeshSteps} from '../src/game/batching';
import {voxelSurface,voxelTerrainTile} from '../src/game/voxel-columns';
import {assemblyBounds} from '../src/scene/measure';
import {mockCastle} from '../src/scene/mock-objects';
import {loadingScreen,firstFrameReady} from '../src/game/loading';
import {geometryMemory} from '../src/game/geometry-memory';
import {WorldWorkerClient} from '../src/game/world-worker-client';
import {ambientGraph,ambientNavigation,primeAmbientNavigation} from '../src/scene/ambient-navigation';
import {createFixtureScene} from '../src/scene/fixture';
import {sceneContactData,primeSceneContacts,sceneContacts} from '../src/scene/contacts';
import {prepareCharacterGround,primeCharacterGround} from '../src/game/character-ground';
import {buildRoutes,buildRoutesSteps} from '../src/game/routes';
import {routeSchema} from '../src/scene/routes';

it('holds the first frame through a single async preparation and makes failures terminal',async()=>{
 let release!:()=>void;const prepare=vi.fn(()=>new Promise<void>(resolve=>{release=resolve;})),fail=vi.fn(),ready=firstFrameReady(prepare,fail);
 expect(ready()).toBe(false);expect(ready()).toBe(false);expect(prepare).toHaveBeenCalledOnce();release();await Promise.resolve();expect(ready()).toBe(true);expect(fail).not.toHaveBeenCalled();
 for(const prepare of [()=>Promise.reject(new Error('GPU failed')),()=>{throw Error('GPU failed');}]){const fail=vi.fn(),ready=firstFrameReady(prepare,fail);expect(ready()).toBe(false);await Promise.resolve();expect(ready()).toBe(false);expect(ready()).toBe(false);expect(fail).toHaveBeenCalledOnce();expect(fail.mock.calls[0]![0].message).toBe('GPU failed');}
});

it('carries the accepted worker graph and fails scene/chunk waiters on bootstrap errors',async()=>{
 const makeWorker=()=>({onmessage:null as any,postMessage:vi.fn(),terminate:vi.fn()});
 const worker=makeWorker(),compile=vi.fn(),client=new WorldWorkerClient(worker as unknown as Worker,compile),scene=createFixtureScene();
 const navigation=structuredClone(ambientGraph(scene)),received=structuredClone(scene);
 const ground=structuredClone(prepareCharacterGround(scene));
 worker.onmessage({data:{scene:received,navigation,characterGround:ground,contacts:structuredClone(sceneContactData(scene)),compileMs:12,saveCompatibility:'current',previousServiceWorkSaveCompatibility:'r114',previousTowerRoomSaveCompatibility:'r113',previousTowerRoomContacts:sceneContactData(scene),previousTowerRoomNavigation:navigation,previousCrowdFlowSaveCompatibility:'s54',previousWalkingLinksSaveCompatibility:'r113',previousCrossingAccessSaveCompatibility:'r112',previousCrossingAccessNavigation:navigation,previousCrossingAccessContacts:sceneContactData(scene),previousCoverageSaveCompatibility:'r72',previousInvitationSaveCompatibility:'r71',previousHomeInteriorSaveCompatibility:'r93',previousHomeInteriorNavigation:navigation,previousHomeInteriorContacts:sceneContactData(scene)}});
 expect(await client.scene).toBe(received);primeSceneContacts(received,client.contacts);primeAmbientNavigation(received,client.navigation);primeCharacterGround(received,client.characterGround);expect(client.characterGround).toEqual(ground);expect(compile).toHaveBeenCalledWith(12);expect(client.saveCompatibility).toBe('current');expect(client.previousInvitationSaveCompatibility).toBe('r71');expect(client.previousCoverageSaveCompatibility).toBe('r72');expect(ambientNavigation(received).nodes).toEqual(navigation.nodes);
 expect(client.previousServiceWorkSaveCompatibility).toBe('r114');expect(client.previousTowerRoomSaveCompatibility).toBe('r113');expect(client.previousTowerRoomContacts).toEqual(sceneContactData(scene));expect(client.previousTowerRoomNavigation).toEqual(navigation);expect(client.previousCrowdFlowSaveCompatibility).toBe('s54');expect(client.previousWalkingLinksSaveCompatibility).toBe('r113');
 expect(client.previousCrossingAccessSaveCompatibility).toBe('r112');expect(client.previousCrossingAccessNavigation).toEqual(navigation);expect(client.previousCrossingAccessContacts).toEqual(sceneContactData(scene));
 expect(client.previousHomeInteriorSaveCompatibility).toBe('r93');expect(client.previousHomeInteriorNavigation).toEqual(navigation);expect(client.previousHomeInteriorContacts).toEqual(sceneContactData(scene));
 client.dispose();
 const broken=makeWorker(),bad=new WorldWorkerClient(broken as unknown as Worker),failure=bad.scene.catch(e=>e.message);
 const pending=bad.build({x0:0,y0:0,x1:800,y1:800}).catch(e=>e.message);
 broken.onmessage({data:{error:'Graph preparation failed'}});
 expect(await failure).toBe('Graph preparation failed');expect(await pending).toBe('Graph preparation failed');expect(broken.terminate).toHaveBeenCalledOnce();
 await expect(bad.build({x0:0,y0:0,x1:800,y1:800})).rejects.toThrow('Graph preparation failed');
});

it('serializes chunk and topple requests, cancelling queued work and draining obsolete in-flight replies',async()=>{
 const worker={onmessage:null as any,postMessage:vi.fn(),terminate:vi.fn()},client=new WorldWorkerClient(worker as unknown as Worker),scene=createFixtureScene();worker.onmessage({data:{scene}});await client.scene;
 const region={x0:0,y0:0,x1:800,y1:800},first=client.build(region),queued=new AbortController(),active=new AbortController(),last=new AbortController();
 const cancelled=client.topple('queued-tree',queued.signal).catch(e=>e.message),second=client.topple('active-tree',active.signal).catch(e=>e.message),third=client.topple('last-tree',last.signal);
 expect(worker.postMessage).toHaveBeenCalledTimes(1);queued.abort();expect(await cancelled).toBe('World request cancelled');
 worker.onmessage({data:{id:0,packet:{meshes:[]}}});expect(await first).toEqual({meshes:[]});expect(worker.postMessage.mock.calls[1]![0]).toEqual({id:2,topple:'active-tree'});
 active.abort();expect(await second).toBe('World request cancelled');expect(worker.postMessage).toHaveBeenCalledTimes(2);
 worker.onmessage({data:{id:2,packet:{meshes:[]}}});expect(worker.postMessage.mock.calls[2]![0]).toEqual({id:3,topple:'last-tree'});worker.onmessage({data:{id:3,packet:{meshes:['last']}}});expect(await third).toEqual({meshes:['last']});
 client.dispose();expect(worker.terminate).toHaveBeenCalledOnce();
});

it('retains exact static contact order and rejects broken prepared cylinders',()=>{
 const scene=createFixtureScene(),valid=sceneContactData(scene),copy=structuredClone(scene),source=JSON.stringify(copy);
 primeSceneContacts(copy,structuredClone(valid));expect(sceneContacts(copy).contacts).toEqual(sceneContacts(scene).contacts);
 for(let y=0;y<=720;y+=100)for(let x=0;x<=960;x+=100)expect(sceneContacts(copy).solids.query(x,y,150)).toEqual(sceneContacts(scene).solids.query(x,y,150));
 expect(JSON.stringify(copy)).toBe(source);
 for(const change of [(d:typeof valid)=>{d.sourceHash='wrong';},(d:typeof valid)=>{d.contacts.pop();},(d:typeof valid)=>{d.contacts[0]!.r=NaN;},(d:typeof valid)=>{d.contacts[0]!.top=-Infinity;},(d:typeof valid)=>{d.contacts[0]!.id='unknown';}]){const data=structuredClone(valid);change(data);expect(()=>primeSceneContacts(structuredClone(scene),data)).toThrow('prepared scene contacts');}
});

it('staged tiling yields and produces exactly the synchronous buffers and bounds',()=>{
 const source=new THREE.PlaneGeometry(900,450,9,6).rotateX(-Math.PI/2),material=new THREE.MeshBasicMaterial();
 source.userData.voxelOptions={cell:8,step:1,lift:0,thickness:2};
 const plain=source.clone();plain.userData=source.userData;
 const steps=tiledMeshSteps(source,material);let result=steps.next(),yields=0;
 while(!result.done){yields++;result=steps.next();}
 const sync=tiledMesh(plain,material),staged=result.value;
 expect(yields).toBeGreaterThan(4);expect(staged.children.length).toBe(sync.children.length);
 for(const [i,child] of staged.children.entries()){
  const a=(child as THREE.Mesh).geometry,b=(sync.children[i] as THREE.Mesh).geometry;
  expect(a.index!.array).toEqual(b.index!.array);
  for(const [name,attr] of Object.entries(a.attributes))expect(attr.array).toEqual(b.getAttribute(name).array);
  expect(a.boundingSphere).toEqual(b.boundingSphere);
 }
});
it('cooperative route construction retains exact surfaces, paint, rails and sleepers',()=>{
 const scene={...createFixtureScene(),voxelWorld:{groundCell:8 as const,heightStep:1,objectCell:1},routes:[
  {id:'cycle',kind:'path',mode:'shuttle',speed:20,points:[{x:90,y:300},{x:600,y:300},{x:720,y:420}],surface:'cycle',width:30},
  {id:'rail',kind:'rail' as const,mode:'shuttle' as const,speed:20,points:[{x:120,y:500},{x:720,y:500}],gauge:24},
  {id:'tram',kind:'tram' as const,mode:'shuttle' as const,speed:20,points:[{x:120,y:200},{x:720,y:200}],gauge:14.35},
 ].map(r=>routeSchema.parse(r))};
 const sync=buildRoutes(scene),steps=buildRoutesSteps(scene);let result=steps.next(),yields=0;while(!result.done){yields++;result=steps.next();}
 expect(yields).toBeGreaterThan(20);
 const meshes=(root:THREE.Group)=>{const all:THREE.Mesh[]=[];root.traverse(n=>{if(n instanceof THREE.Mesh)all.push(n);});return all;},a=meshes(sync),b=meshes(result.value);
 expect(b.length).toBe(a.length);expect(a.length).toBeGreaterThan(6);
 for(const [i,mesh] of a.entries()){const copy=b[i]!;expect(copy.name).toBe(mesh.name);expect(copy.castShadow).toBe(mesh.castShadow);expect(copy.receiveShadow).toBe(mesh.receiveShadow);expect((copy.material as THREE.MeshStandardMaterial).color).toEqual((mesh.material as THREE.MeshStandardMaterial).color);expect(copy.geometry.index?.array).toEqual(mesh.geometry.index?.array);for(const [name,attribute] of Object.entries(mesh.geometry.attributes))expect(copy.geometry.getAttribute(name).array).toEqual(attribute.array);if(mesh instanceof THREE.InstancedMesh)expect((copy as THREE.InstancedMesh).instanceMatrix.array).toEqual(mesh.instanceMatrix.array);}
});
it('column indexing retains analytic UVs, negative coordinates and large index ranges',()=>{
 const source=new THREE.PlaneGeometry(160,160).rotateX(-Math.PI/2).translate(-80,0,-80);
 const g=voxelSurface(source,{cell:1,step:1,lift:0,thickness:2,maxMerge:1});
 expect(g.index!.array).toBeInstanceOf(Uint32Array);
 const p=g.getAttribute('position'),uv=g.getAttribute('uv'),n=g.getAttribute('normal');
 expect(p.count).toBe(g.userData.voxel.quads*4);expect(g.index!.count).toBe(g.userData.voxel.quads*6);
 for(let i=0;i<p.count;i++){
  expect(uv.getX(i)).toBeCloseTo((p.getX(i)+160)/160,5);
  expect(uv.getY(i)).toBeCloseTo(-p.getZ(i)/160,5);
 }
 expect(n.count).toBe(p.count);expect(Array.from(g.index!.array).reduce((a,b)=>Math.max(a,b),0)).toBeLessThan(p.count);
});
it('shared assembly bounds retain exact geometry and return independent copies',()=>{
 const original=structuredClone(mockCastle),first=assemblyBounds(original),copy=structuredClone(original);
 expect(assemblyBounds(copy)).toEqual(first);
 const changed=structuredClone(original);changed.parts[0]!.size[0]*=20;expect(assemblyBounds(changed)).not.toEqual(first);
 first.min.x=-99999;expect(assemblyBounds(original).min.x).not.toBe(-99999);
});

it('terrain column keys retain fractional origins across the world center',()=>{
 const geometry=voxelTerrainTile(-196,-196,{groundCell:8,heightStep:1,objectCell:1},()=>0,()=>new THREE.Color('#52744c'));
 expect(geometry.userData.voxel).toMatchObject({columns:2500,quads:1});
 geometry.computeBoundingBox();expect(geometry.boundingBox!.min.toArray()).toEqual([-196,0,-196]);
 expect(geometry.boundingBox!.max.toArray()).toEqual([204,0,204]);
});

it('invalid numeric geometry cannot poison the shared bounds of a valid default',()=>{
 const valid=structuredClone(mockCastle);valid.parts=[{...valid.parts[0]!,shape:'cylinder'}];
 const invalid={...valid,parts:[{...valid.parts[0]!,taper:NaN}]};
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {assemblyBounds(invalid);const bounds=assemblyBounds(valid);expect([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)).toBe(true);}
 finally {error.mockRestore();}
});

it('loading yields between stages, completes only on ready and exposes recoverable failures',async()=>{
 vi.useFakeTimers();
 const elements=new Map<string,any>();for(const id of ['#loading','#loading-status','#loading-retry','#loading-track','#game'])elements.set(id,{dataset:{},hidden:true,textContent:'',setAttribute:vi.fn()});
 const body={dataset:{loading:'loading'}};
 vi.stubGlobal('document',{querySelector:(id:string)=>elements.get(id),body});
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {
  const loading=loadingScreen(),stage=loading.stage('Building terrain');
  expect(elements.get('#loading-status').textContent).toBe('Building terrain');
  expect(body.dataset.loading).toBe('loading');await vi.advanceTimersByTimeAsync(1);await stage;
  const build=loading.build('Building assets',(function*(){yield;return 42;})());
  await vi.advanceTimersByTimeAsync(1);expect(await build).toBe(42);
  loading.ready();expect(body.dataset.loading).toBe('ready');expect(elements.get('#loading').hidden).toBe(true);
  expect(JSON.parse(elements.get('#loading').dataset.result).phases.map((p:any)=>p.label)).toEqual(['Building terrain','Building assets']);
  const failed=loadingScreen();failed.fail(new Error('WebGL unavailable'));
  expect(body.dataset.loading).toBe('error');expect(elements.get('#loading-retry').hidden).toBe(false);
  expect(elements.get('#loading').hidden).toBe(false);
  expect(elements.get('#loading-status').textContent).toContain('Reload');expect(vi.getTimerCount()).toBe(0);
 } finally {error.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});

it('memory accounting shares geometry buffers but includes every instance buffer',()=>{
 const group=new THREE.Group(),g=new THREE.BoxGeometry(1,1,1),m=new THREE.MeshBasicMaterial();
 group.add(new THREE.InstancedMesh(g,m,2),new THREE.InstancedMesh(g,m,3));
 const expected=Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+g.index!.array.byteLength+5*16*4;
 expect(geometryMemory(group)).toMatchObject({bytes:expected,geometries:1,uniqueTriangles:12});
});

it('staged surface clipping preserves terrain, holes, normals and UVs',async()=>{
 const {surfaceGeometry,surfaceGeometrySteps}=await import('../src/game/surface');
 const {createFixtureScene}=await import('../src/scene/fixture');
 const doc=createFixtureScene(),polygons=[[{x:90,y:90},{x:330,y:90},{x:330,y:330},{x:90,y:330}]],cutouts=[[{x:180,y:180},{x:240,y:180},{x:240,y:240},{x:180,y:240}]];
 const sync=surfaceGeometry(doc,polygons,1.6,undefined,undefined,cutouts),steps=surfaceGeometrySteps(doc,polygons,1.6,undefined,undefined,cutouts);
 let result=steps.next(),yields=0;while(!result.done){yields++;result=steps.next();}
 expect(yields).toBeGreaterThan(10);for(const [name,attr] of Object.entries(sync.attributes))expect(result.value.getAttribute(name).array).toEqual(attr.array);
});
it('distant clipping outlines do not change local union/subtraction results',async()=>{
 const {subtractPolygons,unionPolygons}=await import('../src/scene/polygons');
 const rect=(x:number,y:number)=>[{x,y},{x:x+10,y},{x:x+10,y:y+10},{x,y:y+10}];
 const input=[rect(0,0),rect(5,5)],holes=[rect(8,-5)],distant=Array.from({length:100},(_,i)=>rect(100+i*20,100));
 expect(subtractPolygons(input,[...distant,...holes])).toEqual(subtractPolygons(input,holes));
 expect(unionPolygons(input,[...holes,...distant])).toEqual(unionPolygons(input,holes));
});
