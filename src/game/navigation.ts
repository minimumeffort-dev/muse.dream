import {deliveryTarget,repairTarget} from '../sim/commerce';
import { bridgePolygon } from "../scene/landscape-dsl";
import { roadFootprint } from "../scene/road";
import type { Point,Scene } from "../scene/schema";
import type { CarState } from "../sim/car";
import { actorPoses } from "../sim/actors";
import {streetPolygons} from '../scene/streets';
import {streetCycleSurface} from '../scene/cycle-surface';
import {cameraPosition} from './camera';

export type MapView={width:number;height:number;worldWidth:number;worldHeight:number;zoom:number;center:Point;scale:number;tx:number;ty:number};
export function mapView(width:number,height:number,worldWidth:number,worldHeight:number,zoom=1,center={x:worldWidth/2,y:worldHeight/2}):MapView{
  zoom=Math.max(1,Math.min(12,zoom));
  const scale=Math.min((width-36)/worldWidth,(height-36)/worldHeight)*zoom;
  const clamp=(n:number,size:number,half:number)=>Math.max(Math.min(size/2,half),Math.min(size-Math.min(size/2,half),n));
  center={x:clamp(center.x,worldWidth,width/(2*scale)),y:clamp(center.y,worldHeight,height/(2*scale))};
  return {width,height,worldWidth,worldHeight,zoom,center,scale,tx:width/2-center.x*scale,ty:height/2-center.y*scale};
}
export const mapToPixel=(view:MapView,p:Point):Point=>({x:view.tx+p.x*view.scale,y:view.ty+p.y*view.scale});
export const pixelToMap=(view:MapView,p:Point):Point=>({x:(p.x-view.tx)/view.scale,y:(p.y-view.ty)/view.scale});
export function panMap(view:MapView,dx:number,dy:number):MapView{
  return mapView(view.width,view.height,view.worldWidth,view.worldHeight,view.zoom,{x:view.center.x-dx/view.scale,y:view.center.y-dy/view.scale});
}
export function zoomMap(view:MapView,factor:number,anchor={x:view.width/2,y:view.height/2}):MapView{
  const point=pixelToMap(view,anchor),next=mapView(view.width,view.height,view.worldWidth,view.worldHeight,view.zoom*factor,view.center);
  return mapView(view.width,view.height,view.worldWidth,view.worldHeight,next.zoom,{x:point.x-(anchor.x-view.width/2)/next.scale,y:point.y-(anchor.y-view.height/2)/next.scale});
}
export function readWaypoint(text:string|null,width:number,height:number):Point|undefined{
  if(!text || text.length>256)return;
  try{const data=JSON.parse(text),p=data?.point;if(data?.version===1 && p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=width && p.y>=0 && p.y<=height)return {x:p.x,y:p.y};}catch{/* An invalid UI preference cannot replace world progress. */}
}
/** Screen bearing follows the same fixed camera axes as movement, independently of car heading. */
export function waypointGuide(from:Point,to:Point,angle:number){
  const dx=to.x-from.x,dy=to.y-from.y,camera=cameraPosition({x:0,y:0,z:0},angle),distance=Math.hypot(dx,dy);
  return {distance,direction:Math.atan2(dx*camera.z-dy*camera.x,-dx*camera.x-dy*camera.z)*180/Math.PI,arrived:distance<=25};
}
export const waypointDistance=(units:number)=>units>=10000 ? `${(units/10000).toFixed(1)} km` : `${Math.ceil(units/10)} m`;

/** Personal destinations take priority; task markers always come from the accepted work state. */
export function navigationTarget(state:CarState,scene:Scene,waypoint?:Point){
  if(waypoint)return {...waypoint,kind:'waypoint' as const,id:'waypoint',label:'Waypoint'};
  const delivery=deliveryTarget(state,scene);
  if(delivery)return {x:delivery.x,y:delivery.y,kind:'delivery' as const,id:delivery.delivery.id,label:`Delivery · ${delivery.market.label}`};
  const repair=repairTarget(state,scene);
  if(repair && repair.task.phase!=='home')return {x:repair.x,y:repair.y,kind:repair.repair.regrow_s===undefined ? 'repair' as const : 'planting' as const,id:`${repair.repair.id}:${repair.task.objectId}:${repair.task.zoneId??''}`,label:repair.repair.label};
}

