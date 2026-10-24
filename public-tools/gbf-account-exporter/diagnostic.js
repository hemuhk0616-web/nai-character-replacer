/* GBF v2.4: one-page controlled test using native pagination */
(()=>{try{
const v=window.Game?.view;if(!v||v.selected_item!=="weapon")throw Error("Open weapon inventory");
const current=Number(v.page);if(!Number.isInteger(current)||current<1)throw Error("Invalid current page");
const next=current+1;
if(!confirm("GBF v2.4: Move from page "+current+" to "+next+" using the game's native pagination? One page only."))return;
const before=new Set((v.change_list||[]).map(x=>String(x?.param?.id||"")).filter(Boolean));
let finished=false;
const onEnd=()=>{if(finished)return;finished=true;v.off("xhrEnd",onEnd);const arr=Array.isArray(v.change_list)?v.change_list:[];const ids=arr.map(x=>String(x?.param?.id||"")).filter(Boolean);const report={schema:"gbf-account-exporter/native-pagination-test-v2.4",beforePage:current,afterPage:String(v.page),count:arr.length,uniqueIds:new Set(ids).size,overlapWithPrevious:ids.filter(id=>before.has(id)).length,newVsPrevious:ids.filter(id=>!before.has(id)).length,success:Number(v.page)===next&&ids.some(id=>!before.has(id))};
const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-native-pagination-v2.4.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v2.4: page "+report.afterPage+", "+report.newVsPrevious+" different items. JSON saved.")};
v.on("xhrEnd",onEnd);
try{const el=document.createElement("span");el.setAttribute("page",String(next));v.pagination({currentTarget:el,stopPropagation(){},preventDefault(){}})}catch(err){v.off("xhrEnd",onEnd);throw err}
setTimeout(()=>{if(!finished){v.off("xhrEnd",onEnd);alert("GBF v2.4: no completion signal after 15 seconds. Check page visually.")}},15000);
}catch(e){alert("GBF v2.4: "+e.message)}})();