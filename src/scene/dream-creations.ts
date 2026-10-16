import source from "./dream-creations.dream?raw";
import { compileDream } from "./dream";

/** Mock model-authored source. Compile once; scenery still instances the validated data. */
export const dreamExamples = compileDream(source);
export const dreamObject = (name: string) => {
  const spec = dreamExamples.find(object => object.displayName === name);
  if (!spec) throw new Error(`Missing Dream fixture: ${name}`);
  return spec;
};