/** Destination meaning comes from Dream sites, never inferred from building labels. */
export function mapDestinations(scene:Scene){
  const symbols:Partial<Record<Scene['sites'][number]['kind'],string>>={school:'S',hospital:'+',airport:'A',station:'R',park:'P'};
  const sites=scene.sites.flatMap(site=>{
    const symbol=symbols[site.kind],object=scene.objects.find(o=>o.id===site.objectId);
    return symbol && object ? [{id:site.id,kind:site.kind,symbol,label:site.label??object.labelText,x:object.x,y:object.y}] : [];
  });
  return [...sites,...scene.sports.map(sport=>{
    const ground=scene.surfaces.find(s=>s.id===sport.surfaceId)!;
    return {id:sport.id,kind:sport.kind,symbol:sport.kind==='football' ? 'F' : 'B',label:sport.kind==='football' ? 'Football' : 'Basketball',x:ground.points.reduce((n,p)=>n+p.x,0)/ground.points.length,y:ground.points.reduce((n,p)=>n+p.y,0)/ground.points.length};
  })];
}

/** Cached accepted geography supports both north-up map views without rebuilding world geometry. */
export function createWorldMap(canvas: HTMLCanvasElement, scene: Scene) {
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.hidden = true; return Object.assign((_car: CarState, _angle: number,_view?:MapView,_waypoint?:Point) => {},{release:()=>{}}); }
  const base = document.createElement("canvas");
  const map = base.getContext("2d")!;
  let scale=1,tx=0,ty=0,key='';
  const bridges=(scene.terrain.landscape?.bridges??[]).map(bridgePolygon),roads=roadFootprint(scene),streets=streetPolygons(scene.streets),cycles=streetCycleSurface(scene),destinations=mapDestinations(scene);
  const drawBase=(view:MapView)=>{
  const markerScale=canvas.id==='expanded-map' ? canvas.width/Math.max(1,canvas.clientWidth) : 1;
  base.width=canvas.width;base.height=canvas.height;
  map.fillStyle = "#17292ee6"; map.fillRect(0, 0, canvas.width, canvas.height);
  map.translate(tx, ty); map.scale(scale, scale);
  map.strokeStyle = "#73957655"; map.lineWidth = 6;
  for (const hill of scene.terrain.hills) {
    map.beginPath(); map.ellipse(hill.x, hill.y, hill.radiusX * .6, hill.radiusY * .6, 0, 0, Math.PI * 2); map.stroke();
  }
  for(const water of scene.terrain.landscape?.waters ?? []) {
    map.beginPath();water.polygon.forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));
    map.closePath();map.fillStyle=water.color;map.fill();
  }
  for(const surface of scene.surfaces.filter(s=>s.finish!=='terrain')){
    map.beginPath();surface.points.forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));
    map.closePath();map.fillStyle=surface.color!;map.fill();
  }
  const paint=(polygons:Point[][],color:string)=>{
    map.fillStyle=color;
    for(const polygon of polygons){map.beginPath();polygon.forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));map.closePath();map.fill();}
  };
  paint(bridges,'#c9a77a');
  paint(roads,'#829493');
  paint(streets,'#a7aca5');
  paint(cycles,'#c78d75');
  for(const route of scene.routes)if(route.kind==="rail" || route.kind==="tram" || route.kind==="path"){
    map.beginPath();route.points.forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));if(route.mode==="loop")map.closePath();
    map.strokeStyle=route.surface==="cycle" ? "#76ad9c" : route.surface==="paved" ? "#a5afb0" : "#c9ac7c";map.lineWidth=route.width??12;map.stroke();
  }
  for (const region of scene.regions) {
    map.beginPath(); region.polygon.forEach((p, i) => i ? map.lineTo(p.x, p.y) : map.moveTo(p.x, p.y));
    map.closePath(); map.fillStyle = region.rule.effect === "ICE" ? "#9edee5" : "#e8b56c"; map.fill();
  }
  for (const object of scene.objects) {
    map.beginPath(); map.arc(object.x, object.y, 15 * object.scale, 0, Math.PI * 2);
    map.fillStyle = "#a4bd9470"; map.fill();
  }
  map.setTransform(1,0,0,1,0,0);
  map.textAlign='center';map.textBaseline='middle';map.font=`bold ${11*markerScale}px Manrope,system-ui`;
  for(const destination of destinations){
    const x=tx+destination.x*scale,y=ty+destination.y*scale;
    map.beginPath();map.arc(x,y,7*markerScale,0,Math.PI*2);map.fillStyle='#f7c843';map.fill();map.lineWidth=markerScale;map.strokeStyle='#171717';map.stroke();
    map.fillStyle='#171717';map.fillText(destination.symbol,x,y+.5);
    if(canvas.id==='expanded-map' && view.zoom>=3){map.strokeStyle='#171717';map.lineWidth=3*markerScale;map.strokeText(destination.label,x,y+18*markerScale);map.fillStyle='#fafaf7';map.fillText(destination.label,x,y+18*markerScale);}
  }
  };
  canvas.title='S · school / college   + · hospital   A · airport   R · railway station   P · park   F · football   B · basketball';
  if(canvas.id==='world-map')canvas.setAttribute('aria-label','World map with your position. S: school or college. Plus: hospital. A: airport. R: railway station. P: park. F: football. B: basketball.');
  const draw=(car: CarState, angle: number,view=mapView(canvas.width,canvas.height,scene.canonical.width,scene.canonical.height),waypoint?:Point): void => {
    const nextKey=[canvas.width,canvas.height,view.scale,view.tx,view.ty].join(',');
    if(nextKey!==key){key=nextKey;({scale,tx,ty}=view);drawBase(view);}
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(base, 0, 0);
    for(const actor of actorPoses(scene,car.timeS,car)){
      ctx.beginPath();ctx.arc(tx+actor.x*scale,ty+actor.y*scale,2,0,Math.PI*2);ctx.fillStyle=actor.kind==="water" ? "#8dd6d8" : "#e9d8b2";ctx.fill();
    }
    const target=navigationTarget(car,scene);
    if(target){const x=tx+target.x*scale,y=ty+target.y*scale;ctx.save();ctx.strokeStyle='#ffe176';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(tx+car.x*scale,ty+car.y*scale);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe176';ctx.stroke();ctx.fillStyle='#ffe176';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px system-ui';ctx.fillText('↓',x,y);ctx.restore();}
    if(waypoint){
      const p=mapToPixel(view,waypoint),player=mapToPixel(view,car);
      ctx.save();ctx.strokeStyle='#f7c843';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fillStyle='#f7c843';ctx.fill();ctx.strokeStyle='#171717';ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fillStyle='#171717';ctx.fill();ctx.restore();
    }
    const parked=car.vehicles.find(v=>v.id===null);
    if(parked){ctx.fillStyle="#e6a46f";ctx.fillRect(tx+parked.x*scale-2,ty+parked.y*scale-2,4,4);}
    ctx.save(); ctx.translate(tx + car.x * scale, ty + car.y * scale);
    // A faint camera wedge also shows which way the rotated view is looking.
    ctx.rotate(Math.atan2(-480, -180) - angle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(21, -13); ctx.lineTo(21, 13); ctx.closePath();
    ctx.fillStyle = "#ffffff14"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(tx + car.x * scale, ty + car.y * scale); ctx.rotate(car.headingRad);
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fillStyle = "#ffe4a3"; ctx.fill(); ctx.restore();
  };
  return Object.assign(draw,{release(){base.width=base.height=1;key='';}});
}
