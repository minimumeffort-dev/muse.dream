import source from "./interactive-world.dream?raw";
import characters from "./world/city_people.dream?raw";
import { compileDreamWorld } from "./dream";

export const interactiveWorld=compileDreamWorld(source,{city_people:characters});
