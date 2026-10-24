/* GBF v1.8: read-only, bounded inventory memory survey */
(()=>{try{
const root=window.Game;
if(!root||!root.view)throw Error("Open weapon inventory first");
const safe=(obj,key)=>{try{const d=Object.getOwnPropertyDescriptor(obj,key);return d&&"value" in d?d.value:undefined}catch{return undefined}};
const isObj=x=>x!==null&&typeof x==="object";
const describe=x=>{if(Array.isArray(x))return "array";if(isObj(x))return "object";return typeof x};
const current=Array.isArray(root.view?.listItemParams?.item)?root.view.listItemParams.item:[];
const output={schema:"gbf-account-exporter/memory-diagnostic-v1.8",location:location.hostname,viewPage:root.view.page??null,currentPageItems:current.length,scan:{maxDepth:5,maxNodes:2200,maxArraySamples:12},candidates:[],stats:{nodesVisited:0,arraysSeen:0,objectsSeen:0,limitsReached:false},notes:["No page clicks, network requests or inventory mutations.","Only structural metadata is exported; no session tokens or raw game records."]};
const sensitive=/token|secret|auth|cookie|session|password|credential|csrf|key|sign|header|mail|user|account|profile|billing/i;
const relevant=/item|weapon|equip|inventory|list|data|param|master|cache|collection|storage|model|view|bag|possess|archive/i;
const seen=new WeakSet(),queue=[{value:root,path:"Game",depth:0}];
while(queue.length&&output.stats.nodesVisited<output.scan.maxNodes){
const {value,path,depth}=queue.shift();if(!isObj(value)||seen.has(value))continue;seen.add(value);output.stats.nodesVisited++;
if(Array.isArray(value)){output.stats.arraysSeen++;const sample=value.slice(0,Math.min(3,value.length));const shape=sample.map(v=>isObj(v)?Object.keys(v).filter(k=>!sensitive.test(k)).slice(0,14):describe(v));if(value.length>=15||relevant.test(path))output.candidates.push({path,type:"array",length:value.length,sampleShape:shape});if(depth<output.scan.maxDepth)for(let i=0;i<Math.min(value.length,output.scan.maxArraySamples);i++)queue.push({value:safe(value,String(i)),path:path+"["+i+"]",depth:depth+1});continue}
output.stats.objectsSeen++;
let keys=[];try{keys=Object.keys(value)}catch{continue}
if(relevant.test(path)&&keys.length>=15)output.candidates.push({path,type:"object",keyCount:keys.length,keyNames:keys.filter(k=>!sensitive.test(k)).slice(0,18)});
if(depth>=output.scan.maxDepth)continue;
for(const key of keys.slice(0,180)){if(sensitive.test(key))continue;const v=safe(value,key);if(!isObj(v))continue;if(depth===0&&!relevant.test(key))continue;queue.push({value:v,path:path+"."+key,depth:depth+1})}
}
output.stats.limitsReached=queue.length>0;
output.candidates.sort((a,b)=>(b.length||b.keyCount||0)-(a.length||a.keyCount||0));
output.candidates=output.candidates.slice(0,120);
const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="gbf-memory-diagnostic-v1.8.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
alert("GBF v1.8 scan complete: "+output.stats.nodesVisited+" objects, "+output.candidates.length+" candidates. JSON saved.");
}catch(e){alert("GBF v1.8 diagnostic: "+e.message)}})();