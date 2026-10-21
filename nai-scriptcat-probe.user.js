// ==UserScript==
// @name         NAI ScriptCat Execution Probe
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      0.1.0
// @description  Diagnostic only: shows whether ScriptCat executes on NovelAI. No prompt modification.
// @match        https://novelai.net/*
// @match        https://*.novelai.net/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function(){
 'use strict';
 const run=()=>{
  if(document.getElementById('nai-scriptcat-probe'))return;
  const b=document.createElement('button');
  b.id='nai-scriptcat-probe';
  b.textContent='ScriptCat 실행 확인 ✓';
  b.style.cssText='position:fixed!important;top:120px!important;left:10px!important;z-index:2147483647!important;background:#15803d!important;color:#fff!important;border:3px solid #fff!important;border-radius:9px!important;padding:12px!important;font:bold 14px sans-serif!important;display:block!important;visibility:visible!important';
  b.onclick=()=>alert('ScriptCat 테스트 스크립트 실행 성공\n'+location.href.slice(0,120));
  (document.body||document.documentElement).appendChild(b);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
 else run();
})();
