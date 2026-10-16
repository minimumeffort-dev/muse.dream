# Dream 2 language

Dream 2 is the text authoring language behind Muse Dream. It compiles object assemblies and complete worlds into validated engine data. Cylinder parts and endpoint beams support bounded `taper` for continuous trunks, branches and posts; see the [wood example](examples/tapered-wood.dream). Start with the [documentation home](README.md), or use this complete five-part table as a small composition example.

```text
dream 2;
material wood(style=grain,colors=[#966c48,#b48c60]);
component leg(params=[h]){
  part post(shape=box,material=wood,at=[0,h/2,0],size=[4,h,4]);
}
object small_table(label="Small table"){
  measure(kind=table,axis=x,meters=2.2);
  body(interaction=solid,radius=26,height=28);
  foundation(size=[58,38],color=#68765a);
  repeat ends(index=i,count=2){
    repeat sides(index=j,count=2){
      use leg(component=leg,args=[24],at=[i*44-22,0,j*24-12]);
    }
  }
  part top(shape=box,material=wood,at=[0,26,0],size=[58,4,38]);
}
```

The model-facing contract uses named fields, explicit IDs and a bounded set of commands. The [reference](dream/reference.md) lists them all. The [object guide](dream/objects.md) explains composition and scale, [worlds](dream/worlds.md) covers layout and modules, and [behavior](dream/behavior.md) covers interaction and destruction.

For a provider integration, use the [model instructions](dream-v2-model.txt), [command export](dream-v2-contract.json) and [generation/repair guide](dream/model-authoring.md). The command export is generated from the parser table. [The EBNF](dream-v2.ebnf) describes structural syntax; the compiler enforces contexts, references and geometry budgets.

## Version policy

Dream 2 fixes existing field meanings, units, scopes and identity paths. Compatible additions require allowlisted fields, bounds, runnable examples, updated docs and regression coverage. Regenerate the command export with `node scripts/dream.mjs contract`. Changing existing syntax, units or identity semantics requires a new major authoring version. Unknown fields keep failing.

Dream 1 remains supported through the same compiler. See [the compatibility guide](dream-v1.md). Dream source versions, Object DSL versions and Scene versions describe separate contracts. The complete live world is Dream 2; the older TypeScript fixtures remain for regression tests.

Urban districts use bounded `street`, `surface` and `marking` declarations. They link through the same closed module registry as assets and placements. See [streets, grounds and paint](dream/worlds.md#streets-grounds-and-paint), the [reference bounds](dream/reference.md#urban-ground-bounds) and the [runnable neighborhood](examples/planned-neighborhood.dream).
