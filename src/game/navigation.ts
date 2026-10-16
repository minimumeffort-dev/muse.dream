import { bridgePolygon } from "../scene/landscape-dsl";
import { roadPoints } from "../scene/road";
import type { Scene } from "../scene/schema";
import type { CarState } from "../sim/car";
import { actorPoses } from "../sim/actors";

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
  const roadWidth = scene.roadMaskRef.params.roadWidth;
  for(const route of scene.routes)if(route.kind==="rail" || route.kind==="path"){
    map.beginPath();route.points.forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));if(route.mode==="loop")map.closePath();
    map.strokeStyle=route.surface==="cycle" ? "#76ad9c" : route.surface==="paved" ? "#a5afb0" : "#c9ac7c";map.lineWidth=route.width??12;map.stroke();
  }
  map.beginPath(); roadPoints(scene).forEach((p,i) => i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));
  map.closePath(); map.lineWidth = roadWidth; map.strokeStyle = "#829493"; map.stroke();
  for(const bridge of scene.terrain.landscape?.bridges ?? []) {
    map.beginPath();bridgePolygon(bridge).forEach((p,i)=>i ? map.lineTo(p.x,p.y) : map.moveTo(p.x,p.y));
    map.closePath();map.fillStyle="#c9a77a";map.fill();
  }
  for (const region of scene.regions) {
    map.beginPath(); region.polygon.forEach((p, i) => i ? map.lineTo(p.x, p.y) : map.moveTo(p.x, p.y));
    map.closePath(); map.fillStyle = region.rule.effect === "ICE" ? "#9edee5" : "#e8b56c"; map.fill();
  }
  for (const object of scene.objects) {
    map.beginPath(); map.arc(object.x, object.y, 15 * object.scale, 0, Math.PI * 2);
    map.fillStyle = "#a4bd9470"; map.fill();
  }
  return (car: CarState, angle: number): void => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(base, 0, 0);
    for(const actor of actorPoses(scene,car.timeS)){
      ctx.beginPath();ctx.arc(padding+actor.x*scale,padding+actor.y*scale,2,0,Math.PI*2);ctx.fillStyle=actor.kind==="water" ? "#8dd6d8" : "#e9d8b2";ctx.fill();
    }
    const checkpoint = scene.checkpoints[car.nextCheckpoint]!;
    ctx.beginPath(); ctx.arc(padding + (checkpoint.a.x + checkpoint.b.x) / 2 * scale,
      padding + (checkpoint.a.y + checkpoint.b.y) / 2 * scale, 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#f2cf88"; ctx.lineWidth = 2; ctx.stroke();
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
