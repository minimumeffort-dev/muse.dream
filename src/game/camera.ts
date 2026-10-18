import { Vector3 } from "three";
import { assemblyBounds, measuredScale } from "../scene/measure";
import type { ObjectDsl } from "../scene/object-dsl";
import type { SceneObject } from "../scene/schema";

export interface FollowTarget { x: number; y: number; z: number }

export const DEFAULT_CAMERA_ZOOM = 1.18;

/** Close while dribbling; widen around player and free ball without rotating the view. */
export function sportCameraFrame(player:{x:number;y:number},ball:{x:number;y:number},kind:'football'|'basketball',target?:{x:number;y:number},team=false){
  const distance=Math.hypot(ball.x-player.x,ball.y-player.y),blend=distance>20 ? .5 : .25;
  return {x:player.x+(ball.x-player.x)*blend+(target ? (target.x-player.x)*.15 : 0),
    y:player.y+(ball.y-player.y)*blend+(target ? (target.y-player.y)*.15 : 0),
    zoom:Math.max(team && kind==='football' ? .85 : DEFAULT_CAMERA_ZOOM,(kind==='basketball' ? team ? 3 : 4 : team ? 1.6 : 3.2)/(1+Math.max(0,distance-20)/(team ? 300 : 160)))};
}

function assemblySpan(spec: ObjectDsl, scale: number): number {
  const size = assemblyBounds(spec).getSize(new Vector3());
  return Math.max(size.x, size.y, size.z) * scale;
}

/** Frame small rides like the player, with a cap to retain navigation context. */
export function rideCameraZoom(player: ObjectDsl | undefined, ride?: SceneObject): number {
  if (!ride?.spec || !("dslVersion" in ride.spec)) return DEFAULT_CAMERA_ZOOM;
  const reference = player ? assemblySpan(player, measuredScale(player)) : 35.5;
  const span = assemblySpan(ride.spec, ride.scale);
  return Math.min(2.8, DEFAULT_CAMERA_ZOOM * Math.max(1, reference / span));
}

/** Size changes ease independently of speed, terrain and view rotation. */
export function followCameraZoom(current: number, target: number, dt: number, snap = false): number {
  return current + (target - current) * (snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / .35));
}

/** Frame-rate independent follow. Reset and reduced motion snap directly. */
export function followCamera(
  current: FollowTarget, target: FollowTarget, dt: number, snap = false,
): FollowTarget {
  const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / 0.18);
  return {
    x: current.x + (target.x - current.x) * blend,
    y: current.y + (target.y - current.y) * blend,
    z: current.z + (target.z - current.z) * blend,
  };
}

/** Fixed pitch and radius: terrain can translate the view, never secretly rotate it. */
export function cameraPosition(target: FollowTarget, angle = 0): FollowTarget {
  return { x: target.x + 180*Math.cos(angle) + 480*Math.sin(angle), y: target.y + 1000,
    z: target.z + 480*Math.cos(angle) - 180*Math.sin(angle) };
}
