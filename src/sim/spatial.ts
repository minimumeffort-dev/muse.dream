/** Uniform grid for bounded local queries; insertion order remains deterministic. */
export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<string, T[]>();
  constructor(items: readonly T[], readonly cellSize = 256) {
    for (const item of items) this.insert(item);
  }
  insert(item:T):void {
      const key = `${Math.floor(item.x / this.cellSize)},${Math.floor(item.y / this.cellSize)}`;
      const cell = this.cells.get(key) ?? []; cell.push(item); this.cells.set(key, cell);
  }
  query(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    for (let row = Math.floor((y - radius) / this.cellSize);row <= Math.floor((y + radius) / this.cellSize);row++)
      for (let col = Math.floor((x - radius) / this.cellSize);col <= Math.floor((x + radius) / this.cellSize);col++)
        for (const item of this.cells.get(`${col},${row}`) ?? []) result.push(item);
    return result;
  }
}
