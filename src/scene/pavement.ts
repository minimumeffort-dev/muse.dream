import type {Point} from './schema';
import {onPolygon} from './streets';
import {partition,polygonArea,polygonBounds} from './polygons';
import {clipPolygon} from './landscape-dsl';

/** Exact support across the union of accepted pavement polygons. */
export function pavementSurface(polygons:Point[][]){
 const bins=new Map<string,number[]>(),bounds=polygons.map(polygonBounds);
 for(const [i,b] of bounds.entries())for(let y=Math.floor(b.y0/256);y<=Math.floor(b.y1/256);y++)for(let x=Math.floor(b.x0/256);x<=Math.floor(b.x1/256);x++){const key=x+','+y,cell=bins.get(key)??[];cell.push(i);bins.set(key,cell);}
 const paved=(x:number,y:number)=>bins.get(Math.floor(x/256)+','+Math.floor(y/256))?.some(i=>{
  const b=bounds[i]!,margin=.01+1e-9;
  return x>=b.x0-margin && x<=b.x1+margin && y>=b.y0-margin && y<=b.y1+margin && onPolygon(polygons[i]!,x,y,.01);
 })??false;
 // Check every pavement boundary, so short gaps at an oblique portal cannot fall between samples.
 const pavedSegment=(a:Point,b:Point,rr:number)=>{
  const candidates=new Set<number>();
  for(let y=Math.floor((Math.min(a.y,b.y)-rr)/256);y<=Math.floor((Math.max(a.y,b.y)+rr)/256);y++)for(let x=Math.floor((Math.min(a.x,b.x)-rr)/256);x<=Math.floor((Math.max(a.x,b.x)+rr)/256);x++)for(const i of bins.get(x+','+y)??[])candidates.add(i);
  const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;if(d2<1e-10)return true;
  for(let sample=0;sample<9;sample++){
   const x=a.x+(sample ? Math.cos(sample*Math.PI/4)*rr : 0),y=a.y+(sample ? Math.sin(sample*Math.PI/4)*rr : 0),cuts=[0,1];
   for(const i of candidates){const polygon=polygons[i]!;
    for(let j=0;j<polygon.length;j++){const u=polygon[j]!,v=polygon[(j+1)%polygon.length]!,ex=v.x-u.x,ey=v.y-u.y,px=u.x-x,py=u.y-y,den=dx*ey-dy*ex;
     if(Math.abs(den)>1e-9){const t=(px*ey-py*ex)/den,s=(px*dy-py*dx)/den;if(t>0 && t<1 && s>=0 && s<=1)cuts.push(t);}
     else if(Math.abs(px*dy-py*dx)<1e-7)for(const p of [u,v]){const t=((p.x-x)*dx+(p.y-y)*dy)/d2;if(t>0 && t<1)cuts.push(t);}
    }
   }
   cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){const t=(cuts[i-1]!+cuts[i]!)/2;if(cuts[i]!-cuts[i-1]!>1e-8 && !paved(x+dx*t,y+dy*t))return false;}
  }return true;
 };
 return {bins,bounds,paved,segment:pavedSegment};
}

export function pavementPortal(a:Point[],b:Point[],r:number):Point|undefined{
  const overlap=partition(a,b).inside;
  if(polygonArea(overlap)>.01)return {x:overlap.reduce((n,p)=>n+p.x,0)/overlap.length,y:overlap.reduce((n,p)=>n+p.y,0)/overlap.length};
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
   const p=a[i]!,q=a[(i+1)%a.length]!,u=b[j]!,v=b[(j+1)%b.length]!,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
   if(d<2*r || Math.abs(dx*(u.y-p.y)-dy*(u.x-p.x))/d>.01 || Math.abs(dx*(v.y-p.y)-dy*(v.x-p.x))/d>.01)continue;
   const t=(k:Point)=>((k.x-p.x)*dx+(k.y-p.y)*dy)/d,low=Math.max(0,Math.min(t(u),t(v))),high=Math.min(d,Math.max(t(u),t(v)));
   if(high-low>=2*r+.1)return {x:p.x+dx*(low+high)/2/d,y:p.y+dy*(low+high)/2/d};
  }
 }

/** Nearest full-cylinder center inside one convex pavement piece. */
export function pavementInsetPoint(polygon:Point[],point:Point,r:number):Point|undefined{
 const winding=Math.sign(polygon.reduce((n,p,i)=>{const q=polygon[(i+1)%polygon.length]!;return n+p.x*q.y-q.x*p.y;},0));let inner=polygon;
 for(let i=0;i<polygon.length && inner.length>=3;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length>1e-8)inner=clipPolygon(inner,p=>winding*(dx*(p.y-a.y)-dy*(p.x-a.x))-(r+.01)*length);}
 if(inner.length<3 || polygonArea(inner)<.001)return;
 if(onPolygon(inner,point.x,point.y))return point;
 let best:Point|undefined,distance=Infinity;for(let i=0;i<inner.length;i++){const a=inner[i]!,b=inner[(i+1)%inner.length]!,dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy || 1))),p={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(p.x-point.x,p.y-point.y);if(d<distance){best=p;distance=d;}}return best;
}
