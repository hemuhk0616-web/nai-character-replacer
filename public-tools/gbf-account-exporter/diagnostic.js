/* GBF v2.5: sequential two-page native data collection */
(()=>{try{
const v=window.Game?.view;if(!v||v.selected_item!=="weapon")throw Error("Open weapon inventory");
const start=Number(v.page),count=2;if(!Number.isInteger(start)||start<1)throw Error("Invalid page");
if(!confirm("GBF v2.5: Read current page "+start+" and next "+count+" pages, sequentially? Existing saved data will not be changed."))return;
const snap=(page)=>({page,items:(v.change_list||[]).map(x=>{const p=x?.param||{},m=x?.master||{};return{instance_id:p.id==null?null:String(p.id),weapon_id:m.id==null?null:String(m.id),image_id:p.image_id??null,level:p.level??null,skill_level:p.skill_level??null,evolution:p.evolution??null,phase:p.phase??null,attack:p.attack??null,hp:p.hp??null,master_name:m.name??null}})});
const pages=[snap(start)];let index=0,done=false,timeout=null;
const save=(error)=>{if(done)return;done=true;v.off("xhrEnd",handler);if(timeout)clearTimeout(timeout);
const all=pages.flatMap(p=>p.items),ids=all.map(x=>x.instance_id).filter(Boolean);
const report={schema:"gbf-account-exporter/sequential-pages-v2.5",startPage:start,requestedAdditionalPages:count,capturedPages:pages.map(p=>({page:p.page,items:p.items.length,uniqueIds:new Set(p.items.map(x=>x.instance_id).filter(Boolean)).size})),totalRecords:all.length,uniqueInstanceIds:new Set(ids).size,finalPage:v.page,error:error||null,pages};
const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-sequential-pages-v2.5.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v2.5: "+pages.length+" pages captured; "+report.uniqueInstanceIds+" unique IDs. JSON saved.")};
const handler=()=>{if(done)return;if(timeout){clearTimeout(timeout);timeout=null}
const expected=start+index+1;if(Number(v.page)!==expected){save("Unexpected page: "+v.page);return}
pages.push(snap(expected));index++;if(index>=count){save(null);return}setTimeout(advance,450)};
const advance=()=>{if(done)return;const target=start+index+1;v.page=String(target);v.on("xhrEnd",handler);timeout=setTimeout(()=>save("Timed out waiting for page "+target),12000);try{v.setListModel()}catch(e){save("setListModel error: "+e.message)}};
advance();
}catch(e){alert("GBF v2.5: "+e.message)}})();