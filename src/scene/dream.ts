import {poolableImpact} from './damage-pool';
import {ambientMotionSchema,ambientData,type AmbientMotion} from './ambient';
import {furnishingSchema,flockSchema,furnishWorld,restingTemplate,POPULATION_LIMITS,type Furnishing,type Flock} from './population';
import {sportSchema,MAX_SPORTS} from './sports';
import {compileEconomy} from './dream-commerce';
import {interactionRuleSchema,interactionRuleFor,MAX_INTERACTION_RULES,type InteractionRule} from './interaction-rules';
import { Euler, Quaternion, Vector3 } from "three";
import {voxelCells,VOXEL_LIMITS} from './voxels';
import { objectDslSchema,controlOf,isReactive, type ObjectDslV2 } from "./object-dsl";
import {siteSchema,crossingSchema} from './sites';
import {streetSchema,surfaceSchema,markingSchema} from "./streets";
import {behaviorSchema,agentProblem,NPC_LIMITS} from './agents';
import { routeSchema,routePose,routePoint,type Route } from "./routes";
import { compileWatercourse,type Water } from "./landscape-dsl";
import { sceneObjectSchema,parseScene,type Scene,type SceneObject } from "./schema";
import { ZodError } from "zod";

import { DREAM_LIMITS, DreamError, fail, lex, Parser, type DreamNode, type Token, type Expr, type Vec, type Transform, type Program, type Statement } from "./dream-syntax";
import { ParserV2, printDreamV2, wordField, exprField, field, listField, lowerBlock } from "./dream-v2";
import { migrateProgram } from "./dream-migrate";
import { compileLayout,compileCoordinates, type DreamLayout } from "./dream-layout";
import { buildMaskForScene } from "./fixture";
import { validateScenePlayability } from "./validate";
import { measuredScale, playerRadius } from "./measure";
export { DREAM_LIMITS, DreamError } from "./dream-syntax";
export { DREAM_PROJECT_LIMITS } from "./dream-contract";
import { DREAM_PROJECT_LIMITS } from "./dream-contract";
import {compileScenario,type Scenario,SCENARIO_LIMITS} from './scenario';

function parseDream(source: string): Program {
  const tokens = lex(source);
  if(tokens[0]?.text==="dream" && !["1","2"].includes(tokens[1]?.text??""))fail("unsupported Dream version",tokens[1],"E_VERSION",["1","2"]);
  if (tokens[0]?.text === "dream" && tokens[1]?.text === "2") return new ParserV2(tokens).parse();
  return new Parser(tokens).parse();
}

const RAD = Math.PI / 180;
type Frame = { position: Vector3; rotation: Quaternion; scale: number; parent?: string;fragment?:string;zone?:string; path?: string[] };
const identity = (): Frame => ({ position: new Vector3(), rotation: new Quaternion(), scale: 1 });
function numeric(expr: Expr, env: Map<string, number>, depth = 0): number {
  if (depth > 64) fail("expression depth exceeds 64", expr.token,"E_BUDGET");
  const args = expr.args?.map(arg => numeric(arg, env, depth + 1)) ?? [];
  let value: number | undefined = expr.value;
  if (expr.op) {
    const [a = 0, b = 0] = args;
    switch (expr.op) {
      case "+": value = a + b; break; case "-": value = a - b; break;
      case "*": value = a * b; break; case "/": value = a / b; break;
      case "unary-": value = -a; break; case "unary+": value = a; break;
    }
  } else if (expr.name) {
    if (!expr.args) value = env.get(expr.name);
    else if (expr.name === "sin") value = Math.sin(args[0]! * RAD);
    else if (expr.name === "cos") value = Math.cos(args[0]! * RAD);
    else fail(`unknown numeric function '${expr.name}'`, expr.token,"E_REFERENCE",["sin","cos"]);
  }
  if (value === undefined) fail(`unknown number '${expr.name}'`, expr.token,"E_REFERENCE");
  if (!Number.isFinite(value) || Math.abs(value) > 1e6) fail("numeric result must be finite and within +/-1000000", expr.token,"E_NUMBER");
  return value;
}
const vector = (value: Vec | undefined, env: Map<string, number>): Vector3 => new Vector3(...(value?.map(expr => numeric(expr, env)) ?? [0, 0, 0]));
const rotation = (value: Vec | undefined, env: Map<string, number>): Quaternion => {
  const v = vector(value, env).multiplyScalar(RAD); return new Quaternion().setFromEuler(new Euler(v.x, v.y, v.z));
};
const angles = (value: Quaternion): [number, number, number] => { const e = new Euler().setFromQuaternion(value); return [e.x || 0, e.y || 0, e.z || 0]; };
function transform(frame: Frame, statement: Transform, env: Map<string, number>): Frame {
  const scale = statement.scale ? numeric(statement.scale, env) : 1;
  if (scale <= 0 || scale > 16 || frame.scale * scale > 16) fail("combined scale must be positive and at most 16", statement.scale?.token);
  return { position: vector(statement.at, env).multiplyScalar(frame.scale).applyQuaternion(frame.rotation).add(frame.position),
    rotation: frame.rotation.clone().multiply(rotation(statement.rotate, env)), scale: frame.scale * scale, parent: frame.parent,fragment:frame.fragment,zone:frame.zone,path:frame.path };
}

