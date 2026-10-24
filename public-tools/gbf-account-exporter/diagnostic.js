/* GBF Account Exporter v0.8: visible page weapon export with numeric-string support */
(()=>{try{
const v=window.Game?.view,items=v?.listItemParams?.item||[];
const num=x=>typeof x==="number"&&Number.isFinite(x)?x:typeof x==="string"&&x.trim()!==""&&Number.isFinite(Number(x))?Number(x):null;
const id=x=>typeof x==="string"||typeof x==="number"?String(x):null;
const rows=items.map((item,index)=>{const p=item?.param||{},m=item?.master||{};return{index,weapon_id:id(m.id),instance_id:id(p.id),image_id:id(p.image_id),level:num(p.level),attack:num(p.attack),hp:num(p.hp),bonus_attack:num(p.bonus_attack),bonus_hp:num(p.bonus_hp),skill_level:num(p.skill_level),evolution:num(p.evolution),phase:num(p.phase),rarity:num(m.rarity),is_locked:p.is_locked===true||p.is_locked===1||p.is_locked==="1",is_used:item.is_used===true}});
const report={schema:"gbf-account-exporter/weapons-page-v0.8",createdAt:new Date().toISOString(),page:num(v?.page),count:rows.length,weapons:rows,note:"Only current page in memory; local download; no network requests."};
const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-weapons-page-v0.8.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v0.8 saved "+rows.length+" items");
}catch(e){alert("GBF v0.8 error: "+e.message)}})();