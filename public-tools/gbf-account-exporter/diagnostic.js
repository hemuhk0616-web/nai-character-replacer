/* GBF v2.3 - targeted function inspection; no invocation */
(()=>{try{
const v=window.Game?.view;if(!v)throw Error("Open weapon list");
const names=["pagination","location_href","setListModel","item_render","weapon_pre_render","updateHash"];
const out={schema:"gbf-account-exporter/function-inspection-v2.3",page:String(v.page??""),page_num:typeof v.page_num==="number"?v.page_num:null,visibleItems:Array.isArray(v.listItemParams?.item)?v.listItemParams.item.length:null,functions:[]};
for(const name of names){let p=v,fn;while(p){const d=Object.getOwnPropertyDescriptor(p,name);if(d){if(typeof d.value==="function")fn=d.value;break}p=Object.getPrototypeOf(p)}if(!fn)continue;const src=Function.prototype.toString.call(fn);out.functions.push({name,arity:fn.length,source:src.length<=14000?src:src.slice(0,14000)+" [TRUNCATED]",sourceLength:src.length})}
const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gbf-function-inspection-v2.3.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v2.3 complete. JSON saved.");
}catch(e){alert("GBF v2.3: "+e.message)}})();