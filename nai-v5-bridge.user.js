// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      1.1.15
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
 const title=document.createElement('strong');title.textContent='NAI Bridge v1.1.15 · 설정 확인';
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
 const version=document.createElement('div');version.textContent='Bridge v1.1.15 · 입력창 진단';version.style.cssText='font-size:12px;color:#a9c7ff;margin:5px 0';root.append(version);
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
 const imageSection=makeSection('① 이미지 설정 · Image');
 imageSection.open=false;
 settingLine(imageSection,'Width × Height',settings.width&&settings.height?settings.width+' × '+settings.height:undefined);
 settingLine(imageSection,'Seed',settings.seed,true);
 const aiSection=makeSection('② AI 설정 · Generation');
 aiSection.open=false;
 for(const [key,name] of [['steps','Steps'],['scale','Guidance / Scale'],['sampler','Sampler'],['noise_schedule','Noise Schedule'],['cfg_rescale','CFG Rescale']])settingLine(aiSection,name,key==='scale'&&settings[key]!==undefined&&Number.isFinite(Number(settings[key]))?Number(settings[key]).toFixed(1):settings[key]);
 const advancedSection=makeSection('③ Advanced 설정');
 for(const [key,name] of [['sm','SM'],['sm_dyn','SM Dynamic'],['dynamic_thresholding','Dynamic Thresholding'],['skip_cfg_above_sigma','Skip CFG Above Sigma'],['variety_plus','Variety+']])settingLine(advancedSection,name,settings[key]);
 const known=new Set(['width','height','seed','steps','scale','sampler','noise_schedule','cfg_rescale','sm','sm_dyn','dynamic_thresholding','skip_cfg_above_sigma','variety_plus']);
 for(const [key,value] of Object.entries(settings))if(!known.has(key)&&typeof value!=='object')settingLine(advancedSection,key,value);
 const posSection=makeSection('④ 캐릭터 위치 · Character Positions');
 posSection.open=true;
 const slots=bundle.characterPrompts||[];
 if(!slots.length){settingLine(posSection,'위치','캐릭터 슬롯 없음');}
 for(const slot of slots){
  const coords=slot.centers;
  settingLine(posSection,'캐릭터 '+slot.index,Array.isArray(coords)&&coords.length?coords.map(c=>'('+Number(c.x).toFixed(4)+', '+Number(c.y).toFixed(4)+')').join(' / '):'좌표 없음');
 }
 const note=document.createElement('p');
 note.textContent='좌표는 원본 참고용이야. NovelAI 위치 설정에 자동 적용되지 않아.';
 note.style.cssText='font-size:11px;color:#aab8d2';
 posSection.append(note);
 const promptSection=makeSection('⑤ 프롬프트 전송 · 원터치 적용');
 promptSection.open=false;
 const settingsSections=[imageSection,aiSection,advancedSection,posSection];
 const settingsVisibility=()=>{
  const active=promptSection.open;
  for(const section of settingsSections)section.style.display=active?'none':'';
  hint.style.display=active?'none':'';
  version.style.display=active?'none':'';
  if(active){report.textContent='첫 사용: 각 입력칸 직접 지정으로 등록. 이후 원터치 전체 적용을 눌러 줘. 식별이 불확실하면 전체 적용을 중단해.';}
 };
 promptSection.addEventListener('toggle',settingsVisibility);
 settingsVisibility();
 function inspectEditors(){
  document.querySelectorAll('.nai-bridge-debug-pin').forEach(e=>e.remove());
  const els=fields().filter(e=>!root.contains(e));
  const pins=els.map((el,i)=>{
   const pin=document.createElement('span');
   pin.className='nai-bridge-debug-pin';pin.textContent=String(i+1);
   pin.style.cssText='position:fixed;z-index:2147483645;background:#ffcc33;color:#111;border:2px solid #111;border-radius:50%;width:26px;height:26px;text-align:center;line-height:22px;font:bold 15px system-ui;pointer-events:none';
   document.body.append(pin);
   return pin;
  });
  const updatePins=()=>{
   els.forEach((el,i)=>{
    const rect=el.getBoundingClientRect();
    const visible=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
    pins[i].style.display=visible?'block':'none';
    if(visible){pins[i].style.left=Math.max(0,rect.left)+'px';pins[i].style.top=Math.max(0,rect.top)+'px';}
   });
  };
  updatePins();
  const update=()=>requestAnimationFrame(updatePins);
  window.addEventListener('scroll',update,true);
  window.addEventListener('resize',update);
  let remaining=90;
  const follow=()=>{updatePins();if(--remaining>0&&pins.some(p=>p.isConnected))setTimeout(follow,500)};
  setTimeout(follow,500);
  report.textContent='입력창 '+els.length+'개 확인. 화면 밖 숫자는 숨김. NovelAI 아래 프롬프트 패널을 위로 스와이프한 다음 실제 입력창 옆의 번호를 확인해 줘.\n'+els.map((e,i)=>(i+1)+'. '+e.tagName.toLowerCase()+' '+String(e.className).slice(0,35)+' 현재값='+String(e.textContent||'').slice(0,28)).join('\n');
 }

 function btn(name,fn){const b=document.createElement('button');b.textContent=name;b.style.cssText='padding:9px;margin:4px 2px;background:#5276d8;color:white;border:0;border-radius:6px;font-size:12px';b.onclick=fn;promptSection.append(b)}
 const mapKey='nai-bridge-v107-field-map';
 const readMap=()=>{try{return JSON.parse(localStorage.getItem(mapKey)||'{}')}catch{return {}}};
 const writeMap=map=>{try{localStorage.setItem(mapKey,JSON.stringify(map))}catch(e){report.textContent='입력칸 저장 실패: '+e.message}};
 function fieldSignature(el){
  const attrs=['data-testid','data-test-id','aria-label','placeholder','name','id'];
  const attr=attrs.map(k=>[k,el.getAttribute(k)]).filter(([k,v])=>v&&v.length<120&&!/^nai-bridge/i.test(v));
  const parent=el.closest('[data-testid],[data-test-id],[aria-label]');
  const context=parent&&parent!==el?['parent',parent.tagName.toLowerCase(),parent.getAttribute('data-testid')||parent.getAttribute('data-test-id')||parent.getAttribute('aria-label')||'']:null;
  return {tag:el.tagName.toLowerCase(),attrs,context,editable:el.isContentEditable};
 }
 function matchesSignature(el,sig){
  if(!sig||el.tagName.toLowerCase()!==sig.tag||!!el.isContentEditable!==!!sig.editable)return false;
  if(!Array.isArray(sig.attrs)||!sig.attrs.length)return false;
  if(!sig.attrs.every(([k,v])=>el.getAttribute(k)===v))return false;
  if(sig.context){const p=el.closest('[data-testid],[data-test-id],[aria-label]');if(!p||p===el||p.tagName.toLowerCase()!==sig.context[1]||(p.getAttribute('data-testid')||p.getAttribute('data-test-id')||p.getAttribute('aria-label')||'')!==sig.context[2])return false}
  return true;
 }
 function resolveField(key,map,used){
  const sig=map[key];if(!sig)return {error:'미등록'};
  const all=fields().filter(el=>!root.contains(el)&&matchesSignature(el,sig));
  if(all.length!==1)return {error:all.length?'동일 식별자 '+all.length+'개':'입력칸 없음/숨김'};
  if(used.has(all[0]))return {error:'다른 항목과 입력칸 중복'};
  return {el:all[0]};
 }
 const entries=()=>[{key:'main',name:'메인',value:bundle.description||''},{key:'uc',name:'메인 UC',value:bundle.negativePrompt||''},...(bundle.characterPrompts||[]).flatMap(slot=>[{key:'char'+slot.index,name:'캐릭터 '+slot.index+' 프롬프트',value:slot.prompt||''},{key:'char'+slot.index+'uc',name:'캐릭터 '+slot.index+' UC',value:slot.negativePrompt||''}])];
 async function applyWithCharacterOpening(clearMode=false){
  const items=entries();
  if(!items.length){report.textContent='전송할 항목이 없어';return}
  if(!confirm((clearMode?'원터치 전체 삭제':'원터치 전체 적용')+' · 캐릭터 편집창을 자동으로 열어 순서대로 처리할까?\\nNovelAI 내부 저장은 적용 후 직접 확인해 줘.'))return;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const selectorFor=key=>{
   if(key==='main')return '.prompt-input-box-base-prompt';
   if(key==='uc')return '.prompt-input-box-undesired-content';
   const m=/^char(\d+)(uc)?$/.exec(key);
   return m?'.prompt-input-box-character-prompts-'+m[1]+(m[2]?'-undesired-content':''):null;
  };
  const find=key=>{
   const selector=selectorFor(key);
   const matches=selector?[...document.querySelectorAll(selector+' .ProseMirror[contenteditable="true"]')]:[];
   if(matches.length!==1)throw Error(key+': 입력칸 '+matches.length+'개 발견');
   return matches[0];
  };
  const history=[];
  let currentStep='시작';
  let completed=0;
  let activeCharacter=null;
  const openCharacter=async index=>{
   const target='.character-prompt-input-'+index+' > button';
   const buttons=[...document.querySelectorAll(target)];
   if(buttons.length!==1)throw Error('캐릭터 '+index+' 열기 버튼 '+buttons.length+'개 발견');
   buttons[0].click();
   for(let n=0;n<12;n++){
    await pause(120);
    if(document.querySelector('.prompt-input-box-character-prompts-'+index+' .ProseMirror[contenteditable="true"]')){await pause(350);return;}
   }
   throw Error('캐릭터 '+index+' 편집창 열림 확인 실패');
  };
  const applyItem=async item=>{
   currentStep=item.name;
   const el=find(item.key);
   const before=el.innerText;
   const next=clearMode?'':String(item.value);
   el.scrollIntoView({block:'nearest'});
   el.focus();
   await pause(220);
   if(document.activeElement!==el)throw Error('편집기 포커스 실패');
   setReactValue(el,next);
   if(el.innerText.trim()!==next.trim())throw Error(item.name+' 입력 결과 검증 실패');
   history.push({key:item.key,previous:before});
   completed++;
  };
  try{
   for(const item of items.filter(x=>x.key==='main'||x.key==='uc'))await applyItem(item);
   const charIndexes=[...new Set(items.map(x=>/^char(\d+)/.exec(x.key)?.[1]).filter(Boolean))];
   for(const index of charIndexes){
    const group=items.filter(x=>x.key==='char'+index||x.key==='char'+index+'uc');
    const wasOpen=!!document.querySelector('.prompt-input-box-character-prompts-'+index+' .ProseMirror[contenteditable="true"]');
    if(!wasOpen)await openCharacter(index);
    activeCharacter=index;
    for(const item of group)await applyItem(item);
    if(!wasOpen){
     const closeButtons=[...document.querySelectorAll('.character-prompt-input-'+index+' > button')];
     if(closeButtons.length===1){closeButtons[0].click();await pause(180)}
    }
    activeCharacter=null;
   }
   report.textContent='자동 입력 '+completed+'개 완료 · 편집창 자동 열기/닫기 시도 성공. 탭 재진입 후 값 유지 여부를 확인해 줘.';
  }catch(err){
   report.textContent='자동 입력 '+completed+'개 후 중단 · 실패 위치: '+currentStep+' · '+err.message+'\\n부분 적용되었을 수 있어. 화면에서 확인해 줘. 자동 복구는 하지 않았어.';
  }
 }
 function applyByVerifiedClasses(clearMode=false){
  const items=entries();
  const selectorFor=key=>{
   if(key==='main')return '.prompt-input-box-base-prompt';
   if(key==='uc')return '.prompt-input-box-undesired-content';
   const m=/^char(\d+)(uc)?$/.exec(key);
   if(!m)return null;
   return '.prompt-input-box-character-prompts-'+m[1]+(m[2]?'-undesired-content':'');
  };
  const targets=[],errors=[],used=new Set();
  for(const item of items){
   const selector=selectorFor(item.key);
   const found=selector?[...document.querySelectorAll(selector+' .ProseMirror[contenteditable="true"]')]:[];
   if(found.length!==1){errors.push(item.name+': 편집기 '+found.length+'개 발견');continue}
   const el=found[0];
   if(used.has(el)){errors.push(item.name+': 입력칸 중복');continue}
   used.add(el);targets.push({...item,el});
  }
  if(errors.length){report.textContent='일괄 처리 중단 · 아무것도 변경하지 않았어.\\n'+errors.join('\\n');return}
  if(!targets.length){report.textContent='전송할 항목이 없어';return}
  if(!confirm((clearMode?'전체 프롬프트 삭제':'전체 프롬프트 적용')+' · '+targets.length+'개 입력칸을 교체할까?\\n숨겨진 입력칸은 NovelAI 저장 반영 여부를 반드시 확인해야 해.'))return;
  const previous=targets.map(x=>({el:x.el,value:x.el.innerText}));
  let applied=0;
  try{
   for(const item of targets){
    setReactValue(item.el,clearMode?'':item.value);
    const expected=clearMode?'':String(item.value);
    if(item.el.innerText.trim()!==expected.trim())throw Error(item.name+' 편집기 값 검증 실패');
    applied++;
   }
   report.textContent=targets.length+'개 입력칸 DOM 교체 성공. NovelAI 상태 저장 여부는 아직 미검증이야. 탭을 전환해 값이 유지되는지 확인해 줘.';
  }catch(err){
   for(let i=applied-1;i>=0;i--)try{setReactValue(previous[i].el,previous[i].value)}catch{}
   report.textContent='일괄 처리 실패: '+err.message+' · 변경한 칸의 복구를 시도했어. NovelAI에서 확인해 줘.';
  }
 }
 function applyAll(){
  const map=readMap(),used=new Set(),ready=[],issues=[];
  for(const item of entries()){
   const match=resolveField(item.key,map,used);
   if(match.error){issues.push(item.name+': '+match.error);continue}
   used.add(match.el);ready.push({...item,el:match.el});
  }
  if(issues.length){report.textContent='자동 적용 중단 · 아무것도 변경하지 않았어.\n'+issues.join('\n')+'\n\n각 입력칸을 열고 아래 직접 지정 버튼으로 등록해 줘.';return}
  const question=ready.map(x=>x.name).join(', ');
  if(!confirm('식별된 '+ready.length+'개 입력칸의 기존 내용을 모두 교체할까?\n'+question))return;
  const snapshots=ready.map(x=>({el:x.el,value:x.el.isContentEditable?x.el.innerText:x.el.value}));
  let completed=0;
  try{for(const x of ready){setReactValue(x.el,x.value);completed++}
   report.textContent='전체 '+completed+'개 입력 시도 완료. NovelAI의 실제 반영 결과를 확인해 줘.';
  }catch(err){
   for(let i=completed-1;i>=0;i--)try{setReactValue(snapshots[i].el,snapshots[i].value)}catch{}
   report.textContent='입력 실패: '+err.message+' · 이전 입력값 복구를 시도했어. 화면을 확인해 줘.';
  }
 }
 function selectTarget(kind,value,key){
  report.textContent=kind+' 입력칸을 NovelAI 화면에서 직접 터치해 줘. 선택한 칸에만 입력해.';
  const hidden=[...document.querySelectorAll('#nai-bridge-panel,#nai-bridge-launcher,#nai-bridge-hide')].map(el=>({el,display:el.style.display}));
  hidden.forEach(({el})=>el.style.setProperty('display','none','important'));
  const restore=()=>hidden.forEach(({el,display})=>{el.style.removeProperty('display');el.style.display=display});
  const handler=e=>{
   const el=e.target.closest('textarea,input[type="text"],[contenteditable="true"],[role="textbox"]');
   if(!el||root.contains(el))return;
   e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('pointerdown',handler,true);
   restore();
   try{setReactValue(el,value);if(key){const sig=fieldSignature(el);if(sig.attrs.length){const map=readMap();map[key]=sig;writeMap(map);report.textContent=kind+' 교체 시도 및 입력칸 등록 완료.'}else{report.textContent=kind+' 교체 시도 완료. 이 입력칸에는 안정적인 식별 속성이 없어 자동 등록하지 않았어.'}}else{report.textContent=kind+' 기존 내용 전체 교체 시도 완료.'}}catch(err){report.textContent=kind+' 교체 실패: '+err.message}
  };
  setTimeout(()=>document.addEventListener('pointerdown',handler,true),300);
  setTimeout(()=>{if(root.style.display==='none'&&launcher.style.display==='none'){document.removeEventListener('pointerdown',handler,true);restore();report.textContent=kind+' 선택 시간 초과 · 다시 시도해 줘.'}},30000);
 }
 function strictField(kind){
  const candidates=fields().filter(e=>!root.contains(e));
  const isNegative=e=>/^(?:negative prompt|undesired content|negative|uc|ネガティブプロンプト|ネガティブ|부정 프롬프트)$/i.test([e.getAttribute('aria-label'),e.getAttribute('placeholder')].filter(Boolean).join(' ').trim());
  const isMain=e=>/^(?:prompt|main prompt|プロンプト|메인 프롬프트)$/i.test([e.getAttribute('aria-label'),e.getAttribute('placeholder')].filter(Boolean).join(' ').trim());
  const matches=candidates.filter(kind==='UC'?isNegative:isMain);
  return matches.length===1?matches[0]:null;
 }

 async function autoTransfer(){
  // DOM order is not stable across NovelAI mobile tabs and bottom-sheet states.
  // Do not write any prompt automatically until semantic field identity is proven.
  report.textContent='안전 모드: 자동 입력 중지. V0.9.7에서 메인과 UC가 뒤바뀐 문제가 확인됐어. 아래 직접 지정 버튼으로 입력칸을 선택해 줘.';
 }

 let sequenceCleanup=null;
 function beginSequential(clearMode=false){
  if(sequenceCleanup){sequenceCleanup();sequenceCleanup=null}
  const all=entries(),map=readMap(),done=new Set();
  if(clearMode&&!confirm('메인·UC·캐릭터별 프롬프트/UC를 전부 비우는 모드를 시작할까?\nNovelAI 입력칸을 하나씩 터치하면 내용이 삭제돼.'))return;
  const missing=all.filter(x=>!map[x.key]);
  if(missing.length){report.textContent='먼저 입력칸 등록 필요: '+missing.map(x=>x.name).join(', ');return}
  function activeKind(el){
   const dialog=el.closest('[role="dialog"],[aria-modal="true"]');
   const headingText=dialog?dialog.innerText.slice(0,350):'';
   const own=[el.getAttribute('aria-label'),el.getAttribute('placeholder'),el.closest('[aria-label]')?.getAttribute('aria-label')].filter(Boolean).join(' ');
   const text=(own+' '+headingText).toLowerCase();
   const isUc=/undesired content|negative prompt|negative prompts|네거티브|부정 프롬프트/.test(text);
   const isBase=/base prompt|main prompt|기본 프롬프트|메인 프롬프트/.test(text);
   if(isUc&&isBase)return null;
   if(isUc)return 'uc';
   if(isBase)return 'main';
   return null;
  }
  const bar=document.createElement('div');
  bar.id='nai-bridge-sequence';
  bar.style.cssText='position:fixed;bottom:70px;left:8px;right:8px;z-index:2147483647;background:#17243a;color:white;border:2px solid #91b8ff;border-radius:12px;padding:10px;display:flex;align-items:center;gap:8px;font:12px system-ui;box-shadow:0 4px 20px #000a';
  const info=document.createElement('span');info.style.cssText='flex:1;white-space:normal';
  const cancel=document.createElement('button');cancel.textContent='중지';cancel.style.cssText='padding:9px;background:#8c3650;color:white;border:0;border-radius:7px';
  const manual=document.createElement('button');manual.textContent='직접 지정';manual.style.cssText='padding:9px;background:#486ca9;color:white;border:0;border-radius:7px';
  bar.append(info,manual,cancel);document.body.append(bar);
  let lastTouched=null;
  manual.onclick=()=>{
   const remaining=all.filter(x=>!done.has(x.key));
   if(!lastTouched||!lastTouched.isConnected){render('먼저 NovelAI 입력칸을 터치해 줘');return}
   const old=document.getElementById('nai-bridge-picker');if(old)old.remove();
   const picker=document.createElement('div');picker.id='nai-bridge-picker';
   picker.style.cssText='position:fixed;left:10px;right:10px;bottom:145px;max-height:50vh;overflow:auto;z-index:2147483647;background:#17243a;color:white;border:2px solid #91b8ff;border-radius:12px;padding:12px;box-shadow:0 6px 24px #000b;font:14px system-ui';
   const heading=document.createElement('div');heading.textContent='방금 터치한 입력칸의 항목 선택';heading.style.cssText='font-weight:700;margin-bottom:10px';picker.append(heading);
   const options=document.createElement('div');options.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px';
   const kind=activeKind(lastTouched);
   const offered=kind?remaining.filter(x=>x.key===kind):remaining;
   if(kind&&!offered.length){render('현재 입력칸의 항목은 이미 처리했어');return}
   for(const item of offered){
    const choice=document.createElement('button');choice.textContent=item.name;choice.style.cssText='padding:12px 6px;min-height:44px;background:#486ec3;color:white;border:0;border-radius:8px;font:12px system-ui';
    choice.onclick=()=>{
     if(!confirm(item.name+(clearMode?' 내용을 비울까?':' 프롬프트로 교체할까?')))return;
     if(!lastTouched||!lastTouched.isConnected){render('입력칸이 닫혔어. 다시 선택해 줘');picker.remove();return}
     try{setReactValue(lastTouched,clearMode?'':item.value);done.add(item.key);picker.remove();render(item.name+' 직접 지정 처리 완료');if(done.size===all.length)stop()}
     catch(err){render('직접 지정 실패: '+err.message)}
    };
    options.append(choice);
   }
   picker.append(options);
   const dismiss=document.createElement('button');dismiss.textContent='닫기';dismiss.style.cssText='margin-top:10px;padding:9px 16px;background:#39475d;color:white;border:0;border-radius:8px';dismiss.onclick=()=>picker.remove();picker.append(dismiss);
   document.body.append(picker);
  };
  const render=msg=>{info.textContent=(clearMode?'순차 전체 지우기 ':'순차 적용 ')+done.size+'/'+all.length+' · '+msg};
  const stop=()=>{document.removeEventListener('pointerdown',onPointer,true);document.getElementById('nai-bridge-picker')?.remove();bar.remove();root.style.display='none';launcher.style.display='block';sequenceCleanup=null;report.textContent=(clearMode?'순차 지우기':'순차 적용')+' 종료 · '+done.size+'/'+all.length+'개 처리 시도 완료'};
  sequenceCleanup=stop;cancel.onclick=stop;
  root.style.display='none';launcher.style.display='none';
  render(clearMode?'지울 입력칸을 하나씩 터치해 줘':'NovelAI에서 적용할 입력칸을 직접 터치해 줘');
  function onPointer(e){
   if(bar.contains(e.target)||root.contains(e.target))return;
   const el=e.target.closest?.('textarea,input[type="text"],[contenteditable="true"],[role="textbox"]');
   if(!el||!el.getClientRects().length)return;
   lastTouched=el;
   const candidates=all.filter(x=>!done.has(x.key)&&matchesSignature(el,map[x.key]));
   const registered=all.filter(x=>matchesSignature(el,map[x.key]));
   const kind=activeKind(el);
   if(candidates.length!==1||registered.length!==1||!kind||candidates[0].key!==kind){render('자동 식별 불확실 · 아래 직접 지정으로 항목을 선택해 줘');return}
   const item=candidates[0];
   const matches=fields().filter(x=>matchesSignature(x,map[item.key]));
   if(matches.length!==1||matches[0]!==el){render(item.name+' 식별자 중복 · 직접 지정 버튼 사용');return}
   e.preventDefault();e.stopImmediatePropagation();
   try{setReactValue(el,clearMode?'':item.value);done.add(item.key);render(item.name+(clearMode?' 비우기':' 적용')+' 시도 완료 · 다음 칸을 열어 터치해 줘');
    if(done.size===all.length){stop();report.textContent='전체 '+all.length+'개 '+(clearMode?'비우기':'입력')+' 시도 완료. NovelAI 화면에서 확인해 줘.'}
   }catch(err){render(item.name+' 실패: '+err.message+' · 해당 칸은 미완료')}
  }
  document.addEventListener('pointerdown',onPointer,true);
 }
 btn('원터치 전체 적용 · 안전 중지',()=>{report.textContent='안전 중지: 캐릭터 편집기의 포커스와 입력 위치가 불안정해서 자동 적용을 비활성화했어. 기존 입력을 확인하고 직접 지정 방식으로 진행해 줘.'});
 btn('원터치 전체 삭제 · 안전 중지',()=>{report.textContent='안전 중지: 잘못된 입력칸 삭제를 방지하기 위해 자동 삭제를 비활성화했어.'});


 btn('모바일 순차 적용 시작 · 권장',()=>beginSequential(false));
 btn('전체 프롬프트 지우기 · 순차',()=>beginSequential(true));

 btn('입력칸 등록 현황',()=>{const map=readMap();report.textContent=entries().map(x=>x.name+': '+(map[x.key]?'등록됨':'미등록')).join('\n')+'\n등록된 입력칸도 현재 화면에서 고유하게 식별되지 않으면 적용하지 않아.'});
 btn('입력칸 등록 초기화',()=>{if(confirm('저장된 입력칸 식별 정보를 모두 지울까?')){localStorage.removeItem(mapKey);report.textContent='입력칸 등록 초기화 완료'}});
 function diagnoseTouchedEditor(){
  report.textContent='진단 대기 중 · NovelAI에서 확인할 입력칸을 한 번 터치해 줘. 프롬프트 내용은 수집하지 않아.';
  root.style.display='none';launcher.style.display='none';
  const restore=()=>{root.style.display='block';launcher.style.display='block'};
  let active=true;
  const timeout=setTimeout(()=>{if(active){active=false;document.removeEventListener('pointerdown',handler,true);restore();report.textContent='진단 시간 초과 · 다시 실행해 줘'}},30000);
  const safeAttrs=el=>{
   const result={};
   for(const k of ['role','aria-label','aria-labelledby','aria-controls','data-testid','data-test-id','placeholder','contenteditable','type','name']){
    const v=el.getAttribute?.(k);
    if(v&&v.length<100)result[k]=v;
   }
   return result;
  };
  const handler=e=>{
   const el=e.target.closest?.('textarea,input,[contenteditable="true"],[role="textbox"]');
   if(!el||el.closest('#nai-bridge-panel'))return;
   active=false;clearTimeout(timeout);document.removeEventListener('pointerdown',handler,true);restore();
   const ancestors=[];let p=el;
   for(let i=0;i<6&&p;i++,p=p.parentElement){
    const headings=[...p.querySelectorAll(':scope > label,:scope > h1,:scope > h2,:scope > h3,:scope > header,:scope > [role="heading"]')].slice(0,4).map(x=>x.textContent?.trim().slice(0,80)).filter(Boolean);
    ancestors.push({tag:p.tagName.toLowerCase(),classNames:[...p.classList].filter(x=>x.length<65).slice(0,5),attrs:safeAttrs(p),headings});
   }
   const editors=[...document.querySelectorAll('textarea,input,[contenteditable="true"],[role="textbox"]')].filter(x=>!x.closest('#nai-bridge-panel'));
   const data={bridgeVersion:'1.1.15',editor:{tag:el.tagName.toLowerCase(),attrs:safeAttrs(el),visible:!!el.getClientRects().length,editable:el.isContentEditable},ancestors,editorCounts:{total:editors.length,visible:editors.filter(x=>x.getClientRects().length).length},note:'본문/입력값/계정정보 제외'};
   const json=JSON.stringify(data,null,2);
   report.textContent='진단 완료 · 아래 결과를 복사해 채팅에 붙여넣어 줘.\\n'+json;
   const copy=document.createElement('button');copy.textContent='진단 결과 복사';copy.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(json);copy.textContent='복사 완료 ✓'}catch{report.textContent+='\\n복사 실패 · 결과를 길게 눌러 복사해 줘'}};
   report.prepend(copy);
  };
  document.addEventListener('pointerdown',handler,true);
 }
 function diagnoseCharacterOpener(){
  report.textContent='버튼 진단 대기 중 · 캐릭터 편집창을 여는 버튼을 한 번 터치해 줘. 입력 내용은 수집하지 않아.';
  root.style.display='none';launcher.style.display='none';
  const restore=()=>{root.style.display='block';launcher.style.display='block'};
  let active=true;
  const finish=(message)=>{if(!active)return;active=false;clearTimeout(timeout);document.removeEventListener('pointerdown',handler,true);restore();if(message)report.textContent=message};
  const timeout=setTimeout(()=>finish('버튼 진단 시간 초과 · 다시 실행해 줘'),30000);
  const safeAttrs=el=>{
   const out={};
   for(const k of ['role','type','aria-expanded','aria-haspopup','data-testid','data-test-id','title','tabindex']){
    const v=el.getAttribute?.(k);if(v&&v.length<80)out[k]=v;
   }
   return out;
  };
  const describe=el=>({tag:el.tagName.toLowerCase(),classNames:[...el.classList].filter(x=>x.length<65).slice(0,8),attrs:safeAttrs(el)});
  const handler=e=>{
   if(!e.target?.closest||e.target.closest('#nai-bridge-panel,#nai-bridge-launcher'))return;
   const target=e.target;
   const clickable=target.closest('button,[role="button"],[role="tab"],summary,a,[aria-expanded]')||target;
   const ancestors=[];let p=clickable;
   for(let i=0;i<11&&p;i++,p=p.parentElement){
    const siblings=p.parentElement?[...p.parentElement.children]:[];
    ancestors.push({...describe(p),siblingIndex:siblings.indexOf(p),siblingCount:siblings.length});
   }
   const siblings=clickable.parentElement?[...clickable.parentElement.children]:[];
   const data={bridgeVersion:'1.1.15',diagnostic:'character-opener',touched:describe(target),clickable:describe(clickable),ancestors,neighborElements:siblings.slice(Math.max(0,siblings.indexOf(clickable)-2),siblings.indexOf(clickable)+3).map(describe),note:'텍스트·프롬프트·URL·계정정보·ID 속성 제외'};
   const json=JSON.stringify(data,null,2);
   finish();
   report.textContent='버튼 진단 완료 · 아래 결과를 복사해서 채팅에 붙여넣어 줘.\\n'+json;
   const copy=document.createElement('button');copy.textContent='진단 결과 복사';copy.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(json);copy.textContent='복사 완료 ✓'}catch{report.textContent+='\\n복사 실패 · 결과를 길게 눌러 복사해 줘'}};
   report.prepend(copy);
  };
  document.addEventListener('pointerdown',handler,true);
 }
 function diagnoseEditorInternals(){
  const keys=[['main','.prompt-input-box-base-prompt'],['uc','.prompt-input-box-undesired-content'],['char1','.prompt-input-box-character-prompts-1'],['char1uc','.prompt-input-box-character-prompts-1-undesired-content'],['char2','.prompt-input-box-character-prompts-2'],['char2uc','.prompt-input-box-character-prompts-2-undesired-content']];
  const safe=el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   const own=Object.getOwnPropertyNames(el);
   const desc=el.pmViewDesc;
   const view=desc?.view||el.__pmView?.view||null;
   return {connected:el.isConnected,contenteditable:el.getAttribute('contenteditable'),rect:{width:Math.round(rect.width),height:Math.round(rect.height)},display:style.display,visibility:style.visibility,focused:document.activeElement===el,hasPmViewDesc:!!desc,pmViewDescType:desc?.constructor?.name||null,hasAccessibleEditorView:!!(view?.state&&view?.dispatch),ownPropertyNamesFiltered:own.filter(k=>['pmViewDesc','__pmView','editorView','view'].includes(k))};
  };
  const fields=keys.map(([key,selector])=>{const containers=[...document.querySelectorAll(selector)];const editors=[...document.querySelectorAll(selector+' .ProseMirror[contenteditable="true"]')];return {key,containerCount:containers.length,editorCount:editors.length,editors:editors.map(safe)}});
  const characterButtons=[1,2].map(index=>{const region=document.querySelector('.character-prompt-input-'+index);const buttons=region?[...region.querySelectorAll(':scope > button')]:[];return {index,regionPresent:!!region,buttonCount:buttons.length,regionVisible:!!region?.getClientRects().length,buttonVisible:buttons.map(b=>!!b.getClientRects().length)}});
  const json=JSON.stringify({bridgeVersion:'1.1.15',diagnostic:'prosemirror-readonly',fields,characterButtons,note:'읽기 전용. 프롬프트 본문·문서 상태·계정정보·URL 미수집. EditorView 존재 여부만 확인.'},null,2);
  report.textContent='ProseMirror 구조 진단 완료 · 아래 결과를 복사해 줘.\n'+json;
  const copy=document.createElement('button');copy.textContent='구조 진단 결과 복사';copy.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(json);copy.textContent='복사 완료 ✓'}catch{report.textContent+='\n복사 실패 · 결과를 길게 눌러 복사해 줘'}};
  report.prepend(copy);
 }
 btn('ProseMirror 내부 구조 진단 · 읽기 전용',diagnoseEditorInternals);
 function armTabTransitionDiagnosis(){
  const selectors=[['main','.prompt-input-box-base-prompt'],['uc','.prompt-input-box-undesired-content'],['char1','.prompt-input-box-character-prompts-1'],['char1uc','.prompt-input-box-character-prompts-1-undesired-content'],['char2','.prompt-input-box-character-prompts-2'],['char2uc','.prompt-input-box-character-prompts-2-undesired-content']];
  const safeNode=e=>{if(!e||e.nodeType!==1)return null;const st=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),role:e.getAttribute('role'),ariaSelected:e.getAttribute('aria-selected'),ariaExpanded:e.getAttribute('aria-expanded'),ariaHidden:e.getAttribute('aria-hidden'),dataState:e.getAttribute('data-state'),classTokens:[...e.classList].filter(c=>/^(active|selected|hidden|tab|prompt|character|uc|undesired|ProseMirror)/i.test(c)).slice(0,12),visibility:st.visibility,display:st.display,rect:[Math.round(r.width),Math.round(r.height)]}};
  const snapshot=()=>selectors.map(([key,selector])=>{const c=document.querySelector(selector),e=c?.querySelector('.ProseMirror[contenteditable="true"]');return {key,container:safeNode(c),editor:safeNode(e)}});
  const before=snapshot();
  report.textContent='탭 전환 진단 대기 중 · 이제 NovelAI 화면에서 캐릭터 1 UC 탭을 직접 눌러줘. 입력 내용은 수집하지 않아.';
  let completed=false;
  const handler=event=>{
   if(completed)return;
   const target=event.target;
   if(!(target instanceof Element))return;
   if(target.closest('#nai-bridge-panel,[id^="nai-replacer"]'))return;
   completed=true;document.removeEventListener('pointerdown',handler,true);
   const targetPath=[];let n=target;
   for(let i=0;i<5&&n;i++,n=n.parentElement)targetPath.push(safeNode(n));
   setTimeout(()=>{
    const after=snapshot();
    const result=JSON.stringify({bridgeVersion:'1.1.15',diagnostic:'tab-transition-readonly',before,after,tappedElementPath:targetPath,note:'사용자가 직접 누른 첫 번째 페이지 요소의 구조만 수집. 텍스트·프롬프트·URL·계정정보 제외.'},null,2);
    report.textContent='탭 전환 진단 완료\n'+result;
    const copy=document.createElement('button');copy.textContent='탭 진단 결과 복사';copy.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(result);copy.textContent='복사 완료 ✓'}catch{report.textContent+='\n복사 실패 · 결과를 길게 눌러 복사해 줘'}};
    report.prepend(copy);
   },500);
  };
  document.addEventListener('pointerdown',handler,true);
  setTimeout(()=>{if(!completed){document.removeEventListener('pointerdown',handler,true);report.textContent='탭 전환 진단 시간 초과 · 다시 실행해 줘.'}},30000);
 }
 btn('UC 탭 전환 구조 진단 · 읽기 전용',armTabTransitionDiagnosis);

 function armInputEventDiagnosis(){
  const fields=[['main','.prompt-input-box-base-prompt'],['uc','.prompt-input-box-undesired-content'],['char1','.prompt-input-box-character-prompts-1'],['char1uc','.prompt-input-box-character-prompts-1-undesired-content'],['char2','.prompt-input-box-character-prompts-2'],['char2uc','.prompt-input-box-character-prompts-2-undesired-content']];
  const resolve=e=>{if(!(e.target instanceof Element))return null;for(const [key,sel] of fields){const host=e.target.closest(sel+' .ProseMirror[contenteditable="true"]');if(host)return key}return null};
  const events=[],counts={};let finished=false;
  const types=['beforeinput','input','paste','compositionstart','compositionupdate','compositionend','keydown','keyup','focusin','focusout','selectionchange'];
  const handler=e=>{
   if(finished)return;
   const key=e.type==='selectionchange'?fields.find(([k,sel])=>document.activeElement?.matches?.(sel+' .ProseMirror[contenteditable="true"]'))?.[0]:resolve(e);
   if(!key)return;
   const inputType=e instanceof InputEvent?e.inputType||null:null;
   const id=[key,e.type,inputType||''].join('|');
   counts[id]=(counts[id]||0)+1;
   if(events.length<90)events.push({field:key,type:e.type,inputType,isTrusted:e.isTrusted,composing:typeof e.isComposing==='boolean'?e.isComposing:null,defaultPrevented:e.defaultPrevented});
  };
  for(const t of types)document.addEventListener(t,handler,true);
  report.textContent='입력 이벤트 진단 중 (20초). NovelAI의 활성 캐릭터 프롬프트에 짧은 테스트 문자를 직접 입력하거나 직접 붙여넣어 줘. 실제 글자·키·클립보드 내용은 기록하지 않아.';
  const finish=()=>{
   if(finished)return;finished=true;
   for(const t of types)document.removeEventListener(t,handler,true);
   const json=JSON.stringify({bridgeVersion:'1.1.15',diagnostic:'input-event-readonly',events,counts,note:'입력값·키 이름·문서 내용·클립보드·URL 수집 안 함. 이벤트 종류와 필드만 기록.'},null,2);
   report.textContent='입력 이벤트 진단 완료\n'+json;
   const copy=document.createElement('button');copy.textContent='입력 이벤트 진단 결과 복사';copy.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(json);copy.textContent='복사 완료 ✓'}catch{report.textContent+='\n복사 실패 · 결과를 길게 눌러 복사해 줘'}};
   report.prepend(copy);
  };
  setTimeout(finish,20000);
 }
 btn('입력 이벤트 진단 · 읽기 전용 20초',armInputEventDiagnosis);

 async function testCharacter2Paste(){
  const sel='.prompt-input-box-character-prompts-2 .ProseMirror[contenteditable="true"]';
  const el=document.querySelector(sel),sample='NAI_BRIDGE_TEST_114';
  if(!el){report.textContent='중단: 캐릭터 2 프롬프트 편집기를 찾지 못함';return}
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(rect.width<30||rect.height<10||style.visibility!=='visible'||style.display==='none'){
   report.textContent='중단: 캐릭터 2 일반 프롬프트가 화면에 활성화되지 않음';return;
  }
  if(el.textContent.trim()||el.querySelector('img,br[data-hard-break],hr')){
   report.textContent='중단: 캐릭터 2 편집기에 기존 내용이 있음. 테스트는 완전히 빈 칸에서만 가능';return;
  }
  if(!window.confirm('캐릭터 2의 빈 일반 프롬프트에 '+sample+' 문자열을 한 번 입력하는 실험을 할까?\n다른 프롬프트는 수정하지 않으며 테스트 문자열은 직접 삭제해야 해.'))return;
  el.focus();
  if(document.activeElement!==el||el.getBoundingClientRect().width<30||el.textContent.trim()){
   report.textContent='중단: 포커스 또는 빈 편집기 재검증 실패';return;
  }
  const data=new DataTransfer();data.setData('text/plain',sample);
  const ev=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});
  let dispatched=false,error=null;
  try{dispatched=el.dispatchEvent(ev)}catch(e){error=String(e)}
  const immediately=el.textContent.trim()===sample;
  await new Promise(resolve=>setTimeout(resolve,700));
  const after=el.textContent.trim()===sample;
  const active=document.activeElement===el;
  const result={bridgeVersion:'1.1.15',test:'char2-synthetic-paste',field:'char2',precondition:'empty and visible',sample,syntheticEventTrusted:ev.isTrusted,dispatchEventReturn:dispatched,defaultPrevented:ev.defaultPrevented,immediateMatch:immediately,after700msMatch:after,stillFocused:active,error,note:'DOM 일치만 확인. ProseMirror 내부 상태 및 서버 저장 여부는 미검증. 문자열은 직접 삭제 필요.'};
  report.textContent=JSON.stringify(result,null,2);
  const b=document.createElement('button');b.textContent='실험 결과 복사';b.style.cssText='padding:9px;margin:8px 0;background:#5276d8;color:white;border:0;border-radius:6px';b.onclick=()=>navigator.clipboard.writeText(JSON.stringify(result,null,2));report.prepend(b);
 }
 btn('실험: 빈 캐릭터 2에 테스트 문자열 입력 (확인 필요)',testCharacter2Paste);

 let safeBatch=null;
 const batchSelector=key=>{
  if(key==='main')return '.prompt-input-box-base-prompt';
  if(key==='uc')return '.prompt-input-box-undesired-content';
  const m=/^char(\d+)(uc)?$/.exec(key);
  return m?'.prompt-input-box-character-prompts-'+m[1]+(m[2]?'-undesired-content':''):null;
 };
 const batchVisible=el=>{
  const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
  return r.width>30&&r.height>10&&cs.visibility==='visible'&&cs.display!=='none';
 };
 async function safeBatchStep(){
  const run=safeBatch;if(!run||run.busy)return;run.busy=true;
  try{
   while(run.position<run.items.length){
    const item=run.items[run.position],sel=batchSelector(item.key);
    const found=[...document.querySelectorAll(sel+' .ProseMirror[contenteditable="true"]')];
    if(found.length!==1)throw Error(item.name+': 고유 편집기 식별 실패 ('+found.length+')');
    let el=found[0];
    if(!batchVisible(el)){
     const m=/^char(\d+)/.exec(item.key);
     if(m){
      const container=document.querySelector('.prompt-input-box-character-prompts-'+m[1]+' .ProseMirror[contenteditable="true"]');
      if(container&&!batchVisible(container)){
       const btns=[...document.querySelectorAll('.character-prompt-input-'+m[1]+' > button')];
       if(btns.length===1){btns[0].click();await delay(350)}
      }
     }
     el=document.querySelector(sel+' .ProseMirror[contenteditable="true"]');
    }
    if(!el||!batchVisible(el)){
     report.textContent='일시정지 '+(run.position+1)+'/'+run.items.length+' · '+item.name+' 탭을 NovelAI에서 직접 열고 [다음 칸 적용]을 눌러 줘.\n완료: '+run.done.join(', ');
     return;
    }
    el.focus();await delay(100);
    if(document.activeElement!==el||!batchVisible(el))throw Error(item.name+': 포커스/표시 상태 검증 실패');
    const previous=el.innerText;
    const next=String(item.value);
    if(previous!==next){
     // Select only the verified, focused editor contents before ProseMirror's paste handler.
     const selection=window.getSelection(),range=document.createRange();
     range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);
     if(document.activeElement!==el||!batchVisible(el))throw Error(item.name+': 붙여넣기 직전 대상 변경');
     const dt=new DataTransfer();dt.setData('text/plain',next);
     const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt});
     el.dispatchEvent(event);
     selection.removeAllRanges();
     await delay(350);
     if(el.innerText.trim()!==next.trim())throw Error(item.name+': 붙여넣기 후 텍스트 불일치');
    }
    run.done.push(item.name);run.position++;
   }
   report.textContent='V1.1.15 '+run.done.length+'개 입력 확인 완료. NovelAI에서 내용과 생성 결과를 직접 확인해 줘.';
   safeBatch=null;
  }catch(e){
   report.textContent='안전 중단 · '+e.message+'\n완료: '+run.done.join(', ')+'\n부분 적용 상태일 수 있어. 자동 복구는 실행하지 않아.';
   safeBatch=null;
  }finally{run.busy=false}
 }
 btn('V1.1.15 안전 순차 적용 시작',()=>{
  if(safeBatch){report.textContent='진행 중인 적용이 있어. 다음 칸 적용 또는 취소를 눌러 줘.';return}
  const items=entries();
  if(!items.length||items.some(x=>!batchSelector(x.key))){report.textContent='지원하지 않는 슬롯이 있어 중단';return}
  if(!confirm('총 '+items.length+'개 입력칸을 순차적으로 교체할까?\n활성화되지 않은 탭은 멈춰서 직접 열도록 요청해. 기존 내용은 변경되며 자동 복구되지 않아.'))return;
  safeBatch={items,position:0,done:[],busy:false};safeBatchStep();
 });
 btn('V1.1.15 다음 칸 적용',()=>{if(!safeBatch){report.textContent='진행 중인 적용 없음';return}safeBatchStep()});
 btn('V1.1.15 순차 적용 취소',()=>{if(safeBatch?.busy){report.textContent='현재 입력이 끝난 뒤 취소해 줘';return}safeBatch=null;report.textContent='순차 적용 취소됨. 이미 적용한 내용은 유지돼.'});




 btn('캐릭터 편집창 열기 버튼 진단 · 본문 제외',diagnoseCharacterOpener);
 btn('활성 입력칸 구조 진단 · 본문 제외',diagnoseTouchedEditor);
 btn('입력창 번호 표시 · 진단',inspectEditors);
 btn('메인 자동 입력 (확실한 칸만)',()=>{
  const el=strictField('메인');
  if(!el){report.textContent='메인 입력칸을 확실히 식별하지 못했어. 아래 직접 지정 버튼을 사용해 줘.';return}
  try{setReactValue(el,bundle.description||'');report.textContent='메인 기존 내용 전체 교체 시도 완료. 화면을 확인해 줘.'}catch(err){report.textContent='메인 교체 실패: '+err.message}
 });
 btn('UC 자동 입력 (확실한 칸만)',()=>{
  const el=strictField('UC');
  if(!el){report.textContent='UC 입력칸을 확실히 식별하지 못했어. 아래 직접 지정 버튼을 사용해 줘.';return}
  try{setReactValue(el,bundle.negativePrompt||'');report.textContent='UC 기존 내용 전체 교체 시도 완료. 화면을 확인해 줘.'}catch(err){report.textContent='UC 교체 실패: '+err.message}
 });
 btn('메인 입력칸 직접 지정',()=>selectTarget('메인',bundle.description||'','main'));
 btn('UC 입력칸 직접 지정',()=>selectTarget('UC',bundle.negativePrompt||'','uc'));
 const slotTools=document.createElement('div');
 slotTools.style.cssText='margin-top:10px;border-top:1px solid #40506b;padding-top:7px';
 promptSection.append(slotTools);
 const characterEntries=bundle.characterPrompts||[];
 const guide=document.createElement('p');guide.textContent='캐릭터별 버튼: 직접 입력을 누른 뒤 NovelAI의 해당 입력칸을 터치하면 기존 내용을 통째로 교체해.';guide.style.cssText='font-size:12px;line-height:1.5;color:#d8e6ff';slotTools.append(guide);
 if(!characterEntries.length){const empty=document.createElement('p');empty.textContent='원본에서 캐릭터 슬롯을 찾지 못했어.';slotTools.append(empty);}
 for(const slot of characterEntries){
  const section=document.createElement('details');section.open=true;
  section.style.cssText='border:1px solid #40506b;border-radius:8px;margin:6px 0;padding:7px';
  const summary=document.createElement('summary');summary.textContent='캐릭터 '+slot.index+' · 프롬프트 / UC (직접 입력·복사)';section.append(summary);
  function action(label,fn){
   const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:8px;margin:4px 3px;background:#5276d8;color:white;border:0;border-radius:6px;font-size:12px';button.onclick=fn;section.append(button);
  }
  action('프롬프트 직접 입력',()=>selectTarget('캐릭터 '+slot.index+' 프롬프트',slot.prompt||'','char'+slot.index));
  action('프롬프트 복사',()=>navigator.clipboard.writeText(slot.prompt||'').then(()=>{report.textContent='캐릭터 '+slot.index+' 프롬프트 복사 완료'}).catch(e=>{report.textContent='복사 실패: '+e.message}));
  action('UC 직접 입력',()=>selectTarget('캐릭터 '+slot.index+' UC',slot.negativePrompt||'','char'+slot.index+'uc'));
  action('UC 복사',()=>navigator.clipboard.writeText(slot.negativePrompt||'').then(()=>{report.textContent='캐릭터 '+slot.index+' UC 복사 완료'}).catch(e=>{report.textContent='복사 실패: '+e.message}));
  if(!slot.negativePrompt){const note=document.createElement('small');note.textContent='원본 캐릭터 UC 없음 · 입력하면 해당 칸이 비워짐';section.append(note);}
  slotTools.append(section);
 }
 btn('메인 복사',async()=>{try{await navigator.clipboard.writeText(bundle.description||'');report.textContent='메인 프롬프트 복사 완료'}catch(e){report.textContent='복사 실패: '+e.message}});
 btn('UC 복사',async()=>{try{await navigator.clipboard.writeText(bundle.negativePrompt||'');report.textContent='UC 복사 완료'}catch(e){report.textContent='복사 실패: '+e.message}});
 btn('캐릭터별 프롬프트·UC 원문 보기',()=>{
  report.replaceChildren();for(const slot of bundle.characterPrompts||[]){const p=document.createElement('p');p.textContent='캐릭터 '+slot.index;const t=document.createElement('textarea');t.value=slot.prompt;t.readOnly=true;t.style.cssText='width:100%;min-height:80px';report.append(p,t);const b=document.createElement('button');b.textContent='프롬프트 복사';b.onclick=()=>navigator.clipboard.writeText(slot.prompt||'');report.append(b);const u=document.createElement('textarea');u.value=slot.negativePrompt||'';u.readOnly=true;u.style.cssText='width:100%;min-height:55px';report.append(u);const ub=document.createElement('button');ub.textContent='UC 복사';ub.onclick=()=>navigator.clipboard.writeText(slot.negativePrompt||'');report.append(ub)}
 });

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
 autoTransfer().catch(e=>{report.textContent='자동 전송 오류: '+e.message});
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
  mark.onclick=()=>alert('NAI Bridge v1.1.15\n'+status+'\n주소 길이: '+location.href.length+'자');
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
