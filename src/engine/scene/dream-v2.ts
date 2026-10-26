import { objectMaterialSchema } from "./object-dsl";
import { DREAM_V2_COMMANDS as commands } from "./dream-contract";
import { Parser, fail, DREAM_LIMITS, type DreamNode, type DreamValue, type Expr, type Program, type Statement, type Token, type Vec, type Motion } from "./dream-syntax";

export const isNode = (value: DreamValue): value is DreamNode => typeof value === "object" && !Array.isArray(value) && "fields" in value;
const isExpr = (value: DreamValue): value is Expr => typeof value === "object" && !Array.isArray(value) && "token" in value && !isNode(value);
export const field = (node: DreamNode, key: string) => node.fields.get(key)!;
export const exprField = (node: DreamNode, key: string) => field(node,key) as Expr;
export const listField = (node: DreamNode, key: string) => field(node,key) as Expr[];
export const wordField = (node: DreamNode, key: string) => (field(node,key) as Expr).name!;
const identifier = /^[a-z][a-z0-9_]{0,31}$/;
function checkSymbol(name:string,token:Token) {
  if(!identifier.test(name) || ["true","false","sin","cos"].includes(name))
    fail("use a lowercase ID of 1–32 letters, digits or underscores, starting with a letter; true, false, sin and cos are reserved",token,"E_ID");
}

