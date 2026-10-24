/* GBF v2.2: read-only prototype and pagination event survey */
(()=>{try{
const v=window.Game?.view;if(!v)throw Error("Open weapon inventory first");
const safe=/token|secret|auth|cookie|session|password|credential|csrf|email|phone|address|nonce|private/i;
const targets=[["Game.view",v],["Game.view.sortSettingSubView",v.sortSettingSubView],["Game.view.listItemParams",v.listItemParams]];
const rows=[];
for(const [name,obj]of targets){if(!obj||typeof obj!=="object")continue;let cur=obj;
for(let level=0;cur&&level<5;level++,cur=Object.getPrototypeOf(cur)){
const descriptors=Object.getOwnPropertyDescriptors(cur),entries=[];
for(const [k,d]of Object.entries(descriptors)){if(safe.test(k))continue;if(typeof d.value==="function")entries.push({name:k,arity:d.value.length});else if(level===0&&/page|list|item|data|model|pagination|sort|filter|url|endpoint|collection/i.test(k))entries.push({name:k,kind:Array.isArray(d.value)?"array":typeof d.value,length:Array.isArray(d.value)?d.value.length:undefined})}
rows.push({target:name,prototypeLevel:level,constructorName:level?Object.getOwnPropertyDescriptor(cur,"constructor")?.value?.name||null:null,entries:entries.slice(0,220)})
}}
const out={schema:"gbf-account-exporter/prototype-probe-v2.2",visibleItems:Array.isArray(v.listItemParams?.item)?v.listItemParams.item.length:null,rows,notes:["Read-only inspection. No function invocation, navigation, network requests or inventory mutation.","Function names and arities only. No function bodies, URLs, credentials or item records."]};
const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-prototype-probe-v2.2.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v2.2 complete: "+rows.length+" prototype layers. JSON saved.");
}catch(e){alert("GBF v2.2: "+e.message)}})();