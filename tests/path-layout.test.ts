import {describe,it,expect} from "vitest";
import {InstancedMesh,Matrix4,Mesh} from "three";
import {routeSchema,routeFrames,routePath,routeGroundPath} from "../src/scene/routes";
import {createFixtureScene,buildMaskForScene} from "../src/scene/fixture";
import {parseScene,type Scene} from "../src/scene/schema";
import {validateScenePlayability} from "../src/scene/validate";
import {roadPoints,distanceToRoad,ROAD_CURB_WIDTH} from "../src/scene/road";
import {waterSchema} from "../src/scene/landscape-dsl";
import {createLegacyWorld as createWorldScene} from "./fixtures/legacy-world"; // Frozen engine regression world; the live city is tested separately.
import {buildRoutes} from "../src/game/routes";
import {buildEnvironment} from "../src/game/environment";
import {compileDreamWorld,formatDream} from "../src/scene/dream";

const route=routeSchema.parse({id:"cycle",kind:"path",mode:"loop",speed:35,width:40,surface:"cycle",points:[{x:360,y:300},{x:600,y:300},{x:600,y:430},{x:360,y:430}]});
const base=parseScene({...createFixtureScene(),objects:[],regions:[],terrain:{hills:[]},routes:[route]});
const mask=buildMaskForScene(base);
const problems=(scene:Scene)=>validateScenePlayability(scene,mask,11).filter(p=>p.code==="route-not-clear");

