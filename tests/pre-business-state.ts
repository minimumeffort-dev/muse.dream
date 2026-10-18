import type {CarState} from '../src/sim/car';
import type {EconomyState} from '../src/sim/commerce';

export function preBusinessEconomy(e:EconomyState):EconomyState{
 return {...e,accounts:e.accounts.filter(a=>a.id!=='depot_owner'),markets:e.markets.map(m=>{if(m.id!=='station_supplies')return m;const {owner,...prior}=m;return prior;})};
}

/** Compare old sport fields; match state is independently verified in team-sports-save. */
export function preMatchState(state:CarState):CarState{return {...state,sports:state.sports.map(({match,...game})=>game)};}

/** Compare every historical field while checking the added release records separately. */
export function preBusinessState(state:CarState|undefined):CarState|undefined{
 if(!state?.economy)return state;
 return {...preMatchState(state),economy:preBusinessEconomy(state.economy)};
}
