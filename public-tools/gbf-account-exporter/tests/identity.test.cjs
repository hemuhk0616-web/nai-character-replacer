const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
// Break caught: replacing exact master-ID lookup with artwork-ID lookup or English-as-Japanese fallback.
const target = path.join(__dirname, '../identity-catalogue.js');
const catalogue = () => fs.existsSync(target) ? require(target) : null;
test('exact master ID resolves Japanese weapon without altering artwork or instance', () => {
  const api = catalogue(); assert.ok(api, 'identity catalogue is available');
  const row = {master_id:'1040311800',instance_id:'99',image_id:'1040311800_99'};
  api.enrichRow(row, 'weapons');
  assert.equal(row.name_ja, 'ソル・レムナント'); assert.equal(row.name_language,'ja');
  assert.equal(row.image_id,'1040311800_99'); assert.equal(row.instance_id,'99');
});
test('owned arcarum 5-star ID resolves without changing original master ID', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'2040313000'};api.enrichRow(row,'summons');
  assert.equal(row.name_en,'Justice (SSR)');assert.equal(row.master_id,'2040313000');
  assert.equal(row.identity_status,'external_id_match');
});
test('unknown master remains unresolved and never resolves using artwork', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'9999999999',image_id:'1040311800'};api.enrichRow(row,'weapons');
  assert.equal(row.name,null);assert.equal(row.identity_status,'unresolved');
});
test('native names have precedence over external catalogue', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'1040311800',raw:{master:{name:'ゲーム原文'}}};api.enrichRow(row,'weapons');
  assert.equal(row.name,'ゲーム原文');assert.equal(row.identity_status,'game_response');
});
test('gift item_name uses the native Japanese name rather than English fallback', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'2040020000',raw:{item_name:'ティアマト・マグナ'}};api.enrichRow(row,'summons');
  assert.equal(row.name,'ティアマト・マグナ');assert.equal(row.name_ja,'ティアマト・マグナ');
  assert.equal(row.identity_status,'game_response');
});
test('English fallback retains its language and does not invent Japanese series', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'2040020000'};api.enrichRow(row,'summons');
  assert.equal(row.name_en,'Tiamat Omega');assert.equal(row.name_ja,null);
  assert.equal(row.name_language,'en');assert.equal(row.series_ja,null);
});
test('enriches every account lane and calculates unresolved counts', () => {
  const api=catalogue();assert.ok(api);
  const report={sections:{weapons:{items:[{master_id:'1040311800'}]},weapon_storage:{items:[{master_id:'9999999999'}]},giftbox_summons:{items:[{master_id:'2040020000'}]},characters:{items:[{master_id:'3040035000'}]}}};
  api.enrichReport(report);assert.equal(report.sections.giftbox_summons.items[0].name_en,'Tiamat Omega');
  assert.equal(report.identity_coverage.total,4);assert.equal(report.identity_coverage.named,3);
  assert.equal(report.identity_coverage.unresolved,1);
});
test('duplicate master IDs do not choose a transformation name without form evidence', () => {
  const api=catalogue();assert.ok(api);
  const row={master_id:'3040377000'};api.enrichRow(row,'characters');
  assert.equal(row.name_en,'Cidala');
  assert.ok(row.identity_aliases_en.includes('Cidala (Super Cidala)'));
});
