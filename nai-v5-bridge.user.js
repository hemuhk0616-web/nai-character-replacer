// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      0.3.0
// @description  Import a prompt bundle from NAI Character Replacer into NovelAI V5. Review before generating.
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
function fields(){return [...document.querySelectorAll('textarea,input[type="text"],[contenteditable="true"],[role="textbox"]')].filter(e=>e.getClientRects().length&&!e.disabled);}
function label(el){return [el.getAttribute('placeholder'),el.getAttribute('aria-label'),el.getAttribute('data-testid'),el.closest('label')?.textContent,el.parentElement?.parentElement?.textContent?.slice(0,140)].filter(Boolean).join(' ').toLowerCase();}
function panel(bundle){
 document.getElementById('nai-bridge-panel')?.remove();
 const root=document.createElement('div');root.id='nai-bridge-panel';
 root.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;width:min(92vw,380px);max-height:85vh;overflow:auto;background:#1b2332;color:white;border:2px solid #7b9cff;border-radius:12px;padding:14px;font:13px system-ui;box-shadow:0 6px 30px #000b';
 const title=document.createElement('h3');title.textContent='NAI V5 프롬프트 전송 · 실험판';root.append(title);
 const hint=document.createElement('p');hint.textContent='자동 입력은 정확히 식별된 칸에만 실행돼. 실패하면 입력칸 직접 지정 또는 복사를 사용해 줘. 생성은 직접 눌러.';root.append(hint);
 const report=document.createElement('div');report.style.whiteSpace='pre-wrap';root.append(report);
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
  setTimeout(()=>document.addEventListener('click',handler,true),0);
 }
 function strictField(kind){
  const candidates=fields().filter(e=>!root.contains(e));
  const isNegative=e=>/^(?:negative prompt|undesired content|negative|uc|ネガティブプロンプト|ネガティブ|부정 프롬프트)$/i.test([e.getAttribute('aria-label'),e.getAttribute('placeholder')].filter(Boolean).join(' ').trim());
  const isMain=e=>/^(?:prompt|main prompt|プロンプト|메인 프롬프트)$/i.test([e.getAttribute('aria-label'),e.getAttribute('placeholder')].filter(Boolean).join(' ').trim());
  const matches=candidates.filter(kind==='UC'?isNegative:isMain);
  return matches.length===1?matches[0]:null;
 }
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
 btn('닫기',()=>root.remove());
 document.body.append(root);
}
let pending=null;
function captureHash(){
 if(!location.hash.startsWith(PREFIX))return;
 try{
  pending=JSON.parse(decodeURIComponent(location.hash.slice(PREFIX.length)));
  history.replaceState(null,'',location.pathname+location.search);
 }catch(e){pending={__error:'전송 데이터 해석 실패: '+e.message}}
}
function showPending(){
 if(!document.body)return;
 if(pending){
  const data=pending;pending=null;
  if(data.__error){alert(data.__error);return}
  panel(data);
 }else if(!document.getElementById('nai-bridge-ready')){
  const mark=document.createElement('button');mark.id='nai-bridge-ready';mark.textContent='NAI Bridge ✓';
  mark.title='ScriptCat 스크립트 실행 중. Replacer에서 전송하면 전송 패널이 나타나.';
  mark.style.cssText='position:fixed;bottom:12px;left:12px;z-index:2147483646;background:#263a55;color:#fff;border:1px solid #8ab2fa;border-radius:7px;padding:7px;font:12px system-ui';
  mark.onclick=()=>alert('ScriptCat NAI Bridge 실행 중. 전송 데이터가 없어서 대기 중이야.');
  document.body.append(mark);
 }
}
captureHash();
document.addEventListener('DOMContentLoaded',showPending);
window.addEventListener('load',showPending);
window.addEventListener('hashchange',()=>{captureHash();showPending()});
if(document.readyState!=='loading')showPending();
})();