/** Both authoring versions compile atomically to the same bounded Object DSL v2. */
export function compileDream(source: string): ObjectDslV2[] {
  const program = parseDream(source);
  if(program.routes.length || program.places.length || program.waters.length || program.layout.some(n=>n.kind!=='rule') || program.assets?.length || program.includes?.length) fail("world declarations require compileDreamWorld",undefined,"E_TARGET");
  return compileObjects(program,undefined,compileInteractionRules(program));
}
function compileInteractionRules(program:Program):InteractionRule[]{
  const nodes=program.layout.filter(n=>n.kind==='rule'),globals=globalNumbers(program),kinds=new Set<string>();
  if(nodes.length>MAX_INTERACTION_RULES)fail('interaction rule budget exceeds 16',nodes[MAX_INTERACTION_RULES]!.token,'E_BUDGET');
  return nodes.map(node=>{
    const mode=field(node,'mode') as NonNullable<Program['nodes']>[number],impact:Record<string,unknown>={kind:mode.kind};
    for(const [key,value] of mode.fields)impact[key]=key==='pattern' ? (value as Expr).name : numeric(value as Expr,globals);
    const result=interactionRuleSchema.safeParse({id:node.id,kind:wordField(node,'kind'),impact});
    if(!result.success)fail(result.error.issues[0]!.message,node.token,'E_SCHEMA');
    if(kinds.has(result.data.kind))fail(`only one interaction rule may own kind '${result.data.kind}'`,node.token,'E_RULE');
    kinds.add(result.data.kind);return result.data;
  });
}
function globalNumbers(program:Program) {
  const globals=new Map<string,number>();
  if(program.version===1) {
    for(const statement of program.globals)globals.set(statement.name!,numeric(statement.value!,globals));
  } else {
    const definitions=new Map(program.globals.map(statement=>[statement.name!,statement])),visiting=new Set<string>();
    const resolve=(name:string):void=>{
      if(globals.has(name))return;
      const statement=definitions.get(name)!;
      if(visiting.size>=64)fail("constant dependency depth exceeds 64",statement.token,"E_BUDGET");
      if(visiting.has(name))fail(`cyclic constant '${name}'`,statement.token,"E_CYCLE");
      visiting.add(name);
      const dependencies=(expr:Expr):void=>{
        if(expr.name && !expr.args && definitions.has(expr.name))resolve(expr.name);
        expr.args?.forEach(dependencies);
      };dependencies(statement.value!);
      globals.set(name,numeric(statement.value!,globals));visiting.delete(name);
    };
    for(const name of definitions.keys())resolve(name);
  }
  return globals;
}
function compileObjects(program:Program,budget={steps:0},rules:InteractionRule[]=[]):ObjectDslV2[] {
  const globals=globalNumbers(program);
  return program.objects.map(object => {
    const parts: ObjectDslV2["parts"] = [], joints: NonNullable<ObjectDslV2["joints"]> = [];
    const origins: Token[] = [], jointOrigins: Token[] = [], contactOrigins: Token[] = [], zoneOrigins:Token[]=[];
    const metadataOrigins=new Map<string,Token>();let serial = 0;
    const ids=new Map<string,string>();
    const stableId=(path:string[])=>{
      const key=path.join("/");let hash=14695981039346656037n;
      for(const c of key)hash=BigInt.asUintN(64,(hash^BigInt(c.charCodeAt(0)))*1099511628211n);
      const id=`d_${hash.toString(16).padStart(16,"0")}`;
      if(ids.has(id))fail("expanded ID collision",object.token,"E_DUPLICATE_ID");
      ids.set(id,key);return id;
    };
    let body: ObjectDslV2["body"] | undefined, grounding: ObjectDslV2["grounding"], foundation: ObjectDslV2["foundation"];
    const seats:NonNullable<ObjectDslV2["seats"]>=[];
    const contacts:NonNullable<ObjectDslV2["contacts"]>=[];let rideable:ObjectDslV2["rideable"];
    let emitter:ObjectDslV2["emitter"],lamp:ObjectDslV2["lamp"];
    let impact:ObjectDslV2["impact"];
    let measure:ObjectDslV2["measure"],interior:ObjectDslV2["interior"];
    const breakZones:NonNullable<ObjectDslV2["breakZones"]>=[];
    const walk = (block: Statement[], frame: Frame, inherited: Map<string, number>, stack: string[] = [], root = false, depth = 0,materials=program.materials) => {
      if (depth > DREAM_LIMITS.nesting) fail("expanded nesting exceeds 16", block[0]?.token,"E_BUDGET");
      const env = new Map(inherited), localNames = new Set<string>();
      for (const statement of block) {
        const { token, kind } = statement;
        if (++budget.steps > DREAM_LIMITS.steps) fail("expansion budget exceeds 2048 statements", token,"E_BUDGET");
        const number = (expr: Expr) => numeric(expr, env);
        const path=[...(frame.path??[]),statement.scope??statement.name??kind];
        const id = () => program.version===2 ? stableId(path) : `${statement.name!.slice(0, 25)}-${serial++}`;
        if (["body", "measure", "ground", "foundation","contact","interior","seat","rideable","lamp","emit","impact","zone"].includes(kind) && !root) fail(`${kind} belongs directly inside an object`, token);
        if(root && ["body","measure","ground","foundation","interior","rideable","emit","impact"].includes(kind))metadataOrigins.set(kind==="ground" ? "grounding" : kind==="emit" ? "emitter" : kind,token);
        switch (kind) {
          case "measure":measure={kind:statement.name as NonNullable<ObjectDslV2["measure"]>["kind"],axis:statement.axis as "x"|"y"|"z",meters:number(statement.value!)};break;
          case "let":
            if (localNames.has(statement.name!)) fail(`duplicate local '${statement.name}'`, token);
            localNames.add(statement.name!); env.set(statement.name!, number(statement.value!)); break;
          case "body": {
            if (body) fail("duplicate body", token);
            const [colliderRadius, colliderHeight, frictionPerS] = statement.args!.map(number);
            body = { interaction: statement.interaction as ObjectDslV2["body"]["interaction"], colliderRadius: colliderRadius!, colliderHeight: colliderHeight!, ...(statement.clearance ? {clearanceRadius:number(statement.clearance)} : {}), ...(frictionPerS === undefined ? {} : { frictionPerS }) }; break;
          }
          case "lamp":if(lamp)fail("duplicate lamp",token);lamp={position:vector(statement.at,env).toArray(),radius:number(statement.args![0]!),color:statement.name!};metadataOrigins.set("lamp",token);break;
          case "ground": if (grounding) fail("duplicate ground", token); grounding = statement.name as ObjectDslV2["grounding"]; break;
          case "impact":{
            if(impact)fail("duplicate impact",token);const values=statement.args!.map(number);
            impact=statement.name==="bounce" ? {kind:"bounce",restitution:values[0]!,lift:values[1]!} : statement.name==="topple" ? {kind:"topple",speed:values[0]!,duration:values[1]!,lifetime:values[2]!} : {kind:"break",speed:values[0]!,scatter:values[1]!,lift:values[2]!,spin:values[3]!,lifetime:values[4]!,...(statement.pattern ? {pattern:statement.pattern as "scatter"|"splinter"|"crumble"} : {})};break;
          }
          case "zone":{
            if(breakZones.length>=4)fail("break zone budget exceeds 4",token,"E_BUDGET");
            zoneOrigins.push(token);
            const zoneId=id(),values=statement.damage!.args.map(number),position=vector(statement.at,env);
            breakZones.push({id:zoneId,position:position.toArray(),radius:number(statement.args![0]!),height:number(statement.args![1]!),impact:{kind:"break",speed:values[0]!,scatter:values[1]!,lift:values[2]!,spin:values[3]!,lifetime:values[4]!,...(statement.damage!.pattern ? {pattern:statement.damage!.pattern as "scatter"|"splinter"|"crumble"} : {})}});
            walk(statement.block!,{...identity(),position,zone:zoneId,path},env,stack,false,depth+1,materials);break;
          }
          case "fragment":
            if(frame.fragment)fail("fragment groups cannot nest",token,"E_CONTEXT");
            walk(statement.block!,{...frame,fragment:id(),path},env,stack,false,depth+1,materials);break;
          case "seat":
            if(seats.length>=4)fail('seat budget exceeds 4',token,'E_BUDGET');
            seats.push({id:statement.scope!,position:vector(statement.at,env).toArray(),approach:statement.approach!.map(number) as [number,number],headingRad:number(statement.heading!)*RAD});metadataOrigins.set('seats',token);break;
          case "rideable": if(rideable)fail("duplicate rideable",token);rideable={seat:statement.at ? vector(statement.at,env).toArray() : [0,16,0],...(statement.control ? {control:statement.control as NonNullable<ObjectDslV2["rideable"]>["control"]} : {})};break;
          case "emit":if(emitter)fail("duplicate emitter",token);emitter={kind:statement.name as "steam",position:vector(statement.at,env).toArray(),rate:number(statement.value!)};break;
          case "contact":
            if(contacts.length>=8)fail("contact budget exceeds 8",token);
            contacts.push({position:vector(statement.at,env).toArray(),...(program.version===1 ? {radius:number(statement.args![0]!)} : {...(statement.args ? {radius:number(statement.args[0]!)} : {}),...(statement.contactSize ? {size:statement.contactSize.map(number) as [number,number]} : {}),...(statement.heading ? {headingRad:number(statement.heading)*RAD} : {})}),height:number(program.version===1 ? statement.args![1]! : statement.value!)});contactOrigins.push(token);break;
          case "interior":
            if(interior)fail('duplicate interior',token);
            if(statement.block!.length>4)fail('portal budget exceeds 4',token,'E_BUDGET');
            budget.steps+=statement.block!.length;if(budget.steps>DREAM_LIMITS.steps)fail('expansion budget exceeds 2048 statements',token,'E_BUDGET');
            interior={position:vector(statement.at,env).toArray(),size:vector(statement.size,env).toArray(),portals:statement.block!.map(p=>{const values=p.args!.map(number);return {id:p.scope!,side:p.name as NonNullable<ObjectDslV2['interior']>['portals'][number]['side'],offset:values[0]!,width:values[1]!,height:values[2]!};})};break;
          case "foundation":
            if (foundation) fail("duplicate foundation", token);
            foundation = { footprint: statement.args!.map(number) as [number, number], color: statement.color! }; break;
          case "repeat": {
            const count = number(statement.value!);
            if (!Number.isInteger(count) || count < 0 || count > DREAM_LIMITS.repeat) fail("repeat count must be an integer from 0 to 32", token);
            for (let i = 0; i < count; i++) walk(statement.block!, {...frame,path:[...path,String(i)]}, new Map(env).set(statement.name!, i), stack, false, depth + 1,materials); break;
          }
          case "use": {
            const component = program.components.get(statement.name!);
            if (!component) fail(`unknown component '${statement.name}'`, token,"E_REFERENCE");
            if (stack.includes(statement.name!)) fail(`recursive component '${statement.name}'`, token);
            if (statement.args!.length !== component.params.length) fail(`'${statement.name}' expects ${component.params.length} arguments`, token);
            const scope = new Map(globals);
            component.params.forEach((param, i) => scope.set(param, number(statement.args![i]!)));
            const formals=component.materials??[],actuals=statement.materials??[];
            const bindings=formals.length ? new Map(program.materials) : program.materials;
            if(formals.length!==actuals.length)fail(`'${statement.name}' expects ${formals.length} materials`,token,'E_ARITY');
            formals.forEach((param,i)=>{const material=materials.get(actuals[i]!);if(!material)fail(`unknown material '${actuals[i]}'`,token,'E_REFERENCE');bindings.set(param,material);});
            walk(component.block, {...transform(frame, statement, env),path}, scope, [...stack, statement.name!], false, depth + 1,bindings); break;
          }
          case "group": walk(statement.block!, {...transform(frame, statement, env),path}, env, stack, false, depth + 1,materials); break;
          case "mount": {
            const matches=joints.filter(j=>j.bone===statement.bone);
            if(matches.length!==1)fail('mount needs one previously declared '+statement.bone+' bone; use the anatomy component first',{...token,path:token.path+'/bone'},'E_REFERENCE');
            walk(statement.block!,{...identity(),parent:matches[0]!.id,path},env,stack,false,depth+1,materials);break;
          }
          case "joint": {
            if (joints.length >= 12) fail("joint budget exceeds 12", token,"E_BUDGET");
            const local = transform(frame, statement, env), jointId = id(), motion = statement.motion;
            joints.push({ id: jointId, ...(frame.parent ? { parent: frame.parent } : {}), position: local.position.toArray(), rotation: angles(local.rotation),
              ...(statement.bone ? {bone:statement.bone as NonNullable<ObjectDslV2['joints']>[number]['bone']} : {}),
              ...(motion?.kind==="swing" ? { animation: { axis: motion.axis as "x" | "y" | "z", amplitudeRad: number(motion.args[0]!) * RAD, speed: number(motion.args[1]!), phase: number(motion.args[2]!) * RAD } } : {}),
              ...(motion?.kind==='roll' ? {animation:{kind:'roll' as const,axis:motion.axis as 'x'|'y'|'z',radius:number(motion.args[0]!)*local.scale}} : {}),
              ...(motion?.kind==="open" ? {proximity:{axis:motion.axis as "x"|"y"|"z",angleRad:number(motion.args[0]!)*RAD,radius:number(motion.args[1]!)}} : {}) });
            jointOrigins.push(token);
            walk(statement.block!, { ...identity(), parent: jointId, scale: local.scale,fragment:frame.fragment,zone:frame.zone,path }, env, stack, false, depth + 1,materials); break;
          }
          case "part": case "beam": case "voxels": {
            if (parts.length >= 32) fail("part budget exceeds 32", token,"E_BUDGET");
            const material = materials.get(statement.material!);
            if (!material) fail(`unknown material '${statement.material}'`, token,"E_REFERENCE");
            let position = vector(statement.at, env), orient = rotation(statement.rotate, env), size = vector(statement.size, env);
            if (kind === "beam") {
              if (!["box", "cylinder", "capsule"].includes(statement.shape!)) fail("beam shape must be box, cylinder or capsule", token);
              const end = vector(statement.to, env), direction = end.clone().sub(position), length = direction.length();
              if (length < .5) fail("beam endpoints must be at least 0.5 apart", token);
              position.add(end).multiplyScalar(.5); orient.setFromUnitVectors(new Vector3(0, 1, 0), direction.divideScalar(length));
              size.set(number(statement.args![0]!), length, number(statement.args![1]!));
            }
            position.multiplyScalar(frame.scale).applyQuaternion(frame.rotation).add(frame.position);
            orient.premultiply(frame.rotation); size.multiplyScalar(frame.scale);
            const motion = statement.motion; let animation: ObjectDslV2["parts"][number]["animation"];
            if (motion?.kind === "spin") animation = { kind: "spin", axis: motion.axis as "x" | "y" | "z", speed: number(motion.args[0]!) * RAD };
            if (motion?.kind === "roll") animation = { kind: "roll", radius: number(motion.args[0]!) * frame.scale,...(motion.axis ? {axis:motion.axis as "x"|"y"|"z"} : {}) };
            if (motion?.kind === "sway") animation = { kind: "sway", amplitudeRad: number(motion.args[0]!) * RAD, speed: number(motion.args[1]!) };
            let voxels:ObjectDslV2['parts'][number]['voxels'];
            if(kind==='voxels'){
              const operations:NonNullable<typeof voxels>['operations']=[];
              const expand=(block:Statement[],scope:Map<string,number>,depth:number)=>{
                if(depth>DREAM_LIMITS.nesting)fail('voxel nesting exceeds 16',token,'E_BUDGET');
                const local=new Map(scope);
                for(const op of block){
                  if(++budget.steps>DREAM_LIMITS.steps)fail('expansion budget exceeds 2048 statements',op.token,'E_BUDGET');
                  if(op.kind==='let'){local.set(op.name!,numeric(op.value!,local));continue;}
                  if(op.kind==='repeat'){
                    const count=numeric(op.value!,local);if(!Number.isInteger(count) || count<0 || count>32)fail('repeat count must be an integer from 0 to 32',op.token,'E_BUDGET');
                    for(let i=0;i<count;i++)expand(op.block!,new Map(local).set(op.name!,i),depth+1);continue;
                  }
                  if(operations.length>=VOXEL_LIMITS.operations)fail('voxel operation budget exceeds 64',op.token,'E_BUDGET');
                  operations.push({mode:op.kind as 'fill'|'cut',shape:op.shape as 'box'|'ellipsoid',from:vector(op.at,local).toArray(),to:vector(op.to,local).toArray()});
                }
              };
              expand(statement.block!,env,0);
              voxels={grid:vector(statement.grid,env).toArray(),operations,...(statement.chunks ? {chunks:vector(statement.chunks,env).toArray()} : {})};
            }
            parts.push({ id: id(), shape: statement.shape as ObjectDslV2["parts"][number]["shape"], material: { ...material },
              position: position.toArray(), size: size.toArray(), rotation: angles(orient), ...(frame.parent ? { parent: frame.parent } : {}),
              ...(voxels ? {voxels} : {}),...(statement.cutaway ? {cutaway:statement.cutaway as "roof"|"front"|"back"|"left"|"right"} : {}),
              ...(statement.taper ? {taper:number(statement.taper)} : {}),
              ...(statement.faceted!==undefined ? {faceted:statement.faceted} : {}),
              ...(statement.outline ? {outline:statement.outline.map(point=>point.map(number) as [number,number])} : {}),
              ...(frame.fragment ? {fragment:frame.fragment} : {}),...(frame.zone ? {zone:frame.zone} : {}),...(statement.deform ? { deform: { seed: number(statement.deform[0]), amount: number(statement.deform[1]) } } : {}), ...(animation ? { animation } : {}) });
            origins.push(token); break;
          }
          default:fail(`'${kind}' is not an object statement`,token);
        }
      }
    };
    walk(object.block, identity(), globals, [], true);
    if (!body) fail("object needs a body declaration", object.token);
    const rule=interactionRuleFor({measure},rules);
    if(rule){
      if(breakZones.length && rule.impact.kind==='break')for(const zone of breakZones)zone.impact=rule.impact;
      else impact=rule.impact;
      metadataOrigins.set('impact',object.token);
    }
    // A whole rigid fall needs no per-part fragment boilerplate in Dream 2.
    if(program.version===2 && impact?.kind==='topple' && !parts.some(p=>p.fragment || p.voxels?.chunks)){const fragment=stableId(['$topple']);for(const part of parts)part.fragment=fragment;}
    const result = objectDslSchema.safeParse({ dslVersion: 2, displayName: object.name, body, parts,...(measure ? {measure} : {}),
      ...(joints.length ? { joints } : {}), ...(grounding ? { grounding } : {}), ...(foundation ? { foundation } : {}),
      ...(seats.length ? {seats} : {}),...(contacts.length ? {contacts} : {}),...(interior ? {interior} : {}),...(rideable ? {rideable} : {}),...(emitter ? {emitter} : {}),...(lamp ? {lamp} : {}),...(impact ? {impact} : {}),...(breakZones.length ? {breakZones} : {}) });
    if (!result.success) {
      const error=result.error.issues[0]!;
      // Preserve the specific axis/radius diagnostic instead of an opaque union error.
      const issue=error.code==='invalid_union' ? [...error.unionErrors].sort((a,b)=>a.issues.length-b.issues.length)[0]!.issues[0]! : error;
      const index = issue.path[1];
      const field=String(issue.path[0]);
      const tokens=field==="parts" ? origins : field==="joints" ? jointOrigins : field==="contacts" ? contactOrigins : field==="breakZones" ? zoneOrigins : [];
      const token=(typeof index==="number" ? tokens[index] : metadataOrigins.get(field))??object.token;
      fail(`${object.name}${rule ? ` (rule ${rule.id})` : ''}: ${issue.path.join(".") || "assembly"}: ${issue.message}`, token,"E_SCHEMA");
    }
    return result.data as ObjectDslV2;
  });
}

