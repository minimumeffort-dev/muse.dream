import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildCustom} from './engine/game/world3d';
import {compactObject} from './engine/game/compact-object';
import {CharacterAnimator} from './engine/game/character-animation';
import {measuredScale} from './engine/scene/measure';
import type {Scenario,EpisodeState} from './framework';
import {ASSETS,AGENT_MODELS,type AssetId} from './assets';
import {AGENT_COLORS} from './world-map';
import {agentPose,cargoAssets,scenePlan,STEP_MS,type Point} from './scene-plan';

const ground=()=>({height:.15,slopeX:0,slopeZ:0});
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
type AgentView={rig:THREE.Group;animator:CharacterAnimator;items:Map<AssetId,THREE.Group>;label:HTMLElement;last:Point;heading:number};

/** Observer only: meshes follow accepted transitions and cannot submit actions. */
export class ExperimentWorld {
  readonly renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(38,1,.5,20000);
  private controls:OrbitControls;
  private world=new THREE.Group();
  private agents:AgentView[]=[];
  private labels:{element:HTMLElement;point:THREE.Vector3}[]=[];
  private scenario:Scenario|undefined;
  private plan:ReturnType<typeof scenePlan>|undefined;
  private state:EpisodeState|undefined;
  private previous:EpisodeState|undefined;
  private started=0;
  private frozen:number|undefined;
  private frame=0;
  private lastTime=0;
  private elapsed=0;
  private disposed=false;
  private playing=false;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private resize:ResizeObserver;
  private projected=new THREE.Vector3();
  private screenLabels:{element:HTMLElement;x:number;y:number;width:number;height:number;visible:boolean}[]=[];
  private sun:THREE.DirectionalLight;
  private home={target:new THREE.Vector3(),position:new THREE.Vector3()};
  private userCamera=false;
  constructor(private host:HTMLElement,private failure:(message:string)=>void){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#e9eade');this.renderer.domElement.setAttribute('aria-hidden','true');host.append(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,0,0);
    this.controls.maxPolarAngle=Math.PI*.46;this.controls.minPolarAngle=.12;this.controls.enableDamping=false;
    this.controls.addEventListener('change',()=>this.drawFrame(performance.now()));
    this.controls.addEventListener('start',()=>{this.userCamera=true;});
    this.scene.add(new THREE.HemisphereLight('#bad4e2','#384736',1.25));
    this.sun=new THREE.DirectionalLight('#ffe5b8',2.4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.normalBias=.45;this.sun.shadow.bias=-.00008;
    this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=5000;this.scene.add(this.sun,this.sun.target,this.world);
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(host);this.size();
    host.addEventListener('keydown',this.key);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  }
  private contextLost=(event:Event)=>{event.preventDefault();this.freeze();this.failure('The 3D view lost its graphics context. Reload to restore it.');};
  private key=(event:KeyboardEvent)=>{
    if(event.target!==this.host)return;
    const offset=this.camera.position.clone().sub(this.controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='Home')this.resetView();
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(event.key)){
      this.userCamera=true;
      if(event.key==='ArrowLeft')spherical.theta-=.15;if(event.key==='ArrowRight')spherical.theta+=.15;
      if(event.key==='ArrowUp')spherical.phi=Math.max(.12,spherical.phi-.1);if(event.key==='ArrowDown')spherical.phi=Math.min(Math.PI*.46,spherical.phi+.1);
      if(event.key==='+'||event.key==='=')spherical.radius=Math.max(this.controls.minDistance,spherical.radius*.85);
      if(event.key==='-')spherical.radius=Math.min(this.controls.maxDistance,spherical.radius/ .85);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));this.controls.update();
    }else return;
    event.preventDefault();this.drawFrame(performance.now());
  };
  resetView(){this.userCamera=false;this.fit();this.drawFrame(performance.now());}
  private fit(){
    if(!this.plan)return;
    const box=new THREE.Box3().setFromObject(this.world).expandByScalar(18),target=box.getCenter(new THREE.Vector3());target.y=10;
    const direction=new THREE.Vector3(.25,1.1,1.5).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const vertical=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)),horizontal=vertical*this.camera.aspect;
    let distance=0;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const delta=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,delta.dot(direction)+Math.max(Math.abs(delta.dot(right))/horizontal,Math.abs(delta.dot(up))/vertical));
    }
    this.home={target,position:target.clone().addScaledVector(direction,distance*1.08)};
    this.camera.position.copy(this.home.position);this.controls.target.copy(target);this.controls.update();
  }
  private size(){
    const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false);
    if(!this.userCamera)this.fit();
    if(this.scenario)this.drawFrame(performance.now());
  }
  private asset(id:AssetId){
    const spec=ASSETS[id],group=compactObject(buildCustom({id,kind:'custom',labelText:spec.displayName,x:0,y:0,scale:measuredScale(spec),spec}));
    return group;
  }
  private box(size:[number,number,number],position:[number,number,number],color:string,parent=this.world){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.95}));
    mesh.position.set(...position);mesh.receiveShadow=true;mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  private strip(a:Point,b:Point,width:number,color:string,y=.04){
    const length=Math.hypot(b.x-a.x,b.z-a.z),mesh=this.box([width,.15,length+width],[(a.x+b.x)/2,y,(a.z+b.z)/2],color);
    mesh.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);return mesh;
  }
  private label(text:string,className:string,point:THREE.Vector3){
    const element=document.createElement('span');element.className=className;element.textContent=text;this.host.append(element);this.labels.push({element,point});return element;
  }
  private clear(){
    this.freeze();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    this.world.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of [object.material].flat())materials.add(material);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.world.clear();
    this.labels.forEach(l=>l.element.remove());this.labels=[];this.agents=[];
  }
  private build(scenario:Scenario){
    this.clear();this.state=undefined;this.previous=undefined;this.scenario=scenario;this.plan=scenePlan(scenario);this.elapsed=0;this.lastTime=0;
    for(const link of this.plan.links)this.strip(link.a,link.b,22,'#c7bc9e');
    for(const location of this.plan.locations){
      this.box([48,.3,48],[location.point.x,.05,location.point.z],'#d9cdb2');
      if(location.asset){
        const model=this.asset(location.asset);model.position.set(location.position.x,0,location.position.z);model.rotation.y=location.yaw;this.world.add(model);
        this.strip(location.point,location.door,24,'#d9cdb2');
      }
      this.label(location.label,'world-location',new THREE.Vector3(location.position.x,location.height+7,location.position.z));
    }
    const bounds=new THREE.Box3().setFromObject(this.world),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,200);
    this.box([size.x+100,2,size.z+100],[center.x,-1.2,center.z],'#8d9f74');
    // Border planting stays outside the accepted network and entrance paving.
    for(const [x,z] of [[bounds.min.x-20,bounds.min.z-12],[bounds.max.x+20,bounds.max.z+12],[bounds.min.x-20,bounds.max.z+12],[bounds.max.x+20,bounds.min.z-12]]){
      const tree=this.asset('tree');tree.position.set(x!,0,z!);this.world.add(tree);
    }
    this.agents=scenario.agents.map((agent,i)=>{
      const id=AGENT_MODELS[agent.look??'courier_a'],rig=this.asset(id),animator=new CharacterAnimator(rig,ASSETS[id]);this.world.add(rig);
      const cargo=new THREE.Group(),items=new Map<AssetId,THREE.Group>();
      for(const asset of cargoAssets(scenario,Object.fromEntries(scenario.items.map(item=>[item.id,1])))){const model=this.asset(asset);model.visible=false;items.set(asset,model);cargo.add(model);}
      rig.add(cargo);
      // Cargo is in rig-local space, beside the backpack rather than inside the torso.
      cargo.position.set(-7,34,6);cargo.scale.setScalar(1/rig.scale.x);
      const label=this.label(String.fromCharCode(65+i),'world-agent',new THREE.Vector3());label.style.background=AGENT_COLORS[i]!;label.style.color=i?'#fafaf7':'#171717';label.title=agent.id;
      return {rig,animator,items,label,last:{x:0,z:0},heading:0};
    });
    this.controls.minDistance=45;this.controls.maxDistance=span*5;this.camera.far=Math.max(3000,span*10);this.camera.updateProjectionMatrix();
    this.sun.position.copy(center).add(new THREE.Vector3(span*.65,span*1.4,span*.65));this.sun.target.position.copy(center);
    const shadow=this.sun.shadow.camera;shadow.left=shadow.bottom=-span*.95;shadow.right=shadow.top=span*.95;shadow.far=span*5;shadow.updateProjectionMatrix();
    this.userCamera=false;this.fit();
    this.host.dataset.assets=String(this.plan.locations.filter(l=>l.asset).length);this.host.dataset.agents=String(this.agents.length);
    this.host.setAttribute('aria-label',`3D world with ${scenario.locations.length} destinations and ${scenario.agents.length} agents. Drag to orbit, scroll to zoom. With the view focused, use arrows to orbit, plus or minus to zoom, Home to reset.`);
  }
  show(scenario:Scenario,state:EpisodeState,animate=false,playing=false){
    const changed=this.scenario!==scenario;if(changed)this.build(scenario);
    const old=this.state,now=performance.now();this.playing=playing;
    if(old!==state){
      this.frozen=undefined;
      if(!changed&&animate&&!this.reduced.matches){this.previous=old;this.started=now;}
      else {this.previous=undefined;this.agents.forEach(a=>a.animator.reset());if(!playing)this.frozen=1;}
    }else if(!animate){
      if(playing){if(this.frozen!==undefined&&this.previous)this.started=now-this.frozen*STEP_MS;this.frozen=undefined;}
      else {this.frozen??=this.previous?Math.min(1,(now-this.started)/STEP_MS):1;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
    }
    this.state=state;this.drawFrame(performance.now());this.schedule();
  }
  freeze(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.previous=undefined;this.frozen=undefined;this.lastTime=0;}
  private schedule(){if(!this.frame&&!this.disposed&&this.previous&&this.frozen===undefined)this.frame=requestAnimationFrame(time=>{this.frame=0;this.drawFrame(time);this.schedule();});}
  private drawFrame(now:number){
    if(!this.scenario||!this.state||!this.plan||this.disposed)return;
    const t=this.frozen??(this.previous?Math.min(1,(now-this.started)/STEP_MS):1),dt=this.frozen!==undefined?0:Math.min(.05,Math.max(0,(now-this.lastTime)/1000));this.lastTime=now;this.elapsed+=dt;
    this.agents.forEach((agent,i)=>{
      const pose=agentPose(this.scenario!,this.state!,i,this.plan!.points),before=this.previous?agentPose(this.scenario!,this.previous,i,this.plan!.points):pose;
      const x=lerp(before.x,pose.x,t),z=lerp(before.z,pose.z,t),dx=x-agent.last.x,dz=z-agent.last.z,moving=Math.hypot(dx,dz)>.001&&!!this.previous;
      if(moving)agent.heading=Math.atan2(dz,dx);
      agent.rig.position.set(x,.15,z);agent.rig.rotation.y=-agent.heading;
      if(this.frozen===undefined)agent.animator.update({speed:moving?Math.hypot(dx,dz)/Math.max(.001,dt):0,grounded:true,swimming:false,verticalSpeed:0,time:this.elapsed,enabled:!this.reduced.matches,
        travel:{x,y:.15,z,heading:agent.heading},ground,working:pose.working},dt);
      const carried=cargoAssets(this.scenario!,this.state!.agents[i]!.inventory);
      for(const [asset,model] of agent.items){model.visible=carried.includes(asset);model.position.z=carried.indexOf(asset)*5;}
      agent.last={x,z};const label=this.labels.find(l=>l.element===agent.label)!;label.point.set(x,23,z);
      agent.label.title=`${this.state!.agents[i]!.id} · ${pose.working?'Using service':moving?'Travelling':this.state!.agents[i]!.at}`;
    });
    this.camera.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
    const rect=this.host.getBoundingClientRect(),placed:{x:number;y:number;width:number;height:number}[]=[];
    this.screenLabels=[...this.labels].sort((a,b)=>Number(b.element.classList.contains('world-agent'))-Number(a.element.classList.contains('world-agent'))).map(label=>{
      this.projected.copy(label.point).project(this.camera);
      label.element.hidden=false;
      const width=label.element.offsetWidth||24,height=label.element.offsetHeight||24,x=(this.projected.x+1)*rect.width/2;
      let y=(1-this.projected.y)*rect.height/2;
      for(let tries=0;tries<this.labels.length;tries++){
        const overlaps=placed.filter(p=>Math.abs(x-p.x)<(width+p.width)/2+4&&y>p.y-p.height-4&&y-height<p.y+4);
        if(!overlaps.length)break;y=Math.min(...overlaps.map(p=>p.y-p.height-4));
      }
      const visible=this.projected.z<=1&&this.projected.z>= -1&&x>=0&&x<=rect.width&&y>=height&&y<=rect.height;
      label.element.hidden=!visible;label.element.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
      if(visible)placed.push({x,y,width,height});return {element:label.element,x,y,width,height,visible};
    });
    for(const [i,agent] of this.agents.entries()){
      agent.label.dataset.x=String(agent.rig.position.x);agent.label.dataset.z=String(agent.rig.position.z);
      agent.label.dataset.cargo=[...agent.items].filter(([,model])=>model.visible).map(([asset])=>asset).join(',');
      agent.label.dataset.working=String(this.state.agents[i]!.work?.kind==='service');
    }
    this.host.dataset.step=String(this.state.step);this.host.dataset.drawCalls=String(this.renderer.info.render.calls);this.host.dataset.triangles=String(this.renderer.info.render.triangles);
    this.host.dataset.geometries=String(this.renderer.info.memory.geometries);
    this.host.dataset.visualTime=String(this.elapsed);
    if(t===1){this.previous=undefined;if(!this.playing)this.frozen=1;}
  }
  dispose(){this.clear();this.disposed=true;this.resize.disconnect();this.controls.dispose();this.host.removeEventListener('keydown',this.key);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.renderer.dispose();this.renderer.domElement.remove();this.sun.shadow.map?.dispose();}
}
