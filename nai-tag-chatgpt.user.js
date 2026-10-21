// ==UserScript==
// @name         NAI Tag ChatGPT Bridge V1.1
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      1.1
// @description  Send NAI tag questions to the current ChatGPT web conversation
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function(){
'use strict';
if(window.__naiTagChatBridgeV11)return;
window.__naiTagChatBridgeV11=true;
const PREFIX='#nai-replacer=';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function toast(message){
 let el=document.getElementById('nai-tag-chat-status');
 if(!el){el=document.createElement('div');el.id='nai-tag-chat-status';el.style.cssText='position:fixed;bottom:92px;left:12px;right:12px;z-index:2147483647;background:#253b65;color:white;padding:12px;border-radius:10px;font:14px system-ui;box-shadow:0 4px 15px #0009';document.body.append(el)}
 el.textContent='NAI Replacer: '+message;
}
function composer(){return document.querySelector('#prompt-textarea[contenteditable="true"],div[contenteditable="true"][data-placeholder],div.ProseMirror[contenteditable="true"],[data-testid="composer-input"][contenteditable="true"],textarea#prompt-textarea')}
function sendButton(){return [...document.querySelectorAll('button')].find(b=>{if(b.disabled||b.getAttribute('aria-disabled')==='true')return false;const test=(b.getAttribute('data-testid')||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.getAttribute('title')||'');return /send-button|send message|send prompt|메시지 보내기|전송|보내기/i.test(test) && !/stop|중지/i.test(test)})}
function content(el){return (el.tagName==='TEXTAREA'?el.value:el.innerText||el.textContent||'').trim()}
function fill(el,text){
 el.focus();
 if(el.tagName==='TEXTAREA'){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(el,text);el.dispatchEvent(new Event('input',{bubbles:true}));return}
 const sel=window.getSelection(),range=document.createRange();range.selectNodeContents(el);sel.removeAllRanges();sel.addRange(range);
 const ok=document.execCommand('insertText',false,text);
 if(!ok){el.textContent=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}))}
}
async function handle(){
 if(!location.hash.startsWith(PREFIX))return;
 let question;try{question=decodeURIComponent(location.hash.slice(PREFIX.length))}catch{return}
 if(!question||question.length>12000)return;
 history.replaceState(null,'',location.pathname+location.search);
 for(let i=0;i<50;i++){
  const el=composer();
  if(el){if(content(el)&&content(el)!==question){toast('입력창에 기존 문장이 있어 자동 전송을 중단했어. 질문은 클립보드에 복사되어 있어.');return}
   fill(el,question);await wait(550);
   if(content(el).replace(/\s+/g,' ').trim()!==question.replace(/\s+/g,' ').trim()){toast('입력 확인 실패 · 질문을 직접 붙여넣어 줘');return}
   for(let j=0;j<15;j++){const send=sendButton();if(send){send.click();toast('전송 버튼 클릭 완료 · 답변이 나타나는지 확인해 줘');return}await wait(250)}
   el.focus();el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));await wait(600);
   if(content(el)===question)toast('전송 버튼을 찾지 못했어 · 입력된 질문을 직접 전송해 줘');
   else toast('Enter 전송 시도 완료 · 답변이 나타나는지 확인해 줘');
   return;
  }await wait(300);
 }
 toast('ChatGPT 입력창을 찾지 못했어 · 질문은 클립보드에 복사되어 있어');
}
handle();
window.addEventListener('hashchange',handle);
})();