// ==UserScript==
// @name         NAI Replacer → ChatGPT Tag Chat
// @namespace    https://github.com/hemuhk0616-web/nai-character-replacer
// @version      0.1.0
// @description  Send tag questions from NAI Replacer to the already-opened ChatGPT conversation.
// @match        https://chatgpt.com/c/*
// @match        https://chat.openai.com/c/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const prefix = '#nai-replacer=';
  if (!location.hash.startsWith(prefix)) return;
  let question;
  try { question = decodeURIComponent(location.hash.slice(prefix.length)); }
  catch { return; }
  if (!question || question.length > 8000) return;
  const expected = location.pathname;
  // Remove question from the URL without navigating away.
  history.replaceState(history.state, '', location.pathname + location.search);
  const notice = document.createElement('div');
  notice.textContent = 'NAI Replacer: ChatGPT 입력창을 찾는 중…';
  Object.assign(notice.style, {position:'fixed',bottom:'12px',left:'12px',right:'12px',zIndex:'2147483647',background:'#26354d',color:'white',padding:'12px',borderRadius:'9px',fontSize:'13px'});
  document.body.append(notice);
  const fail = msg => { notice.textContent = 'NAI Replacer: ' + msg + ' (질문은 클립보드에도 복사됨)'; };
  const selectors = ['#prompt-textarea','[contenteditable="true"][data-lexical-editor="true"]','[contenteditable="true"][role="textbox"]'];
  let attempts = 0;
  const tick = setInterval(() => {
    if (++attempts > 40) {clearInterval(tick);fail('자동 입력 시간 초과');return;}
    if (location.pathname !== expected) {clearInterval(tick);fail('채팅 주소가 변경되어 중단');return;}
    const editor = selectors.map(q=>document.querySelector(q)).find(Boolean);
    if (!editor || !editor.isConnected) return;
    // Never overwrite a user's existing draft.
    if (editor.innerText.trim()) {clearInterval(tick);fail('입력창에 기존 글이 있어 중단');return;}
    clearInterval(tick);
    editor.focus();
    // Lexical/ProseMirror commonly accept paste events with text/plain.
    let inserted = false;
    try {
      const data = new DataTransfer();
      data.setData('text/plain', question);
      const ev = new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data});
      editor.dispatchEvent(ev);
      inserted = editor.innerText.trim() === question.trim();
    } catch (_) {}
    if (!inserted) {
      try {
        editor.focus();
        document.execCommand('insertText',false,question);
        inserted = editor.innerText.trim() === question.trim();
      } catch (_) {}
    }
    if (!inserted) {fail('자동 입력 실패');return;}
    notice.textContent = 'NAI Replacer: 입력 완료, 전송 버튼 확인 중…';
    let tries = 0;
    const sendTimer = setInterval(() => {
      if (++tries > 20) {clearInterval(sendTimer);fail('전송 버튼을 찾지 못함');return;}
      if (location.pathname !== expected || editor.innerText.trim() !== question.trim()) {clearInterval(sendTimer);fail('입력 내용이 변경되어 중단');return;}
      const button = document.querySelector('[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="메시지 보내기"]');
      if (!button || button.disabled) return;
      clearInterval(sendTimer);
      button.click();
      notice.textContent = 'NAI Replacer: 전송 버튼 클릭 완료';
      setTimeout(()=>notice.remove(),2500);
    },250);
  },300);
})();
