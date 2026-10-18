import {it,expect} from 'vitest';
import {Group,Mesh,MeshBasicMaterial,Raycaster,Vector3,BufferGeometry,Float32BufferAttribute,type Object3D} from 'three';
import {createFixtureScene} from '../src/scene/fixture';
import {parseScene,type Scene} from '../src/scene/schema';
import {buildRoutes} from '../src/game/routes';
import {buildStreets,buildStreetSteps} from '../src/game/streets';
import {finishBuild,tiledMesh} from '../src/game/batching';
import {WorldLandscape} from '../src/game/landscape';
import {routeFrames,routeSchema} from '../src/scene/routes';
import {roadGeometry} from '../src/game/road-surfaces';
import {roadMarkingGeometry} from '../src/game/environment';
import {projectSurfaceSteps} from '../src/game/surface-projection';
import {packChunk,unpackChunk,disposeChunk} from '../src/game/chunk-packet';
import {compileDream} from '../src/scene/dream';
import {vehicleReviewStart} from '../src/game/review-start';
import {createCarAtSpawn} from '../src/sim/car';
import {toggleRide,stepInteractive} from '../src/sim/interaction';
import {buildPaperMask} from '../src/sim/mask';

function fixture(extra:Partial<Scene>={}){return parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},streets:[{id:'avenue',width:60,sidewalk:24,points:[{x:200,y:360},{x:760,y:360}]}],crossings:[{id:'zebra',street:'avenue',at:{x:480,y:360},width:24}],routes:[{id:'tram',kind:'tram',mode:'shuttle',speed:20,gauge:14.35,points:[{x:200,y:360},{x:760,y:360}]}],...extra});}
const ray=new Raycaster();
function hits(root:Object3D,x:number,y:number){root.updateMatrixWorld(true);ray.set(new Vector3(x-480,500,y-360),new Vector3(0,-1,0));return ray.intersectObject(root,true);}
function rendered(scene:Scene){const root=new Group();root.add(buildStreets(scene),buildRoutes(scene));return root;}
function named(root:Object3D,name:string){const group=new Group();root.traverse(node=>{if(node.name===name){const copy=node.clone();group.add(copy);}});return group;}

it('embeds narrow tram heads in the street, keeps the route continuous and leaves clean crossing paint',()=>{
 const scene=fixture(),root=rendered(scene),roads=named(root,'street-carriageways');
 for(const x of [470,480,490])for(const side of [-1,1]){
  const y=360+side*14.35/2,road=hits(roads,x,y)[0]!,head=hits(root,x,y)[0]!;
  expect(head.point.y-road.point.y).toBeCloseTo(.03,4);
  expect(hits(root,x,y+.45)[0]!.point.y-road.point.y).toBeCloseTo(.02,4);
  expect(hits(root,x,y-.7)[0]!.point.y).toBeCloseTo(1.86,4);
 }
 // Rail geometry lives in ordinary streamed street chunks, not resident route rigs.
 expect(buildRoutes(scene).children).toHaveLength(0);
 const heads=named(root,'tram-rail-heads'),grooves=named(root,'tram-rail-grooves');
 for(let x=200.1;x<760;x+=2.37)for(const side of [-1,1]){
  expect(hits(heads,x,360+side*7.175).length).toBeGreaterThan(0);
  expect(hits(heads,x,360+side*7.175+.31)).toHaveLength(0);
  expect(hits(grooves,x,360+side*7.175+.45).length).toBeGreaterThan(0);
 }
 expect(hits(root,480,358.4)[0]!.point.y).toBeCloseTo(1.86,4);
});

it.each(['stone','timber'] as const)('fits %s bridge approaches and both independently built voxel chunks',style=>{
 const scene=fixture({voxelWorld:{groundCell:8,heightStep:1,objectCell:1},terrain:{hills:[{id:'hill',x:350,y:360,radiusX:400,radiusY:300,height:35}],landscape:{dslVersion:1,waters:[],bridges:[{id:'bridge',a:{x:400,y:360},b:{x:600,y:360},width:100,archHeight:15,style,rails:false}]}}}),street=buildStreets(scene),landscape=new WorldLandscape(scene),heads=named(street,'tram-rail-heads');
 const support=new Group();support.add(named(street,'street-carriageways'),landscape.group);
 for(let x=390.37;x<610;x+=2.19)for(const y of [352.825,367.175]){
  const base=hits(support,x,y)[0]!,head=hits(heads,x,y)[0]!;expect(head,`missing head at ${x},${y}`).toBeDefined();
  expect(head.point.y-base.point.y).toBeCloseTo(.03,3);
 }
 const left=finishBuild(buildStreetSteps(scene,{x0:0,y0:0,x1:480,y1:720})),right=finishBuild(buildStreetSteps(scene,{x0:480,y0:0,x1:960,y1:720}));
 const boundary=(root:Object3D)=>{const values:string[]=[];named(root,'tram-rail-heads').traverse(n=>{if(n instanceof Mesh){const p=n.geometry.getAttribute('position');for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<1e-6)values.push([p.getZ(i),p.getY(i)].map(v=>v.toFixed(4)).join(','));}});return [...new Set(values)].sort();};
 expect(boundary(left).length).toBeGreaterThan(3);expect(boundary(right)).toEqual(boundary(left));
 expect(hits(named(left,'tram-rail-heads'),479.99,352.825).length).toBeGreaterThan(0);expect(hits(named(right,'tram-rail-heads'),480.01,352.825).length).toBeGreaterThan(0);
});

