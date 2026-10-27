export type ExampleId='delivery'|'warehouse'|'classroom';

/** Explicit examples for the current presets; these are not a prompt interpreter. */
export const SAMPLE_PROMPTS:Record<ExampleId,string>={
  delivery:'Create a neighbourhood with a bakery, a town square, a school and a clinic. Two couriers start at the bakery, each with 16 coins and room to carry 4 items. Each courier must deliver 2 loaves of bread to the school and complete one clinic visit using a supply kit. The bakery has 12 loaves at 2 coins each and 8 kits at 3 coins each. A clinic visit costs 1 coin, takes 4 steps and can serve only one courier at a time. The bakery-to-square route takes 3 steps, square-to-school takes 2, and square-to-clinic takes 3. Complete all four tasks within 80 simulation steps, using seed 7.',
  warehouse:'Create a warehouse with a receiving dock, a loading yard and north and south stockrooms. Two workers start at receiving, each with 16 coins and room to carry 2 cartons. Each worker must deliver 1 carton to the north stockroom and 1 to the south stockroom. The receiving dock has 12 cartons at 2 coins each. The receiving-to-yard route takes 2 steps; the yard-to-north and yard-to-south routes each take 3. Complete all four tasks within 80 simulation steps, using seed 7.',
  classroom:'Create a campus with a library, a courtyard and studio and seminar classrooms. Two learners start at the library, each with 16 coins and room to carry 1 lesson pack. The first learner must complete a studio session and the second a seminar session, each using one lesson pack. The library has 12 packs at 1 coin each. Each classroom session is free, takes 5 steps and can serve one learner at a time. The library-to-courtyard route takes 3 steps; the courtyard-to-studio and courtyard-to-seminar routes each take 2. Complete both tasks within 80 simulation steps, using seed 7.',
};

/** Only the exact authored example is known to describe its preset. */
export function matchesExamplePrompt(prompt:string,example:ExampleId){return prompt===SAMPLE_PROMPTS[example];}
