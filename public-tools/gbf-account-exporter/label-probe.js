/* GBF weapon label probe v3.2: read-only, local sample */
(()=>{try{
const v=window.Game?.view;if(!v||v.selected_item!=="weapon")throw Error("Open weapon inventory");
const arr=v.change_list;if(!Array.isArray(arr)||!arr.length)throw Error("No weapon data");
const root=document.querySelector("#lis-weapon")||document.querySelector(".prt-list.active");if(!root)throw Error("Weapon list element missing");
const nodes=[...root.querySelectorAll("li, .lis-weapon, .btn-weapon, .prt-weapon")].filter(e=>e.querySelector("img")||e.getAttribute("data-id")).slice(0,8);
const clean=s=>String(s??"").replace(/\s+/g," ").trim().slice(0,200);
const samples=arr.slice(0,5).map((x,i)=>{const id=String(x?.param?.image_id??"");const matches=[...root.querySelectorAll("img")].filter(im=>(im.getAttribute("src")||"").includes(id)).slice(0,2);return{index:i,weapon_id:x?.master?.id,image_id:id,matchedImages:matches.map(im=>{const parent=im.closest("li")||im.closest("[data-id]")||im.parentElement?.parentElement;return{src:(im.getAttribute("src")||"").split("?")[0].slice(0,240),alt:clean(im.alt),title:clean(im.title),nearbyText:clean(parent?.innerText),nearbyClass:clean(parent?.className),nearbyAttributes:parent?[...parent.attributes].filter(a=>/^(class|data-(id|type|series|name))$/.test(a.name)).map(a=>[a.name,clean(a.value)]):[]}})}});
const out={schema:"gbf-account-exporter/label-probe-v3.2",page:v.page,listClass:clean(root.className),sampleCount:samples.length,samples,visibleCardSamples:nodes.slice(0,3).map(e=>({className:clean(e.className),text:clean(e.innerText),imgAlt:clean(e.querySelector("img")?.alt)}))};
const u=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-label-probe-v3.2.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF v3.2: label probe saved");
}catch(e){alert("GBF v3.2: "+e.message)}})();