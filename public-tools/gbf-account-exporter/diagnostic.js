/* GBF v1.5: passive inventory collector, fast change detection */
(()=>{try{
const KEY="gbf-passive-v1.5",OLD="gbf-passive-v1.4";
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const data=parse(sessionStorage.getItem(KEY))||parse(sessionStorage.getItem(OLD))||{pages:{},weapons:{}};
data.pages=data.pages||{};data.weapons=data.weapons||{};
const num=x=>x==null||x===""?null:Number.isFinite(Number(x))?Number(x):null;
const str=x=>x==null?null:String(x);
const read=()=>{const v=window.Game?.view;return{page:Number(v?.page),items:(v?.listItemParams?.item||[]).map(item=>{const p=item?.param||{},m=item?.master||{};return{weapon_id:str(m.id),instance_id:str(p.id),image_id:str(p.image_id),level:num(p.level),attack:num(p.attack),hp:num(p.hp),bonus_attack:num(p.bonus_attack),bonus_hp:num(p.bonus_hp),skill_level:num(p.skill_level),evolution:num(p.evolution),phase:num(p.phase),rarity:num(m.rarity),is_locked:[true,1,"1"].includes(p.is_locked),is_used:[true,1,"1"].includes(item.is_used)}})}};
let last="",lastPage=0,total=0;
const capture=()=>{const r=read();if(!Number.isInteger(r.page)||r.page<1||!r.items.length)return;const ids=r.items.map(x=>x.instance_id).filter(Boolean);if(!ids.length)return;const fingerprint=r.page+":"+ids.join(",");if(fingerprint===last)return;last=fingerprint;lastPage=r.page;data.pages[r.page]=ids.length;for(const item of r.items)if(item.instance_id)data.weapons[item.instance_id]=item;sessionStorage.setItem(KEY,JSON.stringify(data))};
const getTotal=()=>{const nums=[...document.querySelectorAll("li.prt-page-number[page]")].map(e=>Number(e.getAttribute("page"))).filter(Number.isInteger);total=Math.max(total,0,...nums)};
const save=()=>{capture();getTotal();const visited=Object.keys(data.pages).map(Number).sort((a,b)=>a-b),missing=Array.from({length:total},(_,i)=>i+1).filter(p=>!data.pages[p]);const out={schema:"gbf-account-exporter/passive-v1.5",totalPages:total||null,visitedPages:visited,missingPages:missing,completionPercent:total?Math.round(visited.length/total*100):null,pages:data.pages,uniqueCount:Object.keys(data.weapons).length,weapons:Object.values(data.weapons)};const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-passive-v1.5.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};
if(window.__gbfPassiveCollector){window.__gbfPassiveCollector.stop();save();alert("GBF v1.5 saved: "+Object.keys(data.weapons).length+" weapons, "+Object.keys(data.pages).length+" pages");return}
capture();getTotal();
let pending=false;
const observer=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;capture();getTotal()},60)});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","page"]});
const timer=setInterval(()=>{capture();getTotal()},200);
window.__gbfPassiveCollector={stop:()=>{observer.disconnect();clearInterval(timer);delete window.__gbfPassiveCollector}};
alert("GBF v1.5 recording: navigate inventory pages; run bookmark again to save. Previous v1.4 data retained.");
}catch(e){alert("GBF v1.5: "+e.message)}})();