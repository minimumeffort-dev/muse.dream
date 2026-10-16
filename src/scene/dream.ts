import { Euler, Quaternion, Vector3 } from "three";
import { objectDslSchema,controlOf, type ObjectDslV2 } from "./object-dsl";
import { routeSchema,routePose,routePoint,type Route } from "./routes";
import { compileWatercourse,type Water } from "./landscape-dsl";
import { sceneObjectSchema,parseScene,type Scene,type SceneObject } from "./schema";
import { ZodError } from "zod";

import { DREAM_LIMITS, DreamError, fail, lex, Parser, type Token, type Expr, type Vec, type Transform, type Program, type Statement } from "./dream-syntax";
import { ParserV2, printDreamV2, wordField } from "./dream-v2";
import { migrateProgram } from "./dream-migrate";
import { compileLayout, type DreamLayout } from "./dream-layout";
import { buildMaskForScene } from "./fixture";
import { validateScenePlayability } from "./validate";
import { measuredScale, playerRadius } from "./measure";
export { DREAM_LIMITS, DreamError } from "./dream-syntax";
export { DREAM_PROJECT_LIMITS } from "./dream-contract";
import { DREAM_PROJECT_LIMITS } from "./dream-contract";

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
  if(program.routes.length || program.places.length || program.waters.length || program.layout.length || program.assets?.length || program.includes?.length) fail("world declarations require compileDreamWorld",undefined,"E_TARGET");
  return compileObjects(program);
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
function compileObjects(program:Program,budget={steps:0}):ObjectDslV2[] {
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
    const contacts:NonNullable<ObjectDslV2["contacts"]>=[];let rideable:ObjectDslV2["rideable"];
    let emitter:ObjectDslV2["emitter"];
    let impact:ObjectDslV2["impact"];
    let measure:ObjectDslV2["measure"];
    const breakZones:NonNullable<ObjectDslV2["breakZones"]>=[];
    const walk = (block: Statement[], frame: Frame, inherited: Map<string, number>, stack: string[] = [], root = false, depth = 0) => {
      if (depth > DREAM_LIMITS.nesting) fail("expanded nesting exceeds 16", block[0]?.token,"E_BUDGET");
      const env = new Map(inherited), localNames = new Set<string>();
      for (const statement of block) {
        const { token, kind } = statement;
        if (++budget.steps > DREAM_LIMITS.steps) fail("expansion budget exceeds 2048 statements", token,"E_BUDGET");
        const number = (expr: Expr) => numeric(expr, env);
        const path=[...(frame.path??[]),statement.scope??statement.name??kind];
        const id = () => program.version===2 ? stableId(path) : `${statement.name!.slice(0, 25)}-${serial++}`;
        if (["body", "measure", "ground", "foundation","contact","rideable","emit","impact","zone"].includes(kind) && !root) fail(`${kind} belongs directly inside an object`, token);
        if(root && ["body","measure","ground","foundation","rideable","emit","impact"].includes(kind))metadataOrigins.set(kind==="ground" ? "grounding" : kind==="emit" ? "emitter" : kind,token);
        switch (kind) {
          case "measure":measure={kind:statement.name as NonNullable<ObjectDslV2["measure"]>["kind"],axis:statement.axis as "x"|"y"|"z",meters:number(statement.value!)};break;
          case "let":
            if (localNames.has(statement.name!)) fail(`duplicate local '${statement.name}'`, token);
            localNames.add(statement.name!); env.set(statement.name!, number(statement.value!)); break;
          case "body": {
            if (body) fail("duplicate body", token);
            const [colliderRadius, colliderHeight, frictionPerS] = statement.args!.map(number);
            body = { interaction: statement.interaction as ObjectDslV2["body"]["interaction"], colliderRadius: colliderRadius!, colliderHeight: colliderHeight!, ...(frictionPerS === undefined ? {} : { frictionPerS }) }; break;
          }
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
            walk(statement.block!,{...identity(),position,zone:zoneId,path},env,stack,false,depth+1);break;
          }
          case "fragment":
            if(frame.fragment)fail("fragment groups cannot nest",token,"E_CONTEXT");
            walk(statement.block!,{...frame,fragment:id(),path},env,stack,false,depth+1);break;
          case "rideable": if(rideable)fail("duplicate rideable",token);rideable={seat:statement.at ? vector(statement.at,env).toArray() : [0,16,0],...(statement.control ? {control:statement.control as NonNullable<ObjectDslV2["rideable"]>["control"]} : {})};break;
          case "emit":if(emitter)fail("duplicate emitter",token);emitter={kind:statement.name as "steam",position:vector(statement.at,env).toArray(),rate:number(statement.value!)};break;
          case "contact":
            if(contacts.length>=8)fail("contact budget exceeds 8",token);
            contacts.push({position:vector(statement.at,env).toArray(),radius:number(statement.args![0]!),height:number(statement.args![1]!)});contactOrigins.push(token);break;
          case "foundation":
            if (foundation) fail("duplicate foundation", token);
            foundation = { footprint: statement.args!.map(number) as [number, number], color: statement.color! }; break;
          case "repeat": {
            const count = number(statement.value!);
            if (!Number.isInteger(count) || count < 0 || count > DREAM_LIMITS.repeat) fail("repeat count must be an integer from 0 to 32", token);
            for (let i = 0; i < count; i++) walk(statement.block!, {...frame,path:[...path,String(i)]}, new Map(env).set(statement.name!, i), stack, false, depth + 1); break;
          }
          case "use": {
            const component = program.components.get(statement.name!);
            if (!component) fail(`unknown component '${statement.name}'`, token,"E_REFERENCE");
            if (stack.includes(statement.name!)) fail(`recursive component '${statement.name}'`, token);
            if (statement.args!.length !== component.params.length) fail(`'${statement.name}' expects ${component.params.length} arguments`, token);
            const scope = new Map(globals);
            component.params.forEach((param, i) => scope.set(param, number(statement.args![i]!)));
            walk(component.block, {...transform(frame, statement, env),path}, scope, [...stack, statement.name!], false, depth + 1); break;
          }
          case "group": walk(statement.block!, {...transform(frame, statement, env),path}, env, stack, false, depth + 1); break;
          case "joint": {
            if (joints.length >= 12) fail("joint budget exceeds 12", token,"E_BUDGET");
            const local = transform(frame, statement, env), jointId = id(), motion = statement.motion;
            joints.push({ id: jointId, ...(frame.parent ? { parent: frame.parent } : {}), position: local.position.toArray(), rotation: angles(local.rotation),
              ...(motion?.kind==="swing" ? { animation: { axis: motion.axis as "x" | "y" | "z", amplitudeRad: number(motion.args[0]!) * RAD, speed: number(motion.args[1]!), phase: number(motion.args[2]!) * RAD } } : {}),
              ...(motion?.kind==="open" ? {proximity:{axis:motion.axis as "x"|"y"|"z",angleRad:number(motion.args[0]!)*RAD,radius:number(motion.args[1]!)}} : {}) });
            jointOrigins.push(token);
            walk(statement.block!, { ...identity(), parent: jointId, scale: local.scale,fragment:frame.fragment,zone:frame.zone,path }, env, stack, false, depth + 1); break;
          }
          case "part": case "beam": {
            if (parts.length >= 32) fail("part budget exceeds 32", token,"E_BUDGET");
            const material = program.materials.get(statement.material!);
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
            parts.push({ id: id(), shape: statement.shape as ObjectDslV2["parts"][number]["shape"], material: { ...material },
              position: position.toArray(), size: size.toArray(), rotation: angles(orient), ...(frame.parent ? { parent: frame.parent } : {}),
              ...(frame.fragment ? {fragment:frame.fragment} : {}),...(frame.zone ? {zone:frame.zone} : {}),...(statement.deform ? { deform: { seed: number(statement.deform[0]), amount: number(statement.deform[1]) } } : {}), ...(animation ? { animation } : {}) });
            origins.push(token); break;
          }
          default:fail(`'${kind}' is not an object statement`,token);
        }
      }
    };
    walk(object.block, identity(), globals, [], true);
    if (!body) fail("object needs a body declaration", object.token);
    const result = objectDslSchema.safeParse({ dslVersion: 2, displayName: object.name, body, parts,...(measure ? {measure} : {}),
      ...(joints.length ? { joints } : {}), ...(grounding ? { grounding } : {}), ...(foundation ? { foundation } : {}),
      ...(contacts.length ? {contacts} : {}),...(rideable ? {rideable} : {}),...(emitter ? {emitter} : {}),...(impact ? {impact} : {}),...(breakZones.length ? {breakZones} : {}) });
    if (!result.success) {
      const issue = result.error.issues[0]!, index = issue.path[1];
      const field=String(issue.path[0]);
      const tokens=field==="parts" ? origins : field==="joints" ? jointOrigins : field==="contacts" ? contactOrigins : field==="breakZones" ? zoneOrigins : [];
      const token=(typeof index==="number" ? tokens[index] : metadataOrigins.get(field))??object.token;
      fail(`${object.name}: ${issue.path.join(".") || "assembly"}: ${issue.message}`, token,"E_SCHEMA");
    }
    return result.data as ObjectDslV2;
  });
}

