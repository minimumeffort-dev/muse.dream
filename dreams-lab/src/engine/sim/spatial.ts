/** Uniform grid for bounded local queries; insertion order remains deterministic. */
export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<number, Map<number,T[]>>();
  constructor(items: readonly T[], readonly cellSize = 256) {
    for (const item of items) this.insert(item);
  }
  insert(item:T):void {
      const x=Math.floor(item.x/this.cellSize),y=Math.floor(item.y/this.cellSize);
      let row=this.cells.get(y);if(!row){row=new Map();this.cells.set(y,row);}
      const cell=row.get(x)??[];cell.push(item);row.set(x,cell);
  }
  query(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    const x0=Math.floor((x-radius)/this.cellSize),x1=Math.floor((x+radius)/this.cellSize),y1=Math.floor((y+radius)/this.cellSize);
    for(let y0=Math.floor((y-radius)/this.cellSize);y0<=y1;y0++){
      const row=this.cells.get(y0);if(!row)continue;
      for(let col=x0;col<=x1;col++)for(const item of row.get(col)??[])result.push(item);
    }
    return result;
  }
}