it('joins angled and closed rail strips at the route’s authored miter frames while retaining raised regional rail',()=>{
 const route=routeSchema.parse({id:'bent',kind:'tram',mode:'loop',speed:20,gauge:14.35,points:[{x:220,y:220},{x:630,y:280},{x:700,y:550},{x:250,y:540}]}),scene=fixture({routes:[route],crossings:[],streets:[{id:'avenue',width:60,sidewalk:24,points:[...route.points,route.points[0]!]}]}),heads=named(buildStreets(scene),'tram-rail-heads');
 for(const p of routeFrames(route))for(const side of [-1,1])expect(hits(heads,p.x+p.nx*7.175*side,p.y+p.ny*7.175*side).length,JSON.stringify(p)).toBeGreaterThan(0);
 const train=fixture({routes:[{...scene.routes[0]!,kind:'rail',mode:'shuttle',points:[{x:200,y:360},{x:760,y:360}]}]});
 expect(hits(buildRoutes(train),480,367.175)[0]!.point.y).toBeCloseTo(2.75,4);
});

it('supports circuit-only tram tracks and retains fitted geometry and depth bias through worker transfer',()=>{
 const scene=fixture({streets:[],crossings:[],voxelWorld:{groundCell:8,heightStep:1,objectCell:1},routes:[{...fixture().routes[0]!,points:[{x:300,y:591},{x:660,y:591}]}]}),root=buildStreets(scene),road=tiledMesh(roadGeometry(scene),new MeshBasicMaterial()),heads=named(root,'tram-rail-heads');
 for(let x=310;x<650;x+=7.37)for(const y of [583.825,598.175])expect(hits(heads,x,y)[0]!.point.y-hits(road,x,y)[0]!.point.y).toBeCloseTo(.03,4);
 const {packet}=packChunk(root),copy=unpackChunk(packet,()=>{throw Error('no water material');});
 for(const x of [315,480,635])expect(hits(copy,x,598.175)[0]!.point.y).toBe(hits(heads,x,598.175)[0]!.point.y);
 let transferred=0;copy.traverse(n=>{if(n instanceof Mesh && !Array.isArray(n.material) && n.material.polygonOffsetUnits===-2){transferred++;expect(n.material).toMatchObject({polygonOffset:true,polygonOffsetFactor:-2});expect(n.castShadow).toBe(false);}});expect(transferred).toBeGreaterThan(0);
 disposeChunk(root);disposeChunk(copy);
});

it('leaves circuit center paint clear of embedded rails',()=>{
 const scene=fixture({streets:[],crossings:[],routes:[{...fixture().routes[0]!,points:[{x:300,y:598.175},{x:660,y:598.175}]}]}),paint=new Mesh(roadMarkingGeometry(scene),new MeshBasicMaterial());
 // The lower head runs along the circuit center, through its ordinary dashed paint.
 let painted=0;for(let x=310;x<650;x+=1.37){
  expect(hits(paint,x,591)).toHaveLength(0);
  if(hits(paint,x,590).length)painted++;
 }
 expect(painted).toBeGreaterThan(10);
});

it('clips projected details to sloped indexed top faces without modifying support or drawing its underside',()=>{
 const support=new BufferGeometry();support.setAttribute('position',new Float32BufferAttribute([-10,0,-10,-10,8,10,10,4,-10,-10,-2,-10,10,2,-10,-10,6,10],3));support.setAttribute('uv',new Float32BufferAttribute([0,0,0,1,1,0,0,0,1,0,0,1],2));support.setIndex([0,1,2,3,4,5]);
 const before=Array.from(support.getAttribute('position').array),geometry=finishBuild(projectSurfaceSteps([support],[[{x:88,y:88},{x:102,y:88},{x:102,y:108},{x:88,y:108}]],{x:100,y:100},.03)),p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 expect(p.count).toBeGreaterThan(3);for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);expect(p.getY(i)).toBeCloseTo(.2*x+.4*z+6+.03,5);expect(x+z).toBeLessThanOrEqual(1e-6);expect(uv.getX(i)).toBeCloseTo((x+10)/20,5);expect(uv.getY(i)).toBeCloseTo((z+10)/20,5);}
 expect(Array.from(support.getAttribute('position').array)).toEqual(before);geometry.dispose();support.dispose();
});

it('starts passenger reviews through real exit and boarding rules without giving an NPC driver controls',()=>{
 const spec=compileDream('dream 2;material green(style=toon,colors=[#568577,#385b50]);object carriage(label="Review tram"){measure(kind=tram,axis=x,meters=16);body(interaction=solid,radius=5,height=15);rideable(at=[0,8,0]);part shell(shape=box,material=green,at=[0,7.5,0],size=[80,15,12]);}')[0]!;
 const scene=fixture({objects:[{id:'carriage',kind:'custom',role:'npc',labelText:'Tram',x:200,y:360,scale:2,spec,route:{id:'tram',offset:0}}]}),world={scene,roadMask:buildPaperMask(960,720),driveMask:buildPaperMask(960,720),carRadius:11};
 const foot=vehicleReviewStart(createCarAtSpawn(scene),world,'carriage');expect(foot.control.kind).toBe('foot');
 const passenger=toggleRide(foot,world);expect(passenger.control).toEqual({kind:'passenger',id:'carriage'});
 const next=stepInteractive(passenger,{throttle:1,steer:1},.25,world);expect(next.control).toEqual(passenger.control);expect(next.x).toBeCloseTo(205);expect(next.y).toBe(360);expect(next.headingRad).toBe(0);
});