export class ParserV2 extends Parser {
  private value(depth:number,path:string):DreamValue {
    if(depth>=DREAM_LIMITS.nesting)fail("value nesting exceeds 16",this.token,"E_BUDGET");
    if(this.accept("[")) {
      const values:DreamValue[]=[];
      if(!this.accept("]")) {do {values.push(this.value(depth+1,`${path}[${values.length}]`));if(values.length>256)fail("array budget exceeds 256",this.token,"E_BUDGET");} while(this.accept(",") && !this.is("]"));this.expect("]");}
      return values;
    }
    if(this.token.text.startsWith('"')) {const token=this.take();try{return JSON.parse(token.text) as string;}catch{fail("invalid quoted string",{...token,path},"E_TYPE");}}
    if(this.is("true") || this.is("false"))return this.take().text==="true";
    if(this.token.text.startsWith("#")){const token=this.take();return {token:{...token,path},name:token.text.toLowerCase()};}
    if(this.tokens[this.index+1]?.text==="(" && Object.hasOwn(commands,this.token.text) && commands[this.token.text]!.contexts.some(c=>["part_motion","joint_motion","deform","impact","ambient_motion","company_need"].includes(c)))
      return this.node("value",depth+1,path);
    if(/^[A-Za-z_]/.test(this.token.text) && this.tokens[this.index+1]?.text==="(" && !["sin","cos"].includes(this.token.text))
      fail(`unknown constructor '${this.token.text}'`,{...this.token,path},"E_CONSTRUCTOR",["sin","cos",...Object.keys(commands).filter(k=>commands[k]!.contexts.some(c=>["part_motion","joint_motion","deform","impact","ambient_motion","company_need"].includes(c)))]);
    const expr=this.expr();
    const locate=(e:Expr)=>{e.token={...e.token,path};e.args?.forEach(locate);};locate(expr);return expr;
  }
  private check(value:DreamValue,type:string,token:Token):void {
    const symbol=isExpr(value) && value.name && !value.args && !value.op ? value.name : undefined;
    const numbers=(n?:number)=>Array.isArray(value) && (n===undefined || value.length===n) && value.every(isExpr);
    let valid=false;
    if(type==="n")valid=isExpr(value);
    else if(type==="v2" || type==="v3")valid=numbers(Number(type[1]));
    else if(type==="nums")valid=numbers();
    else if(type==="point")valid=numbers(2)||numbers(3);
    else if(type==="position2")valid=numbers(2) || !!symbol && identifier.test(symbol);
    else if(type==="points2")valid=Array.isArray(value) && value.every(v=>Array.isArray(v) && v.length===2 && v.every(isExpr));
    else if(type==="symbols" || type==="slots")valid=Array.isArray(value) && value.every(v=>isExpr(v) && !!v.name && !v.args && !v.op && (type==="slots" ? /^[a-z][a-z0-9_]{0,63}$/ : identifier).test(v.name));
    else if(type==="colors")valid=Array.isArray(value) && value.length===2 && value.every(v=>isExpr(v) && /^#[0-9a-f]{6}$/.test(v.name??""));
    else if(type==="color")valid=!!symbol && /^#[0-9a-f]{6}$/.test(symbol);
    else if(type==="text")valid=typeof value==="string";
    else if(type==="bool")valid=typeof value==="boolean";
    else if(type==="symbol" || type==="ref") {valid=!!symbol && identifier.test(symbol);if(valid)checkSymbol(symbol!,token);}
    else if(["part_motion","joint_motion","deform","impact","ambient_motion","company_need","fracture"].includes(type))valid=isNode(value) && commands[value.kind]!.contexts.includes(type);
    else valid=!!symbol && type.split("|").includes(symbol);
    if(!valid)fail(`expected ${type}`,token,"E_TYPE",type.includes("|") ? type.split("|") : ["part_motion","joint_motion","deform","impact","ambient_motion","company_need","fracture"].includes(type) ? Object.keys(commands).filter(k=>commands[k]!.contexts.includes(type)) : [type]);
  }
  private node(context:string,depth:number,path:string):DreamNode {
    const original=this.take(),kind=original.text,definition=Object.hasOwn(commands,kind) ? commands[kind] : undefined;
    const token={...original,path};
    if(!definition || (context==="value" ? !definition.contexts.some(c=>["part_motion","joint_motion","deform","impact","ambient_motion","company_need"].includes(c)) : !definition.contexts.includes(context)))
      fail(`'${kind}' is not allowed in ${context}`,token,"E_CONTEXT",Object.keys(commands).filter(k=>commands[k]!.contexts.includes(context)));
    const id=definition.id ? this.name() : undefined;if(id)checkSymbol(id,token);
    token.path=`${path}/${kind}${id ? `:${id}` : ""}`;
    const node:DreamNode={kind,id,token,fields:new Map()};this.expect("(");
    if(!this.accept(")")) {
      do {
        const keyToken=this.take(),key=keyToken.text,location={...keyToken,path:`${token.path}/${key}`};
        if(!Object.hasOwn(definition.fields,key))fail(`unknown field '${key}'`,location,"E_FIELD_UNKNOWN",Object.keys(definition.fields));
        if(node.fields.has(key))fail(`duplicate field '${key}'`,location,"E_FIELD_DUPLICATE");
        this.expect("=");const value=this.value(depth,location.path);this.check(value,definition.fields[key]!.replace(/\?$/,""),location);node.fields.set(key,value);
      }while(this.accept(",") && !this.is(")"));
      this.expect(")");
    }
    for(const [key,type] of Object.entries(definition.fields))if(!type.endsWith("?") && !node.fields.has(key))
      fail(`missing field '${key}'`,{...token,path:`${token.path}/${key}`},"E_FIELD_REQUIRED",[type]);
    if(definition.block && (!definition.block.endsWith('?') || this.is('{')))node.block=this.nodes(definition.block==="inherit" ? context==="object" ? "visual" : context : definition.block.replace(/\?$/,''),depth+1,token.path);
    else if(context!=="value")this.expect(";");
    return node;
  }
  private nodes(context:string,depth:number,path:string):DreamNode[] {
    if(depth>=DREAM_LIMITS.nesting)fail("block nesting exceeds 16",this.token,"E_BUDGET");
    if(context!=="top")this.expect("{");
    const nodes:DreamNode[]=[],names=new Set<string>(),singletons=new Set<string>();
    while(context==="top" ? !this.is("<end>") : !this.accept("}")) {
      const node=this.node(context,depth,path);
      if(node.id) {if(names.has(node.id))fail(`duplicate ID '${node.id}' in this scope`,node.token,"E_DUPLICATE_ID");names.add(node.id);}
      else if(!["point","ingredient","key"].includes(node.kind)) {if(singletons.has(node.kind))fail(`duplicate '${node.kind}'`,node.token,"E_DUPLICATE_ID");singletons.add(node.kind);}
      nodes.push(node);
    }
    return nodes;
  }
  override parse():Program {
    this.expect("dream");this.expect("2");this.expect(";");
    const nodes=this.nodes("top",0,"dream");if(!nodes.length)fail("expected declarations",this.token,"E_EMPTY");
    validateReferences(nodes);
    const program:Program={version:2,layout:[],assets:[],includes:[],nodes,materials:new Map(),components:new Map(),globals:[],objects:[],routes:[],places:[],waters:[]};
    for(const node of nodes) {
      const token=node.token,name=node.id!,num=(key:string)=>exprField(node,key);
      switch(node.kind) {
        case "material": {
          const colors=listField(node,"colors").map(c=>c.name!),style=wordField(node,"style");
          program.materials.set(name,objectMaterialSchema.parse({shaderStyle:style==="grain" ? "paper-grain" : style,colorA:colors[0],colorB:colors[1],...(node.fields.has("night") ? {nightColor:wordField(node,"night")} : {})}));break;
        }
        case "let":program.globals.push({token,kind:"let",name,value:num("value")});break;
        case "component":program.components.set(name,{token,params:(node.fields.get("params") as Expr[]|undefined)?.map(e=>e.name!)??[],materials:(node.fields.get('materials') as Expr[]|undefined)?.map(e=>e.name!)??[],block:lowerBlock(node.block!)});break;
        case "object":program.objects.push({token,id:name,name:field(node,"label") as string,block:lowerBlock(node.block!)});break;
        case "asset":program.assets!.push(node);break;
        case "include":program.includes!.push(node);break;
        case "route":program.routes.push({token,name,gauge:node.fields.has("gauge") ? num("gauge") : undefined,kind:wordField(node,"kind"),mode:wordField(node,"mode"),speed:num("speed"),altitude:node.fields.has("altitude") ? num("altitude") : undefined,wait:node.fields.has("wait_s") ? num("wait_s") : undefined,width:node.fields.has("width") ? num("width") : undefined,surface:node.fields.has("surface") ? wordField(node,"surface") : undefined,block:lowerBlock(node.block!)});break;
        case "place":program.places.push({token,name,...(node.fields.has("floor") ? {floor:wordField(node,"floor")} : {}),assembly:wordField(node,"object"),at:node.fields.get("at") as Expr[]|undefined,route:node.fields.has("route") ? wordField(node,"route") : undefined,offset:node.fields.get("offset") as Expr|undefined,phase:node.fields.get("phase_s") as Expr|undefined,scale:node.fields.get("scale") as Expr|undefined,heading:node.fields.get("heading_deg") as Expr|undefined,role:node.fields.has("role") ? wordField(node,"role") as "prop"|"npc"|"controllable"|"ambient" : undefined,behavior:node.fields.has("behavior") ? wordField(node,"behavior") : undefined,pose:node.fields.has("pose") ? wordField(node,"pose") as "rest" : undefined,motion:node.fields.get("motion") as DreamNode|undefined,parked:node.fields.get("parked") as boolean|undefined});break;
        case "watercourse":program.waters.push({token,name,...(node.fields.has("ends") ? {ends:wordField(node,"ends") as "round"|"open"} : {}),level:num("level"),depth:num("depth"),bank:num("bank"),color:wordField(node,"color"),flow:listField(node,"flow"),block:lowerBlock(node.block!)});break;
        default:program.layout.push(node);
      }
    }
    for(const [count,max,label] of [[program.objects.length+(program.assets?.length??0),16,"object/asset"],[program.includes!.length,16,"include"],[program.routes.length,12,"route"],[program.places.length,64,"placement"],[program.waters.length,8,"watercourse"]] as const)
      if(count>max)fail(`${label} budget exceeds ${max}`,nodes.at(-1)!.token,"E_BUDGET");
    if(!program.objects.length && !program.assets!.length && !program.includes!.length && !program.layout.length)fail("expected at least one object, asset, include or a full world",nodes[0]!.token,"E_EMPTY");
    return program;
  }
}

function motion(node:DreamNode):Motion {
  const n=(key:string)=>exprField(node,key),axis=node.fields.has("axis") ? wordField(node,"axis") : undefined;
  const hz=():Expr=>({token:node.token,op:"*",args:[n("hz"),{token:node.token,value:2*Math.PI}]});
  const args=node.kind==="spin" ? [n("deg_s")] : node.kind==="roll" ? [n("radius")] : node.kind==="sway" ? [n("deg"),hz()] : node.kind==="swing" ? [n("deg"),hz(),n("phase_deg")] : node.kind==="stride" ? [n("deg"),n("length"),n("phase_deg")] : [n("deg"),n("radius")];
  return {kind:node.kind as Motion["kind"],axis,args};
}
export function lowerBlock(nodes:DreamNode[]):Statement[] {
  return nodes.map(node=> {
    const {kind,token,id:scope}=node,n=(key:string)=>exprField(node,key),v=(key:string)=>listField(node,key) as Vec;
    const statement:Statement={token,kind,scope,name:scope};
    if(node.block)statement.block=lowerBlock(node.block);
    if(node.fields.has("rot_deg"))statement.rotate=v("rot_deg");
    if(node.fields.has("scale"))statement.scale=n("scale");
    if(node.fields.has("taper"))statement.taper=n("taper");
    if(node.fields.has('faceted'))statement.faceted=field(node,'faceted') as boolean;
    if(node.fields.has('outline'))statement.outline=node.fields.get('outline') as [Expr,Expr][];
    if(node.fields.has("at"))statement.at=v("at");
    if(node.fields.has("cutaway"))statement.cutaway=wordField(node,"cutaway");
    if(node.fields.has("motion"))statement.motion=motion(field(node,"motion") as DreamNode);
    if(node.fields.has('bone'))statement.bone=wordField(node,'bone');
    if(node.fields.has('materials'))statement.materials=listField(node,'materials').map(e=>e.name!);
    if(node.fields.has("deform")){const deform=field(node,"deform") as DreamNode;statement.deform=[exprField(deform,"seed"),exprField(deform,"amount")];}
    switch(kind) {
      case "let":statement.value=n("value");break;
      case "body":if(node.fields.has("clearance"))statement.clearance=n("clearance");statement.interaction=wordField(node,"interaction");statement.args=[n("radius"),n("height"),...(node.fields.has("friction") ? [n("friction")] : [])];break;
      case "measure":statement.name=wordField(node,"kind");statement.axis=wordField(node,"axis");statement.value=n("meters");break;
      case "ground":statement.name=wordField(node,"mode");break;
      case "foundation":statement.args=listField(node,"size");statement.color=wordField(node,"color");break;
      case "seat":statement.approach=listField(node,"approach");statement.heading=n("heading_deg");break;
      case "rideable":if(node.fields.has("control"))statement.control=wordField(node,"control");break;
      case "contact":statement.value=n("height");if(node.fields.has("radius"))statement.args=[n("radius")];if(node.fields.has("size"))statement.contactSize=listField(node,"size");if(node.fields.has("heading_deg"))statement.heading=n("heading_deg");break;
      case "stairs":statement.material=wordField(node,"material");statement.size=v("size");statement.value=n("steps");if(node.fields.has("heading_deg"))statement.heading=n("heading_deg");break;
      case "interior":statement.size=v("size");break;
      case "portal":statement.name=wordField(node,"side");statement.args=[n("offset"),n("width"),n("height")];break;
      case "emit":statement.name=wordField(node,"kind");statement.value=n("rate_s");break;
      case "impact":{const mode=field(node,"mode") as DreamNode;statement.name=mode.kind;statement.args=Object.entries(commands[mode.kind]!.fields).filter(([,type])=>type==="n").map(([key])=>exprField(mode,key));if(mode.fields.has("pattern"))statement.pattern=wordField(mode,"pattern");break;}
      case "lamp":statement.at=v("at");statement.args=[n("radius")];statement.name=wordField(node,"color");break;
      case "zone":{const mode=field(node,"mode") as DreamNode;statement.args=[n("radius"),n("height")];statement.damage={kind:mode.kind,args:["speed","scatter","lift","spin","lifetime"].map(key=>exprField(mode,key)),...(mode.fields.has("pattern") ? {pattern:wordField(mode,"pattern")} : {})};break;}
      case "repeat":statement.name=wordField(node,"index");statement.value=n("count");break;
      case "use":statement.name=wordField(node,"component");statement.args=(node.fields.get("args") as Expr[]|undefined)??[];break;
      case "voxels":statement.grid=v("grid");if(node.fields.has("chunks"))statement.chunks=v("chunks");statement.shape="voxel";statement.material=wordField(node,"material");statement.size=v("size");break;
      case "fill":case "cut":statement.at=v("from");statement.to=v("to");statement.shape=node.fields.has("shape") ? wordField(node,"shape") : "box";break;
      case "part":statement.shape=wordField(node,"shape");statement.material=wordField(node,"material");statement.size=v("size");break;
      case "beam":statement.shape=wordField(node,"shape");statement.material=wordField(node,"material");statement.at=v("from");statement.to=v("to");statement.args=[n("width"),n("depth")];break;
      case "point":statement.args=listField(node,"at");break;
      case "stop":statement.args=listField(node,"at");statement.name=node.id;statement.value=n("wait_s");statement.site=wordField(node,"site");break;
    }
    return statement;
  });
}

function validateReferences(nodes:DreamNode[]):void {
  const definitions=new Map(nodes.filter(n=>n.id).map(n=>[n.id!,n]));
  const globals=new Set(nodes.filter(n=>n.kind==="let").map(n=>n.id!));
  const numericTypes=new Set(["n","v2","v3","nums","point","points2"]);
  const checkNumbers=(value:DreamValue,scope:Set<string>)=> {
    if(Array.isArray(value)){value.forEach(v=>checkNumbers(v,scope));return;}
    if(!isExpr(value))return;
    if(value.name && !value.args && !scope.has(value.name))fail(`unknown number '${value.name}'`,value.token,"E_REFERENCE",[...scope].sort());
    if(value.name && value.args && !["sin","cos"].includes(value.name))fail(`unknown numeric function '${value.name}'`,value.token,"E_REFERENCE",["sin","cos"]);
    value.args?.forEach(v=>checkNumbers(v,scope));
  };
  const reference=(node:DreamNode,key:string,kind:string)=> {
    const id=wordField(node,key),target=definitions.get(id);
    if(target?.kind!==kind && !(kind==="object" && target?.kind==="asset"))fail(`'${key}' needs an existing ${kind} ID; found '${id}'`,{...node.token,path:`${node.token.path}/${key}`},"E_REFERENCE",nodes.filter(n=>n.kind===kind || kind==="object" && n.kind==="asset").map(n=>n.id!).sort());
    return target;
  };
  const walk=(block:DreamNode[],outer:Set<string>,materialScope=new Set<string>())=>{
    const scope=new Set(outer);
    for(const node of block) {
      if(node.kind==="component") {
        const params=((node.fields.get("params") as Expr[]|undefined)??[]).map(e=>e.name!);
        const materials=((node.fields.get('materials') as Expr[]|undefined)??[]).map(e=>e.name!),names=[...params,...materials];
        if(names.length>8 || new Set(names).size!==names.length || materials.some(p=>globals.has(p)))fail("components allow at most 8 unique numeric/material parameters; material parameters cannot shadow numbers",node.token,"E_PARAMETERS");
        names.forEach(p=>checkSymbol(p,node.token));walk(node.block!,new Set([...globals,...params]),new Set(materials));continue;
      }
      for(const [key,value] of node.fields) {
        const type=commands[node.kind]!.fields[key]!.replace(/\?$/,"");
        if(numericTypes.has(type) || type==="position2" && Array.isArray(value))checkNumbers(value,scope);
        if(isNode(value))for(const [innerKey,inner] of value.fields)if(commands[value.kind]!.fields[innerKey]==="n")checkNumbers(inner,scope);
      }
      if((node.kind==="part" || node.kind==="beam" || node.kind==="voxels" || node.kind==="stairs") && !materialScope.has(wordField(node,'material')))reference(node,"material","material");
      if(node.kind==="use"){
        const target=reference(node,"component","component"),params=(target.fields.get("params") as Expr[]|undefined)??[];
        if(((node.fields.get("args") as Expr[]|undefined)??[]).length!==params.length)fail(`component '${target.id}' expects ${params.length} arguments [${params.map(p=>p.name).join(',')}]`,{...node.token,path:`${node.token.path}/args`},"E_ARITY",params.map(p=>p.name!));
        const formals=(target.fields.get('materials') as Expr[]|undefined)??[],actuals=(node.fields.get('materials') as Expr[]|undefined)??[];
        if(actuals.length!==formals.length)fail(`component '${target.id}' expects materials [${formals.map(p=>p.name).join(',')}]`,{...node.token,path:`${node.token.path}/materials`},'E_ARITY',formals.map(p=>p.name!));
        actuals.forEach((value,index)=>{
          if(!materialScope.has(value.name!) && definitions.get(value.name!)?.kind!=='material')fail(`unknown material '${value.name}'`,{...value.token,path:`${node.token.path}/materials[${index}]`},'E_REFERENCE',[...new Set([...materialScope,...nodes.filter(n=>n.kind==='material').map(n=>n.id!)])].sort());
        });
      }
      if(node.kind==="place"){
        if(node.fields.get('parked')===true && (wordField(node,'role')!=='controllable' || node.fields.has('route') || node.fields.has('behavior') || node.fields.has('pose') || node.fields.has('motion')))fail('parked=true requires role=controllable at a fixed position without pose, route, behavior or ambient motion',{...node.token,path:`${node.token.path}/parked`},'E_PLACEMENT');
        if(node.fields.has("motion") && (wordField(node,"role")!=="ambient" || node.fields.has("route") || node.fields.has("behavior") || node.fields.has("pose")))fail("motion requires role=ambient, fixed at and no pose, route or behavior",node.token,"E_PLACEMENT");
        if(node.fields.has("pose") && (!node.fields.has("role") || wordField(node,"role")!=="prop" || node.fields.has("route") || node.fields.has("behavior")))fail("pose=rest requires role=prop at a fixed position without behavior",{...node.token,path:`${node.token.path}/pose`},"E_PLACEMENT");
        reference(node,"object","object");if(node.fields.has("route"))reference(node,"route","route");if(node.fields.has("behavior"))reference(node,"behavior","behavior");
        if(Number(node.fields.has("at"))+Number(node.fields.has("route"))!==1)fail("place needs exactly one of at or route",node.token,"E_PLACEMENT");
        if(node.fields.has("offset") && !node.fields.has("route"))fail("offset requires a route",node.token,"E_PLACEMENT");
        if(node.fields.has("heading_deg") && node.fields.has("route"))fail("heading_deg applies to at placements; a route owns its actor heading",{...node.token,path:`${node.token.path}/heading_deg`},"E_PLACEMENT");
      }
      if(node.kind==='flock')reference(node,'object','object');
      if(node.kind==='team'){if(node.fields.has('keeper_object'))reference(node,'keeper_object','object');if(Number(node.fields.has('object'))+Number(node.fields.has('objects'))!==1)fail('team needs exactly one of object or objects',node.token,'E_REFERENCE');if(node.fields.has('object'))reference(node,'object','object');else for(const ref of listField(node,'objects'))reference({...node,fields:new Map([['object',ref]])},'object','object');}
      if(node.kind==='furnish')for(const ref of listField(node,'objects'))reference({...node,fields:new Map([['object',ref]])},'object','object');
      if(node.kind==='place' && node.fields.has('phase_s') && !node.fields.has('route'))fail('phase_s requires a route',node.token,'E_PLACEMENT');
      if(node.kind==="world" && node.fields.has("player"))reference(node,"player","object");
      if(node.kind==="let")scope.add(node.id!);
      if(node.block)walk(node.block,node.kind==="repeat" ? new Set([...scope,wordField(node,"index")]) : scope,materialScope);
    }
  };walk(nodes,globals);
  const completed=new Set<string>();
  const visit=(node:DreamNode,stack:string[])=>{
    if(completed.has(node.id!))return;
    if(stack.length>=DREAM_LIMITS.nesting)fail("component dependency depth exceeds 16",node.token,"E_BUDGET");
    if(stack.includes(node.id!))fail(`recursive component '${node.id}'`,node.token,"E_CYCLE");
    const calls=(block:DreamNode[]):DreamNode[]=>block.flatMap(n=>[...(n.kind==="use" ? [n] : []),...(n.block ? calls(n.block) : [])]);
    for(const call of calls(node.block!))visit(definitions.get(wordField(call,"component"))!,[...stack,node.id!]);
    completed.add(node.id!);
  };
  for(const node of nodes.filter(n=>n.kind==="component"))visit(node,[]);
}

function printValue(value:DreamValue):string {
  if(typeof value==="string" || typeof value==="boolean")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(printValue).join(",")}]`;
  if(isNode(value))return printNode(value,0,true);
  return printExpr(value);
}
function printExpr(expr:Expr,min=0):string {
  if(expr.value!==undefined){if(!Number.isFinite(expr.value))fail("number must be finite",expr.token,"E_NUMBER");return String(expr.value);}
  if(!expr.op)return expr.args ? `${expr.name}(${expr.args.map(e=>printExpr(e)).join(",")})` : expr.name!;
  const precedence=expr.op.startsWith("unary") ? 3 : ["*","/"].includes(expr.op) ? 2 : 1;
  const text=precedence===3 ? `${expr.op.slice(5)}${printExpr(expr.args![0]!,4)}` : `${printExpr(expr.args![0]!,precedence)}${expr.op}${printExpr(expr.args![1]!,precedence+1)}`;
  return precedence<min ? `(${text})` : text;
}
function printNode(node:DreamNode,depth=0,inline=false):string {
  const indent=inline ? "" : "  ".repeat(depth);
  const fields=Object.keys(commands[node.kind]!.fields).filter(k=>node.fields.has(k)).map(k=>`${k}=${printValue(field(node,k))}`).join(",");
  const head=`${indent}${node.kind}${node.id ? ` ${node.id}` : ""}(${fields})`;
  return node.block ? `${head}{\n${node.block.map(n=>printNode(n,depth+1)).join("\n")}\n${indent}}` : `${head}${inline ? "" : ";"}`;
}
export const printDreamV2 = (nodes:DreamNode[]):string => `dream 2;\n${nodes.map(n=>printNode(n)).join("\n")}\n`;
