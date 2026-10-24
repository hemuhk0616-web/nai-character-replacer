/* GBF Account Exporter v0.2 - read-only model-shape diagnostics */
(function(){"use strict";
try{
const blocked=/token|secret|auth|cookie|session|password|credential|user.?id|account|email|phone|device|key|csrf|nonce|signature|header|storage|cid|uid|uuid|identifier/i;
const maxKeys=60;
function shape(v,depth,seen){
 if(v===null)return{type:"null"};
 if(Array.isArray(v))return{type:"array",length:v.length,first:depth>0&&v.length?shape(v[0],depth-1,seen):undefined};
 const type=typeof v;
 if(type!=="object")return{type};
 if(seen.has(v))return{type:"object",circular:true};
 seen.add(v);
 let keys;try{keys=Object.keys(v)}catch(_){return{type:"inaccessible"}}
 const clean=keys.filter(k=>!blocked.test(k)).slice(0,maxKeys);
 const o={type:"object",keyCount:keys.length,fields:{}};
 if(depth>0)for(const k of clean){
  try{const d=Object.getOwnPropertyDescriptor(v,k);o.fields[k]=d&&"value"in d?shape(d.value,depth-1,seen):{type:"accessor-skipped"}}catch(_){o.fields[k]={type:"inaccessible"}}
 }
 return o;
}
function own(obj,key){try{const d=Object.getOwnPropertyDescriptor(obj,key);return d&&"value"in d?d.value:undefined}catch(_){return undefined}}
const game=own(window,"Game"),view=game&&own(game,"view");
const report={schema:"gbf-account-exporter/diagnostic-v0.2",createdAt:new Date().toISOString(),screen:"unspecified",gameView:shape(view,3,new WeakSet()),note:"Structural keys and types only; no data values or game requests."};
const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gbf-diagnostic-v0.2.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);alert("V0.2 진단 JSON 저장 요청 완료");
}catch(e){alert("V0.2 오류: "+String(e&&e.message||e))}
})();