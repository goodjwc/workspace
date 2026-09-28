// CI 에뮬레이터 자동 점검 (am start --ez selftest true 로 실행했을 때만 주입됨)
(async () => {
  const out = {};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    out.scenes = document.querySelectorAll('.scene').length;
    out.isApp = Speech.isApp;
    out.tts = Speech.ttsSupported;
    for (let i = 0; i < 30 && !AndroidBridge.isReady(); i++) await wait(500);
    out.ttsReady = AndroidBridge.isReady();
    out.voiceCount = Speech.loadVoices().length;
    out.englishAvailable = AndroidBridge.hasEnglish();
    out.voices = Speech.voices.slice(0, 5).map(v => v.name + '|' + v.lang + '|' + (v.offline ? 'offline' : 'online'));
    out.recognition = Speech.recognitionSupported;
    out.record = Speech.recordSupported;
    out.serviceWorker = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

    // 녹음 (CI에서는 권한을 미리 부여)
    try {
      const h = await Speech.startRecording();
      await wait(1000);
      const url = await h.stop();
      out.recordOk = typeof url === 'string' && url.startsWith('blob:');
    } catch (e) { out.recordOk = false; out.recordError = String(e && e.name || e); }

    // 플래시카드
    app.act_startFlash({ scene: 'immigration' });
    out.flashcard = !!document.querySelector('.flashcard');
    app.act_flip();
    out.answer = (document.querySelector('.answer-en') || {}).textContent || null;

    // 롤플레이 시작 (상대 말 TTS)
    app.act_startRole({ scene: 'taxi' });
    app.act_roleStart();
    out.roleBubble = (document.querySelector('.bubble.them p') || {}).textContent || null;
    out.roleSpeakButton = !!document.querySelector('[data-action=roleRecord]');
    await wait(500);

    // TTS 끝 알림까지 걸린 시간
    const t0 = Date.now();
    await Speech.speak('Here you go.', { rate: 1 });
    out.speakMs = Date.now() - t0;

    app.back();
    await wait(500);
    out.backHome = !!document.querySelector('.scenes');
    localStorage.setItem('__selftest', '1');
    out.storage = localStorage.getItem('__selftest') === '1';
    localStorage.removeItem('__selftest');
  } catch (e) {
    out.error = String(e && e.stack || e);
  }
  console.log('SELFTEST_RESULT ' + JSON.stringify(out));
})();
