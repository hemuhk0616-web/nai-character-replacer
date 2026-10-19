// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      0.9.6
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
 const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLInputElement?HTMLInputElement.prototype:null;
 const setter=proto&&Object.getOwnPropertyDescriptor(proto,'value')?.set;
 if(setter)setter.call(el,value);else if(el.isContentEditable)el.textContent=value;else el.value=value;
 el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
}
function fields(){return [...document.querySelectorAll('textarea,input[type="text"],[contenteditable="true"],[role="textbox"],div[contenteditable],div[role="textbox"]')].filter(e=>e.getClientRects().length&&!e.disabled&&!e.closest('#nai-bridge-panel'));}
function label(el){return [el.getAttribute('placeholder'),el.getAttribute('aria-label'),el.getAttribute('data-testid'),el.closest('label')?.textContent,el.parentElement?.parentElement?.textContent?.slice(0,140)].filter(Boolean).join(' ').toLowerCase();}
function panel(bundle){
 document.getElementById('nai-bridge-panel')?.remove();
 document.getElementById('nai-bridge-hide')?.remove();
 document.getElementById('nai-bridge-launcher')?.remove();
 const root=document.createElement('div');root.id='nai-bridge-panel';
 root.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;width:min(92vw,380px);max-height:44px;overflow:hidden;background:#1b2332;color:white;border:2px solid #7b9cff;border-radius:12px;padding:14px;font:13px system-ui;box-shadow:0 6px 30px #000b';
 const title=document.createElement('button');
 title.textContent='NAI Bridge v0.9.6 ▾ 펼치기';
 title.style.cssText='display:block;width:100%;padding:6px;background:#304567;color:white;border:0;text-align:left;font:bold 14px system-ui';
 let expanded=false;
 const toggle=()=>{
  expanded=!expanded;
  root.style.maxHeight=expanded?'85vh':'44px';
  root.style.overflow=expanded?'auto':'hidden';
  title.textContent=expanded?'NAI Bridge v0.9.6 ▴ 접기':'NAI Bridge v0.9.6 ▾ 펼치기';
 };
 title.addEventListener('click',toggle);
 root.append(title);
 const hint=document.createElement('p');hint.textContent='자동 입력은 정확히 식별된 칸에만 실행돼. 실패하면 입력칸 직접 지정 또는 복사를 사용해 줘. 생성은 직접 눌러.';root.append(hint);
 const report=document.createElement('div');report.style.whiteSpace='pre-wrap';root.append(report);
 const version=document.createElement('div');version.textContent='Bridge v0.9.6 · 입력창 진단';version.style.cssText='font-size:12px;color:#a9c7ff;margin:5px 0';root.append(version);
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

 function btn(name,fn){const b=document.createElement('button');b.textContent=name;b.style.cssText='padding:9px;margin:3px;background:#5276d8;color:white;border:0;border-radius:6px';b.onclick=fn;root.append(b)}
 function selectTarget(kind,value){
  report.textContent=kind+' 입력칸을 NovelAI 화면에서 직접 터치해 줘. 선택한 칸에만 입력해.';
  root.style.pointerEvents='none';root.style.opacity='.45';
  const handler=e=>{
   const el=e.target.closest('textarea,input[type="text"],[contenteditable="true"],[role="textbox"]');
   if(!el||root.contains(el))return;
   e.preventDefault();e.stopImmediatePropagation();document.removeEventListener('click',handler,true);
   root.style.pointerEvents='auto';root.style.opacity='1';
   setReactValue(el,value);report.textContent=kind+' 입력 시도 완료. NovelAI 화면에 올바르게 표시되는지 확인해 줘.';
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
  await delay(2400);
  const candidates=fields().filter(e=>!root.contains(e));
  const labelText=e=>[e.getAttribute('aria-label'),e.getAttribute('placeholder'),e.getAttribute('data-testid'),e.closest('[aria-label]')?.getAttribute('aria-label')].filter(Boolean).join(' ').toLowerCase();
  const neg=/negative|undesired|ネガティブ|부정|uc(?:\b|_)/i;
  const main=/prompt|プロンプト|프롬프트|description/i;
  const negative=candidates.filter(e=>neg.test(labelText(e)));
  const positive=candidates.filter(e=>main.test(labelText(e))&&!neg.test(labelText(e))&&!/character|キャラクター|캐릭터/i.test(labelText(e)));
  // NovelAI mobile editor is often an unlabeled contenteditable DIV.
  // Only infer the main field when its own or nearby placeholder explicitly
  // says "Tap to add a prompt". Never infer UC from DOM order.
  const hint=/tap to add a prompt|add a prompt|프롬프트를 입력|プロンプトを入力/i;
  const mainHints=candidates.filter(e=>{
   const own=[e.getAttribute('data-placeholder'),e.getAttribute('aria-placeholder'),e.getAttribute('placeholder')].filter(Boolean).join(' ');
   if(hint.test(own))return true;
   const parent=e.parentElement;
   if(!parent)return false;
   const near=[...parent.querySelectorAll('[data-placeholder],[aria-placeholder],[placeholder]')].map(n=>[n.getAttribute('data-placeholder'),n.getAttribute('aria-placeholder'),n.getAttribute('placeholder')].filter(Boolean).join(' '));
   return near.some(t=>hint.test(t));
  });
  // Locate visible section headings and map editors to their closest preceding heading.
  // Only accept an unambiguous main/UC pair; do not assume DOM index order.
  const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,label,[role="heading"]')]
   .filter(e=>e.getClientRects().length&&!root.contains(e))
   .map(e=>({el:e,text:(e.textContent||'').trim().toLowerCase()}))
   .filter(x=>x.text.length>0&&x.text.length<100);
  function nearestHeading(editor){
   const y=editor.getBoundingClientRect().top;
   const prior=headings.filter(h=>h.el.getBoundingClientRect().top<=y+8);
   prior.sort((a,b)=>b.el.getBoundingClientRect().top-a.el.getBoundingClientRect().top);
   return prior[0]?.text||'';
  }
  const headingUC=candidates.filter(e=>/undesired content|negative prompt|ネガティブ|부정 프롬프트/i.test(nearestHeading(e)));
  const headingMain=candidates.filter(e=>/^(?:prompt|main prompt|image prompt|プロンプト|메인 프롬프트)$/i.test(nearestHeading(e)));
  const safeMain=positive.length===1?positive[0]:(mainHints.length===1?mainHints[0]:(headingMain.length===1?headingMain[0]:null));
  const safeUC=negative.length===1?negative[0]:(headingUC.length===1?headingUC[0]:null);
  const log=[];
  if(safeMain&&safeMain!==safeUC){setReactValue(safeMain,bundle.description||'');log.push('메인 입력 시도 (안내 문구 기반)')}else log.push('메인 입력칸 미확인 ('+positive.length+'개 이름 후보, '+mainHints.length+'개 안내 문구 후보)');
  if(safeUC&&safeUC!==safeMain){setReactValue(safeUC,bundle.negativePrompt||'');log.push('UC 입력 시도 (영역 제목 기반)')}else log.push('UC 입력칸 미확인 ('+negative.length+'개 이름 후보, '+headingUC.length+'개 영역 후보)');
  const chars=(bundle.characterPrompts||[]).filter(x=>x.prompt);
  if(chars.length)log.push('캐릭터 '+chars.length+'개: 슬롯 미확인, 자동 입력 보류');
  await delay(300);
  const fieldInfo=candidates.map((e,i)=>`${i+1}. ${e.tagName.toLowerCase()} ${labelText(e).slice(0,85)||'(이름 없음)'} / 영역: ${nearestHeading(e).slice(0,55)||'(없음)'} [${String(e.value??e.textContent??'').length}자]`);
  report.textContent=log.join('\n')+'\n\n발견된 입력칸 '+candidates.length+'개:\n'+fieldInfo.join('\n')+'\n\n잘못된 칸에 입력되지 않았는지 확인해 줘.';
 }
 btn('입력창 번호 표시 · 진단',inspectEditors);
 btn('메인 자동 입력 (확실한 칸만)',()=>{
  const el=strictField('메인');
  if(!el){report.textContent='메인 입력칸을 확실히 식별하지 못했어. 아래 직접 지정 버튼을 사용해 줘.';return}
  setReactValue(el,bundle.description||'');report.textContent='메인 입력 시도 완료. 화면을 확인해 줘.';
 });
 btn('UC 자동 입력 (확실한 칸만)',()=>{
  const el=strictField('UC');
  if(!el){report.textContent='UC 입력칸을 확실히 식별하지 못했어. 아래 직접 지정 버튼을 사용해 줘.';return}
  setReactValue(el,bundle.negativePrompt||'');report.textContent='UC 입력 시도 완료. 화면을 확인해 줘.';
 });
 btn('메인 입력칸 직접 지정',()=>selectTarget('메인',bundle.description||''));
 btn('UC 입력칸 직접 지정',()=>selectTarget('UC',bundle.negativePrompt||''));
 btn('메인 복사',async()=>{try{await navigator.clipboard.writeText(bundle.description||'');report.textContent='메인 프롬프트 복사 완료'}catch(e){report.textContent='복사 실패: '+e.message}});
 btn('UC 복사',async()=>{try{await navigator.clipboard.writeText(bundle.negativePrompt||'');report.textContent='UC 복사 완료'}catch(e){report.textContent='복사 실패: '+e.message}});
 btn('캐릭터별 프롬프트 보기',()=>{
  report.replaceChildren();for(const slot of bundle.characterPrompts||[]){const p=document.createElement('p');p.textContent='캐릭터 '+slot.index;const t=document.createElement('textarea');t.value=slot.prompt;t.readOnly=true;t.style.cssText='width:100%;min-height:80px';report.append(p,t);const b=document.createElement('button');b.textContent='복사';b.onclick=()=>navigator.clipboard.writeText(slot.prompt);report.append(b)}
 });
 btn('닫기',()=>{root.style.display='none';});
 // Hide the panel completely by default. Reopen from the compact launcher.
 root.style.display='none';
 document.body.append(root);
 const launcher=document.createElement('button');
 launcher.id='nai-bridge-launcher';
 launcher.textContent='NAI';
 launcher.title='NAI Bridge 열기';
 launcher.style.cssText='position:fixed;right:6px;top:50%;z-index:2147483646;background:#263a55;color:white;border:1px solid #8ab2fa;border-radius:8px 0 0 8px;padding:8px 4px;font:bold 10px system-ui;opacity:.65';
 launcher.onclick=()=>{
  root.style.display=root.style.display==='none'?'block':'none';
  if(root.style.display==='block'){root.style.maxHeight='85vh';root.style.overflow='auto';}
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
  mark.onclick=()=>alert('NAI Bridge v0.9.6\n'+status+'\n주소 길이: '+location.href.length+'자');
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
