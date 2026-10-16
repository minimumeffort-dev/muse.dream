import { z } from "zod";
import { measureProblem, measuredScale, MEASURE_KINDS } from "./measure";

/** Versioned bounded assemblies. Geometry, motion and shaders belong to the engine. */
export const objectMaterialSchema = z.object({
  shaderStyle: z.enum(["toon", "paper-grain", "glow", "stripes", "cloth"]),
  colorA: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorB: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).strict();

const offset = z.number().finite().min(-64).max(64);
const dimension = z.number().finite().min(0.5).max(128);
const angle = z.number().finite().min(-Math.PI).max(Math.PI);
export const breakImpactSchema=z.object({kind:z.literal("break"),speed:z.number().finite().min(40).max(400),scatter:z.number().finite().min(0).max(160),
  lift:z.number().finite().min(0).max(180),spin:z.number().finite().min(0).max(8),lifetime:z.number().finite().min(2).max(8),
  pattern:z.enum(["scatter","splinter","crumble"]).optional(),
}).strict();
export const impactSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("bounce"),restitution:z.number().finite().min(.1).max(.9),lift:z.number().finite().min(.05).max(.8)}).strict(),
  breakImpactSchema,
  z.object({kind:z.literal("topple"),speed:z.number().finite().min(40).max(400),duration:z.number().finite().min(.25).max(2),lifetime:z.number().finite().min(2).max(8)}).strict(),
]);
export type ImpactBehavior=z.infer<typeof impactSchema>;
export function impactOf(spec:{displayName:string;dslVersion?:number;impact?:ImpactBehavior}|undefined){return spec?.dslVersion===2 ? spec.impact : undefined;}
export function zonesOf(spec:{displayName:string;dslVersion?:number;breakZones?:ObjectDslV2["breakZones"]}|undefined){return spec?.dslVersion===2 ? spec.breakZones??[] : [];}
export function isReactive(spec:Parameters<typeof impactOf>[0] & Parameters<typeof zonesOf>[0]){return !!impactOf(spec) || zonesOf(spec).length>0;}

export const objectPartSchema = z.object({
  id: z.string().min(1).max(40),
  shape: z.enum(["box", "sphere", "cylinder", "cone", "pyramid", "icosphere"]),
  // Object-local XYZ: Y is up; position and size use canonical sheet pixels.
  position: z.tuple([offset, z.number().finite().min(0).max(128), offset]),
  size: z.tuple([dimension, dimension, dimension]),
  rotation: z.tuple([angle, angle, angle]).optional(),
  material: objectMaterialSchema,
  animation: z.discriminatedUnion("kind", [z.object({
    kind: z.literal("sway"),
    amplitudeRad: z.number().finite().min(0).max(0.12),
    speed: z.number().finite().min(0.1).max(3),
  }).strict(), z.object({
    kind: z.literal("roll"),
    radius: z.number().finite().min(1).max(32),
    axis:z.enum(["x","y","z"]).optional(),
  }).strict(), z.object({
    kind: z.literal("spin"), axis: z.enum(["x", "y", "z"]),
    speed: z.number().finite().min(-3).max(3),
  }).strict()]).optional(),
}).strict();

