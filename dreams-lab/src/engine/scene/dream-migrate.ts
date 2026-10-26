import { fail, type Program, DreamNode, DreamValue, Statement, Expr, Motion, Token } from "./dream-syntax";
import { printDreamV2 } from "./dream-v2";

/** Migration preserves composition; generated explicit names become the stable edit points. */
export function migrateProgram(program:Program):string {
  const names=new Set<string>();
  const slug=(name:string)=>{let id=name.toLowerCase().replace(/[^a-z0-9_]/g,"_").replace(/_+/g,"_").slice(0,26);if(!/^[a-z]/.test(id))id=`id_${id}`;if(["sin","cos","true","false"].includes(id))id+="_id";return id;};
  const allocate=(name:string,used:Set<string>)=>{const base=slug(name);let id=base,index=2;while(used.has(id))id=`${base}_${index++}`;used.add(id);return id;};
  const published=new Map<string,string>();
  for(const item of [...program.routes,...program.waters,...program.places]) {
    const id=allocate(item.name,names);
    if(id!==item.name)fail(`world ID '${item.name}' needs an explicit rename before migration`,item.token,"E_MIGRATION");
    published.set(item.name,id);
  }
  const globals=new Map<string,string>();
  for(const name of [...program.materials.keys(),...program.globals.map(s=>s.name!),...program.components.keys()])globals.set(name,allocate(name,names));
  const objects=new Map(program.objects.map(o=>[o.name,allocate(o.name,names)]));
  const routes=new Map(program.routes.map(r=>[r.name,published.get(r.name)!]));
  const waters=new Map(program.waters.map(w=>[w.name,published.get(w.name)!]));
  const token:Token={text:"",line:1,column:1};
  const word=(name:string):Expr=>({token,name});
  const literal=(value:number):Expr=>({token,value});
  const node=(kind:string,id:string|undefined,fields:Record<string,DreamValue|undefined>,block?:DreamNode[]):DreamNode=>({kind,id,token,fields:new Map(Object.entries(fields).filter((entry):entry is [string,DreamValue]=>entry[1]!==undefined)),...(block ? {block} : {})});
  const expression=(e:Expr,scope:Map<string,string>):Expr=>({...e,...(e.name && !e.args ? {name:scope.get(e.name)??e.name} : {}),...(e.args ? {args:e.args.map(arg=>expression(arg,scope))} : {})});
  const motion=(m:Motion,scope:Map<string,string>)=>{
    const args=m.args.map(e=>expression(e,scope)),hz=(e:Expr):Expr=>({token,op:"/",args:[e,literal(2*Math.PI)]});
    return node(m.kind,undefined,m.kind==="spin" ? {axis:word(m.axis!),deg_s:args[0]} : m.kind==="roll" ? {axis:word(m.axis??"y"),radius:args[0]} : m.kind==="sway" ? {deg:args[0],hz:hz(args[1]!)} : m.kind==="swing" ? {axis:word(m.axis!),deg:args[0],hz:hz(args[1]!),phase_deg:args[2]} : {axis:word(m.axis!),deg:args[0],radius:args[1]});
  };
  const block=(statements:Statement[],inherited:Map<string,string>):DreamNode[]=>{
    const scope=new Map(inherited),used=new Set<string>();
    return statements.map(s=>{
      const value=(e:Expr)=>expression(e,scope),array=(list:Expr[]|undefined)=>list?.map(value);
      const xform={at:array(s.at),rot_deg:array(s.rotate),scale:s.scale ? value(s.scale) : undefined};
      let id:string|undefined,fields:Record<string,DreamValue|undefined>={};
      if(["let","fragment","repeat","use","group","joint","part","beam","contact"].includes(s.kind))id=allocate(s.kind==="repeat" ? `repeat_${s.name}` : s.name??s.kind,used);
      switch(s.kind) {
        case "let":fields={value:value(s.value!)};scope.set(s.name!,id!);break;
        case "body":fields={interaction:word(s.interaction!),radius:value(s.args![0]!),height:value(s.args![1]!),friction:s.args![2] ? value(s.args![2]!) : undefined};break;
        case "ground":fields={mode:word(s.name!)};break;
        case "foundation":fields={size:array(s.args),color:word(s.color!)};break;
        case "contact":fields={at:array(s.at),radius:value(s.args![0]!),height:value(s.args![1]!)};break;
        case "rideable":fields={at:array(s.at)??[literal(0),literal(16),literal(0)]};break;
        case "emit":fields={kind:word(s.name!),at:array(s.at),rate_s:value(s.value!)};break;
        case "impact":fields={mode:node(s.name!,undefined,Object.fromEntries((s.name==="bounce" ? ["restitution","lift"] : ["speed","scatter","lift","spin","lifetime"]).map((key,i)=>[key,value(s.args![i]!)])))};break;
        case "repeat":fields={index:word(slug(s.name!)),count:value(s.value!)};break;
        case "use":fields={component:word(globals.get(s.name!)!),args:array(s.args),...xform};break;
        case "group":case "joint":fields={...xform,...(s.motion ? {motion:motion(s.motion,scope)} : {})};break;
        case "part":case "beam":fields={shape:word(s.shape!),material:word(globals.get(s.material!)!),...(s.kind==="part" ? {at:array(s.at),size:array(s.size),rot_deg:array(s.rotate)} : {from:array(s.at),to:array(s.to),width:value(s.args![0]!),depth:value(s.args![1]!)}),...(s.motion ? {motion:motion(s.motion,scope)} : {}),...(s.deform ? {deform:node("deform",undefined,{seed:value(s.deform[0]),amount:value(s.deform[1])})} : {})};break;
        case "point":fields={at:array(s.args)};break;
      }
      const childScope=new Map(scope);if(s.kind==="repeat")childScope.set(s.name!,slug(s.name!));
      return node(s.kind,id,fields,s.block ? block(s.block,childScope) : undefined);
    });
  };
  const result:DreamNode[]=[];
  for(const [name,material] of program.materials)result.push(node("material",globals.get(name),{style:word(material.shaderStyle==="paper-grain" ? "grain" : material.shaderStyle),colors:[word(material.colorA.toLowerCase()),word(material.colorB.toLowerCase())]}));
  for(const s of program.globals)result.push(node("let",globals.get(s.name!),{value:expression(s.value!,globals)}));
  for(const [name,component] of program.components){
    const scope=new Map(globals),used=new Set<string>(),params=component.params.map(p=>{const id=allocate(p,used);scope.set(p,id);return word(id);});
    result.push(node("component",globals.get(name),{params},block(component.block,scope)));
  }
  for(const object of program.objects)result.push(node("object",objects.get(object.name),{label:object.name},block(object.block,globals)));
  for(const route of program.routes)result.push(node("route",routes.get(route.name),{kind:word(route.kind),mode:word(route.mode),speed:expression(route.speed,globals),altitude:route.altitude ? expression(route.altitude,globals) : undefined,wait_s:route.wait ? expression(route.wait,globals) : undefined},block(route.block,globals)));
  for(const water of program.waters)result.push(node("watercourse",waters.get(water.name),{level:expression(water.level,globals),depth:expression(water.depth,globals),bank:expression(water.bank,globals),color:word(water.color.toLowerCase()),flow:water.flow.map(e=>expression(e,globals))},block(water.block,globals)));
  for(const place of program.places)result.push(node("place",published.get(place.name),{object:word(objects.get(place.assembly)!),at:place.at?.map(e=>expression(e,globals)),route:place.route ? word(routes.get(place.route)!) : undefined,offset:place.offset ? expression(place.offset,globals) : undefined,scale:place.scale ? expression(place.scale,globals) : undefined,heading_deg:place.heading ? expression(place.heading,globals) : undefined}));
  return printDreamV2(result);
}
