# One rule, every table

[Docs](../README.md) / Shared rules

If a wooden table breaks when a car hits it, the next table should behave the
same way. Its shape, size and location can change. The rule stays shared.

```dream
rule wooden_tables(kind=table,mode=break(speed=90,scatter=62,lift=100,spin=4,lifetime=6,pattern=splinter));
```

Put this in the entry file. Every object with `measure(kind=table,...)` receives
that impact behavior, including objects imported from other modules. Change the
threshold or release motion once and recompile the whole world.

The compiler applies the rule before validating each assembly. It replaces
matching per-object impact settings, so an imported variant cannot quietly
keep a different threshold or become indestructible. The serialized scene keeps
the rules too; validation rejects a placement whose behavior contradicts them.

![A square table releasing five pieces](../media/rule-square-table.jpg)

![A round table releasing two pieces under the same rule](../media/rule-round-table.jpg)

Both examples use the same threshold and splinter motion. The square table has
a top and four legs; the round table has a top and a pedestal. Their fragment
construction stays in their own object definitions. These are native fixed-step
review captures with the measured town car.

Copy the complete [two-table example](../examples/interaction-rules.dream).
Neither table needs its own `impact` declaration. A gentle touch leaves both
intact; sufficient closing speed breaks the table that was hit. Damage belongs
to each placement, so hitting one does not destroy the other. R preserves
damage and Start over restores the world.

## Benches and retained supports

The live world declares a second rule for `kind=bench`:

```dream
rule wooden_benches(kind=bench,mode=break(speed=95,scatter=65,lift=65,spin=4,lifetime=6,pattern=splinter));
```

For assemblies with existing break zones, a `break` rule supplies the parameters
to every zone. The retained structure keeps its own contacts. The older Wayside
bench now releases eight wooden board/armrest groups, with bolts travelling
with their back boards. Its foundation and supports remain. The slatted park
bench keeps its existing seven-piece construction under the same bench rule.

![The Wayside bench loses its boards while its supports stay put](../media/rule-supported-bench.jpg)

## The contract

- Selectors use the existing `measure.kind` category. Labels, coordinates and
  random seeds do not select physics. Renaming a table does not change its rule.
- At most 16 rules, with one owner per category. Rules belong in the entry
  file; included modules cannot override them.
- Modes are the existing bounded `break(...)`, `topple(...)` and `bounce(...)`
  constructors. For an existing break zone, only a `break` rule is compatible.
- Bodies, foundations, seats, animation and fragment grouping must remain
  compatible with the resulting impact. The compiler rejects incompatible
  models instead of discarding their construction.
- All 24 reactive-object, eight-fragment-per-assembly and 128 potential scene
  fragment limits still apply. A rule is not a way around those budgets.

The live world currently shares rules for tables and benches. Other categories
retain their authored behaviors until a rule is declared for them. Legacy
objects without a semantic category are not guessed from their names.
`kind=custom` is a single category, so a custom rule would affect every custom
object; it cannot distinguish bread, rocks and balls. More specific semantic
categories can be added as the language grows.

This is a bounded interaction policy, not a general scripting language or a
materials/structural solver. The engine still owns contacts and execution.
Mock-only. [Checks and media audit](../evidence/interaction-rules/verification.md).
