# GBF identity and materials export

User-requested scope: keep account export, add readable item/character names, provide a separate materials bookmark. Full saved-party export is explicitly skipped. Disposal-advisor work remains the next consumer of these exports.

## Design

- Keep existing instance/master/image IDs intact. Enrich inventory, storage, gifts, jobs and existing party references with names matched by exact master ID.
- Prefer game response names; use attributed public Japanese/English names otherwise. Never translate English search tags into presumed Japanese names. Explicitly report unknown names, language, provenance and coverage.
- Load only public catalogue data from GitHub Pages; no account rows or identifiers are transmitted. Catalogue failure must not erase collected equipment.
- Materials are independent: fetch the three read-only item-list routes observed in the current public game `view/item/index.js`: `item/article_list_by_filter_mode`, `item/recovery_and_evolution_list_by_filter_mode`, `item/gacha_ticket_and_others_list_by_filter_mode`.
- Export normalized item ID, kind, name, amount/number, source group and location. Preserve unknown quantity as null and group path to disambiguate namespaces. Never sum quantities across groups.
- Retain raw sanitized response and completeness diagnostics; no use, receive, recycle, sell, change-job, change-deck, or exchange operations.
- Separate setup page copies the materials bookmark. Both exports stay browser-local and download a JSON file.

## Tasks

- [x] 1. Catalogue and identity tests: exact IDs, language honesty, special summon aliases, unresolved handling, native precedence.
- [x] 2. Integrate enrichment into V4.4; preserve 18 legacy collector regression tests and data counts. Mark full-party export as intentionally excluded.
- [x] 3. Materials export: nested arrays, treasure amount versus number, duplicate ID namespaces, unexpected payload, timeouts, cancellation, unsupported host, no overlapping account collector.
- [ ] 4. Mobile setup page and browser tests; whole-change review; publish scoped exporter files to the existing repository.

## Review focus

- Catalogue fetch unavailable: all account data remains downloadable.
- Same material ID with different item kinds: both remain separate.
- Form/uncap artwork IDs: never substitute image IDs for master IDs.
- Zero quantity is data; missing quantity is unknown.
- No account data, personal JSON, or diagnostic tokens published in the source repository.

## Progress

Baseline: legacy collector tests 18/18 pass. Dedicated clean repository clone at `repo/`, feature branch. User explicitly requests these concrete exporter additions; routine implementation choices are made inline.

Verification: 20 new tests pass; 18 pre-existing collector regression tests pass against V4.4 (saved-party catalogue expectation intentionally updated to skipped_by_user). Actual account enrichment resolves 2,538/2,538 records including jobs and gifts; 1,474 have Japanese names, 1,064 English fallback. No live account material response has been tested.

Fresh reviewer found two important issues, both fixed with failing-then-passing regression tests: duplicate master IDs no longer select a transformation page name without form evidence; material raw data filters duplicate/api/access/private/signing keys. Chromium verifies three material GET routes, normalized amount/number, JSON download, both setup pages at 320/390/480px and clipboard fallback; zero page errors. Live Quetta material responses remain unverified.
