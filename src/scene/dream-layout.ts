import {daylightSchema} from "./daylight";
import { z } from "zod";
import { bridgeSchema,waterSchema,type Water } from "./landscape-dsl";
import { terrainSchema } from "./terrain";
import { checkpointSchema,regionSchema,sceneSchema,type Scene } from "./schema";
import type { ObjectDslV2 } from "./object-dsl";
import { fail,type Program,type Expr,type DreamNode,type Token } from "./dream-syntax";
import { exprField,field,listField,wordField } from "./dream-v2";

export type DreamLayout=Pick<Scene,"canonical"|"roadMaskRef"|"spawn"|"terrain"|"checkpoints"|"regions"|"unresolvedLabels"|"player"|"daylight"> & {origin:Token};
function validated<T>(schema:z.ZodType<T>,data:unknown,node:DreamNode):T {
  const result=schema.safeParse(data);
  if(!result.success){const issue=result.error.issues[0]!;fail(`${issue.path.join(".")}: ${issue.message}`,node.token,"E_SCHEMA");}
  return result.data;
}
function simplePolygon(points:{x:number;y:number}[],node:DreamNode):void {
  if(points.length<3 || points.length>256)fail("outline needs 3–256 points",node.token,"E_GEOMETRY");
  const cross=(a:typeof points[number],b:typeof a,c:typeof a)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let area=0;
  for(let i=0;i<points.length;i++) {
    const a=points[i]!,b=points[(i+1)%points.length]!;area+=a.x*b.y-b.x*a.y;
    if(Math.hypot(a.x-b.x,a.y-b.y)<.01)fail("outline has a zero-length edge",node.token,"E_GEOMETRY");
    for(let j=i+2;j<points.length;j++) {
      if(i===0 && j===points.length-1)continue;
      const c=points[j]!,d=points[(j+1)%points.length]!;
      if(cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0 && Math.max(a.x,b.x)>=Math.min(c.x,d.x) && Math.max(c.x,d.x)>=Math.min(a.x,b.x) && Math.max(a.y,b.y)>=Math.min(c.y,d.y) && Math.max(c.y,d.y)>=Math.min(a.y,b.y))
        fail("outline must not cross or touch itself",node.token,"E_GEOMETRY");
    }
  }
  if(Math.abs(area)<2)fail("outline area must be at least 1",node.token,"E_GEOMETRY");
}

/** Local coordinate symbols keep every junction and bridge endpoint attached to one authored point. */
export function compileCoordinates(program:Program,evaluate:(e:Expr)=>number){
  const junctions=new Map<string,{x:number;y:number}>();
  for(const node of program.layout.filter(n=>n.kind==='junction')){
    if(junctions.size>=128)fail('junction budget exceeds 128',node.token,'E_BUDGET');
    const v=listField(node,'at').map(evaluate);junctions.set(node.id!,{x:v[0]!,y:v[1]!});
  }
  const reference=(name:string,node:DreamNode)=>{
    const point=junctions.get(name);if(!point)fail(`unknown junction '${name}'`,node.token,'E_REFERENCE',[...junctions.keys()].sort());return point;
  };
  const point=(node:DreamNode,key:string)=>{
    const value=field(node,key) as Expr|Expr[];
    if(!Array.isArray(value))return reference(value.name!,node);
    return {x:evaluate(value[0]!),y:evaluate(value[1]!)};
  };
  const points=(node:DreamNode)=>{
    if(Number(node.fields.has('points'))+Number(node.fields.has('via'))!==1)fail(`${node.kind} needs exactly one of points or via`,node.token,'E_GEOMETRY');
    return node.fields.has('via') ? listField(node,'via').map(e=>reference(e.name!,node)) : (field(node,'points') as Expr[][]).map(v=>({x:evaluate(v[0]!),y:evaluate(v[1]!)}));
  };
  return {point,points};
}

