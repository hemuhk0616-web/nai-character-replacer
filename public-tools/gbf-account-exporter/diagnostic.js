/* GBF v1.2: read-only pagination control inspection */
(()=>{try{
const v=window.Game?.view;
const nodes=[...document.querySelectorAll('a,button,[role="button"],li')];
const candidates=nodes.filter(e=>{const cls=String(e.className||"");const txt=(e.textContent||"").trim();return /page|pagin|flex-prev|flex-next|pager/i.test(cls)||(/^\d{1,3}$/.test(txt)&&e.children.length===0)});
const report={schema:"gbf-account-exporter/pagination-v1.2",page:String(v?.page??""),page_num:v?.page_num??null,itemCount:v?.listItemParams?.item?.length??0,controls:candidates.slice(0,90).map(e=>({tag:e.tagName,classes:String(e.className||"").slice(0,130),text:(e.textContent||"").trim().slice(0,40),href:e.getAttribute("href"),role:e.getAttribute("role"),parentTag:e.parentElement?.tagName,parentClass:String(e.parentElement?.className||"").slice(0,100),outer:e.outerHTML.slice(0,350)})),note:"Read-only DOM metadata; no clicks or network requests."};
const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="gbf-pagination-v1.2.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);alert("GBF pagination v1.2 ready");
}catch(e){alert("GBF pagination error: "+e.message)}})();