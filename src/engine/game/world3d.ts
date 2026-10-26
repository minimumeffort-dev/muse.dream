import {nightPaint} from "./shaders";
import { measuredScale } from "../scene/measure";
import * as THREE from "three";
import type { Scene, SceneObject } from "../scene/schema";
import type { ObjectPart } from "../scene/object-dsl";

import { partGeometry } from "../scene/object-geometry";
import { styledMaterial, toonMaterial } from "./shaders";
import { materialCoordinates } from "./material-coordinates";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Five centimetres of visual body travel keeps the player's tires inside their openings. */
export const MAX_SUSPENSION_COMPRESSION=.5;

/**
 * Canonical pixels (+x right, +y down) map 1:1 to centered world X/Z,
 * with Y up. Default dimensions preserve the original regression fixture.
 * The simulation stays in canonical coordinates; only rendering converts.
 * Every scene object (built-in or model-invented custom spec) is built by
 * exactly one builder chosen by kind/shape from the allowlist.
 */
export const toWorldX = (x: number, width = 960): number => x - width / 2;
export const toWorldZ = (y: number, height = 720): number => y - height / 2;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, roundBox = true): THREE.Mesh {
  if (roundBox && geo instanceof THREE.BoxGeometry) {
    const { width, height, depth } = geo.parameters;
    geo.dispose();
    geo = new RoundedBoxGeometry(width, height, depth, 2, Math.min(width, height, depth) * .12);
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCar(): THREE.Group {
  const car = new THREE.Group();
  const paint = toonMaterial("#e76754");
  const dark = toonMaterial("#1a1a20");
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0f5, roughness: 0.1, metalness: 0.3 });
  car.add(mesh(new THREE.BoxGeometry(34, 7, 18), paint, 0, 5.5, 0));
  car.add(mesh(new THREE.BoxGeometry(17, 6, 15), paint, -2, 11.5, 0));
  car.add(mesh(new THREE.BoxGeometry(14, 5.4, 15.4), glass, -1.6, 11.7, 0));
  car.add(mesh(new THREE.BoxGeometry(34, 1.8, 6), toonMaterial("#f2f0ea"), 0, 9.1, 0)); // stripe
  car.add(mesh(new THREE.BoxGeometry(3, 6, 17), toonMaterial("#8f1d14"), -17, 10, 0)); // wing strut
  car.add(mesh(new THREE.BoxGeometry(5, 1.6, 21), toonMaterial("#8f1d14"), -17.5, 13.4, 0));
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x665511, emissive: 0xffd34d, emissiveIntensity: 0.9 });
  car.add(mesh(new THREE.BoxGeometry(1.6, 2.4, 4), lightMat, 17.4, 6, -5.5));
  car.add(mesh(new THREE.BoxGeometry(1.6, 2.4, 4), lightMat, 17.4, 6, 5.5));
  const wheelGeo = new THREE.CylinderGeometry(3.6, 3.6, 3, 14);
  for (const [x, z] of [[11, -9.5], [11, 9.5], [-11, -9.5], [-11, 9.5]] as const) {
    const w = mesh(wheelGeo, dark, x, 3.6, z);
    w.rotation.x = Math.PI / 2;
    w.name = "wheel";
    car.add(w);
  }
  return car;
}

export function buildTree(scale: number): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.2, 3.2, 11, 8), toonMaterial("#7a5230"), 0, 5.5, 0));
  const greens = ["#3e8e4f", "#35934c", "#2f7d42"];
  const blobs: [number, number, number, number][] = [
    [0, 19, 0, 10.5], [-6, 14.5, 3, 7.5], [6, 15, -3, 7.5], [1, 24, 1, 6.5],
  ];
  blobs.forEach(([x, y, z, r], i) => g.add(mesh(new THREE.IcosahedronGeometry(r, 1), toonMaterial(greens[i % 3] as string), x, y, z)));
  g.scale.setScalar(scale);
  return g;
}

export function buildCone(scale: number): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(13, 1.6, 13), toonMaterial("#e06a1b"), 0, 0.8, 0));
  g.add(mesh(new THREE.ConeGeometry(6.2, 15, 18), toonMaterial("#f47b20"), 0, 9, 0));
  g.add(mesh(new THREE.CylinderGeometry(4.0, 4.9, 3.2, 18), toonMaterial("#f5f2ea"), 0, 8.6, 0));
  g.scale.setScalar(scale);
  return g;
}

