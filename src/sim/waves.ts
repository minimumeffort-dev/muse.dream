import type { Water } from "../scene/landscape-dsl";
import { terrainHeight, type Terrain } from "../scene/terrain";
import { pointInPolygon } from "./mask";

/** Bounded damped surface waves, advected by the authored current. No volume solver. */
export class WaterWaves {
  readonly minX:number; readonly minY:number; readonly width:number; readonly height:number;
  readonly columns:number; readonly rows:number; readonly wet:Uint8Array;
  heights:Float32Array<ArrayBuffer>; private velocity:Float32Array<ArrayBuffer>; private next:Float32Array<ArrayBuffer>; private nextVelocity:Float32Array<ArrayBuffer>;
  private energy=0;
  private wetCells:number[]=[];
  version=0;
  constructor(readonly water:Water,terrain:Terrain) {
    this.minX=Math.min(...water.polygon.map(p=>p.x)); this.minY=Math.min(...water.polygon.map(p=>p.y));
    this.width=Math.max(...water.polygon.map(p=>p.x))-this.minX;
    this.height=Math.max(...water.polygon.map(p=>p.y))-this.minY;
    this.columns=Math.ceil(this.width/24)+1;this.rows=Math.ceil(this.height/24)+1;
    const size=this.columns*this.rows;
    this.heights=new Float32Array(size);this.velocity=new Float32Array(size);
    this.next=new Float32Array(size);this.nextVelocity=new Float32Array(size);this.wet=new Uint8Array(size);
    for(let y=1;y<this.rows-1;y++) for(let x=1;x<this.columns-1;x++) {
      const px=this.minX+x*this.width/(this.columns-1),py=this.minY+y*this.height/(this.rows-1);
      this.wet[y*this.columns+x]=Number(pointInPolygon(px,py,water.polygon) && terrainHeight(terrain,px,py)<water.level-.1);
      if(this.wet[y*this.columns+x])this.wetCells.push(y*this.columns+x);
    }
  }
  disturb(x:number,y:number,strength=1):void {
    if(!Number.isFinite(x+y+strength)) return;
    const gx=(x-this.minX)/this.width*(this.columns-1),gy=(y-this.minY)/this.height*(this.rows-1);
    for(let iy=Math.max(1,Math.floor(gy)-2);iy<=Math.min(this.rows-2,Math.ceil(gy)+2);iy++)
      for(let ix=Math.max(1,Math.floor(gx)-2);ix<=Math.min(this.columns-2,Math.ceil(gx)+2);ix++) {
        const i=iy*this.columns+ix;
        if(this.wet[i]) this.heights[i]=Math.max(-2,Math.min(2,this.heights[i]!+Math.exp(-((ix-gx)**2+(iy-gy)**2))*strength*this.water.waves.strength));
      }
    this.energy=2;this.version++;
  }
  step(dt:number):void {
    if(this.energy<.001 || dt<=0 || !Number.isFinite(dt)) return;
    // Fixed internal steps also keep developer previews stable after a slow frame.
    const steps=Math.ceil(Math.min(dt,.1)*120),h=Math.min(dt,.1)/steps;
    const dx=this.width/(this.columns-1),dy=this.height/(this.rows-1),c2=this.water.waves.speed**2;
    const damping=Math.exp(-this.water.waves.damping*h);
    for(let step=0;step<steps;step++) {
      let peak=0;
      for(const i of this.wetCells) {
        const x=i%this.columns,y=Math.floor(i/this.columns);
        const lap=(this.heights[i-1]!-2*this.heights[i]!+this.heights[i+1]!)/(dx*dx)+
          (this.heights[i-this.columns]!-2*this.heights[i]!+this.heights[i+this.columns]!)/(dy*dy);
        const sx=x-this.water.flow.x*h/dx,sy=y-this.water.flow.y*h/dy;
        const velocity=(this.sample(this.velocity,sx,sy)+c2*lap*h)*damping;
        const height=Math.max(-2,Math.min(2,this.sample(this.heights,sx,sy)+velocity*h));
        this.next[i]=height;this.nextVelocity[i]=velocity;
        peak=Math.max(peak,Math.abs(height),Math.abs(velocity)*.1);
      }
      [this.heights,this.next]=[this.next,this.heights];[this.velocity,this.nextVelocity]=[this.nextVelocity,this.velocity];
      this.energy=peak;
    }
    this.version++;
    if(this.energy<.001) this.clear();
  }
  private sample(values:Float32Array,x:number,y:number):number {
    x=Math.max(0,Math.min(this.columns-1,x));y=Math.max(0,Math.min(this.rows-1,y));
    const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
    const a=values[iy*this.columns+ix]!,b=values[iy*this.columns+Math.min(ix+1,this.columns-1)]!;
    const c=values[Math.min(iy+1,this.rows-1)*this.columns+ix]!,d=values[Math.min(iy+1,this.rows-1)*this.columns+Math.min(ix+1,this.columns-1)]!;
    return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
  }
  clear():void {this.version++;this.heights.fill(0);this.next.fill(0);this.velocity.fill(0);this.nextVelocity.fill(0);this.energy=0;}
}
