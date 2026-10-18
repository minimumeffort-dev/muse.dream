import type {CarState} from '../src/sim/car';
import type {EconomyState} from '../src/sim/commerce';

export function preBusinessEconomy(e:EconomyState):EconomyState{
 return {...e,accounts:e.accounts.filter(a=>a.id!=='depot_owner'),markets:e.markets.map(m=>{if(m.id!=='station_supplies')return m;const {owner,...prior}=m;return prior;})};
}

/** Compare every historical field while checking r66's added records separately. */
export function preBusinessState(state:CarState|undefined):CarState|undefined{
 if(!state?.economy)return state;
 return {...state,economy:preBusinessEconomy(state.economy)};
}
