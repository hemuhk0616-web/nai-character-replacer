# Account and materials exports

- `setup-v4.html`: existing account bookmark. V4.4 adds identity enrichment to inventory, storage, unclaimed gifts and current-party references. IDs, original flags and source records remain intact. Full saved-party discovery is explicitly excluded.
- `setup-materials.html`: separate bookmark for three native item lists. No item use, claiming, transfer, sale, recycling or exchange calls.
- `identity-data.json`: public ID/name facts. Japanese source labels and English names are stored separately; no translation of lookup tags. Known Arcarum ID aliases are explicit and attributed. Names are an external ID match, not a verified equipment recommendation.
- `identity-catalogue.js`: generated browser bundle; `identity-runtime.js` is its editable runtime. Run `python build-identity.py DATABASE_JSON MOTOCAL_ARMS_JSON MOTOCAL_CHARACTERS_JSON` after changing inputs/runtime.

## Tests

`node --test public-tools/gbf-account-exporter/tests/*.test.cjs`

Live game/Android Quetta verification is separate from mock and Chromium tests. Materials `complete` covers only the three observed native-list responses, not every currency, gift, wonder or skypiece.

## Public sources

- Provided `gbf_database_2026-10-25.json` export: English name/ID facts, dated 2026-10-25; game/wiki names may differ across forms.
- https://github.com/MotocalDevelopers/motocal/blob/master/armData.json
- https://github.com/MotocalDevelopers/motocal/blob/master/charaData.json
- https://gbf.wiki/Module:Turtleli (`fix_arcarum_id` aliases).
- https://prd-game-a-gbf.akamaized.net/assets/js/view/item/index.js (read-only list paths and fields, observed 2026-10-25).

The source repository must never contain account export files or real player material inventories. All processing and downloads occur locally in the browser.
