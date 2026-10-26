/**
 * Drivable raster mask in canonical coordinates.
 *
 * Collision approximation (documented, deliberate): the car footprint is a
 * circle tested by deterministic point samples (center + two rings), and the
 * simulation substeps so no single move exceeds half the footprint radius.
 * This is a sampled approximation, not exact disk collision; thin features
 * between samples can be missed. Holes are preserved in each mask. The
 * fixture's road mask keeps the island; its travel mask covers the sheet.
 */
export class RasterMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  readonly columns: number;
  readonly rows: number;

  // Width/height are world extents; columns/rows index raster cells.
  constructor(width: number, height: number, data?: Uint8Array, readonly cellSize = 1) {
    this.width = width;
    this.height = height;
    this.columns = Math.ceil(width / cellSize); this.rows = Math.ceil(height / cellSize);
    this.data = data ?? new Uint8Array(this.columns * this.rows);
    if (this.data.length !== this.columns * this.rows) {
      throw new Error("mask data length does not match dimensions");
    }
  }

  isDrivableAtPixel(px: number, py: number): boolean {
    if (px < 0 || py < 0 || px >= this.columns || py >= this.rows) return false;
    return this.data[py * this.columns + px] === 1;
  }

  isDrivable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.isDrivableAtPixel(Math.floor(x / this.cellSize), Math.floor(y / this.cellSize));
  }

  /**
   * Checks sampled points of the circular footprint against drivable pixels.
   * Samples: center, 12 points on the rim, 8 points at radius/sqrt(2).
   */
  footprintClear(x: number, y: number, radius: number): boolean {
    if (!this.isDrivable(x, y)) return false;
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      if (!this.isDrivable(x + Math.cos(t) * radius, y + Math.sin(t) * radius)) {
        return false;
      }
    }
    const inner = radius / Math.SQRT2;
    for (let i = 0; i < 8; i++) {
      const t = ((i + 0.5) / 8) * Math.PI * 2;
      if (!this.isDrivable(x + Math.cos(t) * inner, y + Math.sin(t) * inner)) {
        return false;
      }
    }
    return true;
  }

  /** Flood fill from a drivable point; returns the set of reached pixels. */
  floodFrom(x: number, y: number): Uint8Array {
    const seen = new Uint8Array(this.columns * this.rows);
    const sx = Math.floor(x / this.cellSize);
    const sy = Math.floor(y / this.cellSize);
    if (!this.isDrivable(x, y)) return seen;
    const stack = [sy * this.columns + sx];
    seen[sy * this.columns + sx] = 1;
    while (stack.length > 0) {
      const idx = stack.pop() as number;
      const px = idx % this.columns;
      const py = (idx - px) / this.columns;
      const neighbors = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ] as const;
      for (const [nx, ny] of neighbors) {
        if (!this.isDrivableAtPixel(nx, ny)) continue;
        const nIdx = ny * this.columns + nx;
        if (seen[nIdx] === 1) continue;
        seen[nIdx] = 1;
        stack.push(nIdx);
      }
    }
    return seen;
  }
}

/** The whole sheet is traversable; the racing road remains a separate mask. */
export function buildPaperMask(width: number, height: number): RasterMask {
  const cell = Math.max(width, height) > 2000 ? 4 : 1;
  return new RasterMask(width, height, new Uint8Array(Math.ceil(width/cell) * Math.ceil(height/cell)).fill(1), cell);
}

/** Signed distance to a rounded rectangle (negative inside). */
export function roundedRectSdf(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number; radius: number },
): number {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const qx = Math.abs(x - cx) - (rect.width / 2 - rect.radius);
  const qy = Math.abs(y - cy) - (rect.height / 2 - rect.radius);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - rect.radius;
}

/**
 * Builds the loop mask referenced by a scene: inside the outer rounded rect
 * but outside the island inset by `roadWidth`. The island (hole) is kept.
 */
export function buildLoopMask(
  width: number,
  height: number,
  outer: { x: number; y: number; width: number; height: number; radius: number },
  roadWidth: number,
): RasterMask {
  const island = {
    x: outer.x + roadWidth,
    y: outer.y + roadWidth,
    width: outer.width - roadWidth * 2,
    height: outer.height - roadWidth * 2,
    radius: Math.max(8, outer.radius - roadWidth),
  };
  const mask = new RasterMask(width, height);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const insideOuter = roundedRectSdf(cx, cy, outer) <= 0;
      const insideIsland = roundedRectSdf(cx, cy, island) <= 0;
      mask.data[py * width + px] = insideOuter && !insideIsland ? 1 : 0;
    }
  }
  return mask;
}

export function pointInPolygon(
  x: number,
  y: number,
  polygon: readonly { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i] as { x: number; y: number };
    const pj = polygon[j] as { x: number; y: number };
    const crosses =
      pi.y > y !== pj.y > y &&
      x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Scanline union, preserving cell-center semantics without scanning a diagonal's entire bounding box. */
export function paintPolygons(mask:RasterMask,polygons:readonly (readonly {x:number;y:number}[])[]):void{
  const cell=mask.cellSize;
  for(const polygon of polygons){
    const y0=Math.max(0,Math.ceil(Math.min(...polygon.map(p=>p.y))/cell-.5)),y1=Math.min(mask.rows,Math.ceil(Math.max(...polygon.map(p=>p.y))/cell-.5));
    for(let row=y0;row<y1;row++){
      const y=(row+.5)*cell,crossings:number[]=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;
        if((a.y>y)!==(b.y>y))crossings.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
      }
      crossings.sort((a,b)=>a-b);
      for(let i=0;i+1<crossings.length;i+=2){
        const x0=Math.max(0,Math.ceil(crossings[i]!/cell-.5)),x1=Math.min(mask.columns,Math.ceil(crossings[i+1]!/cell-.5));
        if(x1>x0)mask.data.fill(1,row*mask.columns+x0,row*mask.columns+x1);
      }
    }
  }
}

/** Rasterize segment bounds on a 4-unit grid; queries and footprint radii remain in world units. */
export function buildRibbonMask(width: number, height: number, points: {x:number;y:number}[], roadWidth: number): RasterMask {
  const mask = new RasterMask(width, height, undefined, 4), r = roadWidth / 2;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1]!, b=points[i]!, dx=b.x-a.x, dy=b.y-a.y;
    const minX=Math.max(0,Math.floor((Math.min(a.x,b.x)-r)/4)), maxX=Math.min(mask.columns-1,Math.ceil((Math.max(a.x,b.x)+r)/4));
    const minY=Math.max(0,Math.floor((Math.min(a.y,b.y)-r)/4)), maxY=Math.min(mask.rows-1,Math.ceil((Math.max(a.y,b.y)+r)/4));
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const px=(x+.5)*4-a.x, py=(y+.5)*4-a.y, t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy || 1)));
      if((px-t*dx)**2+(py-t*dy)**2<=r*r) mask.data[y*mask.columns+x]=1;
    }
  }
  return mask;
}
