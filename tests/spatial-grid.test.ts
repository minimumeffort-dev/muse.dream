import {it,expect} from 'vitest';
import {SpatialGrid} from '../src/sim/spatial';

it('returns cell rows and columns in order, retaining insertion order inside a cell',()=>{
 const points=[{id:'top-right',x:10,y:10},{id:'origin-a',x:0,y:0},{id:'bottom-left',x:-.01,y:-.01},{id:'origin-b',x:9.9,y:9.9},{id:'top-left',x:-10,y:10},{id:'bottom-right',x:10,y:-10}];
 const grid=new SpatialGrid(points,10);
 expect(grid.query(0,0,10).map(p=>p.id)).toEqual(['bottom-left','bottom-right','origin-a','origin-b','top-left','top-right']);
 expect(grid.query(0,0,0).map(p=>p.id)).toEqual(['origin-a','origin-b']);
 expect(grid.query(-.01,-.01,0).map(p=>p.id)).toEqual(['bottom-left']);
 expect(grid.query(100,100,1)).toEqual([]);
});

it('keeps start-of-tick buckets for moving records and returns independent query arrays',()=>{
 const moving={x:1,y:1},grid=new SpatialGrid([moving],10),first=grid.query(1,1,0);
 moving.x=100;expect(grid.query(1,1,0)).toEqual([moving]);expect(grid.query(100,1,0)).toEqual([]);
 first.pop();expect(grid.query(1,1,0)).toEqual([moving]);
 const added={x:-10,y:20};grid.insert(added);expect(grid.query(-10,20,0)).toEqual([added]);
});

it('matches ordered cell-envelope queries across sparse and negative coordinates',()=>{
 let seed=41;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const points=Array.from({length:300},(_,id)=>({id,x:(random()-.5)*8000,y:(random()-.5)*8000}));
 for(const size of [32,128,256]){
  const grid=new SpatialGrid(points,size);
  for(let i=0;i<500;i++){
   const x=(random()-.5)*9000,y=(random()-.5)*9000,r=random()*600,x0=Math.floor((x-r)/size),x1=Math.floor((x+r)/size),y0=Math.floor((y-r)/size),y1=Math.floor((y+r)/size);
   const expected=points.filter(p=>Math.floor(p.x/size)>=x0 && Math.floor(p.x/size)<=x1 && Math.floor(p.y/size)>=y0 && Math.floor(p.y/size)<=y1)
    .sort((a,b)=>Math.floor(a.y/size)-Math.floor(b.y/size) || Math.floor(a.x/size)-Math.floor(b.x/size) || a.id-b.id);
   expect(grid.query(x,y,r)).toEqual(expected);
  }
 }
});