export interface DreamWorld {economy?:Scene['economy'];interactionRules:InteractionRule[];assemblies:ObjectDslV2[];routes:Route[];objects:SceneObject[];waters:Water[];streets:Scene['streets'];surfaces:Scene['surfaces'];markings:Scene['markings'];behaviors:Scene['behaviors'];sites:Scene['sites'];crossings:Scene['crossings'];sports:Scene['sports'];furnishings:Furnishing[];flocks:Flock[];scenarios:Scenario[];layout?:DreamLayout}
export type DreamModules=Readonly<Record<string,string>>;
type LinkedWorld={world:DreamWorld;exports:Map<string,ObjectDslV2>};
/** The same bounded language now authors placements, shared routes and continuous watercourses. */
export function compileDreamWorld(source:string,modules:DreamModules={}):DreamWorld {
  const entry=parseDream(source),rules=compileInteractionRules(entry),pooled=entry.layout.some(n=>n.kind==='world' && n.fields.get('damage_pool')===true);
  const cache=new Map<string,LinkedWorld>(),active=new Set<string>();
  let characters=0,definitions=0;
  const load=(text:string,name:string,token?:Token):LinkedWorld=>{
    if(active.has(name))fail(`cyclic module '${name}'`,token,"E_CYCLE");
    const previous=cache.get(name);if(previous)return previous;
    if(cache.size+active.size>=DREAM_PROJECT_LIMITS.modules)fail("project module budget exceeds 32",token,"E_BUDGET");
    characters+=text.length;if(characters>DREAM_PROJECT_LIMITS.characters)fail("project source exceeds 524288 characters",token,"E_BUDGET");
    if(active.size>=DREAM_PROJECT_LIMITS.depth)fail("module dependency depth exceeds 8",token,"E_BUDGET");
    active.add(name);
    let program:Program;
    try{program=name==='<entry>' ? entry : parseDream(text);}catch(error){if(error instanceof DreamError && name!=="<entry>")error.diagnostic.module=name;throw error;}
    if(name!=="<entry>" && program.version!==2)fail("project modules require Dream 2",token,"E_VERSION");
    definitions+=program.objects.length;if(definitions>DREAM_PROJECT_LIMITS.assemblies)fail("project exceeds 128 assembly definitions",token,"E_BUDGET");
    const resolve=(node:NonNullable<Program["nodes"]>[number])=>{
      const id=wordField(node,"module");
      if(!Object.hasOwn(modules,id) || typeof modules[id]!=="string")fail(`unknown module '${id}'`,node.token,"E_MODULE");
      return load(modules[id]!,id,node.token);
    };
    try {
      if(name!=='<entry>' && program.layout.some(n=>n.kind==='rule'))fail('interaction rules belong in the entry file',program.layout.find(n=>n.kind==='rule')!.token,'E_RULE');
      const assets=new Map<string,ObjectDslV2>();
      for(const node of program.assets??[]){
        const id=wordField(node,'object'),spec=resolve(node).exports.get(id);if(!spec)fail(`module has no exported object '${id}'`,node.token,'E_REFERENCE');
        if(node.fields.has('control')){
          if(!spec.rideable)fail('asset control requires an existing rideable seat',{...node.token,path:`${node.token.path}/control`},'E_SCHEMA');
          const adapted=objectDslSchema.safeParse({...spec,rideable:{...spec.rideable,control:wordField(node,'control')}});
          if(!adapted.success || adapted.data.dslVersion!==2)fail(adapted.success ? 'asset requires Dream 2 object data' : adapted.error.issues[0]!.message,{...node.token,path:`${node.token.path}/control`},'E_SCHEMA');
          assets.set(node.id!,adapted.data);
        }else assets.set(node.id!,spec);
      }
      const included=new Set<string>();
      const children=(program.includes??[]).map(node=>{
        const id=wordField(node,"module");if(included.has(id))fail(`module '${id}' is included twice`,node.token,"E_DUPLICATE_ID");included.add(id);return resolve(node).world;
      });
      const result=compileWorldProgram(program,assets,children,rules,pooled);cache.set(name,result);return result;
    }catch(error){if(error instanceof DreamError && name!=="<entry>" && !error.diagnostic.module)error.diagnostic.module=name;throw error;}
    finally{active.delete(name);}
  };
  let world={...load(source,"<entry>").world,interactionRules:rules};
  if(world.assemblies.reduce((sum,spec)=>sum+spec.parts.reduce((n,p)=>n+(p.voxels ? voxelCells(p.voxels) : 0),0),0)>VOXEL_LIMITS.projectCells)fail('project exceeds 1048576 voxel cells',undefined,'E_BUDGET');
  if(world.furnishings.length){
    if(!world.layout)fail('furnish expansion requires a complete linked world',undefined,'E_WORLD');
    const {origin,...layout}=world.layout;
    try{
      const base=parseScene({schemaVersion:1,sceneId:'furnish',revisionId:'furnish',sourceHash:'furnish',...layout,...world,provenance:{source:'handmade-fixture',notes:'Population expansion'}});
      const result=furnishWorld(base,world.furnishings);world={...world,objects:[...world.objects,...result.objects],surfaces:[...world.surfaces,...result.surfaces]};
    }catch(error){if(error instanceof DreamError)throw error;fail(error instanceof Error ? error.message : 'invalid furnishing',origin,'E_POPULATION');}
  }
  // Apply once, after linked modules and furnishings expand. Contacts and measurement
  // continue to use the original stamp bounds; voxel construction is renderer data.
  if(world.layout?.voxelWorld){
    const cell=world.layout.voxelWorld.objectCell,converted=new Map<ObjectDslV2,ObjectDslV2>();
    const spec=(value:ObjectDslV2)=>{let result=converted.get(value);if(!result){result={...value,voxelSize:cell};converted.set(value,result);}return result;};
    world={...world,assemblies:world.assemblies.map(spec),objects:world.objects.map(o=>o.spec && 'dslVersion' in o.spec && o.spec.dslVersion===2 ? {...o,spec:spec(o.spec)} : o),flocks:world.flocks.map(f=>({...f,spec:f.spec.dslVersion===2 ? spec(f.spec) : f.spec})),sports:world.sports.map(s=>s.match ? {...s,match:{...s.match,teams:s.match.teams.map(t=>({...t,specs:t.specs.map(spec),...(t.keeperSpec ? {keeperSpec:spec(t.keeperSpec)} : {})}))}} : s),layout:{...world.layout,...(world.layout.player?.dslVersion===2 ? {player:spec(world.layout.player)} : {})}};
  }
  return world;
}
function compileWorldProgram(program:Program,assets:Map<string,ObjectDslV2>,children:DreamWorld[],rules:InteractionRule[],pooled=false) {
  const budget={steps:0},ownAssemblies=compileObjects(program,budget,rules),globals=globalNumbers(program);
  const movement=(node:DreamNode):AmbientMotion=>{
    const n=(key:string,fallback?:number)=>node.fields.has(key) ? numeric(exprField(node,key),globals) : fallback;
    try{return ambientMotionSchema.parse(node.kind==='walk' ? {kind:'walk',speed:n('speed'),waitS:n('wait_s',1)} : {kind:'roam',radius:n('radius'),speed:n('speed'),alert:n('alert'),fleeSpeed:n('flee_speed'),recoverS:n('recover_s',2),gait:node.fields.has('gait') ? wordField(node,'gait') : 'walk'});}catch(error){fail(error instanceof ZodError ? error.issues[0]!.message : String(error),node.token,'E_POPULATION');}
  };
  const exports=new Map(program.objects.map((object,i)=>[object.id??object.name,ownAssemblies[i]!]));
  for(const [id,spec] of assets)exports.set(id,spec);
  const ids=new Set<string>();for(const item of [...program.routes,...program.places,...program.waters]){
    if(ids.has(item.name))fail(`duplicate world id '${item.name}'`,item.token);ids.add(item.name);
  }
  const points=(block:Statement[],columns:number,max:number,stops?:NonNullable<Route["stops"]>)=>{
    const result:number[][]=[];
    const walk=(block:Statement[],inherited:Map<string,number>,depth=0)=>{
      if(depth>16)fail("point expansion nesting exceeds 16",block[0]?.token,"E_BUDGET");
      const env=new Map(inherited),locals=new Set<string>();
      for(const statement of block){
        if(++budget.steps>DREAM_LIMITS.steps)fail("point expansion budget exceeds 2048",statement.token,"E_BUDGET");
        if(statement.kind==="let"){
          if(locals.has(statement.name!))fail("duplicate local",statement.token);locals.add(statement.name!);env.set(statement.name!,numeric(statement.value!,env));
        } else if(statement.kind==="repeat"){
          const n=numeric(statement.value!,env);if(!Number.isInteger(n)||n<0||n>32)fail("repeat count must be an integer from 0 to 32",statement.token);
          for(let i=0;i<n;i++)walk(statement.block!,new Map(env).set(statement.name!,i),depth+1);
        } else if(statement.kind==="point" || statement.kind==="stop" && stops){
          if(statement.args!.length!==columns)fail(`expected ${columns} point coordinates`,statement.token);
          if(result.length>=max)fail(`point budget exceeds ${max}`,statement.token,"E_BUDGET");
          if(statement.kind==="stop")stops!.push({id:statement.name!,anchor:result.length,waitS:numeric(statement.value!,env),site:statement.site!});
          result.push(statement.args!.map(e=>numeric(e,env)));
        } else fail("paths only accept point, let and repeat",statement.token);
      }
    };walk(block,globals);return result;
  };
  const routes=program.routes.map(source=>{
    const stops:NonNullable<Route["stops"]>=[];
    const anchors=points(source.block,2,64,stops).map(([x,y])=>({x,y}));
    const parsed=routeSchema.safeParse({id:source.name,kind:source.kind,mode:source.mode,speed:numeric(source.speed,globals),
      waitS:source.wait ? numeric(source.wait,globals) : 0,...(source.gauge ? {gauge:numeric(source.gauge,globals)} : {}),...(source.width ? {width:numeric(source.width,globals)} : {}),...(source.surface ? {surface:source.surface} : {}),...(source.altitude ? {altitude:numeric(source.altitude,globals)} : {}),
      points:anchors,...(stops.length ? {stops} : {})});
    if(!parsed.success)fail(parsed.error.issues[0]!.message,source.token,"E_SCHEMA");return parsed.data;
  });
  const waters=program.waters.map(source=>{
    if(source.flow.length!==2)fail("flow needs two coordinates",source.token);
    try{return compileWatercourse({id:source.name,ends:source.ends,level:numeric(source.level,globals),depth:numeric(source.depth,globals),bankWidth:numeric(source.bank,globals),color:source.color,
      flow:{x:numeric(source.flow[0]!,globals),y:numeric(source.flow[1]!,globals)},stations:points(source.block,3,8).map(([x,y,width])=>({x:x!,y:y!,width:width!}))});}
    catch(error){if(error instanceof DreamError)throw error;fail(error instanceof ZodError ? error.issues[0]!.message : error instanceof Error ? error.message : "invalid watercourse",source.token);}
  });
  const behaviorNodes=program.layout.filter(n=>n.kind==='behavior');
  if(behaviorNodes.length>NPC_LIMITS.programs)fail('behavior budget exceeds 16',behaviorNodes[NPC_LIMITS.programs]!.token,'E_BUDGET');
  const behaviors=behaviorNodes.map(node=>{
    const states=node.block!.map(state=>({id:state.id,action:wordField(state,'action'),...(state.fields.has('say') ? {say:state.fields.get('say') as string} : {}),...(state.fields.has('face') ? {face:wordField(state,'face')} : {}),transitions:state.block!.map(on=>({id:on.id,event:wordField(on,'event'),to:wordField(on,'to'),...(on.fields.has('requires') ? {requires:wordField(on,'requires')} : {}),...(on.fields.has('shared_meals') ? {shared_meals:numeric(exprField(on,'shared_meals'),globals)} : {}),...(on.fields.has('familiar') ? {familiar:on.fields.get('familiar') as boolean} : {}),...(on.fields.has('seconds') ? {seconds:numeric(exprField(on,'seconds'),globals)} : {}),...(on.fields.has('radius') ? {radius:numeric(exprField(on,'radius'),globals)} : {})}))}));
    budget.steps+=1+states.reduce((n,s)=>n+1+s.transitions.length,0);
    if(budget.steps>DREAM_LIMITS.steps)fail('behavior expansion exceeds 2048 statements',node.token,'E_BUDGET');
    const result=behaviorSchema.safeParse({id:node.id,start:wordField(node,'start'),states});
    if(!result.success){const issue=result.error.issues[0]!,state=typeof issue.path[1]==='number' ? node.block![issue.path[1]] : undefined,on=typeof issue.path[3]==='number' ? state?.block?.[issue.path[3]] : undefined;const focus=on??state??node,field=issue.path.at(-1);fail(issue.message,typeof field==='string' && focus.fields.has(field) ? {...focus.token,path:`${focus.token.path}/${field}`} : focus.token,'E_SCHEMA');}
    return result.data;
  });
  const objects=program.places.map(source=>{
    let spec=exports.get(source.assembly);if(!spec)fail(`unknown assembly '${source.assembly}'`,source.token);
    let ambient:ReturnType<typeof ambientData>|undefined;
    try{ambient=source.motion ? ambientData(spec,movement(source.motion)) : undefined;if(source.pose || ambient)spec=restingTemplate(spec);}catch(error){if(error instanceof DreamError)throw error;fail((error as Error).message,source.token,"E_POPULATION");}
    const route=source.route ? routes.find(r=>r.id===source.route) : undefined;
    if(source.route && !route)fail(`unknown route '${source.route}'`,source.token);
    if(source.at && source.at.length!==2)fail("placement needs two coordinates",source.token);
    const offset=source.offset ? numeric(source.offset,globals) : 0,phaseS=source.phase ? numeric(source.phase,globals) : 0;
    const position=route ? routePose(route,phaseS,offset) : {x:numeric(source.at![0]!,globals),y:numeric(source.at![1]!,globals)};
    const tangent=route && controlOf(spec) ? routePoint(route,routePose(route,phaseS,offset).distance+8) : undefined;
    const heading=tangent ? {headingRad:Math.atan2(tangent.y-position.y,tangent.x-position.x)} : {};
    const variation=source.scale ? numeric(source.scale,globals) : 1;
    if(variation<.5 || variation>2)fail("placement scale must be 0.5..2",source.scale?.token??source.token,"E_SCHEMA");
    const result=sceneObjectSchema.safeParse({id:source.name,kind:"custom",labelText:spec.displayName,spec,...position,...heading,
      scale:variation*measuredScale(spec),...(source.heading ? {headingRad:numeric(source.heading,globals)*RAD} : {}),
      ...(route ? {route:{id:route.id,offset,...(source.phase ? {phaseS} : {})}} : {}),...(ambient ? {ambient} : {}),...(source.role ? {role:source.role} : {}),...(source.parked ? {parked:true} : {}),...(source.behavior ? {behavior:source.behavior} : {})});
    if(!result.success)fail(result.error.issues[0]!.message,source.token,"E_SCHEMA");
    const problem=agentProblem(result.data,behaviors,routes);if(problem)fail(problem,source.token,'E_AGENT');return result.data;
  });
  const furnishings:Furnishing[]=[],flocks:Flock[]=[];
  for(const node of program.layout.filter(n=>n.kind==='furnish' || n.kind==='flock')){
    const num=(key:string)=>numeric(exprField(node,key),globals),vec=(key:string)=>{const v=listField(node,key).map(e=>numeric(e,globals));return {x:v[0]!,y:v[1]!};};
    try{
      if(node.kind==='flock'){
        const spec=exports.get(wordField(node,'object'));if(!spec)fail('unknown flock object',node.token,'E_REFERENCE');
        flocks.push(flockSchema.parse({id:node.id,spec,center:vec('at'),radius:vec('radius'),count:num('count'),altitude:num('altitude'),speed:num('speed'),seed:num('seed'),...(node.fields.has('flap_hz') ? {flapHz:num('flap_hz')} : {}),...(node.fields.has('flap_deg') ? {flapDeg:num('flap_deg')} : {})}));
      }else{
        const original=listField(node,'objects').map(ref=>exports.get(ref.name!)!),motion=node.fields.has('motion') ? movement(field(node,'motion') as DreamNode) : undefined;
        if(motion && node.fields.has('pose'))fail('moving populations cannot also declare pose=rest',node.token,'E_POPULATION');
        if(motion?.kind==='walk' && (!node.fields.has('on') || wordField(node,'on')!=='sidewalk'))fail('walking furnish requires on=sidewalk',node.token,'E_POPULATION');
        const objects=original.map(spec=>(node.fields.has('pose') || motion) && spec ? restingTemplate(spec) : spec);
        if(node.fields.has('role') && wordField(node,'role')==='controllable' && objects.some(s=>!s || !controlOf(s)))fail('controllable furnishing requires rideable(control=...) on every template',{...node.token,path:`${node.token.path}/role`},'E_POPULATION');
        if(node.fields.has('on') && wordField(node,'on')==='sidewalk' && objects.some(s=>s?.body.interaction!=='decor'))fail('sidewalk furnishing requires passive decor so the walking corridor stays open',node.token,'E_POPULATION');
        if(!objects.length || objects.length>8 || objects.some(s=>!s || s.body.interaction==='knockable' || s.joints?.some(j=>j.bone || j.proximity || j.animation && !('kind' in j.animation && j.animation.kind==='roll')) || isReactive(s) && !(pooled && poolableImpact(s)) || s.emitter))fail('furnish needs 1..8 passive static object templates',node.token,'E_POPULATION');
        const data={id:node.id,spacing:num('spacing'),setback:num('setback'),seed:num('seed'),...(motion ? {motion} : {})};
        for(const key of ['streets','sites','grounds'])if(node.fields.has(key))Object.assign(data,{[key]:listField(node,key).map(e=>e.name!)});
        if(node.fields.has('pose'))Object.assign(data,{pose:wordField(node,'pose')});
        if(node.fields.has('paving'))Object.assign(data,{paving:wordField(node,'paving')});
        for(const key of ['side','facing','on','role'])if(node.fields.has(key))Object.assign(data,{[key]:wordField(node,key)});
        for(const key of ['count','jitter'])if(node.fields.has(key))Object.assign(data,{[key]:num(key)});
        // Controllable parking keeps its rig for the one occupied vehicle.
        furnishings.push({...furnishingSchema.parse(data),...(motion ? {rigs:original.map(s=>ambientData(s,motion).joints)} : {}),objects:objects.map(s=>!(node.fields.has('role') && wordField(node,'role')==='controllable') && s.joints?.some(j=>j.animation) ? {...s,joints:s.joints.map(({animation,...joint})=>joint)} : s)});
      }
    }catch(error){if(error instanceof DreamError)throw error;fail(error instanceof ZodError ? error.issues[0]!.message : String(error),node.token,'E_POPULATION');}
  }
  let layout=compileLayout(program,exports,waters,e=>numeric(e,globals));
  const coordinates=compileCoordinates(program,e=>numeric(e,globals));
  const infrastructure={streets:[] as Scene['streets'],surfaces:[] as Scene['surfaces'],markings:[] as Scene['markings'],sites:[] as Scene['sites'],crossings:[] as Scene['crossings']};
  for(const node of program.layout){
    if(!['street','surface','marking','site','crossing'].includes(node.kind))continue;
    const value=(key:string)=>numeric(exprField(node,key),globals);
    const outline=()=> (field(node,'points') as Expr[][]).map(v=>({x:numeric(v[0]!,globals),y:numeric(v[1]!,globals)}));
    if(node.kind==='site' || node.kind==='crossing'){
      const vec=(key:string)=>{const v=field(node,key) as Expr[];return {x:numeric(v[0]!,globals),y:numeric(v[1]!,globals)};};
      const result=node.kind==='site' ? siteSchema.safeParse({id:node.id,objectId:wordField(node,'object'),kind:wordField(node,'kind'),...(node.fields.has('label') ? {label:field(node,'label')} : {}),entry:vec('entry'),street:wordField(node,'street'),width:value('width'),points:outline(),serves:node.fields.has('serves') ? (field(node,'serves') as Expr[]).map(e=>e.name!) : []}) : crossingSchema.safeParse({id:node.id,street:wordField(node,'street'),at:vec('at'),width:value('width'),...(node.fields.has('junction') ? {junction:field(node,'junction')} : {})});
      if(!result.success)fail(result.error.issues[0]!.message,node.token,'E_SCHEMA');
      if(node.kind==='site')infrastructure.sites.push(result.data as Scene['sites'][number]);else infrastructure.crossings.push(result.data as Scene['crossings'][number]);
      continue;
    }
    const result=node.kind==='street' ? streetSchema.safeParse({id:node.id,width:value('width'),sidewalk:value('sidewalk'),points:coordinates.points(node),...(node.fields.has('cycle_width') ? {cycleWidth:value('cycle_width')} : {})}) : node.kind==='surface' ? surfaceSchema.safeParse({id:node.id,...(node.fields.has('color') ? {color:wordField(node,'color')} : {}),points:outline(),...(node.fields.has('finish') ? {finish:wordField(node,'finish')} : {}),...(node.fields.has('walkable') ? {walkable:field(node,'walkable')} : {})}) : markingSchema.safeParse({id:node.id,color:wordField(node,'color'),width:value('width'),closed:field(node,'closed'),points:points(lowerBlock(node.block!),2,64).map(([x,y])=>({x,y}))});
    if(!result.success)fail(result.error.issues[0]!.message,node.token,'E_SCHEMA');
    if(node.kind==='street')infrastructure.streets.push(result.data as Scene['streets'][number]);
    else if(node.kind==='surface')infrastructure.surfaces.push(result.data as Scene['surfaces'][number]);
    else infrastructure.markings.push(result.data as Scene['markings'][number]);
  }
  const ownWaters=layout?.terrain.landscape?.waters??waters;
  const inherited=children.filter(w=>w.layout);
  if(inherited.length+Number(!!layout)>1)fail("project needs exactly one world layout",undefined,"E_WORLD");
  layout??=inherited[0]?.layout;
  const allWaters=[...children.flatMap(w=>w.waters),...ownWaters];
  const economies=[...program.layout.filter(n=>n.kind==='economy').map(n=>compileEconomy(n,e=>numeric(e,globals))),...children.flatMap(w=>w.economy ? [w.economy] : [])];
  if(economies.length>1)fail('project permits one economy',undefined,'E_ECONOMY');
  budget.steps+=program.layout.filter(n=>n.kind==='economy').reduce((total,n)=>total+1+n.block!.reduce((count,c)=>count+1+(c.block?.length??0),0),0);
  if(budget.steps>DREAM_LIMITS.steps)fail('economy expansion exceeds 2048 statements',undefined,'E_BUDGET');
  const scenarios=[...program.layout.filter(n=>n.kind==='scenario').map(n=>compileScenario(n,e=>numeric(e,globals))),...children.flatMap(w=>w.scenarios)];
  const sports=[...program.layout.filter(n=>n.kind==='sport').map(node=>{
    const teams=(node.block??[]).map(team=>{const names=team.fields.has('object') ? [wordField(team,'object')] : listField(team,'objects').map(e=>e.name!),specs=names.map(name=>{const spec=exports.get(name);if(!spec)fail('unknown team object',team.token,'E_REFERENCE');return spec;});return {id:team.id,role:wordField(team,'role'),specs,...(team.fields.has('keeper_object') ? {keeperSpec:exports.get(wordField(team,'keeper_object'))??fail('unknown keeper object',team.token,'E_REFERENCE')} : {}),...(team.fields.has('keeper') ? {keeper:numeric(exprField(team,'keeper'),globals)} : {}),...(team.fields.has('members') ? {members:listField(team,'members').map(e=>e.name!)} : {}),...(team.fields.has('style') ? {style:wordField(team,'style')} : {}),...(team.fields.has('skill') ? {skill:numeric(exprField(team,'skill'),globals)} : {})};});
    const match=teams.length ? {teams,...(node.fields.has('roster') ? {rosterId:wordField(node,'roster')} : {}),teamSize:node.fields.has('team_size') ? numeric(exprField(node,'team_size'),globals) : 6,...(node.fields.has('duration_s') ? {durationS:numeric(exprField(node,'duration_s'),globals)} : {}),...(node.fields.has('score_to') ? {scoreTo:numeric(exprField(node,'score_to'),globals)} : {})} : undefined;
    if(!match && ['roster','team_size','duration_s','score_to'].some(key=>node.fields.has(key)))fail('match settings require home and away team blocks',node.token,'E_SCHEMA');
    const result=sportSchema.safeParse({...(match ? {match} : {}),...(node.fields.has('net_depth') ? {netDepth:numeric(exprField(node,'net_depth'),globals)} : {}),id:node.id,kind:wordField(node,'kind'),surfaceId:wordField(node,'surface'),ballId:wordField(node,'ball'),targets:listField(node,'targets').map(e=>e.name!),targetAt:listField(node,'target_at').map(e=>numeric(e,globals)),targetSize:listField(node,'target_size').map(e=>numeric(e,globals))});
    if(!result.success)fail(result.error.issues[0]!.message,node.token,'E_SCHEMA');return result.data;
  }),...children.flatMap(w=>w.sports)];
  if(sports.length>MAX_SPORTS)fail('combined project exceeds 8 sports grounds',undefined,'E_BUDGET');
  if(scenarios.length>SCENARIO_LIMITS.scenarios)fail('project permits one scenario',undefined,'E_SCENARIO');
  const world:DreamWorld={economy:economies[0],interactionRules:[],scenarios,sports,assemblies:[...new Set([...exports.values(),...children.flatMap(w=>w.assemblies)])],routes:[...routes,...children.flatMap(w=>w.routes)],objects:[...objects,...children.flatMap(w=>w.objects)],waters:allWaters,streets:[...infrastructure.streets,...children.flatMap(w=>w.streets)],surfaces:[...infrastructure.surfaces,...children.flatMap(w=>w.surfaces)],markings:[...infrastructure.markings,...children.flatMap(w=>w.markings)],behaviors:[...behaviors,...children.flatMap(w=>w.behaviors)],sites:[...infrastructure.sites,...children.flatMap(w=>w.sites)],crossings:[...infrastructure.crossings,...children.flatMap(w=>w.crossings)],furnishings:[...furnishings,...children.flatMap(w=>w.furnishings)],flocks:[...flocks,...children.flatMap(w=>w.flocks)]};
  if(world.furnishings.length>POPULATION_LIMITS.rules || world.flocks.length>POPULATION_LIMITS.flocks || world.flocks.reduce((n,f)=>n+f.count,0)>POPULATION_LIMITS.birds)fail('population budget exceeded',undefined,'E_BUDGET');
  if(world.behaviors.length>NPC_LIMITS.programs)fail('combined project exceeds 16 behaviors',undefined,'E_BUDGET');
  if(world.routes.length>12 || world.waters.length>8 || world.objects.length>4096)fail("combined project exceeds scene route/water/placement budgets",undefined,"E_BUDGET");
  if(world.streets.length>32 || world.surfaces.length>64 || world.markings.length>128)fail('combined project exceeds 32 streets / 64 surfaces / 128 markings',undefined,'E_BUDGET');
  if(world.sites.length>256 || world.crossings.length>64)fail('combined project exceeds 256 sites / 64 crossings',undefined,'E_BUDGET');
  const worldIds=new Set<string>();for(const item of [...world.routes,...world.waters,...world.objects,...world.streets,...world.surfaces,...world.markings,...world.behaviors,...world.sites,...world.crossings,...world.sports,...world.furnishings,...world.flocks]){if(worldIds.has(item.id))fail(`duplicate world id '${item.id}'`,undefined,"E_DUPLICATE_ID");worldIds.add(item.id);}
  if(layout)world.layout={...layout,terrain:{...layout.terrain,landscape:{...layout.terrain.landscape!,waters:allWaters}}};
  return {world,exports};
}

