/* GBF weapon metadata probe v3.1 - read only */
(()=>{try{
const v=window.Game?.view;
if(!v||v.selected_item!=="weapon")throw Error("Open weapon inventory first");
const arr=v.change_list;
if(!Array.isArray(arr)||!arr.length)throw Error("Weapon list data unavailable");
const safe=(obj,depth=0)=>{if(obj==null||typeof obj!=="object")return obj;if(depth>2)return "[nested]";if(Array.isArray(obj))return {type:"array",length:obj.length,sample:obj.slice(0,2).map(x=>safe(x,depth+1))};const out={};for(const [k,val] of Object.entries(obj)){if(/token|session|auth|cookie|password|user|account|profile|owner/i.test(k))continue;if(typeof val==="function")continue;if(val&&typeof val==="object")out[k]=depth<2?safe(val,depth+1):"[nested]";else if(typeof val==="string")out[k]=val.slice(0,180);else out[k]=val;}return out};
const items=arr.slice(0,3).map((x,i)=>({index:i,topLevelKeys:Object.keys(x||{}),master:safe(x?.master),paramKeys:Object.keys(x?.param||{}),paramSelected:{id:x?.param?.id,image_id:x?.param?.image_id},otherFields:Object.fromEntries(Object.entries(x||{}).filter(([k])=>!["param","master"].includes(k)).map(([k,val])=>[k,safe(val)]))}));
const out={schema:"gbf-account-exporter/metadata-probe-v3.1",page:v.page,sampleCount:items.length,items};
const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gbf-metadata-probe-v3.1.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v3.1: saved "+items.length+" weapon samples");
}catch(e){alert("GBF v3.1: "+e.message)}})();