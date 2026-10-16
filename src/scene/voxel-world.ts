import {z} from 'zod';

/** World construction policy, fixed at compilation rather than camera-dependent LOD. */
export const voxelWorldSchema=z.object({
  objectCell:z.number().finite().min(.25).max(4),
  groundCell:z.union([z.literal(4),z.literal(8)]),
  heightStep:z.number().finite().min(.5).max(1),
}).strict();
export type VoxelWorld=z.infer<typeof voxelWorldSchema>;
export const WORLD_VOXEL_LIMITS=Object.freeze({stampAxis:32,stampCacheBytes:16*1024*1024,tileSize:400,columnCellsPerTile:640000});
