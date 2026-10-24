/* GBF v1.9: read-only comparison of cached weapon collections */
(()=>{try{
const g=window.Game,v=g?.view;if(!v)throw Error("Open weapon inventory");
const safe=(o,k)=>{try{const d=Object.getOwnPropertyDescriptor(o,k);return d&&"value"in d?d.value:undefined}catch{return undefined}};
const obj=x=>x!==null&&typeof x==="object";
const idOf=x=>{if(!obj(x))return null;const p=safe(x,"param");if(!obj(p))return null;const id=safe(p,"id");return id==null?null:String(id)};
const collections=[];
const add=(path,a)=>{if(!Array.isArray(a))return;const ids=a.map(idOf).filter(Boolean);if(!ids.length)return;collections.push({path,length:a.length,weaponIds:ids})};
add("Game.view.listItemParams.item",v.listItemParams?.item);
add("Game.view.change_list",v.change_list);
const listeners=v._listeners;if(obj(listeners))for(const [k,l]of Object.entries(listeners)){const a=l?.attributes?.list;add("Game.view._listeners."+k+".attributes.list",a)}
const models=[["Game.view.content_model",v.content_model],["Game.view.container_list_model",v.container_list_model],["Game.view.listArtifactView",v.listArtifactView]];
for(const [name,m]of models){if(!obj(m))continue;for(const k of Object.keys(m).slice(0,80)){const a=safe(m,k);add(name+"."+k,a);if(obj(a)&&!Array.isArray(a))for(const kk of Object.keys(a).slice(0,70))add(name+"."+k+"."+kk,safe(a,kk))}}
const base=new Set((v.listItemParams?.item||[]).map(idOf).filter(Boolean));
const all=new Set(),details=collections.map(c=>{const ids=new Set(c.weaponIds);for(const id of ids)all.add(id);return{path:c.path,arrayLength:c.length,uniqueIds:ids.size,overlapWithCurrent:[...ids].filter(x=>base.has(x)).length,newVsCurrent:[...ids].filter(x=>!base.has(x)).length,firstIdSuffixes:[...ids].slice(0,3).map(x=>x.slice(-4))}});
const out={schema:"gbf-account-exporter/cache-comparison-v1.9",currentPage:v.page??null,currentPageUnique:base.size,collectionsFound:details.length,distinctWeaponInstancesAcrossCollections:all.size,distinctNotOnCurrentPage:[...all].filter(x=>!base.has(x)).length,collections:details,notes:["Read-only inspection, no navigation or network requests.","Only counts and final four characters of three sample IDs per collection are exported."]};
const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-cache-comparison-v1.9.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
alert("GBF v1.9: "+out.distinctWeaponInstancesAcrossCollections+" distinct weapon instances across "+details.length+" lists. JSON saved.");
}catch(e){alert("GBF v1.9: "+e.message)}})();