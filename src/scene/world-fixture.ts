import source from "./world/open-world.dream?raw";
import objects from "./dream-creations.dream?raw";
import activities from "./interactive-world.dream?raw";
import impacts from "./impact-creations.dream?raw";
import { compileDreamScene, type DreamModules } from "./dream";

// The host supplies a closed set of text modules; Dream never fetches files or URLs.
const files=import.meta.glob<string>("./world/*.dream",{query:"?raw",import:"default",eager:true});
export const worldModules:DreamModules=Object.freeze({dream_creations:objects,interactive_world:activities,impact_creations:impacts,...Object.fromEntries(
  Object.entries(files).filter(([path])=>!path.endsWith("/open-world.dream")).map(([path,text])=>[path.split("/").at(-1)!.replace(".dream",""),text]),
)});
export { source as worldSource };
/** The entire mock world is authored in Dream 2; only revision identity belongs to the host. */
export function createWorldScene() {
  return compileDreamScene(source,{sceneId:"mock-open-world",revisionId:"r26",sourceHash:"handmade-dream2-river-town-v26"},worldModules);
}
