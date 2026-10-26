import {z} from 'zod';

export const STRIKE_LIMITS=Object.freeze({reach:[6,16],speed:[20,120],cooldownS:[.35,2],handRadius:1} as const);
export const strikeSchema=z.object({
 reach:z.number().finite().min(6).max(16),
 speed:z.number().finite().min(20).max(120),
 cooldownS:z.number().finite().min(.35).max(2),
}).strict();
