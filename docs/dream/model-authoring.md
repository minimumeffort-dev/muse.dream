# Generate and repair Dream

[Docs](../README.md) / Model authoring

Dream 2 gives a model a finite language for proposing the world suggested by a paper sketch. Its regular records, stable IDs and located diagnostics support a generation-and-repair loop. The real Muse provider isn't connected yet; the current examples and world are handmade mocks.

![The intended input and implemented compiler pipeline](../media/pipeline.svg)

## Give the model the contract

Supply [dream-v2-model.txt](../dream-v2-model.txt), the [generated command contract](../dream-v2-contract.json), a small relevant example and the existing revision's stable IDs. Supply a closed module registry when imports are needed. Include the sketch's intended objects and relationships without asking the model to choose arbitrary code or shaders.

The output is one complete source file beginning with `dream 2;`, without a Markdown wrapper. References use IDs. Labels are display text. Every new object declares `measure`, a separate body and bounded visual parts. Unsupported intent belongs in an explicit `unresolved` declaration instead of an invented command.

## Validate before applying

1. Parse the source and resolve references inside the compiler's vocabulary.
2. Expand bounded components/repeats into Object DSL data and validate it.
3. Merge the supplied modules and check project budgets and unique world IDs.
4. For a complete world, validate road, spawn, checkpoint, landscape and route clearance using `compileDreamScene`.
5. Accept a complete valid scene at a simulation boundary. Keep host-owned identity and source hash outside generated source.

`compileDreamWorld` performs structural compilation. It doesn't certify playability on its own. `checkDream` adds playability checks when the source contains a full layout; object libraries can be checked without inventing a racing world.

## Return a specific repair

A failure has `code`, `line`, `column`, `path` and `message`, with `expected` choices when available. Imported failures also identify the source `module`. The current checker returns the first error, never a partial world. Keep unaffected IDs and send a corrected complete file.

The CLI prints machine-readable stdout and exits 0 on success or 1 on failure:

```sh
node scripts/dream.mjs check file.dream
node scripts/dream.mjs format file.dream
node scripts/dream.mjs migrate file.dream
node scripts/dream.mjs contract
```

`format` canonicalizes spelling, field order and expression formatting; it doesn't fix semantic errors. `migrate` validates both sides when moving Dream 1 source to Dream 2. Both accept `--write` for atomic file replacement. The compiler's `syntaxTokens` count is a lexer count, not a model-token or cost measurement.

## Keep the engine boundary

Source cannot set scene provenance, API credentials, arbitrary URLs, callbacks or executable modules. The host chooses the model, supplies module text, checks freshness and owns the active scene revision. A future rescan flow still needs capture, interpretation, preview and atomic apply; those interfaces aren't implemented by the language compiler alone.

No Muse generation accuracy, latency, tokenizer efficiency or repair success rate is claimed. Current evidence covers the mock corpus, mutations, canonical round trips, validation, simulation and browser rendering.

[Compiler APIs and diagnostics](reference.md) · [Version policy](../dream-language.md)
