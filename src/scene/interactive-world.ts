import source from "./interactive-world.dream?raw";
import { compileDreamWorld } from "./dream";

export const interactiveWorld=compileDreamWorld(source);
