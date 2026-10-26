import {compileDream} from './engine/scene/dream';
import type {ObjectDslV2} from './engine/scene/object-dsl';
import buildings from '../assets/buildings.dream?raw';
import people from '../assets/people.dream?raw';
import garden from '../assets/garden.dream?raw';
import props from '../assets/props.dream?raw';
import spaces from '../assets/lab-spaces.dream?raw';
import type {Scenario} from './framework';

/** Closed host-owned pack, independent of the city's world/module loader. */
const [bakery,school,clinic]=compileDream(buildings),[courierA,courierB,worker,learner]=compileDream(people),[tree]=compileDream(garden),[bread,kit,pavilion]=compileDream(props),[warehouse,stockroom,library,classroom,parcel,book]=compileDream(spaces);
export const ASSETS={bakery:bakery!,school:school!,clinic:clinic!,courierA:courierA!,courierB:courierB!,worker:worker!,learner:learner!,tree:tree!,bread:bread!,kit:kit!,pavilion:pavilion!,warehouse:warehouse!,stockroom:stockroom!,library:library!,classroom:classroom!,parcel:parcel!,book:book!} satisfies Record<string,ObjectDslV2>;
export type AssetId=keyof typeof ASSETS;

type LocationLook=NonNullable<Scenario['locations'][number]['look']>;
type AgentLook=NonNullable<Scenario['agents'][number]['look']>;
type ItemLook=NonNullable<Scenario['items'][number]['look']>;
export const LOCATION_MODELS:Record<LocationLook,{asset?:AssetId;entry?:[number,number]}>={
  plaza:{},pavilion:{asset:'pavilion'},bakery:{asset:'bakery'},school:{asset:'school'},clinic:{asset:'clinic',entry:[-18,-28.7]},
  warehouse:{asset:'warehouse'},stockroom:{asset:'stockroom'},library:{asset:'library'},classroom:{asset:'classroom'},
};
export const AGENT_MODELS:Record<AgentLook,AssetId>={courier_a:'courierA',courier_b:'courierB',worker:'worker',learner:'learner'};
export const ITEM_MODELS:Record<ItemLook,AssetId|undefined>={none:undefined,bread:'bread',kit:'kit',parcel:'parcel',book:'book'};
