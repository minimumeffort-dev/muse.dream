import type {Scene,Point} from '../scene/schema';
import {crossingLanes,streetFrame} from '../scene/sites';
import {markingPolygons} from '../scene/streets';
import {unionPolygons,polygonArea} from '../scene/polygons';
import {clipPolygon,polygonsOverlap} from '../scene/landscape-dsl';

/** Parallel overlapping declarations share one zebra envelope and world-aligned stripe phase. */
export function crossingPaint(scene:Scene){
 const bands=scene.crossings.flatMap(c=>crossingLanes(scene,c).map(({street,at})=>{
  const f=streetFrame(street,at),half=street.width/2+(street.cycleWidth ? street.cycleWidth+6 : 0);
  const polygon=markingPolygons({id:c.id,color:'#ffffff',closed:false,width:half*2,points:[{x:f.x-f.dx*c.width/2,y:f.y-f.dy*c.width/2},{x:f.x+f.dx*c.width/2,y:f.y+f.dy*c.width/2}]})[0]!;
  const sign=f.dx< -1e-9 || Math.abs(f.dx)<=1e-9 && f.dy<0 ? -1 : 1;
  return {polygon,dx:f.dx*sign,dy:f.dy*sign};
 }));
 const groups:{polygons:Point[][];dx:number;dy:number}[]=[];
 for(const band of bands){
  const joined=groups.filter(g=>Math.abs(g.dx*band.dx+g.dy*band.dy)>.99999 && g.polygons.some(p=>polygonsOverlap(p,band.polygon)));
  if(!joined.length){groups.push({polygons:[band.polygon],dx:band.dx,dy:band.dy});continue;}
  const group=joined[0]!;group.polygons.push(band.polygon);
  for(const other of joined.slice(1)){group.polygons.push(...other.polygons);groups.splice(groups.indexOf(other),1);}
 }
 const polygons:Point[][]=[];
 for(const group of groups){
  const across=(p:Point)=>-p.x*group.dy+p.y*group.dx;
  for(const polygon of unionPolygons(group.polygons)){
   const values=polygon.map(across);
   for(let d=Math.floor(Math.min(...values)/7)*7;d<Math.max(...values);d+=7){
    const stripe=clipPolygon(clipPolygon(polygon,p=>across(p)-d),p=>d+3-across(p));
    if(polygonArea(stripe)>1e-7)polygons.push(stripe);
   }
  }
 }
 return {polygons,bands:bands.length,groups:groups.length};
}
