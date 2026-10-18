/** One side-view bicycle for HUD SVGs and terrain-projected lane paint. */
export const bicycleSymbol={
 wheels:[{x:5,y:17,r:3.5},{x:19,y:17,r:3.5}],
 lines:[[[5,17],[9,9],[12,17],[5,17]],[[9,9],[16,9],[12,17]],[[19,17],[15,5],[18,5]],[[7,8],[11,8]],[[9,9],[8.6,8]]],
} as const;
export const bicyclePath=bicycleSymbol.wheels.map(({x,y,r})=>`M${x+r} ${y}a${r} ${r} 0 1 1 ${-2*r} 0a${r} ${r} 0 1 1 ${2*r} 0Z`).concat(bicycleSymbol.lines.map(points=>points.map(([x,y],i)=>`${i ? 'L' : 'M'}${x} ${y}`).join(''))).join('');
