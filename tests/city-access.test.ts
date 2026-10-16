import {describe,it,expect} from 'vitest';
import {Raycaster,Vector3} from 'three';
import {buildStreets} from '../src/game/streets';
import {compileDreamWorld,formatDream} from '../src/scene/dream';
import {parseScene} from '../src/scene/schema';
import {createFixtureScene,buildMaskForScene} from '../src/scene/fixture';
import {validateSites,siteEntry,onWalkway} from '../src/scene/sites';
import {routeSchema,routePose} from '../src/scene/routes';
import {streetSchema,streetPolygons} from '../src/scene/streets';
import {polygonArea,unionPolygons,triangulatePolygon,partition} from '../src/scene/polygons';
import {RasterMask,paintPolygons,pointInPolygon} from '../src/sim/mask';
import {compileWatercourse} from '../src/scene/landscape-dsl';
import {validateScenePlayability} from '../src/scene/validate';

const source=`dream 2;
material stone(style=toon,colors=[#aabbcc,#889999]);
object house(label="House"){
 measure(kind=building,axis=y,meters=3);
 body(interaction=solid,radius=20,height=30);
 part walls(shape=box,material=stone,at=[0,15,0],size=[40,30,30]);
}
object shelter(label="Shelter"){
 body(interaction=decor,radius=4,height=10);
 part post(shape=box,material=stone,at=[0,5,0],size=[6,10,6]);
}
place home_building(object=house,at=[570,330]);
place stop_shelter(object=shelter,at=[530,200]);
street main_street(width=60,sidewalk=24,points=[[480,130],[480,500]]);
site home(object=home_building,kind=home,entry=[-24,0],street=main_street,width=16,points=[[522,330]]);
site platform(object=stop_shelter,kind=stop,entry=[-4,0],street=main_street,width=16,points=[[522,200]],serves=[home]);
route bus(kind=street,mode=shuttle,speed=20){
 stop homes(at=[480,200],wait_s=3,site=platform);
 point(at=[480,430]);
}
`;
const compiled=compileDreamWorld(source),city=()=>parseScene({...createFixtureScene(),terrain:{hills:[]},objects:compiled.objects,streets:compiled.streets,sites:compiled.sites,crossings:compiled.crossings,routes:compiled.routes});

