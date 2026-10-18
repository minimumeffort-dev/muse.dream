import {it,expect} from 'vitest';
import source from '../docs/examples/park-paths.dream?raw';
import {compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {walkingNetwork,onWalkway,validateSites} from '../src/scene/sites';
import {pavementSurface} from '../src/scene/pavement';
import {mapDestinations} from '../src/game/navigation';
import {surfaceSchema} from '../src/scene/streets';
import {createWorldScene} from '../src/scene/world-fixture';
import {CITY_COMPATIBILITY,preParkCompatibilitySource,sha256} from '../src/scene/save-compatibility';
const identity={sceneId:'park-paths',revisionId:'r1',sourceHash:'example'},compile=(s=source)=>compileDreamScene(s,identity);
it('joins explicit paths to the existing pedestrian graph and names a reusable destination',()=>{
 const scene=compile(),network=walkingNetwork(scene),pavement=pavementSurface(network.polygons);
 expect(scene.surfaces.every(s=>s.walkable)).toBe(true);expect(compile(formatDream(source))).toEqual(scene);expect(validateSites(scene)).toEqual([]);
 expect(pavement.segment({x:412,y:354},{x:412,y:738},4)).toBe(true);expect(pavement.segment({x:412,y:738},{x:788,y:738},4)).toBe(true);expect(onWalkway(scene,788,700,4)).toBe(true);
 const paint=compile(source.replaceAll('walkable=true','walkable=false'));expect(onWalkway(paint,788,700,4)).toBe(false);
 expect(mapDestinations(scene)).toContainEqual({id:'park',kind:'park',symbol:'P',label:'Pocket Park',x:380,y:400});
 expect(checkDream(source.replace('Pocket Park',' ')).ok).toBe(false);expect(checkDream(source.replace('Pocket Park','x'.repeat(81))).ok).toBe(false);
});
it('rejects disconnected, point-only, obstructed and non-convex pedestrian pieces',()=>{
 expect(checkDream(source+'surface isolated(color=#b8ac90,points=[[900,800],[950,800],[950,850],[900,850]],walkable=true);').ok).toBe(false);
 expect(checkDream(source+'surface corner(color=#b8ac90,points=[[800,750],[850,750],[850,800],[800,800]],walkable=true);').ok).toBe(false);
 expect(checkDream(source+'place blocker(object=car,at=[412,500],role=prop);').ok).toBe(false);
 const path=compile().surfaces[0]!;expect(surfaceSchema.safeParse({...path,points:[{x:100,y:100},{x:200,y:100},{x:150,y:150},{x:200,y:200},{x:100,y:200}]}).success).toBe(false);
});
it('uses explicit bridge support and rejects side entries or unmarked water shortcuts',()=>{
 const simple=source.split('\n').filter(l=>!/^surface (south|east|north)_path/.test(l)).join('\n'),pond='water pond(level=0,depth=4,bank=20,color=#477f99,flow=[0,0],drag=2,waves=[40,2,.3],points=[[360,550],[460,550],[460,650],[360,650]]);';
 expect(checkDream(simple+pond).ok).toBe(false);
 const bridge='bridge footbridge(from=[412,510],to=[412,690],width=64,arch=20,style=timber,rails=false);';
 expect(checkDream(simple+pond+bridge).ok).toBe(true);
 expect(checkDream(simple+pond+bridge+'surface side_entry(color=#b8ac90,points=[[412,578],[530,578],[530,602],[412,602]],walkable=true);').ok).toBe(false);
});
it('leaves the released world byte-compatible when the new optional fields are absent',async()=>{
 expect(await sha256(preParkCompatibilitySource(createWorldScene()))).toBe(CITY_COMPATIBILITY);
});
it('keeps pedestrian paths out of rail and runway corridors',()=>{
 for(const route of ['route railway(kind=rail,mode=shuttle,speed=20){point(at=[300,650]);point(at=[700,650]);}','route airstrip(kind=air,mode=shuttle,speed=80,altitude=160){point(at=[600,600]);point(at=[1000,600]);}']){
  const result=checkDream(source+route);expect(result.ok).toBe(false);expect(result.diagnostics?.some(d=>d.message.includes('rail and runway corridors'))).toBe(true);
 }
});
it('merges standard path paving and entrance paint into one non-overlapping mesh',async()=>{
 const {buildStreets}=await import('../src/game/streets'),{unionPolygons,polygonArea}=await import('../src/scene/polygons'),{sitePolygons}=await import('../src/scene/sites'),{streetPolygons}=await import('../src/scene/streets'),{Mesh}=await import('three');
 const scene=compile(),root=buildStreets(scene);expect(root.children.some(c=>c.name.startsWith('ground-'))).toBe(false);
 const path=root.getObjectByName('entrance-paths')!;let area=0;path.traverse(n=>{if(!(n instanceof Mesh))return;const p=n.geometry.getAttribute('position'),indices=n.geometry.index,count=indices?.count??p.count;for(let i=0;i<count;i+=3){const a=indices?.getX(i)??i,b=indices?.getX(i+1)??i+1,c=indices?.getX(i+2)??i+2;area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;}});
 const expected=unionPolygons([...scene.sites.flatMap(s=>sitePolygons(scene,s)),...scene.surfaces.map(s=>s.points)],streetPolygons(scene.streets,'reserved')).reduce((n,p)=>n+polygonArea(p),0);expect(area).toBeCloseTo(expected,2);
 root.traverse(n=>{if(n instanceof Mesh){n.geometry.dispose();(Array.isArray(n.material) ? n.material : [n.material]).forEach(m=>m.dispose());}});
});
