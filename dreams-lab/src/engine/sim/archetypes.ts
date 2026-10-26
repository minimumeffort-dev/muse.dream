import type { ObjectKind, SceneObject } from "../scene/schema";

/**
 * The archetype table: everything a detected object can be, owned by code.
 * A detector (mock today, a vision model later) chooses `kind`, position,
 * label text, and a bounded scale. It cannot choose the collider shape, the
 * interaction, or the physics — those come from here and are covered by
 * tests. Adding a row here (plus its sim/render/tests) is how the drawing
 * vocabulary grows.
 */
export type Interaction = "solid" | "knockable" | "decor";

export interface Archetype {
  /** Collider: a circle of this radius (x object scale), in canonical px. */
  colliderRadius: number;
  /** Height of the physical cylinder, independent of rendered parts. */
  colliderHeight: number;
  interaction: Interaction;
  /** Sprite draw size (square, px x object scale). */
  spriteSize: number;
  /** Knockables: velocity retained per second after being hit (friction). */
  frictionPerS?: number;
}

export const ARCHETYPES: Record<Exclude<ObjectKind, "custom">, Archetype> = {
  // Immovable. Mostly scenery on the island/verge; blocks the car if on road.
  tree: { colliderRadius: 14, colliderHeight: 72, interaction: "solid", spriteSize: 64 },
  // Light: the car punts it and drives on; it slides and settles.
  cone: { colliderRadius: 8, colliderHeight: 18, interaction: "knockable", spriteSize: 26, frictionPerS: 2.2 },
  // Immovable road obstacle: a slalom block the car must steer around.
  "tire-stack": { colliderRadius: 15, colliderHeight: 24, interaction: "solid", spriteSize: 40 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Compiles any scene object (built-in or model-invented custom spec) into
 * the one engine contract. Custom values are clamped again here even though
 * the schema bounds them: engine safety never trusts a single check.
 */
export function archetypeOf(object: SceneObject): Archetype {
  if (object.kind !== "custom") return ARCHETYPES[object.kind];
  const spec = object.spec as NonNullable<SceneObject["spec"]>;
  const body = "dslVersion" in spec ? spec.body : spec;
  const radius = clamp(body.colliderRadius, 4, 30);
  return {
    colliderRadius: radius,
    colliderHeight: "colliderHeight" in body ? clamp(body.colliderHeight ?? 64, 4, 160) : 64,
    interaction: body.interaction,
    spriteSize: radius * 2.6,
    frictionPerS: body.frictionPerS ? clamp(body.frictionPerS, 0.5, 5) : 2.2,
  };
}

export function objectRadius(object: SceneObject): number {
  const contacts=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.contacts : undefined;
  const zones=object.spec && "dslVersion" in object.spec && object.spec.dslVersion===2 ? object.spec.breakZones??[] : [];
  return Math.max(contacts ? Math.max(...contacts.map(p=>Math.hypot(p.position[0],p.position[2])+(p.radius??Math.hypot(...p.size!)/2))) : archetypeOf(object).colliderRadius,
    ...zones.map(p=>Math.hypot(p.position[0],p.position[2])+p.radius)) * object.scale;
}

export function objectHeight(object: SceneObject): number {
  return archetypeOf(object).colliderHeight * object.scale;
}
