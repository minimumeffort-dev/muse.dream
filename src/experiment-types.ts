import type {Parameters} from './framework';
import type {RunReport} from './report';
export type ExperimentInput={mode:'brief';world:string;task:string;parameters:Parameters}|{mode:'source';source:string};
export interface ControllerAssignment {actor:string;kind:'baseline'|'external-mock'}
export interface ExperimentConfig {name:string;input:ExperimentInput;controllers:ControllerAssignment[]}
export interface SavedExperiment {id:string;revision:number;name:string;config:ExperimentConfig;source:string;sourceHash:string;seed:number;createdAt:string;updatedAt:string}
export interface RunSummary {id:string;experimentId:string;revision:number;name:string;sourceHash:string;seed:number;config:ExperimentConfig;status:string;steps:number;metrics:RunReport['metrics'];createdAt:string;updatedAt:string}
export type SavedRunReport=RunReport&{run:RunSummary;decisions?:unknown[]};
