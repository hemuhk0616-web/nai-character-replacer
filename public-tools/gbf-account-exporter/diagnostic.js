/* GBF v2.0: read-only extraction of memory-cached weapons */
(()=>{try{
const v=window.Game?.view;if(!v)throw Error("Open weapon inventory");
const safe=(o,k)=>{try{const d=Object.getOwnPropertyDescriptor(o,k);return d&&"value"in d?d.value:undefined}catch{return undefined}};
const num=x=>x==null||x===""?null:Number.isFinite(Number(x))?Number(x):null;
const str=x=>x==null?null:String(x);
const getId=x=>{const p=x&&safe(x,"param");const id=p&&safe(p,"id");return id==null?null:String(id)};
const sources=[],byId=new Map();
const add=(path,arr)=>{if(!Array.isArray(arr))return;let valid=0;for(const item of arr){const id=getId(item);if(!id)continue;valid++;if(!byId.has(id)){const p=item.param||{},m=item.master||{};byId.set(id,{weapon_id:str(m.id),instance_id:id,image_id:str(p.image_id),level:num(p.level),attack:num(p.attack),hp:num(p.hp),bonus_attack:num(p.bonus_attack),bonus_hp:num(p.bonus_hp),skill_level:num(p.skill_level),evolution:num(p.evolution),phase:num(p.phase),rarity:num(m.rarity),is_locked:[true,1,"1"].includes(p.is_locked),is_used:[true,1,"1"].includes(item.is_used)})}}if(valid)sources.push({path,items:arr.length,validIds:valid})};
add("Game.view.listItemParams.item",v.listItemParams?.item);add("Game.view.change_list",v.change_list);
const ls=v._listeners;if(ls&&typeof ls==="object")for(const [k,l]of Object.entries(ls))add("Game.view._listeners."+k+".attributes.list",l?.attributes?.list);
const models=[["Game.view.content_model",v.content_model],["Game.view.container_list_model",v.container_list_model],["Game.view.listArtifactView",v.listArtifactView]];
for(const [path,m]of models)if(m&&typeof m==="object")for(const k of Object.keys(m).slice(0,80)){const a=safe(m,k);add(path+"."+k,a);if(a&&typeof a==="object"&&!Array.isArray(a))for(const kk of Object.keys(a).slice(0,70))add(path+"."+k+"."+kk,safe(a,kk))}
const out={schema:"gbf-account-exporter/memory-extract-v2.0",currentPage:v.page??null,uniqueCount:byId.size,sourceCount:sources.length,sources,weapons:[...byId.values()],notes:["Memory-only snapshot. May include stale cached records.","Do not treat as a complete current inventory without validation."]};
const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-memory-extract-v2.0.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
alert("GBF v2.0: "+out.uniqueCount+" unique cached weapons exported. This may not be the full inventory.");
}catch(e){alert("GBF v2.0: "+e.message)}})();