const objectV1Schema = z.object({
  dslVersion: z.literal(1),
  displayName: z.string().min(1).max(40),
  grounding: z.enum(["upright", "surface"]).optional(),
  parts: z.array(objectPartSchema).min(1).max(32),
  foundation: z.object({
    footprint: z.tuple([dimension, dimension]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }).strict().optional(),
  // Visual parts do not implicitly create colliders or change physics.
  body: z.object({
    interaction: z.enum(["solid", "knockable", "decor"]),
    colliderRadius: z.number().finite().min(4).max(30),
    colliderHeight: z.number().finite().min(4).max(160).optional(),
    frictionPerS: z.number().finite().min(0.5).max(5).optional(),
  }).strict(),
}).strict();

const jointAnimationSchema=z.object({
  axis:z.enum(["x","y","z"]), amplitudeRad:z.number().finite().min(0).max(1.4),
  speed:z.number().finite().min(.1).max(4),phase:z.number().finite().min(-Math.PI).max(Math.PI),
}).strict();
const jointSchema=z.object({
  id:z.string().min(1).max(40),parent:z.string().min(1).max(40).optional(),
  position:z.tuple([offset,offset,offset]),rotation:z.tuple([angle,angle,angle]).optional(),
  animation:jointAnimationSchema.optional(),
  proximity:z.object({axis:z.enum(["x","y","z"]),angleRad:z.number().finite().min(-Math.PI).max(Math.PI),radius:z.number().finite().min(20).max(160)}).strict().optional(),
}).strict();
const objectV2PartSchema=objectPartSchema.extend({
  shape:z.enum(["box","sphere","cylinder","cone","pyramid","icosphere","capsule","torus"]),
  parent:z.string().min(1).max(40).optional(),
  position:z.tuple([offset,z.number().finite().min(-128).max(128),offset]),
  taper:z.number().finite().min(.1).max(1).optional(),
  deform:z.object({seed:z.number().int().min(0).max(65535),amount:z.number().finite().min(0).max(.24)}).strict().optional(),
  fragment:z.string().min(1).max(40).optional(),
  zone:z.string().min(1).max(40).optional(),
}).strict();
const objectDslV2Schema=objectV1Schema.extend({
  measure:z.object({kind:z.enum(MEASURE_KINDS),axis:z.enum(["x","y","z"]),meters:z.number().finite().min(.05).max(60)}).strict().optional(),
  dslVersion:z.literal(2),joints:z.array(jointSchema).max(12).optional(),parts:z.array(objectV2PartSchema).min(1).max(32),
  contacts:z.array(z.object({position:z.tuple([offset,z.number().finite().min(0).max(128),offset]),radius:z.number().finite().min(1).max(64),height:z.number().finite().min(1).max(160)}).strict()).min(1).max(8).optional(),
  rideable:z.object({seat:z.tuple([offset,z.number().finite().min(0).max(128),offset]),control:z.enum(["car","bicycle","skateboard","boat","plane"]).optional()}).strict().optional(),
  emitter:z.object({kind:z.literal("steam"),position:z.tuple([offset,z.number().finite().min(0).max(128),offset]),rate:z.number().finite().min(1).max(12)}).strict().optional(),
  impact:impactSchema.optional(),
  breakZones:z.array(z.object({id:z.string().min(1).max(40),position:z.tuple([offset,z.number().finite().min(0).max(128),offset]),
    radius:z.number().finite().min(1).max(64),height:z.number().finite().min(1).max(160),impact:breakImpactSchema}).strict()).min(1).max(4).optional(),
}).strict();

/** v1 stays strict and readable; v2 adds shapes, organic variation and joint frames. */
export const objectDslSchema=z.discriminatedUnion("dslVersion",[objectV1Schema,objectDslV2Schema]).superRefine((spec, ctx) => {
  if (spec.foundation && spec.body.interaction !== "solid")
    ctx.addIssue({code:z.ZodIssueCode.custom,path:["foundation"],message:"terrain foundations require a solid body"});
  if (spec.foundation && spec.grounding === "surface")
    ctx.addIssue({code:z.ZodIssueCode.custom,path:["grounding"],message:"terrain foundations must stay upright"});
  const ids = new Set<string>();
  spec.parts.forEach((part, index) => {
    if (ids.has(part.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parts", index, "id"], message: "duplicate part id" });
    }
    ids.add(part.id);
  });
  if(spec.dslVersion===2) {
    spec.parts.forEach((part,index)=>{
      if(part.taper!==undefined && part.shape!=="cylinder")ctx.addIssue({code:z.ZodIssueCode.custom,path:["parts",index,"taper"],message:"taper requires a cylinder"});
    });
    const impact=spec.impact;
    if(impact && (spec.foundation || spec.contacts || spec.rideable || spec.emitter))ctx.addIssue({code:z.ZodIssueCode.custom,message:"impact objects use one body without foundations, contacts, seats or emitters"});
    if(impact && spec.body.interaction!==(impact.kind==="bounce" ? "knockable" : "solid"))ctx.addIssue({code:z.ZodIssueCode.custom,message:"bounce needs a knockable body; break/topple needs a solid body"});
    const zones=spec.breakZones??[],zoneIds=new Set(zones.map(z=>z.id)),fractures=spec.parts.filter(p=>impact?.kind==="break" || impact?.kind==="topple" || p.zone);
    if(zoneIds.size!==zones.length || zones.some(z=>ids.has(z.id)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"break zone ids must be unique"});
    for(const id of zoneIds)ids.add(id);
    if(zones.length && (impact || spec.body.interaction!=="solid" || spec.grounding==="surface" || spec.rideable || spec.emitter))ctx.addIssue({code:z.ZodIssueCode.custom,message:"break zones require an upright solid without whole-object impact, seats or emitters"});
    if(spec.parts.some(p=>p.zone && !zoneIds.has(p.zone)) || zones.some(z=>!spec.parts.some(p=>p.zone===z.id)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"every break zone must own parts; part zones must exist"});
    if(zones.length && !spec.parts.some(p=>!p.zone))ctx.addIssue({code:z.ZodIssueCode.custom,message:"partial destruction requires retained structural parts"});
    if(impact?.kind!=="break" && impact?.kind!=="topple" && spec.parts.some(p=>p.fragment && !p.zone))ctx.addIssue({code:z.ZodIssueCode.custom,message:"fragment groups require break/topple behavior or a break zone"});
    const fragmentCount=new Set(fractures.map(p=>p.fragment ? `group:${p.fragment}` : `part:${p.id}`)).size;
    if(fractures.length && (fragmentCount>8 || spec.parts.some(p=>p.animation) || spec.joints?.some(j=>j.animation || j.proximity)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"break assemblies need at most 8 static fragments"});
    if(impact?.kind==="topple" && fragmentCount!==1)ctx.addIssue({code:z.ZodIssueCode.custom,message:"topple needs exactly one rigid fragment"});
    if(impact?.kind==="topple" && impact.lifetime<impact.duration+.8)ctx.addIssue({code:z.ZodIssueCode.custom,message:"topple lifetime must allow its fall and final 0.8 second fade"});
    const ownership=new Map<string,string|undefined>();
    for(const p of spec.parts.filter(p=>p.fragment)){if(ownership.has(p.fragment!) && ownership.get(p.fragment!)!==p.zone)ctx.addIssue({code:z.ZodIssueCode.custom,message:"a fragment cannot cross break zones"});ownership.set(p.fragment!,p.zone);}
    if(spec.contacts && (spec.body.interaction!=="solid" || spec.grounding==="surface"))
      ctx.addIssue({code:z.ZodIssueCode.custom,message:"compound contacts require an upright solid"});
    if(spec.rideable && (spec.body.interaction!=="solid" || spec.foundation || spec.contacts))
      ctx.addIssue({code:z.ZodIssueCode.custom,message:"rideable assemblies require a solid cylinder without foundations"});
    const joints=new Map((spec.joints ?? []).map(joint=>[joint.id,joint]));
    for(const joint of spec.joints ?? []) {
      if(joint.animation && joint.proximity) ctx.addIssue({code:z.ZodIssueCode.custom,message:"a joint chooses oscillation or proximity motion"});
      if(ids.has(joint.id)) ctx.addIssue({code:z.ZodIssueCode.custom,message:"joint and part ids must be unique"});
      ids.add(joint.id);
    }
    let hierarchyValid=true;
    const pathLength=(id:string,seen=new Set<string>()):number=> {
      const joint=joints.get(id);
      if(!joint || seen.has(id) || seen.size>=4) {
        hierarchyValid=false;
        ctx.addIssue({code:z.ZodIssueCode.custom,message:"joint hierarchy must reference existing joints, be acyclic and at most four levels deep"});return Infinity;
      }
      seen.add(id);
      return Math.hypot(...joint.position)+(joint.parent ? pathLength(joint.parent,seen) : 0);
    };
    for(const joint of joints.values()) pathLength(joint.id);
    for(const part of spec.parts) {
      const distance=(part.parent ? pathLength(part.parent) : 0)+Math.hypot(...part.position)+Math.hypot(...part.size)/2;
      if(distance>256) ctx.addIssue({code:z.ZodIssueCode.custom,message:"assembled part exceeds the 256-unit reach budget"});
    }
    // Only inspect geometry after hierarchy/shape validation has succeeded.
    if(spec.measure){
      const problem=measureProblem(spec.measure);
      if(problem)ctx.addIssue({code:z.ZodIssueCode.custom,path:["measure"],message:problem});
      else if(hierarchyValid && spec.parts.every(p=>p.taper===undefined || p.shape==="cylinder" && p.taper>=.1 && p.taper<=1)){const scale=measuredScale(spec);if(!Number.isFinite(scale) || scale<.05 || scale>4)ctx.addIssue({code:z.ZodIssueCode.custom,path:["measure"],message:"measured size must resolve to a uniform scale in 0.05..4"});}
    }
  }
});

export type ObjectDslV1 = z.infer<typeof objectV1Schema>;
export type ObjectDsl = z.infer<typeof objectDslSchema>;
export type ObjectDslV2 = z.infer<typeof objectDslV2Schema>;
export type ObjectPart = ObjectDsl["parts"][number];
export type ObjectMaterial = z.infer<typeof objectMaterialSchema>;

export const MAX_ANIMATED_ASSEMBLIES=24;
export function hasAnimatedJoints(spec:{displayName:string;dslVersion?:number;joints?:{id:string;animation?:unknown;proximity?:unknown}[]}|undefined):boolean {
  return spec?.dslVersion===2 && !!spec.joints?.some(joint=>joint.animation || joint.proximity);
}

export type VehicleControl=NonNullable<ObjectDslV2["rideable"]>["control"] & string;
export function controlOf(spec:{displayName:string;dslVersion?:number;rideable?:{control?:VehicleControl}}|undefined):VehicleControl|undefined {
  return spec?.dslVersion===2 ? spec.rideable?.control : undefined;
}
