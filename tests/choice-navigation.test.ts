import {it,expect} from 'vitest';
import {choiceIndex} from '../src/game/choices';
it('wraps keyboard selection at both ends without producing invalid empty or single-item indices',()=>{
 expect(choiceIndex(0,0,1)).toBe(0);expect(choiceIndex(0,1,-1)).toBe(0);expect(choiceIndex(0,1,1)).toBe(0);
 expect(choiceIndex(0,7,-1)).toBe(6);expect(choiceIndex(6,7,1)).toBe(0);expect(choiceIndex(0,7,-2)).toBe(5);
 for(let n=1;n<=40;n++)for(let i=0;i<n;i++)for(const delta of [-2,-1,1,2])expect(choiceIndex(i,n,delta)).toBeGreaterThanOrEqual(0);
});

import {controlIcon} from '../src/game/icons';
it('shows the authored vehicle capability rather than guessing from its label',()=>{for(const kind of ['bicycle','scooter','skateboard','boat','plane'])expect(controlIcon(kind)).toBe(kind);expect(controlIcon('car')).toBe('ride');expect(controlIcon(undefined)).toBe('ride');});
