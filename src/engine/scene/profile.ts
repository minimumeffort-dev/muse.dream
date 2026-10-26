/** A small closed XY silhouette. Extrema are explicit so size keeps its full-dimension contract. */
export function profileProblem(points:readonly (readonly [number,number])[]):string|undefined {
  if(points.length<3 || points.length>24)return 'prism outline needs 3..24 points';
  if(points.some(p=>p.some(v=>!Number.isFinite(v) || v<0 || v>1)))return 'prism outline coordinates must be finite in 0..1';
  for(const axis of [0,1])if(Math.min(...points.map(p=>p[axis]!))!==0 || Math.max(...points.map(p=>p[axis]!))!==1)return 'prism outline must span 0..1 on both X and Y';
  const cross=(a:readonly number[],b:readonly number[],c:readonly number[])=>(b[0]!-a[0]!)*(c[1]!-a[1]!)-(b[1]!-a[1]!)*(c[0]!-a[0]!);
  let area=0;
  for(let i=0;i<points.length;i++){
    const a=points[i]!,b=points[(i+1)%points.length]!,before=points[(i+points.length-1)%points.length]!;
    area+=a[0]*b[1]-b[0]*a[1];
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<.0001)return 'prism outline has a zero-length edge';
    if(Math.abs(cross(before,a,b))<1e-9 && (a[0]-before[0])*(b[0]-a[0])+(a[1]-before[1])*(b[1]-a[1])<0)return 'prism outline must not fold back';
    for(let j=i+2;j<points.length;j++){
      if(i===0 && j===points.length-1)continue;
      const c=points[j]!,d=points[(j+1)%points.length]!;
      if(cross(a,b,c)*cross(a,b,d)<=1e-12 && cross(c,d,a)*cross(c,d,b)<=1e-12 && Math.max(a[0],b[0])>=Math.min(c[0],d[0])-1e-9 && Math.max(c[0],d[0])>=Math.min(a[0],b[0])-1e-9 && Math.max(a[1],b[1])>=Math.min(c[1],d[1])-1e-9 && Math.max(c[1],d[1])>=Math.min(a[1],b[1])-1e-9)return 'prism outline must not cross or touch itself';
    }
  }
  if(Math.abs(area)<.02)return 'prism outline area must be at least .01';
}
