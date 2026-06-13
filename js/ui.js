/* ============ DOM UI: dialogue, objectives, toasts, fades ============ */
const UI = (() => {
  const $ = id => document.getElementById(id);
  let els = {};
  let dlg = { active: false, lines: [], idx: 0, typing: false, shown: 0, timer: null, onDone: null };
  let toastTimer = null;

  function init() {
    els = {
      hud: $('hud'), objective: $('objective-text'), hearts: $('hearts'),
      heartCount: $('heart-count'), fps: $('fps'), toast: $('toast'),
      prompt: $('prompt'), dialogue: $('dialogue'), dlgName: $('dlg-name'),
      dlgText: $('dlg-text'), dlgNext: $('dlg-next'), fade: $('fade'),
      title: $('title-screen'), end: $('end-screen')
    };
    els.dialogue.addEventListener('click', advance);

    window.addEventListener('error', e => {
      const ov = $('error-overlay');
      ov.classList.remove('hidden');
      ov.textContent = 'Error: ' + e.message + '\n' + (e.filename || '') + ':' + (e.lineno || '');
    });
  }

  /* ---------- HUD ---------- */
  function showHUD() { els.hud.classList.remove('hidden'); }
  function setObjective(text) { els.objective.textContent = text; }
  function setHearts(n, total) {
    els.hearts.classList.remove('hidden');
    els.heartCount.textContent = n + '/' + total;
  }
  function setFPS(v) { els.fps.textContent = v + ' FPS'; }

  /* ---------- toast ---------- */
  function toast(text, love = false, dur = 3400) {
    clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.classList.toggle('love', love);
    els.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), dur);
  }

  /* ---------- prompt ---------- */
  function showPrompt(label) {
    els.prompt.innerHTML = '<b>E</b>' + label;
    els.prompt.classList.remove('hidden');
  }
  function hidePrompt() { els.prompt.classList.add('hidden'); }

  /* ---------- dialogue ---------- */
  function startDialogue(lines, onDone) {
    dlg.active = true; dlg.lines = lines; dlg.idx = 0; dlg.onDone = onDone || null;
    els.dialogue.classList.remove('hidden');
    hidePrompt();
    showLine();
  }

  function showLine() {
    const line = dlg.lines[dlg.idx];
    els.dlgName.textContent = line.name;
    els.dlgText.textContent = '';
    els.dlgNext.style.visibility = 'hidden';
    dlg.typing = true; dlg.shown = 0;
    clearInterval(dlg.timer);
    dlg.timer = setInterval(() => {
      dlg.shown += 2;
      els.dlgText.textContent = line.text.slice(0, dlg.shown);
      if (dlg.shown % 6 === 0) AudioMan.blip();
      if (dlg.shown >= line.text.length) {
        clearInterval(dlg.timer);
        dlg.typing = false;
        els.dlgNext.style.visibility = 'visible';
      }
    }, 24);
  }

  function advance() {
    if (!dlg.active) return;
    if (dlg.typing) {            // finish line instantly
      clearInterval(dlg.timer);
      dlg.typing = false;
      els.dlgText.textContent = dlg.lines[dlg.idx].text;
      els.dlgNext.style.visibility = 'visible';
      return;
    }
    dlg.idx++;
    if (dlg.idx < dlg.lines.length) showLine();
    else {
      dlg.active = false;
      els.dialogue.classList.add('hidden');
      if (dlg.onDone) { const f = dlg.onDone; dlg.onDone = null; f(); }
    }
  }

  const dialogueActive = () => dlg.active;

  /* ---------- fade ---------- */
  function fadeIn() { els.fade.classList.add('clear'); }                 // reveal game
  function fadeOutWhite() { els.fade.classList.add('white'); els.fade.classList.remove('clear'); }

  /* ---------- screens ---------- */
  function hideTitle() { els.title.classList.add('fading'); setTimeout(() => els.title.classList.add('hidden'), 1100); }
  function showEnd() { els.end.classList.remove('hidden'); }

  return {
    init, showHUD, setObjective, setHearts, setFPS, toast,
    showPrompt, hidePrompt, startDialogue, advance, dialogueActive,
    fadeIn, fadeOutWhite, hideTitle, showEnd
  };
})();
