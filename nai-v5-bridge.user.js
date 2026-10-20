// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      1.0.6
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
 root.style.cssText='position:fixed;top:72px;right:8px;transform:none;z-index:2147483647;width:min(94vw,420px);max-height:88vh;overflow:auto;background:#1b2332;color:white;border:2px solid #7b9cff;border-radius:12px;padding:14px;font:13px system-ui;box-shadow:0 6px 30px #000b';
 const header=document.createElement('div');
 header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-14px;z-index:2;background:#1b2332;padding:6px 0 9px';
 const title=document.createElement('strong');title.textContent='NAI Bridge v1.0.6 · 설정 확인';
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
 const hint=document.createElement('p');hint.textContent='원본 이미지 설정을 확인하고 NovelAI에서 직접 맞춰 줘. 설정값 자동 적용은 지원하지 않아.';root.append(hint);
 const report=document.createElement('div');report.style.whiteSpace='pre-wrap';root.append(report);
 const version=document.createElement('div');version.textContent='Bridge v1.0.6 · 입력창 진단';version.style.cssText='font-size:12px;color:#a9c7ff;margin:5px 0';root.append(version);
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
 imageSection.open=true;
 settingLine(imageSection,'Width × Height',settings.width&&settings.height?settings.width+' × '+settings.height:undefined);
 settingLine(imageSection,'Seed',settings.seed,true);
 const aiSection=makeSection('② AI 설정 · Generation');
 aiSection.open=true;
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
 const promptSection=makeSection('⑤ 프롬프트 전송 · 수동 지정');
 promptSection.open=false;
 const settingsSections=[imageSection,aiSection,advancedSection,posSection];
 const settingsVisibility=()=>{
  const active=promptSection.open;
  for(const section of settingsSections)section.style.display=active?'none':'';
  hint.style.display=active?'none':'';
  version.style.display=active?'none':'';
  if(active){report.textContent='프롬프트 전송 도구 · NovelAI 입력칸을 직접 지정하거나 복사해 줘.';}
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
 function selectTarget(kind,value){
  report.textContent=kind+' 입력칸을 NovelAI 화면에서 직접 터치해 줘. 선택한 칸에만 입력해.';
  root.style.display='none'; launcher.style.display='none';
  const handler=e=>{
   const el=e.target.closest('textarea,input[type="text"],[contenteditable="true"],[role="textbox"]');
   if(!el||root.contains(el))return;
   e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',handler,true);
   root.style.display='block';launcher.style.display='block';
   try{setReactValue(el,value);report.textContent=kind+' 기존 내용 전체 교체 시도 완료. NovelAI 화면을 확인해 줘.'}catch(err){report.textContent=kind+' 교체 실패: '+err.message}
  };
  setTimeout(()=>document.addEventListener('click',handler,true),250);
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
 btn('메인 입력칸 직접 지정',()=>selectTarget('메인',bundle.description||''));
 btn('UC 입력칸 직접 지정',()=>selectTarget('UC',bundle.negativePrompt||''));
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
  action('프롬프트 직접 입력',()=>selectTarget('캐릭터 '+slot.index+' 프롬프트',slot.prompt||''));
  action('프롬프트 복사',()=>navigator.clipboard.writeText(slot.prompt||'').then(()=>{report.textContent='캐릭터 '+slot.index+' 프롬프트 복사 완료'}).catch(e=>{report.textContent='복사 실패: '+e.message}));
  action('UC 직접 입력',()=>selectTarget('캐릭터 '+slot.index+' UC',slot.negativePrompt||''));
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
  mark.onclick=()=>alert('NAI Bridge v1.0.6\n'+status+'\n주소 길이: '+location.href.length+'자');
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