export function buildTireStack(scale: number): THREE.Group {
  const g = new THREE.Group();
  const mats = [toonMaterial("#26272e"), toonMaterial("#e8e4da"), toonMaterial("#26272e")];
  mats.forEach((mat, i) => {
    const t = mesh(new THREE.TorusGeometry(10.5, 3.8, 10, 22), mat, 0, 3.8 + i * 6.8, 0);
    t.rotation.x = Math.PI / 2;
    g.add(t);
  });
  g.scale.setScalar(scale);
  return g;
}

/** Compiles a validated model-invented spec into primitives + styles. */
export function buildCustom(object: SceneObject): THREE.Group {
  const spec = object.spec as NonNullable<SceneObject["spec"]>;
  const g = new THREE.Group();
  if ("dslVersion" in spec) {
    const joints=new Map<string,THREE.Group>();
    if(spec.dslVersion===2) {
      for(const joint of spec.joints ?? []) {
        const node=new THREE.Group();node.name=joint.id;node.position.fromArray(joint.position);node.rotation.set(...(joint.rotation ?? [0,0,0]));
        node.userData.jointRest={position:node.position.clone(),rotation:node.quaternion.clone(),animation:joint.animation,proximity:joint.proximity};joints.set(joint.id,node);
      }
      for(const joint of spec.joints ?? []) (joint.parent ? joints.get(joint.parent)! : g).add(joints.get(joint.id)!);
    }
    for (const part of spec.parts) {
      const m = mesh(partGeometry(part,spec.dslVersion===2 ? spec.voxelSize : undefined), styledMaterial(part.material),0,0,0,false);
      materialCoordinates(m.geometry, part);
      m.name = part.id;
      if("cutaway" in part)m.userData.cutaway=part.cutaway;
      const style=part.material.shaderStyle,paint=style==="toon" || style==="paper-grain";
      // Linear vertex paint lets differently colored parts share a draw without changing shading.
      if(paint){
        const material=m.material as THREE.MeshToonMaterial | THREE.MeshStandardMaterial;
        const colors=new Float32Array(m.geometry.getAttribute("position").count*3);
        for(let i=0;i<colors.length;i+=3)material.color.toArray(colors,i);
        m.geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
        const emission=new Float32Array(colors.length),night=new THREE.Color(part.material.nightColor??0);
        for(let i=0;i<emission.length;i+=3)night.toArray(emission,i);
        m.geometry.setAttribute("nightEmission",new THREE.BufferAttribute(emission,3));nightPaint(material);
        material.color.setRGB(1,1,1);material.vertexColors=true;
      }
      m.userData.materialKey = JSON.stringify(paint ? {shaderStyle:style} : part.material);
      m.userData.materialStyle = part.material.shaderStyle;
      m.position.fromArray(part.position);
      m.scale.fromArray(part.size);
      m.rotation.set(...(part.rotation ?? [0, 0, 0]));
      m.userData.rest = { y: m.position.y, rotation: m.quaternion.clone(), animation: part.animation };
      ("parent" in part && part.parent ? joints.get(part.parent)! : g).add(m);
    }
    g.scale.setScalar(object.scale);
    return g;
  }
  const r = spec.colliderRadius;
  const h = r * 1.7 * spec.heightFactor;
  const matA = styledMaterial(spec);
  const matB = styledMaterial(spec, true);
  switch (spec.shape) {
    case "box-stack": {
      g.add(mesh(new THREE.BoxGeometry(r * 2, h * 0.55, r * 2), matA, 0, h * 0.275, 0));
      g.add(mesh(new THREE.BoxGeometry(r * 1.3, h * 0.45, r * 1.3), matB, 0, h * 0.775, 0));
      for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
        g.add(mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.26, h * 0.8, 8), matB, x * r * 0.95, h * 0.4, z * r * 0.95));
      }
      break;
    }
    case "cone":
      g.add(mesh(new THREE.CylinderGeometry(r, r * 1.15, h * 0.18, 18), matB, 0, h * 0.09, 0));
      g.add(mesh(new THREE.ConeGeometry(r * 0.92, h * 0.82, 18), matA, 0, h * 0.59, 0));
      break;
    case "sphere-cluster":
      g.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.6, h * 0.55, 10), matB, 0, h * 0.275, 0));
      g.add(mesh(new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), matA, 0, h * 0.52, 0));
      g.add(mesh(new THREE.SphereGeometry(r * 0.42, 12, 10), matA, r * 0.85, h * 0.3, r * 0.5));
      break;
    case "cylinder":
      g.add(mesh(new THREE.CylinderGeometry(r, r, h, 20), matA, 0, h / 2, 0));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, h * 0.12, 20), matB, 0, h + h * 0.06, 0));
      break;
    case "pyramid":
      g.add(mesh(new THREE.ConeGeometry(r * 1.35, h, 4), matA, 0, h / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(r * 2.1, h * 0.1, r * 2.1), matB, 0, h * 0.05, 0));
      break;
  }
  g.scale.setScalar(object.scale);
  return g;
}