export function compileLayout(program:Program,assemblies:Map<string,ObjectDslV2>,waters:Water[],evaluate:(e:Expr)=>number):DreamLayout|undefined {
  const coordinates=compileCoordinates(program,evaluate);
  program={...program,layout:program.layout.filter(n=>!['street','surface','marking','behavior','site','crossing','junction','furnish','flock'].includes(n.kind))};
  if(!program.layout.length)return undefined;
  const worlds=program.layout.filter(n=>n.kind==="world"),roads=program.layout.filter(n=>n.kind==="road");
  if(worlds.length!==1 || roads.length!==1)fail("a full world needs exactly one world and one road declaration",program.layout[0]!.token,"E_WORLD");
  const world=worlds[0]!,road=roads[0]!,daylightNodes=program.layout.filter(n=>n.kind==="daylight");
  if(daylightNodes.length>1)fail("only one daylight declaration is allowed",daylightNodes[1]!.token,"E_WORLD");
  const num=(node:DreamNode,key:string)=>evaluate(exprField(node,key));
  const vec=(node:DreamNode,key:string)=>listField(node,key).map(evaluate);
  const point=(values:number[])=>({x:values[0]!,y:values[1]!});
  const at=coordinates.point;
  const points=(node:DreamNode)=>node.kind==="road" ? coordinates.points(node) : (field(node,"points") as Expr[][]).map(v=>point(v.map(evaluate)));
  const shape=sceneSchema.innerType().shape;
  const size=vec(world,"size"),spawn=at(world,"spawn"),hills:Scene["terrain"]["hills"]=[],tints:NonNullable<Scene["terrain"]["tints"]>=[],bridges:NonNullable<Scene["terrain"]["landscape"]>["bridges"]=[],basins:Water[]=[];
  const checkpoints:Scene["checkpoints"]=[],regions:Scene["regions"]=[],unresolvedLabels:Scene["unresolvedLabels"]=[];
  for(const node of program.layout) {
    const id=node.id!;
    switch(node.kind) {
      case "hill":{const p=at(node,"at"),r=vec(node,"radius");hills.push(validated(terrainSchema.innerType().shape.hills.element,{id,...p,radiusX:r[0]!,radiusY:r[1]!,height:num(node,"height")},node));break;}
      case "tint":tints.push(validated(terrainSchema.innerType().shape.tints.unwrap().element,{...at(node,"at"),radius:num(node,"radius"),color:wordField(node,"color")},node));break;
      case "bridge":bridges.push(validated(bridgeSchema,{id,a:at(node,"from"),b:at(node,"to"),width:num(node,"width"),archHeight:num(node,"arch"),style:wordField(node,"style"),rails:field(node,"rails")},node));break;
      case "water":{const wave=vec(node,"waves");basins.push(validated(waterSchema,{id,polygon:points(node),level:num(node,"level"),depth:num(node,"depth"),bankWidth:num(node,"bank"),color:wordField(node,"color"),flow:at(node,"flow"),dragPerS:num(node,"drag"),waves:{speed:wave[0],damping:wave[1],strength:wave[2]}},node));break;}
      case "checkpoint":{
        const p=at(node,"at"),d=at(node,"dir"),length=Math.hypot(d.x,d.y),width=num(node,"width");
        if(length<1e-6 || width<=0 || width>240)fail("checkpoint needs a nonzero direction and width in (0,240]",node.token,"E_GEOMETRY");
        const dx=d.x/length,dy=d.y/length;
        checkpoints.push(validated(checkpointSchema,{id,a:{x:p.x-dy*width/2,y:p.y+dx*width/2},b:{x:p.x+dy*width/2,y:p.y-dx*width/2},dir:{x:dx,y:dy}},node));break;
      }
      case "effect":{const polygon=points(node);simplePolygon(polygon,node);const effect=wordField(node,"kind").toUpperCase();regions.push(validated(regionSchema,{id,labelText:effect,polygon,rule:{effect}},node));break;}
      case "unresolved":unresolvedLabels.push({regionId:id,labelText:field(node,"label") as string});break;
    }
  }
  const terrain=validated(terrainSchema,{hills,...(tints.length ? {tints} : {}),landscape:{dslVersion:1,waters:[...waters,...basins],bridges}},world);
  const player=world.fields.has("player") ? assemblies.get(wordField(world,"player")) : undefined;
  return {
    origin:world.token,
    canonical:validated(shape.canonical,{width:size[0],height:size[1],coordinateSystem:"top-left-x-right-y-down-px"},world),
    roadMaskRef:validated(shape.roadMaskRef,{kind:"generated-spline-loop",params:{points:points(road),roadWidth:num(road,"width"),...(road.fields.has("style") ? {style:wordField(road,"style")} : {})}},road),
    spawn:validated(shape.spawn,{...spawn,headingRad:num(world,"heading_deg")*Math.PI/180},world),
    ...(daylightNodes[0] ? {daylight:validated(daylightSchema,{cycleSeconds:num(daylightNodes[0],"cycle_s"),startHour:num(daylightNodes[0],"start_hour")},daylightNodes[0])} : {}),
    terrain,checkpoints:validated(shape.checkpoints,checkpoints,world),regions,unresolvedLabels,...(player ? {player} : {}),
  };
}