describe('connected city data',()=>{
 it('round trips sites, stops and arbitrary street directions through the actual command contract',()=>{
  expect(compileDreamWorld(formatDream(source))).toEqual(compiled);
  expect(compiled.routes[0]!.stops).toEqual([{id:'homes',anchor:0,waitS:3,site:'platform'}]);
  const diagonal=streetSchema.parse({id:'diagonal',width:60,sidewalk:20,points:[{x:100,y:100},{x:800,y:600}]});
  expect(pointInPolygon(450,350,streetPolygons([diagonal])[0]!)).toBe(true);
  expect(pointInPolygon(100,600,streetPolygons([diagonal])[0]!)).toBe(false);
  expect(streetSchema.safeParse({...diagonal,points:[{x:100,y:100},{x:800,y:100},{x:110,y:110}]}).success).toBe(false);
 });
 it('connects an entrance and platform through an actual sidewalk, including the accepted driving mask',()=>{
  const scene=city();expect(validateSites(scene)).toEqual([]);
  expect(onWalkway(scene,522,260,4)).toBe(true);expect(onWalkway(scene,480,260,4)).toBe(false);
  const start=parseScene({...scene,spawn:{x:480,y:260,headingRad:Math.PI/2}});
  expect(validateScenePlayability(start,buildMaskForScene(start),11)).toEqual([]);
 });
 it('keeps the entrance attached when its building is rotated and scaled',()=>{
  const scene=city(),moved=parseScene({...scene,objects:scene.objects.map(o=>o.id==='home_building' ? {...o,x:600,y:400,scale:1.5,headingRad:Math.PI/2} : o)});
  expect(siteEntry(moved,moved.sites[0]!)).toEqual({x:600,y:364});
 });
 it('rejects floating entrances, blocked paths, lanes used as sidewalks and buildings with no access',()=>{
  const scene=city();
  const badEntry=parseScene({...scene,sites:scene.sites.map(s=>s.id==='home' ? {...s,entry:{x:0,y:0}} : s)});
  expect(validateSites(badEntry).join(' ')).toContain('exterior');
  const lane=parseScene({...scene,sites:scene.sites.map(s=>s.id==='home' ? {...s,points:[{x:480,y:330}]} : s)});
  expect(validateSites(lane).join(' ')).toContain('without blocking a riding lane');
  const blocked=parseScene({...scene,objects:[...scene.objects,{id:'tree',kind:'tree',labelText:'TREE',x:540,y:330,scale:1}]});
  expect(validateSites(blocked).join(' ')).toContain('unobstructed');
  expect(validateSites(parseScene({...scene,sites:[scene.sites[1]!]})).join(' ')).toContain('needs a connected site');
 });
 it('requires a declared crossing when an entrance path changes sides of a road',()=>{
  const scene=city(),crossed=parseScene({...scene,sites:scene.sites.map(s=>s.id==='home' ? {...s,points:[{x:438,y:330}]} : s)});
  expect(validateSites(crossed).join(' ')).toContain('without a declared crossing');
  const safe=parseScene({...crossed,crossings:[{id:'entrance_crossing',street:'main_street',at:{x:480,y:330},width:24}]});
  expect(validateSites(safe)).toEqual([]);
 });
 it('requires a crossing to reach a served destination on the opposite side of the road',()=>{
  const scene=city(),opposite=parseScene({...scene,streets:scene.streets.map(s=>({...s,points:[{x:480,y:130},{x:480,y:500},{x:800,y:500},{x:800,y:130},{x:480,y:130}]})),objects:scene.objects.map(o=>o.id==='stop_shelter' ? {...o,x:430} : o),sites:scene.sites.map(s=>s.id==='platform' ? {...s,entry:{x:4,y:0},points:[{x:438,y:200}]} : s)});
  expect(validateSites(opposite).join(' ')).toContain('cannot reach served site');
  const crossed=parseScene({...opposite,crossings:[{id:'safe_crossing',street:'main_street',at:{x:480,y:270},width:24}]});
  expect(validateSites(crossed)).toEqual([]);expect(onWalkway(crossed,480,270,4)).toBe(true);
 });
 it('rejects branch endpoints that overlap but miss a shared centerline',()=>{
  const scene=city(),bad=parseScene({...scene,streets:[...scene.streets,{id:'short_branch',width:60,sidewalk:24,points:[{x:300,y:400},{x:460,y:400}]}]});
  expect(validateSites(bad).join(' ')).toContain('share a junction');
 });
 it('leaves clear gaps in center lines at zebra crossings, including diagonal streets',()=>{
  for(const angle of [0,Math.PI/4]){
   const d={x:Math.sin(angle),y:Math.cos(angle)},center={x:480,y:360};
   const street=streetSchema.parse({id:'test_street',width:60,sidewalk:24,points:[{x:center.x-d.x*185,y:center.y-d.y*185},{x:center.x+d.x*185,y:center.y+d.y*185}]});
   const scene=parseScene({...createFixtureScene(),terrain:{hills:[]},objects:[],streets:[street],crossings:[{id:'zebra',street:street.id,at:center,width:24}]});
   const group=buildStreets(scene);group.updateMatrixWorld(true);const lines=group.getObjectByName('street-centerlines')!;
   const ray=new Raycaster();
   for(const along of [-19,-10,0,10,19]){
    ray.set(new Vector3(center.x+d.x*along-480,500,center.y+d.y*along-360),new Vector3(0,-1,0));
    expect(ray.intersectObject(lines,true),`center-line paint crosses zebra at ${along}`).toHaveLength(0);
   }
   expect(group.getObjectByName('pedestrian-crossings')).toBeDefined();expect(group.getObjectByName('crossing-stop-lines')).toBeDefined();
  }
 });
 it('waits at intermediate stops and visits them in reverse order on a shuttle return',()=>{
  const route=routeSchema.parse({id:'line',kind:'street',mode:'shuttle',speed:20,waitS:0,points:[{x:100,y:100},{x:200,y:100},{x:300,y:100}],stops:[{id:'middle',anchor:1,waitS:3,site:'platform'}]});
  expect(routePose(route,6)).toMatchObject({x:200,y:100,speed:0,direction:1});
  expect(routePose(route,9)).toMatchObject({x:220,y:100,speed:20});
  expect(routePose(route,19)).toMatchObject({x:200,y:100,speed:0,direction:-1});
  expect(routePose(route,22)).toMatchObject({x:180,y:100,speed:20,direction:-1});
 });
});

