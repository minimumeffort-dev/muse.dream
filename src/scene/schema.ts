import { z } from "zod";
import { measuredScale, measureProblem } from "./measure";
import { objectDslSchema, hasAnimatedJoints, MAX_ANIMATED_ASSEMBLIES,impactOf,isReactive } from "./object-dsl";
import { terrainSchema } from "./terrain";
import { routeSchema } from "./routes";

/**
 * Versioned scene document: the single contract between geometry/semantics
 * (later slices) and the simulation. Appearance, collision and behavior stay
 * separate: the renderer draws the paper, the raster mask collides, and
 * region rules bind stable region IDs to allowlisted effects.
 * Live car state is never stored here.
 */

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const effectSchema = z.enum(["ICE", "BOOST"]);

export const regionRuleSchema = z.object({
  effect: effectSchema,
});

export const regionSchema = z.object({
  id: z.string().min(1),
  /** Handwritten text seen on paper, kept for provenance/debugging. */
  labelText: z.string(),
  /** Closed polygon in canonical coordinates (not repeated first point). */
  polygon: z.array(pointSchema).min(3).max(256),
  rule: regionRuleSchema,
});

/**
 * Object archetypes: the allowlisted vocabulary a detector (mock now, a
 * vision model later) may assign to a drawing. The model picks the kind and
 * bounded parameters; ordinary code owns each kind's collider, mechanics,
 * and rendering (see ARCHETYPES in ../sim/archetypes.ts). A new kind means
 * new tested code, never a model-invented behavior.
 */
export const objectKindSchema = z.enum(["tree", "cone", "tire-stack", "custom"]);

/**
 * A model-invented archetype, as DATA (user decision 2026-10-15). The model
 * may compose these bounded fields for a drawing it cannot classify; the
 * engine compiles the spec into the same collider/interaction/sprite
 * contract as built-in kinds. No model-written code (JS or GLSL) executes:
 * shapes and shader styles are allowlists, every number is ranged here and
 * clamped again in src/sim/archetypes.ts.
 */
const legacyCustomSpecSchema = z.object({
  displayName: z.string().min(1).max(40),
  shape: z.enum(["box-stack", "cone", "sphere-cluster", "cylinder", "pyramid"]),
  interaction: z.enum(["solid", "knockable", "decor"]),
  colliderRadius: z.number().min(4).max(30),
  heightFactor: z.number().min(0.3).max(3),
  colorA: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorB: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  shaderStyle: z.enum(["toon", "paper-grain", "glow", "stripes"]),
  frictionPerS: z.number().min(0.5).max(5).optional(),
}).strict();

// Existing recipe specs remain readable; new mock inventions use the versioned DSL.
export const customSpecSchema = z.union([objectDslSchema, legacyCustomSpecSchema]);

export const sceneObjectSchema = z.object({
  id: z.string().min(1),
  kind: objectKindSchema,
  /** What the player (or mock) called it on paper, for provenance. */
  labelText: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  /** Resolved uniform scale. Measured assets share the world's physical unit. */
  scale: z.number().finite().min(0.05).max(4),
  headingRad:z.number().finite().min(-Math.PI*2).max(Math.PI*2).optional(),
  route:z.object({id:z.string().min(1).max(40),offset:z.number().finite().min(0).max(2048).default(0)}).strict().optional(),
  /** Required when kind is "custom": the invented archetype as data. */
  spec: customSpecSchema.optional(),
}).superRefine((o, ctx) => {
  const spec=o.spec && "dslVersion" in o.spec && o.spec.dslVersion===2 ? o.spec : undefined;
  if(spec?.measure){
    const variation=o.scale/measuredScale(spec),problem=measureProblem(spec.measure,variation);
    if(problem || variation<.5-1e-7 || variation>2+1e-7)ctx.addIssue({code:z.ZodIssueCode.custom,path:["scale"],message:problem??"measured placement variation must be 0.5..2"});
  }else if(o.scale<.5 || o.scale>2)ctx.addIssue({code:z.ZodIssueCode.custom,path:["scale"],message:"unmeasured placement scale must be 0.5..2"});
  if (o.kind === "custom" && !o.spec) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "custom object requires a spec", path: ["spec"] });
  }
  if (o.kind !== "custom" && o.spec) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "only custom objects may carry a spec", path: ["spec"] });
  }
});

export const checkpointSchema = z.object({
  id: z.string().min(1),
  a: pointSchema,
  b: pointSchema,
  /** Unit travel direction; only crossings along it count. */
  dir: pointSchema,
});

