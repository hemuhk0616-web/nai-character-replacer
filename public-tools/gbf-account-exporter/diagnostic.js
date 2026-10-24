/* GBF v0.5: structural diagnostics only */
(()=>{try{
const v=window.Game?.view;
const keys=x=>x&&typeof x==="object"?Object.keys(x).slice(0,60):[];
const shape=x=>({type:Array.isArray(x)?"array":typeof x,keys:keys(x),length:Array.isArray(x)?x.length:undefined});
const m=v?.container_list_model,p=v?.listItemParams,c=v?.content_model?.attributes,d=c?.display_list;
const report={schema:"gbf-account-exporter/diagnostic-v0.5",viewKeys:keys(v),container:shape(m),containerAttributes:shape(m?.attributes),containerModels:shape(m?.models),listItems:shape(p?.item),firstItem:shape(p?.item?.[0]),contentData:shape(c?.data),displayList:shape(d),firstDisplayEntry:shape(d?.[Object.keys(d||{})[0]])};
const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-diagnostic-v0.5.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v0.5 ready");
}catch(e){alert("GBF v0.5 error: "+e.message)}})();