/* GBF v0.6: local read-only item field inspection */
(()=>{try{
const v=window.Game?.view,items=v?.listItemParams?.item||[];
const keys=x=>x&&typeof x==="object"?Object.keys(x).slice(0,40):[];
const shape=x=>({type:Array.isArray(x)?"array":typeof x,keys:keys(x),length:Array.isArray(x)?x.length:undefined});
const first=items[0]||{};
const report={schema:"gbf-account-exporter/diagnostic-v0.6",itemCount:items.length,firstItem:shape(first),param:shape(first.param),master:shape(first.master),used:shape(first.is_used),excluded:shape(first.is_exclude),contentDataType:typeof v?.content_model?.attributes?.data,viewPage:v?.page,viewActiveTab:v?.active_tab,note:"Field names and types only; no item values or credentials."};
const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-diagnostic-v0.6.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v0.6 ready");
}catch(e){alert("GBF v0.6 error: "+e.message)}})();