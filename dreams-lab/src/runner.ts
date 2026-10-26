import {compileExperiment,createEpisode,stepEpisode,mockAction,observeAgent,episodeMetrics,recordingManifest,exportEpisode,type Episode,type EpisodeState,type Manifest} from './framework';

/** One accepted source and trace. Seeking never changes the engine's head state. */
export class ExperimentRun {
  private episode:Episode;
  private readonly states:EpisodeState[];
  private constructor(readonly manifest:Manifest,episode:Episode){this.episode=episode;this.states=[episode.state];}
  static async create(source:string){
    const accepted=compileExperiment(source),manifest=await recordingManifest(accepted.source);
    return new ExperimentRun(manifest,createEpisode(accepted.scenario));
  }
  get scenario(){return this.episode.scenario;}
  get length(){return this.states.length-1;}
  get ended(){return this.episode.state.terminated||this.episode.state.truncated;}
  at(step:number){
    if(!Number.isInteger(step)||step<0||step>this.length)throw new Error('Timeline step is outside the recorded run.');
    return this.states[step]!;
  }
  metrics(step=this.length){return episodeMetrics({...this.episode,state:this.at(step)});}
  advance(){
    if(this.ended)return false;
    this.episode=stepEpisode(this.episode,this.episode.state.agents.map(a=>mockAction(observeAgent(this.episode,a.id))));
    this.states.push(this.episode.state);return true;
  }
  export(){return exportEpisode(this.manifest,this.episode);}
}

/** Late hashing/compilation cannot replace a newer draft or accepted episode. */
export class ExperimentSession {
  run:ExperimentRun|undefined;
  preparing=false;
  private revision=0;
  invalidate(){this.revision++;this.preparing=false;}
  async start(source:string){
    const revision=++this.revision;this.preparing=true;
    try{
      const candidate=await ExperimentRun.create(source);
      if(revision!==this.revision)return undefined;
      this.run=candidate;return candidate;
    }catch(error){if(revision!==this.revision)return undefined;throw error;
    }finally{if(revision===this.revision)this.preparing=false;}
  }
}
