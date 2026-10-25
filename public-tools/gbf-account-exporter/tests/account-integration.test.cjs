const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../account-exporter-v4.js'),'utf8');
function run(withCatalogue){
 const requests=[],downloads=[];const element=()=>({style:{},append(){},appendChild(){},remove(){},attachShadow(){return this},click(){if(this.download)downloads.push(this.download)}});
 const rows={weapon:{param:{id:'123',image_id:'1040311800_99',level:'1'},master:{id:'1040311800',rarity:'4'}},summon:{param:{id:'456',image_id:'2040020000_04'},master:{id:'2040020000',rarity:'4'}},npc:{param:{id:'789'},master:{id:'3040035000',rarity:'4'}}};
 const view={selected_item:'weapon',page:'1',page_num:1,on(){},off(){},listenToOnce(m,n,h){m.on(n,()=>h.call(this,m))},item_render(){},weapon_pre_render(){this.selected_item='weapon';this.page='1';this.setListModel()},summon_pre_render(){this.selected_item='summon';this.page='1';this.setListModel()},npc_pre_render(){this.selected_item='npc';this.page='1';this.setListModel()},setListModel(){requests.push(this.selected_item);const events={};const body={list:[rows[this.selected_item]],last:1,options:{number:1}};const m={on(n,f){(events[n]??=new Set()).add(f)},off(n,f){events[n]?.delete(f)},toJSON(){return body}};this.listenToOnce(m,'sync',this.item_render);setTimeout(()=>{for(const f of [...events.sync])f(m)},0)}};
 const c={window:null,location:{hostname:'gbf.game.mbga.jp',origin:'https://gbf.game.mbga.jp',hash:'#list/0/1/0/1'},Game:{view},document:{getElementById(){return null},querySelectorAll(){return[]},createElement:element,body:{appendChild(){}},head:{appendChild(x){setTimeout(()=>x.onerror?.(),0)}}},sessionStorage:{getItem(){return null},setItem(){}},URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},Blob,console,Date,Map,Set,WeakSet,JSON,Object,Array,Number,String,RegExp,Error,Promise,setTimeout:(fn,ms)=>setTimeout(fn,ms>=10000?30:0),clearTimeout};c.window=c;if(withCatalogue)c.GBFIdentityCatalogue=require('../identity-catalogue.js');vm.createContext(c);vm.runInContext(source,c);return{c,requests,downloads,get api(){return c.__GBF_ACCOUNT_EXPORTER_V4__}};
}
test('final account file contains names and explicit skipped saved-party scope',async()=>{
 const e=run(true);await e.api.done;const r=e.api.report;
 assert.equal(r.sections.weapons.items[0].name_ja,'ソル・レムナント');
 assert.equal(r.sections.summons.items[0].name_en,'Tiamat Omega');
 assert.equal(r.identity_coverage.named,3);assert.ok(r.excluded_scopes.includes('all_saved_parties'));
 assert.equal(e.downloads.length,1);assert.equal(r.sections.weapons.items[0].image_id,'1040311800_99');
});
test('catalogue load failure preserves equipment and still downloads the report',async()=>{
 const e=run(false);await e.api.done;const r=e.api.report;
 assert.equal(r.sections.weapons.items.length,1);assert.equal(r.sections.characters.items.length,1);
 assert.equal(r.identity_coverage.status,'unavailable');assert.equal(e.downloads.length,1);
});
