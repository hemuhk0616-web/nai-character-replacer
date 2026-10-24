/* GBF v0.9: read-only weapon collector across manually visited pages */
(()=>{try{
const v=window.Game?.view,items=v?.listItemParams?.item||[];
const num=x=>typeof x==="number"&&Number.isFinite(x)?x:typeof x==="string"&&x.trim()!==""&&Number.isFinite(Number(x))?Number(x):null;
const id=x=>typeof x==="string"||typeof x==="number"?String(x):null;
const rows=items.map((item,index)=>{const p=item?.param||{},m=item?.master||{};return{index,weapon_id:id(m.id),instance_id:id(p.id),image_id:id(p.image_id),level:num(p.level),attack:num(p.attack),hp:num(p.hp),bonus_attack:num(p.bonus_attack),bonus_hp:num(p.bonus_hp),skill_level:num(p.skill_level),evolution:num(p.evolution),phase:num(p.phase),rarity:num(m.rarity),is_locked:p.is_locked===true||p.is_locked===1||p.is_locked==="1",is_used:item.is_used===true}});
const key="gbf-weapon-collector-v0.9",old=JSON.parse(sessionStorage.getItem(key)||"{}"),byId=old.weapons||{};
for(const row of rows){if(row.instance_id)byId[row.instance_id]=row}
const pages=old.pages||{};pages[String(v?.page??"?")]=rows.length;
const data={schema:"gbf-account-exporter/weapons-collection-v0.9",createdAt:new Date().toISOString(),pages,uniqueCount:Object.keys(byId).length,weapons:Object.values(byId),note:"Read-only collection of pages where bookmark was run. Stored only in this browser tab session; no server requests."};
sessionStorage.setItem(key,JSON.stringify({pages,weapons:byId}));
const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-weapons-collected-v0.9.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v0.9: "+rows.length+" this page, "+data.uniqueCount+" total. Open next page and run again.");
}catch(e){alert("GBF v0.9 error: "+e.message)}})();