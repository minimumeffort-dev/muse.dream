import { z } from "zod";
import {HUMANOID_BONES,BONE_PARENT} from './humanoid';
import { measureProblem, measuredScale, MEASURE_KINDS } from "./measure";
import {voxelSchema,voxelCells,voxelWork,voxelChunkCount,VOXEL_LIMITS} from './voxels';
import {profileProblem} from './profile';

/** Versioned bounded assemblies. Geometry, motion and shaders belong to the engine. */
export const objectMaterialSchema = z.object({
  shaderStyle: z.enum(["toon", "paper-grain", "glow", "stripes", "cloth", "brick", "wood", "stone"]),
  colorA: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorB: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  nightColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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
export const jointSchema=z.object({
  id:z.string().min(1).max(40),parent:z.string().min(1).max(40).optional(),
  bone:z.enum(HUMANOID_BONES).optional(),
  position:z.tuple([offset,offset,offset]),rotation:z.tuple([angle,angle,angle]).optional(),
  animation:z.union([jointAnimationSchema,z.object({kind:z.literal('roll'),axis:z.enum(['x','y','z']),radius:z.number().finite().min(1).max(32)}).strict()]).optional(),
  proximity:z.object({axis:z.enum(["x","y","z"]),angleRad:z.number().finite().min(-Math.PI).max(Math.PI),radius:z.number().finite().min(20).max(160)}).strict().optional(),
}).strict();
export const MIN_DETAIL_SIZE=.1;
const detailDimension=z.number().finite().min(MIN_DETAIL_SIZE).max(128);
const objectV2PartSchema=objectPartSchema.extend({
  size:z.tuple([detailDimension,detailDimension,detailDimension]),
  shape:z.enum(["box","sphere","cylinder","cone","pyramid","icosphere","capsule","torus","prism","voxel"]),
  voxels:voxelSchema.optional(),
  outline:z.array(z.tuple([z.number().finite(),z.number().finite()])).min(3).max(24).optional(),
  cutaway:z.enum(["roof","front","back","left","right"]).optional(),
  parent:z.string().min(1).max(40).optional(),
  position:z.tuple([offset,z.number().finite().min(-128).max(128),offset]),
  taper:z.number().finite().min(.1).max(1).optional(),
  deform:z.object({seed:z.number().int().min(0).max(65535),amount:z.number().finite().min(0).max(.24)}).strict().optional(),
  fragment:z.string().min(1).max(40).optional(),
  zone:z.string().min(1).max(40).optional(),
}).strict();
const objectDslV2Schema=objectV1Schema.extend({
  body:objectV1Schema.shape.body.extend({clearanceRadius:z.number().finite().min(4).max(128).optional()}).strict(),
  voxelSize:z.number().finite().min(.25).max(4).optional(),
  measure:z.object({kind:z.enum(MEASURE_KINDS),axis:z.enum(["x","y","z"]),meters:z.number().finite().min(.05).max(60)}).strict().optional(),
  dslVersion:z.literal(2),joints:z.array(jointSchema).max(12).optional(),parts:z.array(objectV2PartSchema).min(1).max(32),
  contacts:z.array(z.object({position:z.tuple([offset,z.number().finite().min(0).max(128),offset]),radius:z.number().finite().min(1).max(64).optional(),size:z.tuple([z.number().finite().min(.1).max(128),z.number().finite().min(.1).max(128)]).optional(),headingRad:z.number().finite().min(-2*Math.PI).max(2*Math.PI).optional(),height:z.number().finite().min(.1).max(160)}).strict()).min(1).max(8).optional(),
  interior:z.object({position:z.tuple([offset,z.number().finite().min(.1).max(64),offset]),size:z.tuple([z.number().finite().min(2).max(128),z.number().finite().min(1).max(128),z.number().finite().min(2).max(128)]),portals:z.array(z.object({id:z.string().min(1).max(40),side:z.enum(["front","back","left","right"]),offset:z.number().finite().min(-64).max(64),width:z.number().finite().min(1).max(32),height:z.number().finite().min(1).max(64)}).strict()).min(1).max(4)}).strict().optional(),
  seats:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),position:z.tuple([offset,z.number().finite().min(.1).max(128),offset]),approach:z.tuple([offset,offset]),headingRad:z.number().finite().min(-2*Math.PI).max(2*Math.PI)}).strict()).min(1).max(4).optional(),
  rideable:z.object({seat:z.tuple([offset,z.number().finite().min(0).max(128),offset]),control:z.enum(["car","bicycle","skateboard","scooter","boat","plane"]).optional()}).strict().optional(),
  lamp:z.object({position:z.tuple([offset,z.number().finite().min(0).max(128),offset]),radius:z.number().finite().min(8).max(80),color:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict().optional(),
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
    if(spec.body.clearanceRadius!==undefined && spec.body.clearanceRadius<spec.body.colliderRadius)ctx.addIssue({code:"custom",path:["body","clearanceRadius"],message:"layout clearance must be at least the collision radius"});
    if(spec.seats){
      if(new Set(spec.seats.map(s=>s.id)).size!==spec.seats.length)ctx.addIssue({code:'custom',path:['seats'],message:'seat IDs must be unique'});
      if(spec.body.interaction!=='solid' || spec.foundation || spec.interior || spec.contacts || spec.rideable || spec.grounding==='surface' || spec.joints?.length || spec.parts.some(p=>p.animation) || spec.breakZones?.length || spec.impact && spec.impact.kind!=='break')ctx.addIssue({code:'custom',path:['seats'],message:'furniture seats require one upright static cylinder without contacts, foundations, interiors, transport seats, joints, break zones or moving impacts'});
    }
    let geometryValid=true;
    spec.parts.forEach((part,index)=>{
      if(part.shape==='voxel' && (!part.voxels || !voxelSchema.safeParse(part.voxels).success))geometryValid=false;
      if(part.taper!==undefined && part.shape!=="cylinder"){geometryValid=false;ctx.addIssue({code:z.ZodIssueCode.custom,path:["parts",index,"taper"],message:"taper requires a cylinder"});}
      const problem=part.shape==='prism' ? part.outline ? profileProblem(part.outline) : 'prism requires an outline' : part.outline ? 'outline requires a prism' : undefined;
      if(problem){geometryValid=false;ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts',index,'outline'],message:problem});}
    });
    const volumes=spec.parts.flatMap(p=>p.voxels ? [p.voxels] : []);
    if(volumes.reduce((n,v)=>n+voxelCells(v),0)>VOXEL_LIMITS.objectCells || volumes.reduce((n,v)=>n+voxelWork(v),0)>VOXEL_LIMITS.objectWork)
      ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts'],message:'assembly voxel budget exceeds 65536 cells or 1048576 cell visits'});
    spec.parts.forEach((p,i)=>{
      if((p.shape==='voxel')!==!!p.voxels)ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts',i,'voxels'],message:'voxel shape requires voxel data; other shapes cannot use it'});
      if(p.voxels && (p.deform || p.animation || p.material.shaderStyle==='cloth'))ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts',i,'voxels'],message:'voxels use rigid geometry without deform, cloth or part motion; joints remain available'});
      if(p.voxels?.chunks && (p.fragment || !(spec.impact?.kind==='break' || p.zone)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts',i,'voxels','chunks'],message:'voxel chunks require break behavior or a break zone and cannot belong to a fragment group'});
    });
    spec.contacts?.forEach((c,i)=>{
      if((c.radius!==undefined)===(c.size!==undefined))ctx.addIssue({code:z.ZodIssueCode.custom,path:['contacts',i,'size'],message:'contact needs exactly one of radius or size'});
      if(c.headingRad!==undefined && !c.size)ctx.addIssue({code:z.ZodIssueCode.custom,path:['contacts',i,'headingRad'],message:'heading requires a rectangle contact'});
      if(c.radius!==undefined && c.height<1)ctx.addIssue({code:z.ZodIssueCode.custom,path:['contacts',i,'height'],message:'cylinder height must be at least 1'});
    });
    if(spec.interior){
      const r=spec.interior,[x,y,zAt]=r.position,[w,h,d]=r.size;
      const problem=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,path:['interior'],message});
      if(spec.body.interaction!=='solid' || !spec.foundation || spec.grounding==='surface' || spec.rideable || spec.impact || spec.joints?.length)problem('interior requires a static upright solid foundation without seats, impact or joints');
      if(Math.abs(x)+w/2>64 || Math.abs(zAt)+d/2>64 || y+h>128)problem('interior must fit local +/-64 and height 128');
      if(new Set(r.portals.map(p=>p.id)).size!==r.portals.length)problem('portal IDs must be unique');
      for(const p of r.portals)if(Math.abs(p.offset)+p.width/2>(['front','back'].includes(p.side) ? w : d)/2 || p.height>h)problem('portal must fit its interior side and headroom');
      if(!spec.contacts?.some(c=>c.size && !c.headingRad && Math.abs(c.position[0]-x)+w/2<=c.size[0]/2+.001 && Math.abs(c.position[2]-zAt)+d/2<=c.size[1]/2+.001 && Math.abs(c.position[1]+c.height-y)<.001))problem('interior needs one rectangle floor contact covering its bounds with its top at interior.at.y');
      if(!spec.contacts?.some(c=>c.size && !c.headingRad && Math.abs(c.position[0]-x)+w/2<=c.size[0]/2+.001 && Math.abs(c.position[2]-zAt)+d/2<=c.size[1]/2+.001 && Math.abs(c.position[1]-y-h)<.001))problem('interior needs one rectangle ceiling contact covering its bounds with its bottom at floor_y + clear height');
      if(!spec.parts.some(p=>p.cutaway==='roof'))problem('interior needs explicitly tagged roof parts');
    }else if(spec.parts.some(p=>p.cutaway))ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts'],message:'cutaway parts require an interior'});
    if(spec.parts.some(p=>p.cutaway && (p.parent || p.animation || p.zone || p.fragment)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['parts'],message:'cutaway parts must be static retained shell parts'});
    const impact=spec.impact;
    if(impact && (spec.foundation || spec.contacts && (impact.kind==='bounce' || spec.contacts.some(c=>!!c.size) || spec.contacts.length!==1 || spec.contacts[0]!.position.some(n=>n!==0)) || spec.rideable || spec.emitter))ctx.addIssue({code:z.ZodIssueCode.custom,message:"impact objects use one centered cylinder without foundations, compound/offset contacts, seats or emitters"});
    if(impact && spec.body.interaction!==(impact.kind==="bounce" ? "knockable" : "solid"))ctx.addIssue({code:z.ZodIssueCode.custom,message:"bounce needs a knockable body; break/topple needs a solid body"});
    const zones=spec.breakZones??[],zoneIds=new Set(zones.map(z=>z.id)),fractures=spec.parts.filter(p=>impact?.kind==="break" || impact?.kind==="topple" || p.zone);
    if(zoneIds.size!==zones.length || zones.some(z=>ids.has(z.id)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"break zone ids must be unique"});
    for(const id of zoneIds)ids.add(id);
    if(zones.length && (impact || spec.body.interaction!=="solid" || spec.grounding==="surface" || spec.rideable || spec.emitter))ctx.addIssue({code:z.ZodIssueCode.custom,message:"break zones require an upright solid without whole-object impact, seats or emitters"});
    if(spec.parts.some(p=>p.zone && !zoneIds.has(p.zone)) || zones.some(z=>!spec.parts.some(p=>p.zone===z.id)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"every break zone must own parts; part zones must exist"});
    if(zones.length && !spec.parts.some(p=>!p.zone))ctx.addIssue({code:z.ZodIssueCode.custom,message:"partial destruction requires retained structural parts"});
    if(impact?.kind!=="break" && impact?.kind!=="topple" && spec.parts.some(p=>p.fragment && !p.zone))ctx.addIssue({code:z.ZodIssueCode.custom,message:"fragment groups require break/topple behavior or a break zone"});
    const fragmentCount=new Set(fractures.filter(p=>!p.voxels?.chunks).map(p=>p.fragment ? `group:${p.fragment}` : `part:${p.id}`)).size+fractures.reduce((n,p)=>n+(p.voxels?.chunks ? voxelChunkCount(p.voxels) : 0),0);
    const movingFragment=spec.parts.findIndex(p=>p.animation && !(impact?.kind==='topple' && p.animation.kind==='sway'));
    if(fractures.length && (fragmentCount>8 || movingFragment>=0 || spec.joints?.some(j=>j.animation || j.proximity || j.bone)))ctx.addIssue({code:z.ZodIssueCode.custom,path:movingFragment>=0 ? ['parts',movingFragment,'animation'] : [],message:"break assemblies need at most 8 static fragments; whole-object topple also permits part sway"});
    if(impact?.kind==="topple" && fragmentCount!==1)ctx.addIssue({code:z.ZodIssueCode.custom,message:"topple needs exactly one rigid fragment"});
    if(impact?.kind==="topple" && impact.lifetime<impact.duration+.8)ctx.addIssue({code:z.ZodIssueCode.custom,message:"topple lifetime must allow its fall and final 0.8 second fade"});
    const ownership=new Map<string,string|undefined>();
    for(const p of spec.parts.filter(p=>p.fragment)){if(ownership.has(p.fragment!) && ownership.get(p.fragment!)!==p.zone)ctx.addIssue({code:z.ZodIssueCode.custom,message:"a fragment cannot cross break zones"});ownership.set(p.fragment!,p.zone);}
    if(spec.contacts?.some(c=>c.size) && spec.rideable)ctx.addIssue({code:z.ZodIssueCode.custom,path:['contacts'],message:'rectangle contacts belong to static structures without seats'});
    if(spec.contacts && (spec.body.interaction!=="solid" || spec.grounding==="surface"))
      ctx.addIssue({code:z.ZodIssueCode.custom,message:"compound contacts require an upright solid"});
    if(spec.rideable && (spec.body.interaction!=="solid" || spec.foundation || spec.contacts && spec.rideable.control))
      ctx.addIssue({code:z.ZodIssueCode.custom,message:"rideable assemblies require a solid body without foundations; driver controls require a single cylinder"});
    const joints=new Map((spec.joints ?? []).map(joint=>[joint.id,joint]));
    const bones=(spec.joints??[]).filter(j=>j.bone);
    if(bones.length){
      if(bones.length!==HUMANOID_BONES.length || new Set(bones.map(j=>j.bone)).size!==HUMANOID_BONES.length || spec.measure?.kind!=='person' || spec.body.interaction!=='decor')
        ctx.addIssue({code:z.ZodIssueCode.custom,message:'humanoid bones require all 12 unique bindings on a measured decor person'});
      for(const joint of bones){
        const parent=joint.parent ? joints.get(joint.parent)?.bone : null;
        if(parent!==BONE_PARENT[joint.bone!] || joint.animation || joint.proximity || joint.rotation?.some(a=>Math.abs(a)>1e-6))
          ctx.addIssue({code:z.ZodIssueCode.custom,message:'humanoid bones require the canonical hierarchy, unrotated rest frames and engine-owned motion'});
        const [x,y,lateral]=joint.position,bone=joint.bone!;
        const valid=bone==='root' ? x===0 && y>=1 && lateral===0 : bone==='spine' ? x===0 && y>=0 && lateral===0 : bone.endsWith('_hip') ? x===0 && y===0 && (bone.startsWith('left') ? lateral>0 : lateral<0) : bone.endsWith('_shoulder') ? x===0 && y>0 && (bone.startsWith('left') ? lateral>0 : lateral<0) : x===0 && y<=-.5 && lateral===0;
        if(!valid)ctx.addIssue({code:z.ZodIssueCode.custom,message:'humanoid rest frames face +X with +Y up, left +Z, straight downward limbs and positive segment lengths'});
      }
      if(spec.parts.some(p=>!p.parent || !joints.get(p.parent)?.bone || p.animation || p.fragment || p.zone))
        ctx.addIssue({code:z.ZodIssueCode.custom,message:'humanoid parts must belong to bones without independent motion or fractures'});
    }
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
      else if(hierarchyValid && geometryValid){const scale=measuredScale(spec);if(!Number.isFinite(scale) || scale<.05 || scale>4)ctx.addIssue({code:z.ZodIssueCode.custom,path:["measure"],message:"measured size must resolve to a uniform scale in 0.05..4"});}
    }
  }
});

export type ObjectDslV1 = z.infer<typeof objectV1Schema>;
export type ObjectDsl = z.infer<typeof objectDslSchema>;
export type ObjectDslV2 = z.infer<typeof objectDslV2Schema>;
export type ObjectPart = ObjectDsl["parts"][number];
export type ObjectMaterial = z.infer<typeof objectMaterialSchema>;

export const MAX_ANIMATED_ASSEMBLIES=24;
export function hasAnimatedJoints(spec:{displayName:string;dslVersion?:number;joints?:{id:string;animation?:unknown;proximity?:unknown;bone?:string}[]}|undefined):boolean {
  return spec?.dslVersion===2 && !!spec.joints?.some(joint=>joint.animation || joint.proximity || joint.bone);
}

export type VehicleControl=NonNullable<ObjectDslV2["rideable"]>["control"] & string;
export function controlOf(spec:{displayName:string;dslVersion?:number;rideable?:{control?:VehicleControl}}|undefined):VehicleControl|undefined {
  return spec?.dslVersion===2 ? spec.rideable?.control : undefined;
}
