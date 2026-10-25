/* GBF Materials Exporter v1.0.0. Three read-only lists observed in the public
 * game client: assets/js/view/item/index.js, fetched 2026-10-25.
 * Does not use, exchange, claim, sell or recycle anything. No external upload.
 */
(function(root,factory){
  const helpers=factory();
  if(typeof module==='object'&&module.exports){module.exports=helpers;return;}
  start(root,helpers);
  function start(win,helpers){
    'use strict';
    const KEY='__GBF_MATERIALS_EXPORTER_V1__',STORE='gbf-materials-exporter-v1-checkpoint';
    if(win[KEY]?.running||win[KEY]?.requiresReload){win[KEY].show();return;}
    const report={schema:'gbf-materials-exporter/v1',collector_version:'1.0.0',started_at:new Date().toISOString(),finished_at:null,status:'running',complete:false,error:null,sections:{},warnings:[],scope:{treasures:true,recovery_and_upgrade_items:true,tickets_and_other_items:true,giftbox:false,memorials:false,skypieces:false,currencies:false}};
    let stopped=false,pending=false,abort=null,saved=false;
    const host=document.createElement('div');host.id='gbf-materials-exporter-v1';document.getElementById(host.id)?.remove();
    Object.assign(host.style,{position:'fixed',left:'8px',right:'8px',bottom:'12px',zIndex:'2147483647',maxWidth:'430px',margin:'auto'});
    const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');
    style.textContent='*{box-sizing:border-box}section{font:13px/1.6 system-ui,sans-serif;background:#142530;color:#f2f5f7;border:1px solid #6b9f93;border-radius:15px;padding:14px;box-shadow:0 5px 35px #0008}h2{font-size:15px;margin:0 0 6px}p{margin:5px 0;overflow-wrap:anywhere}small{color:#b9cbd1}.buttons{display:flex;gap:7px;margin-top:10px}button{flex:1;font:inherit;background:#285247;color:#e6fff3;border:1px solid #659b8a;border-radius:9px;min-height:44px;padding:8px}button:disabled{opacity:.5}';
    const panel=document.createElement('section'),title=document.createElement('h2'),status=document.createElement('p'),info=document.createElement('p'),note=document.createElement('small'),buttons=document.createElement('div');
    title.textContent='🍙 재료 별도 수집 · V1.0';note.textContent='트레저·회복·강화·티켓 목록 조회 · 선물함·통화는 제외';buttons.className='buttons';
    const stopButton=document.createElement('button'),saveButton=document.createElement('button'),closeButton=document.createElement('button');
    stopButton.textContent='중단';saveButton.textContent='JSON 저장';closeButton.textContent='닫기';buttons.append(stopButton,saveButton,closeButton);panel.append(title,status,info,note,buttons);shadow.append(style,panel);document.body.appendChild(host);
    const api={report,running:true,requiresReload:false,done:null,show(){host.style.display='block'},stop(){stopped=true;abort?.(Error('사용자가 중단했습니다'));},save};win[KEY]=api;
    stopButton.onclick=api.stop;saveButton.onclick=()=>save(false);closeButton.onclick=()=>{if(!api.running)host.style.display='none';else status.textContent='수집 중입니다. 중단 버튼으로 멈출 수 있어요.'};
    function update(message){status.textContent=message;info.textContent=Object.values(report.sections).reduce((n,s)=>n+(s.items?.length||0),0)+'개 항목 · 개수 미확인은 별도 표시';}
    function checkpoint(){try{sessionStorage.setItem(STORE,JSON.stringify(report));}catch{if(!report.warnings.includes('임시 저장 불가'))report.warnings.push('임시 저장 불가');}}
    function save(automatic){if(automatic&&saved)return;if(automatic)saved=true;try{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='gbf-materials-v1-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch{update('저장 실패 · JSON 저장 버튼으로 다시 시도해 주세요');}}
    function active(view){if(stopped)throw Error('사용자가 중단했습니다');if(Game.view!==view)throw Error('게임 화면이 바뀌어 중단했습니다');}
    function loadModel(){return new Promise((resolve,reject)=>{
      const req=win.requirejs||win.require;if(typeof req!=='function'||!req.s?.contexts){reject(Error('게임 기본 조회 모듈을 찾지 못했습니다'));return;}
      let ended=false;const finish=(err,value)=>{if(ended)return;ended=true;clearTimeout(timer);abort=null;err?reject(err):resolve(value);};
      const timer=setTimeout(()=>finish(Error('조회 모듈 로드 시간 초과')),15000);abort=e=>finish(e);
      try{req(['model/data'],Model=>finish(null,Model),()=>finish(Error('조회 모듈 로드 실패')));}catch(e){finish(e);}
    });}
    function read(Model,route,view){return new Promise((resolve,reject)=>{
      active(view);const model=new(Model.extend({urlRoot:Game.baseUri+route}))();
      let ended=false;const cleanup=()=>{ended=true;clearTimeout(timer);model.off('sync',done);model.off('error',failure);abort=null;};
      const done=()=>{if(ended)return;try{active(view);const value=model.toJSON();cleanup();pending=false;resolve(value);}catch(e){cleanup();pending=false;reject(e);}};
      const failure=(_model,xhr)=>{if(ended)return;cleanup();pending=false;const code=Number.isInteger(xhr?.status)?xhr.status:null;reject(Error('재료 목록 조회 실패'+(code===null?'':' · HTTP '+code)));};
      const timer=setTimeout(()=>{if(ended)return;cleanup();reject(Error('재료 응답 시간 초과 · 추가 요청 중단'));},20000);
      abort=e=>{if(ended)return;cleanup();reject(e);};model.on('sync',done);model.on('error',failure);pending=true;
      try{model.fetch({ignoreError:true});}catch(e){cleanup();pending=false;reject(e);}
    });}
    api.done=(async()=>{
      try{
        if(!/^(?:gbf\.game\.mbga\.jp|game\.granbluefantasy\.jp)$/.test(location.hostname)){report.status='blocked';throw Error('로그인된 그랑블루 게임 화면에서 실행해 주세요');}
        if(win.__GBF_ACCOUNT_EXPORTER_V4__?.running||win.__GBF_ACCOUNT_EXPORTER_V4__?.requiresReload){report.status='blocked';throw Error('통합 수집 종료 후 실행해 주세요. 이전 수집이 중단됐다면 새로고침해 주세요.');}
        const view=win.Game?.view;if(!view||typeof Game.baseUri!=='string'||new URL(Game.baseUri).origin!==location.origin){report.status='blocked';throw Error('게임 기본 주소 또는 화면을 확인하지 못했습니다');}
        const Model=await loadModel();if(typeof Model?.extend!=='function')throw Error('게임 조회 모델 구조 미확인');
        const routes=[['treasures','트레저','item/article_list_by_filter_mode'],['items','회복·강화 아이템','item/recovery_and_evolution_list_by_filter_mode'],['tickets','티켓·기타 아이템','item/gacha_ticket_and_others_list_by_filter_mode']];
        for(const[key,label,route]of routes){
          active(view);const section={status:'collecting',endpoint:route,items:[],error:null};report.sections[key]=section;update(label+' 조회 중');
          try{
            const payload=await read(Model,route,view),result=helpers.extract(payload,key);Object.assign(section,result);
            section.status=result.complete?'collected':'partial';section.coverage='native_list_response';
            if(!result.complete)section.error='일부 응답 항목의 구조를 해석하지 못했습니다';
            checkpoint();
          }catch(e){section.status='partial';section.error=String(e.message);checkpoint();if(pending||stopped)throw e;}
          await new Promise(resolve=>setTimeout(resolve,600));
        }
        report.complete=Object.values(report.sections).length===3&&Object.values(report.sections).every(s=>s.status==='collected');report.status=report.complete?'collected':'partial';
        report.completeness_note='complete는 위의 세 기본 목록 응답 해석 성공을 뜻합니다. 모든 재화·선물함·대사기·스카이피스까지 포함한다는 뜻이 아닙니다.';
        update(report.complete?'재료 조회 완료 · JSON 저장':'일부 수집 · JSON에서 누락 항목 확인');
      }catch(e){report.error=String(e.message);if(report.status!=='blocked')report.status=stopped?'cancelled':'partial';update(report.error);}
      finally{report.finished_at=new Date().toISOString();api.running=false;api.requiresReload=pending;stopButton.disabled=true;if(pending)note.textContent='응답 지연·중단 후에는 게임을 새로고침해 주세요';checkpoint();if(report.status!=='blocked')save(true);}
      return report;
    })();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const privateKey=/token|secret|password|credential|cookie|session|auth|csrf|nonce|signature|(?:duplicate|api|access|private|signing)_?key|(?:^|_)(?:user|account|device|owner|player)(?:_?id)?$|email|phone/i;
  function sanitize(value,depth=0){
    if(depth>12)return null;if(value===null||['boolean','number'].includes(typeof value))return value;
    if(typeof value==='string')return value.slice(0,8000);
    if(Array.isArray(value))return value.map(v=>sanitize(v,depth+1));
    if(!value||typeof value!=='object')return null;const out={};
    for(const[k,v]of Object.entries(value))if(!privateKey.test(k)&&!['__proto__','constructor','prototype'].includes(k))out[k]=sanitize(v,depth+1);
    return out;
  }
  function count(value){if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?value:null;if(typeof value!=='string'||!/^\d+$/.test(value))return null;const n=Number(value);return Number.isSafeInteger(n)?n:null;}
  function extract(payload,section){
    if(!Array.isArray(payload))throw Error('기본 재료 응답이 목록 배열이 아닙니다');
    const items=[],unparsed_paths=[];
    function walk(value,path,depth){
      if(depth>12){unparsed_paths.push(path);return;}
      if(Array.isArray(value)){value.forEach((v,i)=>walk(v,path.concat(i),depth+1));return;}
      if(value===null)return;
      if(!value||typeof value!=='object'||value.item_id==null){unparsed_paths.push(path);return;}
      const id=String(value.item_id);if(!/^\d+$/.test(id)){unparsed_paths.push(path);return;}
      const kind=value.item_kind_id??value.item_kind??(section==='treasures'?10:null);
      const quantity=section==='treasures'?count(value.amount):count(value.number??value.amount);
      const name=typeof value.name==='string'?value.name:null;
      const key=section+':'+path.join('.')+':'+String(kind??'unknown')+':'+id;
      items.push({key,item_id:id,item_kind_id:kind===null?null:String(kind),name,name_language:'game',quantity,quantity_raw:section==='treasures'?(value.amount??null):(value.number??value.amount??null),display_num:value.num??null,total_point:value.total_point??null,group_path:path.slice(0,-1),source_index:path.at(-1),source_section:section,location:'items',raw:sanitize(value)});
    }
    walk(payload,[],0);
    return {items,complete:unparsed_paths.length===0,unparsed_paths,quantity_unknown_records:items.filter(v=>v.quantity===null).length,name_unknown_records:items.filter(v=>!v.name).length,raw:sanitize(payload)};
  }
  return {extract};
});
