// ==UserScript==
// @name         NAI V5 Prompt Bridge (experimental)
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      0.1.0
// @description  Import a prompt bundle from NAI Character Replacer into NovelAI V5. Review before generating.
// @match        https://novelai.net/*
// @match        https://*.novelai.net/*
// @grant        none
// @run-at       document-idle
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
 const hint=document.createElement('p');hint.textContent='NovelAI 화면 구조에 따라 자동 입력이 실패할 수 있어. 각 입력칸을 확인하고 직접 생성해 줘.';root.append(hint);
 const report=document.createElement('div');report.style.whiteSpace='pre-wrap';root.append(report);
 function btn(name,fn){const b=document.createElement('button');b.textContent=name;b.style.cssText='padding:9px;margin:3px;background:#5276d8;color:white;border:0;border-radius:6px';b.onclick=fn;root.append(b)}
 btn('메인 프롬프트 자동 입력',()=>{
  const candidates=fields();const main=candidates.find(e=>/prompt|프롬프트|プロンプト/.test(label(e))&&!/negative|undesired|uc|ネガティブ|character|キャラクター/.test(label(e)));
  if(!main){report.textContent='메인 입력칸을 확실하게 식별하지 못했어. 아래 수동 선택을 사용해 줘.';return}
  setReactValue(main,bundle.description||'');report.textContent='메인 프롬프트 입력 시도 완료. 화면에서 값이 유지되는지 확인해 줘.'
 });
 btn('UC 자동 입력',()=>{
  const el=fields().find(e=>/negative|undesired|ネガティブ|uc|부정/.test(label(e)));
  if(!el){report.textContent='UC 입력칸을 찾지 못했어.';return}
  setReactValue(el,bundle.negativePrompt||'');report.textContent='UC 입력 시도 완료.'
 });
 btn('수동 입력칸 지정',()=>{
  report.textContent='입력할 칸을 화면에서 터치해 줘. 다음 터치 1회만 사용해.';
  const handler=e=>{const el=e.target.closest('textarea,input,[contenteditable="true"],[role="textbox"]');if(!el)return;e.preventDefault();e.stopPropagation();document.removeEventListener('click',handler,true);setReactValue(el,bundle.description||'');report.textContent='선택한 칸에 메인 프롬프트 입력 시도 완료.'};
  setTimeout(()=>document.addEventListener('click',handler,true),0);
 });
 btn('캐릭터별 프롬프트 보기',()=>{
  report.replaceChildren();for(const slot of bundle.characterPrompts||[]){const p=document.createElement('p');p.textContent='캐릭터 '+slot.index;const t=document.createElement('textarea');t.value=slot.prompt;t.readOnly=true;t.style.cssText='width:100%;min-height:80px';report.append(p,t);const b=document.createElement('button');b.textContent='복사';b.onclick=()=>navigator.clipboard.writeText(slot.prompt);report.append(b)}
 });
 btn('닫기',()=>root.remove());
 document.body.append(root);
}
function importHash(){
 if(!location.hash.startsWith(PREFIX))return;
 try{const data=JSON.parse(decodeURIComponent(location.hash.slice(PREFIX.length)));history.replaceState(null,'',location.pathname+location.search);panel(data)}
 catch(e){alert('NAI 전송 데이터 해석 실패: '+e.message)}
}
importHash();window.addEventListener('hashchange',importHash);
})();
