import {deliveryTarget,repairTarget} from '../sim/commerce';
import { bridgePolygon } from "../scene/landscape-dsl";
import { roadFootprint } from "../scene/road";
import type { Point,Scene } from "../scene/schema";
import type { CarState } from "../sim/car";
import { actorPoses } from "../sim/actors";
import {streetPolygons} from '../scene/streets';
import {streetCycleSurface} from '../scene/cycle-surface';

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

/** A small north-up map keeps a multi-screen world legible without more controls. */
export function createWorldMap(canvas: HTMLCanvasElement, scene: Scene) {
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.hidden = true; return (_car: CarState, _angle: number) => {}; }
  const base = document.createElement("canvas");
  base.width = canvas.width; base.height = canvas.height;
  const map = base.getContext("2d")!;
  const padding = 18, scale = Math.min((canvas.width - padding * 2) / scene.canonical.width,
    (canvas.height - padding * 2) / scene.canonical.height);
  map.fillStyle = "#17292ee6"; map.fillRect(0, 0, canvas.width, canvas.height);
  map.translate(padding, padding); map.scale(scale, scale);
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
  paint((scene.terrain.landscape?.bridges??[]).map(bridgePolygon),'#c9a77a');
  paint(roadFootprint(scene),'#829493');
  paint(streetPolygons(scene.streets),'#a7aca5');
  paint(streetCycleSurface(scene),'#c78d75');
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
  map.textAlign='center';map.textBaseline='middle';map.font='bold 11px system-ui';
  for(const destination of mapDestinations(scene)){
    const x=padding+destination.x*scale,y=padding+destination.y*scale;
    map.beginPath();map.arc(x,y,7,0,Math.PI*2);map.fillStyle='#f7c843';map.fill();map.lineWidth=1;map.strokeStyle='#171717';map.stroke();
    map.fillStyle='#171717';map.fillText(destination.symbol,x,y+.5);
  }
  canvas.title='S · school / college   + · hospital   A · airport   R · railway station   P · park   F · football   B · basketball';
  canvas.setAttribute('aria-label','World map with your position. S: school or college. Plus: hospital. A: airport. R: railway station. P: park. F: football. B: basketball.');
  return (car: CarState, angle: number): void => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(base, 0, 0);
    for(const actor of actorPoses(scene,car.timeS,car)){
      ctx.beginPath();ctx.arc(padding+actor.x*scale,padding+actor.y*scale,2,0,Math.PI*2);ctx.fillStyle=actor.kind==="water" ? "#8dd6d8" : "#e9d8b2";ctx.fill();
    }
    const repair=repairTarget(car,scene),target=deliveryTarget(car,scene)??(repair ? {...repair,market:{label:repair.repair.label}} : undefined);
    if(target){const x=padding+target.x*scale,y=padding+target.y*scale;ctx.save();ctx.strokeStyle='#ffe176';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(padding+car.x*scale,padding+car.y*scale);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe176';ctx.stroke();ctx.fillStyle='#ffe176';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px system-ui';ctx.fillText('↓',x,y);ctx.restore();}
    const parked=car.vehicles.find(v=>v.id===null);
    if(parked){ctx.fillStyle="#e6a46f";ctx.fillRect(padding+parked.x*scale-2,padding+parked.y*scale-2,4,4);}
    ctx.save(); ctx.translate(padding + car.x * scale, padding + car.y * scale);
    // A faint camera wedge also shows which way the rotated view is looking.
    ctx.rotate(Math.atan2(-480, -180) - angle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(21, -13); ctx.lineTo(21, 13); ctx.closePath();
    ctx.fillStyle = "#ffffff14"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(padding + car.x * scale, padding + car.y * scale); ctx.rotate(car.headingRad);
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fillStyle = "#ffe4a3"; ctx.fill(); ctx.restore();
  };
}