/** Canonical Dream 2: fixed field order, explicit symbols, no comments or alternate formatting. */
export function formatDream(source:string):string {
  const program=parseDream(source);
  if(program.version!==2)fail("formatDream requires Dream 2; migrate Dream 1 first",undefined,"E_VERSION");
  return printDreamV2(program.nodes!);
}

/** A repair boundary returns a located diagnostic and never a partial world. */
export function checkDream(source:string,modules:DreamModules={}) {
  try {const world=compileDreamWorld(source,modules);if(world.layout)sceneFromWorld(world,{sceneId:"check",revisionId:"check",sourceHash:"check"});return {ok:true as const,world};}
  catch(error) {if(error instanceof DreamError)return {ok:false as const,diagnostics:[error.toJSON()]};throw error;}
}

/** Validate both sides; callers replace a file only after migration succeeds atomically. */
export function migrateDream(source:string,modules:DreamModules={}):string {
  compileDreamWorld(source,modules);
  const program=parseDream(source),result=program.version===2 ? printDreamV2(program.nodes!) : migrateProgram(program);
  compileDreamWorld(result,modules);return result;
}

export interface DreamSceneIdentity {sceneId:string;revisionId:string;sourceHash:string}
function sceneFromWorld(world:DreamWorld,identity:DreamSceneIdentity):Scene {
  if(!world.layout)fail("compileDreamScene requires a world declaration",undefined,"E_WORLD");
  const {origin,...layout}=world.layout;
  let scene:Scene;
  try {scene=parseScene({schemaVersion:1,...identity,...layout,routes:world.routes,objects:world.objects,streets:world.streets,surfaces:world.surfaces,markings:world.markings,behaviors:world.behaviors,flocks:world.flocks,sites:world.sites,crossings:world.crossings,sports:world.sports,interactionRules:world.interactionRules,economy:world.economy,provenance:{source:"handmade-fixture",notes:"Compiled Dream 2 mock world. No model calls."}});}
  catch(error){if(error instanceof ZodError)fail(error.issues[0]!.message,origin,"E_SCHEMA");throw error;}
  const problems=validateScenePlayability(scene,buildMaskForScene(scene),playerRadius(scene));
  if(problems.length)fail(`${problems[0]!.code}: ${problems[0]!.message}`,origin,`E_SCENE_${problems[0]!.code.toUpperCase().replace(/-/g,"_")}`);
  return scene;
}
/** Host-owned identity and source hash; schema and playability must pass before publication. */
export function compileDreamScene(source:string,identity:DreamSceneIdentity,modules:DreamModules={}):Scene {
  return sceneFromWorld(compileDreamWorld(source,modules),identity);
}
