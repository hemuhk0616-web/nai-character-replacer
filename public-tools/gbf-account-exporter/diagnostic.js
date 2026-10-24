/* GBF v1.1: controlled two-page collector using visible navigation */
(()=>{try{
const v=window.Game?.view;
if(!v?.listItemParams?.item?.length)throw Error("Open weapon inventory first");
const n=x=>typeof x==="number"&&Number.isFinite(x)?x:typeof x==="string"&&x.trim()!==""&&Number.isFinite(Number(x))?Number(x):null;
const id=x=>typeof x==="string"||typeof x==="number"?String(x):null;
const get=()=>({page:String(window.Game?.view?.page??"?"),items:(window.Game?.view?.listItemParams?.item||[]).map((item,index)=>{const p=item?.param||{},m=item?.master||{};return{index,weapon_id:id(m.id),instance_id:id(p.id),image_id:id(p.image_id),level:n(p.level),attack:n(p.attack),hp:n(p.hp),bonus_attack:n(p.bonus_attack),bonus_hp:n(p.bonus_hp),skill_level:n(p.skill_level),evolution:n(p.evolution),phase:n(p.phase),rarity:n(m.rarity),is_locked:p.is_locked===true||p.is_locked===1||p.is_locked==="1",is_used:item.is_used===true}})});
const first=get();const btn=[...document.querySelectorAll("a.flex-next")].find(e=>!e.classList.contains("flex-disabled")&&e.getClientRects().length);
if(!btn)throw Error("No visible enabled next button");
const save=(second,status)=>{const all=[...first.items,...(second?.items||[])],unique=[...new Map(all.filter(x=>x.instance_id).map(x=>[x.instance_id,x])).values()];const data={schema:"gbf-account-exporter/two-page-test-v1.1",firstPage:first.page,secondPage:second?.page??null,firstCount:first.items.length,secondCount:second?.items.length??0,uniqueCount:unique.length,status,weapons:unique};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-two-page-test-v1.1.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v1.1: "+status+" / "+unique.length+" items")};
btn.click();let attempts=0;const check=()=>{const next=get();const changed=next.page!==first.page&&next.items.length>0;if(changed){save(next,"page_changed");return}if(++attempts>=20){save(null,"page_not_changed");return}setTimeout(check,300)};setTimeout(check,300);
}catch(e){alert("GBF v1.1 error: "+e.message)}})();