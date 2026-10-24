/* GBF v2.1: read-only inventory loader structure probe; no page clicks or requests */
(()=>{try{
const G=window.Game,v=G?.view;if(!v)throw Error("Open the GBF weapon inventory first");
const seen=new WeakSet(),nodes=[],candidates=[],MAX_NODES=1600,MAX_DEPTH=4;
const own=(o)=>{try{return Object.getOwnPropertyDescriptors(o)}catch{return {}}};
const type=x=>Array.isArray(x)?"array":x===null?"null":typeof x;
const allowed=(k)=>!/token|secret|auth|cookie|session|password|email|phone|address|csrf|nonce|credential|user.?id|uid|access.?key|payment/i.test(k);
const summarize=(o,path,depth)=>{if(!o||typeof o!=="object"&&typeof o!=="function"||seen.has(o)||nodes.length>=MAX_NODES||depth>MAX_DEPTH)return;seen.add(o);
const ds=own(o),keys=Object.keys(ds),methods=[],arrays=[],children=[];
for(const k of keys.slice(0,160)){if(!allowed(k))continue;const d=ds[k];if(!("value"in d))continue;const x=d.value,t=type(x);
if(t==="function"){methods.push(k);if(/page|list|item|weapon|fetch|load|request|change|render|update|next|prev|pagination|model|sync|sort|filter/i.test(k))candidates.push({path:path+"."+k,kind:"method",arity:x.length})}
else if(t==="array"){arrays.push({key:k,length:x.length});if(/item|weapon|list|page|cache|data|model/i.test(k))candidates.push({path:path+"."+k,kind:"array",length:x.length});if(depth<MAX_DEPTH&&x.length){for(let i=0;i<Math.min(x.length,2);i++)children.push([k+"["+i+"]",x[i]])}}
else if((t==="object")&&x){children.push([k,x])}
}
nodes.push({path,type:type(o),keyCount:keys.length,methods:methods.slice(0,90),arrays:arrays.slice(0,70),hasGetters:keys.some(k=>!("value"in ds[k]))});
if(depth<MAX_DEPTH)for(const [k,x]of children.slice(0,42))summarize(x,path+"."+k,depth+1)
};
for(const [path,obj]of [["Game.view",v],["Game.model",G?.model],["Game.data",G?.data],["Game.models",G?.models],["Game.api",G?.api]])summarize(obj,path,0);
const safeList=v?.listItemParams?.item;
const out={schema:"gbf-account-exporter/loader-probe-v2.1",page:Number(v.page)||null,visibleItemCount:Array.isArray(safeList)?safeList.length:null,visitedNodes:nodes.length,candidates:candidates.slice(0,400),nodes,limitations:["Names, array lengths and function arities only; no function calls, page clicks or network requests.","No credentials, URL values, or item records exported.","Inspection may miss non-enumerable prototype methods or lazy data."]};
const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-loader-probe-v2.1.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
alert("GBF v2.1 done: "+nodes.length+" nodes, "+candidates.length+" candidates. Upload gbf-loader-probe-v2.1.json");
}catch(e){alert("GBF v2.1 error: "+e.message)}})();