describe('shared connected geometry',()=>{
 it('paints exact cell-center unions at 1 and 4 units, including clipped diagonal ends',()=>{
  const polygons=[[{x:-5,y:5},{x:16,y:-2},{x:44,y:42},{x:18,y:35}],[{x:20,y:4},{x:50,y:4},{x:50,y:15},{x:20,y:15}]];
  for(const cell of [1,4]){const mask=new RasterMask(48,44,undefined,cell);paintPolygons(mask,polygons);
   for(let y=0;y<mask.rows;y++)for(let x=0;x<mask.columns;x++)expect(mask.isDrivableAtPixel(x,y)).toBe(polygons.some(p=>pointInPolygon((x+.5)*cell,(y+.5)*cell,p)));
  }
 });
 it('keeps angled junction surfaces single-owned and preserves concave water intersections',()=>{
  const a=[{x:0,y:0},{x:100,y:0},{x:100,y:20},{x:0,y:20}],b=[{x:40,y:-30},{x:60,y:-30},{x:60,y:60},{x:40,y:60}];
  expect(unionPolygons([a,b]).reduce((n,p)=>n+polygonArea(p),0)).toBeCloseTo(3400);
  const river=[{x:0,y:0},{x:30,y:0},{x:30,y:100},{x:70,y:100},{x:70,y:0},{x:100,y:0},{x:100,y:130},{x:0,y:130}];
  const triangles=triangulatePolygon(river);expect(triangles.reduce((n,p)=>n+polygonArea(p),0)).toBe(polygonArea(river));
  const strip=[{x:-10,y:40},{x:110,y:40},{x:110,y:60},{x:-10,y:60}];
  expect(triangles.reduce((n,p)=>n+polygonArea(partition(p,strip).inside),0)).toBeCloseTo(1200);
 });
 it('does not duplicate whole polygons when clipped outlines repeat a corner',()=>{
  const square=[{x:10000,y:10000},{x:10100,y:10000},{x:10100,y:10100},{x:10000,y:10100}];
  const repeated=[square[0]!,square[1]!,square[1]!,square[2]!,square[3]!];
  const inside=[{x:10020,y:10020},{x:10080,y:10020},{x:10080,y:10080},{x:10020,y:10080}];
  expect(partition(inside,repeated).outside).toEqual([]);
  expect(unionPolygons([square,repeated,inside]).reduce((sum,p)=>sum+polygonArea(p),0)).toBe(10000);
 });
 it('opens watercourse ends at a map boundary while keeping the legacy round cap',()=>{
  const input={id:'river',stations:[{x:200,y:100,width:100},{x:200,y:500,width:100}],level:0,depth:12,bankWidth:30,color:'#447799',flow:{x:0,y:8}};
  const round=compileWatercourse(input),open=compileWatercourse({...input,ends:'open',stations:[{x:200,y:0,width:100},{x:200,y:600,width:100}]});
  expect(Math.min(...round.polygon.map(p=>p.y))).toBe(50);expect(Math.max(...round.polygon.map(p=>p.y))).toBe(550);
  expect(open.polygon).toHaveLength(4);expect(Math.min(...open.polygon.map(p=>p.y))).toBe(0);expect(Math.max(...open.polygon.map(p=>p.y))).toBe(600);
 });
});
