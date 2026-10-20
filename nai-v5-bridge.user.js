// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      1.2.12
// @description  Import a prompt bundle from NAI Character Replacer into NovelAI V5. Review before generating.
// @updateURL    https://raw.githubusercontent.com/hemuhk0616-web/nai-character-replacer/main/nai-v5-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/hemuhk0616-web/nai-character-replacer/main/nai-v5-bridge.user.js
// @match        https://novelai.net/*
// @match        https://*.novelai.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function(){
'use strict';
const PREFIX='#nai-replacer=';
if(window.__naiBridgeActiveV109)return;
window.__naiBridgeActiveV109=true;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function setReactValue(el,value){
 const text=String(value??'');
 if(el.isContentEditable||el.getAttribute('contenteditable')==='true'){
  // ProseMirror and similar editors need a real editor transaction, not textContent mutation.
  el.focus();
  const selection=window.getSelection();
  const range=document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();selection.addRange(range);
  let ok=false;
  try{ok=document.execCommand('insertText',false,text)}catch{}
  if(!ok){
   // Fallback: DOM replacement may not sync the editor model; report this to the user.
   selection.removeAllRanges();
   throw Error('편집기 전체 교체 실패. NovelAI 편집기가 직접 입력을 차단했어.');
  }
  selection.removeAllRanges();
 }else{
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLInputElement?HTMLInputElement.prototype:null;
  const setter=proto&&Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(!setter)throw Error('지원하지 않는 입력창');
  setter.call(el,text);
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:text}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
function fields(){return [...document.querySelectorAll('textarea,input[type="text"],[contenteditable="true"],[role="textbox"],div[contenteditable],div[role="textbox"]')].filter(e=>e.getClientRects().length&&!e.disabled&&!e.closest('#nai-bridge-panel'));}
function label(el){return [el.getAttribute('placeholder'),el.getAttribute('aria-label'),el.getAttribute('data-testid'),el.closest('label')?.textContent,el.parentElement?.parentElement?.textContent?.slice(0,140)].filter(Boolean).join(' ').toLowerCase();}
function panel(bundle){
 document.getElementById('nai-bridge-panel')?.remove();
 document.getElementById('nai-bridge-hide')?.remove();
 document.getElementById('nai-bridge-launcher')?.remove();
 const root=document.createElement('div');root.id='nai-bridge-panel';
 root.style.cssText='position:fixed;top:72px;right:8px;transform:none;z-index:2147483647;width:min(94vw,420px);max-height:58vh;overflow:auto;background:#1b2332;color:white;border:2px solid #7b9cff;border-radius:12px;padding:14px;font:13px system-ui;box-shadow:0 6px 30px #000b';
 const header=document.createElement('div');
 header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-14px;z-index:2;background:#1b2332;padding:6px 0 9px';
 const title=document.createElement('strong');title.textContent='NAI Bridge v1.2.12 · 설정 확인';
 title.style.cssText='font:bold 14px system-ui';
 const close=document.createElement('button');close.textContent='✕';close.title='패널 닫기';
 close.style.cssText='flex-shrink:0;padding:5px 10px;border-radius:7px;background:#34445f;color:white;border:1px solid #60718c;font:bold 16px system-ui';
 close.onclick=()=>{root.style.display='none';document.querySelectorAll('.nai-bridge-debug-pin').forEach(e=>e.remove())};

 header.style.touchAction='none';
 title.style.cursor='grab';
 title.title='여기를 드래그해서 패널 이동';
 let dragStart=null;
 header.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const rect=root.getBoundingClientRect();
  dragStart={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
  header.setPointerCapture(e.pointerId);
 });
 header.addEventListener('pointermove',e=>{
  if(!dragStart)return;
  const x=Math.min(Math.max(0,dragStart.left+e.clientX-dragStart.x),Math.max(0,innerWidth-root.offsetWidth));
  const y=Math.min(Math.max(0,dragStart.top+e.clientY-dragStart.y),Math.max(0,innerHeight-60));
  root.style.left=x+'px';root.style.top=y+'px';root.style.right='auto';root.style.transform='none';
 });
 const stopDrag=()=>{dragStart=null};
 header.addEventListener('pointerup',stopDrag);
 header.addEventListener('pointercancel',stopDrag);
 header.append(title,close);root.append(header);
 const hint=document.createElement('p');hint.textContent='프롬프트 적용 또는 지우기를 선택해 줘. 나머지 설정은 아래에서 펼칠 수 있어.';hint.style.cssText='font-size:11px;color:#afbdd6;margin:4px 0';root.append(hint);
 const report=document.createElement('div');report.style.whiteSpace='pre-wrap';root.append(report);
 const version=document.createElement('div');version.textContent='Bridge v1.2.12 · 입력창 진단';version.style.cssText='font-size:12px;color:#a9c7ff;margin:5px 0';root.append(version);
 function makeSection(name){
  const d=document.createElement('details');
  d.style.cssText='border:1px solid #40506b;border-radius:9px;margin:8px 0;padding:9px;background:#121b29';
  const summary=document.createElement('summary');summary.textContent=name;summary.style.cssText='font-weight:700;cursor:pointer;padding:3px';d.append(summary);root.append(d);return d;
 }
 function settingLine(parent,name,value,copyable=false){
  if(value===undefined||value===null||value==='')return;
  const line=document.createElement('div');
  line.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #344055';
  const label=document.createElement('span');label.textContent=name;label.style.color='#afbdd6';
  const val=document.createElement('span');val.textContent=typeof value==='boolean'?(value?'ON':'OFF'):String(value);val.style.cssText='font-weight:650;text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums';
  if(copyable){val.style.cssText+=';cursor:pointer;color:#91b8ff;text-decoration:underline;text-underline-offset:3px';val.title='눌러서 복사';val.setAttribute('role','button');val.tabIndex=0;const copy=async()=>{try{await navigator.clipboard.writeText(String(value));val.textContent='복사 완료 ✓';setTimeout(()=>{if(val.isConnected)val.textContent=String(value)},1100)}catch(e){report.textContent='Seed 복사 실패: '+e.message}};val.addEventListener('click',copy);val.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();copy()}})}
  line.append(label,val);parent.append(line);
 }
 const settings=bundle.generationSettings||{};

 const settingsSection=makeSection('생성 설정 · Seed / Guidance / Sampler');
 settingsSection.open=true;
 const settingsNote=document.createElement('p');
 settingsNote.textContent='원본 메타데이터의 생성 설정이야. 값은 NovelAI에서 직접 적용해 줘.';
 settingsNote.style.cssText='font-size:11px;color:#afbdd6;margin:5px 0';
 settingsSection.append(settingsNote);
 const settingItems=[['Seed','seed',true],['Steps','steps'],['Guidance / Scale','scale'],['Sampler','sampler'],['Noise Schedule','noise_schedule'],['Width','width'],['Height','height'],['SM','sm'],['SM Dynamic','sm_dyn'],['CFG Rescale','cfg_rescale'],['Dynamic Thresholding','dynamic_thresholding'],['Skip CFG Above Sigma','skip_cfg_above_sigma'],['Variety+','variety_plus']];
 let foundSettings=0;
 for(const [label,key,copyable] of settingItems){
  if(settings[key]!==undefined&&settings[key]!==null&&settings[key]!==''){settingLine(settingsSection,label,settings[key],!!copyable);foundSettings++}
 }
 if(!foundSettings){const empty=document.createElement('p');empty.textContent='전송된 생성 설정이 없어. 리플레이서에서 PNG 메타데이터의 Seed·Guidance 값을 확인해 줘.';empty.style.cssText='font-size:12px;color:#e9bd81';settingsSection.append(empty)}
 const settingsCopy=document.createElement('button');
 settingsCopy.textContent='생성 설정 JSON 복사';
 settingsCopy.style.cssText='padding:8px;margin-top:7px;background:#344d78;color:white;border:0;border-radius:6px';
 settingsCopy.onclick=()=>navigator.clipboard.writeText(JSON.stringify(settings,null,2)).then(()=>{report.textContent='생성 설정 복사 완료'}).catch(e=>{report.textContent='설정 복사 실패: '+e.message});
 settingsSection.append(settingsCopy);

 const promptSection=makeSection('프롬프트 자동 입력 · V1.2.12');
 promptSection.open=true;
 report.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:12px system-ui;max-height:35vh;overflow:auto;background:#111b2b;padding:8px;border-radius:6px';
 const btn=(name,fn)=>{const b=document.createElement('button');b.textContent=name;b.style.cssText='padding:10px;margin:4px;background:#5276d8;color:white;border:0;border-radius:6px';b.onclick=fn;promptSection.append(b)};
 const slots=bundle.characterPrompts||[];
 const entries=()=>[{key:'main',name:'메인 프롬프트',value:bundle.description||''},{key:'uc',name:'메인 UC',value:bundle.negativePrompt||''},...slots.flatMap(slot=>[{key:'char'+slot.index,name:'캐릭터 '+slot.index+' 프롬프트',value:slot.prompt||''},{key:'char'+slot.index+'uc',name:'캐릭터 '+slot.index+' UC',value:slot.negativePrompt||''}])];
 const selector=key=>{if(key==='main')return '.prompt-input-box-base-prompt';if(key==='uc')return '.prompt-input-box-undesired-content';const m=/^char(\d+)(uc)?$/.exec(key);return m?'.prompt-input-box-character-prompts-'+m[1]+(m[2]?'-undesired-content':''):null};
 const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>30&&r.height>10&&cs.visibility==='visible'&&cs.display!=='none'};
 const editor=key=>{const sel=selector(key);if(!sel)return null;const matches=[...document.querySelectorAll(sel+' .ProseMirror[contenteditable="true"]')];return matches.length===1?matches[0]:null};
 const waitVisible=async key=>{for(let i=0;i<8;i++){const e=editor(key);if(visible(e))return e;await delay(140)}return null};
 let safeBatch=null;
 async function reveal(key){
  const m=/^char(\d+)(uc)?$/.exec(key);
  const other=key==='uc'?'main':m?(m[2]?'char'+m[1]:'char'+m[1]+'uc'):'uc';
  if(m){
   const buttons=[...document.querySelectorAll('.character-prompt-input-'+m[1]+' > button')].filter(b=>b.getBoundingClientRect().width>10);
   if(buttons.length===1){buttons[0].click();await delay(230);}
   else if(buttons.length===0){
    // A character may already be selected and have no selection button.
    // Either its prompt or UC must be visibly active before proceeding.
    if(!visible(editor(key))&&!visible(editor(other)))return {ok:false,reason:'캐릭터 '+m[1]+' 선택 버튼 없음 · 프롬프트/UC 모두 비활성'};
   }else return {ok:false,reason:'캐릭터 '+m[1]+' 선택 버튼 '+buttons.length+'개'};
  }
  if(await waitVisible(key))return {ok:true};
  const host=document.querySelector(selector(key)),counterpart=document.querySelector(selector(other));
  if(!host||!counterpart)return {ok:false,reason:'탭 입력창이 아직 생성되지 않음'};
  let scope=m?host.closest('.character-prompt-input-'+m[1]):host.parentElement;
  if(!m)while(scope&&!scope.contains(counterpart))scope=scope.parentElement;
  if(!scope||scope===document.body||!scope.contains(host)||!scope.contains(counterpart))return {ok:false,reason:'탭 컨테이너 확인 실패'};
  const uc=key==='uc'||!!m?.[2];
  const candidates=[...scope.querySelectorAll('button,[role="tab"]')].filter(b=>{
   const r=b.getBoundingClientRect();if(r.width<10||r.height<8||b.closest('#nai-bridge-panel'))return false;
   const t=[b.textContent,b.getAttribute('aria-label'),b.title].filter(Boolean).join(' ').trim();
   const negative=/\b(uc|undesired content|negative prompt)\b/i.test(t)||/네거티브|부정 프롬프트/i.test(t);
   return uc?negative:!negative&&(/\b(prompt|positive prompt)\b/i.test(t)||/일반 프롬프트/.test(t));
  });
  if(candidates.length!==1)return {ok:false,reason:'탭 버튼 식별 실패 ('+candidates.length+'개)'};
  candidates[0].click();
  return await waitVisible(key)?{ok:true}:{ok:false,reason:'탭 클릭 후 입력창 활성화 실패'};
 }
 function normalizedPromptText(value){
  return String(value).normalize('NFC').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').trim();
 }
 function promptAlreadyMatches(el,next){
  const wanted=normalizedPromptText(next);
  const candidates=[el.innerText,el.textContent];
  // ProseMirror may represent a visual paragraph boundary as a newline.
  // Accept a one-character discrepancy only when that character is whitespace;
  // never accept missing letters, punctuation or prompt tags.
  const compact=value=>normalizedPromptText(value).replace(/\s/g,'');
  return candidates.some(value=>{
   const actual=normalizedPromptText(value);
   return actual===wanted||(Math.abs(actual.length-wanted.length)===1&&compact(actual)===compact(wanted));
  });
 }
  async function clearStep(){
  const run=safeBatch;if(!run||run.busy)return;run.busy=true;
  try{
   while(run.position<run.items.length){
    const item=run.items[run.position],r=await reveal(item.key);
    if(!r.ok){report.textContent='삭제 일시정지 '+(run.position+1)+'/'+run.items.length+' · '+item.name+'\n'+r.reason+'\n탭을 직접 열고 [다음 칸 적용]을 눌러 줘.';return;}
    const el=editor(item.key);
    if(!visible(el))throw Error(item.name+': 삭제 대상 식별 실패');
    el.focus();await delay(100);
    if(document.activeElement!==el||!visible(el))throw Error(item.name+': 포커스 확인 실패');
    if(normalizedPromptText(el.innerText)||normalizedPromptText(el.textContent)){
     const sel=window.getSelection(),range=document.createRange();range.selectNodeContents(el);sel.removeAllRanges();sel.addRange(range);
     if(document.activeElement!==el||!visible(el))throw Error(item.name+': 삭제 대상 변경');
     const success=document.execCommand('delete',false,null);
     sel.removeAllRanges();await delay(350);
     if(!success||normalizedPromptText(el.innerText)||normalizedPromptText(el.textContent))throw Error(item.name+': 삭제 검증 실패');
    }
    run.position++;report.textContent='삭제 진행 '+run.position+'/'+run.items.length+' · '+item.name;
   }
   report.textContent='삭제 완료: '+run.items.length+'개 입력칸 확인.';safeBatch=null;
  }catch(e){report.textContent='안전 중단: '+e.message+'\n이미 삭제한 내용은 자동 복구되지 않아.';safeBatch=null}
  finally{run.busy=false}
 }
 async function applyStep(){
  const run=safeBatch;if(!run||run.busy)return;run.busy=true;
  try{
   while(run.position<run.items.length){
    const item=run.items[run.position],r=await reveal(item.key);
    if(!r.ok){report.textContent='일시정지 '+(run.position+1)+'/'+run.items.length+' · '+item.name+'\n'+r.reason+'\n해당 탭을 직접 열고 [다음 칸 적용]을 눌러 줘.';return;}
    const el=editor(item.key);
    if(!visible(el))throw Error(item.name+': 편집기 식별 실패');
    el.focus();await delay(100);
    if(document.activeElement!==el||!visible(el))throw Error(item.name+': 포커스 확인 실패');
    const next=String(item.value);
    if(!promptAlreadyMatches(el,next)){
     const sel=window.getSelection(),range=document.createRange();range.selectNodeContents(el);sel.removeAllRanges();sel.addRange(range);
     if(document.activeElement!==el||!visible(el))throw Error(item.name+': 붙여넣기 대상 변경');
     const dt=new DataTransfer();dt.setData('text/plain',next);
     el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));
     sel.removeAllRanges();await delay(350);
     if(normalizedPromptText(el.innerText)!==normalizedPromptText(next)&&compact(el.innerText)!==compact(next)&&compact(el.textContent)!==compact(next)){
      await delay(650);
      if(!promptAlreadyMatches(el,next)){
       const wanted=normalizedPromptText(next),actual=normalizedPromptText(el.innerText);
       const plain=normalizedPromptText(el.textContent);
       const compact=v=>v.replace(/\s/g,'');
       let i=0;while(i<Math.min(wanted.length,actual.length)&&wanted[i]===actual[i])i++;
       const sample=v=>JSON.stringify(v.slice(Math.max(0,i-24),Math.min(v.length,i+35)));
       throw Error(item.name+': 입력 검증 실패 (기대 '+wanted.length+'자 / innerText '+actual.length+'자 / textContent '+plain.length+'자)\\n첫 차이 위치 '+i+' · 기대 '+sample(wanted)+' · 실제 '+sample(actual)+'\\n공백 제외 일치: '+(compact(wanted)===compact(actual)||compact(wanted)===compact(plain)));
      }
     }
    }
    run.position++;report.textContent='진행 '+run.position+'/'+run.items.length+' · '+item.name;
   }
   report.textContent='완료: '+run.items.length+'개 입력 확인. NovelAI에서 최종 내용을 확인해 줘.';safeBatch=null;
  }catch(e){report.textContent='안전 중단: '+e.message+'\n이미 입력한 내용은 유지돼.';safeBatch=null}
  finally{run.busy=false}
 }
 btn('전체 순차 삭제',()=>{if(safeBatch)return;const items=entries().map(x=>({...x,value:''}));if(!confirm('메인/UC 및 캐릭터 프롬프트·UC 총 '+items.length+'개 입력칸을 모두 삭제할까? 이 작업은 자동 복구되지 않아.'))return;safeBatch={items,position:0,busy:false,mode:'clear'};clearStep()});
 btn('전체 순차 적용',()=>{if(safeBatch)return;const items=entries();if(!confirm('총 '+items.length+'개 입력칸을 교체할까? 기존 내용은 자동 복구되지 않아.'))return;safeBatch={items,position:0,busy:false};applyStep()});
 btn('다음 칸 적용',()=>{if(safeBatch)(safeBatch.mode==='clear'?clearStep():applyStep());else report.textContent='진행 중인 작업 없음'});
 btn('적용 취소',()=>{if(safeBatch?.busy){report.textContent='현재 입력이 끝난 후 취소해 줘';return}safeBatch=null;report.textContent='취소됨'});
 btn('입력칸 현황',()=>{report.textContent=entries().map(x=>{const e=editor(x.key);return x.name+': '+(e?(visible(e)?'표시됨':'숨겨짐'):'미생성/식별 실패')}).join('\n')});
 btn('캐릭터 버튼 진단',()=>{report.textContent=JSON.stringify(slots.map(x=>{const bs=[...document.querySelectorAll('.character-prompt-input-'+x.index+' > button')];return {index:x.index,buttons:bs.length,visible:bs.map(b=>b.getBoundingClientRect().width>10),prompt:!!editor('char'+x.index),uc:!!editor('char'+x.index+'uc')}}),null,2)});
 btn('UC 탭 구조 진단',()=>{
  const index=1, a=document.querySelector(selector('char'+index)),b=document.querySelector(selector('char'+index+'uc'));
  if(!a||!b){report.textContent='캐릭터 1 입력칸 DOM 없음';return}
  let scope=a.parentElement;while(scope&&!scope.contains(b))scope=scope.parentElement;
  const describe=e=>({tag:e.tagName,cls:String(e.className||'').slice(0,150),role:e.getAttribute('role'),aria:e.getAttribute('aria-label'),title:e.getAttribute('title'),text:(e.textContent||'').trim().slice(0,90),html:e.outerHTML.slice(0,550),visible:visible(e)});
  const chain=e=>{const arr=[];for(let n=e,i=0;n&&i<6;n=n.parentElement,i++)arr.push(describe(n));return arr};
  const controls=scope?[...scope.querySelectorAll('button,[role="tab"],input[type="radio"],label')].slice(0,45).map(describe):[];
  report.textContent=JSON.stringify({scope:scope?describe(scope):null,promptChain:chain(a),ucChain:chain(b),controls},null,2);
 });
 btn('진단 결과 복사',()=>navigator.clipboard.writeText(report.textContent).catch(e=>report.textContent='복사 실패: '+e.message));
 report.textContent='전송 완료 · 캐릭터 '+slots.length+'명 · 입력칸 '+entries().length+'개\n등록 과정 없이 바로 순차 적용할 수 있어.';
 // Hide the panel completely by default. Reopen from the compact launcher.
 root.style.display='none';
 document.body.append(root);
 const launcher=document.createElement('button');
 launcher.id='nai-bridge-launcher';
 launcher.textContent='NAI ⚙';
 launcher.title='NAI Bridge 열기';
 launcher.style.cssText='position:fixed;right:6px;top:50%;z-index:2147483646;background:#263a55;color:white;border:1px solid #8ab2fa;border-radius:8px 0 0 8px;padding:8px 4px;font:bold 10px system-ui;opacity:.65';
 launcher.onclick=()=>{
  root.style.display=root.style.display==='none'?'block':'none';
  if(root.style.display==='block'){root.style.maxHeight='88vh';root.style.overflow='auto';}
 };
 document.body.append(launcher);
 const closeOverlay=document.createElement('button');
 closeOverlay.id='nai-bridge-hide';
 closeOverlay.textContent='전송창 숨기기 ×';
 closeOverlay.style.cssText='display:none';
 function dismissBridge(e){
  if(e){e.preventDefault();e.stopImmediatePropagation();}
  root.style.display='none';
  root.style.setProperty('pointer-events','none','important');
  closeOverlay.style.setProperty('display','none','important');
  document.querySelectorAll('.nai-bridge-debug-pin').forEach(el=>el.remove());
 }
 // NovelAI can intercept bubbling clicks. Capture touch/pointer events early.
 for(const type of ['pointerdown','touchstart','mousedown','click']){
  closeOverlay.addEventListener(type,dismissBridge,{capture:true,passive:false});
 }
 const globalDismiss=e=>{
  if(e.target===closeOverlay||e.target?.closest?.('#nai-bridge-hide')){
   dismissBridge(e);
  }
 };
 document.addEventListener('pointerdown',globalDismiss,true);
 document.addEventListener('touchstart',globalDismiss,{capture:true,passive:false});
 document.body.append(closeOverlay);

}
let pending=null;
let status='전송 데이터 없음';
function captureHash(){
 if(!location.hash.startsWith(PREFIX)){status='전송 데이터 없음 (주소에 nai-replacer 없음)';return}
 try{
  const encoded=location.hash.slice(PREFIX.length);
  status='전송 주소 감지 ('+encoded.length+'자)';
  pending=JSON.parse(decodeURIComponent(encoded));
  status='전송 데이터 수신 성공';
  history.replaceState(null,'',location.pathname+location.search);
 }catch(e){status='전송 데이터 오류: '+e.message;pending={__error:status}}
}
function showPending(){
 if(!document.body)return;
 let mark=document.getElementById('nai-bridge-ready');
 if(!mark){
  mark=document.createElement('button');mark.id='nai-bridge-ready';
  mark.style.cssText='display:none';
  mark.onclick=()=>alert('NAI Bridge v1.2.12\n'+status+'\n주소 길이: '+location.href.length+'자');
  document.body.append(mark);
 }
 mark.style.display='none';
 mark.textContent='NAI Bridge · '+(pending?'수신됨':status.startsWith('전송 데이터 없음')?'대기 중':'확인 필요');
 if(pending){
  const data=pending;pending=null;
  if(data.__error){mark.textContent='NAI Bridge · 오류';return}
  panel(data);
  mark.textContent='NAI Bridge · 전송 패널 열림';
 }
}
captureHash();
document.addEventListener('DOMContentLoaded',showPending);
window.addEventListener('load',showPending);
window.addEventListener('hashchange',()=>{captureHash();showPending()});
if(document.readyState!=='loading')showPending();
})();