export const sceneSchema = z.object({
  schemaVersion: z.literal(1),
  sceneId: z.string().min(1),
  revisionId: z.string().min(1),
  /** Hash/identity of the source this scene was derived from. */
  sourceHash: z.string().min(1),
  canonical: z.object({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    /** Coordinate system: origin top-left, +x right, +y down, units px. */
    coordinateSystem: z.literal("top-left-x-right-y-down-px"),
  }),
  roadMaskRef: z.discriminatedUnion("kind", [
    z.object({
    kind: z.literal("generated-rounded-rect-loop"),
    params: z.object({
      outer: z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().positive(),
        height: z.number().positive(),
        radius: z.number().nonnegative(),
      }),
      roadWidth: z.number().positive(),
    }),
  }),
    z.object({ kind: z.literal("generated-spline-loop"), params: z.object({
      points: z.array(z.object({x: z.number().min(0).max(8192), y: z.number().min(0).max(8192)}).strict()).min(6).max(64).refine(points=>points.every((p,i)=>{const next=points[(i+1)%points.length]!;return Math.hypot(p.x-next.x,p.y-next.y)>8;}), "road anchors must be distinct and at least 8 units apart"),
      roadWidth: z.number().min(40).max(240),
    }).strict() }).strict(),
  ]),
  spawn: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    headingRad: z.number().finite(),
  }),
  terrain: terrainSchema.default({ hills: [] }),
  routes:z.array(routeSchema).max(12).default([]),
  player: objectDslSchema.optional().refine((spec) => !spec || spec.body.interaction === "solid", {
    message: "player requires a solid body",
  }).refine((spec)=>!spec?.foundation,{message:"player cannot carry a terrain foundation"})
    .refine(spec=>!spec || spec.dslVersion!==2 || !spec.contacts && !spec.rideable && !spec.emitter && !isReactive(spec),
      {message:"player uses its driving cylinder; contacts, rideable seats and emitters belong on world objects"}),
  /** Ordered: index 0 is start/finish; laps require 1..n-1 in order first. */
  checkpoints: z.array(checkpointSchema).min(2).max(64),
  regions: z.array(regionSchema).max(128),
  objects: z.array(sceneObjectSchema).max(4096),
  /** Labels read on paper that no supported effect claims. Never executed. */
  unresolvedLabels: z.array(
    z.object({ regionId: z.string().min(1), labelText: z.string() }),
  ),
  provenance: z.object({
    source: z.literal("handmade-fixture"),
    notes: z.string(),
  }),
}).superRefine((scene,ctx)=> {
  const animated=scene.objects.filter(object=>hasAnimatedJoints(object.spec)).length+Number(hasAnimatedJoints(scene.player));
  if(animated>MAX_ANIMATED_ASSEMBLIES) ctx.addIssue({code:z.ZodIssueCode.custom,message:`scene exceeds ${MAX_ANIMATED_ASSEMBLIES} animated assemblies`});
  if(scene.objects.filter(o=>o.route).length>24) ctx.addIssue({code:z.ZodIssueCode.custom,message:"scene exceeds 24 route actors"});
  const reactive=scene.objects.filter(o=>isReactive(o.spec));
  if(reactive.length>24)ctx.addIssue({code:z.ZodIssueCode.custom,message:"scene exceeds 24 impact objects"});
  const fragments=reactive.reduce((sum,{spec})=>{
    if(!spec || !("dslVersion" in spec) || spec.dslVersion!==2 || spec.impact?.kind==="bounce")return sum;
    const parts=spec.impact ? spec.parts : spec.parts.filter(p=>p.zone);
    return sum+new Set(parts.map(p=>p.fragment ? `group:${p.fragment}` : `part:${p.id}`)).size;
  },0);
  if(fragments>128)ctx.addIssue({code:z.ZodIssueCode.custom,message:"scene exceeds 128 destruction fragments"});
  if(reactive.some(o=>o.route))ctx.addIssue({code:z.ZodIssueCode.custom,message:"route actors cannot carry impact behavior"});
  if(scene.objects.filter(o=>o.spec && "dslVersion" in o.spec && o.spec.dslVersion===2 && o.spec.emitter).length>16)ctx.addIssue({code:z.ZodIssueCode.custom,message:"scene exceeds 16 particle emitters"});
  for(const object of scene.objects) if(object.route && (!scene.routes.some(r=>r.id===object.route!.id) || !object.spec || !("dslVersion" in object.spec) || object.spec.foundation || object.spec.body.interaction!=="solid" || object.spec.dslVersion===2 && object.spec.contacts))
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"route actors need an existing route and a solid cylinder without a foundation"});
});

export type Point = z.infer<typeof pointSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Region = z.infer<typeof regionSchema>;
export type ObjectKind = z.infer<typeof objectKindSchema>;
export type CustomSpec = z.infer<typeof customSpecSchema>;
export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Scene = z.infer<typeof sceneSchema>;

export function parseScene(data: unknown): Scene {
  return sceneSchema.parse(data);
}
