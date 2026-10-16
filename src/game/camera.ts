export interface FollowTarget { x: number; y: number; z: number }

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
