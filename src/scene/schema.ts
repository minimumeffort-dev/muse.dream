import {daylightSchema,MAX_LIGHT_POOLS} from './daylight';
import {MAX_WORLD_SIZE,MAX_STREET_LENGTH} from './world-bounds';
import { z } from "zod";
import { assemblyHorizontalRadius, measuredScale, measureProblem } from "./measure";
import { objectDslSchema, hasAnimatedJoints, MAX_ANIMATED_ASSEMBLIES,impactOf,isReactive } from "./object-dsl";
import { terrainSchema } from "./terrain";
import { routeSchema } from "./routes";
import {flockSchema,POPULATION_LIMITS} from './population';
import {siteSchema,crossingSchema} from './sites';
import {streetSchema,surfaceSchema,markingSchema} from './streets';
import {NPC_LIMITS,roleSchema,behaviorSchema,roleOf,controlFor,agentProblem} from './agents';

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
  role:roleSchema.optional(),
  behavior:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/).optional(),
  route:z.object({id:z.string().min(1).max(40),offset:z.number().finite().min(0).max(2048).default(0),phaseS:z.number().finite().min(0).max(3600).optional()}).strict().optional(),
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
    width: z.number().int().positive().max(MAX_WORLD_SIZE),
    height: z.number().int().positive().max(MAX_WORLD_SIZE),
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
      style: z.enum(["racing","street"]).optional(),
    }),
  }),
    z.object({ kind: z.literal("generated-spline-loop"), params: z.object({
      points: z.array(z.object({x: z.number().min(0).max(MAX_WORLD_SIZE), y: z.number().min(0).max(MAX_WORLD_SIZE)}).strict()).min(6).max(64).refine(points=>points.every((p,i)=>{const next=points[(i+1)%points.length]!;return Math.hypot(p.x-next.x,p.y-next.y)>8;}), "road anchors must be distinct and at least 8 units apart"),
      roadWidth: z.number().min(40).max(240),
      style: z.enum(["racing","street"]).optional(),
    }).strict() }).strict(),
  ]),
  spawn: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    headingRad: z.number().finite(),
  }),
  daylight:daylightSchema.optional(),
  terrain: terrainSchema.default({ hills: [] }),
  routes:z.array(routeSchema).max(12).default([]),
  behaviors:z.array(behaviorSchema).max(NPC_LIMITS.programs).default([]),
  streets:z.array(streetSchema).max(32).default([]),
  surfaces:z.array(surfaceSchema).max(64).default([]),
  markings:z.array(markingSchema).max(128).default([]),
  flocks:z.array(flockSchema).max(POPULATION_LIMITS.flocks).default([]),
  sites:z.array(siteSchema).max(256).default([]),
  crossings:z.array(crossingSchema).max(64).default([]),
  player: objectDslSchema.optional().refine((spec) => !spec || spec.body.interaction === "solid", {
    message: "player requires a solid body",
  }).refine((spec)=>!spec?.foundation,{message:"player cannot carry a terrain foundation"})
    .refine(spec=>!spec || spec.dslVersion!==2 || !spec.contacts && !spec.rideable && !spec.emitter && !spec.lamp && !isReactive(spec),
      {message:"player uses its driving cylinder; contacts, rideable seats, lamps and emitters belong on world objects"}),
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
  const lamps=scene.objects.filter(o=>o.spec && "lamp" in o.spec && o.spec.lamp);
  if(lamps.length>MAX_LIGHT_POOLS)ctx.addIssue({code:"custom",message:"scene exceeds 512 light pools"});
  for(const o of lamps)if(roleOf(o)!=="prop" || o.route || o.spec && "body" in o.spec && o.spec.body.interaction==="knockable" || isReactive(o.spec))ctx.addIssue({code:"custom",message:`lamp "${o.id}" requires a static prop without damage`});
  const length=(points:Point[])=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i]!.x,p.y-points[i]!.y),0);
  if(scene.streets.reduce((n,s)=>n+length(s.points),0)>MAX_STREET_LENGTH)ctx.addIssue({code:'custom',message:'scene exceeds 120000 street units'});
  if(scene.markings.reduce((n,s)=>n+length(s.closed ? [...s.points,s.points[0]!] : s.points),0)>40000)ctx.addIssue({code:'custom',message:'scene exceeds 40000 marking units'});
  if(scene.flocks.reduce((n,f)=>n+f.count,0)>POPULATION_LIMITS.birds)ctx.addIssue({code:'custom',message:'scene exceeds 256 decorative flock members'});
  for(const f of scene.flocks){const margin=assemblyHorizontalRadius(f.spec,measuredScale(f.spec))+8;if(f.center.x<f.radius.x+margin || f.center.y<f.radius.y+margin || f.center.x+f.radius.x+margin>scene.canonical.width || f.center.y+f.radius.y+margin>scene.canonical.height)ctx.addIssue({code:'custom',message:`flock "${f.id}" flight envelope extends outside the world`});}
  // The standing player character occupies one of the existing live animation slots.
  const animated=scene.objects.filter(object=>hasAnimatedJoints(object.spec)).length+Number(hasAnimatedJoints(scene.player))+1;
  if(animated>MAX_ANIMATED_ASSEMBLIES) ctx.addIssue({code:z.ZodIssueCode.custom,message:`scene exceeds ${MAX_ANIMATED_ASSEMBLIES} animated assemblies`});
  if(scene.objects.filter(o=>o.route || controlFor(o)).length>24) ctx.addIssue({code:z.ZodIssueCode.custom,message:"scene exceeds 24 route actors or controllable vehicles"});
  if(scene.objects.filter(o=>roleOf(o)==='npc').length>NPC_LIMITS.actors)ctx.addIssue({code:'custom',message:'scene exceeds 32 NPCs'});
  if(new Set(scene.behaviors.map(b=>b.id)).size!==scene.behaviors.length)ctx.addIssue({code:'custom',message:'duplicate behavior ID'});
  for(const object of scene.objects){const problem=agentProblem(object,scene.behaviors,scene.routes);if(problem)ctx.addIssue({code:'custom',message:`${object.id}: ${problem}`});}
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
  for(const object of scene.objects)if(object.route){
    const route=scene.routes.find(r=>r.id===object.route!.id);
    if(!route || !object.spec || !("dslVersion" in object.spec) || object.spec.foundation || object.spec.body.interaction!==(route.kind==="ambient" || route.kind==="walk" ? "decor" : "solid") || object.spec.dslVersion===2 && object.spec.contacts && !["street","tram","rail"].includes(route.kind))
      ctx.addIssue({code:z.ZodIssueCode.custom,message:"route actors need an existing route without foundations/compound contacts; ambient actors require decor, other routes require a solid cylinder"});
  }
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
