/* GBF Account Exporter v0.7: local visible-page weapon export */
(()=>{try{
const v=window.Game?.view,items=v?.listItemParams?.item||[];
const number=x=>typeof x==="number"&&Number.isFinite(x)?x:null;
const str=x=>typeof x==="string"?x:null;
const rows=items.map((item,index)=>{const p=item?.param||{},m=item?.master||{};return{index,weapon_id:str(m.id)||number(m.id),instance_id:str(p.id)||number(p.id),image_id:str(p.image_id)||number(p.image_id),level:number(p.level),attack:number(p.attack),hp:number(p.hp),skill_level:number(p.skill_level),evolution:number(p.evolution),phase:number(p.phase),rarity:str(m.rarity)||number(m.rarity),is_locked:typeof p.is_locked==="boolean"?p.is_locked:null,is_used:typeof item.is_used==="boolean"?item.is_used:null}});
const report={schema:"gbf-account-exporter/weapons-page-v0.7",createdAt:new Date().toISOString(),page:number(v?.page),active_tab:number(v?.active_tab),count:rows.length,weapons:rows,note:"Only current page in memory. Saved locally; no network requests."};
const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-weapons-page-v0.7.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v0.7 saved "+rows.length+" items");
}catch(e){alert("GBF v0.7 error: "+e.message)}})();