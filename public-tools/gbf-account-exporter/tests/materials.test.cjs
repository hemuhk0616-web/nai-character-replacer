const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const target=path.join(__dirname,'../materials-exporter-v1.js');
function parser(){return fs.existsSync(target)?require(target):null;}
// Break caught: using display num instead of possessed amount; merging different item namespaces.
test('treasure amount is owned quantity; display num is preserved separately',()=>{
  const api=parser();assert.ok(api,'materials exporter exists');
  const out=api.extract([{item_id:'1',name:'碧空の結晶',amount:'123',num:'5'}],'treasures');
  assert.equal(out.items[0].quantity,123);assert.equal(out.items[0].display_num,'5');
  assert.equal(out.items[0].name,'碧空の結晶');assert.equal(out.items[0].item_kind_id,'10');
});
test('same item ID in separate kinds and source groups is never merged',()=>{
  const api=parser();assert.ok(api);
  const out=api.extract([[{item_id:'1',item_kind_id:4,name:'エリクシール',number:'0'}],[{item_id:'1',item_kind_id:10,name:'別の素材',number:'5'}]],'items');
  assert.equal(out.items.length,2);assert.equal(out.items[0].quantity,0);assert.equal(out.items[1].quantity,5);
  assert.notEqual(out.items[0].key,out.items[1].key);
});
test('missing or ambiguous quantity is null, not zero or one',()=>{
  const api=parser();assert.ok(api);
  const out=api.extract([{item_id:'1',name:'未確認'},{item_id:'2',name:'表示個数のみ',num:'9'},{item_id:'3',name:'大きな数',number:'9007199254740993'}],'treasures');
  assert.ok(out.items.every(x=>x.quantity===null));assert.equal(out.quantity_unknown_records,3);
});
test('invalid envelope and unknown leaves cannot be reported as complete',()=>{
  const api=parser();assert.ok(api);
  assert.throws(()=>api.extract({error:'rejected'},'treasures'));
  const out=api.extract([{new_id:'2',name:'未対応形式',amount:'8'}],'treasures');
  assert.equal(out.complete,false);assert.equal(out.unparsed_paths.length,1);
});
test('Backbone numeric-key object lists preserve all rows and nested groups',()=>{
 const api=parser();
 const out=api.extract({'0':{item_id:'1',name:'碧空の結晶',amount:'123'},'1':{item_id:'2',name:'素材',amount:'0'}},'treasures');
 assert.equal(out.items.length,2);assert.equal(out.items[0].quantity,123);assert.equal(out.items[1].quantity,0);assert.equal(out.complete,true);
 const nested=api.extract({'0':[{item_id:'1',name:'回復',number:'5'}],'1':{'0':[{item_id:'1',name:'育成',number:'2'}]}},'items');
 assert.equal(nested.items.length,2);assert.notEqual(nested.items[0].key,nested.items[1].key);
});
test('failed envelope retains sanitized raw response for diagnosis',async()=>{
 const e=run({badPayload:true});await e.api.done;
 assert.equal(e.api.report.sections.treasures.raw.error,'invalid');
});
test('material export sanitizes private fields while preserving material name and quantity',()=>{
  const api=parser();assert.ok(api);
  const out=api.extract([{item_id:'12',item_kind_id:10,name:'素材',amount:'8',secret_token:'NEVER_EXPORT',user_id:'PRIVATE',api_key:'SENSITIVE_KEY',duplicate_key:'SENSITIVE_KEY',access_key:'SENSITIVE_KEY',comment:'説明'}],'treasures');
  assert.equal(JSON.stringify(out).includes('NEVER_EXPORT'),false);assert.equal(JSON.stringify(out).includes('PRIVATE'),false);
  assert.equal(JSON.stringify(out).includes('SENSITIVE_KEY'),false);
  assert.equal(out.items[0].quantity,8);
});
function run(options={}){
 const requests=[],downloads=[],elements=[];let blob;
 const el=()=>({style:{},append(){},appendChild(){},remove(){},attachShadow(){return this},click(){if(this.download)downloads.push(this.download)}});
 const view={};const response={
  'item/article_list_by_filter_mode':[{item_id:'1',name:'碧空の結晶',amount:'123',num:'5'}],
  'item/recovery_and_evolution_list_by_filter_mode':[[{item_id:'1',item_kind_id:4,name:'エリクシール',number:'0'}],[[{item_id:'1',item_kind_id:11,name:'ヒヒイロカネ',number:'2'}]]],
  'item/gacha_ticket_and_others_list_by_filter_mode':[[{item_id:'1',item_kind_id:8,name:'ガチャチケット',number:'3'}],[]]
 };
 class Data{constructor(){this.events={}}on(n,f){(this.events[n]??=new Set()).add(f)}off(n,f){this.events[n]?.delete(f)}toJSON(){return this.body}fetch(){requests.push(this.urlRoot);if(options.timeout)return;setTimeout(()=>{if(options.error){for(const f of this.events.error??[])f(this,{status:500,statusText:'error'});return;}this.body=options.badPayload?{error:'invalid'}:response[this.urlRoot.replace('https://gbf.game.mbga.jp/','')];for(const f of this.events.sync??[])f(this)},0)}static extend(p){class Child extends this{}Object.assign(Child.prototype,p);return Child}}
 const c={window:null,globalThis:null,location:{hostname:options.host??'gbf.game.mbga.jp',origin:'https://gbf.game.mbga.jp',hash:'#item/0'},Game:{view,baseUri:'https://gbf.game.mbga.jp/'},document:{getElementById(){return null},createElement(){const x=el();elements.push(x);return x},body:{appendChild(){}}},sessionStorage:{setItem(){},getItem(){return null}},URL:class extends URL{static createObjectURL(b){blob=b;return 'blob:test'}static revokeObjectURL(){}},Blob,console,Date,Map,Set,WeakSet,JSON,Object,Array,Number,String,RegExp,Error,Promise,setTimeout:(fn,ms)=>setTimeout(fn,ms>=10000?30:0),clearTimeout};
 c.window=c;c.globalThis=c;c.requirejs=(ids,ok)=>setTimeout(()=>ok(Data),0);c.requirejs.s={contexts:{}};
 if(options.accountRunning)c.__GBF_ACCOUNT_EXPORTER_V4__={running:true};
 vm.createContext(c);if(fs.existsSync(target))vm.runInContext(fs.readFileSync(target,'utf8'),c);
 return{c,requests,downloads,elements,get api(){return c.__GBF_MATERIALS_EXPORTER_V1__},get blob(){return blob}};
}
test('one run reads all three native material lists and downloads a separate file',async()=>{
 const e=run();assert.ok(e.api);await e.api.done;
 assert.equal(e.requests.length,3);assert.ok(e.requests.every(x=>x.startsWith('https://gbf.game.mbga.jp/item/')));
 assert.equal(e.api.report.sections.treasures.items[0].name,'碧空の結晶');
 assert.equal(e.api.report.sections.treasures.items[0].quantity,123);
 assert.equal(e.api.report.sections.items.items.length,2);assert.equal(e.api.report.sections.tickets.items.length,1);
 assert.equal(e.api.report.status,'collected');assert.ok(e.downloads[0].startsWith('gbf-materials-v1-'));
});
test('host guard and active account collection send no material requests',async()=>{
 for(const options of [{host:'example.com'},{accountRunning:true}]){const e=run(options);assert.ok(e.api);await e.api.done;assert.equal(e.requests.length,0);assert.equal(e.api.report.status,'blocked')}
});
test('timeout preserves first section as partial and stops before further requests',async()=>{
 const e=run({timeout:true});assert.ok(e.api);await e.api.done;assert.equal(e.requests.length,1);assert.equal(e.api.report.status,'partial');assert.equal(e.api.requiresReload,true);
});
test('cancel during pending request does not load the next section',async()=>{
 const e=run({timeout:true});assert.ok(e.api);await new Promise(r=>setTimeout(r,5));e.api.stop();await e.api.done;assert.ok(e.requests.length<=1);assert.equal(e.api.report.status,'cancelled');
});
test('bad payload is not an empty success',async()=>{
 const e=run({badPayload:true});assert.ok(e.api);await e.api.done;assert.equal(e.api.report.status,'partial');assert.ok(e.api.report.sections.treasures.error);
});
