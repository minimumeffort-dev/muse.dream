import {it,expect,vi} from 'vitest';
import * as commerce from '../src/sim/commerce';
import {createWorldMap,mapView,mapToPixel} from '../src/game/navigation';
import {createFixtureScene} from '../src/scene/fixture';
import {createCarAtSpawn} from '../src/sim/car';
import type {Point} from '../src/scene/schema';

it('paints one readable street path for a personal destination, restoring task guidance when cleared',()=>{
 const strokes:{points:Point[];color:string;width:number}[]=[],arcs:Point[]=[];
 const context=(record=false)=>{
  let path:Point[]=[];const values:Record<string,any>={};
  return new Proxy(values,{get(o,k){if(k in o)return o[k as string];if(k==='beginPath')return ()=>{path=[];};if(k==='moveTo'||k==='lineTo')return (x:number,y:number)=>{path.push({x,y});};if(k==='arc')return (x:number,y:number)=>{if(record)arcs.push({x,y});};if(k==='stroke')return ()=>{if(record)strokes.push({points:[...path],color:o.strokeStyle,width:o.lineWidth});};return ()=>{};}});
 };
 const main=context(true),base=context(),canvas={id:'world-map',width:304,height:244,clientWidth:304,getContext:()=>main,setAttribute:()=>{}} as unknown as HTMLCanvasElement;
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>base})});
 const task={x:700,y:600,delivery:{id:'parcel'},market:{label:'Counter'}};
 vi.spyOn(commerce,'deliveryTarget').mockReturnValue(task as ReturnType<typeof commerce.deliveryTarget>);
 try{
  const scene=createFixtureScene(),state={...createCarAtSpawn(scene),x:100,y:100},waypoint={x:500,y:100},view=mapView(304,244,960,720),draw=createWorldMap(canvas,scene),bend=mapToPixel(view,{x:100,y:500}),taskPixel=mapToPixel(view,task),targetPixel=mapToPixel(view,waypoint);
  draw(state,0,view,waypoint,[state,state,{x:100,y:500},{x:500,y:500},waypoint,waypoint]);
  const same=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<.001;
  expect(arcs.some(p=>same(p,taskPixel))).toBe(false);expect(arcs.some(p=>same(p,targetPixel))).toBe(true);
  const path=strokes.filter(s=>s.points.some(p=>same(p,bend)));expect(path.map(s=>[s.color,s.width])).toEqual([['#171717',4],['#f7c843',2]]);
  arcs.length=0;strokes.length=0;draw(state,0,view);expect(arcs.some(p=>same(p,taskPixel))).toBe(true);expect(arcs.some(p=>same(p,targetPixel))).toBe(false);
 }finally{vi.restoreAllMocks();vi.unstubAllGlobals();}
});
