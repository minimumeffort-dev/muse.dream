# Public documentation links

2026-10-16. Removed ten localhost links from the README and five documentation pages. Public links now open the hosted game, asset atlas, proportion image, vehicle video, destruction video or local-development setup guide. Development-only inspection URLs remain copyable code, with the server requirement stated explicitly; they are not presented as public destinations.

The generated-site regression checks every href/src across all 22 published HTML pages and rejects localhost/subdomains, 127/8, 0.0.0.0 and IPv6 loopback destinations. It failed against the original published links, then passed after their correction. Relative documentation and media targets are still checked for existence. The docs index also now reports the current 83 assemblies.

Checks run:

- `npm test -- tests/docs-site.test.ts tests/docs.test.ts --maxWorkers=1 --testTimeout=60000`: 36 tests passed.
- `npm run docs:build`: 22 pages built.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

README, affected guides and media references were reviewed. Existing asset screenshots, game recordings and syntax-highlighting captures remain accurate: this edit changes documentation destinations and local setup text, with no rendering, asset, DSL or simulation changes. The simulation suite was not rerun locally for this documentation-only edit; the push workflow runs it before publishing.
