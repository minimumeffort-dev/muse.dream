import { BufferAttribute, BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { ObjectPart } from "../scene/object-dsl";

/** Coordinates survive rigid batching and fracture, so the finish stays attached. */
export function materialCoordinates(geometry: BufferGeometry, part: ObjectPart): void {
  const style = part.material.shaderStyle;
  if (style !== "brick" && style !== "wood" && style !== "stone") return;
  const position = geometry.getAttribute("position"), values = new Float32Array(position.count * 3);
  const size = new Vector3().fromArray(part.size);
  const transform = new Matrix4().compose(new Vector3().fromArray(part.position),
    new Quaternion().setFromEuler(new Euler(...(part.rotation ?? [0, 0, 0]))), size);
  const point = new Vector3(), longAxis = part.size.indexOf(Math.max(...part.size));
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    if (style === "wood") {
      point.multiply(size);
      // Timber grain runs along the member, including rotated beams and seat slats.
      if (longAxis === 0) point.set(point.y, point.x, point.z);
      if (longAxis === 2) point.set(point.x, point.z, point.y);
    } else point.applyMatrix4(transform);
    point.toArray(values, i * 3);
  }
  geometry.setAttribute("surfacePosition", new BufferAttribute(values, 3));
}