/** Allowlisted rigid animation preserves an asset's shape and proportions. */
export function animateObject(group: THREE.Group, time: number, enabled:boolean|'roll' = true, distance = 0, compression = 0, listenerDistance = Infinity): void {
  group.traverse(part => {
    const joint=part.userData.jointRest;
    if(joint) {
      part.position.copy(joint.position);if(part.parent===group && joint.animation?.kind!=='roll') part.position.y-=compression;
      part.quaternion.copy(joint.rotation);
      if(enabled && joint.animation && (enabled!=='roll' || joint.animation.kind==='roll')) {
        const motion=joint.animation,axis=new THREE.Vector3(Number(motion.axis==="x"),Number(motion.axis==="y"),Number(motion.axis==="z"));
        part.rotateOnAxis(axis,'kind' in motion ? motion.kind==='roll' ? distance/(motion.radius*group.scale.x) : Math.sin(distance/(motion.strideLength*group.scale.x)*Math.PI*2+motion.phase)*motion.amplitudeRad : Math.sin(time*motion.speed+motion.phase)*motion.amplitudeRad);
      }
      if(joint.proximity) {
        const motion=joint.proximity,t=THREE.MathUtils.clamp((motion.radius-listenerDistance)/24,0,1),open=t*t*(3-2*t);
        part.rotateOnAxis(new THREE.Vector3(Number(motion.axis==="x"),Number(motion.axis==="y"),Number(motion.axis==="z")),open*motion.angleRad);
      }
    }
    const rest = part.userData.rest as { y: number; rotation: THREE.Quaternion; animation?: ObjectPart["animation"] } | undefined;
    if (!rest) return;
    const motion = rest.animation;
    part.position.y = rest.y - (motion?.kind === "roll" || part.parent!==group ? 0 : compression);
    part.quaternion.copy(rest.rotation);
    if (!enabled || !motion || enabled==='roll' && motion.kind!=='roll') return;
    if (motion.kind === "sway") part.rotateZ(Math.sin(time * motion.speed + part.position.x * .2) * motion.amplitudeRad);
    else if (motion.kind === "roll") {const axis=motion.axis ?? "y";part.rotateOnAxis(new THREE.Vector3(Number(axis==="x"),Number(axis==="y"),Number(axis==="z")),distance / (motion.radius * group.scale.x));}
    else part.rotateOnAxis(new THREE.Vector3(Number(motion.axis === "x"), Number(motion.axis === "y"), Number(motion.axis === "z")), time * motion.speed);
  });
}

export function buildPlayer(scene: Scene): THREE.Group {
  return scene.player ? buildCustom({ id: "player", kind: "custom", labelText: scene.player.displayName,
    x: 0, y: 0, scale: measuredScale(scene.player), spec: scene.player }) : buildCar();
}

/** People share the standing character's foot plane; other assets keep their existing lift. */
export const objectGroundLift=(object:Pick<SceneObject,'spec'>):number=>object.spec && 'dslVersion' in object.spec && object.spec.dslVersion===2 && object.spec.measure?.kind==='person' ? .2 : 1.5;

export function buildObject(object: SceneObject): THREE.Group {
  switch (object.kind) {
    case "tree": return buildTree(object.scale);
    case "cone": return buildCone(object.scale);
    case "tire-stack": return buildTireStack(object.scale);
    case "custom": return buildCustom(object);
  }
}

