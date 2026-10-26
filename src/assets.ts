import {compileDream} from './engine/scene/dream';
import type {ObjectDslV2} from './engine/scene/object-dsl';
import buildings from '../assets/buildings.dream?raw';
import people from '../assets/people.dream?raw';
import garden from '../assets/garden.dream?raw';
import props from '../assets/props.dream?raw';

/** Closed host-owned pack, independent of the city's world/module loader. */
const [bakery,school,clinic]=compileDream(buildings),[courierA,courierB]=compileDream(people),[tree]=compileDream(garden),[bread,kit,pavilion]=compileDream(props);
export const ASSETS={bakery:bakery!,school:school!,clinic:clinic!,courierA:courierA!,courierB:courierB!,tree:tree!,bread:bread!,kit:kit!,pavilion:pavilion!} satisfies Record<string,ObjectDslV2>;
export type AssetId=keyof typeof ASSETS;

// shortcut: the mock fixture binds these locations/items; add explicit Dream presentation bindings before arbitrary generation.
export const DELIVERY_BUILDINGS:Readonly<Record<string,AssetId>>={bakery:'bakery',school:'school',clinic:'clinic'};
