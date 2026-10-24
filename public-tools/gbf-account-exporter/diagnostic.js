/* GBF v1.6: inventory auto-pagination with local JSON export */
(()=>{try{
const KEY="gbf-auto-v1.6",LEGACY="gbf-passive-v1.5";
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const previous=parse(sessionStorage.getItem(KEY))||parse(sessionStorage.getItem(LEGACY))||{pages:{},weapons:{}};
const data={pages:previous.pages||{},weapons:previous.weapons||{}};
const num=x=>x==null||x===""?null:Number.isFinite(Number(x))?Number(x):null;
const str=x=>x==null?null:String(x);
const read=()=>{const v=window.Game?.view;return{page:Number(v?.page),items:(v?.listItemParams?.item||[]).map(item=>{const p=item?.param||{},m=item?.master||{};return{weapon_id:str(m.id),instance_id:str(p.id),image_id:str(p.image_id),level:num(p.level),attack:num(p.attack),hp:num(p.hp),bonus_attack:num(p.bonus_attack),bonus_hp:num(p.bonus_hp),skill_level:num(p.skill_level),evolution:num(p.evolution),phase:num(p.phase),rarity:num(m.rarity),is_locked:[true,1,"1"].includes(p.is_locked),is_used:[true,1,"1"].includes(item.is_used)}})}};
const total=()=>Math.max(0,...[...document.querySelectorAll("li.prt-page-number[page]")].map(e=>Number(e.getAttribute("page"))).filter(Number.isInteger));
const persist=()=>sessionStorage.setItem(KEY,JSON.stringify(data));
const capture=r=>{if(!Number.isInteger(r.page)||r.page<1||!r.items.length)return false;const ids=r.items.map(x=>x.instance_id);if(ids.some(x=>!x))return false;data.pages[r.page]=ids.length;for(const item of r.items)data.weapons[item.instance_id]=item;persist();return true};
const exportFile=status=>{const max=total(),visited=Object.keys(data.pages).map(Number).sort((a,b)=>a-b),missing=Array.from({length:max},(_,i)=>i+1).filter(p=>!data.pages[p]);const out={schema:"gbf-account-exporter/auto-v1.6",status,totalPages:max||null,visitedPages:visited,missingPages:missing,uniqueCount:Object.keys(data.weapons).length,pages:data.pages,weapons:Object.values(data.weapons)};const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-auto-v1.6.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("GBF v1.6 "+status+": "+visited.length+"/"+max+" pages, "+out.uniqueCount+" weapons")};
if(window.__gbfAutoCollector){window.__gbfAutoCollector.stop("manual_stop");return}
const initial=read();if(!capture(initial))throw Error("Open weapon inventory and wait for items");
const max=total();if(!max)throw Error("Page buttons not found");
let active=true,timer=null,expected=null,oldFingerprint="",attempt=0,completed=0;
const fingerprint=r=>r.items.map(x=>x.instance_id).join(",");
const finish=status=>{if(!active)return;active=false;clearTimeout(timer);delete window.__gbfAutoCollector;exportFile(status)};
window.__gbfAutoCollector={stop:finish};
const wait=()=>{if(!active)return;const r=read();if(r.page===expected&&r.items.length&&fingerprint(r)!==oldFingerprint){capture(r);completed++;expected=null;attempt=0;timer=setTimeout(step,350);return}if(++attempt>=40){finish("timeout_at_page_"+expected);return}timer=setTimeout(wait,250)};
const step=()=>{if(!active)return;const r=read();if(expected!==null)return;if(r.items.length)capture(r);const missing=Array.from({length:max},(_,i)=>i+1).filter(p=>!data.pages[p]);if(!missing.length){finish("complete");return}const next=missing[0],button=document.querySelector('li.prt-page-number.btn-page-number[page="'+next+'"][disable="false"]');if(!button){finish("button_unavailable_"+next);return}expected=next;oldFingerprint=fingerprint(r);attempt=0;button.click();timer=setTimeout(wait,250)};
alert("GBF v1.6 auto collection started: "+Object.keys(data.pages).length+"/"+max+" pages. Keep inventory open. Run bookmark again to stop and save.");
timer=setTimeout(step,300);
}catch(e){alert("GBF v1.6: "+e.message)}})();