describe("dedicated path corridors",()=>{
  it("compiles named widths and surfaces, preserves them through formatting and rejects unsupported combinations",()=>{
    const source='dream 2;material paint(style=toon,colors=[#226655,#226655]);object marker(label="Marker"){body(interaction=decor,radius=4,height=4);part post(shape=box,material=paint,at=[0,2,0],size=[2,4,2]);}route cycle(kind=path,mode=loop,speed=35,width=40,surface=cycle){point(at=[300,300]);point(at=[600,300]);point(at=[600,500]);point(at=[300,500]);}';
    expect(compileDreamWorld(source).routes[0]).toMatchObject({width:40,surface:"cycle"});
    expect(compileDreamWorld(formatDream(source))).toEqual(compileDreamWorld(source));
    for(const bad of [{width:15},{width:121},{width:NaN},{surface:"asphalt"},{width:undefined},{kind:"rail"},{kind:"air",altitude:100},{kind:"water"}])
      expect(routeSchema.safeParse({...route,...bad}).success,JSON.stringify(bad)).toBe(false);
    expect(routeSchema.safeParse({...route,width:undefined,surface:undefined}).success).toBe(true);
  });
  it("reserves the whole ribbon without an actor, including road curbs and the buffer",()=>{
    expect(problems(base)).toEqual([]);
    // Centreline is off-road, but the wide lane's north edge would sit beneath the curb.
    const covered={...route,width:80,points:[{x:360,y:230},{x:600,y:230},{x:600,y:430},{x:360,y:430}]};
    expect(distanceToRoad(roadPoints(base),480,230)).toBeGreaterThan(59+ROAD_CURB_WIDTH);
    expect(problems(parseScene({...base,routes:[covered]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("racing road and curbs")}));
    expect(problems(parseScene({...base,routes:[{...covered,width:undefined,surface:undefined}]}))).toEqual([]);
  });
  it("keeps route edges clear of placed objects and independent ground activities",()=>{
    const blocked=parseScene({...base,objects:[{id:"bench",kind:"tree",labelText:"TREE",x:480,y:325,scale:1}]});
    expect(problems(blocked)).toContainEqual(expect.objectContaining({message:expect.stringContaining('placed object "bench"')}));
    const rail=routeSchema.parse({id:"rail",kind:"rail",mode:"shuttle",speed:50,points:[{x:400,y:320},{x:550,y:320}]});
    expect(problems(parseScene({...base,routes:[route,rail]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("another ground route")}));
    const edge={...route,width:120,points:[{x:45,y:300},{x:250,y:300},{x:250,y:450},{x:45,y:450}]};
    expect(problems(parseScene({...base,routes:[edge]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("world boundary")}));
  });
  it("rejects hairpins and turns whose inside ribbon would fold",()=>{
    const narrow={...route,points:[{x:400,y:300},{x:420,y:300},{x:420,y:400},{x:400,y:400}]};
    expect(problems(parseScene({...base,routes:[narrow]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("bend too tight")}));
    const hairpin={...route,points:[{x:360,y:300},{x:600,y:300},{x:380,y:320}]};
    expect(problems(parseScene({...base,routes:[hairpin]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("bend too tight")}));
  });
  it("keeps paved corridors away from water and the active runway",()=>{
    const water=waterSchema.parse({id:"pond",polygon:[{x:420,y:330},{x:520,y:330},{x:520,y:430},{x:420,y:430}],level:0,depth:6,bankWidth:20,color:"#337788",flow:{x:0,y:0},dragPerS:2,waves:{speed:55,damping:1,strength:1}});
    expect(problems(parseScene({...base,terrain:{hills:[],landscape:{dslVersion:1,waters:[water],bridges:[]}}}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("water bank")}));
    const air=routeSchema.parse({id:"flight",kind:"air",mode:"loop",speed:100,altitude:100,points:[{x:400,y:320},{x:650,y:320},{x:600,y:480}]});
    expect(problems(parseScene({...base,routes:[route,air]}))).toContainEqual(expect.objectContaining({message:expect.stringContaining("runway")}));
  });
  it("reserves the actual bent runway rather than a chord through its anchors",()=>{
    const air=routeSchema.parse({id:"bent",kind:"air",mode:"loop",speed:100,altitude:100,points:[{x:300,y:300},{x:400,y:300},{x:400,y:500},{x:300,y:500}]});
    expect(routeGroundPath(air)).toEqual([{x:300,y:300},{x:400,y:300},{x:400,y:380}]);
    const tiny={...air,points:[{x:300,y:300},{x:320,y:300},{x:320,y:320},{x:300,y:320}]};
    expect(routeGroundPath(tiny)).toEqual(routePath(tiny).points);
  });
  it("shares every authored corner and matching loop seam across ribbon tiles",()=>{
    const frames=routeFrames(route),corner=frames.find(p=>p.x===600 && p.y===300)!;
    expect(corner.nx).toBe(-1);expect(corner.ny).toBe(1);
    expect(frames[0]!.nx).toBeCloseTo(frames.at(-1)!.nx);expect(frames[0]!.ny).toBeCloseTo(frames.at(-1)!.ny);
    expect(frames.at(-1)!.distance).toBe(routePath(route).length);
    const shuttle=routeFrames({...route,mode:"shuttle"});
    expect(Math.abs(shuttle[0]!.nx)).toBe(0);expect(shuttle[0]!.ny).toBe(1);expect(shuttle.at(-1)!.ny).toBe(-1);
    const mesh=buildRoutes(base).getObjectByName("route-cycle") as Mesh;
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox!.min.x).toBeCloseTo(360-20-base.canonical.width/2);
    expect(mesh.geometry.boundingBox!.max.x).toBeCloseTo(600+20-base.canonical.width/2);
  });
});

describe("full-size mock activities",()=>{
  const scene=createWorldScene();
  it("keeps the skate circuit and connects cycling to city streets",()=>{
    expect(validateScenePlayability(scene,buildMaskForScene(scene),11)).toEqual([]);
    expect(scene.routes.find(r=>r.id==="meadow_cycle")).toBeUndefined();
    expect(scene.streets.filter(s=>s.cycleWidth).length).toBeGreaterThan(20);
    for(const id of ["village_skate"]){
      const path=scene.routes.find(r=>r.id===id)!;
      expect(routePath(path).length,id).toBeGreaterThan(1000);
      expect(Math.max(...path.points.map(p=>p.x))-Math.min(...path.points.map(p=>p.x))).toBeGreaterThanOrEqual(400);
      expect(Math.max(...path.points.map(p=>p.y))-Math.min(...path.points.map(p=>p.y))).toBeGreaterThanOrEqual(230);
      expect(path.width).toBeGreaterThanOrEqual(40);
    }

  });
  it("keeps grass and flowers outside the newly reserved surfaces",()=>{
    const environment=buildEnvironment(scene),paths=scene.routes.filter(r=>r.kind==="path"),matrix=new Matrix4();let decorations=0;
    environment.traverse(node=>{
      if(!(node instanceof InstancedMesh) || !node.name.startsWith('ground-cover-'))return;
      for(let i=0;i<node.count;i++){
        node.getMatrixAt(i,matrix);const x=matrix.elements[12]!+scene.canonical.width/2,y=matrix.elements[14]!+scene.canonical.height/2;
        for(const path of paths)expect(distanceToRoad(routePath(path).points,x,y)).toBeGreaterThan(path.width!/2+3.99);
        decorations++;
      }
    });
    expect(decorations).toBeGreaterThan(1000);
  });
});
