// Session-only audio: no storage, upload, analytics, or speech recognition.
export const mandarinVoices = synth => (synth?.getVoices() || []).filter(v => v.localService && /^(zh[-_]CN|cmn([-_]CN)?)$/i.test(v.lang));
export function recordingIssue(env = globalThis) {
  if (!env.isSecureContext) return '녹음은 HTTPS 또는 localhost에서 사용할 수 있습니다.';
  if (!env.navigator?.mediaDevices?.getUserMedia || !env.MediaRecorder) return '이 브라우저는 녹음을 지원하지 않습니다. Safari 또는 Chrome의 최신 버전에서 직접 열어 주세요.';
  return '';
}
export function recorderOptions(Recorder) {
  const mimeType = ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t => Recorder.isTypeSupported?.(t));
  return mimeType ? {mimeType} : {};
}
export function openSpeaking(word, example = false) {
  const dialog = document.createElement('dialog');
  dialog.className = 'speaking-dialog';
  dialog.setAttribute('aria-labelledby', 'speaking-title');
  dialog.innerHTML = `<h2 id="speaking-title">듣고 · 녹음하고 · 비교하기</h2>
    <p class="speaking-text" lang="zh-CN"></p><p class="speaking-hints"></p>
    <p>표준중국어 합성 음성과 내 발음을 직접 비교하는 연습입니다. 원어민 녹음·상하이어·자동 발음 채점은 제공하지 않습니다.</p>
    <label>듣기 속도 <select data-speed><option value="0.8">천천히</option><option value="1">보통</option></select></label>
    <div class="speaking-actions"><button data-listen>① 표준음 듣기</button><button data-record>② 내 발음 녹음</button><button data-stop disabled>녹음 종료</button><button data-play disabled>③ 내 녹음 듣기</button><button data-compare disabled>표준음 → 내 녹음 · 3회</button><button data-halt>재생 중지</button><button data-delete disabled>녹음 삭제</button></div>
    <p data-status role="status" aria-live="polite"></p><p data-support></p>
    <p>녹음 버튼을 누르고 마이크 사용을 허용해야 녹음됩니다. 최대 30초이며 외부 전송·영구 저장하지 않습니다. 다시 녹음하면 이전 녹음을 대체하고, 창 닫기·화면 이동·새로고침 시 삭제합니다.</p>
    <p>성조의 높낮이·경성의 길이·문장 리듬을 차례로 비교하세요. 모바일에서 재생이 막히면 ‘내 녹음 듣기’를 직접 누르세요. 화면을 벗어나면 녹음과 재생이 중지됩니다.</p>
    <button data-close-speaking>연습 닫기</button>`;
  const find = s => dialog.querySelector(s);
  const text = example ? word.example : word.hanzi;
  find('.speaking-text').textContent = text;
  find('.speaking-hints').textContent = example ? '예문의 성조와 리듬을 음성으로 확인하세요.' : `${word.pinyin} · 한글 근사치: ${word.koreanPronunciation || '미등록'} · ${word.toneNotes || ''}`;
  const synth = globalThis.speechSynthesis;
  let alive = true, token = 0, request = 0, pending = false, recorder, stream, url, timer, watchdog, utterance;
  const audio = new Audio();
  const status = message => { if (alive) find('[data-status]').textContent = message; };
  const tracksOff = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; };
  const busy = () => pending || (recorder && recorder.state !== 'inactive');
  const update = () => {
    if (!alive) return;
    const working = !!busy();
    find('[data-record]').disabled = working || !!recordingIssue();
    find('[data-stop]').disabled = !working;
    find('[data-listen]').disabled = working || !mandarinVoices(synth).length;
    for (const name of ['play','delete']) find(`[data-${name}]`).disabled = working || !url;
    find('[data-compare]').disabled = working || !url || !mandarinVoices(synth).length;
    find('[data-support]').textContent = [recordingIssue(), !mandarinVoices(synth).length ? '기기에 설치된 표준중국어 음성이 없습니다. 중국어 음성을 설치한 뒤 다시 열어 주세요. 외부 음성 서비스로 대체하지 않습니다.' : '기기의 표준중국어 음성을 사용합니다.'].filter(Boolean).join(' ');
  };
  const halt = () => { token++; clearTimeout(watchdog); audio.onended = audio.onerror = null; audio.pause(); audio.currentTime = 0; if (utterance) utterance.onend = utterance.onerror = null; synth?.cancel(); };
  const erase = () => { halt(); audio.removeAttribute('src'); audio.load(); if (url) URL.revokeObjectURL(url); url = null; update(); };
  const stop = () => {
    request++; pending = false; clearTimeout(timer);
    if (recorder?.state === 'recording') { recorder.stop(); tracksOff(); status('녹음을 준비하고 있습니다.'); }
    else { tracksOff(); update(); }
  };
  const finish = message => { halt(); status(message); };
  const play = (run, next) => {
    if (!alive || run !== token || !url) return;
    status('내 녹음 재생 중');
    audio.src = url;
    audio.onended = () => { if (run === token) next(); };
    audio.onerror = () => finish('녹음을 재생하지 못했습니다. 다시 녹음해 주세요.');
    audio.play().catch(() => { if (run === token) finish('자동 재생이 제한되었습니다. ‘내 녹음 듣기’를 직접 누르세요.'); });
  };
  const say = (run, next) => {
    const voice = mandarinVoices(synth)[0];
    if (!voice) { finish('기기에 표준중국어 음성을 설치해 주세요.'); update(); return; }
    utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = 'zh-CN'; utterance.rate = Number(find('[data-speed]').value);
    status('표준중국어 듣는 중');
    utterance.onend = () => { clearTimeout(watchdog); if (alive && run === token) next(); };
    utterance.onerror = () => { if (run === token) finish('표준음 재생에 실패했습니다. 음성 설정을 확인하세요.'); };
    watchdog = setTimeout(() => finish('음성 응답이 없습니다. 다시 듣기를 눌러 주세요.'), 90000);
    synth.speak(utterance);
  };
  find('[data-record]').onclick = async () => {
    if (busy() || recordingIssue()) return;
    halt(); pending = true; const current = ++request; update(); status('마이크 권한을 기다립니다. 취소하려면 녹음 종료를 누르세요.');
    try {
      const granted = await navigator.mediaDevices.getUserMedia({audio:true});
      if (!alive || current !== request) { granted.getTracks().forEach(t => t.stop()); return; }
      stream = granted; pending = false;
      const active = new MediaRecorder(stream, recorderOptions(MediaRecorder)); recorder = active;
      const chunks = []; let bytes = 0, failed = false;
      active.ondataavailable = e => { if (alive && recorder === active && e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes > 8*1024*1024 && active.state === 'recording') stop(); } };
      active.onstop = () => {
        if (!alive || recorder !== active) return;
        clearTimeout(timer); tracksOff(); recorder = null;
        if (!failed && chunks.length && bytes <= 8*1024*1024) { erase(); url = URL.createObjectURL(new Blob(chunks,{type:active.mimeType || chunks[0].type})); status('녹음 완료. 표준음과 번갈아 들어 보세요.'); }
        else status('녹음을 만들지 못했습니다. 길이를 줄여 다시 녹음해 주세요.');
        update();
      };
      active.onerror = () => { failed = true; stop(); status('녹음 오류가 발생했습니다. 다시 시도해 주세요.'); };
      active.start(250); erase(); update(); status('녹음 중 · 최대 30초'); timer = setTimeout(stop,30000);
      stream.getTracks().forEach(t => t.onended = stop);
    } catch (error) {
      if (!alive || current !== request) return;
      pending = false; recorder = null; tracksOff(); update();
      status(({NotAllowedError:'마이크 권한이 거부되었습니다. 브라우저 사이트 설정과 휴대전화의 마이크 권한을 확인하고 다시 눌러 주세요.',NotFoundError:'사용 가능한 마이크가 없습니다.',NotReadableError:'마이크를 사용할 수 없습니다. 다른 앱의 마이크 사용을 종료해 주세요.'})[error.name] || '녹음을 시작하지 못했습니다. 지원되는 브라우저에서 다시 시도해 주세요.');
    }
  };
  find('[data-stop]').onclick = () => { stop(); status('녹음을 종료했습니다.'); };
  find('[data-listen]').onclick = () => { halt(); say(token, () => status('표준음 듣기 완료')); };
  find('[data-play]').onclick = () => { halt(); play(token, () => status('내 녹음 듣기 완료')); };
  find('[data-compare]').onclick = () => { halt(); const run = token; let count = 0; const cycle = () => { if (!alive || run !== token) return; if (count++ === 3) return status('3회 비교 완료. 성조와 리듬을 확인하고 다시 연습하세요.'); say(run, () => play(run, cycle)); }; cycle(); };
  find('[data-halt]').onclick = () => finish('재생을 중지했습니다.');
  find('[data-delete]').onclick = () => { erase(); status('녹음을 삭제했습니다.'); };
  function dispose() {
    if (!alive) return;
    alive = false; stop(); erase(); dialog.close(); dialog.remove();
    synth?.removeEventListener('voiceschanged', update);
    document.removeEventListener('visibilitychange', background);
    window.removeEventListener('pagehide', dispose); window.removeEventListener('hashchange', dispose);
  }
  function background() { if (document.hidden) { stop(); halt(); status('화면을 벗어나 녹음·재생을 중지했습니다.'); } }
  find('[data-close-speaking]').onclick = dispose;
  dialog.addEventListener('cancel', e => { e.preventDefault(); dispose(); });
  dialog.addEventListener('close', dispose);
  document.addEventListener('visibilitychange', background);
  window.addEventListener('pagehide', dispose); window.addEventListener('hashchange', dispose);
  synth?.addEventListener('voiceschanged', update);
  document.body.append(dialog); update(); dialog.showModal();
}