export interface DreamWorld {assemblies:ObjectDslV2[];routes:Route[];objects:SceneObject[];waters:Water[];layout?:DreamLayout}
export type DreamModules=Readonly<Record<string,string>>;
type LinkedWorld={world:DreamWorld;exports:Map<string,ObjectDslV2>};
/** The same bounded language now authors placements, shared routes and continuous watercourses. */
export function compileDreamWorld(source:string,modules:DreamModules={}):DreamWorld {
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
    try{program=parseDream(text);}catch(error){if(error instanceof DreamError && name!=="<entry>")error.diagnostic.module=name;throw error;}
    if(name!=="<entry>" && program.version!==2)fail("project modules require Dream 2",token,"E_VERSION");
    definitions+=program.objects.length;if(definitions>DREAM_PROJECT_LIMITS.assemblies)fail("project exceeds 128 assembly definitions",token,"E_BUDGET");
    const resolve=(node:NonNullable<Program["nodes"]>[number])=>{
      const id=wordField(node,"module");
      if(!Object.hasOwn(modules,id) || typeof modules[id]!=="string")fail(`unknown module '${id}'`,node.token,"E_MODULE");
      return load(modules[id]!,id,node.token);
    };
    try {
      const assets=new Map<string,ObjectDslV2>();
      for(const node of program.assets??[]){const id=wordField(node,"object"),spec=resolve(node).exports.get(id);if(!spec)fail(`module has no exported object '${id}'`,node.token,"E_REFERENCE");assets.set(node.id!,spec);}
      const included=new Set<string>();
      const children=(program.includes??[]).map(node=>{
        const id=wordField(node,"module");if(included.has(id))fail(`module '${id}' is included twice`,node.token,"E_DUPLICATE_ID");included.add(id);return resolve(node).world;
      });
      const result=compileWorldProgram(program,assets,children);cache.set(name,result);return result;
    }catch(error){if(error instanceof DreamError && name!=="<entry>" && !error.diagnostic.module)error.diagnostic.module=name;throw error;}
    finally{active.delete(name);}
  };
  return load(source,"<entry>").world;
}
function compileWorldProgram(program:Program,assets:Map<string,ObjectDslV2>,children:DreamWorld[]) {
  const budget={steps:0},ownAssemblies=compileObjects(program,budget),globals=globalNumbers(program);
  const exports=new Map(program.objects.map((object,i)=>[object.id??object.name,ownAssemblies[i]!]));
  for(const [id,spec] of assets)exports.set(id,spec);
  const ids=new Set<string>();for(const item of [...program.routes,...program.places,...program.waters]){
    if(ids.has(item.name))fail(`duplicate world id '${item.name}'`,item.token);ids.add(item.name);
  }
  const points=(block:Statement[],columns:number,max:number)=>{
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
        } else if(statement.kind==="point"){
          if(statement.args!.length!==columns)fail(`expected ${columns} point coordinates`,statement.token);
          if(result.length>=max)fail(`point budget exceeds ${max}`,statement.token,"E_BUDGET");result.push(statement.args!.map(e=>numeric(e,env)));
        } else fail("paths only accept point, let and repeat",statement.token);
      }
    };walk(block,globals);return result;
  };
  const routes=program.routes.map(source=>{
    const parsed=routeSchema.safeParse({id:source.name,kind:source.kind,mode:source.mode,speed:numeric(source.speed,globals),
      waitS:source.wait ? numeric(source.wait,globals) : 0,...(source.width ? {width:numeric(source.width,globals)} : {}),...(source.surface ? {surface:source.surface} : {}),...(source.altitude ? {altitude:numeric(source.altitude,globals)} : {}),
      points:points(source.block,2,64).map(([x,y])=>({x,y}))});
    if(!parsed.success)fail(parsed.error.issues[0]!.message,source.token,"E_SCHEMA");return parsed.data;
  });
  const waters=program.waters.map(source=>{
    if(source.flow.length!==2)fail("flow needs two coordinates",source.token);
    try{return compileWatercourse({id:source.name,level:numeric(source.level,globals),depth:numeric(source.depth,globals),bankWidth:numeric(source.bank,globals),color:source.color,
      flow:{x:numeric(source.flow[0]!,globals),y:numeric(source.flow[1]!,globals)},stations:points(source.block,3,8).map(([x,y,width])=>({x:x!,y:y!,width:width!}))});}
    catch(error){if(error instanceof DreamError)throw error;fail(error instanceof ZodError ? error.issues[0]!.message : error instanceof Error ? error.message : "invalid watercourse",source.token);}
  });
  const objects=program.places.map(source=>{
    const spec=exports.get(source.assembly);if(!spec)fail(`unknown assembly '${source.assembly}'`,source.token);
    const route=source.route ? routes.find(r=>r.id===source.route) : undefined;
    if(source.route && !route)fail(`unknown route '${source.route}'`,source.token);
    if(source.at && source.at.length!==2)fail("placement needs two coordinates",source.token);
    const offset=source.offset ? numeric(source.offset,globals) : 0;
    const position=route ? routePose(route,0,offset) : {x:numeric(source.at![0]!,globals),y:numeric(source.at![1]!,globals)};
    const tangent=route && controlOf(spec) ? routePoint(route,routePose(route,0,offset).distance+8) : undefined;
    const heading=tangent ? {headingRad:Math.atan2(tangent.y-position.y,tangent.x-position.x)} : {};
    const variation=source.scale ? numeric(source.scale,globals) : 1;
    if(variation<.5 || variation>2)fail("placement scale must be 0.5..2",source.scale?.token??source.token,"E_SCHEMA");
    const result=sceneObjectSchema.safeParse({id:source.name,kind:"custom",labelText:spec.displayName,spec,...position,...heading,
      scale:variation*measuredScale(spec),...(source.heading ? {headingRad:numeric(source.heading,globals)*RAD} : {}),
      ...(route ? {route:{id:route.id,offset}} : {})});
    if(!result.success)fail(result.error.issues[0]!.message,source.token,"E_SCHEMA");return result.data;
  });
  let layout=compileLayout(program,exports,waters,e=>numeric(e,globals));
  const ownWaters=layout?.terrain.landscape?.waters??waters;
  const inherited=children.filter(w=>w.layout);
  if(inherited.length+Number(!!layout)>1)fail("project needs exactly one world layout",undefined,"E_WORLD");
  layout??=inherited[0]?.layout;
  const allWaters=[...children.flatMap(w=>w.waters),...ownWaters];
  const world:DreamWorld={assemblies:[...new Set([...exports.values(),...children.flatMap(w=>w.assemblies)])],routes:[...routes,...children.flatMap(w=>w.routes)],objects:[...objects,...children.flatMap(w=>w.objects)],waters:allWaters};
  if(world.routes.length>12 || world.waters.length>8 || world.objects.length>4096)fail("combined project exceeds scene route/water/placement budgets",undefined,"E_BUDGET");
  const worldIds=new Set<string>();for(const item of [...world.routes,...world.waters,...world.objects]){if(worldIds.has(item.id))fail(`duplicate world id '${item.id}'`,undefined,"E_DUPLICATE_ID");worldIds.add(item.id);}
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
  if(!world.layout)fail("compileDreamScene requires world/road declarations",undefined,"E_WORLD");
  const {origin,...layout}=world.layout;
  let scene:Scene;
  try {scene=parseScene({schemaVersion:1,...identity,...layout,routes:world.routes,objects:world.objects,provenance:{source:"handmade-fixture",notes:"Compiled Dream 2 mock world. No model calls."}});}
  catch(error){if(error instanceof ZodError)fail(error.issues[0]!.message,origin,"E_SCHEMA");throw error;}
  const problems=validateScenePlayability(scene,buildMaskForScene(scene),playerRadius(scene));
  if(problems.length)fail(`${problems[0]!.code}: ${problems[0]!.message}`,origin,`E_SCENE_${problems[0]!.code.toUpperCase().replace(/-/g,"_")}`);
  return scene;
}
/** Host-owned identity and source hash; schema and playability must pass before publication. */
export function compileDreamScene(source:string,identity:DreamSceneIdentity,modules:DreamModules={}):Scene {
  return sceneFromWorld(compileDreamWorld(source,modules),identity);
}
